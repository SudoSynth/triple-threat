---
name: build-debug
description: "Explicit debugging entry point. Loads the systematic-debugging methodology, performs root-cause investigation, then asks before continuing into fix execution. Use when you want guaranteed debugging rigor with conscious control over whether investigation becomes implementation. Distinct from /build-feature: never auto-continues — always presents findings and waits for explicit go."
---

# /build-debug — Explicit Debugging Entry Point

Investigate first. Present findings. Ask before continuing into fix execution. Never silently run the full pipeline.

## When to use this vs `/build-feature`

- **`/build-debug`** — you want guaranteed `systematic-debugging` rigor AND explicit control over whether to continue into a fix. Investigation is the deliverable; continuation is a deliberate choice.
- **`/build-feature`** — you want to ship a fix. The orchestrator handles the whole flow including bug-fix routing if it detects one. Auto-continues without confirmation.

If you're not sure which is right, prefer `/build-debug`. It gives you the option to stop after investigation; `/build-feature` doesn't.

## Pre-flight

### Check 1: Workspace bootstrap
Does `.planning/` exist?
- YES → continue
- NO → silently invoke the `gsd-new-project` skill via the Skill tool to bootstrap. Use sensible defaults (project name = current directory basename).

### Check 2: Working tree state
Run `git status --porcelain`. Note dirty tree but DO NOT block — bug investigation often happens mid-work.

### Check 3: Bug description
If the user invoked `/build-debug` with no description, use AskUserQuestion to gather:
- What's the observed broken behavior?
- Any error messages or stack traces?
- How can it be reproduced?

Don't proceed to investigation until you have at least a basic description.

## Step 1: Generate slug for this debug session

Generate a slug from the current timestamp + a short summary of the bug:

```
slug = YYYY-MM-DD-HHMM-<3-5-word-summary>
```

Examples:
- `2026-04-26-1845-cart-total-shipping`
- `2026-04-27-0930-login-blank-page-intermittent`
- `2026-04-28-1402-checkout-500-error`

The summary part should be lowercase, hyphenated, derived from the most distinctive nouns in the bug description.

**Never overwrite an existing investigation directory.** If `.planning/debug/<slug>/` already exists, append `-2`, `-3`, etc. until the path is unique.

## Step 2: Load systematic-debugging methodology

Invoke the `systematic-debugging` skill via the Skill tool to load the investigation methodology. Then, following that discipline, perform the investigation:

1. Read relevant code, gather evidence
2. Form initial mental model of the system
3. Eliminate possibilities, form hypothesis
4. Design experiment to confirm/disprove
5. Write a failing test that captures the bug (when feasible)
6. Identify root cause with confidence level

Pass the user's full request as context — verbatim error messages, stack traces, repro details.

## Step 3: Persist findings

Create `.planning/debug/<slug>/INVESTIGATION.md` with this structure:

```markdown
# Investigation: <short summary>

**Started:** YYYY-MM-DD HH:MM
**Trigger:** <user's original request, verbatim>

## Investigation timeline
- What was checked, what was eliminated, in chronological order

## Root cause
<hypothesis with confidence level: high/medium/low>

## Reproduction
<steps to reproduce reliably>

## Failing test
<test code that captures the bug, if produced>

## Suggested fix scope
- Files likely to change: <list>
- Change shape: <small/medium/large>
- Risk areas: <any side effects to watch>

## Eliminated possibilities
<things investigated and ruled out>
```

This file is the investigation deliverable. If the user stops here, it's their handoff document. If they continue, it's the spec phase's input context.

## Step 4: Decision gate

Use AskUserQuestion to present three options:

```
Investigation complete. Findings written to .planning/debug/<slug>/INVESTIGATION.md.

How do you want to proceed?

[A] Continue with full pipeline
    → spec → plan → exec → review → qa → ship
    → For bugs that warrant proper architectural treatment

[B] Continue but minimal (--quick)
    → Tightly-scoped spec/plan, then exec → review → qa → ship
    → Verification gates remain in place; only planning ceremony is reduced
    → For clear bugs where investigation already nailed the fix

[C] Stop here
    → Exit with investigation as deliverable
    → For triage, research, or when you'll handle the fix yourself
```

## Step 5: Branch on answer

### A: Full pipeline

DO NOT invoke `build-feature`. That would re-detect the bug-fix path and potentially repeat investigation. Instead, run the pipeline stages directly:

1. Invoke the `build-spec` skill via the Skill tool. Pass the investigation file path (`.planning/debug/<slug>/INVESTIGATION.md`) and ask the spec phase to incorporate it as authoritative context — do NOT re-discover the problem.
2. After spec is approved, invoke the `build-plan` skill via the Skill tool.
3. After plan is approved, invoke the `build-exec` skill via the Skill tool.
4. Invoke the `build-review` skill via the Skill tool.
5. Invoke the `build-qa` skill via the Skill tool (it will skip if no UI).
6. Invoke the `build-ship` skill via the Skill tool.

### B: Minimal pipeline (--quick semantics)

Same sequence as A, but pass a "minimal scope" hint to the spec and plan invocations:
- **Spec stays tightly scoped** to the root cause; do not expand to adjacent improvements.
- **Plan minimal task list** — just enough to fix the bug, no refactoring or coverage expansion.

**Verification gates remain unchanged.** `--quick` reduces planning ceremony only — it does NOT skip:
- TDD discipline in `build-exec`
- Two-stage review in `build-review`
- Verification gate in `build-ship`

### C: Stop

Confirm to the user:
```
✓ Investigation saved to .planning/debug/<slug>/INVESTIGATION.md
Exiting. You can re-invoke /build-debug later, or invoke /build-feature with the
investigation as context if you change your mind.
```

Exit cleanly.

## Edge cases

**Investigation finds no bug** (e.g., systematic-debugging concludes "this is expected behavior" or "can't reproduce"):
- Present that finding clearly in the investigation document
- Use AskUserQuestion to offer:
  - Re-investigate with more info from the user
  - Treat as feature/change request and route through `/build-spec`
  - Stop

**Multiple bugs in one report** (user describes several issues):
- Investigation phase should triage and surface the multiple bugs
- Use AskUserQuestion to ask whether to investigate each separately (multiple `/build-debug` sessions) or treat as one combined report
- Default: investigate the most severe/specific one first

## Relationship to `/gsd-debug`

`/gsd-debug` is GSD's **persistent multi-session debugger** with state machine and hypothesis tracking across context resets. It uses `.planning/debug/<slug>.md` (single file with frontmatter).

`/build-debug` is the Triple Threat **one-shot investigation entry** with optional pipeline handoff. It uses `.planning/debug/<slug>/INVESTIGATION.md` (subdirectory + named file).

V1 makes no attempt to detect or reuse `/gsd-debug` sessions. If you have a long-running multi-session debug investigation, use `/gsd-debug`. If you want disciplined one-shot investigation that can flow into the build pipeline, use `/build-debug`.

## What this skill does NOT do

- Does not invoke `build-feature` — would risk re-triggering bug detection and recursive investigation
- Does not auto-continue without explicit user confirmation
- Does not skip verification gates in the continuation path (TDD, two-stage review, ship verification)
- Does not overwrite existing investigation directories
- Does not depend on `/gsd-debug` state in v1
