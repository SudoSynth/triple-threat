---
name: build-plan
description: "Plan phase of the build pipeline. Runs GStack's /autoplan (4-reviewer pressure-test) followed by gsd-plan-phase to produce a structured task list ready for wave execution. Use standalone when you have a spec from elsewhere and want to plan implementation."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
---

# /build-plan — Pressure-test + structured plan

Combines GStack's adversarial planning review with GSD's structured plan output. The spec is pressure-tested by 4 reviewer roles (CEO, Design, Engineering, DevEx) before being decomposed into discrete tasks.

## Steps

### 1. Pre-flight check

Verify a spec exists. Look for the most recent SPEC.md in `.planning/` (typically under a phase directory like `.planning/<phase>/SPEC.md`).

If no spec is found, tell the user to run `/build-spec` first.

### 2. Run /autoplan (GStack)

Invoke the `autoplan` skill via the Skill tool (bare name, no leading slash). This runs 4 sequential reviewers:
- **CEO** — challenges scope (Expansion / Selective Expansion / Hold / Reduction)
- **Design** — rates visual/UX dimensions, flags AI Slop patterns
- **Engineering** — locks architecture, identifies test gaps, perf concerns
- **DevEx** — audits developer experience (only if dev-facing)

If OpenAI Codex CLI is installed, each reviewer also runs as a Codex subagent for cross-model second voice. If not, single-voice degrades gracefully.

`/autoplan` uses 6 hardcoded decision principles to auto-resolve mechanical questions and surfaces only taste-level decisions for user approval at its own internal gate.

#### When to skip /autoplan

For trivial, precise specs, /autoplan's 4-reviewer pressure-test produces no taste-level decisions and adds wall-clock time without changing the plan. Skip /autoplan and proceed directly to step 3 (gsd-plan-phase) only if ALL of the following are true:

- Spec defines explicit function signatures and file paths
- Phase has ≤3 tasks
- No taste decisions remain — no choice between architecture patterns, no library selection, no UX trade-offs

If any of these conditions are uncertain or false, run /autoplan as documented above. When in doubt, run it.

When skipping, note in the plan output: "Skipped /autoplan — spec was trivial/precise (no taste decisions to surface)." Without this note, the skip is ambiguous to reviewers.

### 3. Run gsd-plan-phase

Once `autoplan` produces an approved plan direction, invoke the `gsd-plan-phase` skill via the Skill tool. This produces a structured `PLAN.md` with discrete tasks ready for wave-based execution by `/build-exec`.

### 4. Final approval gate

Present the resulting plan to the user. Use AskUserQuestion with options:
- "Approve and execute" → exit cleanly, ready for `/build-exec`
- "Request changes" → ask what they'd like changed, re-run `/gsd-plan-phase` with the feedback
- "Cancel" → exit without proceeding (state preserved in `.planning/`)

## TDD requirement for code-changing tasks

Any task that changes production source code MUST be written in RED→GREEN order.

A code-changing task is valid only if its steps appear in this order:
1. Write or update a test that specifies the new behavior.
2. Run that test and confirm it fails for the expected reason.
3. Implement the smallest production-code change needed to pass.
4. Run the same test and confirm it passes.
5. Run the relevant broader test command.
6. Commit the test and implementation together.

A plan is invalid if a task modifies production code before defining and running a failing test for the same behavior.

Do NOT split a feature into "implementation task" followed by "test task." That is implementation-first even if tests appear somewhere later in the plan.

### Valid vs invalid examples

**Valid (single TDD-shaped task):**

```
Task 1: Add lowercase
  Step 1: Add failing tests for lowercase("HELLO")
  Step 2: Run focused test, observe failure
  Step 3: Add lowercase implementation
  Step 4: Run focused test, observe pass
  Step 5: Run full test suite
  Step 6: Commit test + implementation together
```

**Invalid (split, implementation-first):**

```
Task 1: Add lowercase implementation     <- BLOCKED by /build-exec
Task 2: Add lowercase tests
```

### Plan author preference

For source-modifying phases (anything that touches `src/`, `lib/`, `app/`, or other production code), prefer dispatching `gsd-planner` rather than writing the plan inline. Inline plan writing is acceptable only for doc-only, config-only, or trivial non-code phases — and even then it must obey the RED→GREEN ordering rule above.

Inline plan writing for code-changing phases is the most common path that produces invalid implementation-first plans. The /build-exec gate will block them, but it's cheaper to avoid them at plan time.

### Required v0.2.0 schema (enforced by deterministic linter)

Starting with v0.2.0, code-changing tasks MUST use this exact XML schema in PLAN.md. The `/build-exec` pre-execution gate runs a deterministic Bash linter (`lint-plan-tdd.js`) that parses tasks and validates structure. Plans that fail the schema check exit non-zero from the linter and execution halts mechanically — regardless of which model wrote the plan.

```xml
<task tdd="true">
  <name>Task N: <description></name>
  <files>tests/foo.test.js, src/foo.js</files>
  <red>
    Step 1: Add failing test for <behavior>
    Step 2: Run focused test, observe FAIL with reason: <expected error>
  </red>
  <green>
    Step 3: Implement minimum production code
    Step 4: Run focused test, observe PASS
    Step 5: Run full test suite, observe PASS
  </green>
  <commit>
    git add tests/foo.test.js src/foo.js
    git commit -m "feat: <description>"
  </commit>
</task>
```

Linter requirements (each is checked mechanically):
- `tdd="true"` attribute on the `<task>` opening tag
- `<red>` block present
- `<green>` block present
- `<red>` precedes `<green>` in document order
- `<red>` contains failure-detection language (`fail`, `RED`, `expect ... fail`, `observe failure`)
- `<green>` contains pass-detection language (`pass`, `GREEN`, `expect ... pass`)

Tasks that touch only test files (matching `tests/`, `*.test.js`, `*_test.go`, `test_*.py`, etc.) or only documentation are exempted automatically — TDD validation only applies to production-code-touching tasks.

**Production code is detected by path:** `src/`, `lib/`, `app/`, `pkg/`, `internal/`, `cmd/`, `components/` directories, AND root-level files with language extensions (`*.py`, `*.js`, `*.ts`, `*.go`, `*.rb`, `*.rs`, `*.java`, `*.kt`, `*.swift`, `*.cs`). Custom layouts can override via `.planning/lint-config.json` with `production_patterns`, `test_exclusion_patterns`, `doc_patterns` arrays of regex strings.

The linter is the source of truth. To test a plan locally before /build-exec invokes it:
```bash
node ~/.claude/scripts/lint-plan-tdd.js .planning/<phase>/PLAN.md
```

Exit codes: 0=pass, 1=violation, 2=parse error, 3=override granted.

## Simplicity check

Before approving the plan, verify it passes the simplicity test:

- Does every task trace to a requirement in the spec? If not, cut it.
- Are there speculative features (nice-to-haves not in scope)? Remove them.
- Are there abstractions written for a single call site? Flatten them.
- Is there configurability that wasn't explicitly requested? Drop it.
- Could the same outcome be achieved with fewer tasks or files?

If yes to any of these, push back before proceeding. A shorter plan that solves the problem is always preferred over a complete one that anticipates future needs.

## Output

A structured PLAN.md in `.planning/<phase>/PLAN.md` containing:
- Discrete tasks
- Dependency relationships between tasks (for wave decomposition)
- Files to be modified per task (used for conflict detection)
- Verification criteria per task

This is the input that `/build-exec` will consume.

## What this skill does NOT do

- Does not write code — that's `/build-exec`.
- Does not modify the spec — if the plan reveals the spec is wrong, surface that and let the user re-run `/build-spec`.
- Does not invoke specialty planners (e.g., `/gsd-ultraplan-phase` cloud planning) by default — user can invoke those directly if needed.
