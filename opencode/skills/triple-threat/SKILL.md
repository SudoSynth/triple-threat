---
name: triple-threat
description: "Reference / overview skill for the Triple Threat unified build pipeline. Combines Superpowers (TDD discipline), GStack (review/qa/ship), and GSD (spec/plan/execute spine). Invoke this skill to see the full command surface and the layered architecture."
---

# Triple Threat — Unified Build Pipeline

A composition of three agent frameworks into a single low-friction OpenCode `/build-*` command surface.

## The layered design

```
┌─────────────────────────────────────────────────┐
│ GStack: review, cso, qa, design-review, ship,   │  ← back end
│         land-and-deploy, canary, retro          │
├─────────────────────────────────────────────────┤
│ Superpowers: TDD + verify-before-complete       │  ← per-task discipline
│              (nested INSIDE each GSD wave-task) │
├─────────────────────────────────────────────────┤
│ GSD: discuss, spec, AI-integration (conditional)│  ← spine
│      plan, wave executor, hooks,                │
│      pause/resume, debug, .planning/ state      │
├─────────────────────────────────────────────────┤
│ Plus: GStack /autoplan slots into the plan stage│
│       to pressure-test from 4 angles            │
└─────────────────────────────────────────────────┘
```

## Default command (90% case)

```
/build-feature <description or ticket>
```

Walks the full pipeline end-to-end: pre-flight (auto-bootstrap workspace + map if missing) → spec → plan → exec → review → qa → ship.

## Phase commands (escape hatches)

For surgical access to individual stages:

| Command | What it does | Underlying frameworks |
|---|---|---|
| `/build-init` | Bootstrap workspace + run codebase map (no feature work) | GSD |
| `/build-map` | Codebase mapping only (refresh after refactor) | GSD |
| `/build-spec` | Discuss + spec phases; AI-integration if applicable | GSD |
| `/build-plan` | /autoplan pressure-test + structured plan output | GStack + GSD |
| `/build-exec` | Wave execution with Superpowers TDD nested per task | GSD + Superpowers |
| `/build-review` | Review + Codex (if available) + CSO (if sensitive) + Superpowers two-stage | GStack + Superpowers |
| `/build-qa` | Browser QA (auto-skipped if no UI) | GStack |
| `/build-ship` | Ship-prep + GitHub PR | GStack |
| `/build-debug <bug>` | Explicit debug entry: investigate first, ask before continuing | Superpowers + GSD |

## Direct framework access (power users)

All underlying framework commands remain available for surgical use:
- GSD: `/gsd-*` (81 skills)
- GStack: `/autoplan`, `/review`, `/qa`, `/ship`, `/cso`, `/design-review`, `/canary`, `/land-and-deploy`, etc.
- Superpowers: invoke skills like `test-driven-development`, `systematic-debugging`, etc. via the Skill tool.

## State spine

All durable state lives in `.planning/` (GSD's directory):
- `.planning/codebase/` — codebase cheat sheets (one-time per repo)
- `.planning/<phase>/` — per-feature spec, plan, execution artifacts, summary, verification
- `.planning/debug/` — persistent debug sessions
- `.planning/threads/` — cross-phase context

This is what makes multi-session work possible. Stop mid-feature, close Claude, come back tomorrow — `/gsd-resume-work` rehydrates state.

## Auto-when-missing magic

First `/build-feature` in a repo:
1. Bootstrap `.planning/` workspace (silent)
2. Run `/build-map` (4 parallel agents → 7 cheat sheets)
3. Then proceed to actual feature work

Subsequent runs skip steps 1 and 2 (cached).

## When to use which entry point

| Situation | Use |
|---|---|
| Default — any feature, fix, or change | `/build-feature` |
| Just inherited a codebase, no feature yet | `/build-init` |
| Major refactor, want to refresh codebase analysis | `/build-map --remap` |
| Want to think through an idea before committing | `/build-spec` |
| Have a spec from elsewhere, need plan only | `/build-plan` |
| Pipeline died mid-exec, want to resume | `/build-exec` |
| Wrote code by hand, want review pass | `/build-review` |
| Manually edited UI, want browser sanity check | `/build-qa` |
| Wrote code by hand, want ship-prep automation | `/build-ship` |
