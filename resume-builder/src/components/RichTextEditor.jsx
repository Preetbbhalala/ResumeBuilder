import { useRef, useEffect, useCallback, useState } from 'react';

const FONTS = ['Arial', 'Times New Roman', 'Calibri', 'Helvetica', 'Georgia'];
const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];

/* Apply a CSS style to the current selection by wrapping it in a <span> */
function applyStyleToSelection(styleProp, styleVal, container, onChange) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const span = document.createElement('span');
  span.style[styleProp] = styleVal;

  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }

  if (container && onChange) onChange(container.innerHTML || '');
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  className = '',
  onEnterSplit,
  minHeight = 32,
}) {
  const ref         = useRef(null);
  const toolbarRef  = useRef(null);
  const isFocused   = useRef(false);
  const savedRange  = useRef(null); // saved selection for after dropdown closes

  const [showToolbar, setShowToolbar] = useState(false);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });
  const [font, setFont] = useState('Arial');
  const [size, setSize] = useState(12);
  const [pasteError, setPasteError] = useState(false);

  // ── Mount: write initial HTML ─────────────────────────────────
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync external value when not focused ──────────────────────
  useEffect(() => {
    if (!isFocused.current && ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  // ── Save & restore selection around toolbar interactions ──────
  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }, []);

  const restoreRange = useCallback(() => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }, []);

  const refreshActive = useCallback(() => {
    setActive({
      bold:      document.queryCommandState('bold'),
      italic:    document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  // ── Focus / blur ──────────────────────────────────────────────
  const handleFocus = useCallback(() => {
    isFocused.current = true;
    setShowToolbar(true);
    refreshActive();
  }, [refreshActive]);

  const handleBlur = useCallback((e) => {
    // If focus is moving INTO the toolbar, don't treat this as a real blur.
    // relatedTarget is the element that will receive focus next.
    const movingToToolbar = toolbarRef.current?.contains(e.relatedTarget);
    if (movingToToolbar) {
      // Save selection so we can restore it after the toolbar action
      saveRange();
      return;
    }

    isFocused.current = false;
    // Short grace period in case a select dropdown fires blur before onChange
    setTimeout(() => {
      if (!isFocused.current && !toolbarRef.current?.contains(document.activeElement)) {
        setShowToolbar(false);
      }
    }, 200);

    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange, saveRange]);

  const handleInput = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
    refreshActive();
  }, [onChange, refreshActive]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items || [];
    const hasImage = Array.from(items).some((item) => item.type.startsWith('image/'));
    if (hasImage) {
      e.preventDefault();
      setPasteError(true);
      setTimeout(() => setPasteError(false), 3000);
      return;
    }
    const html = e.clipboardData.getData('text/html');
    if (html && /<img/i.test(html)) {
      e.preventDefault();
      setPasteError(true);
      setTimeout(() => setPasteError(false), 3000);
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold');      refreshActive(); return; }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic');    refreshActive(); return; }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); refreshActive(); return; }
    }

    if (e.key === 'Enter' && !e.shiftKey && onEnterSplit) {
      e.preventDefault();
      const markId = `__split_${Date.now()}__`;
      document.execCommand('insertHTML', false, `<span id="${markId}"></span>`);
      const full = ref.current?.innerHTML || '';
      const markerStr = `<span id="${markId}"></span>`;
      const idx = full.indexOf(markerStr);
      if (idx !== -1) {
        onEnterSplit(full.slice(0, idx), full.slice(idx + markerStr.length));
      }
    }
  }, [onEnterSplit, refreshActive]);

  // ── Selection-change tracking ──────────────────────────────────
  useEffect(() => {
    const onSel = () => { if (isFocused.current) refreshActive(); };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [refreshActive]);

  // ── Toolbar: focus returns to editor + restores selection ──────
  const refocusEditor = useCallback(() => {
    ref.current?.focus();
    restoreRange();
  }, [restoreRange]);

  // ── B / I / U commands ────────────────────────────────────────
  const fmtCmd = useCallback((cmd) => {
    refocusEditor();
    document.execCommand(cmd);
    refreshActive();
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange, refreshActive, refocusEditor]);

  // ── Font family ───────────────────────────────────────────────
  const fmtFont = useCallback((family) => {
    setFont(family);
    refocusEditor();
    applyStyleToSelection('fontFamily', family, ref.current, onChange);
    refreshActive();
  }, [onChange, refreshActive, refocusEditor]);

  // ── Font size ─────────────────────────────────────────────────
  const fmtSize = useCallback((sz) => {
    setSize(sz);
    refocusEditor();
    applyStyleToSelection('fontSize', `${sz}px`, ref.current, onChange);
    refreshActive();
  }, [onChange, refreshActive, refocusEditor]);

  return (
    <div className={`rte-wrapper ${className}`} style={{ position: 'relative' }}>

      {/* ── Formatting toolbar ─────────────────────────────────── */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="rte-toolbar"
          // Prevent toolbar clicks from blurring the editor for simple buttons
          onMouseDown={(e) => {
            // Only preventDefault for non-select elements; selects need real focus
            if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
              e.preventDefault();
            }
          }}
        >
          <button
            className={`rte-btn${active.bold ? ' rte-btn-active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); fmtCmd('bold'); }}
            title="Bold (Ctrl+B)"
          ><strong>B</strong></button>

          <button
            className={`rte-btn rte-italic${active.italic ? ' rte-btn-active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); fmtCmd('italic'); }}
            title="Italic (Ctrl+I)"
          ><em>I</em></button>

          <button
            className={`rte-btn rte-underline${active.underline ? ' rte-btn-active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); fmtCmd('underline'); }}
            title="Underline (Ctrl+U)"
          ><u>U</u></button>

          <span className="rte-divider" />

          {/* Font family — save range on mousedown, apply on change */}
          <select
            className="rte-select"
            value={font}
            title="Font family (applies to selected text)"
            onMouseDown={saveRange}
            onChange={(e) => fmtFont(e.target.value)}
          >
            {FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>

          {/* Font size — same pattern */}
          <select
            className="rte-select rte-size-select"
            value={size}
            title="Font size (applies to selected text)"
            onMouseDown={saveRange}
            onChange={(e) => fmtSize(Number(e.target.value))}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Contenteditable field ─────────────────────────────── */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className={`rte-field input-field${showToolbar ? ' rte-field-with-toolbar' : ''}`}
        style={{ minHeight, outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', caretColor: 'black' }}
        role="textbox"
        aria-multiline="true"
      />

      {pasteError && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: 8,
          padding: '7px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(239,68,68,.15)',
          animation: 'fadeIn .15s ease',
        }}>
          <span style={{ fontSize: 15 }}>🚫</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626' }}>
            Pasting images is not allowed in this field
          </span>
        </div>
      )}
    </div>
  );
}
