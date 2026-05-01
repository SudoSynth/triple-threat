# Changelog

All notable changes to the Triple Threat — OpenCode bundle.

Format follows [Keep a Changelog](https://keepachangelog.com/). This bundle uses [Semantic Versioning](https://semver.org/).

## [0.3.1] - 2026-04-29

### Added (open-source readiness — portable installer)

- **`install.sh`** — symlink-based installer for the OpenCode bundle. Handles both skills (`~/.config/opencode/skills/<skill>`) and command wrappers (`~/.config/opencode/commands/<skill>.md`). End users now get the v0.2.4 symlink architecture out of the box instead of the v0.2.3 multi-copy state. Bundle root auto-resolves from script location, so it works regardless of where you unzip. Idempotent — re-running on an already-installed system is a no-op + report.
- **`uninstall.sh`** — safe removal that only deletes symlinks pointing into the unzipped bundle root. Leaves alone any symlinks pointing elsewhere (Superpowers, GStack, another Triple Threat version). Prints backup locations for manual restore.
- **Pre-install backups** at `~/.config/opencode/.tt-install-backup-YYYY-MM-DD-HHMMSS/{skills,commands}/` — outside discovery paths so the runtime doesn't list them as duplicates.

### Changed

- **README install instructions updated.** Global install now uses `bash install.sh` instead of `mkdir + cp + cp -r`. Project-local install (copy `.opencode/` into a project) still works as before.

### Why

v0.2.4 fixed the deploy-drift class on the maintainer's machine but did not transfer the fix to end users — anyone running the old `cp` recipe got copied files and inherited the drift class. v0.3.1 closes that gap with a portable symlink installer that survives upgrades automatically.

### Honest framing

This is open-source-readiness infrastructure. Pipeline behavior is unchanged. v0.3.1 is the smallest patch needed to make Triple Threat installable by someone other than the maintainer.

Project-local installs are NOT handled by `install.sh` (they're copies, not symlinks). The README documents the manual `cp -r .opencode/` path. A `--project-local` flag is deferred until someone explicitly asks for it.

### Testing

- Idempotency check on the maintainer's already-symlinked machine: 23/23 (12 skills + 11 wrappers) detected as already correct, all skipped, 0 errors.
- Fresh `HOME=/tmp/tt-install-home` install: 23 symlinks created, all resolve, 0 errors.
- Fresh-HOME uninstall: 23 symlinks removed, 0 left-alone, 0 errors. Both discovery paths empty after uninstall.

## [0.3.0] - 2026-04-29

### Added (adaptive assurance — Fast / Standard / Full modes)

- **Tier classification in `/build-feature`**. After pre-flight and bug-fix routing, classifies the request into Fast (small precise tasks), Standard (today's pipeline), or Full (risky/demanding work). Heuristic-based with explicit rules:
  - ≥2 Full signals → Full
  - 0 Full + ≥3 Fast signals + precise spec → Fast
  - Else → Standard (default)
- **Fast Mode flow** — confirm scope in prose (no AskUserQuestion unless ambiguous), TDD discipline, **Superpowers two-stage review (non-negotiable)**, commit if appropriate, optional local ship-prep. Skips: `/build-spec`, `/build-plan`, GStack `/review`/`/codex`/`/cso`, `/build-qa`, push/PR. Does NOT skip the failing-test-first rule or the review pass.
- **AskUserQuestion only when ambiguous.** If heuristics clearly point to Fast or Full, route silently with a one-line note. The classifier does not add an approval gate to obvious one-offs.
- Updated `description:` frontmatter to reflect adaptive-assurance positioning.
- Updated "Approval gates" section to enumerate which gates apply per tier (Fast Mode aims for zero or one gate; Standard aims for one).

### Unchanged

- Standard Mode behavior is identical to v0.2.4. Stages 1–6 (SPEC, PLAN, EXEC, REVIEW, QA, SHIP) work exactly as before. Existing `/build-feature` users on standard-shape work see no behavioral change.
- Full Mode is currently equivalent to Standard. The intended additional gates (`/cso` for security, `/design-review` for UI, mandatory codebase mapping, stricter ambiguity gate) are documented but deferred to v0.3.1+ pending validation against a real demanding workload.

### Why

Triple Threat felt heavy on simple one-off tasks during real usage. The full pipeline made sense for the work that motivated its design (medium-to-complex features in real codebases) but punished simple changes (single function, precise spec). Test-repo evidence (palindrome e2e tests in v0.2.0–v0.2.4) and real-world usage both confirmed the pipeline drag.

The locked rule held: **prose-only inside `build-feature/SKILL.md`, no new `build-fast` skill.** Promote to a first-class skill only after repeated real usage proves direct invocation is needed.

### Honest framing

Both Fast Mode and the classifier are prose-level — read by the model and applied at runtime, not deterministic gates. The non-negotiable line ("Fast Mode REQUIRES Superpowers two-stage review on the resulting diff") relies on the model honoring it. Same enforcement strength as the v0.2.2 orchestration contract for `build-review`. The first real Fast Mode runs will tell us whether the prose holds under load.

Full Mode is partially aspirational — its current implementation is "same as Standard." Calling it Full Mode in v0.3.0 documents the intent without claiming the gates are wired up. v0.3.1 ships the actual additional gates after a real workload validates the composition.

## [0.2.4] - 2026-04-29

### Changed (maintenance — structural fix for deploy drift)

- **Skill source consolidated.** `~/.config/opencode/skills/<build-* | triple-threat>` and `~/.config/opencode/commands/build-*.md` are now absolute symlinks into the unpacked OpenCode bundle (`Triple Threat - OpenCode/skills/` and `Triple Threat - OpenCode/commands/`). The bundle's top-level directories are the canonical source; the global install tracks them. This eliminates the multi-copy deploy pattern that produced wrapper-text drift across 9 of 11 `/build-*` command wrappers (surfaced in the v0.2.4 audit, fixed alongside this release).
- **Distributed zips remain real files.** Zip portability preserved — the symlink approach is local-dev-only. End users unzipping the bundle receive real files, never absolute paths into someone else's filesystem. The bundle's internal `.opencode/skills/` and `.opencode/commands/` directories (which support project-local installs) remain as real files, kept in sync with the top-level `skills/` and `commands/` via `scripts/sync-bundle.sh` (see below).

### Added

- **`scripts/sync-bundle.sh`** — keeps the OpenCode bundle's two internal copies (top-level `skills/`, `commands/` ↔ `.opencode/skills/`, `.opencode/commands/`) in sync. Scoped to a known explicit list of Triple Threat skills and wrappers — never blindly recurses or deletes. Two modes:
  - `bash scripts/sync-bundle.sh` — propagates top-level → `.opencode/`
  - `bash scripts/sync-bundle.sh --check` — read-only, exits 1 if drift detected
  Run before each zip rebuild to keep both install methods (project-local via `.opencode/`, global via top-level) consistent.
- **`/build-doctor` Step 4.5: Triple Threat symlink integrity** (read-only probe). Walks `~/.config/opencode/skills/` and `~/.config/opencode/commands/` for broken symlinks. Classifies findings: ❌ Triple Threat install regression or ℹ external framework noise (GStack, Superpowers, etc.). External broken symlinks reported for awareness only — they do NOT mark the TT install as failing.

### Notes

- 12 Triple Threat skills affected: 11 `/build-*` skills plus the `triple-threat` reference skill.
- 11 `/build-*` command wrappers also symlinked (build-debug through build-spec).
- Local install backups (`*.backup-v024`) live at `~/.config/opencode/.tt-v024-backup/` outside the skill discovery paths so the runtime doesn't list them as duplicate skills.

### Honest framing

Structural fix for a process-failure class (deploy drift), not a behavioral change. No skill prose changed in this release except for the new `/build-doctor` probe. The wrapper drift surfaced during the v0.2.4 audit was the second drift bug we've seen this week (v0.2.3 was the Claude-bundle-stale bug). Both were caused by the same root cause — manual multi-location deploy. Symlinks eliminate this class of bug at the structural level.

## [0.2.3] - 2026-04-29

### Added

- **`build-plan` skill** — Codified explicit "When to skip /autoplan" criteria. Skip `/autoplan` only if all three are true: spec defines explicit signatures and file paths, phase has ≤3 tasks, no taste decisions remain. When skipping, the plan output must include `"Skipped /autoplan — spec was trivial/precise"`. When in doubt, run `/autoplan`.
- **`build-review` skill** — Added explicit no-remote fallback (`Check 4: Remote configuration`). When `git remote -v` returns empty, GStack `/review`'s PR-oriented workflow is skipped and the consolidated report records the skip. Hygiene pre-flight (Check 3) and Superpowers two-stage review continue to run for local-only repos. Step 1 prose updated with explicit skip-when-no-remote check.

### Why

Two findings from end-to-end smoke tests on `/tmp/tt-e2e-claude` and `/tmp/tt-e2e-opencode` (palindrome module pipeline test, both bundles at v0.2.2):

1. Claude correctly judged to skip `/autoplan` for a trivial precise spec, but the skip criteria weren't documented — model improvisation, not codified behavior. Codifying makes the behavior consistent across model versions and sessions.
2. Claude correctly noticed GStack `/review` doesn't apply to no-remote repos and improvised an inline manual review. OpenCode just barreled through. Both improvisations worked but neither was documented. Codifying the skip means both installs behave consistently.

### Honest framing

Both polish items remain prose-level — read by the model and applied at runtime, not deterministic gates. v0.2.4 (planned) will tackle structural skill-source consolidation to reduce per-skill deploy surface from 4–6 locations to 2.

## [0.2.2] - 2026-04-29

### Changed

- **`build-review` skill** — Restructured pre-flight and orchestration to fix a composition defect where GStack /review self-concluded and preempted all subsequent steps (Superpowers review and the v0.2.1 hygiene check both dead prose in practice).
  - Added **Check 3: Karpathy hygiene check** to pre-flight, before GStack runs. Compares `git diff --name-only` against the plan's `<files>` blocks. Four checks: file scope (flag files outside plan), drive-by edits (adjacent files not in spec), drive-by reformats (whitespace/style-only changes to unrelated files), dead code scope (only orphans from this change may be removed). Gracefully degrades when no PLAN.md exists.
  - Added **orchestration contract** at the top of the skill: "GStack /review is a sub-review, not the end of /build-review. After it returns — regardless of how GStack concludes its output — continue to the remaining steps."
  - Added explicit continuation note after step 1: "After GStack /review returns: continue to step 2."
  - Added explicit note before step 5 (Superpowers): "This step runs after GStack /review, not instead of it. Both are required."
  - Step 6 (surface findings) now explicitly consolidates from all passes: hygiene pre-flight, GStack, Codex, CSO, Superpowers.
  - Updated `description:` frontmatter to reflect the hygiene pre-flight addition.

### Why

v0.2.1 placed the Karpathy hygiene check as step 6, after GStack /review. Smoke test on 2026-04-29 revealed that GStack's review skill is a complete self-concluding workflow — it surfaces its own AskUserQuestion and summary, giving the model a natural "done" signal that preempts steps 2–7. The hygiene check never fired as a discrete step. Superpowers two-stage review also never ran. The pre-flight placement fixes this structurally: the hygiene check now runs before GStack is invoked, so it cannot be preempted by GStack's conclusion.

### Honest framing

Moving hygiene to pre-flight makes it harder to skip — it runs before any downstream skill can conclude the session. But it is still prose-level: the model must honor the "continue after GStack" contract. The orchestration notes added to step 1 and step 5 make this contract explicit rather than implied, which raises compliance probability. Not deterministic.

### What the smoke test also found

- GStack DID flag README.md independently through adversarial review (wrong content reason, not wrong-file-scope reason). Defense in depth: different question, same answer.
- Review fixes landed in working tree, not staged — GStack noted this correctly at the end of its run.

### Preserved invariants from v0.2.1

- Simplicity check in `build-plan` — unchanged
- Builder hygiene preamble in `AGENTS.md` template — unchanged
- All v0.2.0 TDD linter machinery — unchanged

## [0.2.1] - 2026-04-29

### Changed

- **`build-plan` skill** — Added "Simplicity check" section. Before approving a plan, apply a five-point test: every task must trace to a spec requirement, no speculative features, no single-use abstractions, no unrequested configurability, no excess scope. Pushes back and simplifies if any check fails.
- **`build-review` skill** — Added "Karpathy hygiene check" as step 6 (surface findings shifted to step 7). Four checks run against the diff: surgical changes (every changed line traces to the request or plan), file scope (files outside the plan's `<files>` blocks are flagged), no drive-by edits (no unrelated refactor/reformat), dead code scope (only orphans created BY this change may be removed).
- **`AGENTS.md` template** — Added "Builder hygiene" to Operating Principles. Six bullets: smallest correct change, no speculative features/abstractions/configurability, touch only needed files, no unrelated refactors, ask when ambiguity affects architecture or irreversible work, verify before claiming done.

### Why

Karpathy's four principles (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) map onto Triple Threat's machinery. Goal-Driven Execution is already mechanically enforced by the TDD linter and verification gates. Think Before Coding is already covered by build-spec and gsd-discuss-phase. The two gaps — Simplicity First and Surgical Changes — are now closed at their highest-value insertion points: plan-time (simplicity gate) and review-time (hygiene rubric). Templates add a thin behavioral preamble without adding process overhead.

### Honest framing

Prose-level additions, not deterministic gates. The simplicity check depends on the model honoring the rubric at plan-approval time. The hygiene check depends on the model running it as part of review. Both are checkable against concrete artifacts (plan task list and diff), making rationalization harder than vague TDD prose — but neither is mechanically enforced the way the v0.2.0 linter is.

### What was NOT changed

- No new skill, no new script, no new pipeline stage.
- Think Before Coding and Goal-Driven Execution deliberately not added — already covered mechanically.

### Preserved invariants from v0.2.0

- Deterministic TDD linter (`lint-plan-tdd.js`) + Layer 5 audit (`audit-tdd-commits.js`)
- `build-exec` Check 3 linter invocation + exit code routing
- Override path requires explicit AskUserQuestion; model auto-override forbidden
- v0.1.4 `__pycache__/` + `*.pyc` defaults, explicit `AGENTS.md` commit, `git stash -u`
- v0.1.3 visibility + consent gate
- v0.1.2 Git pre-flight HARD GATE + 4-case ship matrix

## [0.2.0] - 2026-04-28

### Major: Deterministic TDD enforcement (Layers 4 + 5)

The first structural fix to the TDD problem that v0.1.1 prose-level enforcement could not solve. Two new Bash-invoked Node scripts ship with the bundle and are wired into `build-exec` as mechanical exit-code gates. The model does not interpret plan content; the linter does.

### Added

- **`scripts/lint-plan-tdd.js`** — Pure Node (no deps), ~290 lines. Parses GSD-format PLAN.md and validates the TDD schema for production-code-touching tasks. Returns deterministic exit codes (0=pass, 1=violation, 2=parse error, 3=override granted).
  - Detects production code via path patterns: `src/`, `lib/`, `app/`, `pkg/`, `internal/`, `cmd/`, `components/` directories AND root-level files by language extension (`*.py`, `*.js`, `*.ts`, `*.go`, `*.rb`, `*.rs`, `*.java`, `*.kt`, `*.swift`, `*.cs`)
  - Excludes test files by pattern (`tests/`, `*.test.js`, `*_test.go`, `test_*.py`, `__tests__/`, etc.)
  - Excludes docs/configs (`*.md`, `*.json`, `*.toml`, `*.yaml`, `docs/`, etc.)
  - Custom layouts override via `.planning/lint-config.json`
  - Schema requirements: `tdd="true"` attribute, `<red>` block before `<green>` block, failure-keywords in red, pass-keywords in green
  - File-order in `<files>` is a WARNING only (per design amendment), not a blocker
  - 19 test cases via `node --test` cover all paths including the real Phase 3 titlecase plan that broke v0.1.1 (regression test)
- **`scripts/audit-tdd-commits.js`** — Layer 5 post-execution audit. Walks commit range `--since <sha> --until HEAD`, surfaces impl-without-test commits as warnings. 11 test cases via `node --test`.
- **`scripts/fixtures/`** — 15 fixture PLAN.md files including real plans from yesterday's testing (Phase 2 lowercase, Phase 3 titlecase) used as load-bearing regression fixtures.
- **`build-plan` skill** — New "Required v0.2.0 schema" section documents the XML-in-markdown schema the linter validates. Code-changing tasks must use `<task tdd="true">` with `<red>`, `<green>`, `<commit>` sub-blocks.
- **`build-exec` skill** — Check 3 replaced with deterministic Bash linter invocation:
  - Step 3.1: Path resolver tries 4 candidate locations (project-local + global, both hosts), halts on missing
  - Step 3.2: `node "$LINTER" <PLAN.md>; LINT_EXIT=$?`
  - Step 3.3: Routes on exit code (0/1/2/3)
  - Step 3.4: Captures `EXEC_START=$(git rev-parse HEAD)` for Layer 5 audit
  - Step 3.5: Override path requires explicit AskUserQuestion; model auto-override is a contract violation
- **`build-exec` skill** — New step 4 (Layer 5 audit) runs `audit-tdd-commits.js --since "$EXEC_START" --until HEAD` after `gsd-execute-phase` returns. Findings recorded in phase SUMMARY.md.
- **`build-exec` skill** — Architectural Reality section updated to reflect FOUR structural test-verification boundaries (was 2): Layer 4 linter, GSD per-wave gate, Layer 5 audit, pre-ship verification gate.

### Why

v0.1.1's prompt-level TDD enforcement was empirically broken on Claude inline-write. The actual Phase 3 titlecase plan from 2026-04-27 testing used the impl-first failure pattern that v0.1.1 was designed to catch — and v0.1.1 let it through. v0.2.0 takes the enforcement out of model judgment entirely:

1. The linter is a real Node script with deterministic exit codes
2. `build-exec` invokes it via Bash and reads `$?` mechanically
3. Exit code 1 halts before `gsd-execute-phase` is invoked — code never gets touched
4. Override requires explicit user AskUserQuestion approval; model self-override is forbidden
5. Post-execution audit catches the case where the plan was TDD-shaped on paper but the executor ignored it

### Honest framing

**v0.2.0 mechanically refuses to execute plans that fail the TDD schema linter, on both Claude and OpenCode, regardless of which model wrote the plan.** This is the strongest claim defensible.

**v0.2.0 does NOT guarantee TDD.** The model still chooses what commands to run. Specifically:
- The model must invoke the linter (build-exec prose-level instruction)
- The model must honor exit code 1 (prose-level)
- The model must resist auto-override (prose-level constraint with contract framing)

Estimated catch rate against v0.1.1's empirical failure mode: ~80-85% on Claude (where inline plan writing creates the most risk), ~90% on OpenCode (where gsd-planner subagent is dispatched more reliably). v0.1.1's catch rate was effectively 0% on the same scenarios.

### Empirical regression evidence

The linter was tested against the actual PLAN.md files from yesterday's v0.1.1 failure scenarios:

| Real plan | v0.1.1 result | v0.2.0 linter exit |
|---|---|---|
| Phase 1 reverse | Shipped impl-first | 1 (caught) |
| Phase 2 lowercase | Shipped impl-first | 1 (caught) |
| Phase 3 titlecase | Shipped impl-first | 1 (caught) |

Three for three. Every plan v0.1.1 let through is now mechanically detected by v0.2.0.

### Required for v0.2.0

`/build-doctor` should be extended in a future release to verify `lint-plan-tdd.js` and `audit-tdd-commits.js` exist at expected install paths. For now, `build-exec` Step 3.1's path resolver halts with an explicit "TDD linter not found" message if the scripts are missing, so the failure mode is loud rather than silent.

### Bundle layout changes

Both bundles now include a `scripts/` directory:

- `Triple Threat - Claude/scripts/{lint-plan-tdd.js, audit-tdd-commits.js, *.test.js, fixtures/}`
- `Triple Threat - OpenCode/scripts/{lint-plan-tdd.js, audit-tdd-commits.js, *.test.js, fixtures/}`
- `Triple Threat - OpenCode/.opencode/scripts/{lint-plan-tdd.js, audit-tdd-commits.js}` (project-local mirror)

Personal install adds:
- `~/.claude/scripts/{lint-plan-tdd.js, audit-tdd-commits.js}`
- `~/.config/opencode/scripts/{lint-plan-tdd.js, audit-tdd-commits.js}`

### Preserved invariants from v0.1.4

These behaviors are explicitly unchanged in v0.2.0:

- v0.1.4 `__pycache__/` + `*.pyc` in default `.gitignore` set
- v0.1.4 explicit AGENTS/CLAUDE commit decoupled from gsd-sdk
- v0.1.4 `git stash --include-untracked` explicit in build-exec Check 2
- v0.1.3 visibility + consent gate (Check 0.4) — `git add -A` only after explicit user consent
- v0.1.2 Git pre-flight HARD GATE (Checks 0.1-0.5)
- v0.1.2 ship matrix 4-case routing
- `.planning/` is NOT in `.gitignore`

## [0.1.4] - 2026-04-28

### Changed

- **`build-feature` Check 0.3 and `build-init` Step 0.3** — Added `__pycache__/` and `*.pyc` to the default safe `.gitignore` set. Prevents Python projects from showing `__pycache__/` as untracked after the first test run, which previously triggered ad-hoc handling (sometimes proactive `.gitignore` append, sometimes manual delete). Default set is now 9 entries.
- **`build-feature` Check 2 and `build-init` Step 2** — When deploying the `AGENTS.md` onboarding template (newly initialized projects only), the skill now commits the template explicitly with `git add AGENTS.md && git commit -m "docs: deploy Triple Threat onboarding (AGENTS.md)"`. Decouples the onboarding deploy from `gsd-sdk query commit`, which has been observed to silently drop paths from its `files:` array. Prevents `AGENTS.md` from floating untracked through the rest of the pipeline.
- **`build-exec` Check 2 — "Stash and continue"** — Updated prose from `git stash` to `git stash push --include-untracked` (`-u`) explicitly. Plain `git stash` only stashes tracked changes; an untracked-files-only dirty tree (the common case after template deploys or in inherited folders) would otherwise pass through unstashed.

### Why

Three small polish items surfaced during v0.1.3 validation tests on 2026-04-28. None blocking, all observable footguns:

1. `__pycache__/` showed up untracked across two consecutive Python pipeline runs and got handled inconsistently (one run added it to `.gitignore` mid-pipeline, the other deleted bytecode files manually). Default-gitignoring it makes recovery deterministic.
2. `AGENTS.md`/`CLAUDE.md` was being copied into the project root but never landing in a real commit. The follow-on `gsd-sdk query commit` reported `committed: true` but its `files:` response array silently omitted the onboarding doc. The leak was hidden until v0.1.3 Test B (where the dirty-tree gate at exec-time exposed it sitting untracked alongside `notes.txt`). Committing explicitly in pre-flight closes the leak.
3. `git stash` without `--include-untracked` is a silent no-op when the dirty tree is untracked-files-only. The model in v0.1.3 Test B inferred `-u` correctly under the previous prose, but a model that doesn't infer it would leave the dirty tree intact and the gate would loop or fail oddly.

### Honest framing

All three changes are deterministic — concrete file content for `.gitignore`, concrete `git add` + `git commit` for onboarding deploy, concrete `--include-untracked` flag in stash. No model-interpretation ambiguity in any of them.

### Preserved invariants from v0.1.3 (regression checklist — explicitly unchanged)

- v0.1.3 visibility + consent gate (Check 0.4) — `git add -A` only after `git status --short` was shown AND user explicitly chose "Commit existing project files"
- v0.1.2 Git pre-flight HARD GATE (Checks 0.1, 0.2, 0.3, 0.4, 0.5) — Git installed check, repo check, `.gitignore` merge-append, initial commit, remote presence
- v0.1.2 ship matrix 4-case routing — Cases A/B/C/D unchanged
- `.planning/` is NOT in `.gitignore`

### Caught by

OpenCode reviews of v0.1.3 Test A and Test B transcripts (2026-04-28).

## [0.1.3] - 2026-04-28

### Changed

- **`build-feature` skill (Check 0.4) and `build-init` skill (Step 0.4)** — Tightened Git bootstrap staging safety. The unconditional `git add -A` after `git init` is replaced with a visibility + consent gate. Empty folders still initialize cleanly with a `.gitignore`-only initial commit (no prompt). Non-empty folders now run `git status --short`, show the file list to the user, and AskUserQuestion before staging existing files. Three options: "Commit existing project files (Recommended)" (runs `git add -A` after consent), "Commit only `.gitignore`", or "Cancel" (exits without creating `.planning/`, `AGENTS.md`/`CLAUDE.md`, or any other artifacts).

### Why

Empirical validation of v0.1.2 in a fresh empty folder passed cleanly, but the same prose run in a non-empty folder (someone running `/build-feature` in an inherited directory with existing draft work, scratch files, or secrets the `.gitignore` doesn't catch) would silently sweep everything into "Initial commit (Triple Threat pipeline init)" with no preview. Even with `.gitignore` covering the obvious cases (`node_modules/`, `.env`, etc.), this was a real footgun for the inherited-codebase scenario.

The fix is not to ban `git add -A` — it's to require visibility (`git status --short` shown to user) and explicit consent (AskUserQuestion menu) before broad staging. After both gates fire, `git add -A` is the right command at that point.

### Honest framing

The added invariant is: `git add -A` may run only after `git status --short` was shown AND the user explicitly selected "Commit existing project files." Empty-folder behavior is unchanged from v0.1.2.

This is the same safety principle as v0.1.2's Check 0.2 (don't silently `git init` in arbitrary folders — ask first). Symmetric: don't silently stage arbitrary files into the initial commit either.

### Caught by

OpenCode review of the v0.1.2 validation transcript on 2026-04-28. The empty-folder test passed; the issue surfaces only in non-empty inherited folders, which v0.1.2 didn't cover.

### Preserved invariants from v0.1.2 (regression checklist)

These behaviors are explicitly unchanged in v0.1.3:

- Git missing → halt with platform-specific install instructions
- Not a repo → AskUserQuestion before `git init` (Check 0.2)
- No GitHub remote → allowed; ship uses local ship-prep mode
- GitHub remote on default branch → ship refuses direct push/PR
- `.planning/` is NOT in `.gitignore`
- `.gitignore` entries: `node_modules/`, `.env`, `.env.local`, `.env.*.local`, `*.log`, `.DS_Store`, `Thumbs.db`
- `.gitignore` merge-append on existing files (Check 0.3): never overwrite, only append missing entries

## [0.1.2] - 2026-04-27

### Changed

- **`build-feature` skill** — Added "Pre-flight: Git bootstrap" as a HARD GATE that runs before all other pre-flight checks, including `.planning/` workspace bootstrap. Five sub-checks: (0.1) Git installed → halt with platform-specific install instructions if missing; (0.2) working directory is a Git repo → if not, AskUserQuestion before running `git init -b main`; (0.3) safe `.gitignore` (merge-append, never overwrite, never gitignore `.planning/`); (0.4) initial commit if newly initialized; (0.5) record remote presence for downstream `/build-ship` routing.
- **`build-init` skill** — Same Git pre-flight added as Step 0, before workspace bootstrap.
- **`build-ship` skill** — Replaced single hard-refuse Check 2 with 4-case branch + remote matrix:
  - Case A (feature branch + remote) → GStack `/ship` (unchanged)
  - Case B (feature branch + no remote) → new Local ship-prep mode
  - Case C (default branch + remote) → refuse (clearer message)
  - Case D (default branch + no remote) → AskUserQuestion (4 options including local ship-prep)
- **`build-ship` skill** — Added "Local ship-prep mode" section that handles cases B + D inline (VERSION bump with semver detection, CHANGELOG.md prepend marked `[Unreleased]`, commit, optional local tag, no push, no PR).
- **`build-ship` skill** — Updated `description:` frontmatter to honestly reflect the routing matrix.

### Why

Two related problems:

1. **Pipeline assumes Git state that may not exist.** Personal projects without GitHub remotes were partially broken: `/build-ship` hard-stopped on default branches even when no PR target existed. More fundamentally, the pipeline could write durable planning artifacts to a folder that wasn't even a Git repo, leaving no commit history for later recovery.
2. **Host divergence on no-remote shipping.** Claude (Opus 4.7) improvised around the strict refuse logic and offered ship-prep options; OpenCode (GPT-5.5) followed the prose literally and hard-stopped. Same skill files, different interpretations.

The fix establishes a clear architectural contract:

- **Local Git is required.** The pipeline halts at pre-flight if Git isn't installed or the working tree isn't a repo. Deterministic via Bash exit codes.
- **GitHub is optional.** Remote presence determines whether ship runs the GStack push/PR flow or local ship-prep. Either path produces durable, committed work.

Both hosts now route on the same explicit case matrix instead of relying on model improvisation.

### Honest framing

The Git pre-flight checks (installed? in a repo?) are **deterministic** — Bash exit codes, file existence checks, real filesystem state. Hard gates in the structural sense.

The ship-time matrix routing is **model-interpreted** — the model reads `git remote -v` output and routes to a case. Less guarantee than the pre-flight, but the cases are concrete enough that rationalization is significantly harder than the v0.1.1 TDD case (which was about subjective plan-content judgment). Different shape, much higher confidence.

### Editorial corrections (vs draft)

- "Treat as a refusal to proceed unless the user explicitly overrides" replaces an internally inconsistent "Do not negotiate around it" + override-clause pair (v0.1.1 carried the same draft language; v0.1.2 fixes it).
- `build-ship` description uses "validates / routes" not "structurally enforced" for the model-interpreted matrix layer (calibration: reserve "structural" for mechanisms outside the model's control).

### Deferred

- Deterministic PLAN.md TDD linter — still v0.2.0 candidate (independent of this fix).

## [0.1.1] - 2026-04-27

### Changed

- **`build-plan` skill** — Added explicit TDD requirement section. Code-changing tasks must be RED→GREEN ordered (test → run → fail → implement → run → pass → commit). Plans split into "implementation task" then "test task" are declared invalid.
- **`build-plan` skill** — Added plan-author preference: source-modifying phases should dispatch `gsd-planner` rather than write plans inline. Inline plan writing is the most common path that produces invalid implementation-first plans.
- **`build-exec` skill** — Added Check 3 (PLAN.md TDD validation) as a hard pre-execution gate. Reads PLAN.md before invoking `gsd-execute-phase`; refuses to proceed if any code-changing task is implementation-first. Prints a structured BLOCKED report and routes the user back to `/build-plan`. User can explicitly override; override is recorded in the phase summary.
- **`build-exec` skill** — Updated `description:` frontmatter to honestly reflect the gate. Removed misleading "structurally enforced" language for the new validation step (it is model-interpreted, not deterministic).

### Why

Empirical validation runs on 2026-04-27 showed that Claude could produce implementation-first plans even with `plan_check: true` enabled. Plan-check audits acceptance-criteria coverage, not task ordering. The previous "best-effort prompt-level TDD" framing was honest but too weak — users reasonably expect Triple Threat's Superpowers-discipline claim to surface as enforced behavior.

### Honest framing

v0.1.1 raises the floor on TDD enforcement but does NOT make it deterministic. Both new gates are model-interpreted prose:
- The `build-plan` contract is text the model reads when generating a plan.
- The `build-exec` Check 3 validation is text the model reads when deciding whether to proceed.

The same model that may write a bad plan is the same model that runs the validation. Compliance probability is significantly higher than v0.1.0; mechanical guarantee requires a deterministic PLAN.md linter (deferred to v0.2.0+ pending evidence that the prompt-level gate is insufficient).

The accurate v0.1.1 claim is: **"TDD-shaped plans are required, and visibly implementation-first plans are blocked at execution time."** Not: "TDD is structurally enforced."

### Deferred

- Deterministic PLAN.md linter (would parse PLAN.md as structured XML/markdown and assert test-first ordering via concrete syntactic checks, with non-zero exit codes that cannot be argued past). Deferred to v0.2.0+ pending evidence from real-world v0.1.1 usage.
- Commit-history-based TDD enforcement (intentionally not pursued — brittle to squash, amend, and combined commits).

## [0.1.0] - 2026-04-26

### Added

- Initial bundle release. Eleven `/build-*` skills (`build-init`, `build-map`, `build-spec`, `build-plan`, `build-exec`, `build-review`, `build-qa`, `build-ship`, `build-debug`, `build-feature`, `build-doctor`) plus `triple-threat` reference skill.
- `build-doctor` v1.1 — read-only install diagnostic with cross-host base-directory classification and 7-probe registry liveness check.
- VERSION file at bundle root.
- Platform support matrix in README (macOS primary, Linux/WSL2 documented untested).
- AGENTS.md project onboarding doc.
- Project-local `.opencode/` mirror (commands + skills) for projects that bundle Triple Threat directly.

### Architectural decisions

- TDD discipline declared best-effort prompt-level (per-task), with structural enforcement only at GSD's per-wave test gate and Triple Threat's pre-ship verification gate.
- Cross-host fallback documented for OpenCode-only users (GSD's `--opencode --global` installer ships command wrappers, not native skill artifacts).
- Two parallel command directories on OpenCode: `~/.config/opencode/commands/` (Triple Threat install) vs `~/.config/opencode/command/` (GSD install). Both work; `/build-doctor` checks both.
