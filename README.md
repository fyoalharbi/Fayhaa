Hi,
i'm fayhaa, i like data/business problems and i'm a very curious person.
this is just a humble portfolio with multiple easter eggs!

---

## Two views, one source

| View | URL | For |
|---|---|---|
| **Normal** | `/` and `/ar/` | Recruiters: projects, skills, contact, case studies |
| **Terminal** | `/terminal/` | The original spec sheet, now with a real command line (`help`) |

Both views read from the same files:

- `src/data/profile.ts`: name, role, links, skills, experience, philosophy
- `src/content/projects/{en,ar}/*.md`: one Markdown file per project (a case study)

## The butterflies

- `public/js/ascii.js`: renders the hero butterfly from the video as ASCII
- `public/js/flyer.js`: the small procedural butterfly (top view in flight, side view when perched)
- `public/js/butterfly.js`: wires both up, plus the hidden philosophy:
  hold still on the hero butterfly's body, or hover the flying one
- The philosophy text lives in `src/data/profile.ts` → `philosophy.lines`

## Add a project

1. Copy `src/content/projects/en/ascii-butterfly.md` to `src/content/projects/en/<slug>.md`
2. Fill in the frontmatter (title, date, summary, tldr, skills, links) and write the post
3. Optional: add the Arabic version at `src/content/projects/ar/<slug>.md`
4. Keep `draft: true` while writing. Drafts show in `npm run dev` but get no page in production.

It shows up automatically on the home page, `/projects/`, every skill page it's tagged with, and in the terminal (`ls projects`, `cat <slug>`).

Skills used in `skills: [...]` must exist in `src/data/profile.ts`.

## Write a blog post

Add `src/content/posts/en/<slug>.md` (and/or `ar/<slug>.md`):

```md
---
title: My post
date: 2026-11
summary: One or two sentences for the blog list.
tags: [AI, Data]
original: https://www.linkedin.com/posts/...   # optional
translated: false                              # true if it's a translation
draft: false
---
Write in Markdown here.
```

It appears at `/blog/` (and `/ar/blog/`). A post can exist in one language only.

## The CV

The CV lives on an unlisted page (`src/pages/cv/<random>/`), linked from nowhere on the site and marked `noindex`. Edit the page to update it, then regenerate the PDF so the download matches: open the page in Chrome → Print → *Save as PDF*, paper A4, margins *None*, background graphics on, and save it over `public/cv/<random>/Fayhaa-Alharbi-CV.pdf`.

## Optional files in `public/`

- `resume.pdf`: enables the résumé buttons and the terminal `resume` command
- `og.png` (1200×630): link preview image for LinkedIn and other sites

## Run locally

```sh
npm install
npm run dev      # http://localhost:4321/Fayhaa/
npm run build    # outputs to dist/
```

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.
