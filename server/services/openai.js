const { chat, chatJSON, parseJSON } = require('./universalLLMRouter');

/* ── Safe JSON parse — never throws ─────────────────────────── */
function safeParse(result) {
  try { return parseJSON(result); } catch { return null; }
}

/* ── Guard: ensure an AI-returned resume has the expected shape ─ */
function isValidResume(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    obj.personal &&
    typeof obj.personal === 'object' &&
    Array.isArray(obj.sections)
  );
}

/* ── Extract clean reply from raw text — never returns raw JSON ── */
function extractCleanReply(rawText) {
  if (!rawText) return null;
  const text = rawText.trim();

  // Try multiple strategies to extract JSON
  const strategies = [
    () => JSON.parse(text),
    () => { const m = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/); if (m) return JSON.parse(m[1]); throw new Error(); },
    () => { const s = text.indexOf('{'), e = text.lastIndexOf('}'); if (s >= 0 && e > s) return JSON.parse(text.slice(s, e + 1)); throw new Error(); },
  ];

  for (const fn of strategies) {
    try {
      const obj = fn();
      if (obj && typeof obj.reply === 'string' && obj.reply.trim()) {
        return {
          reply:  obj.reply.trim(),
          resume: isValidResume(obj.resume) ? obj.resume : null,
        };
      }
    } catch (_) { /* try next */ }
  }

  // Text looks like JSON but couldn't be parsed (broken/truncated) — never show raw JSON
  if (text.startsWith('{') || text.startsWith('[')) return null;

  // Genuine plain text — safe to show
  return { reply: text, resume: null };
}

async function optimizeResume(resume, jobDescription, apiKey) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert resume writer and ATS optimization specialist.
Optimize the given resume JSON to match the job description:
1. Add ATS keywords naturally from the job description
2. Strengthen every bullet with action verbs and quantifiable achievements
3. Tailor the professional summary to the role
4. Keep content concise and impactful
Keep the EXACT same JSON structure, field names, and IDs — only modify text content.
Return a JSON object with exactly one key: "resume", containing the optimized resume object.`,
    },
    {
      role: 'user',
      content: `JOB DESCRIPTION:\n${jobDescription}\n\nCURRENT RESUME:\n${JSON.stringify(resume, null, 2)}\n\nReturn: {"resume": <optimized_resume_object>}`,
    },
  ];
  const result = await chatJSON(apiKey, messages, { maxTokens: 32768, temperature: 0.5 });
  const parsed = safeParse(result);
  if (!parsed?.resume || !isValidResume(parsed.resume)) {
    throw Object.assign(
      new Error('Gemini returned an unexpected response. Please try again.'),
      { code: 'BAD_RESPONSE', status: 500 },
    );
  }
  return { resume: parsed.resume, model: result.model, provider: result.provider };
}

/**
 * Smart chat — ONE Gemini call returns both a text reply and, when the user
 * requested a change, the fully updated resume. Falls back to plain-text mode
 * if Gemini returns non-JSON (which can happen after many turns).
 */
async function smartChat(message, resumeContext, history, apiKey) {
  // Keep only the last 4 messages (2 turns) to avoid token bloat over long sessions
  const trimmedHistory = history.slice(-4).map((m) => ({
    role:    m.role,
    content: typeof m.content === 'string'
      ? m.content.slice(0, 600)
      : String(m.content).slice(0, 600),
  }));

  // Compact resume — strip null/empty leaf values to reduce token usage
  const compactResume = JSON.stringify(resumeContext);

  const messages = [
    {
      role: 'system',
      content: `You are an expert resume editor with DIRECT ability to update the user's resume in real time.

RULES:
1. When the user asks you to CHANGE, IMPROVE, FIX, ADD, REMOVE, REWRITE, OPTIMIZE, ENHANCE, or UPDATE anything — apply the change immediately and return the full updated resume in the "resume" field.
2. When the user asks a QUESTION or wants ADVICE only — answer helpfully and set "resume" to null.
3. When in doubt, APPLY the change — the user can undo with Ctrl+Z.
4. Keep the EXACT same JSON structure: same field names, same IDs, same section order.
5. Keep your "reply" under 60 words — the user sees the change in the preview.

Current resume (JSON):
${compactResume}

RESPOND WITH ONLY this JSON object (no markdown fences, no extra text):
{"reply":"one or two sentence confirmation","resume":<full_updated_resume_or_null>}`,
    },
    ...trimmedHistory,
    { role: 'user', content: message },
  ];

  const result = await chatJSON(apiKey, messages, { maxTokens: 32768, temperature: 0.4 });
  const parsed = safeParse(result);

  // Case 1: valid JSON with reply + optional resume
  if (parsed && typeof parsed.reply === 'string') {
    return {
      text:     parsed.reply.trim() || 'Done!',
      resume:   isValidResume(parsed.resume) ? parsed.resume : null,
      model:    result.model,
      provider: result.provider,
    };
  }

  // Case 2: safeParse failed — try to salvage a clean reply from raw text
  const extracted = extractCleanReply(result.text);
  if (extracted) {
    return {
      text:     extracted.reply,
      resume:   extracted.resume,
      model:    result.model,
      provider: result.provider,
    };
  }

  // Case 3: completely empty or unparseable — surface a safe message
  return {
    text:     'I processed your request. If you wanted a change, please try again with a more specific instruction.',
    resume:   null,
    model:    result.model,
    provider: result.provider,
  };
}

async function parseImportedResume(rawText, apiKey) {
  const schema = `{
  "personal":{"fullName":"","email":"","phone":"","links":[{"id":"link-1","label":"LinkedIn","url":""}],"summary":""},
  "sections":[
    {"id":"education","title":"Education","type":"education","entries":[{"id":"edu-1","institution":"","degree":"","location":"","startDate":"","endDate":"","gpa":"","details":"","bullets":[]}]},
    {"id":"experience","title":"Experience","type":"experience","entries":[{"id":"exp-1","company":"","role":"","location":"","startDate":"","endDate":"","bullets":[""]}]},
    {"id":"projects","title":"Projects","type":"projects","entries":[{"id":"proj-1","name":"","tech":"","link":"","startDate":"","endDate":"","bullets":[""]}]},
    {"id":"skills","title":"Skills","type":"skills","categories":[{"id":"sk-1","label":"Languages","tags":[]}]},
    {"id":"certifications","title":"Certifications","type":"certifications","entries":[{"id":"cert-1","name":"","issuer":"","date":"","link":"","bullets":[]}]}
  ]
}`;

  const messages = [
    {
      role: 'system',
      content: `You are an expert resume parser. Extract ALL information from the raw resume text and return structured JSON.
Follow this schema exactly: ${schema}
Rules:
- Generate unique IDs for all entries
- links: array of {id, label, url} objects
- Split bullet points into separate array items
- Group skills by category
- Remove sections with no data
- Return JSON with key "resume"
- Preserve all original content`,
    },
    { role: 'user', content: `Parse this resume:\n\n${rawText.slice(0, 8000)}` },
  ];

  const result = await chatJSON(apiKey, messages, { maxTokens: 16384, temperature: 0.2 });
  const parsed = safeParse(result);
  if (!parsed?.resume || !isValidResume(parsed.resume)) {
    throw Object.assign(
      new Error('Could not parse the resume. Please try a different file format or check the file content.'),
      { code: 'BAD_RESPONSE', status: 500 },
    );
  }
  return { resume: parsed.resume, model: result.model, provider: result.provider };
}

module.exports = { optimizeResume, smartChat, parseImportedResume };
