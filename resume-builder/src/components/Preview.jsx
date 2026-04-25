import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import useResumeStore from '../store/resumeStore';

/* ── Typography constants ─────────────────────────────────── */
const T = {
  name:        { fontSize: 22, fontWeight: 700, fontFamily: 'Arial, sans-serif', lineHeight: 1.2, marginBottom: 4 },
  contact:     { fontSize: 10.5, color: '#374151', lineHeight: 1.6, marginBottom: 4, fontFamily: 'Arial, sans-serif' },
  sectionHead: { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                  borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 8, marginTop: 12,
                  fontFamily: 'Arial, sans-serif', color: '#000' },
  entryTitle:  { fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 },
  entryMeta:   { fontSize: 10.5, color: '#374151', lineHeight: 1.4 },
  entryDate:   { fontSize: 10.5, color: '#374151' },
  bulletText:  { fontSize: 11, color: '#1f2937', lineHeight: 1.55 },
  bodyText:    { fontSize: 11.5, color: '#374151', lineHeight: 1.6 },
  skillLabel:  { fontSize: 11.5, fontWeight: 700 },
  skillValue:  { fontSize: 11.5, color: '#1f2937' },
};

/* ── Detect whether a string contains HTML tags ───────────── */
function isHTML(str) {
  return str && /<[a-z][\s\S]*>/i.test(str);
}

/* ── Render text that may be plain or HTML ───────────────── */
function RichText({ html, style, className }) {
  if (!html?.trim()) return null;
  if (isHTML(html)) {
    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <p style={style}>{html}</p>;
}

/* ── Plain-text auto-bullet (legacy plain-text details) ────── */
function AutoBullets({ text, style }) {
  if (!text?.trim()) return null;
  if (isHTML(text)) {
    return <div style={style || T.bodyText} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  const lines = text.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  if (lines.length <= 1) return <p style={style || T.bodyText}>{text}</p>;
  return (
    <ul style={{ marginTop: 4, paddingLeft: 16, listStyle: 'disc' }}>
      {lines.map((line, i) => (
        <li key={i} style={{ ...T.bulletText, marginBottom: 3 }}>{line}</li>
      ))}
    </ul>
  );
}

/* ── Row helper: content left, date right ─────────────────── */
function EntryRow({ left, right, leftStyle, rightStyle }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 1 }}>
      <span style={leftStyle || T.entryTitle}>{left}</span>
      {right && <span style={{ ...T.entryDate, flexShrink: 0, ...(rightStyle || {}) }}>{right}</span>}
    </div>
  );
}

/* ── Bullet list that preserves rich-text HTML ───────────── */
function BulletList({ bullets }) {
  const filtered = (bullets || []).filter(Boolean);
  if (!filtered.length) return null;
  return (
    <ul style={{ marginTop: 4, paddingLeft: 16, listStyle: 'disc' }}>
      {filtered.map((b, j) => (
        isHTML(b)
          ? (
            <li
              key={j}
              className="resume-bullet"
              style={{ ...T.bulletText, marginBottom: 3 }}
              dangerouslySetInnerHTML={{ __html: b }}
            />
          )
          : (
            <li key={j} style={{ ...T.bulletText, marginBottom: 3 }}>{b}</li>
          )
      ))}
    </ul>
  );
}

/* ── Section renderers ─────────────────────────────────────── */
function EducationSection({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(entries || []).map((e, i) => (
        <div key={i}>
          <EntryRow
            left={e.institution || ''}
            right={[e.startDate, e.endDate].filter(Boolean).join(' – ')}
          />
          <EntryRow
            left={[e.degree, e.gpa ? `GPA: ${e.gpa}` : ''].filter(Boolean).join(' | ')}
            right={e.location}
            leftStyle={{ ...T.entryMeta, fontStyle: 'italic' }}
            rightStyle={T.entryDate}
          />
          {e.details && (
            <AutoBullets
              text={e.details}
              style={{ ...T.bodyText, marginTop: 3, fontStyle: 'italic' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ExperienceSection({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(entries || []).map((e, i) => (
        <div key={i}>
          <EntryRow
            left={
              <span>
                {e.company || ''}
                {e.role ? <span style={{ fontWeight: 400, fontStyle: 'italic' }}> | <em>{e.role}</em></span> : null}
              </span>
            }
            right={[
              e.location ? `${e.location}` : '',
              [e.startDate, e.endDate].filter(Boolean).join(' – '),
            ].filter(Boolean).join(' | ')}
          />
          <BulletList bullets={e.bullets} />
        </div>
      ))}
    </div>
  );
}

function ProjectsSection({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(entries || []).map((e, i) => (
        <div key={i}>
          <EntryRow
            left={<span style={T.entryTitle}>{e.name || ''}</span>}
            right={e.tech ? <span style={{ fontStyle: 'italic', ...T.entryDate }}>{e.tech}</span> : null}
            rightStyle={T.entryDate}
          />
          {e.link && (
            <div style={{ ...T.entryMeta, color: '#4338ca', marginBottom: 2 }}>{e.link}</div>
          )}
          {[e.startDate, e.endDate].filter(Boolean).length > 0 && (
            <div style={{ ...T.entryDate, marginBottom: 2 }}>
              {[e.startDate, e.endDate].filter(Boolean).join(' – ')}
            </div>
          )}
          <BulletList bullets={e.bullets} />
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ categories }) {
  return (
    <ul style={{ marginTop: 2, paddingLeft: 16, listStyle: 'disc' }}>
      {(categories || []).map((cat, i) => (
        <li key={i} style={{ ...T.skillValue, marginBottom: 3 }}>
          <span style={T.skillLabel}>{cat.label}:</span>{' '}
          {(cat.tags || []).filter(Boolean).join(', ')}
        </li>
      ))}
    </ul>
  );
}

function CertSection({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(entries || []).map((e, i) => (
        <div key={i}>
          <EntryRow
            left={
              <span>
                <strong>{e.name || ''}</strong>
                {e.issuer ? <span style={{ fontWeight: 400 }}> – {e.issuer}</span> : null}
              </span>
            }
            right={e.date}
            leftStyle={T.entryMeta}
          />
          {/* Certification bullet notes */}
          <BulletList bullets={e.bullets} />
        </div>
      ))}
    </div>
  );
}

function GenericSection({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(entries || []).map((e, i) => (
        <div key={i}>
          <EntryRow
            left={e.title || ''}
            right={[e.startDate, e.endDate].filter(Boolean).join(' – ')}
          />
          {e.subtitle && (
            <div style={{ ...T.entryMeta, fontStyle: 'italic', marginBottom: 2 }}>{e.subtitle}</div>
          )}
          {e.details && <AutoBullets text={e.details} />}
        </div>
      ))}
    </div>
  );
}

/* ── Full preview content ─────────────────────────────────── */
export function ResumePreviewContent({ resume, id }) {
  const { personal, sections } = resume;

  // Build contact items — links show only their label, not the raw URL
  const contactItems = [
    personal.phone ? { kind: 'text', content: personal.phone } : null,
    personal.email ? { kind: 'link', label: personal.email, href: `mailto:${personal.email}` } : null,
    ...(personal.links || [])
      .filter((l) => l.url)
      .map((l) => ({ kind: 'link', label: l.label || l.url, href: l.url })),
  ].filter(Boolean);

  return (
    <div
      id={id || 'resume-preview-content'}
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: 12,
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: '44px 52px',
        lineHeight: 1.4,
        minHeight: '297mm',
      }}
    >
      {/* Name */}
      <div style={T.name}>{personal.fullName || 'Your Name'}</div>

      {/* Contact — phone + email + links as clickable labels */}
      {contactItems.length > 0 && (
        <div style={T.contact}>
          {contactItems.map((item, i) => (
            <span key={i}>
              {i > 0 && <span style={{ color: '#9CA3AF', margin: '0 4px' }}>|</span>}
              {item.kind === 'link' ? (
                /* Non-interactive: displayed as text only, no click/hover/pointer */
                <span style={{ color: '#374151', cursor: 'default', userSelect: 'text' }}>
                  {item.label}
                </span>
              ) : (
                <span>{item.content}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Summary — renders plain text or rich HTML */}
      {personal.summary?.trim() && (
        <>
          <div style={{ ...T.sectionHead, marginTop: 10 }}>Summary</div>
          <RichText html={personal.summary} style={T.bodyText} />
        </>
      )}

      {/* Dynamic sections */}
      {(sections || []).map((section) => {
        const content = () => {
          switch (section.type) {
            case 'education':      return <EducationSection  entries={section.entries} />;
            case 'experience':     return <ExperienceSection entries={section.entries} />;
            case 'projects':       return <ProjectsSection   entries={section.entries} />;
            case 'skills':         return <SkillsSection     categories={section.categories} />;
            case 'certifications': return <CertSection       entries={section.entries} />;
            default:               return <GenericSection    entries={section.entries} />;
          }
        };

        return (
          <div key={section.id}>
            <div style={T.sectionHead}>{section.title}</div>
            {content()}
          </div>
        );
      })}
    </div>
  );
}

/* ── Preview panel ────────────────────────────────────────── */
const A4_WIDTH = 794;
// Default height ≈ A4 (297mm @ 96dpi) + vertical padding — avoids layout jump on mount
const A4_HEIGHT_DEFAULT = 1210;

export default function Preview({ minimized, onToggleMinimize }) {
  const resume = useResumeStore((s) => s.resume);
  const [zoom, setZoom] = useState(1.0);
  const containerRef = useRef(null);
  const innerScaleRef = useRef(null);
  // Tracks the unscaled (natural) pixel height of the resume content
  const [naturalHeight, setNaturalHeight] = useState(A4_HEIGHT_DEFAULT);

  // Auto-fit zoom whenever the container is narrower than A4
  useEffect(() => {
    if (!containerRef.current) return;
    const fit = () => {
      const available = containerRef.current.clientWidth - 48;
      if (available < A4_WIDTH) {
        setZoom(Math.max(0.3, parseFloat((available / A4_WIDTH).toFixed(2))));
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Measure the content's natural (pre-transform) height so the scroll
  // container always knows the true visual extent after scaling.
  // Without this, zoom > 1 cuts off the bottom (layout height < visual height).
  useLayoutEffect(() => {
    if (!innerScaleRef.current) return;
    const ro = new ResizeObserver(() => {
      if (innerScaleRef.current) {
        setNaturalHeight(innerScaleRef.current.scrollHeight);
      }
    });
    ro.observe(innerScaleRef.current);
    return () => ro.disconnect();
  }, []);

  if (minimized) {
    return (
      <div className="h-full flex flex-col items-center justify-start bg-white border-r border-gray-200 py-3" style={{ width: '100%' }}>
        <button
          onClick={onToggleMinimize}
          className="btn-ghost flex flex-col items-center gap-1 p-2"
          title="Expand preview"
        >
          <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>
            PREVIEW
          </span>
          <span style={{ fontSize: 16 }}>▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#F3F4F6' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-1">
          <button className="btn-ghost text-xs py-1 px-2" onClick={onToggleMinimize} title="Minimize preview">◀</button>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#6B7280' }}>Live Preview</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost text-xs py-1 px-2" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}>−</button>
          <span className="text-xs text-gray-500 w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button className="btn-ghost text-xs py-1 px-2" onClick={() => setZoom((z) => Math.min(2.0, +(z + 0.1).toFixed(1)))}>+</button>
          <button className="btn-ghost text-xs" onClick={() => setZoom(1.0)}>Fit</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: 24, background: '#F3F4F6' }}>
        {/*
          Outer wrapper: tells the scroll container the true visual dimensions
          after the CSS scale transform. CSS transform does not affect layout,
          so without explicit width/height the scroll area is wrong at zoom ≠ 1.
          – width  = A4_WIDTH  * zoom  (horizontal scroll when zoomed in)
          – height = naturalHeight * zoom  (vertical scroll always correct)
        */}
        <div
          style={{
            width: Math.round(A4_WIDTH * zoom),
            height: Math.ceil(naturalHeight * zoom),
            margin: '0 auto',
            position: 'relative',
            transition: 'width 0.18s, height 0.18s',
          }}
        >
          {/* Inner: position:absolute so it does not influence the outer's layout size */}
          <div
            ref={innerScaleRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.18s',
              width: A4_WIDTH,
              boxShadow: '0 4px 6px rgba(0,0,0,.04), 0 12px 48px rgba(0,0,0,.10), 0 2px 0 rgba(0,0,0,.02)',
              borderRadius: 2,
            }}
          >
            <ResumePreviewContent resume={resume} />
          </div>
        </div>
      </div>
    </div>
  );
}
