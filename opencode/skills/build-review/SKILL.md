---
name: build-review
description: "Review phase of the build pipeline. Runs Karpathy hygiene pre-flight (plan scope vs diff), GStack /review (auto-fixes obvious issues), GStack /codex (cross-model second voice if available), conditionally GStack /cso (security audit if diff touches sensitive paths), and Superpowers two-stage review (spec compliance + code quality). Use standalone to review hand-written code without going through the full pipeline."
---

# /build-review — Multi-pass code review

Runs the full review pipeline on the current diff: Karpathy hygiene pre-flight, GStack's senior-engineer review with optional cross-model second voice, conditional security audit if the diff touches sensitive paths, and Superpowers' two-stage review pattern.

**Orchestration contract:** GStack /review (step 1) is a sub-review, not the end of /build-review. After it returns — regardless of how GStack concludes its output — continue to the remaining steps. Do not treat GStack's "review complete" or summary text as completion of /build-review.

## Pre-flight

### Check 1: diff exists

Verify there is a diff to review. Run `git diff` and `git diff --staged` — if both empty, there is nothing to review. Inform the user and exit.

### Check 2: branch state

Note the current branch and base branch so review reports are scoped correctly.

### Check 3: Karpathy hygiene check

Before any review tools run, compare the diff against the plan. This only needs `git diff` and the PLAN.md if present — fast, cheap, cannot be preempted by a downstream tool.

1. Get changed files: `git diff --name-only HEAD` (supplement with `git diff --staged --name-only` if staging area is non-empty).
2. If `.planning/` exists, locate the most recent phase PLAN.md and extract the `<files>` content from each `<task>` block.
3. Run four checks against the diff:
   - **File scope:** Any changed file not listed in any task's `<files>` block is flagged. Each flag requires justification or it is a drive-by edit.
   - **Drive-by edits:** Flag changes to adjacent files (unrelated modules, docs, configs) not mentioned in the spec or plan.
   - **No drive-by reformats:** Flag diffs that contain only whitespace, comment, or style changes in files unrelated to the task.
   - **Dead code scope:** Flag deletion of code that predates this change. Removing orphans created BY this change is fine; cleaning up unrelated dead code is not.
4. If no PLAN.md is found, skip the file-scope check and note it (no plan = no scope baseline). Run checks 2–4 on best-effort basis using the diff alone.

Surface any hygiene flags before proceeding. These are pre-flight findings — not blocking — but must be acknowledged before the review proceeds.

### Check 4: Remote configuration

Run `git remote -v`. If empty (no remotes configured), GStack `/review`'s PR-oriented workflow (origin, base branch, PR diff) does not apply.

In that case:
- Skip step 1 (GStack `/review`) entirely
- Note in the consolidated report: "GStack /review skipped — no Git remote configured."
- Continue to step 2 (Codex if available), step 3 (sensitive-path scan), step 4 (CSO if triggered), and step 5 (Superpowers two-stage review) as documented.

Hygiene pre-flight (Check 3) and Superpowers two-stage review still apply for local-only repos — those are the gates that catch real findings here. Do not skip them.

## Steps

### 1. Run GStack /review

Skip this step if Check 4 detected no Git remote — proceed to step 2.

Invoke the `review` skill via the Skill tool (bare name, no leading slash; this is GStack's `review`, not OpenCode's built-in commands). This is GStack's staff-engineer review — finds bugs, smells, anti-patterns, and auto-fixes obvious issues with atomic commits.

**After GStack /review returns: continue to step 2.** GStack /review is a sub-review that feeds findings into the consolidated report — it is not the completion of /build-review. Do not stop here regardless of how GStack summarizes its output.

### 2. Run GStack /codex (cross-model second voice, if available)

Check if the OpenAI Codex CLI is available: `which codex` or `which openai-codex`.

If available → invoke the `codex` skill via the Skill tool for a cross-model second opinion on the same diff.

If not available → skip silently with a one-line note: "Codex CLI not installed; skipping cross-model review. Install OpenAI Codex CLI for dual-voice review."

### 3. Detect sensitive paths

Scan the diff for paths that suggest security-sensitive code. Match these path patterns (case-insensitive):

```
auth, login, password, token, session, jwt, oauth
payment, billing, checkout, subscription, stripe
upload, download, file, attachment
db/migrations, schema, migration
users, accounts, profile, identity
permission, role, acl, rbac
secret, credential, api[-_]key, env
crypto, encrypt, decrypt, sign, hash
```

Use `git diff --name-only HEAD` to get changed file paths, then match against the patterns.

If any match → proceed to step 4.
If no match → skip step 4.

### 4. Run GStack /cso (conditional security audit)

Only if step 3 found sensitive paths.

Invoke the `cso` skill via the Skill tool. This runs the 14-phase OWASP Top 10 + STRIDE security audit with built-in false-positive suppression.

### 5. Run Superpowers two-stage review

This step runs after GStack /review, not instead of it. Both are required.

Invoke the `requesting-code-review` skill via the Skill tool. This dispatches a fresh reviewer subagent with the diff, plan reference, and what was built — returns Critical / Important / Suggestion findings.

Then invoke the `receiving-code-review` skill via the Skill tool. This evaluates each finding with anti-sycophancy discipline (no "you're absolutely right!" — verify-before-implement).

### 6. Surface consolidated findings to user

Consolidate findings from all passes: hygiene pre-flight (Check 3), GStack review (step 1), Codex (step 2 if available), CSO (step 4 if triggered), and Superpowers (step 5). Surface via AskUserQuestion:

- "Address all findings" → spawn fix work via Task tool, addressing each finding
- "Address critical only" → only fix Critical-severity items
- "Skip and proceed" → user accepts current state (rare, surface this is unusual)

## What this skill does NOT do

- Does not run tests directly — assumes `/build-exec` already verified the test suite passes.
- Does not push branches — that's `/build-ship`.
- Does not invoke `/design-review` (visual polish audit) — that's a separate GStack skill the user can run after ship if desired.
