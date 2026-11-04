---
title: "GSD: how I got AI agents to actually finish the work"
date: 2026-07
summary: "The GSD (Git. Ship. Done) framework, and the /goal trick in Claude Code that keeps the agent working through my whole plan without stopping every few minutes."
tags: [AI, VibeCoding, ClaudeCode]
translated: true
---

Since I started vibe coding, my biggest problem has been AI laziness, and Claude Code in particular 🤦‍♀️

I'd write a complete requirements file and hand it over, and it would build something that reflected maybe 10% of what I asked for, then tell me it was done. On top of that, every time I asked for something, it would stall and tell me to do it myself.

Then I stumbled on a framework that saved me from all that effort of convincing a lazy AI to deliver what I want.

## GSD (Git. Ship. Done) 🚀

It's a framework for AI agents that organizes the work into **phases**. How many phases you have depends on the size of the work and how much you care about its details. Each phase runs the same loop:

1. **Discuss:** it talks through the details of the work with you, so it can draw up the right plan.
2. **Plan:** it researches and double-checks the plan.
3. **Execute:** it starts carrying out the plans, in parallel.
4. **Verify:** it checks what was built and fixes the problems.
5. **Ship:** it opens a pull request, archives the phase, and moves on to the next one.

Another nice touch: you can pick the right model for each step. For example, if you want Opus 4.8 for planning but Sonnet 4.6 for execution, that's easy to set up.

## The stopping problem, and /goal

The next problem I hit was it stopping so I could clear the context or approve things. That's where some Claude Code features come in, like **`/goal`**: I set the goal to *finishing all phases*, and it keeps going through my plan unless it needs input or a confirmation from me.

I hope my experience helps. If you have other tips, please share them.
