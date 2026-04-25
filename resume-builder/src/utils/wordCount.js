function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
}

export function countWords(text) {
  if (!text) return 0;
  return stripHtml(text).trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export function countResumeWords(resume) {
  if (!resume) return 0;
  const { personal, sections } = resume;
  let total = 0;

  total += countWords(personal.summary);

  for (const section of sections || []) {
    if (section.type === 'skills') {
      for (const cat of section.categories || []) {
        total += (cat.tags || []).filter(Boolean).reduce((a, t) => a + countWords(t), 0);
      }
      continue;
    }
    for (const entry of section.entries || []) {
      total += countWords(entry.details);
      total += countWords(entry.description);
      total += countWords(entry.summary);
      for (const b of entry.bullets || []) total += countWords(b);
      if (section.type === 'projects')       total += countWords(entry.name);
      if (section.type === 'certifications') total += countWords(entry.name);
    }
  }

  return total;
}
