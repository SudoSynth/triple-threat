# Contributing to Triple Threat

Triple Threat is pre-1.0; small, focused contributions are most welcome. Read [`MEMORY.md`](MEMORY.md) before proposing larger changes.

## Repo layout

```
triple-threat/
├── claude/      → Claude Code bundle
├── opencode/    → OpenCode bundle
├── MEMORY.md    → current state, locked decisions, backlog
└── PROJECT_MEMORY.md → longer narrative
```

Both bundles share most prose intentionally. Claude and OpenCode have host-specific differences. Don't blind-copy between them.

## Development install

```bash
bash claude/install.sh        # symlinks ~/.claude/skills/<build-*> into claude/
bash opencode/install.sh      # symlinks ~/.config/opencode/skills/<build-*> and commands/
```

Edits to `claude/.claude/skills/<skill>/SKILL.md` and `opencode/skills/<skill>/SKILL.md` are live immediately — no reinstall needed.

## Testing

```bash
node claude/scripts/lint-plan-tdd.test.js
node claude/scripts/audit-tdd-commits.test.js
node opencode/scripts/lint-plan-tdd.test.js
node opencode/scripts/audit-tdd-commits.test.js
```

All four must pass. CI runs them on every push and pull request.

## OpenCode mirror discipline

OpenCode ships skills in two places: `opencode/skills/` (canonical) and `opencode/.opencode/skills/` (mirror — used when the bundle is dropped into a project's `.opencode/`). Same for `commands/`. After editing canonical, run:

```bash
bash opencode/scripts/sync-bundle.sh
bash opencode/scripts/sync-bundle.sh --check   # exits 0 if in sync
```

CI requires `--check` to pass.

## Behavior changes vs prose changes

If a change affects pipeline behavior (TDD discipline, review orchestration, mode classification, install flow), it almost certainly needs to land in **both bundles**. Open one PR that updates both rather than letting them drift.

If a change is host-specific (e.g., Claude's `Skill` tool vs OpenCode's command/skill split), it's fine to land in one bundle only. Note "Claude only" or "OpenCode only" in the PR.

## Locked decisions

Settled — don't re-litigate without strong new evidence:

- No separate `/build-fast` skill. Fast Mode lives inside `build-feature`.
- Fast Mode requires TDD for behavior changes + Superpowers two-stage review. Fast ≠ unverified.
- Zips must contain real files, not symlinks. Local installs may use symlinks.
- Claude and OpenCode skill prose differs by host. Don't blind-copy.

Full list in [`MEMORY.md`](MEMORY.md).

## Honest framing

Every changelog entry should distinguish **validated** from **aspirational**. Don't claim mechanical enforcement where the model is honoring prose. This is core to the project's culture and shows up in every existing release note.

## Issue and PR templates

When opening an issue, the bug template asks for repro steps, host (Claude/OpenCode), install mode, expected/actual behavior, and test evidence. The feature template asks for behavior-vs-prose distinction and which bundle(s) are affected.

The PR template requires: tests passing (when scripts touched), `sync-bundle.sh --check` (when OpenCode bundle touched), CHANGELOG entry for the affected bundle, host stated (Claude/OpenCode/Both), and the validated-vs-aspirational distinction.
