import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useResumeStore from '../store/resumeStore';

const SUGGESTIONS = [
  'Improve my experience section with stronger action verbs',
  'Make resume more ATS-friendly for tech roles',
  'Rewrite bullet points with quantifiable achievements',
  'Suggest skills to add for a software engineering role',
  'Strengthen my project descriptions',
];

export default function ChatBox({ apiKey }) {
  const resume = useResumeStore((s) => s.resume);
  const setResumeFromAI = useResumeStore((s) => s.setResumeFromAI);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI resume assistant. Ask me to improve sections, rewrite bullet points, make it ATS-friendly, or click \"Apply Changes\" to let me update your resume directly.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [open, setOpen] = useState(true);
  const [applyStatus, setApplyStatus] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      if (!apiKey.trim()) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '⚠️ Please enter your OpenAI API key in the AI Optimizer panel first.',
        }]);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          resumeContext: resume,
          history: newMessages.slice(-8),
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message}`,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const applyChanges = async () => {
    if (!apiKey.trim()) {
      setApplyStatus({ type: 'error', msg: 'Enter API key in the AI Optimizer panel first.' });
      return;
    }
    const aiMessages = messages.filter((m) => m.role === 'assistant' && m.content.length > 50);
    if (aiMessages.length < 1) {
      setApplyStatus({ type: 'error', msg: 'Have a conversation first so I know what to change.' });
      return;
    }

    setApplying(true);
    setApplyStatus(null);

    try {
      const res = await fetch('/api/apply-chat-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          chatHistory: messages.slice(-12),
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Apply failed');
      setResumeFromAI(data.resume);
      setApplyStatus({ type: 'success', msg: '✅ Changes applied to your resume!' });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "✅ I've applied all the suggested improvements to your resume! Check the preview panel to see the changes. You can undo (Ctrl+Z) if needed.",
      }]);
    } catch (err) {
      setApplyStatus({ type: 'error', msg: err.message });
    } finally {
      setApplying(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col bg-white border-t border-gray-200" style={{ maxHeight: '380px' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gray-50 border-b border-gray-200 flex-shrink-0"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-700">AI Chat Assistant</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▼' : '▲'}</span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col overflow-hidden"
            style={{ minHeight: 0 }}
          >
            {/* Messages */}
            <div
              className="overflow-y-auto px-3 py-2 space-y-2.5 flex flex-col"
              style={{ maxHeight: '200px', minHeight: '80px' }}
            >
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-xs mr-1.5 flex-shrink-0 mt-0.5">
                      🤖
                    </div>
                  )}
                  <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    {m.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start items-center gap-1.5 pl-7">
                  <div className="chat-bubble-ai flex items-center gap-1.5">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions (only at start) */}
            {messages.length <= 2 && (
              <div className="px-3 pb-1.5 flex flex-wrap gap-1">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Apply status */}
            {applyStatus && (
              <div className={`mx-3 text-xs px-2.5 py-1.5 rounded-lg border mb-1.5 ${
                applyStatus.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                {applyStatus.msg}
              </div>
            )}

            {/* Apply Changes button */}
            <div className="px-3 pb-1.5 flex justify-center">
              <button
                className="btn-secondary text-xs w-full justify-center"
                onClick={applyChanges}
                disabled={applying || loading}
                title="Apply all AI suggestions from this conversation to your resume"
              >
                {applying ? (
                  <><span className="spinner-dark" /> Applying changes...</>
                ) : (
                  '✨ Apply AI Suggestions to Resume'
                )}
              </button>
            </div>

            {/* Input bar */}
            <div className="px-3 pb-2.5 flex gap-2 border-t border-gray-100 pt-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about your resume... (Enter to send)"
                rows={1}
                className="input-field text-sm flex-1"
                style={{ resize: 'none', minHeight: '34px', maxHeight: '72px' }}
              />
              <button
                className="btn-primary px-3 flex-shrink-0"
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                {loading ? <span className="spinner" /> : '➤'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
