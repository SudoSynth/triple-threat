# Triple Threat

Adaptive build pipeline for AI-assisted software engineering. One set of `/build-*` commands routes work through three composed frameworks:

- **GSD** — planning and execution spine
- **GStack** — review, QA, ship, browser workflows
- **Superpowers** — TDD discipline, planning, code review

`/build-feature <description>` is the main entry point. It classifies the request as Fast (small precise tasks), Standard (default), or Full (risky/demanding work) and runs the appropriate pipeline weight.

## Layout

```
triple-threat/
├── setup.sh          → top-level verifier-guided setup
├── claude/           → Claude Code bundle (skills + install scripts)
├── opencode/         → OpenCode bundle (skills + commands + install scripts)
├── DEPENDENCIES.md   → pinned upstream dep refs (GSD, GStack, Superpowers)
├── LICENSE           → MIT
├── CONTRIBUTING.md   → contributor guide
├── MEMORY.md         → project memory (current state, locked decisions, backlog)
├── PROJECT_MEMORY.md → longer archival narrative
└── README.md         → this file
```

## Quick start

Verify your environment without changing anything:

```bash
bash setup.sh --check
```

Install Triple Threat skills for your host:

```bash
bash setup.sh --claude        # Claude Code
bash setup.sh --opencode      # OpenCode
bash setup.sh --both          # both hosts
```

`setup.sh` prints the pinned framework install commands (GSD, GStack, Superpowers) but doesn't run them — the underlying frameworks are still installed manually, with eyes open. See [`DEPENDENCIES.md`](DEPENDENCIES.md) for why each ref is pinned.

If you'd rather skip `setup.sh` and run the per-bundle installer directly: `bash claude/install.sh` or `bash opencode/install.sh`.

## Status

Working toward **v0.4.0** — first public release.

Substance baseline is the verified v0.3.1 bundle, consolidated fresh-start from two dev folders into this single repo. Public launch is gated on the v0.4.0 readiness work tracked in `MEMORY.md`.

This is a private development repo until v0.4.0 ships.

## Quick navigation

| File | Purpose |
|---|---|
| [`setup.sh`](setup.sh) | Top-level verifier-guided setup (`--check` is read-only) |
| [`DEPENDENCIES.md`](DEPENDENCIES.md) | Pinned upstream dep refs |
| [`LICENSE`](LICENSE) | MIT |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contributor guide |
| [`claude/README.md`](claude/README.md) | Claude bundle: install + usage |
| [`opencode/README.md`](opencode/README.md) | OpenCode bundle: install + usage |
| [`claude/CHANGELOG.md`](claude/CHANGELOG.md) | Claude bundle release history |
| [`opencode/CHANGELOG.md`](opencode/CHANGELOG.md) | OpenCode bundle release history |
| [`MEMORY.md`](MEMORY.md) | Project memory: current state, locked decisions, v0.4.0 backlog |
| [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) | Longer archival narrative |
