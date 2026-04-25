import { useState, useCallback, useRef, useLayoutEffect, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useResumeStore from '../store/resumeStore';
import RichTextEditor from './RichTextEditor';
import { countResumeWords } from '../utils/wordCount';

// ── Plain controlled input — cursor never jumps with Zustand re-renders ──
function StableInput({ value, onChange, placeholder, className, multiline, rows = 2, onEnterSplit }) {
  const ref = useRef(null);
  const sel = useRef({ s: 0, e: 0 });

  const saveSelection = useCallback(() => {
    if (ref.current) sel.current = { s: ref.current.selectionStart, e: ref.current.selectionEnd };
  }, []);

  const handleChange = useCallback((e) => {
    sel.current = { s: e.target.selectionStart, e: e.target.selectionEnd };
    onChange(e.target.value);
  }, [onChange]);

  useLayoutEffect(() => {
    if (ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(sel.current.s, sel.current.e);
    }
  });

  const handleKeyDown = useCallback((e) => {
    saveSelection();
    if (onEnterSplit && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const pos = e.target.selectionStart;
      onEnterSplit(e.target.value.slice(0, pos), e.target.value.slice(pos));
    }
  }, [saveSelection, onEnterSplit]);

  const commonProps = {
    ref,
    value: value ?? '',
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onSelect: saveSelection,
    onMouseDown: saveSelection,
    placeholder,
    className: `input-field ${className || ''}`,
    style: { caretColor: 'black' },
  };

  if (multiline) return <textarea {...commonProps} rows={rows} style={{ resize: 'vertical' }} />;
  return <input type="text" {...commonProps} />;
}

// ── Section title inline editor ───────────────────────────────
function SectionTitleEditor({ sectionId, title }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const updateSectionTitle = useResumeStore((s) => s.updateSectionTitle);

  const commit = () => {
    const t = val.trim();
    if (t) updateSectionTitle(sectionId, t);
    else setVal(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setVal(title); setEditing(false); }
        }}
        className="input-field text-sm font-semibold w-40"
      />
    );
  }
  return (
    <button
      onClick={() => { setVal(title); setEditing(true); }}
      className="font-semibold text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
    >
      {title} <span className="text-xs opacity-40">✏️</span>
    </button>
  );
}

// ── Entry reorder arrows ──────────────────────────────────────
function EntryReorderButtons({ sectionId, idx, total }) {
  const reorderEntries = useResumeStore((s) => s.reorderEntries);
  return (
    <div className="flex items-center gap-0.5">
      <button
        disabled={idx === 0}
        onClick={() => reorderEntries(sectionId, idx, idx - 1)}
        className="text-xs text-gray-400 hover:text-indigo-500 disabled:opacity-20 px-1 py-0.5 rounded"
      >▲</button>
      <button
        disabled={idx === total - 1}
        onClick={() => reorderEntries(sectionId, idx, idx + 1)}
        className="text-xs text-gray-400 hover:text-indigo-500 disabled:opacity-20 px-1 py-0.5 rounded"
      >▼</button>
    </div>
  );
}

// ── Education ─────────────────────────────────────────────────
const EducationEntry = memo(function EducationEntry({ sectionId, entry, idx, total }) {
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const u = useCallback((f, v) => updateEntry(sectionId, entry.id, f, v), [sectionId, entry.id, updateEntry]);

  return (
    <div className="section-entry">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <StableInput value={entry.institution} onChange={(v) => u('institution', v)} placeholder="Institution" />
        <StableInput value={entry.degree}      onChange={(v) => u('degree', v)}      placeholder="Degree / Program" />
        <StableInput value={entry.location}    onChange={(v) => u('location', v)}    placeholder="Location" />
        <StableInput value={entry.gpa}         onChange={(v) => u('gpa', v)}         placeholder="GPA (optional)" />
        <StableInput value={entry.startDate}   onChange={(v) => u('startDate', v)}   placeholder="Start (e.g. Sep 2021)" />
        <StableInput value={entry.endDate}     onChange={(v) => u('endDate', v)}     placeholder="End (e.g. May 2025)" />
      </div>

      <RichTextEditor
        value={entry.details || ''}
        onChange={(v) => u('details', v)}
        placeholder="Coursework, honors, activities… (optional)"
        minHeight={36}
      />

      <div className="mt-2 flex justify-between items-center">
        <EntryReorderButtons sectionId={sectionId} idx={idx} total={total} />
        <button className="btn-danger" onClick={() => removeEntry(sectionId, entry.id)}>✕ Remove</button>
      </div>
    </div>
  );
});

// ── Experience ────────────────────────────────────────────────
const ExperienceEntry = memo(function ExperienceEntry({ sectionId, entry, idx, total }) {
  const updateEntry  = useResumeStore((s) => s.updateEntry);
  const removeEntry  = useResumeStore((s) => s.removeEntry);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const addBullet    = useResumeStore((s) => s.addBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const splitBullet  = useResumeStore((s) => s.splitBullet);
  const u = useCallback((f, v) => updateEntry(sectionId, entry.id, f, v), [sectionId, entry.id, updateEntry]);

  return (
    <div className="section-entry">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <StableInput value={entry.company}   onChange={(v) => u('company', v)}   placeholder="Company / Organization" />
        <StableInput value={entry.role}      onChange={(v) => u('role', v)}      placeholder="Role / Job Title" />
        <StableInput value={entry.location}  onChange={(v) => u('location', v)}  placeholder="Location" />
        <div className="flex gap-1.5">
          <StableInput value={entry.startDate} onChange={(v) => u('startDate', v)} placeholder="Start" />
          <StableInput value={entry.endDate}   onChange={(v) => u('endDate', v)}   placeholder="End / Present" />
        </div>
      </div>

      {/* Bullet list — each bullet is a rich-text editor */}
      <div className="space-y-1.5">
        {(entry.bullets || []).map((b, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-indigo-500 mt-2 text-xs flex-shrink-0 select-none">•</span>
            <RichTextEditor
              value={b}
              onChange={(v) => updateBullet(sectionId, entry.id, i, v)}
              onEnterSplit={(before, after) => splitBullet(sectionId, entry.id, i, before, after)}
              placeholder="Describe responsibility — press Enter for next bullet…"
              className="flex-1"
              minHeight={30}
            />
            <button
              className="btn-danger mt-1 flex-shrink-0"
              onClick={() => removeBullet(sectionId, entry.id, i)}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <EntryReorderButtons sectionId={sectionId} idx={idx} total={total} />
          <button className="btn-secondary text-xs" onClick={() => addBullet(sectionId, entry.id)}>+ Add Bullet</button>
        </div>
        <button className="btn-danger" onClick={() => removeEntry(sectionId, entry.id)}>✕ Remove Entry</button>
      </div>
    </div>
  );
});

// ── Projects ──────────────────────────────────────────────────
const ProjectEntry = memo(function ProjectEntry({ sectionId, entry, idx, total }) {
  const updateEntry  = useResumeStore((s) => s.updateEntry);
  const removeEntry  = useResumeStore((s) => s.removeEntry);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const addBullet    = useResumeStore((s) => s.addBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const splitBullet  = useResumeStore((s) => s.splitBullet);
  const u = useCallback((f, v) => updateEntry(sectionId, entry.id, f, v), [sectionId, entry.id, updateEntry]);

  return (
    <div className="section-entry">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <StableInput value={entry.name}      onChange={(v) => u('name', v)}      placeholder="Project Name" />
        <StableInput value={entry.tech}      onChange={(v) => u('tech', v)}      placeholder="Technologies" />
        <StableInput value={entry.link}      onChange={(v) => u('link', v)}      placeholder="Link / GitHub URL (optional)" />
        <div className="flex gap-1.5">
          <StableInput value={entry.startDate} onChange={(v) => u('startDate', v)} placeholder="Start" />
          <StableInput value={entry.endDate}   onChange={(v) => u('endDate', v)}   placeholder="End" />
        </div>
      </div>

      <div className="space-y-1.5">
        {(entry.bullets || []).map((b, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-indigo-500 mt-2 text-xs flex-shrink-0 select-none">•</span>
            <RichTextEditor
              value={b}
              onChange={(v) => updateBullet(sectionId, entry.id, i, v)}
              onEnterSplit={(before, after) => splitBullet(sectionId, entry.id, i, before, after)}
              placeholder="What did you build / achieve? Press Enter for next bullet…"
              className="flex-1"
              minHeight={30}
            />
            <button
              className="btn-danger mt-1 flex-shrink-0"
              onClick={() => removeBullet(sectionId, entry.id, i)}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <EntryReorderButtons sectionId={sectionId} idx={idx} total={total} />
          <button className="btn-secondary text-xs" onClick={() => addBullet(sectionId, entry.id)}>+ Add Bullet</button>
        </div>
        <button className="btn-danger" onClick={() => removeEntry(sectionId, entry.id)}>✕ Remove Entry</button>
      </div>
    </div>
  );
});

// ── Certifications ────────────────────────────────────────────
const CertEntry = memo(function CertEntry({ sectionId, entry, idx, total }) {
  const updateEntry  = useResumeStore((s) => s.updateEntry);
  const removeEntry  = useResumeStore((s) => s.removeEntry);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const addBullet    = useResumeStore((s) => s.addBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const splitBullet  = useResumeStore((s) => s.splitBullet);
  const u = useCallback((f, v) => updateEntry(sectionId, entry.id, f, v), [sectionId, entry.id, updateEntry]);

  return (
    <div className="section-entry">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <StableInput value={entry.name}   onChange={(v) => u('name', v)}   placeholder="Certification Name" />
        <StableInput value={entry.issuer} onChange={(v) => u('issuer', v)} placeholder="Issuing Organization" />
        <StableInput value={entry.date}   onChange={(v) => u('date', v)}   placeholder="Date Obtained" />
        <StableInput value={entry.link}   onChange={(v) => u('link', v)}   placeholder="Credential URL (optional)" />
      </div>

      {/* Bullet notes for the certification */}
      {(entry.bullets || []).length > 0 && (
        <div className="space-y-1.5 mb-2">
          {(entry.bullets || []).map((b, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-indigo-500 mt-2 text-xs flex-shrink-0 select-none">•</span>
              <RichTextEditor
                value={b}
                onChange={(v) => updateBullet(sectionId, entry.id, i, v)}
                onEnterSplit={(before, after) => splitBullet(sectionId, entry.id, i, before, after)}
                placeholder="Skills learned, projects completed…"
                className="flex-1"
                minHeight={30}
              />
              <button
                className="btn-danger mt-1 flex-shrink-0"
                onClick={() => removeBullet(sectionId, entry.id, i)}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
          <EntryReorderButtons sectionId={sectionId} idx={idx} total={total} />
          <button className="btn-secondary text-xs" onClick={() => addBullet(sectionId, entry.id)}>+ Add Note</button>
        </div>
        <button className="btn-danger" onClick={() => removeEntry(sectionId, entry.id)}>✕ Remove</button>
      </div>
    </div>
  );
});

// ── Skills ────────────────────────────────────────────────────
const SkillsSection = memo(function SkillsSection({ section }) {
  const updateSkillCategory = useResumeStore((s) => s.updateSkillCategory);
  const addSkillTag         = useResumeStore((s) => s.addSkillTag);
  const removeSkillTag      = useResumeStore((s) => s.removeSkillTag);
  const addSkillCategory    = useResumeStore((s) => s.addSkillCategory);
  const removeSkillCategory = useResumeStore((s) => s.removeSkillCategory);
  const [tagInputs, setTagInputs] = useState({});

  const addTag = (catId, tags) => {
    const v = (tagInputs[catId] || '').trim();
    if (v) { addSkillTag(section.id, catId, v); setTagInputs((p) => ({ ...p, [catId]: '' })); }
  };

  return (
    <div className="space-y-3">
      {(section.categories || []).map((cat) => (
        <div key={cat.id} className="section-entry">
          <div className="flex items-center gap-2 mb-2">
            <StableInput
              value={cat.label}
              onChange={(v) => updateSkillCategory(section.id, cat.id, 'label', v)}
              placeholder="Category name"
              className="w-36 text-xs"
            />
            <button className="btn-danger text-xs" onClick={() => removeSkillCategory(section.id, cat.id)}>✕</button>
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
            {(cat.tags || []).map((tag, i) => (
              <span key={i} className="tag-pill">
                {tag}
                <button
                  onClick={() => removeSkillTag(section.id, cat.id, i)}
                  className="text-xs opacity-60 hover:opacity-100 ml-0.5"
                >✕</button>
              </span>
            ))}
          </div>

          {/* Tag input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInputs[cat.id] || ''}
              onChange={(e) => setTagInputs((p) => ({ ...p, [cat.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(cat.id);
                }
              }}
              placeholder="Type skill + Enter"
              className="input-field text-xs flex-1"
              style={{ caretColor: 'black' }}
            />
            <button className="btn-secondary text-xs" onClick={() => addTag(cat.id)}>Add</button>
          </div>
        </div>
      ))}
      <button className="btn-secondary text-xs w-full justify-center" onClick={() => addSkillCategory(section.id)}>
        + Add Skill Category
      </button>
    </div>
  );
});

// ── Generic / Custom section ──────────────────────────────────
const GenericSection = memo(function GenericSection({ section }) {
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const addEntry    = useResumeStore((s) => s.addEntry);
  const entries = section.entries || [];

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div key={entry.id} className="section-entry">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <StableInput value={entry.title    || ''} onChange={(v) => updateEntry(section.id, entry.id, 'title',     v)} placeholder="Title" />
            <StableInput value={entry.subtitle || ''} onChange={(v) => updateEntry(section.id, entry.id, 'subtitle',  v)} placeholder="Subtitle" />
            <StableInput value={entry.startDate|| ''} onChange={(v) => updateEntry(section.id, entry.id, 'startDate', v)} placeholder="Start Date" />
            <StableInput value={entry.endDate  || ''} onChange={(v) => updateEntry(section.id, entry.id, 'endDate',   v)} placeholder="End Date" />
          </div>
          <RichTextEditor
            value={entry.details || ''}
            onChange={(v) => updateEntry(section.id, entry.id, 'details', v)}
            placeholder="Details…"
            minHeight={40}
          />
          <div className="mt-2 flex justify-between items-center">
            <EntryReorderButtons sectionId={section.id} idx={idx} total={entries.length} />
            <button className="btn-danger" onClick={() => removeEntry(section.id, entry.id)}>✕ Remove</button>
          </div>
        </div>
      ))}
      <button className="btn-secondary text-xs w-full justify-center" onClick={() => addEntry(section.id)}>+ Add Entry</button>
    </div>
  );
});

// ── Section wrapper with collapse / reorder / remove ──────────
function DynamicSection({ section, idx, totalSections, collapseSignal }) {
  const [collapsed, setCollapsed] = useState(false);

  // Sync with parent collapse-all / expand-all signal
  useEffect(() => {
    if (collapseSignal !== null) setCollapsed(collapseSignal);
  }, [collapseSignal]);
  const removeSection   = useResumeStore((s) => s.removeSection);
  const addEntry        = useResumeStore((s) => s.addEntry);
  const reorderSections = useResumeStore((s) => s.reorderSections);

  const renderContent = () => {
    const entries = section.entries || [];
    const total   = entries.length;
    switch (section.type) {
      case 'education':     return entries.map((e, i) => <EducationEntry  key={e.id} sectionId={section.id} entry={e} idx={i} total={total} />);
      case 'experience':    return entries.map((e, i) => <ExperienceEntry key={e.id} sectionId={section.id} entry={e} idx={i} total={total} />);
      case 'projects':      return entries.map((e, i) => <ProjectEntry    key={e.id} sectionId={section.id} entry={e} idx={i} total={total} />);
      case 'certifications':return entries.map((e, i) => <CertEntry       key={e.id} sectionId={section.id} entry={e} idx={i} total={total} />);
      case 'skills':        return <SkillsSection section={section} />;
      default:              return <GenericSection section={section} />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card p-3 mb-3"
    >
      {/* Clickable header row — left side collapses, right side has actions */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="flex items-center gap-2 flex-1 min-w-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <span
            style={{
              fontSize: 12,
              color: '#94A3B8',
              transition: 'transform .18s',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          >▾</span>
          <SectionTitleEditor sectionId={section.id} title={section.title} />
        </button>

        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {!collapsed && section.type !== 'skills' && (
            <button className="btn-ghost text-xs" onClick={() => addEntry(section.id)}>+ Entry</button>
          )}
          <button
            disabled={idx === 0}
            onClick={() => reorderSections(idx, idx - 1)}
            className="text-xs text-gray-400 hover:text-indigo-500 disabled:opacity-20 px-1 py-0.5 rounded"
          >▲</button>
          <button
            disabled={idx === totalSections - 1}
            onClick={() => reorderSections(idx, idx + 1)}
            className="text-xs text-gray-400 hover:text-indigo-500 disabled:opacity-20 px-1 py-0.5 rounded"
          >▼</button>
          <button
            className="btn-danger"
            onClick={() => { if (confirm(`Remove "${section.title}" section?`)) removeSection(section.id); }}
          >✕</button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Root form ─────────────────────────────────────────────────
export default function ResumeForm() {
  const resume       = useResumeStore((s) => s.resume);
  const updatePersonal = useResumeStore((s) => s.updatePersonal);
  const addLink      = useResumeStore((s) => s.addLink);
  const updateLink   = useResumeStore((s) => s.updateLink);
  const removeLink   = useResumeStore((s) => s.removeLink);
  const addSection   = useResumeStore((s) => s.addSection);
  const undo         = useResumeStore((s) => s.undo);
  const redo         = useResumeStore((s) => s.redo);
  const resetResume  = useResumeStore((s) => s.resetResume);
  const [showAddMenu,       setShowAddMenu]       = useState(false);
  const [personalCollapsed, setPersonalCollapsed] = useState(false);
  const [collapseSignal,    setCollapseSignal]    = useState(null);
  const [resetArmed,        setResetArmed]        = useState(false);
  const resetTimerRef = useRef(null);

  const allCollapsed = personalCollapsed;

  const toggleAll = () => {
    const next = !allCollapsed;
    setPersonalCollapsed(next);
    setCollapseSignal(next);
    // Reset signal after a tick so future manual toggles aren't blocked
    setTimeout(() => setCollapseSignal(null), 50);
  };

  const sectionTypes = [
    { type: 'education',     label: '🎓 Education' },
    { type: 'experience',    label: '💼 Experience' },
    { type: 'projects',      label: '🚀 Projects' },
    { type: 'skills',        label: '⚡ Skills' },
    { type: 'certifications',label: '🏅 Certifications' },
    { type: 'custom',        label: '✨ Custom' },
  ];

  const wordCount = useMemo(() => countResumeWords(resume), [resume]);
  const wcColor = wordCount < 250 ? '#F59E0B' : wordCount <= 600 ? '#10B981' : '#EF4444';
  const wcLabel = wordCount < 250 ? 'Too short' : wordCount <= 600 ? 'Good length' : 'Consider trimming';
  const wcPct   = Math.min((wordCount / 600) * 100, 100);

  return (
    <div className="h-full flex flex-col" style={{ background: '#F8FAFC' }}>
    <div className="flex-1 overflow-y-auto px-3 py-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Resume Editor</h2>
        <div className="flex gap-1.5 items-center">
          <button
            className="btn-ghost text-xs"
            onClick={toggleAll}
            title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
          >
            {allCollapsed ? '⊞ Expand All' : '⊟ Collapse All'}
          </button>
          <button className="btn-ghost text-xs" onClick={undo} title="Undo">↩</button>
          <button className="btn-ghost text-xs" onClick={redo} title="Redo">↪</button>

          {/* Reset — two-step confirmation */}
          <button
            onClick={() => {
              if (!resetArmed) {
                setResetArmed(true);
                resetTimerRef.current = setTimeout(() => setResetArmed(false), 3000);
              } else {
                clearTimeout(resetTimerRef.current);
                setResetArmed(false);
                resetResume();
              }
            }}
            title={resetArmed ? 'Click again to confirm reset' : 'Clear all resume content'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 7,
              border: resetArmed ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
              background: resetArmed ? '#FEF2F2' : '#fff',
              color: resetArmed ? '#DC2626' : '#6B7280',
              cursor: 'pointer',
              transition: 'all .18s',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform .3s', transform: resetArmed ? 'rotate(180deg)' : 'none' }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            {resetArmed ? 'Confirm Reset?' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card p-3 mb-3">
        <button
          className="flex items-center justify-between w-full mb-2"
          onClick={() => setPersonalCollapsed((p) => !p)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Personal Information</h3>
          <span style={{ fontSize: 13, color: '#94A3B8', transition: 'transform .18s', transform: personalCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
        </button>
        <AnimatePresence initial={false}>
          {!personalCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="grid grid-cols-2 gap-2">
                {[
                  { field: 'fullName',  placeholder: 'Full Name' },
                  { field: 'email',     placeholder: 'Email Address' },
                  { field: 'phone',     placeholder: 'Phone Number' },
                ].map(({ field, placeholder }) => (
                  <StableInput
                    key={field}
                    value={resume.personal[field] || ''}
                    onChange={(v) => updatePersonal(field, v)}
                    placeholder={placeholder}
                  />
                ))}
              </div>

              {/* Dynamic Links */}
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Links</span>
                  <button className="btn-secondary text-xs py-0.5 px-2" onClick={addLink}>+ Add Link</button>
                </div>
                {(resume.personal.links || []).map((link) => (
                  <div key={link.id} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                      placeholder="Label (e.g. GitHub)"
                      className="input-field text-xs w-28 flex-shrink-0"
                      style={{ caretColor: 'black' }}
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                      placeholder="URL or value"
                      className="input-field text-xs flex-1"
                      style={{ caretColor: 'black' }}
                    />
                    <button
                      onClick={() => removeLink(link.id)}
                      className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0 px-1"
                    >✕</button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-2">
                <RichTextEditor
                  value={resume.personal.summary || ''}
                  onChange={(v) => updatePersonal('summary', v)}
                  placeholder="Professional summary / objective — supports Bold, Italic, Underline…"
                  minHeight={64}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic sections */}
      <AnimatePresence>
        {resume.sections.map((section, idx) => (
          <DynamicSection
            key={section.id}
            section={section}
            idx={idx}
            totalSections={resume.sections.length}
            collapseSignal={collapseSignal}
          />
        ))}
      </AnimatePresence>

      {/* Add section */}
      <div className="relative mb-4">
        <button
          className="btn-secondary w-full justify-center"
          onClick={() => setShowAddMenu((p) => !p)}
        >
          {showAddMenu ? '✕ Close' : '+ Add Section'}
        </button>
        <AnimatePresence>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="absolute bottom-full mb-2 left-0 right-0 card p-2 z-20"
            >
              <div className="grid grid-cols-2 gap-1">
                {sectionTypes.map(({ type, label }) => (
                  <button
                    key={type}
                    className="btn-ghost text-xs justify-start"
                    onClick={() => { addSection(type); setShowAddMenu(false); }}
                  >{label}</button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* ── Word count sticky footer ───────────────────────────── */}
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid #E5E7EB',
      background: '#fff',
      padding: '8px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Progress bar */}
        <div style={{ flex: 1, height: 4, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${wcPct}%`,
            background: wcColor,
            borderRadius: 4,
            transition: 'width .4s cubic-bezier(.4,0,.2,1), background .3s',
          }} />
        </div>
        {/* Count */}
        <span style={{ fontSize: 13, fontWeight: 700, color: wcColor, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {wordCount}
        </span>
        <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>words · {wcLabel}</span>
      </div>
    </div>
    </div>
  );
}
