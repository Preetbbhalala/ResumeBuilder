import { create } from 'zustand';

const blankResume = {
  personal: {
    fullName: '',
    email: '',
    phone: '',
    links: [],
    summary: '',
  },
  sections: [],
};

const useResumeStore = create((set, get) => ({
  resume: JSON.parse(JSON.stringify(blankResume)),
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const { resume, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(resume)));
    set({ history: newHistory.slice(-30), historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    set({ resume: JSON.parse(JSON.stringify(history[idx])), historyIndex: idx });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    set({ resume: JSON.parse(JSON.stringify(history[idx])), historyIndex: idx });
  },

  updatePersonal: (field, value) => {
    get().pushHistory();
    set((state) => ({
      resume: { ...state.resume, personal: { ...state.resume.personal, [field]: value } },
    }));
  },

  addLink: () => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        personal: {
          ...state.resume.personal,
          links: [...(state.resume.personal.links || []), { id: `link-${Date.now()}`, label: '', url: '' }],
        },
      },
    }));
  },

  updateLink: (id, field, value) => {
    set((state) => ({
      resume: {
        ...state.resume,
        personal: {
          ...state.resume.personal,
          links: (state.resume.personal.links || []).map((l) =>
            l.id === id ? { ...l, [field]: value } : l
          ),
        },
      },
    }));
  },

  removeLink: (id) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        personal: {
          ...state.resume.personal,
          links: (state.resume.personal.links || []).filter((l) => l.id !== id),
        },
      },
    }));
  },

  updateSectionTitle: (sectionId, newTitle) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId ? { ...s, title: newTitle } : s
        ),
      },
      lastEditedSection: sectionId,
    }));
  },

  updateEntry: (sectionId, entryId, field, value) => {
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, entries: s.entries.map((e) => e.id === entryId ? { ...e, [field]: value } : e) }
            : s
        ),
      },
      lastEditedSection: sectionId,
    }));
  },

  updateBullet: (sectionId, entryId, idx, value) => {
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                entries: s.entries.map((e) => {
                  if (e.id !== entryId) return e;
                  const bullets = [...e.bullets];
                  bullets[idx] = value;
                  return { ...e, bullets };
                }),
              }
            : s
        ),
      },
      lastEditedSection: sectionId,
    }));
  },

  addBullet: (sectionId, entryId) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, entries: s.entries.map((e) => e.id === entryId ? { ...e, bullets: [...e.bullets, ''] } : e) }
            : s
        ),
      },
    }));
  },

  splitBullet: (sectionId, entryId, idx, before, after) => {
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                entries: s.entries.map((e) => {
                  if (e.id !== entryId) return e;
                  const bullets = [...e.bullets];
                  bullets.splice(idx, 1, before, after);
                  return { ...e, bullets };
                }),
              }
            : s
        ),
      },
    }));
  },

  removeBullet: (sectionId, entryId, idx) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                entries: s.entries.map((e) => {
                  if (e.id !== entryId) return e;
                  return { ...e, bullets: e.bullets.filter((_, i) => i !== idx) };
                }),
              }
            : s
        ),
      },
    }));
  },

  addEntry: (sectionId) => {
    get().pushHistory();
    const section = get().resume.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const id = `${sectionId}-${Date.now()}`;
    let newEntry = {};
    if (section.type === 'education') {
      newEntry = { id, institution: '', degree: '', location: '', startDate: '', endDate: '', gpa: '', details: '', bullets: [] };
    } else if (section.type === 'experience') {
      newEntry = { id, company: '', role: '', location: '', startDate: '', endDate: '', bullets: [''] };
    } else if (section.type === 'projects') {
      newEntry = { id, name: '', tech: '', link: '', startDate: '', endDate: '', bullets: [''] };
    } else if (section.type === 'certifications') {
      newEntry = { id, name: '', issuer: '', date: '', link: '', bullets: [] };
    } else {
      newEntry = { id, title: '', subtitle: '', startDate: '', endDate: '', details: '', bullets: [] };
    }
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId ? { ...s, entries: [...(s.entries || []), newEntry] } : s
        ),
      },
    }));
  },

  removeEntry: (sectionId, entryId) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) } : s
        ),
      },
    }));
  },

  addSection: (type) => {
    get().pushHistory();
    const id = `custom-${Date.now()}`;
    const titles = { education: 'Education', experience: 'Experience', projects: 'Projects', skills: 'Skills', certifications: 'Certifications', custom: 'New Section' };
    let newSection = { id, title: titles[type] || 'New Section', type };
    if (type === 'skills') {
      newSection.categories = [{ id: `${id}-cat-1`, label: 'Category', tags: [] }];
    } else {
      newSection.entries = [];
    }
    set((state) => ({
      resume: { ...state.resume, sections: [...state.resume.sections, newSection] },
    }));
  },

  removeSection: (sectionId) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.filter((s) => s.id !== sectionId),
      },
    }));
  },

  reorderEntries: (sectionId, fromIdx, toIdx) => {
    get().pushHistory();
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const entries = [...(s.entries || [])];
          const [moved] = entries.splice(fromIdx, 1);
          entries.splice(toIdx, 0, moved);
          return { ...s, entries };
        }),
      },
    }));
  },

  reorderSections: (fromIdx, toIdx) => {
    get().pushHistory();
    set((state) => {
      const sections = [...state.resume.sections];
      const [moved] = sections.splice(fromIdx, 1);
      sections.splice(toIdx, 0, moved);
      return { resume: { ...state.resume, sections } };
    });
  },

  updateSkillCategory: (sectionId, catId, field, value) => {
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, categories: s.categories.map((c) => c.id === catId ? { ...c, [field]: value } : c) }
            : s
        ),
      },
      lastEditedSection: sectionId,
    }));
  },

  addSkillTag: (sectionId, catId, tag) => {
    if (!tag.trim()) return;
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, categories: s.categories.map((c) => c.id === catId ? { ...c, tags: [...c.tags, tag.trim()] } : c) }
            : s
        ),
      },
    }));
  },

  removeSkillTag: (sectionId, catId, tagIdx) => {
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, categories: s.categories.map((c) => c.id === catId ? { ...c, tags: c.tags.filter((_, i) => i !== tagIdx) } : c) }
            : s
        ),
      },
    }));
  },

  addSkillCategory: (sectionId) => {
    const id = `cat-${Date.now()}`;
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, categories: [...s.categories, { id, label: 'New Category', tags: [] }] }
            : s
        ),
      },
    }));
  },

  removeSkillCategory: (sectionId, catId) => {
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId
            ? { ...s, categories: s.categories.filter((c) => c.id !== catId) }
            : s
        ),
      },
    }));
  },

  setResumeFromAI: (newResume) => {
    get().pushHistory();
    set({ resume: newResume });
  },

  resetResume: () => {
    get().pushHistory();
    set({ resume: JSON.parse(JSON.stringify(blankResume)) });
  },
}));

export default useResumeStore;
