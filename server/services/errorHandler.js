const MODEL_ERROR_PATTERNS = [
  /no endpoints found/i,
  /model.*(not found|not available|unavailable|invalid|does not exist|doesn't exist)/i,
  /invalid model/i,
  /model_not_found/i,
  /is currently overloaded/i,
];

const AUTH_MESSAGE_PATTERNS = [
  /api key not valid/i,
  /api.?key.*(invalid|not valid|bad|incorrect|expired)/i,
  /invalid.?api.?key/i,
  /please pass a valid api key/i,
  /authentication.*failed/i,
];

function isModelError(msg) { return MODEL_ERROR_PATTERNS.some((re) => re.test(msg)); }
function isAuthMessage(msg) { return AUTH_MESSAGE_PATTERNS.some((re) => re.test(msg)); }

function classifyError(status, body) {
  const msg = (
    body?.error?.message ||
    body?.message ||
    body?.detail ||
    ''
  );

  if (status === 401 || status === 403) {
    return { code: 'AUTH_FAILED', message: 'Invalid Gemini API key. Check your key in Google AI Studio.' };
  }

  if (status === 429) {
    return { code: 'RATE_LIMITED', message: 'Gemini rate limit reached. Please wait a moment and try again.' };
  }

  if (status === 400) {
    if (isAuthMessage(msg)) {
      return { code: 'AUTH_FAILED', message: 'Invalid Gemini API key. Check your key in Google AI Studio.' };
    }
    if (isModelError(msg)) {
      return { code: 'MODEL_NOT_FOUND', message: 'Model unavailable — trying next Gemini model…' };
    }
    return { code: 'BAD_REQUEST', message: msg || 'Bad request to Google Gemini.' };
  }

  if (status === 404) {
    return { code: 'MODEL_NOT_FOUND', message: 'Model not found — trying next Gemini model…' };
  }

  if (status === 402) {
    return { code: 'MODEL_NOT_FOUND', message: 'Quota exceeded for this model — trying next…' };
  }

  if (status >= 500) {
    return { code: 'PROVIDER_ERROR', message: 'Google Gemini server error. Please try again.' };
  }

  return { code: 'UNKNOWN', message: msg || 'Unexpected error from Google Gemini.' };
}

module.exports = { classifyError };
