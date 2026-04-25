import { useState, useEffect, useCallback, useRef } from 'react';
import LZString from 'lz-string';
import { AnimatePresence, motion } from 'framer-motion';
import { pdf } from '@react-pdf/renderer';
import useResumeStore from './store/resumeStore';
import ResumeForm from './components/ResumeForm';
import Preview from './components/Preview';
import AIPanel from './components/AIPanel';
import ImportModal from './components/ImportModal';
import ShareModal from './components/ShareModal';
import JobPanel from './components/JobPanel';
import PanelDivider from './components/PanelDivider';
import { ResumePDF } from './components/ResumePDF';
import { downloadDocx } from './utils/docxExport';
import LandingIntro from './components/LandingIntro';
import './index.css';

/* ── Media query hook ─────────────────────────────────────────── */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e) => setMatches(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return matches;
}

/* ── Shared-resume loader ─────────────────────────────────────── */
function useSharedResume() {
  const setResumeFromAI = useResumeStore((s) => s.setResumeFromAI);
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('r');
    if (!r) return;
    try {
      const resume = JSON.parse(LZString.decompressFromEncodedURIComponent(r));
      if (resume?.personal && resume?.sections) {
        setResumeFromAI(resume);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch { /* ignore */ }
  }, [setResumeFromAI]);
}

/* ── Toast ────────────────────────────────────────────────────── */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <motion.div
      className="toast"
      initial={{ opacity: 0, y: 12, scale: .96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: .96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
    >{msg}</motion.div>
  );
}

/* ── Download dropdown ────────────────────────────────────────── */
function DownloadDropdown({ resume }) {
  const [open, setOpen]         = useState(false);
  const [pdfBusy, setPdfBusy]   = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);
  const [toast, setToast]       = useState(null);
  const ref                     = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  const handlePDF = async () => {
    setOpen(false); setPdfBusy(true);
    try {
      const blob = await pdf(<ResumePDF resume={resume} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `${(resume.personal.fullName || 'resume').replace(/\s+/g, '_')}.pdf`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ PDF downloaded');
    } catch (err) { showToast('❌ ' + err.message); }
    finally { setPdfBusy(false); }
  };

  const handleDocx = async () => {
    setOpen(false); setDocxBusy(true);
    try { await downloadDocx(resume); showToast('✅ Word document downloaded'); }
    catch (err) { showToast('❌ ' + err.message); }
    finally { setDocxBusy(false); }
  };

  const busy = pdfBusy || docxBusy;

  return (
    <>
      <div className="dl-dropdown" ref={ref}>
        <button
          className="btn-ghost"
          onClick={() => setOpen((p) => !p)}
          disabled={busy}
          style={{ gap: 6, fontSize: 13, fontWeight: 500 }}
        >
          {busy ? <span className="spinner-dark" /> : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          )}
          <span className="hidden sm:inline">{pdfBusy ? 'PDF…' : docxBusy ? 'Word…' : 'Export'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              className="dl-menu"
              initial={{ opacity: 0, y: -6, scale: .97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: .97 }}
              transition={{ duration: .13 }}
            >
              <button className="dl-menu-item" onClick={handlePDF} disabled={busy}>
                <span style={{ fontSize: 16 }}>📄</span> Download PDF
              </button>
              <button className="dl-menu-item" onClick={handleDocx} disabled={busy}>
                <span style={{ fontSize: 16 }}>📝</span> Download Word
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>{toast && <Toast key={toast} msg={toast} />}</AnimatePresence>
    </>
  );
}

/* ── Bottom nav icons ─────────────────────────────────────────── */
function IconEdit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconPreview() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconTools() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}
function IconAI() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

/* ── Panel width constraints ──────────────────────────────────── */
const LEFT_MIN  = 240;
const LEFT_MAX  = 620;
const RIGHT_MIN = 200;
const RIGHT_MAX = 480;

/* ── Main App ─────────────────────────────────────────────────── */
export default function App() {
  const resume      = useResumeStore((s) => s.resume);
  const undo        = useResumeStore((s) => s.undo);
  const redo        = useResumeStore((s) => s.redo);
  const resetResume = useResumeStore((s) => s.resetResume);

  const isMobile = useMediaQuery('(max-width: 767px)');

  const [showIntro, setShowIntro] = useState(true);

  const [leftW,  setLeftW]  = useState(380);
  const [rightW, setRightW] = useState(280);

  const [activeTab,        setActiveTab]        = useState('editor');
  const [aiOpen,           setAiOpen]           = useState(false);
  const [importOpen,       setImportOpen]       = useState(false);
  const [shareOpen,        setShareOpen]        = useState(false);
  const [previewMinimized, setPreviewMinimized] = useState(false);
  const [apiKey,           setApiKey]           = useState('');

  useSharedResume();

  // Unminimize preview on mobile when switching to it
  useEffect(() => {
    if (isMobile && activeTab === 'preview') setPreviewMinimized(false);
  }, [isMobile, activeTab]);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  }, [undo, redo]);

  useEffect(() => {
    document.body.style.background = '#F8FAFC';
    document.body.style.color      = '#111827';
    window.addEventListener('keydown', handleKeyDown);

    // Warn before closing/refreshing — resume data is not saved
    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [handleKeyDown]);

  const onResizeLeft  = useCallback((delta) => setLeftW((w)  => Math.max(LEFT_MIN,  Math.min(LEFT_MAX,  w + delta))), []);
  const onResizeRight = useCallback((delta) => setRightW((w) => Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, w - delta))), []);

  const handleMobileTab = (tab) => {
    setActiveTab(tab);
    setAiOpen(false);
  };

  const editorVisible  = !isMobile || activeTab === 'editor';
  const previewVisible = !isMobile || activeTab === 'preview';
  const toolsVisible   = !isMobile || activeTab === 'tools';

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100%', background: '#F8FAFC', paddingBottom: isMobile ? 60 : 0 }}
    >
      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="navbar">
        <div className="flex items-center gap-3">
          <div className="nav-logo">
            <div className="nav-logo-icon">R</div>
            <span className="nav-logo-text hidden sm:block">Resume Builder</span>
            <span className="nav-logo-badge hidden md:block">AI</span>
          </div>
        </div>

        <div />

        <div className="flex items-center gap-1.5">
          <div className="save-indicator hidden lg:flex mr-2" style={{ color: '#F59E0B', borderColor: '#FEF3C7', background: '#FFFBEB' }}>
            <div className="save-dot" style={{ background: '#F59E0B' }} />
            Session only
          </div>
          <div className="nav-divider hidden lg:block" />

          <button
            className="btn-ghost hidden md:inline-flex"
            onClick={() => setImportOpen(true)}
            title="Import resume"
            style={{ fontSize: 13, fontWeight: 500, gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="hidden lg:inline">Import</span>
          </button>

          <button
            className="btn-ghost"
            onClick={() => setShareOpen(true)}
            title="Share resume"
            style={{ fontSize: 13, fontWeight: 500, gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span className="hidden lg:inline">Share</span>
          </button>

          <DownloadDropdown resume={resume} />

          {/* AI button — tablet/desktop only; mobile uses bottom nav */}
          {!isMobile && (
            <>
              <div className="nav-divider" />
              <button
                onClick={() => setAiOpen((p) => !p)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px',
                  background: aiOpen
                    ? 'linear-gradient(135deg, #4338CA, #3730A3)'
                    : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
                  color: '#fff', border: 'none', borderRadius: 9,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79,70,229,.35)',
                  transition: 'all .18s', whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 14 }}>✨</span>
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── 3-panel body ────────────────────────────────────── */}
      <div className="flex" style={{ flex: 1, minHeight: 'calc(100vh - 52px)' }}>

        {/* LEFT: Editor — determines page height; clips only horizontally */}
        <div style={{
          display: editorVisible ? 'flex' : 'none',
          flexShrink: isMobile ? 1 : 0,
          flexDirection: 'column',
          overflowX: 'hidden',
          width: isMobile ? '100%' : leftW,
          borderRight: isMobile ? 'none' : '1px solid #E2E8F0',
        }}>
          <ResumeForm />
        </div>

        {/* Divider 1 — sticky on desktop so it stays aligned with the sticky panels */}
        {!isMobile && (
          <div style={{
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            alignSelf: 'flex-start',
            flexShrink: 0,
          }}>
            <PanelDivider onResize={onResizeLeft} />
          </div>
        )}

        {/* CENTER: Preview — sticky on desktop, scrolls naturally on mobile */}
        <div style={{
          display: previewVisible ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid #E2E8F0',
          transition: 'flex .22s ease, min-width .22s ease, width .22s ease',
          ...(isMobile ? {
            flex: '1 1 0',
            minWidth: 0,
          } : previewMinimized ? {
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            alignSelf: 'flex-start',
            flexShrink: 0,
            width: 40,
          } : {
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            alignSelf: 'flex-start',
            flex: '1 1 0',
            minWidth: 180,
          }),
        }}>
          <Preview
            minimized={!isMobile && previewMinimized}
            onToggleMinimize={() => setPreviewMinimized((p) => !p)}
          />
        </div>

        {/* Divider 2 — sticky on desktop */}
        {!isMobile && !previewMinimized && (
          <div style={{
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            alignSelf: 'flex-start',
            flexShrink: 0,
          }}>
            <PanelDivider onResize={onResizeRight} />
          </div>
        )}

        {/* RIGHT: Tools — sticky on desktop */}
        <div style={{
          display: toolsVisible ? 'flex' : 'none',
          flexShrink: isMobile ? 1 : 0,
          flexDirection: 'column',
          overflow: 'hidden',
          width: isMobile ? '100%' : rightW,
          background: '#FFFFFF',
          borderLeft: isMobile ? 'none' : '1px solid #E5E7EB',
          // position:sticky also acts as a containing block (like relative) for the AI panel overlay
          ...(isMobile ? { position: 'relative' } : {
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            alignSelf: 'flex-start',
          }),
        }}>
          <JobPanel apiKey={apiKey} setApiKey={setApiKey} />

          {/* AI panel overlay inside right column — desktop/tablet only */}
          {!isMobile && (
            <AnimatePresence>
              {aiOpen && (
                <AIPanel
                  open={aiOpen}
                  onClose={() => setAiOpen(false)}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Mobile AI panel — full-screen overlay ───────────── */}
      {isMobile && (
        <AnimatePresence>
          {aiOpen && (
            <AIPanel
              open={aiOpen}
              onClose={() => setAiOpen(false)}
              apiKey={apiKey}
              setApiKey={setApiKey}
              mobileMode
            />
          )}
        </AnimatePresence>
      )}

      {/* ── Bottom navigation (mobile only) ─────────────────── */}
      {isMobile && (
        <nav className="bottom-nav">
          {[
            { id: 'editor',  label: 'Edit',    Icon: IconEdit    },
            { id: 'preview', label: 'Preview', Icon: IconPreview },
            { id: 'tools',   label: 'Tools',   Icon: IconTools   },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`bottom-nav-btn${activeTab === id && !aiOpen ? ' bnav-active' : ''}`}
              onClick={() => handleMobileTab(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
          <button
            className={`bottom-nav-btn${aiOpen ? ' bnav-ai-open' : ' bnav-ai'}`}
            onClick={() => setAiOpen((p) => !p)}
          >
            <IconAI />
            <span>AI</span>
          </button>
        </nav>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      <AnimatePresence>
        {importOpen && (
          <ImportModal
            open={importOpen}
            onClose={() => setImportOpen(false)}
            apiKey={apiKey}
            setApiKey={setApiKey}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {shareOpen && (
          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Landing intro ────────────────────────────────────── */}
      {showIntro && <LandingIntro onComplete={() => setShowIntro(false)} />}
    </div>
  );
}
