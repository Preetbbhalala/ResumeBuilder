// Free-tier Gemini models ordered by preference — stable aliases only, no dated previews
const GEMINI_FREE_MODELS = [
  'gemini-2.5-flash',        // Most capable free-tier model
  'gemini-2.5-flash-lite',   // Faster / lighter variant
  'gemini-2.0-flash',        // Reliable 2.0 fallback
  'gemini-2.0-flash-lite',   // Fast 2.0 fallback
  'gemini-1.5-flash',        // Stable legacy model
  'gemini-1.5-flash-8b',     // Smallest fallback
];

module.exports = { GEMINI_FREE_MODELS };
