require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const resumeRoutes = require('./routes/resume');
const { probeProvider } = require('./services/universalLLMRouter');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 50,
  message: { error: 'Too many requests, please try again later.' },
});               
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '2mb' }));

// Routes
app.use(resumeRoutes);

// Gemini key probe — validates format without API call
app.post('/llm/probe', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim().startsWith('AIza')) {
    return res.status(422).json({ error: 'Please paste a Google Gemini API key (starts with AIza). Get one free at aistudio.google.com.' });
  }
  const info = probeProvider(apiKey.trim());
  if (!info) return res.status(422).json({ error: 'Invalid Gemini key format.' });
  res.json(info);
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Resume Builder API running on http://localhost:${PORT}`);
});

module.exports = app;
