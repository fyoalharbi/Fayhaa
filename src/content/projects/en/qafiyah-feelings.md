---
title: "Qafiyah — browse Arabic poetry by feeling"
date: 2026-10
summary: "An open-source contribution to Qafiyah, an Arabic poetry reference: a feelings tree, based on Plutchik's wheel of emotions, that lets readers find poems by clicking through what they feel."
tldr:
  problem: "People often look for poetry that puts their feelings into words. Competing sites do this through a chat with an LLM, but someone who can't put their feelings into words usually doesn't want to type them either."
  role: "Open-source contributor. I designed the feelings tree and shipped the feelings pages to Qafiyah (merged pull request #344)."
  tools: "TypeScript, Astro"
  result: "Live on qafiyah.com/feelings — a clickable tree of emotions, each leading to matching verses with a copy button, listed for search engines and linked from the home page."
skills: [typescript, astro]
links:
  live: https://qafiyah.com/feelings
  github: https://github.com/raaqimorg/qafiyah/pull/344
featured: false
---

## The idea

I started from my own use of poetry apps. Like many people, I look for a "translation" of my feelings, something that helps me understand them. Before building anything I looked at competing sites: they all do this through a conversation with an LLM. I don't like that approach. Someone who can't put their thoughts into words doesn't want to write them out, and clicking makes for a more interactive experience.

## The approach

From what I'd read in psychology, I applied **Plutchik's Wheel of Emotions**, which divides emotions into primary types and then into more and more specific terms. I turned the wheel into a **tree**: start broad, then narrow down to exactly what you feel.

## What shipped

My pull request ([#344](https://github.com/raaqimorg/qafiyah/pull/344), merged October 2026) touched 30 files:

- **Smooth navigation:** moving between feelings morphs the page in place, so the tree animates instead of redrawing.
- **Verses as rows:** each verse shows its two halves, the poet, the era and its feeling, with a copy button.
- **Findable:** the feelings pages are in the sitemap with structured data, titles and descriptions, and covered by the SEO smoke tests.
- **Linked in:** a "search by feelings" link on the home page and in the nav.

Try it at [qafiyah.com/feelings](https://qafiyah.com/feelings).
