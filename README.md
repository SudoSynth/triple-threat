# Triple Threat

Adaptive build pipeline for AI-assisted software engineering. One set of `/build-*` commands routes work through three composed frameworks:

- **GSD** — planning and execution spine
- **GStack** — review, QA, ship, browser workflows
- **Superpowers** — TDD discipline, planning, code review

`/build-feature <description>` is the main entry point. It classifies the request as Fast (small precise tasks), Standard (default), or Full (risky/demanding work) and runs the appropriate pipeline weight.

## Layout

```
triple-threat/
├── claude/      → Claude Code bundle (skills + install scripts)
├── opencode/    → OpenCode bundle (skills + commands + install scripts)
├── MEMORY.md    → project memory (current state, locked decisions, backlog)
├── PROJECT_MEMORY.md → longer archival narrative
└── README.md    → this file
```

Pick the bundle that matches your AI CLI host. Each one self-installs into its host's skill discovery path via `bash install.sh` from inside the bundle directory.

## Status

Working toward **v0.4.0** — first public release.

Substance baseline is the verified v0.3.1 bundle, consolidated fresh-start from two dev folders into this single repo. Public launch is gated on the v0.4.0 readiness work tracked in `MEMORY.md`.

This is a private development repo until v0.4.0 ships.

## Quick navigation

| File | Purpose |
|---|---|
| [`claude/README.md`](claude/README.md) | Claude bundle: install + usage |
| [`opencode/README.md`](opencode/README.md) | OpenCode bundle: install + usage |
| [`claude/CHANGELOG.md`](claude/CHANGELOG.md) | Claude bundle release history |
| [`opencode/CHANGELOG.md`](opencode/CHANGELOG.md) | OpenCode bundle release history |
| [`MEMORY.md`](MEMORY.md) | Project memory: current state, locked decisions, v0.4.0 backlog |
| [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) | Longer archival narrative |
