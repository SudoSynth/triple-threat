---
name: build-feature
description: "Triple Threat orchestrator with adaptive assurance. Fast for small precise tasks, Standard for normal features, Full for risky/demanding work. Combines GSD spine, GStack review/qa/ship, and Superpowers TDD discipline when the selected tier needs them. Run for any feature, bugfix, or change. Auto-bootstraps workspace and codebase map on first run."
argument-hint: "<feature description or ticket ID> [--skip-map] [--remap] [--no-ai] [--skip-qa]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
  - Skill
---

# /build-feature — Triple Threat Full Pipeline

You are orchestrating a feature build through three frameworks (GSD, GStack, Superpowers). Your job is to walk the user's feature request through every stage end-to-end while making smart decisions about what to skip based on repo state and feature shape.

## Inputs

The user invokes this with a feature description or ticket reference, e.g.:
- `/build-feature add Google OAuth login`
- `/build-feature KAN-229`
- `/build-feature fix logout not clearing cookies`

Optional flags:
- `--skip-map` — do not run codebase mapping even if missing
- `--remap` — force re-run codebase mapping even if cached
- `--no-ai` — skip AI-product detection prompt entirely
- `--skip-qa` — skip browser QA stage even for UI features
- `--quick` — for bug-fix paths, minimize planning overhead after systematic-debugging; keep required GSD artifacts sufficient for execution, but keep spec/plan prompts brief and skip nonessential expansion prompts

## Pipeline overview

```
Pre-flight (state detection + auto-bootstrap)
    ↓
Stage 1: SPEC          → /build-spec  (discuss + spec, optional AI integration)
    ↓
Stage 2: PLAN          → /build-plan  (autoplan pressure-test + plan-phase task list)
    ↓
   [USER APPROVAL GATE]
    ↓
Stage 3: EXEC          → /build-exec  (wave orchestration + Superpowers TDD per task)
    ↓
Stage 4: REVIEW        → /build-review (review + cso if sensitive + two-stage)
    ↓
Stage 5: QA            → /build-qa    (browser QA — auto-skipped if no UI)
    ↓
Stage 6: SHIP          → /build-ship  (gstack ship: VERSION, CHANGELOG, PR)
    ↓
Return PR URL
```

## Pre-flight: Git bootstrap (HARD GATE — runs before all other pre-flight checks)

Local Git history is required for the pipeline. GitHub is optional. Run these checks first, before any `.planning/` work, before CLAUDE.md deployment, before codebase mapping. The pipeline depends on durable Git history at every later stage; failing fast here prevents writing planning artifacts into a folder with no Git backing.

### Check 0.1: Git installed?

Run `git --version` via Bash. If exit code is non-zero or `git` is not found:

HALT. Print exactly this message (no improvisation):

```
BLOCKED: Git is not installed.
The Triple Threat pipeline requires Git for durable history.

Install Git per platform:
  macOS:        brew install git    (or: xcode-select --install)
  Linux/WSL:    sudo apt install git    (or your distro's package manager)
  Windows:      winget install Git.Git    (or download from git-scm.com)

After installing, restart your shell and re-run /build-feature.
```

Exit. Do NOT proceed. Do NOT touch the filesystem.

### Check 0.2: Working directory is a Git repository?

Run `git rev-parse --is-inside-work-tree 2>/dev/null` via Bash. If exit code is zero AND output is `true`, this is already a Git repo — continue to Check 0.3.

If not, the folder is not a Git repository. Use AskUserQuestion to ask:

> "This folder isn't a Git repository. The Triple Threat pipeline requires local Git history (specs, plans, and execution artifacts get committed under `.planning/`). Initialize one now?"

Options:
- **"Yes, initialize (Recommended)"** — run the bootstrap below
- **"No, cancel"** — exit cleanly; the user must manually init or move to an existing repo before retrying

If the user picks "Yes":
1. Run `git init -b main 2>/dev/null || (git init && git symbolic-ref HEAD refs/heads/main)`. The fallback handles older Git versions that do not support `-b`.
2. Continue to Check 0.3.

If the user picks "No," exit cleanly. Do NOT proceed.

### Check 0.3: Safe `.gitignore`

Required entries (project-agnostic, safe across stacks):

```
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
Thumbs.db
__pycache__/
*.pyc
```

If `.gitignore` does NOT exist: create it with the required entries (one per line, trailing newline).

If `.gitignore` EXISTS: read existing entries; for each required entry not present, append it to the end of the file. **Never overwrite or reorder existing entries.**

**Do NOT add `.planning/` to `.gitignore`.** The `.planning/` directory is the durable state spine for the pipeline (specs, plans, exec artifacts, summaries, verification). Committing it makes phase history portable across sessions and machines. GSD's convention is to track it.

### Check 0.4: Initial commit (only if newly initialized)

If Check 0.2 just ran `git init`:

1. Stage `.gitignore` first: `git add .gitignore`.

2. Run `git status --short` to see what other untracked files exist.

3. **If the output shows only `.gitignore`** (folder was empty before init):
   - Skip to step 5 with only `.gitignore` staged.

4. **If the output shows other untracked files** (folder was non-empty / inherited):
   - Do NOT silently run `git add -A`. The folder may contain experimental drafts, secrets the `.gitignore` doesn't catch, or scratch work the user doesn't intend to commit.
   - Show the file list (the `git status --short` output) to the user.
   - Use AskUserQuestion to ask: "This folder contains existing files. Stage them in the initial commit?"
   - Options:
     - **"Commit existing project files (Recommended)"** — after this explicit consent (and after the `git status --short` output was already shown), run `git add -A` to stage all visible non-ignored files. The staging is no longer silent — visibility + consent gates have both fired, so `git add -A` is the right command at this point.
     - **"Commit only `.gitignore`"** — leaves existing files untracked. Use when you're unsure what the folder contains; user can stage manually later.
     - **"Cancel"** — exit cleanly. Do NOT proceed to create `.planning/`, `CLAUDE.md`, or any other artifacts. The Git repo and `.gitignore` already exist from Checks 0.2-0.3 and remain in place uncommitted.

5. Run `git commit -m "Initial commit (Triple Threat pipeline init)"`.

6. The pipeline now has a real commit to branch from for later stages.

**Invariant:** `git add -A` is allowed only after `git status --short` was shown to the user AND the user explicitly selected "Commit existing project files." Empty-folder behavior commits only `.gitignore` with no prompt.

If the repo was already a Git repo: skip — do not make a no-op commit. Existing history is durable.

### Check 0.5: Record remote presence

Run `git remote -v` via Bash. Record whether a remote is configured:
- This state is consumed by `/build-ship` to choose between push/PR flow (remote present) and local ship-prep mode (no remote).
- No action needed here — just observe the state for the rest of the pipeline.

After Git pre-flight passes, continue to the existing pre-flight section below.

## Pre-flight: state detection and auto-bootstrap

Before touching the user's request, run these checks against the current working directory:

### Check 1: Workspace bootstrap
```
Does .planning/ exist?
  YES → workspace already bootstrapped, continue
  NO  → silently bootstrap by invoking the `gsd-new-project` skill via the Skill tool
        (Skill tool takes bare skill name, no leading slash). Use sensible defaults
        (project name = current directory basename).
        Confirm .planning/ now exists before proceeding.
```

### Check 2: Deploy CLAUDE.md template
```
Does CLAUDE.md exist in the current working directory?
  YES → leave it alone (don't overwrite the user's existing CLAUDE.md). Continue.
  NO  → copy the Triple Threat onboarding template into the project root, then
        commit it explicitly via Bash:
          cp ~/.claude/skills/triple-threat/CLAUDE.md.template ./CLAUDE.md
          git add CLAUDE.md
          git commit -m "docs: deploy Triple Threat onboarding (CLAUDE.md)"
        Commit explicitly here — do NOT rely on a downstream `gsd-sdk query commit`
        call to capture CLAUDE.md, because gsd-sdk has been observed to silently
        drop paths from its `files:` array, leaving CLAUDE.md untracked through
        the rest of the pipeline. Committing in pre-flight makes it durable
        immediately. Future Claude sessions in this directory will auto-load it.
```

### Check 3: Codebase map
```
If --remap flag was passed:
  Force-run /build-map regardless of cache state.

Else if --skip-map flag was passed:
  Skip mapping entirely. Continue.

Else:
  Does .planning/codebase/ exist AND contain STACK.md AND ARCHITECTURE.md?
    YES → mapping already done, skip
    NO  → invoke /build-map (uses gsd-map-codebase under the hood)
          Wait for completion before proceeding.
```

### Check 4: Repo size sanity
If the repo has fewer than ~5 source files (rough heuristic: count of `.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.go`, `.rs`, `.java`, `.rb` files), inform the user this is a tiny repo and ask whether to skip the heavyweight mapping. Use the AskUserQuestion tool.

## Bug-fix detection (before pipeline)

Before Stage 1 (SPEC), classify the user's request semantically (not by keyword matching).

**Route to `systematic-debugging` first when** the user reports behavior that is:
- Wrong, intermittent, or regressed
- Crashing or throwing errors
- Producing incorrect output or losing data
- Causing financial, security, or auth risk
- Failing tests
- Producing unexpected behavior or outputs ("X happens when Y", "X is wrong when Y")

**Do NOT route to `systematic-debugging` when** the request is a direct edit:
- Typo or copy update
- Style or layout tweak
- Config change
- Simple refactor
- Adding logging or telemetry
- "Fix" used as ordinary change language (e.g., "fix the typo", "fix the indentation")

**Ambiguous cases — asymmetric rule:**
- If ambiguous AND low-risk → skip debugging; avoiding unnecessary ceremony preserves trust
- If ambiguous AND high-risk (money, auth, data loss, security, production errors) → route through debugging

**If bug-fix path detected:**

1. Invoke the `systematic-debugging` skill via the Skill tool. Pass the user's full request as context — including any error messages, stack traces, or repro details verbatim.
2. The systematic-debugging skill produces an investigation result: root cause hypothesis, repro steps, and a failing test that captures the bug.
3. Feed that investigation result into Stage 1 (SPEC) as additional context — the spec phase incorporates it rather than re-discovering the problem.
4. Continue the rest of the pipeline normally. Do not skip the spec/plan artifacts required by later pipeline stages — `build-exec` requires a structured GSD plan to operate on. If `--quick` is present (or the user uses natural language like "just patch this", "no planning needed"), keep the spec and plan minimal and tightly scoped to the root-cause fix — do NOT skip them entirely.

**If no bug-fix signals detected:** proceed to tier classification (below).

## Tier classification (Fast / Standard / Full)

After pre-flight passes and bug-fix detection routes (or doesn't), classify the feature request to decide pipeline weight. Skip this section entirely if the bug-fix path was taken — debugging has its own routing.

### Cheap heuristics

Signals that suggest **Fast** (small, low-risk):
- Spec is precise (function signatures, file paths, concrete behavior)
- Estimated touch ≤2 source files
- No domain signals: no auth, payment, migration, schema, crypto, password, token
- No UI flow changes (no new pages, no major component additions)
- Targeted tests have obvious pass/fail criteria

Signals that suggest **Full** (risky, demanding):
- ≥2 risk signals from: auth, payment, migration, schema, security, AI/LLM, large UI
- Cross-cutting architecture (touches multiple modules)
- User explicitly asks for "full pipeline" or "thorough review"

### Classification rule

- ≥2 Full signals → Full
- 0 Full signals AND at least 3 Fast signals AND precise spec → Fast
- Else → **Standard (default)**

If unambiguous (clear Fast or clear Full), proceed silently and note the routing: "Routing as Fast Mode — small precise feature." or "Routing as Full Mode — security-sensitive change."

If ambiguous, use AskUserQuestion with the recommendation pre-selected:

> "This looks like [classification]. How should I proceed?"
> 1. Fast Mode (recommended): focused TDD + Superpowers review + commit
> 2. Standard Mode: today's pipeline (spec + plan + exec + review + qa + ship)
> 3. Full Triple Threat: complete current pipeline, reserved for risky/demanding work

**Default: Standard.** Only deviate when criteria are clearly met OR the user explicitly chose otherwise.

## Fast Mode flow

Fast Mode keeps discipline but skips ceremony. It is NOT a shortcut around review.

### What Fast Mode runs

1. **Confirm scope in prose.** State the inferred files and behavior in 1–2 sentences. Use AskUserQuestion only if scope is ambiguous, risky, or the inferred files/behavior may surprise the user. Don't add an approval gate for obviously well-scoped one-offs — the classifier already asked when it was uncertain.

2. **TDD discipline** — if code behavior changes:
   - Write failing test that captures the behavior
   - Run test, observe failure
   - Implement smallest production code change to pass
   - Run focused test, observe pass
   - Run broader test command if cheap (<10s)

3. **Superpowers two-stage review** (REQUIRED — non-negotiable):
   - Invoke `requesting-code-review` skill (fresh reviewer subagent)
   - Invoke `receiving-code-review` skill (anti-sycophancy evaluation)
   - Address critical findings before commit

4. **Commit if appropriate** — atomic commit with clear message. If unrelated dirty work exists in the repo, stage only the intentional files for this change OR ask the user before committing. Don't sweep up unrelated changes.

5. **Local ship-prep** — only if user explicitly requested it (default: skip; user can run `/build-ship` later)

### What Fast Mode skips

- `/build-spec` (scope confirmation prose replaces formal SPEC.md)
- `/build-plan` (no autoplan, no PLAN.md — TDD + commit is the plan)
- GStack `/review`, `/codex`, `/cso` (Fast Mode classification excludes security-sensitive changes — those route to Standard or Full)
- `/build-qa` (Fast Mode classification excludes UI flow changes)
- `/build-ship` push/PR (commits locally only; user invokes `/build-ship` later if wanted)

### What Fast Mode REQUIRES (non-negotiable)

- Failing test before implementation (unless task is doc-only or config-only)
- Superpowers two-stage review on the resulting diff
- Commit only after review findings addressed (when committing)

If you find yourself wanting to skip any of these to "go faster," that's a signal to switch to Standard Mode or stop and ask. Fast does not mean unverified.

## Standard Mode flow

Today's v0.2.4 pipeline, unchanged. Stages 1–6 as documented in the "Pipeline overview" section above. This is the default routing.

## Full Mode flow

For v0.3.0: Full Mode is equivalent to Standard Mode. The intended additional gates (`/cso` for security-sensitive code, `/design-review` for UI-heavy work, mandatory codebase mapping, stricter ambiguity gate) are deferred to v0.3.1+ pending validation against a real demanding workload. Do not claim Full does more than Standard until v0.3.1 ships.

## Stage 1: SPEC

Invoke `/build-spec` via the Skill tool, passing the user's feature description.

This will:
- Run `gsd-discuss-phase` (clarifying conversation)
- Run `gsd-spec-phase` (formalize into spec doc)
- If `--no-ai` was NOT passed, scan the resulting spec for AI keywords (LLM, GPT, Claude, Gemini, RAG, retrieval, embedding, vector, agent, tool calling, prompt, eval, hallucination, chatbot, conversational AI). If any match (whole-word, case-insensitive), use AskUserQuestion to ask whether to run `/gsd-ai-integration-phase`. If yes, run it.

Wait for the spec to be approved before proceeding to Stage 2.

## Stage 2: PLAN

Invoke `/build-plan` via the Skill tool. This will:

- Run GStack's `/autoplan` (the 4-reviewer pressure-test: CEO scope, Design taste, Engineering architecture, DevEx)
- Run `gsd-plan-phase` to produce the structured task list ready for wave decomposition

Present the resulting plan to the user via AskUserQuestion with options "Approve and execute", "Request changes", "Cancel".

If "Request changes" is selected, surface what they'd like changed and re-run plan-phase. If "Cancel", abort the pipeline gracefully (state is preserved in .planning/).

## Stage 3: EXEC

Invoke `/build-exec` via the Skill tool. This wraps `gsd-execute-phase` but injects the Superpowers TDD discipline into each per-task subagent.

The exec stage handles its own approval gates per wave if needed. Wait for all waves to complete.

## Stage 4: REVIEW

Invoke `/build-review` via the Skill tool. This will:
- Run GStack's `/review` (auto-fixes obvious issues)
- Run GStack's `/codex` if the Codex CLI is available (cross-model second voice)
- Detect whether the diff touches sensitive paths (auth, login, password, token, session, payment, billing, checkout, upload, file I/O, db migrations, users, accounts) — if yes, also run GStack's `/cso` (security audit)
- Invoke Superpowers' two-stage review pattern (`requesting-code-review` → `receiving-code-review`)

Wait for all review findings to be addressed before proceeding.

## Stage 5: QA

If `--skip-qa` was passed, skip this stage entirely.

Otherwise, invoke `/build-qa` via the Skill tool. The QA skill will detect whether the project has UI by inspecting `.planning/codebase/STACK.md` and `package.json`. If no UI is detected, it skips silently with a notice. If UI is detected, it runs GStack's `/qa` (real-browser test-fix-verify loop).

## Stage 6: SHIP

Invoke `/build-ship` via the Skill tool. This wraps GStack's `/ship`:
- Auto-merge base branch
- Run full test suite
- Audit test coverage (auto-generates tests for gaps)
- Audit plan completion (catches scope creep)
- Bump VERSION
- Generate CHANGELOG entry
- Push branch
- Open GitHub PR

Return the PR URL to the user.

## Approval gates (where you pause for the user)

The pipeline pauses for user input at exactly these moments:
1. **Pre-flight (small repo)**: only if repo has <5 source files, ask whether to skip mapping
2. **Tier classification (ambiguous case only)**: only if heuristics don't clearly point to Fast or Full — recommendation pre-selected
3. **Fast Mode scope confirmation (rare)**: only if inferred files/behavior may surprise the user
4. **AI integration prompt** (Standard/Full only): only if AI keywords detected and `--no-ai` not passed
5. **Stage 1 spec approval** (Standard/Full only): handled inside `/build-spec`
6. **Stage 2 plan approval** (Standard/Full only): explicit AskUserQuestion gate before exec
7. **Stage 4 review findings** (Standard/Full only): only if findings require user judgment

Aim for the happy path on Standard to need only the plan-approval gate. Aim for Fast Mode to need zero or one gate.

## Failure handling

If any sub-skill reports failure or the user cancels mid-pipeline:
- DO NOT auto-rollback. State in `.planning/` is durable on purpose.
- Surface what happened in plain language.
- Offer escape hatches: re-run the failed phase command standalone (`/build-exec`, `/build-review`, etc.) after the user fixes the issue.

If the user asks to resume later, mention `gsd-resume-work` which will rehydrate from `HANDOFF.json` if a handoff snapshot was created.

## Communication style

- Status updates between stages should be one short line: "Spec approved, moving to plan."
- Don't dump full sub-skill output unless the user asks. The sub-skills will surface their own important info.
- At the end, summarize: "Shipped <feature> in <N> commits. PR: <URL>."

## What this skill does NOT do

- Does not write code itself — delegates entirely to sub-skills
- Does not modify `.planning/` directly — that's GSD's domain
- Does not run tests directly — Superpowers TDD discipline (inside exec) and GStack ship handle that
- Does not push to git directly — `/build-ship` handles that
