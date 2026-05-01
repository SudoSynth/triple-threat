# Triple Threat Project Memory

Last updated: 2026-04-29
Working toward: v0.4.0 (first public release)
Substance baseline: v0.3.1

`MEMORY.md` is the short index. This file is the longer archive.

## Source of Truth

This repo (`triple-threat/`) is the consolidated source for both Claude and OpenCode bundles. Both bundles live under `claude/` and `opencode/` top-level subdirs.

Origin: fresh-start consolidation from `/Users/brennenmccord/Desktop/Triple Threat Development Folder - Claude/` and `/Users/brennenmccord/Desktop/Triple Threat Development Folder - OpenCode/` at v0.3.1 substance.

The decision to fresh-start (vs preserve histories) was driven by:

- Public users have no need for the two local v0.3.1 baseline commits — those were scaffolding.
- MEMORY.md and per-bundle CHANGELOG.md files preserve the historical narrative that matters.
- Avoids rewriting commits in two repos.
- Gives the public repo one clean first commit instead of inherited dev-folder history.
- Cleaner GitHub history beats preserving local scaffolding history.

The legacy dev folders remain on Desktop as a rollback safety net until v0.4.0 ships.

## Current State

- Substance is at v0.3.1 (Claude and OpenCode bundles unchanged from the verified v0.3.1 release).
- v0.3.1 added portable `install.sh` and `uninstall.sh` so end users can install via `bash install.sh` from any unzip location.
- Zips are intentionally portable and contain real files, not symlinks.
- Local installed symlinks at `~/.claude/skills/` and `~/.config/opencode/skills/` currently point at the legacy dev folders. They will be repointed to this repo's bundles once new-layout install paths are validated.
- Commit identity: `SudoSynth <281028376+SudoSynth@users.noreply.github.com>`, set via local repo config.
- Pre-consolidation, the Claude dev folder was a git repo at baseline `8a1217c` tag `v0.3.1`, and the OpenCode dev folder was at baseline `a0f9cf5` tag `v0.3.1`. Those repos are abandoned by the fresh-start strategy; their histories remain in their respective `.git/` directories on Desktop until those folders are deleted.

## Release History Summary

### v0.1.2

- Added Git bootstrap at pipeline start.
- Local Git is required; GitHub remote is optional.
- No-remote default-branch local ship-prep path was introduced.

### v0.1.3

- Fixed broad staging safety around `git add -A`.
- Empty-folder bootstrap commits only safe bootstrap files.
- Non-empty folders should show status and ask before committing existing files.

### v0.2.0

- Added deterministic TDD plan linter: `scripts/lint-plan-tdd.js`.
- Added post-execution TDD audit: `scripts/audit-tdd-commits.js`.
- Added linter fixtures and tests.
- Important principle: claim mechanical enforcement only where scripts actually enforce it.

### v0.2.1

- Added Karpathy-style guidance:
  - Simplicity First in `build-plan`.
  - Surgical Changes in `build-review`.
  - Builder Hygiene in onboarding templates.
- Later testing showed some review prose was placed too late when GStack self-concluded.

### v0.2.2

- Fixed `build-review` orchestration:
  - Hygiene pre-flight runs before GStack review.
  - GStack `/review` is treated as a sub-review, not terminal workflow completion.
  - Superpowers two-stage review continues afterward.
- Validated in both Claude and OpenCode smoke runs.

### v0.2.3

- Recovered a stale Claude bundle problem: the packaged Claude bundle had v0.2.0-shaped `build-plan` and `build-review` prose while metadata claimed v0.2.2.
- Added explicit `/autoplan` skip criteria for trivial, precise specs.
- Added explicit no-remote fallback for GStack `/review`.
- Changelog intentionally disclosed the bundle drift bug.

### v0.2.4

- Consolidated local installs with symlinks.
- Bundle directories became canonical source for local development.
- Installed Claude/OpenCode skills and OpenCode command wrappers point to canonical bundle files.
- Shipped zips still contain real files for portability.
- Added OpenCode `sync-bundle.sh` to keep top-level and `.opencode/` mirrors in sync.
- Added `/build-doctor` broken-symlink probe.

### v0.3.0

- Added adaptive assurance routing inside `build-feature`.
- Fast Mode is for small, precise, low-risk tasks.
- Standard Mode is the normal pipeline.
- Full Mode is currently equivalent to Standard and remains deferred until a real heavy workload validates extra gates.
- Locked decision: do not add a separate `build-fast` skill yet.

### v0.3.1

- Added portable installers and uninstallers.
- Installer is idempotent: already-correct symlinks are skipped.
- Uninstaller removes only symlinks pointing into the current bundle root.
- Fresh `HOME` install/uninstall tests passed during release.
- This made Triple Threat installable by someone other than the maintainer, but does not mean public release readiness.

## Current Architecture

### Repo layout

```text
triple-threat/
├── README.md, MEMORY.md, PROJECT_MEMORY.md, .gitignore
├── claude/
│   ├── .claude/skills/<skill>/SKILL.md
│   ├── scripts/
│   ├── install.sh, uninstall.sh
│   ├── README.md, CLAUDE.md, CHANGELOG.md, VERSION
└── opencode/
    ├── .opencode/skills/<skill>/SKILL.md
    ├── .opencode/commands/<command>.md
    ├── skills/<skill>/SKILL.md
    ├── commands/<command>.md
    ├── scripts/
    ├── install.sh, uninstall.sh
    ├── README.md, AGENTS.md, CHANGELOG.md, VERSION
```

The OpenCode bundle's `.opencode/skills/` ↔ `skills/` and `.opencode/commands/` ↔ `commands/` mirroring is intentional (zips can't ship symlinks) and kept in sync by `opencode/scripts/sync-bundle.sh`.

## Key Decisions

- Main entrypoint remains `/build-feature`.
- v0.3.0 Fast Mode lives inside `build-feature`; do not add `/build-fast` until repeated real usage proves direct invocation is needed.
- Fast Mode must not become shortcut mode. It still requires TDD for behavior changes, verification, and Superpowers two-stage review.
- For v0.4.0: Full Mode is being **removed**, not validated. "Full equals Standard" was product debt; Fast + Standard is more honest.
- Zips must contain real files, not symlinks.
- Local installs may use symlinks.
- OpenCode project-local installs remain real copies for portability.
- Be honest in changelogs about validated vs aspirational behavior.
- Identity rewrite is non-negotiable before any push to a public-visible remote.
- Public release is gated on v0.4.0 readiness — install confidence, license audit, CI, fresh-machine test, and Fast Mode real miles. v0.3.1 was infrastructure, not a release decision.

## Bounce-and-Write Workflow

The user runs parallel Claude and OpenCode sessions against this repo. Ideas bounce between the two sessions (the user relays messages), and once agreement is reached, Claude is the typical default writer. The other session may write some changes too — the user picks per task.

The bounce surfaces disagreement before code locks anything in. Designating one writer prevents merge conflicts on shared files.

## Open Backlog

See `MEMORY.md` "v0.4.0 Open Backlog" section for the working punch list.

Post-v0.4.0:

- Release workflow auto-building bundle zips on tag push.
- Cross-framework composition / architecture explainer doc.
- Investigate missing per-task TDD approval gate visibility in `build-exec` (was open during v0.2.2 runs).
- Delete legacy Desktop dev folders once v0.4.0 ships and new repo proven.
- Eventual: monitor and decide whether `/build-fast` should become a top-level skill.

## Recovery Notes

If installed skills break after the new layout's install scripts are wired up, run from this repo's bundles:

```bash
bash "/Users/brennenmccord/Desktop/triple-threat/claude/install.sh"
bash "/Users/brennenmccord/Desktop/triple-threat/opencode/install.sh"
```

Until those install paths are validated and symlinks repointed, the legacy dev folders' install scripts continue to be the recovery source:

```bash
bash "/Users/brennenmccord/Desktop/Triple Threat Development Folder - Claude/install.sh"
bash "/Users/brennenmccord/Desktop/Triple Threat Development Folder - OpenCode/install.sh"
```

Check broken Triple Threat symlinks with:

```bash
find ~/.claude/skills ~/.config/opencode/skills ~/.config/opencode/commands -type l ! -exec test -e {} \; -print 2>/dev/null
```

Expected after a healthy install: no `build-*` or `triple-threat` broken links. Pre-existing GStack broken symlinks may appear and are external noise.
