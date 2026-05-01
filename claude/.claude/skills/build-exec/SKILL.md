---
name: build-exec
description: "Execute phase of the build pipeline. Mechanically validates PLAN.md is TDD-shaped via deterministic Bash linter (lint-plan-tdd.js) before invoking gsd-execute-phase. Linter exit code 1 halts execution; override requires explicit user AskUserQuestion approval. Post-execution audit-tdd-commits.js surfaces commit-level TDD violations in SUMMARY.md. Test verification remains structurally enforced at GSD's per-wave test gate and Triple Threat's pre-ship verification gate. Use standalone to resume execution on an existing plan, or to re-run after editing the plan."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - Skill
---

# /build-exec — Wave execution with TDD intent preamble

Runs the actual implementation work. Delegates wave-based parallel execution to GSD's `gsd-execute-phase` (dependency analysis → wave grouping → parallel dispatch in isolated git worktrees with file-overlap conflict detection). Adds a TDD intent preamble to per-task subagent prompts as best-effort guidance — real structural test enforcement happens at the wave and ship boundaries, not the per-task boundary.

## Pre-flight

### Check 1: workspace and plan exist

Verify `.planning/` exists and a current PLAN.md is present (typically `.planning/<phase>/PLAN.md`). If missing, tell the user to run `/build-plan` first.

### Check 2: clean working tree

Verify the git working tree is clean (no uncommitted changes). If dirty, ask the user via AskUserQuestion whether to:
- "Stash and continue" → run `git stash push --include-untracked` (equivalently `git stash push -u`) first. Use the explicit `--include-untracked` flag because plain `git stash` only stashes tracked changes — an untracked-files-only dirty tree (the common case in inherited folders or after `cp` of templates) would otherwise pass through unstashed and the dirty-tree gate would still fail
- "Commit first" → exit and let the user commit
- "Cancel" → exit

### Check 3: PLAN.md TDD validation (DETERMINISTIC HARD GATE via Bash linter)

Before invoking `gsd-execute-phase`, run the v0.2.0 TDD linter via Bash. The linter is a deterministic Node script (`lint-plan-tdd.js`) that parses PLAN.md and validates the TDD schema. **Its exit code is the source of truth — not model judgment.** The model does not interpret plan content; the linter does.

#### Step 3.1: Resolve linter path

The linter ships with the bundle and may be installed in several locations. Try paths in this order via Bash, halt if none exist:

```bash
LINTER=""
for candidate in \
  ".claude/scripts/lint-plan-tdd.js" \
  ".opencode/scripts/lint-plan-tdd.js" \
  "$HOME/.claude/scripts/lint-plan-tdd.js" \
  "$HOME/.config/opencode/scripts/lint-plan-tdd.js"; do
  if [ -f "$candidate" ]; then
    LINTER="$candidate"
    break
  fi
done
```

If `$LINTER` is empty after the search, **HALT**. Do NOT silently skip the gate. Print:

```
BLOCKED: TDD linter not found at any expected path.
Searched:
  .claude/scripts/lint-plan-tdd.js (project-local Claude)
  .opencode/scripts/lint-plan-tdd.js (project-local OpenCode)
  ~/.claude/scripts/lint-plan-tdd.js (global Claude install)
  ~/.config/opencode/scripts/lint-plan-tdd.js (global OpenCode install)

Run /build-doctor to diagnose. v0.2.0+ requires the linter to execute.
```

#### Step 3.2: Run the linter

```bash
node "$LINTER" "<path-to-PLAN.md>"
LINT_EXIT=$?
```

#### Step 3.3: Route on exit code

- `0` → linter passed; the plan is TDD-compliant. Continue to Step 3.4.
- `1` → linter found schema violations. **STOP execution.** Print the linter's stdout verbatim (it contains a structured BLOCKED report with the failed tasks and the required schema). Then fire the override AskUserQuestion (Step 3.5) before any retry.
- `2` → parse error (PLAN.md missing or malformed). **STOP.** Surface stderr for user investigation. Do NOT proceed.
- `3` → ONLY possible if `--allow-override` was set. The override path means proceed but record the deviation in phase SUMMARY.md. Continue to Step 3.4 with override flag noted.

#### Step 3.4: Capture EXEC_START (for Layer 5 audit)

Before invoking `gsd-execute-phase`, capture the current commit SHA via Bash:

```bash
EXEC_START=$(git rev-parse HEAD)
```

This sha is consumed by the post-execution audit script (`audit-tdd-commits.js`) to bound the commit range it inspects. Without it, Layer 5 cannot run.

#### Step 3.5: Override path (linter exit 1 only — USER-ONLY)

If linter exit code was 1, fire AskUserQuestion. Show the linter's stdout (the BLOCKED report) above the question:

> "TDD linter blocked execution. The plan is implementation-first or missing required RED→GREEN structure. How do you want to proceed?"

Options:
- **"Re-plan (Recommended)"** → exit Check 3 cleanly, return to /build-plan
- **"Override and execute anyway (NOT recommended)"** → require user to type a brief justification (treat the user's typed reply as the override reason). Then re-invoke the linter:
  ```bash
  node "$LINTER" "<path-to-PLAN.md>" --allow-override "<user's typed reason>"
  ```
  Expected exit code: 3. Proceed to Step 3.4.
- **"Cancel"** → exit cleanly, no execution.

**HARD CONSTRAINT: The model is NOT permitted to invoke `--allow-override` on its own initiative.** That bypass requires explicit user selection of the override option above. A model invoking `--allow-override` without going through this AskUserQuestion is a contract violation that defeats the v0.2.0 enforcement.

If override is granted, write to phase SUMMARY.md upon phase completion:
```
## TDD enforcement override (Layer 4 bypass)

The TDD linter (lint-plan-tdd.js) found schema violations in this phase's
PLAN.md but the user explicitly approved override.

Reason given: <user's typed justification>
Override granted at: <timestamp>
Original linter findings: <linter stdout>
```

## TDD intent — best-effort prompt preamble

GSD's `gsd-execute-phase` spawns per-task subagents internally using its own dispatch mechanism. **Triple Threat does not own the per-task spawn boundary** — we cannot structurally inject prompts into GSD's subagent calls. The preamble below is best-effort guidance the orchestrator may pass through where possible:

```
## TDD discipline (from test-driven-development)

Before writing any production code for this task:

1. Write a failing test FIRST that captures the exact behavior you're about to implement.
2. RUN the test. Verify it fails for the right reason (a real assertion failure, not a syntax error or missing import).
3. Write the minimum code to make the test pass.
4. RUN the test again. Verify it passes.
5. Refactor for clarity. Run tests once more.

If you produce production code without first watching its test fail, you are violating the iron law and must delete the production code and start over.

## Verification gate (from verification-before-completion)

When you believe this task is complete, re-run the verifying command (the test or build that proves correctness) IN YOUR FINAL RESPONSE before claiming "done." Do not claim completion based on memory of a prior run — the output must appear fresh in this message.

You may read the full Superpowers skill files for detail:
- ~/.claude/skills/superpowers-test-driven-development/SKILL.md
- ~/.claude/skills/superpowers-verification-before-completion/SKILL.md
```

The preamble is intent directed at per-task subagents that receive it. Triple Threat cannot guarantee delivery — that depends on GSD's executor honoring the preamble during its internal dispatch.

## Architectural Reality (post-v0.2.0)

GSD owns the per-task spawn boundary. Triple Threat does not inject prompts directly into GSD's subagent calls. The TDD preamble is best-effort guidance, not structural enforcement of test-first behavior at the task body level.

**v0.2.0 added two new structural layers** that DO enforce TDD shape mechanically:

1. **Layer 4: Pre-execution linter (`lint-plan-tdd.js`)** — Bash-invoked Node script that parses PLAN.md and validates the TDD schema. Exit code 1 halts execution before `gsd-execute-phase` is invoked. Mechanical: the model does not interpret plan content; the linter does. See Check 3.

2. **Layer 5: Post-execution audit (`audit-tdd-commits.js`)** — Bash-invoked Node script that walks the commit range from `EXEC_START` to `HEAD` after `gsd-execute-phase` returns. Surfaces impl-without-test commits as warnings in phase SUMMARY.md. Informational, not blocking — Layer 4 was the hard gate.

Test verification is structurally enforced at FOUR boundaries (was 2 pre-v0.2.0):

1. **Pre-execution TDD linter** (Layer 4 / Check 3) — NEW in v0.2.0. Halts on syntactic TDD violations.
2. **GSD per-wave test gate** (parallel mode only): after each wave merges, GSD runs the detected project test command. Skipped with a warning if no runner is detected.
3. **Post-execution TDD commit audit** (Layer 5) — NEW in v0.2.0. Logs warnings, doesn't halt.
4. **Triple Threat pre-ship verification gate**: `/build-ship` runs `verification-before-completion` as a hard gate before GStack ship.

**What's structurally enforced (mechanical, exit-code-driven):**
- Layer 4 linter exit code → halt vs proceed. Cannot be argued past.
- Layer 5 audit findings → recorded in SUMMARY.md. Cannot be silently dropped.
- GSD test gate → real test runner exit code.
- Pre-ship verification → real test command output required.

**What's still NOT structurally enforced:**
- The model choosing to invoke the linter at all (build-exec prose-level instruction that the model must honor)
- The model choosing to honor exit code 1 vs ignore it (prose-level)
- The model resisting auto-override (prose-level constraint with contract framing)
- Per-task TDD shape inside `gsd-execute-phase` subagents (GSD owns that boundary)

Calibrated claim: "v0.2.0 mechanically refuses to execute plans that fail the TDD schema linter, on both Claude and OpenCode, regardless of which model wrote the plan." This is the strongest claim defensible. NOT: "TDD is structurally guaranteed" — the model still chooses what commands to run.

## Steps

### 1. Read the plan

Read the PLAN.md to understand what tasks exist and their dependencies.

### 2. Invoke gsd-execute-phase (GSD owns the wave loop)

Invoke the `gsd-execute-phase` skill via the Skill tool (bare name, no leading slash).

GSD's executor runs all waves internally — Triple Threat does NOT regain control between waves. After each wave merges, GSD itself runs:
- Project hook execution (when commits used `--no-verify`)
- Worktree cleanup
- Post-merge test gate (parallel mode only; skipped if no test runner is detected)

Triple Threat regains control only after `gsd-execute-phase` returns (entire phase complete).

### 3. Handle phase completion

When `gsd-execute-phase` returns:
- If GSD reports successful completion → continue to step 4
- If GSD reports a wave failure (test gate, hook check, or task failure) → do NOT auto-retry. Surface what failed, what was committed, and offer:
  - "Investigate the failure" → invoke `/gsd-debug` or `systematic-debugging`
  - "Re-run the failed wave" → re-invoke `/gsd-execute-phase` with `--wave N` flag
  - "Cancel and resume later" → exit; state is preserved

### 4. Layer 5 audit (post-execution commit walk)

After `gsd-execute-phase` returns successfully, run the commit audit using the `EXEC_START` SHA captured in Step 3.4.

Resolve the audit script path the same way as the linter (Step 3.1), substituting `audit-tdd-commits.js`:

```bash
AUDIT=""
for candidate in \
  ".claude/scripts/audit-tdd-commits.js" \
  ".opencode/scripts/audit-tdd-commits.js" \
  "$HOME/.claude/scripts/audit-tdd-commits.js" \
  "$HOME/.config/opencode/scripts/audit-tdd-commits.js"; do
  if [ -f "$candidate" ]; then
    AUDIT="$candidate"
    break
  fi
done
```

If `$AUDIT` resolves AND `$EXEC_START` is non-empty, run the audit:

```bash
node "$AUDIT" --since "$EXEC_START" --until HEAD
AUDIT_EXIT=$?
```

Route on exit code:
- `0` → no impl-without-test commits detected. Audit passed.
- `1` → warnings present. Append the audit's stdout to phase SUMMARY.md as a "Layer 5 audit" section. Do NOT halt — Layer 5 is informational.
- `2` → audit script error (invalid range, git failure). Log but proceed.

If `$EXEC_START` is empty (e.g., resumed exec where Check 3.4 didn't run), or `$AUDIT` cannot be resolved, skip Layer 5 and note in SUMMARY.md: "Layer 5 audit skipped: <reason>."

### 5. Final verification

After `gsd-execute-phase` returns AND Layer 5 audit completes, the test suite is in whatever state GSD's per-wave gates produced (passed, skipped due to no runner, or skipped due to interactive mode). Confirm by reviewing the most recent test command output. If unclear, run the project's test command yourself.

The pre-ship verification gate in `/build-ship` provides the final structural check before PR automation.

## What this skill does NOT do

- Does not modify the plan — if the plan needs changes, exit and let the user re-run `/build-plan`.
- Does not run code review — that's `/build-review`.
- Does not push or open PRs — that's `/build-ship`.
- Does not structurally enforce per-task TDD discipline — that boundary is owned by GSD's executor. The TDD preamble is best-effort intent; structural test verification is delegated to GSD's per-wave gate and Triple Threat's pre-ship gate.
