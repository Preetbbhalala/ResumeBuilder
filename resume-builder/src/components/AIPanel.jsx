import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import useResumeStore from '../store/resumeStore';
import { countResumeWords } from '../utils/wordCount';

/* ── Icons ──────────────────────────────────────────────────── */
function MaximizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  );
}
function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  );
}

/* ── ATS Score Engine ────────────────────────────────────────── */

const ACTION_VERBS = new Set([
  'accelerated','achieved','acquired','administered','advanced','advised','advocated',
  'aligned','allocated','amplified','analyzed','architected','automated','awarded',
  'built','championed','collaborated','consolidated','coordinated','created','cut',
  'defined','delivered','deployed','designed','developed','devised','directed',
  'drove','eliminated','enabled','engineered','established','exceeded','executed',
  'expanded','facilitated','generated','grew','guided','implemented','improved',
  'increased','initiated','integrated','introduced','launched','led','leveraged',
  'maintained','managed','mentored','migrated','modernized','negotiated','optimized',
  'orchestrated','oversaw','partnered','pioneered','produced','programmed','reduced',
  'refactored','restructured','scaled','secured','shaped','shipped','simplified',
  'spearheaded','standardized','streamlined','strengthened','trained','transformed',
  'upgraded','utilized','validated',
]);

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function firstWord(text) {
  return stripHtml(text).split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
}

function hasMetric(text) {
  const t = stripHtml(text);
  return /\d/.test(t) || /\d+[%x×kmb]|[$€£¥]|\d+\s*(percent|million|billion|thousand|k\b)/i.test(t);
}

/* score breakdown shape: { label, score, max, detail } */
function useATSScore(resume) {
  return useMemo(() => {
    if (!resume) return { total: 0, breakdown: [] };
    const { personal, sections } = resume;

    // ── 1. Contact & Identity (12 pts) ───────────────────────
    let contactScore = 0;
    const contactDetail = [];
    if (personal.fullName?.trim())  { contactScore += 3; contactDetail.push('Name ✓'); }
    else contactDetail.push('Name missing');
    if (personal.email?.trim())     { contactScore += 3; contactDetail.push('Email ✓'); }
    else contactDetail.push('Email missing');
    if (personal.phone?.trim())     { contactScore += 3; contactDetail.push('Phone ✓'); }
    else contactDetail.push('Phone missing');
    const links = personal.links || [];
    const hasLinkedIn = links.some((l) => /linkedin/i.test(l.label) || /linkedin/i.test(l.url));
    if (hasLinkedIn) { contactScore += 3; contactDetail.push('LinkedIn ✓'); }
    else contactDetail.push('LinkedIn missing');

    // ── 2. Professional Summary (12 pts) ─────────────────────
    const summaryText = stripHtml(personal.summary || '');
    const summaryLen  = summaryText.length;
    let summaryScore  = 0;
    const summaryDetail = [];
    if (summaryLen > 0)   { summaryScore += 4; summaryDetail.push('Present ✓'); }
    else summaryDetail.push('No summary');
    if (summaryLen > 60)  { summaryScore += 4; summaryDetail.push('Good length ✓'); }
    else if (summaryLen > 0) summaryDetail.push('Too brief');
    if (summaryLen > 160) { summaryScore += 4; summaryDetail.push('Strong depth ✓'); }
    else if (summaryLen > 60) summaryDetail.push('Could be longer');

    // ── 3. Action Verb Usage (20 pts) ────────────────────────
    const expSec  = sections.find((s) => s.type === 'experience');
    const projSec = sections.find((s) => s.type === 'projects');
    const allBullets = [
      ...((expSec?.entries  || []).flatMap((e) => e.bullets || [])),
      ...((projSec?.entries || []).flatMap((e) => e.bullets || [])),
    ].filter(Boolean);
    const totalBullets = allBullets.length;
    const verbBullets  = allBullets.filter((b) => ACTION_VERBS.has(firstWord(b))).length;
    const verbRatio    = totalBullets > 0 ? verbBullets / totalBullets : 0;
    const verbScore    = totalBullets === 0 ? 0
                       : verbRatio >= 0.85 ? 20
                       : verbRatio >= 0.65 ? 16
                       : verbRatio >= 0.45 ? 11
                       : verbRatio >= 0.20 ? 6
                       : 2;
    const verbDetail   = totalBullets === 0
      ? ['No bullets found']
      : [`${verbBullets}/${totalBullets} bullets start with action verb`];

    // ── 4. Quantified Impact (18 pts) ────────────────────────
    const metricBullets = allBullets.filter(hasMetric).length;
    const metricRatio   = totalBullets > 0 ? metricBullets / totalBullets : 0;
    const metricScore   = totalBullets === 0 ? 0
                        : metricRatio >= 0.60 ? 18
                        : metricRatio >= 0.40 ? 14
                        : metricRatio >= 0.20 ? 9
                        : metricBullets > 0   ? 4
                        : 0;
    const metricDetail  = totalBullets === 0
      ? ['No bullets to evaluate']
      : [`${metricBullets}/${totalBullets} bullets contain metrics/numbers`];

    // ── 5. Skills Keywords (13 pts) ──────────────────────────
    const skillSec   = sections.find((s) => s.type === 'skills');
    const skillCount = (skillSec?.categories || []).reduce(
      (a, c) => a + (c.tags || []).filter(Boolean).length, 0,
    );
    const skillScore  = skillCount >= 15 ? 13
                      : skillCount >= 10 ? 10
                      : skillCount >= 6  ?  7
                      : skillCount >= 3  ?  4
                      : skillCount > 0   ?  2
                      : 0;
    const skillDetail = [`${skillCount} skill keywords found`];

    // ── 6. Section Structure (15 pts) ────────────────────────
    let structScore = 0;
    const structDetail = [];
    if (sections.some((s) => s.type === 'experience' && s.entries?.length > 0))
      { structScore += 5; structDetail.push('Experience ✓'); }
    else structDetail.push('Experience missing');
    if (sections.some((s) => s.type === 'education' && s.entries?.length > 0))
      { structScore += 4; structDetail.push('Education ✓'); }
    else structDetail.push('Education missing');
    if (sections.some((s) => s.type === 'skills' && s.categories?.length > 0))
      { structScore += 3; structDetail.push('Skills ✓'); }
    else structDetail.push('Skills missing');
    if (sections.some((s) => s.type === 'projects' && s.entries?.length > 0))
      { structScore += 3; structDetail.push('Projects ✓'); }
    else structDetail.push('Projects missing');

    // ── 7. Bullet Depth & Quality (10 pts) ───────────────────
    const expEntries   = expSec?.entries || [];
    const totalExpBullets = expEntries.reduce((a, e) => a + (e.bullets || []).filter(Boolean).length, 0);
    const avgLen = allBullets.length > 0
      ? allBullets.reduce((a, b) => a + stripHtml(b).length, 0) / allBullets.length
      : 0;
    let bulletQualityScore = 0;
    const bulletDetail = [];
    if (totalExpBullets >= 8)     { bulletQualityScore += 5; bulletDetail.push('Good bullet count ✓'); }
    else if (totalExpBullets > 0) { bulletQualityScore += Math.round((totalExpBullets / 8) * 5); bulletDetail.push(`${totalExpBullets} exp bullets (aim for 8+)`); }
    else bulletDetail.push('No experience bullets');
    if (avgLen >= 50)             { bulletQualityScore += 5; bulletDetail.push('Good bullet depth ✓'); }
    else if (avgLen > 0)          { bulletQualityScore += Math.round((avgLen / 50) * 5); bulletDetail.push('Bullets too short'); }

    const breakdown = [
      { label: 'Contact & Identity',   score: contactScore,       max: 12, pct: Math.round((contactScore/12)*100),       detail: contactDetail,  prompt: 'My resume is missing contact information. What contact details should I add to make it ATS-friendly?' },
      { label: 'Professional Summary', score: summaryScore,       max: 12, pct: Math.round((summaryScore/12)*100),       detail: summaryDetail,  prompt: 'Write me a compelling 2-3 sentence ATS-optimized professional summary based on my resume.' },
      { label: 'Action Verbs',         score: verbScore,          max: 20, pct: Math.round((verbScore/20)*100),          detail: verbDetail,     prompt: 'Rewrite my experience and project bullets to start with strong ATS action verbs like Led, Built, Optimized, Delivered, etc.' },
      { label: 'Quantified Impact',    score: metricScore,        max: 18, pct: Math.round((metricScore/18)*100),        detail: metricDetail,   prompt: 'Help me add specific numbers, percentages, and measurable outcomes to my experience bullets to quantify my impact for ATS.' },
      { label: 'Skills Keywords',      score: skillScore,         max: 13, pct: Math.round((skillScore/13)*100),         detail: skillDetail,    prompt: 'Suggest 10-15 relevant technical and professional skills I should add to my resume based on my experience to improve ATS keyword matching.' },
      { label: 'Section Structure',    score: structScore,        max: 15, pct: Math.round((structScore/15)*100),        detail: structDetail,   prompt: 'My resume is missing some key sections. What sections should I add and what should go in them to improve ATS compatibility?' },
      { label: 'Bullet Depth',         score: bulletQualityScore, max: 10, pct: Math.round((bulletQualityScore/10)*100), detail: bulletDetail,   prompt: 'Help me expand my experience bullets with more detail and depth. Each bullet should be 1-2 sentences with clear impact.' },
    ];

    const total = Math.min(
      contactScore + summaryScore + verbScore + metricScore + skillScore + structScore + bulletQualityScore,
      100,
    );

    return { total, breakdown };
  }, [resume]);
}

/* ── ATS Score ring ──────────────────────────────────────────── */
function ScoreRing({ score }) {
  const r      = 36;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  = score >= 80 ? '#10B981' : score >= 55 ? '#F59E0B' : '#EF4444';
  const label  = score >= 80 ? 'ATS Ready' : score >= 55 ? 'Needs Polish' : 'Not ATS-Ready';
  const ring2  = score >= 80 ? '#D1FAE5' : score >= 55 ? '#FEF3C7' : '#FEE2E2';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
        <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="44" cy="44" r={r} fill="none" stroke={ring2} strokeWidth="8" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke .4s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, marginTop: 1 }}>/100</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-.2px' }}>ATS Score</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4,
          padding: '3px 9px', borderRadius: 20,
          background: ring2, color, fontSize: 12, fontWeight: 700,
        }}>{label}</div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 1.5 }}>
          Measures keyword density,<br />action verbs & structure
        </div>
      </div>
    </div>
  );
}

/* ── Score breakdown bars ────────────────────────────────────── */
function ScoreBreakdown({ breakdown, onSuggestionClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {breakdown.map(({ label, score, max, pct, detail }) => {
        const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
        const bg    = pct >= 80 ? '#D1FAE5' : pct >= 50 ? '#FEF3C7' : '#FEE2E2';
        return (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color,
                background: bg, padding: '1px 7px', borderRadius: 10,
              }}>{score}/{max}</span>
            </div>
            <div style={{ height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 4, transition: 'width .9s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            {detail.map((d, i) => (
              <span key={i} style={{ fontSize: 10.5, color: '#9CA3AF', marginRight: 8 }}>{d}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── Word count card ─────────────────────────────────────────── */
function WordCountCard({ resume }) {
  const count  = useMemo(() => countResumeWords(resume), [resume]);
  const color  = count < 300 ? '#F59E0B' : count <= 700 ? '#10B981' : '#EF4444';
  const label  = count < 300 ? 'Too short — ATS may skip thin resumes'
               : count <= 700 ? 'Ideal ATS length'
               : 'Too long — consider trimming';
  const pct    = Math.min((count / 700) * 100, 100);

  return (
    <div style={{ padding: 14, background: '#FAFBFF', border: '1.5px solid #EEF2FF', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#4F46E5' }}>
          Word Count
        </span>
        <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{count.toLocaleString()}</span>
      </div>
      <div style={{ height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 4, transition: 'width .5s cubic-bezier(.4,0,.2,1), background .3s',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Target: 300–700</span>
      </div>
    </div>
  );
}

/* ── Actionable suggestions ──────────────────────────────────── */
function useSuggestions(resume, breakdown) {
  return useMemo(() => {
    const tips = [];
    for (const item of breakdown) {
      if (item.pct < 80) {
        tips.push({
          icon: item.pct >= 50 ? '⚠️' : '❌',
          label: item.label,
          text: item.detail[0] || item.label,
          prompt: item.prompt,
          score: item.score,
          max: item.max,
          pct: item.pct,
        });
      }
    }
    if (tips.length === 0) {
      tips.push({
        icon: '🏆',
        label: 'Excellent',
        text: 'Your resume is highly ATS-optimized! Consider tailoring keywords for specific job descriptions.',
        prompt: 'My resume has a high ATS score. Help me tailor it even further for a specific job description by optimizing keyword density.',
        score: 100,
        max: 100,
        pct: 100,
      });
    }
    return tips.sort((a, b) => a.pct - b.pct); // worst first
  }, [resume, breakdown]);
}

/* ── Gemini key detection ────────────────────────────────────── */
function isGeminiKey(key) {
  return key && key.startsWith('AIza') && key.length >= 20;
}

function apiKeyBorderStyle(key) {
  if (!key) return {};
  if (isGeminiKey(key)) return { borderColor: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,.12)' };
  if (key.length > 4) return { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,.12)' };
  return {};
}

/* ── Chat sub-component ──────────────────────────────────────── */
function ChatSection({ apiKey, resume, setResumeFromAI, triggerMessage, onTriggerConsumed, onConnect }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! I'm your Gemini resume editor. Tell me anything — \"improve my summary\", \"add action verbs\", \"tailor for this job\" — and I'll apply the changes to your resume instantly. Paste your free Gemini API key above to get started.",
  }]);
  const [jobDesc, setJobDesc] = useState('');
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text !== undefined ? text : input).trim();
    if (!msg || loading) return;
    setInput('');

    if (!isGeminiKey(apiKey)) {
      setMessages((p) => [...p, { role: 'user', content: msg }, {
        role: 'assistant',
        content: '⚠️ Paste your Google Gemini API key above first (starts with AIza). Get one free at aistudio.google.com.',
      }]);
      return;
    }

    const isLikelyJD = !jobDesc && msg.length > 120;
    if (isLikelyJD) setJobDesc(msg);

    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);

    try {
      if (isLikelyJD) {
        // Job description → optimize-resume (dedicated endpoint, faster)
        const res  = await fetch('/api/optimize-resume', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume, jobDescription: msg, apiKey }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.model) onConnect?.({ model: data.model, provider: data.provider });
        setResumeFromAI(data.resume);
        setMessages((p) => [...p, {
          role: 'assistant',
          content: `✅ Resume tailored for this job${data.model ? ` · ${data.model}` : ''}. Keywords and bullets updated — check the preview. Ctrl+Z to undo.`,
        }]);
        return;
      }

      // All other messages → smartChat: one call returns reply + optional resume update
      const res  = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, resumeContext: resume, history: next.slice(-6), apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.model) onConnect?.({ model: data.model, provider: data.provider });

      if (data.resume) {
        // Gemini applied changes — auto-update resume immediately
        setResumeFromAI(data.resume);
        setMessages((p) => [...p, {
          role: 'assistant',
          content: `${data.reply}\n\n✅ Changes applied to your resume. Ctrl+Z to undo.`,
        }]);
      } else {
        // Advice / question — just show the reply
        setMessages((p) => [...p, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages((p) => [...p, { role: 'assistant', content: `❌ ${err.message}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Auto-send when a suggestion is clicked from the Score tab
  useEffect(() => {
    if (!triggerMessage) return;
    onTriggerConsumed?.();
    send(triggerMessage);
  }, [triggerMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: .5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 2px rgba(16,185,129,.2)', animation: 'pulse 2s infinite' }} />
          AI Chat
          {jobDesc && <span style={{ marginLeft: 'auto', color: '#6366F1', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>JD loaded ✓</span>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .18 }}
            style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}
          >
            {m.role === 'assistant' && (
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>✨</div>
            )}
            <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              {m.content}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 34 }}>
            <div className="chat-bubble-ai" style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '8px 12px' }}>
              {[0, 150, 300].map((d) => (
                <span key={d} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#6366F1',
                  display: 'block', animation: `bounce .9s ${d}ms infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid #E2E8F0', flexShrink: 0, display: 'flex', gap: 8 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about your resume or paste a job description…"
          rows={1}
          className="input-field"
          style={{ flex: 1, resize: 'none', minHeight: 34, maxHeight: 80, fontSize: 13, caretColor: 'black' }}
        />
        <button
          className="btn-primary"
          style={{ padding: '7px 12px', flexShrink: 0 }}
          onClick={() => send()}
          disabled={loading || !input.trim()}
        >
          {loading ? <span className="spinner" /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Score tab ───────────────────────────────────────────────── */
function ScoreTab({ resume, onSuggestionClick }) {
  const { total, breakdown } = useATSScore(resume);
  const suggestions          = useSuggestions(resume, breakdown);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Score ring */}
      <div style={{ padding: 16, background: '#FAFBFF', border: '1.5px solid #EEF2FF', borderRadius: 14 }}>
        <ScoreRing score={total} />
      </div>

      {/* Word count */}
      <WordCountCard resume={resume} />

      {/* Score breakdown */}
      <div style={{ padding: 14, background: '#FAFBFF', border: '1.5px solid #EEF2FF', borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#6366F1', marginBottom: 12 }}>
          ATS Breakdown
        </div>
        <ScoreBreakdown breakdown={breakdown} />
      </div>

      {/* Suggestions — clickable */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#6366F1', marginBottom: 8 }}>
          Suggestions — click to fix with AI
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {suggestions.map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ x: 3 }}
              whileTap={{ scale: .98 }}
              onClick={() => onSuggestionClick(s.prompt)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer', width: '100%',
                border: s.pct >= 50 ? '1.5px solid #FEF3C7' : '1.5px solid #FEE2E2',
                background: s.pct >= 50 ? '#FFFBEB' : '#FFF5F5',
                transition: 'background .15s, border-color .15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: '#6B7280', lineHeight: 1.4 }}>{s.text}</div>
              </div>
              <div style={{
                flexShrink: 0, alignSelf: 'center',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10.5, fontWeight: 600, color: '#6366F1',
                background: '#EEF2FF', padding: '3px 8px', borderRadius: 20,
                whiteSpace: 'nowrap',
              }}>
                Fix with AI →
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Panel body ──────────────────────────────────────────────── */
function PanelBody({ apiKey, setApiKey, onClose, isMaximized, onToggleMaximize }) {
  const resume          = useResumeStore((s) => s.resume);
  const setResumeFromAI = useResumeStore((s) => s.setResumeFromAI);
  const [showKey,       setShowKey]       = useState(false);
  const [activeView,    setActiveView]    = useState('chat');
  const [triggerMsg,    setTriggerMsg]    = useState(null);
  const [connectedInfo, setConnectedInfo] = useState(null); // { model, provider } after first success

  const detectedProvider = useMemo(() => isGeminiKey(apiKey) ? 'Google Gemini' : null, [apiKey]);

  // Reset connection info when the key changes
  const prevKeyRef = useRef(apiKey);
  useEffect(() => {
    if (prevKeyRef.current !== apiKey) { setConnectedInfo(null); prevKeyRef.current = apiKey; }
  }, [apiKey]);

  const handleSuggestionClick = (prompt) => {
    setTriggerMsg(prompt);
    setActiveView('chat');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderLeft: '1px solid #E2E8F0' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
        background: 'linear-gradient(to right, #EEF2FF, #F5F3FF)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            boxShadow: '0 2px 8px rgba(79,70,229,.3)',
          }}>✨</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>AI Assistant</div>
            {connectedInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: '#10B981', fontWeight: 700 }}>{connectedInfo.provider}</span>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>·</span>
                <span style={{ fontSize: 10.5, color: '#6366F1', fontWeight: 600, fontFamily: 'monospace' }}>{connectedInfo.model}</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: detectedProvider ? '#6366F1' : '#94A3B8', fontWeight: 500 }}>
                {detectedProvider ? 'Gemini key detected ✓' : 'Google Gemini — free at aistudio.google.com'}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn-icon" onClick={onToggleMaximize} title={isMaximized ? 'Restore' : 'Expand'}>
            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>
          <button className="btn-icon" onClick={onClose} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', padding: '8px 12px 0', gap: 4, flexShrink: 0 }}>
        {[['chat', '💬 Chat'], ['score', '🎯 ATS Score']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            style={{
              flex: 1, padding: '6px 0', fontSize: 12.5, fontWeight: 600,
              border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all .15s',
              background: activeView === id ? '#EEF2FF' : 'transparent',
              color:      activeView === id ? '#4F46E5' : '#94A3B8',
              borderBottom: activeView === id ? '2px solid #4F46E5' : '2px solid transparent',
            }}
          >{label}</button>
        ))}
      </div>

      {/* API key (chat tab only) */}
      {activeView === 'chat' && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#94A3B8' }}>
              Google Gemini API Key
            </div>
            {detectedProvider && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10.5, fontWeight: 700, color: '#10B981',
                background: '#D1FAE5', padding: '2px 8px', borderRadius: 20,
              }}>
                ✓ {detectedProvider}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="input-field"
              style={{ fontSize: 12, paddingRight: 52, ...apiKeyBorderStyle(apiKey), caretColor: 'black' }}
            />
            <button
              onClick={() => setShowKey((p) => !p)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8',
              }}
            >{showKey ? '🙈' : '👁️'}</button>
          </div>
          <p style={{
            fontSize: 11, marginTop: 4, fontWeight: 500,
            color: detectedProvider ? '#10B981' : '#94A3B8',
          }}>
            {detectedProvider ? '✓ Gemini key detected — free tier ready' : '🔒 Free at aistudio.google.com — never stored.'}
          </p>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeView === 'chat' ? (
          <ChatSection
            apiKey={apiKey}
            resume={resume}
            setResumeFromAI={setResumeFromAI}
            triggerMessage={triggerMsg}
            onTriggerConsumed={() => setTriggerMsg(null)}
            onConnect={setConnectedInfo}
          />
        ) : (
          <ScoreTab
            resume={resume}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
export default function AIPanel({ open, onClose, apiKey, setApiKey, mobileMode = false }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle      = () => setIsMaximized((p) => !p);
  const handleClose = () => { setIsMaximized(false); onClose(); };

  // ── Mobile: full-screen sheet sliding up from bottom ─────────
  if (mobileMode) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-ai"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            style={{
              position: 'fixed',
              top: 52,        // below navbar
              left: 0,
              right: 0,
              bottom: 60,     // above bottom nav
              zIndex: 180,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PanelBody
              apiKey={apiKey}
              setApiKey={setApiKey}
              onClose={handleClose}
              isMaximized={false}
              onToggleMaximize={() => {}}
            />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  // ── Desktop / tablet ─────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      {open && !isMaximized && (
        <motion.div
          key="normal"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0,      opacity: 1 }}
          exit={{    x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ position: 'absolute', inset: 0, zIndex: 50 }}
        >
          <PanelBody apiKey={apiKey} setApiKey={setApiKey} onClose={handleClose} isMaximized={false} onToggleMaximize={toggle} />
        </motion.div>
      )}

      {open && isMaximized && createPortal(
        <motion.div
          key="maximized"
          initial={{ opacity: 0, scale: .97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{    opacity: 0, scale: .97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ position: 'fixed', top: 52, left: 0, right: 0, bottom: 0, zIndex: 150, display: 'flex' }}
        >
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(6px)', zIndex: -1 }}
            onClick={handleClose}
          />
          <div style={{ marginLeft: 'auto', width: '45%', minWidth: 380, maxWidth: 700, position: 'relative' }}>
            <PanelBody apiKey={apiKey} setApiKey={setApiKey} onClose={handleClose} isMaximized={true} onToggleMaximize={toggle} />
          </div>
        </motion.div>,
        document.body,
      )}
    </AnimatePresence>
  );
}
