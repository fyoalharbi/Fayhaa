Hi,
i'm fayhaa alharbi, i like data/business problems and i'm a very curious person.
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

## Add a project

1. Copy `src/content/projects/en/ascii-butterfly.md` to `src/content/projects/en/<slug>.md`
2. Fill in the frontmatter (title, date, summary, tldr, skills, links) and write the post
3. Optional: add the Arabic version at `src/content/projects/ar/<slug>.md`
4. Keep `draft: true` while writing. Drafts show in `npm run dev` but get no page in production.

It shows up automatically on the home page, `/projects/`, every skill page it's tagged with, and in the terminal (`ls projects`, `cat <slug>`).

Skills used in `skills: [...]` must exist in `src/data/profile.ts`.

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
