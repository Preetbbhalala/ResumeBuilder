/**
 * Gemini Router — races free-tier models in parallel, first success wins.
 */

const { detectProvider }     = require('./providerDetector');
const { GEMINI_FREE_MODELS } = require('./modelDiscovery');
const { buildRequest }       = require('./requestAdapter');
const { classifyError }      = require('./errorHandler');

/* ── JSON repair — closes truncated JSON before attempting parse ── */
function repairJSON(text) {
  let inString = false, escaped = false;
  const stack  = [];
  // Remove trailing comma which is a common truncation artefact
  const src = text.trimEnd().replace(/,\s*$/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (escaped)                   { escaped = false; continue; }
    if (ch === '\\' && inString)   { escaped = true;  continue; }
    if (ch === '"')                { inString = !inString; continue; }
    if (inString)                  continue;
    if (ch === '{')                stack.push('}');
    else if (ch === '[')           stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let repaired = src;
  if (inString)          repaired += '"';          // close open string
  while (stack.length)   repaired += stack.pop();  // close open brackets

  try { return JSON.parse(repaired); } catch { return null; }
}

/* ── JSON extractor — never throws, returns null on failure ──── */
function extractJSON(text) {
  if (!text || !text.trim()) return null;

  // Strip markdown fences first
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }

  // Direct parse
  try { return JSON.parse(text.trim()); } catch {}

  // Find outermost { … } pair — handles text before/after JSON
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }

  // Last resort: attempt to repair truncated JSON (MAX_TOKENS cut-off)
  if (s >= 0) {
    const repaired = repairJSON(text.slice(s));
    if (repaired) return repaired;
  }

  return null;
}

/* ── Extract raw text from a Gemini response body ────────────── */
function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts || [];
  // Gemini 2.5 thinking models mark reasoning parts with thought:true — skip them
  const answer = parts.filter((p) => p.text && !p.thought);
  if (answer.length > 0) return answer.map((p) => p.text).join('');
  // Fallback: first text part regardless
  return parts.find((p) => p.text)?.text || '';
}

/* ── Single model call ───────────────────────────────────────── */
async function callModel(apiKey, model, messages, options, timeoutMs) {
  const req = buildRequest(apiKey, model, messages, options);
  let response, body;

  try {
    response = await fetch(req.url, {
      method:  'POST',
      headers: req.headers,
      body:    JSON.stringify(req.body),
      signal:  AbortSignal.timeout(timeoutMs),
    });
    body = await response.json().catch(() => ({}));
  } catch (fetchErr) {
    throw Object.assign(
      new Error(`Network error: ${fetchErr.message}`),
      { code: 'NETWORK_ERROR', status: 503 },
    );
  }

  if (!response.ok) {
    const err = classifyError(response.status, body);
    throw Object.assign(new Error(err.message), { code: err.code, status: response.status });
  }

  // Check for safety block or empty candidates
  const candidates = body?.candidates;
  if (!candidates || candidates.length === 0) {
    const blockReason = body?.promptFeedback?.blockReason;
    throw Object.assign(
      new Error(blockReason
        ? `Gemini blocked this content (${blockReason}). Try rephrasing.`
        : 'Empty response from Gemini. Try again.'),
      { code: 'EMPTY_RESPONSE', status: 503 },
    );
  }

  const finishReason = candidates[0]?.finishReason;
  if (finishReason === 'SAFETY') {
    throw Object.assign(
      new Error('Gemini safety filter blocked this response. Try rephrasing your request.'),
      { code: 'SAFETY_BLOCK', status: 400 },
    );
  }

  const text = extractText(body);

  if (!text.trim() && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    throw Object.assign(
      new Error('Gemini returned empty content. Trying next model…'),
      { code: 'EMPTY_RESPONSE', status: 503 },
    );
  }

  return { text, model, finishReason };
}

/* ── Race models in batches of 3, first success wins ────────── */
async function raceModels(apiKey, models, messages, options, timeoutMs) {
  const BATCH = 3;
  let consecutiveRateLimitedBatches = 0;

  for (let i = 0; i < models.length; i += BATCH) {
    const batch = models.slice(i, i + BATCH);
    try {
      const result = await Promise.any(
        batch.map((m) => callModel(apiKey, m, messages, options, timeoutMs)),
      );
      console.log(`[Gemini] ✓ ${result.model} (${result.finishReason})`);
      return result;
    } catch (agg) {
      const errors = agg?.errors ?? [agg];

      // Hard stops — no point trying other models
      const authFail = errors.find((e) => e?.code === 'AUTH_FAILED');
      if (authFail) throw authFail;

      const safetyBlock = errors.find((e) => e?.code === 'SAFETY_BLOCK');
      if (safetyBlock) throw safetyBlock;

      if (errors.every((e) => e?.code === 'RATE_LIMITED')) {
        consecutiveRateLimitedBatches++;
        // After 2 consecutive all-rate-limited batches give up — key quota is exhausted
        if (consecutiveRateLimitedBatches >= 2) {
          throw Object.assign(
            new Error('Gemini rate limit reached. Please wait about 1 minute and try again.'),
            { code: 'RATE_LIMITED', status: 429 },
          );
        }
        // First rate-limited batch: pause briefly then try the next model family
        console.log('[Gemini] Batch rate-limited — waiting 3 s before trying next model family…');
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        consecutiveRateLimitedBatches = 0;
      }

      console.log(`[Gemini] batch ${i}–${i + BATCH} failed, trying next…`);
    }
  }

  throw Object.assign(
    new Error('No Gemini model responded. Check your API key at aistudio.google.com or try again.'),
    { code: 'NO_MODEL', status: 503 },
  );
}

/* ── Key validation ──────────────────────────────────────────── */
function assertGeminiKey(rawKey) {
  const key = rawKey?.trim();
  if (!detectProvider(key)) {
    throw Object.assign(
      new Error('Please paste a Google Gemini API key (starts with AIza). Get one free at aistudio.google.com.'),
      { code: 'INVALID_KEY', status: 400 },
    );
  }
  return key;
}

/* ── JSON instruction appended to system prompt ──────────────── */
const JSON_INSTR = '\n\nCRITICAL: Your entire response must be a single raw JSON object — absolutely no markdown, no code fences, no prose before or after. If your response is not valid JSON the system will crash.';

function enrichForJSON(messages) {
  return messages.map((m, i) => {
    if (m.role === 'system') {
      const isLast = !messages.slice(i + 1).some((x) => x.role === 'system');
      if (isLast) return { ...m, content: m.content + JSON_INSTR };
    }
    return m;
  });
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════════ */

/** Plain-text chat. Returns { text, provider, model } */
async function chat(rawApiKey, messages, options = {}) {
  const apiKey = assertGeminiKey(rawApiKey);
  const models = options.model ? [options.model] : GEMINI_FREE_MODELS;
  const result = await raceModels(apiKey, models, messages, options, 90000);
  return { text: result.text, provider: 'Google Gemini', model: result.model };
}

/** JSON-mode chat. Returns { text, provider, model } where text is raw output. */
async function chatJSON(rawApiKey, messages, options = {}) {
  const apiKey   = assertGeminiKey(rawApiKey);
  const enriched = enrichForJSON(messages);
  const models   = options.model ? [options.model] : GEMINI_FREE_MODELS;
  const result   = await raceModels(apiKey, models, enriched, { ...options, jsonMode: true }, 120000);
  return { text: result.text, provider: 'Google Gemini', model: result.model };
}

/**
 * Parse JSON from a chatJSON result — returns null instead of throwing.
 * Callers must handle the null case with a graceful fallback.
 */
function parseJSON(result) {
  return extractJSON(result.text);
}

/** Instant provider probe — no API call */
function probeProvider(rawApiKey) {
  if (!rawApiKey?.trim().startsWith('AIza')) return null;
  return { name: 'Google Gemini', id: 'google', format: 'google', model: GEMINI_FREE_MODELS[0] };
}

module.exports = { chat, chatJSON, parseJSON, probeProvider, detectProvider };
