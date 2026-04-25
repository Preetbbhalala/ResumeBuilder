import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import useResumeStore from '../store/resumeStore';

const ACCEPTED = '.pdf';

function isGeminiKey(key) {
  return key && key.startsWith('AIza') && key.length >= 20;
}

export default function ImportModal({ open, onClose, apiKey, setApiKey }) {
  const setResumeFromAI = useResumeStore((s) => s.setResumeFromAI);
  const [file,     setFile]     = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null);
  const [showKey,  setShowKey]  = useState(false);
  const fileRef = useRef(null);

  const detectedProvider = useMemo(() => isGeminiKey(apiKey) ? 'Google Gemini' : null, [apiKey]);

  if (!open) return null;

  const handleFile = (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.pdf')) {
      setStatus({ type: 'error', msg: 'Only PDF files are supported.' });
      return;
    }
    setFile(f);
    setStatus(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file) { setStatus({ type: 'error', msg: 'Please select a file first.' }); return; }
    if (!isGeminiKey(apiKey)) { setStatus({ type: 'error', msg: 'Paste your Google Gemini API key first (starts with AIza).' }); return; }
    setLoading(true);
    setStatus({ type: 'info', msg: '⏳ Parsing resume…' });
    try {
      const form = new FormData();
      form.append('resume', file);
      form.append('apiKey', apiKey);

      const res  = await fetch('/api/import-resume', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResumeFromAI(data.resume);
      setStatus({ type: 'success', msg: '✅ Resume imported and populated successfully!' });
      setTimeout(() => { setFile(null); onClose(); }, 1500);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fileSize = file ? (file.size / 1024).toFixed(1) + ' KB' : '';

  const keyBorderStyle = detectedProvider
    ? { borderColor: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,.12)' }
    : apiKey.length > 4
      ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,.12)' }
      : {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">📂 Import Resume</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload an existing resume to auto-fill your profile</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 flex items-center justify-center rounded-full">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Drop zone */}
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div className="text-3xl mb-2">📄</div>
                <div className="font-medium text-gray-800 text-sm">{file.name}</div>
                <div className="text-xs text-gray-500 mt-1">{fileSize} · Click to change</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">☁️</div>
                <div className="font-medium text-gray-700 text-sm">Drag & drop your resume here</div>
                <div className="text-xs text-gray-500 mt-1">or click to browse</div>
                <div className="text-xs text-indigo-500 mt-2 font-medium">PDF only</div>
              </div>
            )}
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Google Gemini API Key <span className="text-red-400">*</span>
              </label>
              {detectedProvider && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: '#10B981',
                  background: '#D1FAE5', padding: '2px 8px', borderRadius: 20,
                }}>
                  ✓ {detectedProvider}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="input-field pr-14 text-sm"
                style={keyBorderStyle}
              />
              <button
                onClick={() => setShowKey((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs mt-1" style={{ color: detectedProvider ? '#10B981' : '#9CA3AF', fontWeight: 500 }}>
              {detectedProvider
                ? '✓ Gemini key detected — free tier, ready to parse'
                : '🔒 Free at aistudio.google.com — never stored.'}
            </p>
          </div>

          {/* Status */}
          {status && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${
              status.type === 'error'   ? 'bg-red-50 border-red-200 text-red-600'
              : status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              {status.msg}
            </div>
          )}

          {/* How it works */}
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-indigo-700 mb-1.5">How it works:</div>
            <ol className="text-xs text-indigo-600 space-y-1 list-decimal list-inside">
              <li>Your file is uploaded and text is extracted</li>
              <li>AI reads it and structures the data automatically</li>
              <li>All sections auto-populate in the editor</li>
              <li>You can then edit, optimize, and download</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1 justify-center"
            onClick={handleImport}
            disabled={loading || !file}
          >
            {loading ? <><span className="spinner" /> Parsing...</> : '🔍 Parse & Import Resume'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
