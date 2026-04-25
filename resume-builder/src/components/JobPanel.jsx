import { useState } from 'react';
import useResumeStore from '../store/resumeStore';

function isGeminiKey(key) {
  return key && key.startsWith('AIza') && key.length >= 20;
}

export default function JobPanel({ apiKey, setApiKey }) {
  const resume = useResumeStore((s) => s.resume);
  const setResumeFromAI = useResumeStore((s) => s.setResumeFromAI);
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState(null);

  const valid = isGeminiKey(apiKey);

  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    if (type === 'success') setTimeout(() => setStatus(null), 4000);
  };

  const optimize = async () => {
    if (!valid) { showStatus('error', 'Please paste your Google Gemini API key above.'); return; }
    if (!jobDesc.trim()) { showStatus('error', 'Please enter a job description.'); return; }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription: jobDesc, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Optimization failed');
      setResumeFromAI(data.resume);
      showStatus('success', `✅ Resume optimized${data.model ? ` via ${data.model}` : ''}! Preview updated.`);
    } catch (err) {
      showStatus('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-3 py-3 bg-slate-50 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">AI Optimizer</h2>

      {/* API Key */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Google Gemini API Key
          </label>
          {valid && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: '#10B981',
              background: '#D1FAE5', padding: '2px 8px', borderRadius: 20,
            }}>
              ✓ Gemini
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="input-field pr-10 text-sm"
            style={{
              caretColor: 'black',
              ...(valid
                ? { borderColor: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,.12)' }
                : apiKey.length > 4
                  ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,.12)' }
                  : {}),
            }}
          />
          <button
            onClick={() => setShowKey((p) => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
        <p className="text-xs" style={{ color: valid ? '#10B981' : '#9CA3AF', fontWeight: 500 }}>
          {valid
            ? '✓ Gemini key detected — free tier, no billing required'
            : '🔒 Free at aistudio.google.com — never stored.'}
        </p>
      </div>

      {/* Job Description */}
      <div className="card p-3 space-y-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Job Description
        </label>
        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste the full job description here. Gemini will match your resume to it with relevant keywords..."
          rows={7}
          className="input-field text-sm"
          style={{ resize: 'vertical', caretColor: 'black' }}
        />
      </div>

      {/* Status */}
      {status && (
        <div className={`text-xs px-3 py-2 rounded-lg border ${
          status.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-600'
            : status.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-blue-50 border-blue-200 text-blue-600'
        }`}>
          {status.msg}
        </div>
      )}

      {/* Optimize button */}
      <button className="btn-primary w-full justify-center" onClick={optimize} disabled={loading}>
        {loading ? <><span className="spinner" /> Optimizing...</> : '🚀 Optimize with Gemini'}
      </button>
    </div>
  );
}
