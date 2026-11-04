// ─────────────────────────────────────────────
//  PROFILE — single source of truth for both views
//  (normal pages + terminal read from here)
// ─────────────────────────────────────────────

export type Lang = 'en' | 'ar';
type T = Record<Lang, string>;

export const profile = {
  name: { en: 'Fayhaa', ar: 'فيحاء' } as T,
  // Headline, About and availability follow the LinkedIn profile
  role: { en: 'Data Engineer', ar: 'مهندسة بيانات' } as T,
  availability: { en: 'Open to remote or hybrid roles', ar: 'متاحة للعمل عن بعد أو هجين' } as T,
  intro: {
    en: 'I build reliable pipelines that turn raw data into decisions. I come from system integration, and today I work across the whole data lifecycle: ingestion, transformation, modeling and reporting.',
    ar: 'أبني خطوط بيانات موثوقة تحوّل البيانات الخام إلى قرارات. خلفيتي في تكامل الأنظمة، واليوم أشتغل على دورة البيانات كاملة: الاستخراج، التحويل، النمذجة والتقارير.',
  } as T,
  workflow: {
    en: ['Ingest', 'Transform', 'Model', 'Report'],
    ar: ['استخراج', 'تحويل', 'نمذجة', 'تقارير'],
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
// `core: true` = headline skills (LinkedIn headline + top skills: Python, SQL,
// Airflow, dbt, Power BI); they're marked and listed first on the home page.
export const skills = [
  { key: 'sql',              group: 'eng',      core: true,  label: { en: 'SQL',                ar: 'SQL' } },
  { key: 'python',           group: 'eng',      core: true,  label: { en: 'Python',             ar: 'Python' } },
  { key: 'airflow',          group: 'eng',      core: true,  label: { en: 'Airflow',            ar: 'Airflow' } },
  { key: 'dbt',              group: 'eng',      core: true,  label: { en: 'dbt',                ar: 'dbt' } },
  { key: 'etl',              group: 'eng',      core: false, label: { en: 'ETL / ELT',          ar: 'ETL / ELT' } },
  { key: 'snowflake',        group: 'eng',      core: false, label: { en: 'Snowflake',          ar: 'Snowflake' } },
  { key: 'data-modeling',    group: 'eng',      core: false, label: { en: 'Data modeling',      ar: 'نمذجة البيانات' } },
  { key: 'aws',              group: 'eng',      core: false, label: { en: 'AWS',                ar: 'AWS' } },
  { key: 'azure',            group: 'eng',      core: false, label: { en: 'Azure',              ar: 'Azure' } },
  { key: 'docker',           group: 'eng',      core: false, label: { en: 'Docker',             ar: 'Docker' } },
  { key: 'ci-cd',            group: 'eng',      core: false, label: { en: 'CI/CD',              ar: 'CI/CD' } },
  { key: 'git',              group: 'eng',      core: false, label: { en: 'Git',                ar: 'Git' } },
  { key: 'rest-apis',        group: 'eng',      core: false, label: { en: 'REST API integration', ar: 'تكامل REST API' } },
  { key: 'power-bi',         group: 'bi',       core: true,  label: { en: 'Power BI',           ar: 'Power BI' } },
  { key: 'dax',              group: 'bi',       core: false, label: { en: 'DAX',                ar: 'DAX' } },
  { key: 'power-query',      group: 'bi',       core: false, label: { en: 'Power Query',        ar: 'Power Query' } },
  { key: 'dashboard-design', group: 'bi',       core: false, label: { en: 'Dashboard design',   ar: 'تصميم اللوحات' } },
  { key: 'data-cleaning',    group: 'bi',       core: false, label: { en: 'Data cleaning',      ar: 'تنظيف البيانات' } },
  { key: 'web-scraping',     group: 'bi',       core: false, label: { en: 'Web scraping',       ar: 'استخراج بيانات الويب' } },
  { key: 'streamlit',        group: 'bi',       core: false, label: { en: 'Streamlit',          ar: 'Streamlit' } },
  { key: 'statistics',       group: 'bi',       core: false, label: { en: 'Statistics',         ar: 'الإحصاء' } },
  { key: 'typescript',       group: 'web',      core: false, label: { en: 'TypeScript',         ar: 'TypeScript' } },
  { key: 'javascript',       group: 'web',      core: false, label: { en: 'JavaScript',         ar: 'JavaScript' } },
  { key: 'astro',            group: 'web',      core: false, label: { en: 'Astro',              ar: 'Astro' } },
  { key: 'p5js',             group: 'web',      core: false, label: { en: 'p5.js',              ar: 'p5.js' } },
  { key: 'generative-viz',   group: 'web',      core: false, label: { en: 'Generative visuals', ar: 'رسوميات توليدية' } },
] as const;

export type SkillKey = (typeof skills)[number]['key'];
export const skillKeys = skills.map((s) => s.key) as [SkillKey, ...SkillKey[]];

export const skillGroups: Record<string, T> = {
  eng: { en: 'Data engineering',        ar: 'هندسة البيانات' },
  bi:  { en: 'Analytics & BI',          ar: 'التحليل وذكاء الأعمال' },
  web: { en: 'Web & creative coding',   ar: 'الويب والبرمجة الإبداعية' },
};

// ── EXPERIENCE, EDUCATION, CERTIFICATIONS (from the CV + LinkedIn) ──
// Sections stay hidden while an array is empty.
export const experience: {
  title: T; org: T; period: string; points: Record<Lang, string[]>;
}[] = [
  {
    title: { en: 'Data Analyst & BI Developer', ar: 'محللة بيانات ومطورة ذكاء أعمال' },
    org: { en: 'Freelance · Remote', ar: 'عمل حر · عن بعد' },
    period: 'Sep 2025 — Present',
    points: {
      en: ['Delivered 2 Power BI dashboards for 2 clients, turning their business questions into KPIs they could track.'],
      ar: ['سلّمت لوحتي Power BI لعميلين، وحوّلت أسئلة أعمالهم إلى مؤشرات أداء يقدرون يتابعونها.'],
    },
  },
  {
    title: { en: 'Software Developer (Integrations)', ar: 'مطورة برمجيات (تكامل الأنظمة)' },
    org: { en: 'Ejada · Buraydah', ar: 'إجادة · بريدة' },
    period: 'Feb 2025 — Jul 2025',
    points: {
      en: [
        'Built and maintained inbound and outbound REST API integrations for finance systems with IBM API Connect and OutSystems.',
        'Tested integrations and fixed the issues found before releasing them from development to production.',
      ],
      ar: [
        'بنيت وصنت تكاملات REST API واردة وصادرة للأنظمة المالية باستخدام IBM API Connect و OutSystems.',
        'اختبرت التكاملات وعالجت المشاكل قبل إطلاقها من التطوير إلى الإنتاج.',
      ],
    },
  },
  {
    title: { en: 'Data Analyst', ar: 'محللة بيانات' },
    org: { en: 'Hackathonat · Remote', ar: 'هاكاثونات · عن بعد' },
    period: 'Jul–Aug 2023 · Apr–May 2024',
    points: {
      en: [
        'Built 3 dashboards end to end for hackathon ideas: web scraping, data cleaning in Power Query and visualization in Power BI and Python.',
        "Wrote a Python tool on X's engagement API that filters tweets, analyzes engagement metrics and generates charts and an insights report.",
      ],
      ar: [
        'بنيت 3 لوحات بيانات من البداية للنهاية لأفكار الهاكاثونات: استخراج بيانات الويب، تنظيفها بـ Power Query، وعرضها في Power BI و Python.',
        'كتبت أداة Python على واجهة تفاعل X تفلتر التغريدات وتحلل مقاييس التفاعل وتطلع رسوم وتقرير رؤى.',
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
  {
    title: { en: 'Private Tutor', ar: 'مدرسة خصوصية' },
    org: { en: 'Freelance', ar: 'عمل حر' },
    period: 'Aug 2021 — Jan 2025',
    points: {
      en: ['Tutored Qassim University students in Data Structures and Statistics.'],
      ar: ['درّست طلاب جامعة القصيم هياكل البيانات والإحصاء.'],
    },
  },
];

export const education: { title: T; org: T; period: string; note?: T }[] = [
  {
    title: { en: 'Data Engineering Bootcamp (7 weeks)', ar: 'معسكر هندسة البيانات (7 أسابيع)' },
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
    title: { en: 'Google Data Analytics Professional Certificate', ar: 'شهادة Google المهنية لتحليل البيانات' },
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
      'Their main task is to move pollen between flowers.',
      'Maybe you thought about bees!',
      'They have the same task.',
      'But butterflies visit flowers more often…',
      '…and yet, bees are better at pollination.',
      "Butterflies don't do their main job better than anyone else,",
      'but they complement it by flying around and visiting flowers anyway.',
      'This is my creative engine.',
      "I'm not the best, but…",
      "I'll keep visiting flowers, and I don't care about the bees.",
    ],
    ar: [
      'ما قد تساءلت؟ ليش فيه فراشات؟',
      'حياتها قصيرة.',
      'مهمتها الأساسية نقل لقاح الأزهار.',
      'ممكن جاء على بالك النحلة!',
      'كلهم لهم نفس المهمة.',
      'لكن الفراشة تزور الزهور أكثر…',
      '…ورغم ذلك، النحلة أحسن منها بالتلقيح.',
      'الفراشة ما قامت بدورها الرئيسي أحسن شيء،',
      'لكنها مكملة، تطير وتزور الزهور ولا عليها!',
      'هذا هو محركي الإبداعي.',
      'أنا مو أحسن وحدة، لكن…',
      'بكمل أزور الزهور ولا علي من النحلة.',
    ],
  },
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
