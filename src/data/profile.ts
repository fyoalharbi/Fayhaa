// ─────────────────────────────────────────────
//  PROFILE — single source of truth for both views
//  (every page reads from here)
// ─────────────────────────────────────────────

export type Lang = 'en' | 'ar';
type T = Record<Lang, string>;

export const profile = {
  name: { en: 'Fayhaa', ar: 'فيحاء' } as T,
  // Headline and About follow the LinkedIn profile
  role: { en: 'Data Engineer', ar: 'Data Engineer' } as T,
  intro: {
    en: 'I build reliable pipelines that turn raw data into decisions. I come from system integration, and today I work across the whole data lifecycle: ingestion, transformation, modeling and reporting.',
    ar: 'أبني pipelines موثوقة تحوّل البيانات الخام إلى قرارات. خلفيتي في System Integration، واليوم أشتغل على دورة البيانات كاملة: Ingestion، Transformation، Modeling و Reporting.',
  } as T,
  workflow: {
    en: ['Ingest', 'Transform', 'Model', 'Report'],
    ar: ['Ingest', 'Transform', 'Model', 'Report'],
  },
  email: 'fayhaaralharbi@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/fayhaaralharbi/',
    github: 'https://github.com/fyoalharbi',
  },
};

// ── SKILLS ───────────────────────────────────
// `key` is what project frontmatter references in `skills: [...]`.
// The home page groups them under Tools and marks where each one was used.
// `core: true` = headline skills (LinkedIn headline + top skills: Python, SQL,
// Airflow, dbt, Power BI).
export const skills = [
  { key: 'sql',              group: 'eng',      core: true,  label: { en: 'SQL',                ar: 'SQL' } },
  { key: 'python',           group: 'eng',      core: true,  label: { en: 'Python',             ar: 'Python' } },
  { key: 'airflow',          group: 'eng',      core: true,  label: { en: 'Airflow',            ar: 'Airflow' } },
  { key: 'dbt',              group: 'eng',      core: true,  label: { en: 'dbt',                ar: 'dbt' } },
  { key: 'etl',              group: 'eng',      core: false, label: { en: 'ETL / ELT',          ar: 'ETL / ELT' } },
  { key: 'snowflake',        group: 'eng',      core: false, label: { en: 'Snowflake',          ar: 'Snowflake' } },
  { key: 'data-modeling',    group: 'eng',      core: false, label: { en: 'Data modeling',      ar: 'Data modeling' } },
  { key: 'aws',              group: 'eng',      core: false, label: { en: 'AWS',                ar: 'AWS' } },
  { key: 'azure',            group: 'eng',      core: false, label: { en: 'Azure',              ar: 'Azure' } },
  { key: 'docker',           group: 'eng',      core: false, label: { en: 'Docker',             ar: 'Docker' } },
  { key: 'ci-cd',            group: 'eng',      core: false, label: { en: 'CI/CD',              ar: 'CI/CD' } },
  { key: 'git',              group: 'eng',      core: false, label: { en: 'Git',                ar: 'Git' } },
  { key: 'rest-apis',        group: 'eng',      core: false, label: { en: 'REST API integration', ar: 'REST API integration' } },
  { key: 'power-bi',         group: 'bi',       core: true,  label: { en: 'Power BI',           ar: 'Power BI' } },
  { key: 'dax',              group: 'bi',       core: false, label: { en: 'DAX',                ar: 'DAX' } },
  { key: 'power-query',      group: 'bi',       core: false, label: { en: 'Power Query',        ar: 'Power Query' } },
  { key: 'dashboard-design', group: 'bi',       core: false, label: { en: 'Dashboard design',   ar: 'Dashboard design' } },
  { key: 'data-cleaning',    group: 'bi',       core: false, label: { en: 'Data cleaning',      ar: 'Data cleaning' } },
  { key: 'web-scraping',     group: 'bi',       core: false, label: { en: 'Web scraping',       ar: 'Web scraping' } },
  { key: 'streamlit',        group: 'bi',       core: false, label: { en: 'Streamlit',          ar: 'Streamlit' } },
  { key: 'statistics',       group: 'bi',       core: false, label: { en: 'Statistics',         ar: 'Statistics' } },
  { key: 'typescript',       group: 'web',      core: false, label: { en: 'TypeScript',         ar: 'TypeScript' } },
  { key: 'javascript',       group: 'web',      core: false, label: { en: 'JavaScript',         ar: 'JavaScript' } },
  { key: 'astro',            group: 'web',      core: false, label: { en: 'Astro',              ar: 'Astro' } },
  { key: 'p5js',             group: 'web',      core: false, label: { en: 'p5.js',              ar: 'p5.js' } },
  { key: 'generative-viz',   group: 'web',      core: false, label: { en: 'Generative visuals', ar: 'Generative visuals' } },
] as const;

export type SkillKey = (typeof skills)[number]['key'];
export const skillKeys = skills.map((s) => s.key) as [SkillKey, ...SkillKey[]];

export const skillGroups: Record<string, T> = {
  eng: { en: 'Data engineering',        ar: 'Data engineering' },
  bi:  { en: 'Analytics & BI',          ar: 'Analytics & BI' },
  web: { en: 'Web & creative coding',   ar: 'الويب والبرمجة الإبداعية' },
};

// ── EXPERIENCE, EDUCATION, CERTIFICATIONS (from the CV + LinkedIn) ──
// Sections stay hidden while an array is empty.
export const experience: {
  title: T; org: T; period: string; points: Record<Lang, string[]>;
}[] = [
  {
    title: { en: 'Data Analyst & BI Developer', ar: 'Data Analyst & BI Developer' },
    org: { en: 'Freelance · Remote', ar: 'عمل حر · عن بعد' },
    period: 'Sep 2025 — Present',
    points: {
      en: ['Delivered 2 Power BI dashboards for 2 clients, turning their business questions into KPIs they could track.'],
      ar: ['سلّمت 2 Power BI dashboards لعميلين، وحوّلت أسئلة أعمالهم إلى KPIs يقدرون يتابعونها.'],
    },
  },
  {
    title: { en: 'Software Developer (Integrations)', ar: 'Software Developer (Integrations)' },
    org: { en: 'Ejada · Buraydah', ar: 'إجادة · بريدة' },
    period: 'Feb 2025 — Jul 2025',
    points: {
      en: [
        'Built and maintained inbound and outbound REST API integrations for finance systems with IBM API Connect and OutSystems.',
        'Tested integrations and fixed the issues found before releasing them from development to production.',
      ],
      ar: [
        'بنيت وصنت REST API integrations (inbound و outbound) للأنظمة المالية باستخدام IBM API Connect و OutSystems.',
        'اختبرت الـ integrations وعالجت المشاكل قبل إطلاقها من development إلى production.',
      ],
    },
  },
  {
    title: { en: 'Data Analyst', ar: 'Data Analyst' },
    org: { en: 'Hackathonat · Remote', ar: 'هاكاثونات · عن بعد' },
    period: 'Jul–Aug 2023 · Apr–May 2024',
    points: {
      en: [
        'Built 3 dashboards end to end for hackathon ideas: web scraping, data cleaning in Power Query and visualization in Power BI and Python.',
        "Wrote a Python tool on X's engagement API that filters tweets, analyzes engagement metrics and generates charts and an insights report.",
      ],
      ar: [
        'بنيت 3 dashboards من البداية للنهاية لأفكار الهاكاثونات: Web scraping، تنظيفها بـ Power Query، وعرضها في Power BI و Python.',
        'كتبت أداة Python على X Engagement API تفلتر التغريدات وتحلل الـ engagement metrics وتطلع رسوم و insights report.',
      ],
    },
  },
  {
    title: { en: 'Co-Founder', ar: 'شريكة مؤسسة' },
    org: { en: 'TechVerse', ar: 'TechVerse' },
    period: 'Aug 2022 — Present',
    points: {
      en: ['Co-founded a tech community that runs tech talks and bootcamps.'],
      ar: ['أسست مع فريقي مجتمع تقني يقدم لقاءات تقنية ومعسكرات.'],
    },
  },
];

export const education: { title: T; org: T; period: string; note?: T }[] = [
  {
    title: { en: 'Data Engineering Bootcamp (7 weeks)', ar: 'Data Engineering Bootcamp (7 أسابيع)' },
    org: { en: 'Saudi Digital Academy', ar: 'الأكاديمية السعودية الرقمية' },
    period: 'Aug 2026 — Sep 2026',
  },
  {
    title: { en: "Bachelor's in Computer Science", ar: 'بكالوريوس علوم الحاسب' },
    org: { en: 'Qassim University', ar: 'جامعة القصيم' },
    period: 'Sep 2019 — May 2024',
    note: { en: 'GPA 4.5 / 5', ar: 'المعدل 4.5 من 5' },
  },
];

// LinkedIn lists 8; these are the two visible on the saved profile page.
export const certifications: { title: T; org: T; period: string }[] = [
  {
    title: { en: 'Associate Data Engineer in SQL', ar: 'Associate Data Engineer in SQL' },
    org: { en: 'DataCamp', ar: 'DataCamp' },
    period: 'Nov 2024',
  },
  {
    title: { en: 'Google Data Analytics Professional Certificate', ar: 'Google Data Analytics Professional Certificate' },
    org: { en: 'Coursera', ar: 'Coursera' },
    period: 'Aug 2024',
  },
];

// ── PHILOSOPHY (the butterfly) ───────────────
export const philosophy = {
  title: { en: 'Why butterflies?', ar: 'ليش فراشات؟' } as T,
  // Line-by-line version, used by the hidden/typed reveals
  lines: {
    en: [
      'Ever asked why butterflies?',
      'Their lifespan is short.',
      'Did you know their main task is moving pollen?',
      'Maybe you thought about bees!',
      'They have the same task!',
      "Bees stay close to home, and they're excellent at it.",
      'Butterflies fly farther, visiting flowers no one else reaches…',
      '…and carry pollen between gardens that would never meet.',
      "That's how a garden stays diverse.",
      "That's how I work.",
      'I like working on more than one thing, and flying far…',
      '…and I keep visiting new flowers.',
    ],
    ar: [
      'هل قد تساءلت ليش فيه فراشات؟',
      'حياتها قصيرة.',
      'تدري انه مهمتها الاساسية نقل اللقاح؟',
      'ممكن جاء على بالك النحلة!',
      'كلهم لهم نفس المهمة!',
      'النحلة تبقى قريب من خليتها، وشاطرة بشغلها.',
      'والفراشة تطير أبعد، وتزور زهور محد يوصلها…',
      '…وتنقل اللقاح بين حدايق ما كانت بتلتقي.',
      'وكذا تبقى الحديقة متنوعة.',
      'كذا انا اشتغل',
      'احب اشتغل في اكثر من شيء واطير بعيد...',
      '…وبكمل أزور زهور جديدة.',
    ],
  },
  paragraphs: {
    en: [
      "Butterflies have a short lifespan, and their main job is moving pollen between flowers. Bees have the same job: they stay close to home and they're excellent at it.",
      "Butterflies fly farther. They visit flowers no one else reaches and carry pollen between gardens that would never meet, and that's how a garden stays diverse. That's my creative engine: I connect ideas across data, design and code, and I keep visiting new flowers.",
    ],
    ar: [
      'حياة الفراشة قصيرة، ومهمتها الأساسية نقل لقاح الأزهار. النحلة لها نفس المهمة، تبقى قريب من خليتها وشاطرة بشغلها.',
      'والفراشة تطير أبعد، تزور زهور محد يوصلها وتنقل اللقاح بين حدايق ما كانت بتلتقي، وكذا تبقى الحديقة متنوعة. هذا هو محركي الإبداعي: أربط الأفكار بين البيانات والتصميم والكود، وبكمل أزور زهور جديدة.',
    ],
  },
};
