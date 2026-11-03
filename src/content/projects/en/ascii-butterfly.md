---
title: ASCII Butterfly — turning video pixels into text
date: 2026-03
summary: A live p5.js piece that samples a butterfly video and redraws every pixel as a character, with hidden interactions.
tldr:
  problem: A video is just a grid of numbers. I wanted the centerpiece of my portfolio to show that grid being turned into something readable, which is the core of analytics work.
  role: Solo design and code
  tools: p5.js, JavaScript, HTML/CSS
  result: The live butterfly on this site. It renders in real time, reacts to the cursor, and hides several easter eggs.
skills: [p5js, javascript, generative-viz]
links:
  github: https://github.com/fyoalharbi/Fayhaa
featured: true
---

## The idea

Every frame of a video is a table: rows, columns, and three numbers per cell. Analysts spend their days turning tables like that into something a person can read at a glance. This piece does that in its most literal form.

## How it works

**1. Shrink the data on purpose.** The source video is sampled on a **60 × 60 grid**, which is 3,600 cells per frame. That's small enough to redraw continuously in the browser and coarse enough that the shape survives being turned into text.

**2. One number per cell.** For each cell the red, green and blue channels are averaged into a single brightness value (0–255). It's the same move as collapsing several noisy columns into one metric before you chart it.

**3. Map the metric to a symbol.** Brightness is bucketed into a short character ramp, `0 | 1 .` plus a space, so dark pixels get dense glyphs and bright ones get blanks. Fewer buckets keep the silhouette readable, the same instinct as not putting twelve colors on a bar chart.

**4. Let the viewer inspect the data.** Hover the canvas and a **data probe** shows the exact grid coordinate and brightness value under your cursor, like a tooltip on a dashboard. You can read the numbers behind the picture.

## Behaviour layered on top

- **Shy drift.** The butterfly eases away from your cursor. The offset is smoothed with linear interpolation, so it floats instead of snapping.
- **Modes as states.** The same pipeline swaps its character set depending on context: hearts when you hover the body, warning glyphs (`X % ? !`) on the contact page, and a red "glitch" scatter on navigation. One renderer with different encodings, like one dataset feeding several dashboard views.
- **A secret channel.** Clicking the butterfly plays a full-screen glitch and opens an email to me.

## What I'd do differently

- The source video is far larger than a 60 × 60 grid needs. Re-encoding it at a tiny resolution would cut most of the page weight.
- Moving the sketch to p5's *instance mode* would let it be embedded in more than one place without global variables.

## Skills this shows

Reducing raw data to a meaningful metric, choosing encodings for readability, and building interactive visuals that let people explore the numbers themselves.
