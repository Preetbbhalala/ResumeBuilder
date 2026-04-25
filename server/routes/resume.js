const express = require('express');
const multer = require('multer');
const router = express.Router();
const { optimizeResume, smartChat, parseImportedResume } = require('../services/openai');

// ── pdf-parse v2: PDFParse class requires load() before getText()
let PDFParseClass = null;
try {
  const mod = require('pdf-parse');
  PDFParseClass = mod.PDFParse || null;
  if (!PDFParseClass) console.warn('pdf-parse: PDFParse class not found in export');
} catch (e) {
  console.warn('pdf-parse not available:', e.message);
}

// ── Multer: PDF only, 5 MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.pdf$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PDF files are allowed'), ok);
  },
});

// ── Shared middleware ────────────────────────────────────────
function validateApiKey(req, res, next) {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim().startsWith('AIza') || apiKey.trim().length < 20) {
    return res.status(400).json({ error: 'Please paste a valid Google Gemini API key (starts with AIza). Get one free at aistudio.google.com.' });
  }
  next();
}

function validateResume(req, res, next) {
  const { resume } = req.body;
  if (!resume || typeof resume !== 'object') {
    return res.status(400).json({ error: 'Invalid resume data' });
  }
  next();
}

function handleOpenAIError(err, res) {
  console.error('Gemini error:', err.message);
  if (err.code === 'AUTH_FAILED' || err.code === 'INVALID_KEY') {
    return res.status(401).json({ error: err.message });
  }
  if (err.code === 'RATE_LIMITED') {
    return res.status(429).json({ error: err.message });
  }
  if (err.code === 'BAD_REQUEST') {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message || 'Gemini request failed. Please try again.' });
}

// ── POST /optimize-resume ────────────────────────────────────
router.post('/optimize-resume', validateResume, validateApiKey, async (req, res) => {
  try {
    const { resume, jobDescription, apiKey } = req.body;
    if (!jobDescription?.trim()) return res.status(400).json({ error: 'Job description is required' });
    const result = await optimizeResume(resume, jobDescription.trim(), apiKey);
    res.json({ resume: result.resume, model: result.model, provider: result.provider });
  } catch (err) { handleOpenAIError(err, res); }
});

// ── POST /chat ───────────────────────────────────────────────
// Returns { reply, resume, model, provider }
// resume is the updated resume JSON when Gemini applied changes, null otherwise
router.post('/chat', validateApiKey, async (req, res) => {
  try {
    const { message, resumeContext, history, apiKey } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    const result = await smartChat(message.trim(), resumeContext || {}, history || [], apiKey);
    res.json({ reply: result.text, resume: result.resume, model: result.model, provider: result.provider });
  } catch (err) { handleOpenAIError(err, res); }
});

// ── POST /import-resume ──────────────────────────────────────
router.post('/import-resume', upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    const apiKey = req.body?.apiKey;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!apiKey || !apiKey.trim().startsWith('AIza') || apiKey.trim().length < 20) {
      return res.status(400).json({ error: 'Please paste a valid Google Gemini API key (starts with AIza).' });
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are accepted.' });
    }

    if (!PDFParseClass) {
      return res.status(500).json({ error: 'PDF parsing is not available on this server.' });
    }

    let rawText = '';
    try {
      const parser = new PDFParseClass({ data: file.buffer });
      await parser.load();
      const result = await parser.getText();
      rawText = (result && result.text) ? result.text : (typeof result === 'string' ? result : '');
      try { await parser.destroy(); } catch (_) { /* ignore */ }
    } catch (parseErr) {
      console.error('pdf-parse error:', parseErr.message);
      return res.status(400).json({ error: 'Unable to read this PDF. Please make sure it is a text-based PDF (not a scanned image).' });
    }

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'No text found in this PDF. It may be a scanned image — please use a text-based PDF.' });
    }

    const result = await parseImportedResume(rawText, apiKey);
    res.json({ resume: result.resume, model: result.model, provider: result.provider });
  } catch (err) {
    console.error('Import error:', err.message);
    handleOpenAIError(err, res);
  }
});

// ── POST /generate-pdf (client-side now) ─────────────────────
router.post('/generate-pdf', validateResume, async (req, res) => {
  res.status(400).json({ error: 'Use the "Download PDF" button — PDF is generated client-side.' });
});

module.exports = router;
