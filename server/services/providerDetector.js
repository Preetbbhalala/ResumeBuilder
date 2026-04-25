const GOOGLE_PROVIDER = {
  prefix: 'AIza',
  id:      'google',
  name:    'Google Gemini',
  baseUrl: 'https://generativelanguage.googleapis.com',
  format:  'google',
};

function detectProvider(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;
  return apiKey.trim().startsWith('AIza') ? { ...GOOGLE_PROVIDER } : null;
}

module.exports = { detectProvider };
