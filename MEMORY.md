# Triple Threat Memory

Last updated: 2026-04-29
Working toward: **v0.4.0** (first public release)
Substance baseline: v0.3.1 (verified Claude + OpenCode bundles, consolidated fresh-start)

Read this file first before changing Triple Threat. `PROJECT_MEMORY.md` has the longer archive.

## Current Truth

- This repo is the consolidated source of truth for both Claude and OpenCode bundles. Both bundles live under top-level `claude/` and `opencode/` subdirs.
- Origin: copied fresh-start from `Triple Threat Development Folder - Claude/` and `Triple Threat Development Folder - OpenCode/` at v0.3.1 substance. Those legacy folders remain on Desktop as a rollback safety net until v0.4.0 ships.
- Local installed symlinks at `~/.claude/skills/` and `~/.config/opencode/skills/` still point at the legacy dev folders. They will be repointed to this repo's bundles once the new layout's install paths are validated (step 7 of the v0.4.0 backlog).
- Commit identity: `SudoSynth <281028376+SudoSynth@users.noreply.github.com>`, set via local repo config (no global git config touched).
- Future GitHub home: `github.com/SudoSynth/triple-threat` (private at first, public at v0.4.0 launch).

## What Triple Threat Is

A unified build pipeline composing GSD, GStack, and Superpowers behind `/build-*` commands.

- GSD owns the planning/execution spine.
- GStack owns review, QA, ship, browser workflows, and product/engineering review skills.
- Superpowers owns TDD discipline, planning, debugging, and code-review workflows.
- `/build-feature` is the main entrypoint.

## Release History (Substance Baseline)

- **v0.1.2**: Git bootstrap; local Git required, GitHub remote optional; no-remote local ship-prep.
- **v0.1.3**: Safer staging; avoid broad `git add -A` without visibility/approval.
- **v0.2.0**: Added `lint-plan-tdd.js` and `audit-tdd-commits.js` with fixtures/tests.
- **v0.2.1**: Added Karpathy-style Simplicity First, Surgical Changes, and Builder Hygiene prose.
- **v0.2.2**: Fixed review orchestration so hygiene runs before GStack and Superpowers continues after GStack.
- **v0.2.3**: Recovered stale Claude bundle drift; added `/autoplan` skip criteria and no-remote GStack review fallback.
- **v0.2.4**: Consolidated local installs with symlinks; zips remain real files; added OpenCode sync script and symlink doctor probe.
- **v0.3.0**: Added Fast/Standard/Full adaptive assurance routing inside `build-feature`.
- **v0.3.1**: Added portable idempotent `install.sh` and safe `uninstall.sh` for end users.

Per-bundle CHANGELOG.md files contain the detailed release notes.

## Locked Decisions

- Do not add `/build-fast` yet. Fast Mode lives inside `build-feature` until repeated real usage proves direct invocation is needed.
- Fast Mode must not become shortcut mode. It still requires TDD for behavior changes, verification, and Superpowers two-stage review.
- Full Mode shipped in v0.3.0 as "equal to Standard." For v0.4.0, the locked direction was to **remove Full Mode** rather than maintain it as an aspirational label. Removed in step 13. Ship Fast + Standard only.
- Zips must contain real files, not symlinks.
- Local installs may use symlinks.
- OpenCode project-local installs remain real copies.
- Claude and OpenCode skill prose differs by host. Update both intentionally, not by blind copy.
- Changelogs stay honest about validated vs aspirational behavior.
- **Bounce-and-write workflow**: Claude and OpenCode peer sessions bounce ideas via the user; Claude is the typical default writer once agreement is reached.
- Identity rewrite is non-negotiable before any push. No public commit may carry placeholder identity.
- Public release is gated on v0.4.0 readiness. v0.3.1 was open-source-readiness *infrastructure*, not a release decision.

## Folder Roles

Active source:

- `triple-threat/` — this repo. Consolidated source of truth.
- `triple-threat/claude/` — Claude Code bundle.
- `triple-threat/opencode/` — OpenCode bundle.

Rollback safety net (Desktop, until v0.4.0 ships):

- `Triple Threat Development Folder - Claude/` — pre-consolidation Claude dev folder.
- `Triple Threat Development Folder - OpenCode/` — pre-consolidation OpenCode dev folder.
- `Triple Threat v0.3.1/` — verified v0.3.1 release bundle.

Stale, do not use:

- `Triple Threat - OpenCode test/` — recovered old OpenCode test/bundle folder.
- `Triple Threat - Main - OpenCode/` — pre-v0.2.x OpenCode bundle snapshot.
- `Triple Treat Skill - Main - Claude/` — early planning artifact.
- `Triple Threat v0.2.4/` — old release bundle.
- `Triple Threat - Old/` — unaccounted-for legacy folder.

## v0.4.0 Open Backlog

Order matches agreed plan after Claude ↔ OpenCode bounce:

1. ✓ Real git identity decided (`SudoSynth <281028376+SudoSynth@users.noreply.github.com>`).
2. ✓ Consolidation strategy decided (fresh-start, one repo, `claude/` + `opencode/`).
3. ✓ Fresh consolidated repo created locally with real identity.
4. ✓ Bundles copied into `claude/` and `opencode/`.
5. Update install paths and docs for the new layout.
6. Add LICENSE, CONTRIBUTING.md, `.github/` templates.
7. Add CI for both bundles' Node test scripts.
8. Push to private GitHub (CI green proven).
9. Pin GStack, Superpowers, GSD dependency refs.
10. Setup verifier (detect → ask → scoped install → print system commands → doctor pass).
11. Fresh-machine install test passing end-to-end (`HOME=/tmp/tt-test-home`).
12. `/build-doctor` version-confusion fix.
13. ✓ Remove Full Mode (collapsed to Fast + Standard).
14. Validate Fast Mode — tracked in [`docs/fast-mode-validation.md`](docs/fast-mode-validation.md). v0.4.0 gate: 5 of 10 slots completed, ≥2 of those 5 outside this repo. Remaining 5 → v0.4.1 evidence.
15. Public-facing README rewrite + CHANGELOG v0.4.0 entry.
16. Flip public + tag `v0.4.0` + cut GitHub Release.

Post-v0.4.0:

- Release workflow that auto-builds bundle zips on tag push.
- Architecture / contribution docs (cross-framework composition explainer).
- Investigate missing per-task TDD approval gate visibility in `build-exec`.
- Delete legacy Desktop folders once v0.4.0 ships and the new repo is proven.
