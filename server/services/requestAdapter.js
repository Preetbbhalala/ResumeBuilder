function buildRequest(apiKey, model, messages, options = {}) {
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMsgs  = messages.filter((m) => m.role !== 'system');
  const contents  = chatMsgs.map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body = {
    contents,
    generationConfig: {
      temperature:     options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens  ?? 1024,
    },
  };
  if (systemMsg)        body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  if (options.jsonMode) body.generationConfig.responseMimeType = 'application/json';
  return {
    url:     `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    headers: { 'Content-Type': 'application/json' },
    body,
  };
}

module.exports = { buildRequest };
