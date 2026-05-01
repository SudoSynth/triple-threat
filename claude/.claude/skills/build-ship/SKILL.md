---
name: build-ship
description: "Ship phase of the build pipeline. Validates branch + remote state, then routes: GStack /ship for feature-branch + remote (push/PR flow), local ship-prep for no-remote repos (VERSION bump + CHANGELOG + commit, no push), refusal on default-branch + remote. Use standalone when you've written code by hand and want all the ship-prep automation."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
---

# /build-ship — Ship-prep + PR creation

Wraps GStack's `/ship` with pre-flight sanity checks specific to the Triple Threat pipeline.

## Pre-flight checks

### Check 1: clean working tree

Run `git status --porcelain`. If output is non-empty (uncommitted changes), ask the user via AskUserQuestion:
- "Commit the changes" → exit and let user commit
- "Stash and continue" → run `git stash`
- "Cancel" → exit

### Check 2: branch + remote sanity (4-case matrix)

Run `git rev-parse --abbrev-ref HEAD` to get the current branch.
Run `git remote -v` to detect whether a remote is configured.

Map the result:

**Case A — Feature branch + remote configured (the standard team flow):**
Continue to checks 3-5, then run GStack `/ship` normally (existing behavior).

**Case B — Feature branch + no remote configured (local-only personal repo):**
Continue to checks 3-5, then run **Local ship-prep mode** (see section below) instead of GStack `/ship`. GStack `/ship` assumes push/PR; without a remote it would fail at the push step.

**Case C — Default branch (`main`, `master`, `develop`) + remote configured:**
Refuse. Print exactly:

```
BLOCKED: Refusing to ship from default branch '<branch>' on a remote-backed repo.

Real-team workflow expects feature branches to land via PR. Shipping
directly from a default branch usually means one of two anti-patterns:
- Trying to PR <branch> against itself (nonsensical)
- Direct commits on a protected branch (violates branch protection)

Next: create a feature branch and re-run /build-ship.
  git checkout -b feature/<descriptive-name>
```

**Case D — Default branch + no remote configured (personal local-only repo):**
Use AskUserQuestion to offer:
- **"Local ship-prep only (Recommended for personal repos)"** — bump VERSION, generate CHANGELOG, commit on current branch. No push, no PR.
- **"Create feature branch retroactively"** — move recent feature commits onto a new branch and run ship-prep from there.
- **"Skip ship entirely"** — feature is committed and tested; stop here without ceremony.
- **"Cancel"** — exit without doing anything.

If user picks "Local ship-prep only" or "Create feature branch retroactively," continue to checks 3-5, then run **Local ship-prep mode**.

Treat this as a refusal to proceed unless the user explicitly overrides via the menu.

### Check 3: review was run

Look for evidence that `/build-review` was completed for this branch. Check `.planning/<phase>/REVIEW.md` or recent commits with messages mentioning "review" or "fix from review".

If no evidence:
- Use AskUserQuestion: "No code review found for this branch. Run /build-review first?"
- "Yes, run review" → invoke the `build-review` skill via the Skill tool, then continue
- "No, ship anyway" → proceed but warn this is unusual

### Check 4: QA was run (if UI present)

If `.planning/codebase/STACK.md` indicates UI but no QA report exists, ask similar to check 3 about running `/build-qa` first.

### Check 5: Verification gate (Superpowers)

Before invoking GStack `ship`, invoke the `verification-before-completion` skill via the Skill tool. This is a **HARD GATE**.

Do NOT proceed to `ship` unless one of the following is true:
- The verification skill confirms tests passed in the current context (re-run, not remembered from earlier)
- The user explicitly overrides (e.g., "ship anyway", "skip verification")

If verification has not been run yet in this session, run it now. Do not rely on memory of an earlier verification — the skill must produce fresh evidence in the current message before ship can proceed.

## Local ship-prep mode (cases B + D)

For cases B and D (no remote configured, or personal local-only repo). Skip GStack `/ship` entirely (it assumes push/PR). Run these steps inline:

1. **Bump VERSION:**
   - Read current `VERSION` file. If absent, create with `0.1.0`.
   - Determine bump level from PLAN.md scope + commits since last bump:
     - Breaking change → major (1.0.0 → 2.0.0)
     - New feature (`feat:`) → minor (0.1.0 → 0.2.0)
     - Fix only (`fix:`, `docs:`, `chore:`) → patch (0.1.0 → 0.1.1)
     - When uncertain, prefer minor for feature work, patch for non-feature.
   - Write new VERSION.

2. **Generate CHANGELOG.md entry:**
   - If `CHANGELOG.md` doesn't exist, create with `# Changelog` header and Keep-a-Changelog format note.
   - Prepend a new entry. For local-prep, the entry is marked `[Unreleased]` (no actual release happened):
     ```
     ## [Unreleased] - <YYYY-MM-DD>

     ### Added / Changed / Fixed
     - <one-line summary per relevant commit since last bump>
     ```
   - Group commits by conventional-commit prefix (`feat:` → Added, `fix:` → Fixed, `chore:`/`docs:` → Changed).

3. **Commit ship-prep changes:**
   - `git add VERSION CHANGELOG.md`
   - `git commit -m "chore(release): local ship-prep for <feature-name> (Unreleased)"`

4. **Optional: tag the commit** with a local-only tag like `v<version>-local` so the user can find this point later. Skip if user prefers no tagging.

5. **Report:**
   ```
   ✓ Local ship-prep complete
     Branch:        <branch>
     Version:       <old> → <new>  (CHANGELOG marked [Unreleased] — no actual release)
     CHANGELOG.md:  updated
     Push:          skipped (no remote)
     PR:            skipped (no remote)
   ```

Do NOT attempt `git push` or PR creation in local ship-prep mode. The work lives in local git only — that's the explicit user choice for personal repos.

## Run GStack /ship (case A only)

After pre-flight passes for case A, invoke the `ship` skill via the Skill tool (bare name, no leading slash; this is GStack's `ship`). GStack `ship` will:
- Detect and merge the base branch into your feature branch
- Run the full test suite
- Audit test coverage — auto-generate tests for any gaps
- Audit plan completion — cross-reference the diff against PLAN.md to catch scope creep
- Triage in-branch failures vs pre-existing failures
- Bump `VERSION` file
- Generate `CHANGELOG` entry
- Mark relevant TODOs as resolved
- Push the branch
- Open a GitHub PR with the Review Readiness Dashboard

## Post-ship

Capture the PR URL from `/ship`'s output. Report:
```
✓ Shipped <feature-name>
  PR: <URL>
  Version: <new-version>
  Commits in branch: <count>
```

## Failure handling

If `/ship` fails on test suite:
- Surface the failures
- Do NOT auto-revert
- Suggest the user fix tests, commit, then re-run `/build-ship`

If `/ship` fails on coverage audit (gaps it cannot auto-fill):
- Surface the gaps
- Suggest the user write the missing tests manually, commit, then re-run `/build-ship`

If `/ship` reports plan-completion mismatch (scope creep):
- Surface the mismatch
- Use AskUserQuestion: "Diff includes work not in the original plan. Update plan to reflect actual scope, or revert extra work?"

## What this skill does NOT do

- Does not deploy — that's GStack `/land-and-deploy` (call directly when ready).
- Does not run post-deploy canary checks — that's GStack `/canary` (call directly).
- Does not write release docs — that's GStack `/document-release` (call directly).
