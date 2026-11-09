import { getCollection, type CollectionEntry } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';
import { skills, type Lang } from '../data/profile';

export type Project = CollectionEntry<'projects'>;
export type Post = CollectionEntry<'posts'>;

// ── URLS ─────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix a site path with the deploy base, e.g. url('projects/x/') → /Fayhaa/projects/x/ */
export function url(p = ''): string {
  const clean = p.replace(/^\//, '');
  return `${BASE}/${clean}`;
}

/** Same as url() but inside the language tree (EN at root, AR under /ar/). */
export function langUrl(lang: Lang, p = ''): string {
  return url(lang === 'ar' ? `ar/${p.replace(/^\//, '')}` : p);
}

// ── OPTIONAL PUBLIC FILES ────────────────────
// Buttons / meta tags only render when the file actually exists in /public.
const publicFile = (name: string) => fs.existsSync(path.join(process.cwd(), 'public', name));
export const hasResume = publicFile('resume.pdf');
export const hasOgImage = publicFile('og.png');

// ── PROJECTS ─────────────────────────────────
const showDrafts = import.meta.env.DEV;

export const projectSlug = (p: Project) => p.id.split('/').slice(1).join('/');
export const projectLang = (p: Project) => p.id.split('/')[0] as Lang;

/** True when the project gets its own case-study page in this build. */
export const hasPage = (p: Project) => showDrafts || !p.data.draft;

export async function getProjects(lang: Lang): Promise<Project[]> {
  const all = await getCollection('projects', (p) => projectLang(p) === lang);
  return all.sort((a, b) =>
    Number(b.data.featured) - Number(a.data.featured) ||
    b.data.date.valueOf() - a.data.date.valueOf());
}

export const postSlug = (p: Post) => p.id.split('/').slice(1).join('/');
export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = await getCollection('posts', (p) => p.id.split('/')[0] === lang && (showDrafts || !p.data.draft));
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Where a project card should link: its case study, else its best external link. */
export function projectHref(p: Project): { href: string; external: boolean } {
  if (hasPage(p)) return { href: langUrl(projectLang(p), `projects/${projectSlug(p)}/`), external: false };
  const l = p.data.links;
  return { href: l.live ?? l.linkedin ?? l.github ?? '#', external: true };
}

export const skillLabel = (key: string, lang: Lang) =>
  skills.find((s) => s.key === key)?.label[lang] ?? key;

export const formatDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { year: 'numeric', month: 'short' });

// ── UI STRINGS ───────────────────────────────
export const ui = {
  en: {
    nav: { projects: 'Projects', skills: 'Skills', about: 'About', contact: 'Contact', blog: 'Blog' },
    blogTitle: 'Blog',
    blogLead: 'Notes on data, building with AI agents, and things I learn along the way.',
    noPosts: 'No posts yet.',
    readPost: 'Read post',
    backToBlog: '← All posts',
    translatedNote: 'Translated from the original Arabic post.',
    originalOn: 'Originally posted on LinkedIn ↗',
    otherLang: 'العربية',
    viewProjects: 'View projects',
    resume: 'Download résumé',
    emailMe: 'Email me',
    featured: 'Selected work',
    allProjects: 'All projects',
    readCase: 'Read case study',
    viewOutside: 'View project',
    skillsTitle: 'Skills, with receipts',
    skillsLead: 'Pick a skill to see the projects behind it.',
    core: 'core',
    noReceipt: 'Write-up coming soon.',
    usedIn: (n: number) => (n === 1 ? 'Used in 1 project' : `Used in ${n} projects`),
    allWork: (n: number) => `All ${n} projects →`,
    more: (n: number) => `+${n} more`,
    less: 'show less',
    projectsUsing: (n: number) => (n === 1 ? '1 project' : `${n} projects`),
    noProjectsYet: 'Write-up coming soon.',
    experience: 'Experience',
    education: 'Education',
    certifications: 'Certifications',
    howIWork: 'How I work',
    contactTitle: "Let's talk",
    contactLead: 'Email is the fastest way to reach me.',
    tldr: { problem: 'Problem', role: 'My role', tools: 'Tools', result: 'Result' },
    links: { live: 'Live', github: 'Code', linkedin: 'LinkedIn post' },
    back: '← All projects',
    skillsUsed: 'Skills in this project',
    draftBanner: 'Draft: only visible in dev mode. Set `draft: false` once the TODOs are filled in.',
    butterflyHints: {
      idle: 'psst, hold still on its body…',
      still: 'keep still…',
      landed: 'it landed. move away to let it go',
    },
    footer: 'Built with Astro & p5.js',
  },
  ar: {
    nav: { projects: 'المشاريع', skills: 'المهارات', about: 'عني', contact: 'تواصل', blog: 'المدونة' },
    blogTitle: 'المدونة',
    blogLead: 'كتابات عن البيانات، والبناء مع وكلاء الذكاء الاصطناعي، وأشياء أتعلمها بالطريق.',
    noPosts: 'ما فيه تدوينات للحين.',
    readPost: 'اقرأ التدوينة',
    backToBlog: '→ كل التدوينات',
    translatedNote: 'مترجمة من التدوينة الأصلية.',
    originalOn: 'نُشرت أصلاً على LinkedIn ↗',
    otherLang: 'English',
    viewProjects: 'شوف المشاريع',
    resume: 'تحميل السيرة الذاتية',
    emailMe: 'راسلني',
    featured: 'أعمال مختارة',
    allProjects: 'كل المشاريع',
    readCase: 'اقرأ دراسة الحالة',
    viewOutside: 'شوف المشروع',
    skillsTitle: 'المهارات، مع الدليل',
    skillsLead: 'اختر مهارة عشان تشوف المشاريع اللي وراها.',
    core: 'أساسية',
    noReceipt: 'الشرح قريباً.',
    usedIn: (n: number) => (n === 1 ? 'مستخدمة في مشروع واحد' : `مستخدمة في ${n} مشاريع`),
    allWork: (n: number) => `كل المشاريع (${n}) ←`,
    more: (n: number) => `+${n} أكثر`,
    less: 'عرض أقل',
    projectsUsing: (n: number) => (n === 1 ? 'مشروع واحد' : `${n} مشاريع`),
    noProjectsYet: 'الشرح قريباً.',
    experience: 'الخبرات',
    education: 'التعليم',
    certifications: 'الشهادات',
    howIWork: 'طريقتي في الشغل',
    contactTitle: 'خلنا نتكلم',
    contactLead: 'أسرع طريقة توصل لي هي الإيميل.',
    tldr: { problem: 'المشكلة', role: 'دوري', tools: 'الأدوات', result: 'النتيجة' },
    links: { live: 'مباشر', github: 'الكود', linkedin: 'منشور LinkedIn' },
    back: '→ كل المشاريع',
    skillsUsed: 'المهارات في هذا المشروع',
    draftBanner: 'مسودة: تظهر في وضع التطوير فقط.',
    butterflyHints: {
      idle: 'جرب تثبت المؤشر على جسمها…',
      still: 'اثبت…',
      landed: 'نزلت. ابعد المؤشر عشان تطير',
    },
    footer: 'مبني بـ Astro و p5.js',
  },
} as const;
