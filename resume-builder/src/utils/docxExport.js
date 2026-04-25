import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
  BorderStyle,
  ExternalHyperlink,
} from 'docx';

/* ── HTML utilities ─────────────────────────────────────────── */

/** Strip HTML tags and decode common entities to plain text */
export function stripHtml(html) {
  if (!html?.trim()) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.innerText ?? div.textContent ?? '').trim();
}

/**
 * Walk an HTML DOM tree and build an array of docx TextRun objects,
 * preserving bold / italic / underline / font / size from inline styles
 * and semantic tags (<b>, <strong>, <i>, <em>, <u>).
 *
 * baseSize is in half-points (HP): 20 HP = 10pt, 22 HP ≈ 11pt, 24 HP = 12pt.
 */
function htmlToRuns(html, baseSize = 20) {
  if (!html?.trim()) return [new TextRun({ text: '', size: baseSize })];

  const div = document.createElement('div');
  div.innerHTML = html;

  const runs = [];

  function walk(node, style) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold: style.bold || false,
            italics: style.italics || false,
            underline: style.underline ? { type: UnderlineType.SINGLE } : undefined,
            size: style.size || baseSize,
            font: style.font || undefined,
          }),
        );
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const ns = { ...style };
    const tag = node.tagName.toLowerCase();

    if (tag === 'b' || tag === 'strong') ns.bold = true;
    if (tag === 'i' || tag === 'em') ns.italics = true;
    if (tag === 'u') ns.underline = true;

    // Handle <br> as a line break run
    if (tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }));
      return;
    }

    // Parse inline style attribute
    const { fontFamily, fontSize } = node.style || {};
    if (fontFamily) ns.font = fontFamily.replace(/['"]/g, '');
    if (fontSize) {
      const px = parseFloat(fontSize);
      if (!isNaN(px)) ns.size = Math.round(px * 1.5); // px → half-points (approx)
    }

    // <font face="..."> written by execCommand('fontName')
    if (tag === 'font') {
      const face = node.getAttribute('face');
      if (face) ns.font = face;
    }

    node.childNodes.forEach((child) => walk(child, ns));
  }

  div.childNodes.forEach((child) => walk(child, {}));
  return runs.length ? runs : [new TextRun({ text: '', size: baseSize })];
}

/* ── Section-heading paragraph ──────────────────────────────── */
function sectionHeading(title) {
  return new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22 })],
    border: {
      bottom: { color: '000000', space: 1, value: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: 200, after: 100 },
  });
}

/* ── Bullet paragraph ───────────────────────────────────────── */
function bulletPara(html) {
  return new Paragraph({
    children: htmlToRuns(html, 20),
    bullet: { level: 0 },
    spacing: { after: 50 },
  });
}

/* ── Empty spacer ───────────────────────────────────────────── */
function spacer(after = 80) {
  return new Paragraph({ spacing: { after } });
}

/* ── Main export function ───────────────────────────────────── */
export async function downloadDocx(resume) {
  const { personal, sections } = resume;
  const children = [];

  // ── Name ─────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: personal.fullName || 'Your Name', bold: true, size: 40 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
  );

  // ── Contact line — labels as hyperlinks, URLs hidden ─────────
  const contactItems = [
    personal.phone ? { kind: 'text', content: personal.phone } : null,
    personal.email ? { kind: 'link', label: personal.email, href: `mailto:${personal.email}` } : null,
    ...(personal.links || [])
      .filter((l) => l.url)
      .map((l) => ({ kind: 'link', label: l.label || l.url, href: l.url })),
  ].filter(Boolean);

  if (contactItems.length) {
    const runs = [];
    contactItems.forEach((item, i) => {
      if (i > 0) runs.push(new TextRun({ text: '  |  ', size: 18 }));
      if (item.kind === 'link') {
        runs.push(
          new ExternalHyperlink({
            link: item.href,
            children: [
              new TextRun({
                text: item.label,
                size: 18,
                color: '374151',
              }),
            ],
          }),
        );
      } else {
        runs.push(new TextRun({ text: item.content, size: 18 }));
      }
    });
    children.push(
      new Paragraph({
        children: runs,
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
      }),
    );
  }

  // ── Summary ───────────────────────────────────────────────────
  if (personal.summary?.trim()) {
    children.push(sectionHeading('Summary'));
    children.push(
      new Paragraph({
        children: htmlToRuns(personal.summary, 20),
        spacing: { after: 80 },
      }),
    );
  }

  // ── Dynamic sections ─────────────────────────────────────────
  for (const section of sections || []) {
    children.push(sectionHeading(section.title));

    // Skills — category: tag list
    if (section.type === 'skills') {
      for (const cat of section.categories || []) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${cat.label || ''}: `, bold: true, size: 20 }),
              new TextRun({ text: (cat.tags || []).filter(Boolean).join(', '), size: 20 }),
            ],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }),
        );
      }
      continue;
    }

    for (const entry of section.entries || []) {
      if (section.type === 'education') {
        const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' – ');

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: entry.institution || '', bold: true, size: 22 }),
              dates
                ? new TextRun({ text: `  ${dates}`, italics: true, size: 19 })
                : new TextRun({ text: '' }),
            ],
            spacing: { after: 40 },
          }),
        );

        const degreeLine = [
          entry.degree,
          entry.gpa ? `GPA: ${entry.gpa}` : '',
        ].filter(Boolean).join(' | ');

        if (degreeLine) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: degreeLine, italics: true, size: 20 })],
              spacing: { after: 40 },
            }),
          );
        }
        if (entry.details?.trim()) {
          children.push(
            new Paragraph({
              children: htmlToRuns(entry.details, 19),
              spacing: { after: 60 },
            }),
          );
        }
        children.push(spacer(60));

      } else if (section.type === 'experience') {
        const meta = [
          entry.location,
          [entry.startDate, entry.endDate].filter(Boolean).join(' – '),
        ].filter(Boolean).join(' | ');

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${entry.company || ''}${entry.role ? ` | ${entry.role}` : ''}`,
                bold: true,
                size: 22,
              }),
              meta
                ? new TextRun({ text: `  ${meta}`, italics: true, size: 19 })
                : new TextRun({ text: '' }),
            ],
            spacing: { after: 40 },
          }),
        );

        for (const b of (entry.bullets || []).filter(Boolean)) {
          children.push(bulletPara(b));
        }
        children.push(spacer(80));

      } else if (section.type === 'projects') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: entry.name || '', bold: true, size: 22 }),
              entry.tech
                ? new TextRun({ text: `  ${entry.tech}`, italics: true, size: 19 })
                : new TextRun({ text: '' }),
            ],
            spacing: { after: 40 },
          }),
        );

        if (entry.link) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: entry.link, size: 19 })],
              spacing: { after: 40 },
            }),
          );
        }

        for (const b of (entry.bullets || []).filter(Boolean)) {
          children.push(bulletPara(b));
        }
        children.push(spacer(80));

      } else if (section.type === 'certifications') {
        const certName = [entry.name, entry.issuer ? `– ${entry.issuer}` : '']
          .filter(Boolean)
          .join(' ');

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: certName, bold: true, size: 20 }),
              entry.date
                ? new TextRun({ text: `  ${entry.date}`, italics: true, size: 19 })
                : new TextRun({ text: '' }),
            ],
            spacing: { after: 60 },
          }),
        );

      } else {
        // Generic / custom section
        children.push(
          new Paragraph({
            children: [new TextRun({ text: entry.title || '', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
        );

        if (entry.subtitle) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: entry.subtitle, italics: true, size: 20 })],
              spacing: { after: 40 },
            }),
          );
        }

        if (entry.details?.trim()) {
          children.push(
            new Paragraph({
              children: htmlToRuns(entry.details, 20),
              spacing: { after: 80 },
            }),
          );
        }
      }
    }
  }

  // ── Compile and trigger download ──────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1008, right: 1008 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(personal.fullName || 'resume').replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
