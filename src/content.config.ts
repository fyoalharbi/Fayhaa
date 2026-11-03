import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { skillKeys } from './data/profile';

// One Markdown file per project per language:
//   src/content/projects/en/<slug>.md
//   src/content/projects/ar/<slug>.md
// Entry ids look like "en/finance-analyzer".
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),              // one-liner for cards + terminal `ls`
    tldr: z.object({
      problem: z.string(),
      role: z.string(),
      tools: z.string(),
      result: z.string(),
    }),
    skills: z.array(z.enum(skillKeys)),
    links: z.object({
      live: z.string().url().optional(),
      github: z.string().url().optional(),
      linkedin: z.string().url().optional(),
    }).default({}),
    embed: z.string().url().optional(), // iframe (e.g. Power BI "publish to web")
    featured: z.boolean().default(false),
    // Drafts render in `npm run dev` but get no page in the production build;
    // their card still shows and links out to `links.live` / `links.linkedin`.
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
