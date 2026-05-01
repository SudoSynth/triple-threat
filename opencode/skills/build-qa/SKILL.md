---
name: build-qa
description: "QA phase of the build pipeline. Runs GStack /qa (real Chromium browser test-fix-verify loop) on UI features. Auto-skips silently for backend-only projects. Use standalone after manually editing UI code to verify it didn't break anything visually."
---

# /build-qa — Browser QA loop

Wraps GStack's `/qa` for projects that have a UI. Auto-detects whether the project has a frontend and skips with a notice if not.

## Pre-flight: UI detection

Determine whether this project has UI surface area worth browser-testing. Use these signals:

### Signal 1: STACK.md (preferred if available)

Read `.planning/codebase/STACK.md`. If it mentions any frontend framework — React, Vue, Svelte, Angular, Next.js, Nuxt, Remix, SolidJS, Astro, Gatsby, Ember, Lit — UI is present.

### Signal 2: package.json dependencies

Read `package.json`. Check `dependencies` and `devDependencies` for any of:
```
react, react-dom, vue, @vue/core, svelte, @sveltejs/kit
next, nuxt, @remix-run/react, solid-js, astro
@angular/core, ember-source, lit
```
Match found → UI is present.

### Signal 3: HTML files in source

Check for `.html` files outside `node_modules/`, `dist/`, `build/`, `.next/`. If any exist → UI is present.

### Signal 4: HTML in JSX/TSX components

Run `find . -name "*.tsx" -o -name "*.jsx" 2>/dev/null | head -1` — any output → UI is present.

### Decision

- If at least one signal indicates UI → continue to QA.
- If no signals → skip with notice:
  ```
  No UI detected in this project. Skipping browser QA.
  (Heuristics: STACK.md, package.json dependencies, .html files, JSX/TSX components.)
  ```
  Then exit cleanly.

## Run the QA loop

Invoke the `qa` skill via the Skill tool (bare name, no leading slash). This runs GStack's full QA pipeline:
- Spins up real Chromium (not headless screenshots)
- Drives through the feature
- Takes screenshots, compares against baseline if present
- Enters test-fix-verify-regression-commit loop
- WTF-likelihood guardrail (halts at >20% revert rate to prevent compounding errors)
- Health score across 8 categories at completion

## Post-QA

If GStack `/qa` reports a low health score or unresolved issues:
- Surface the issues to the user
- Suggest re-running `/build-qa` after fixes
- Do NOT proceed to ship — let `/build-feature` handle that decision

If GStack `/qa` completes with acceptable health:
- Report the score
- Pipeline is ready for `/build-ship`

## Optional: design-review

If the project is UI-heavy (multiple frontend frameworks, large component count, or user explicitly requested polish), suggest the user invoke `/design-review` separately for the AI Slop Blacklist + design-dimension audit. Do not auto-invoke it.

## What this skill does NOT do

- Does not run unit tests — that's `/build-exec` and `/build-ship`.
- Does not auto-invoke `/design-review` — that's an opt-in separate GStack skill.
- Does not browser-test on multiple browsers (GStack uses Chromium only).
