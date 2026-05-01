# Triple Threat

[![CI](https://github.com/SudoSynth/triple-threat/actions/workflows/ci.yml/badge.svg)](https://github.com/SudoSynth/triple-threat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: pre-1.0](https://img.shields.io/badge/status-pre--1.0%20%2F%20early%20access-orange)](#status--validation)
[![Hosts: Claude Code · OpenCode](https://img.shields.io/badge/hosts-Claude%20Code%20%C2%B7%20OpenCode-blue)]()

> **AI coding agents that ship code through the review pipeline a senior engineer would expect. TDD-disciplined. For Claude Code and OpenCode.**

`/build-feature <description>` routes work through six pipeline stages — spec, plan, exec, review, QA, ship — with two real Node scripts mechanically enforcing TDD plan-shape and commit-shape. Composes [GSD](https://github.com/gsd-build/get-shit-done), [GStack](https://github.com/garrytan/gstack), and [Superpowers](https://github.com/obra/superpowers) behind one command surface.

<!-- TODO before public launch: replace with asciinema or GIF demo -->
<!-- Suggested: 30-60s recording of /build-feature running through Fast Mode + a real change shipping -->
*Demo recording coming with the public launch.*

> **⚠ Status: pre-1.0 / early access.** Standard Mode runs the full pipeline end-to-end and is the safe default. Fast Mode is shipping with prose-level discipline that's still being validated — see [`docs/fast-mode-validation.md`](docs/fast-mode-validation.md) (currently **0 / 5** required entries before final v0.4.0). Final `v0.4.0` release is gated on accumulating that evidence.

---

## Why Triple Threat

AI coding agents are good at writing code. They're worse at **disciplined** code: failing tests first, surgical changes, honest changelogs, deferred abstractions, "I don't know" instead of plausible nonsense. Most agent tooling either skips review entirely or layers a single review pass on top of an undisciplined plan.

Triple Threat does three things differently:

1. **Mechanical TDD enforcement.** A Node linter rejects plans that aren't TDD-shaped (failing test before implementation). A post-execution audit verifies commits respect that shape. These aren't prose suggestions — they're scripts with exit codes that gate `/build-exec` and run on every CI push.

2. **Layered review, not just one pass.** Karpathy-style hygiene check (file scope, drive-by edits, dead code) runs before GStack `/review`. GStack's review is a sub-step, not the workflow. Superpowers' two-stage code review (anti-sycophancy) runs after — and it's non-negotiable, even in Fast Mode.

3. **Honest framing, mechanically tracked.** Every release note distinguishes *validated* from *aspirational* behavior. Full Mode existed for two minor versions claiming gates that weren't actually wired up — it was removed in v0.4.0 rather than be left as an aspirational label.

It's the connective tissue, not a framework.

---

## What it does

`/build-feature <description>` classifies the request and routes:

**Fast Mode** — small, precise, low-risk tasks (≤2 files, no security/migration signals, precise spec).

```
> /build-feature add a Date.parseISO helper that returns null for invalid input

✓ Routing as Fast Mode — small precise feature
✓ Failing test written and observed (date.test.ts)
✓ Implementation passes
✓ Superpowers two-stage review: 0 critical findings
✓ Committed: a1b2c3d
```

**Standard Mode** — everything else, default. Runs the full pipeline.

```
> /build-feature add OAuth2 password grant flow with refresh tokens

✓ Routing as Standard Mode — risky change requiring full review
→ /build-spec    SPEC.md drafted with discuss + autoplan
→ /build-plan    PLAN.md TDD-shaped (lint-plan-tdd: pass)
↳ approval gate
→ /build-exec    8 waves, 23 commits, audit-tdd-commits: pass
→ /build-review  hygiene + GStack /review + /cso + Superpowers two-stage
→ /build-qa      browser test-fix loop, 3 fixes
→ /build-ship    VERSION + CHANGELOG + PR opened
```

Risky / security-sensitive / large-UI work routes to Standard, not Fast.

---

## Quick start

Verify your environment first (read-only):

```bash
git clone https://github.com/SudoSynth/triple-threat.git
cd triple-threat
bash setup.sh --check
```

Install Triple Threat skills for your host:

```bash
bash setup.sh --claude        # Claude Code
bash setup.sh --opencode      # OpenCode (with caveats — see below)
bash setup.sh --both
```

`setup.sh` prints pinned install commands for the three composed frameworks (GSD, GStack, Superpowers) but doesn't run them — you install those manually, with eyes open. See [`DEPENDENCIES.md`](DEPENDENCIES.md) for why each ref is pinned and how to update.

**Realistic setup time**: 15–25 minutes including manual framework installs. The 30-second pitch sells the *outcome*; the actual install requires Bun, Node, npx, plus three repo clones. We're working toward a tighter setup story but not pretending it's there yet.

For deeper bundle-specific docs:

- [`claude/README.md`](claude/README.md) — Claude Code bundle
- [`opencode/README.md`](opencode/README.md) — OpenCode bundle (note: OpenCode-only GSD is currently unsupported; see that README for the cross-host fallback)

---

## How it works

Three frameworks compose:

| Framework | Owns | Pinned to |
|---|---|---|
| **GSD** | Planning + execution spine, `.planning/` state | npm `get-shit-done-cc@1.38.5` |
| **GStack** | Review, QA, ship, browser, `/review`/`/codex`/`/cso` | `garrytan/gstack` (commit pinned) |
| **Superpowers** | TDD discipline, two-stage code review | `obra/superpowers v5.0.7` |

`/build-feature` is a thin orchestrator that invokes each framework's skills via the host's Skill tool, applies Triple Threat-specific prose constraints (TDD discipline, hygiene checks, honest framing), and routes between Fast and Standard tiers based on cheap heuristics.

For the full picture — orchestration diagram, mode classification rules, mechanical-vs-prose enforcement table, where to make changes — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Coding hygiene from Andrej Karpathy

Triple Threat's hygiene principles in `build-plan`, `build-review`, and the project template were shaped by [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills), forrestchang's CLAUDE.md distilling [Andrej Karpathy's observations on LLM coding pitfalls](https://x.com/karpathy/status/2015883857489522876). The four principles — Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution — show up in:

- `claude/.claude/skills/build-plan/SKILL.md` — Simplicity First check
- `claude/.claude/skills/build-review/SKILL.md` — Surgical Changes hygiene pre-flight
- `claude/CLAUDE.md.template` — Builder Hygiene principles for new projects

The two are complementary, not redundant: andrej-karpathy-skills applies the principles to **every** Claude Code interaction (session-wide); Triple Threat applies them at **specific pipeline gates** (plan + review). Many users will want both installed.

---

## When NOT to use Triple Threat

- **Trivial config tweaks** — `vim` is faster.
- **One-line typo fixes** — pipeline overhead exceeds value.
- **Pure exploration with no commit intent** — sandbox elsewhere.
- **You don't have Claude Code or OpenCode installed** — Triple Threat doesn't ship its own LLM client.
- **You want zero TDD** — Fast Mode still requires a failing test first for behavior changes. There's no opt-out for that, by design.

---

## Status & validation

This is **pre-1.0, early access**. Specifically:

- **Standard Mode**: validated. The full 6-stage pipeline has been exercised against real workloads since v0.2.0+; mechanical TDD checks (`lint-plan-tdd`, `audit-tdd-commits`) gate every plan and audit every commit.
- **Fast Mode**: prose-level discipline, currently being validated in real use. Required hard rules (failing test first, Superpowers two-stage review) are intentional non-negotiables; whether the model honors them under load is what [`docs/fast-mode-validation.md`](docs/fast-mode-validation.md) tracks. Currently **0 / 5** entries; final `v0.4.0` release is gated on hitting that bar.
- **OpenCode-only GSD**: explicitly **unsupported** at this stage — install Claude Code as well for cross-host fallback. See [`opencode/README.md`](opencode/README.md).

What's next is in [`ROADMAP.md`](ROADMAP.md). Validated-vs-aspirational distinction is non-negotiable; see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for why.

---

## Comparison

|  | Triple Threat | Raw GSD | Raw GStack | DIY scripting |
|---|---|---|---|---|
| Multi-stage planning structure | ✓ | ✓ | — | manual |
| Mechanical TDD enforcement | ✓ (linter + audit + CI) | — | — | manual |
| Layered review (hygiene + tool review + 2-stage code review) | ✓ | — | partial (just `/review`) | manual |
| Mode adaptivity (Fast / Standard) | ✓ | — | — | manual |
| Cross-host (Claude Code + OpenCode) | ✓ | partial | partial | — |
| Honest validated/aspirational framing | culture | varies | varies | depends |
| Setup effort | ~15–25 min | < 1 min | ~5 min | hours |
| Maintenance footprint | three pins to track | one | one | infinite |

If you only need a planning spine, raw GSD is lighter. If you only need review/QA/ship glue, raw GStack is faster to install. Triple Threat is for the case where you want **all of it**, composed, with TDD enforced and honest framing baked in.

---

## Repo layout

```
triple-threat/
├── README.md             ← this file
├── ROADMAP.md            ← Now / Next / Later + locked decisions
├── DEPENDENCIES.md       ← pinned upstream refs + update process
├── LICENSE               ← MIT
├── CONTRIBUTING.md       ← contributor guide
├── CODE_OF_CONDUCT.md    ← Contributor Covenant 2.1 (by reference)
├── SECURITY.md           ← vulnerability reporting
├── MEMORY.md             ← project memory: current state, decisions, backlog
├── PROJECT_MEMORY.md     ← longer archival narrative
├── setup.sh              ← top-level verifier-guided setup
├── docs/
│   ├── ARCHITECTURE.md           ← how the pieces fit together
│   └── fast-mode-validation.md   ← Fast Mode evidence log
├── scripts/
│   └── test-fresh-install.sh     ← end-to-end install/uninstall test
├── .github/
│   ├── workflows/ci.yml          ← CI: tests + sync-check + fresh-install
│   ├── ISSUE_TEMPLATE/{bug,feature}.md
│   └── pull_request_template.md
├── claude/
│   ├── .claude/skills/<skill>/SKILL.md
│   ├── scripts/                  ← lint-plan-tdd.js, audit-tdd-commits.js
│   ├── install.sh, uninstall.sh
│   └── README.md, CLAUDE.md, CHANGELOG.md, VERSION
└── opencode/
    ├── skills/<skill>/SKILL.md   ← canonical
    ├── commands/<command>.md     ← canonical
    ├── .opencode/skills/         ← mirror (kept in sync via sync-bundle.sh)
    ├── .opencode/commands/       ← mirror
    ├── scripts/                  ← lint-plan-tdd.js, audit-tdd-commits.js, sync-bundle.sh
    ├── install.sh, uninstall.sh
    └── README.md, AGENTS.md, CHANGELOG.md, VERSION
```

---

## Documentation

| File | Purpose |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit together |
| [`docs/fast-mode-validation.md`](docs/fast-mode-validation.md) | Fast Mode evidence log |
| [`ROADMAP.md`](ROADMAP.md) | What's planned, deferred, off the table |
| [`DEPENDENCIES.md`](DEPENDENCIES.md) | Pinned upstream refs (GSD, GStack, Superpowers) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to contribute |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Contributor Covenant 2.1 |
| [`claude/README.md`](claude/README.md) | Claude Code bundle: install + usage |
| [`opencode/README.md`](opencode/README.md) | OpenCode bundle: install + usage |
| [`claude/CHANGELOG.md`](claude/CHANGELOG.md) · [`opencode/CHANGELOG.md`](opencode/CHANGELOG.md) | Per-bundle release history |
| [`MEMORY.md`](MEMORY.md) · [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) | Project memory + archival narrative |

---

## Contributing

Small, focused contributions are most welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development install, testing, OpenCode mirror discipline, and the locked decisions that shape what changes get accepted.

Issue templates at `.github/ISSUE_TEMPLATE/` collect host (Claude/OpenCode/Both), install mode, repro steps, and test evidence. The PR template requires `sync-bundle.sh --check` (when OpenCode bundle touched), CHANGELOG entry, and the validated-vs-aspirational distinction.

---

## Influences

- **[GSD](https://github.com/gsd-build/get-shit-done)** — planning and execution spine. Triple Threat's pipeline structure leans heavily on GSD's phase model.
- **[GStack](https://github.com/garrytan/gstack)** — review, QA, ship workflows. Triple Threat doesn't reimplement what GStack already does well.
- **[Superpowers](https://github.com/obra/superpowers)** — TDD discipline and the two-stage code review pattern. The non-negotiable review pass in Fast Mode is theirs.
- **[andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)** — coding hygiene principles distilled from [Andrej Karpathy's observations on LLM coding pitfalls](https://x.com/karpathy/status/2015883857489522876). Shaped the Simplicity First, Surgical Changes, and Builder Hygiene checks baked into Triple Threat's plan and review stages. Complementary to Triple Threat (session-wide vs. pipeline-gate scope).

---

## License

[MIT](LICENSE). Compatible with all three composed frameworks (also MIT).
