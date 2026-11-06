// Data for the /experiments/ prototypes: everything the portfolio shows, flattened
// into one serialisable object so each prototype's script can read it.
import fs from 'node:fs';
import path from 'node:path';
import { profile, skills, skillGroups, experience, education, certifications, philosophy, type Lang } from '../data/profile';
import { getProjects, getPosts, projectSlug, projectHref, postSlug, langUrl, url, skillLabel, formatDate } from './site';

const img = (slug: string) =>
  ['png', 'jpg', 'webp'].map((e) => `projects/${slug}.${e}`).find((f) => fs.existsSync(path.join(process.cwd(), 'public', f)));

// Skills each role used, read from the role descriptions (experiments only).
// Keys are skill keys from profile.ts; WORK_ONLY are tools used at work that no
// project shows, so they appear on the map even with zero projects.
const WORK_SKILLS: string[][] = [
  ['power-bi', 'dax', 'power-query', 'dashboard-design', 'data-cleaning'],          // freelance BI
  ['rest-apis', 'ibm-api-connect', 'outsystems'],                                   // Ejada integrations
  ['web-scraping', 'data-cleaning', 'power-query', 'power-bi', 'python', 'rest-apis'], // Hackathonat
  [],                                                                               // TechVerse (community)
];
// Tools of each education entry (same order as profile.ts). The SDA bootcamp list
// follows its capstone, InvaSight; the degree has none listed.
const EDU_SKILLS: string[][] = [
  ['sql', 'python', 'airflow', 'dbt', 'etl', 'snowflake', 'data-modeling', 'docker', 'ci-cd', 'git', 'aws', 'azure', 'power-bi'],
  [],
];
const WORK_ONLY = [
  { key: 'ibm-api-connect', label: { en: 'IBM API Connect', ar: 'IBM API Connect' } },
  { key: 'outsystems', label: { en: 'OutSystems', ar: 'OutSystems' } },
];

export async function expData(lang: Lang = 'en') {
  const projects = (await getProjects(lang)).map((p) => {
    const slug = projectSlug(p), thumb = img(slug);
    return {
      slug,
      title: p.data.title.split(/ — | – /)[0],
      sub: p.data.title.split(/ — | – /)[1] ?? '',
      summary: p.data.summary,
      date: formatDate(p.data.date, lang),
      year: p.data.date.getFullYear(),
      featured: p.data.featured,
      skills: p.data.skills.map((k) => ({ key: k, label: skillLabel(k, lang) })),
      tldr: p.data.tldr,
      href: projectHref(p).href,
      live: p.data.links.live ?? null,
      code: p.data.links.github ?? null,
      thumb: thumb ? url(thumb) : null,
    };
  });
  const posts = (await getPosts(lang)).map((p) => ({
    title: p.data.title, summary: p.data.summary, date: formatDate(p.data.date, lang),
    tags: p.data.tags, href: langUrl(lang, `blog/${postSlug(p)}/`),
    month: p.data.date.getMonth() + 1, year: p.data.date.getFullYear(),
    minutes: Math.max(1, Math.round((p.body ?? '').split(/\s+/).length / 220)),
  }));
  const workUse = (k: string) => WORK_SKILLS.map((ks, i) => (ks.includes(k) ? i : -1)).filter((i) => i >= 0);
  const trainUse = (k: string) => EDU_SKILLS.map((ks, i) => (ks.includes(k) ? i : -1)).filter((i) => i >= 0);
  const used = (k: string) => projects.filter((p) => p.skills.some((s) => s.key === k)).map((p) => p.slug);
  return {
    name: profile.name[lang], role: profile.role[lang], intro: profile.intro[lang],
    workflow: profile.workflow[lang], email: profile.email, links: profile.links,
    skills: [
      ...skills.map((s) => ({ key: s.key, label: s.label[lang], group: s.group, groupLabel: skillGroups[s.group][lang], core: s.core, used: used(s.key), work: workUse(s.key), train: trainUse(s.key), workOnly: false })),
      ...WORK_ONLY.map((s) => ({ key: s.key, label: s.label[lang], group: 'eng', groupLabel: skillGroups.eng[lang], core: false, used: [] as string[], work: workUse(s.key), train: trainUse(s.key), workOnly: true })),
    ],
    experience: experience.map((e, i) => ({ title: e.title[lang], org: e.org[lang], period: e.period, points: e.points[lang], skills: WORK_SKILLS[i] ?? [] })),
    education: education.map((e, i) => ({ title: e.title[lang], org: e.org[lang], period: e.period, note: e.note?.[lang] ?? null, skills: EDU_SKILLS[i] ?? [] })),
    certifications: certifications.map((c) => ({ title: c.title[lang], org: c.org[lang], period: c.period })),
    philosophy: { title: philosophy.title[lang], lines: philosophy.lines[lang], paragraphs: philosophy.paragraphs[lang] },
    projects, posts,
    home: langUrl(lang), papillon: langUrl(lang, 'papillon/'), terminal: url('terminal/'),
    exp: url('experiments/'),
  };
}
export type ExpData = Awaited<ReturnType<typeof expData>>;
