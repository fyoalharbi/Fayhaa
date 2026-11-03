// ─────────────────────────────────────────────
//  PROFILE — single source of truth for both views
//  (normal pages + terminal read from here)
// ─────────────────────────────────────────────

export type Lang = 'en' | 'ar';
type T = Record<Lang, string>;

export const profile = {
  name: { en: 'Fayhaa Alharbi', ar: 'فيحاء الحربي' } as T,
  role: { en: 'Data Analyst & Business Intelligence', ar: 'محلل بيانات وذكاء الأعمال' } as T,
  availability: { en: 'Open to remote roles', ar: 'متاحة للعمل عن بعد' } as T,
  intro: {
    en: "I like data and business problems, and I'm a very curious person. I work across SQL, Python and Power BI to turn questions into dashboards and tools people actually use.",
    ar: 'أحب البيانات ومشاكل الأعمال، وفضولية جداً. أشتغل على SQL و Python و Power BI عشان أحول الأسئلة إلى لوحات وأدوات يستخدمها الناس فعلاً.',
  } as T,
  workflow: {
    en: ['Idea', 'Analysis', 'Develop', 'Deploy'],
    ar: ['فكرة', 'تحليل', 'تطوير', 'تطبيق'],
  },
  email: 'fayhaaralharbi@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/fayhaaralharbi/',
    github: 'https://github.com/fyoalharbi',
  },
};

// ── SKILLS ───────────────────────────────────
// `key` is what project frontmatter references in `skills: [...]`.
// Each skill gets its own page at /skills/<key>/ listing the projects that use it.
export const skills = [
  { key: 'sql',            group: 'data',     label: { en: 'SQL',               ar: 'SQL' } },
  { key: 'python',         group: 'data',     label: { en: 'Python',            ar: 'Python' } },
  { key: 'data-cleaning',  group: 'data',     label: { en: 'Data cleaning',     ar: 'تنظيف البيانات' } },
  { key: 'power-bi',       group: 'bi',       label: { en: 'Power BI',          ar: 'Power BI' } },
  { key: 'dashboard-design', group: 'bi',     label: { en: 'Dashboard design',  ar: 'تصميم اللوحات' } },
  { key: 'streamlit',      group: 'apps',     label: { en: 'Streamlit',         ar: 'Streamlit' } },
  { key: 'p5js',           group: 'creative', label: { en: 'p5.js',             ar: 'p5.js' } },
  { key: 'javascript',     group: 'creative', label: { en: 'JavaScript',        ar: 'JavaScript' } },
  { key: 'generative-viz', group: 'creative', label: { en: 'Generative visuals', ar: 'رسوميات توليدية' } },
] as const;

export type SkillKey = (typeof skills)[number]['key'];
export const skillKeys = skills.map((s) => s.key) as [SkillKey, ...SkillKey[]];

export const skillGroups: Record<string, T> = {
  data:     { en: 'Data & analysis',     ar: 'البيانات والتحليل' },
  bi:       { en: 'Business intelligence', ar: 'ذكاء الأعمال' },
  apps:     { en: 'Data apps',           ar: 'تطبيقات البيانات' },
  creative: { en: 'Creative coding',     ar: 'البرمجة الإبداعية' },
};

// ── EXPERIENCE & EDUCATION ───────────────────
// TODO(Fayhaa): fill these in. Sections stay hidden while the arrays are empty.
// Example:
// { title: { en: 'Data Analyst Intern', ar: 'متدربة تحليل بيانات' },
//   org: { en: 'Company', ar: 'الشركة' }, period: '2025 — 2026',
//   points: { en: ['Built X that saved Y'], ar: ['...'] } },
export const experience: {
  title: T; org: T; period: string; points: Record<Lang, string[]>;
}[] = [];

export const education: { title: T; org: T; period: string }[] = [];

// ── PHILOSOPHY (the butterfly) ───────────────
export const philosophy = {
  title: { en: 'Why butterflies?', ar: 'ليش فراشات؟' } as T,
  paragraphs: {
    en: [
      "Butterflies have a short lifespan, and their main job is moving pollen between flowers. Bees have the same job, and they're better at it. Butterflies visit flowers more often anyway.",
      "They don't beat anyone at the main task. They add to it by flying around and visiting flowers regardless. That's my creative engine: I'm not the best, but I'll keep visiting flowers, and I don't care about the bees.",
    ],
    ar: [
      'حياة الفراشة قصيرة، ومهمتها الأساسية نقل لقاح الأزهار. النحلة لها نفس المهمة وهي أحسن منها بالتلقيح، ومع ذلك الفراشة تزور الزهور أكثر.',
      'الفراشة ما قامت بدورها الرئيسي أحسن شيء، لكنها مكملة: تطير وتزور الزهور ولا عليها. هذا هو محركي الإبداعي، أنا مو أحسن وحدة لكن بكمل أزور الزهور ولا علي من النحلة.',
    ],
  },
};
