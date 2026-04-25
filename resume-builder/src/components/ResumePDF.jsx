import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

/* ── Strip HTML → plain text ───────────────────────────────── */
function stripHtml(html) {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi,      '\n')
    .replace(/<\/div>/gi,    '\n')
    .replace(/<[^>]+>/g,     '')
    .replace(/&nbsp;/g,      ' ')
    .replace(/&amp;/g,       '&')
    .replace(/&lt;/g,        '<')
    .replace(/&gt;/g,        '>')
    .replace(/&quot;/g,      '"')
    .replace(/&#39;/g,       "'")
    .replace(/\n{3,}/g,      '\n\n')
    .trim();
}

/* ── Stylesheet — kept compact to avoid spilling onto page 2 ─ */
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 40,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  headerName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  headerContact: {
    fontSize: 8.5,
    color: '#333333',
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingBottom: 1,
    marginBottom: 3,
    marginTop: 7,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  bold:      { fontFamily: 'Helvetica-Bold',    fontSize: 9.5 },
  italic:    { fontFamily: 'Helvetica-Oblique', fontSize: 9.5 },
  small:     { fontSize: 8.5, color: '#333' },
  smallBold: { fontFamily: 'Helvetica-Bold',    fontSize: 8.5 },
  bulletRow: {
    flexDirection: 'row',
    marginTop: 1,
    paddingLeft: 6,
  },
  bulletDot:  { width: 9,  fontSize: 8.5, marginTop: 0.5 },
  bulletText: { flex: 1,   fontSize: 8.5, lineHeight: 1.35 },
  skillsRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
    flexWrap: 'wrap',
  },
  skillLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginRight: 3 },
  skillValue: { fontSize: 9 },
  entryBlock: { marginBottom: 5 },
  summaryText:{ fontSize: 9, lineHeight: 1.4, marginBottom: 1 },
});

/* ── Shared helpers ─────────────────────────────────────────── */
function Bullet({ text }) {
  const plain = stripHtml(text);
  if (!plain) return null;
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{plain}</Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

/* ── Section renderers ──────────────────────────────────────── */
function EducationEntries({ entries }) {
  return (entries || []).map((e, i) => (
    <View key={i} style={s.entryBlock}>
      <View style={s.rowBetween}>
        <Text style={s.bold}>{e.institution || ''}</Text>
        <Text style={s.small}>{[e.startDate, e.endDate].filter(Boolean).join(' – ')}</Text>
      </View>
      <View style={s.rowBetween}>
        <Text style={s.italic}>
          {[e.degree, e.gpa ? `GPA: ${e.gpa}` : ''].filter(Boolean).join(' | ')}
        </Text>
        <Text style={s.small}>{e.location || ''}</Text>
      </View>
      {e.details ? (
        <Text style={{ ...s.small, marginTop: 1, fontFamily: 'Helvetica-Oblique' }}>
          {stripHtml(e.details)}
        </Text>
      ) : null}
    </View>
  ));
}

function ExperienceEntries({ entries }) {
  return (entries || []).map((e, i) => (
    <View key={i} style={s.entryBlock}>
      <View style={s.rowBetween}>
        <Text style={s.bold}>
          {e.company || ''}{e.role ? ` | ` : ''}
          <Text style={s.italic}>{e.role || ''}</Text>
        </Text>
        <Text style={s.small}>
          {e.location ? `${e.location} | ` : ''}
          {[e.startDate, e.endDate].filter(Boolean).join(' – ')}
        </Text>
      </View>
      {(e.bullets || []).filter(Boolean).map((b, j) => <Bullet key={j} text={b} />)}
    </View>
  ));
}

function ProjectEntries({ entries }) {
  return (entries || []).map((e, i) => (
    <View key={i} style={s.entryBlock}>
      <View style={s.rowBetween}>
        <Text style={s.bold}>{e.name || ''}</Text>
        <Text style={{ ...s.small, fontFamily: 'Helvetica-Oblique' }}>{e.tech || ''}</Text>
      </View>
      {e.link ? (
        <Text style={{ ...s.small, color: '#1d4ed8', marginBottom: 1 }}>{e.link}</Text>
      ) : null}
      {(e.bullets || []).filter(Boolean).map((b, j) => <Bullet key={j} text={b} />)}
    </View>
  ));
}

function SkillsSection({ categories }) {
  return (categories || []).map((cat, i) => (
    <View key={i} style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>
        <Text style={s.smallBold}>{cat.label}: </Text>
        {(cat.tags || []).filter(Boolean).join(', ')}
      </Text>
    </View>
  ));
}

function CertEntries({ entries }) {
  return (entries || []).map((e, i) => (
    <View key={i} style={{ marginBottom: 3 }}>
      <View style={s.rowBetween}>
        <Text style={s.bold}>
          {e.name || ''}{e.issuer ? ` – ${e.issuer}` : ''}
        </Text>
        <Text style={s.small}>{e.date || ''}</Text>
      </View>
      {(e.bullets || []).filter(Boolean).map((b, j) => <Bullet key={j} text={b} />)}
    </View>
  ));
}

function GenericEntries({ entries }) {
  return (entries || []).map((e, i) => (
    <View key={i} style={s.entryBlock}>
      <View style={s.rowBetween}>
        <Text style={s.bold}>{e.title || ''}</Text>
        <Text style={s.small}>{[e.startDate, e.endDate].filter(Boolean).join(' – ')}</Text>
      </View>
      {e.subtitle ? <Text style={s.italic}>{e.subtitle}</Text> : null}
      {e.details ? (
        <Text style={{ ...s.small, marginTop: 1 }}>{stripHtml(e.details)}</Text>
      ) : null}
      {(e.bullets || []).filter(Boolean).map((b, j) => <Bullet key={j} text={b} />)}
    </View>
  ));
}

function RenderSection({ section }) {
  const content = () => {
    switch (section.type) {
      case 'education':      return <EducationEntries entries={section.entries} />;
      case 'experience':     return <ExperienceEntries entries={section.entries} />;
      case 'projects':       return <ProjectEntries entries={section.entries} />;
      case 'skills':         return <SkillsSection categories={section.categories} />;
      case 'certifications': return <CertEntries entries={section.entries} />;
      default:               return <GenericEntries entries={section.entries} />;
    }
  };
  return (
    <View>
      <SectionHeader title={section.title} />
      {content()}
    </View>
  );
}

/* ── PDF document ───────────────────────────────────────────── */
export function ResumePDF({ resume }) {
  const { personal, sections } = resume;

  const contactItems = [
    personal.phone ? { kind: 'text', content: personal.phone } : null,
    personal.email ? { kind: 'link', label: personal.email, href: `mailto:${personal.email}` } : null,
    ...(personal.links || [])
      .filter((l) => l.url)
      .map((l) => ({ kind: 'link', label: l.label || l.url, href: l.url })),
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Name */}
        <Text style={s.headerName}>{personal.fullName || 'Your Name'}</Text>

        {/* Contact — labels only, URLs embedded as hyperlinks */}
        {contactItems.length > 0 && (
          <Text style={s.headerContact}>
            {contactItems.map((item, i) => (
              <Text key={i}>
                {i > 0 ? <Text style={{ color: '#999999' }}>  |  </Text> : null}
                {item.kind === 'link' ? (
                  <Link src={item.href} style={{ color: '#374151', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                ) : (
                  <Text>{item.content}</Text>
                )}
              </Text>
            ))}
          </Text>
        )}

        {/* Summary */}
        {personal.summary ? (
          <View>
            <SectionHeader title="Summary" />
            <Text style={s.summaryText}>{stripHtml(personal.summary)}</Text>
          </View>
        ) : null}

        {/* Sections */}
        {(sections || []).map((section) => (
          <RenderSection key={section.id} section={section} />
        ))}
      </Page>
    </Document>
  );
}
