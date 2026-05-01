# Triple Threat Architecture

How the pieces fit together. Read this before making non-trivial changes.

## What Triple Threat is

A unified `/build-*` command surface that composes three independent frameworks behind one entry point (`/build-feature <description>`). Triple Threat itself is **prose-level orchestration** — skill files (`SKILL.md`) read by an AI coding host (Claude Code or OpenCode) at runtime, plus two real Node scripts (`lint-plan-tdd.js`, `audit-tdd-commits.js`) that enforce mechanical TDD plan-shape and commit-shape checks.

It is not a framework. It is the connective tissue that lets three frameworks compose without each one's quirks leaking into the user-facing workflow.

## The three composed frameworks

| Framework | What it owns | Where it lives | License |
|---|---|---|---|
| **GSD** (Get Shit Done) | The planning + execution spine. Owns `.planning/` state. Provides `gsd-discuss-phase`, `gsd-spec-phase`, `gsd-plan-phase`, `gsd-execute-phase`, `gsd-pause-work`, `gsd-resume-work`, etc. | npm `get-shit-done-cc@1.38.5`. Source: `gsd-build/get-shit-done`. | MIT |
| **GStack** | Review, QA, ship, browser workflows, and product/eng/security review skills. Provides `/review`, `/codex`, `/cso`, `/qa`, `/ship`, `/canary`, `/autoplan`, etc. Bun runtime. | `garrytan/gstack` (commit pinned). | MIT |
| **Superpowers** | TDD discipline, planning rigor, code review pairs (`requesting-code-review` + `receiving-code-review` for anti-sycophancy). | `obra/superpowers v5.0.7`. | MIT |

See [`DEPENDENCIES.md`](../DEPENDENCIES.md) for pin rationale and update process.

## How `/build-feature` orchestrates them

```
user: /build-feature <description>
  │
  ▼
[pre-flight: git, workspace bootstrap, codebase map]
  │
  ▼
[bug-fix detection — diverts to /build-debug if applicable]
  │
  ▼
[tier classification: Fast or Standard]
  │
  ├── Fast ─────► focused TDD ─► Superpowers two-stage review ─► commit
  │                                                                 │
  │                                                                 ▼
  │                                                              (optional /build-ship)
  │
  └── Standard ─► /build-spec  (GSD discuss + spec phases)
                ─► /build-plan  (GStack /autoplan + GSD plan phase, lint-plan-tdd gate)
                ─► /build-exec  (wave execution, audit-tdd-commits post-run)
                ─► /build-review (Karpathy hygiene → GStack /review → Superpowers two-stage review)
                ─► /build-qa     (GStack browser test-fix loop, UI only)
                ─► /build-ship   (VERSION + CHANGELOG + commit + push + PR)
```

Each `/build-*` skill is a thin orchestrator:

- It invokes underlying framework skills via the host's Skill tool (Claude) or skill-loading mechanism (OpenCode).
- It applies Triple Threat-specific prose constraints (TDD discipline, hygiene checks, honest-framing requirements).
- It does not duplicate the underlying frameworks' logic.

## Mode classification

`build-feature` reads the request and routes to one of two tiers:

- **Fast** — small, precise, low-risk tasks. Skips spec/plan/qa/ship; runs focused TDD + Superpowers two-stage review + commit. Hard requirements (failing test first, two-stage review) are non-negotiable; "Fast" does not mean "unverified."
- **Standard** — everything else, including risky and demanding work. Runs the full 6-stage pipeline.

Risky / security / migration / large-UI work routes to **Standard**, not Fast. There is no longer a third "Full" tier — see step 13 in [`MEMORY.md`](../MEMORY.md) for the rationale.

The classifier is heuristic prose, not deterministic. It uses cheap signals (precise spec, file count, domain keywords) and falls back to `AskUserQuestion` when the signals are mixed. Default is Standard.

## Mechanical enforcement vs prose-level discipline

Triple Threat distinguishes carefully between mechanically enforced behavior and prose-level guidance read by the model:

| Mechanically enforced (deterministic) | Prose-level (model honors at runtime) |
|---|---|
| `lint-plan-tdd.js` rejects PLAN.md without TDD shape (Node script, exit codes) | Fast Mode hard requirements (failing test first, two-stage review) |
| `audit-tdd-commits.js` post-run audit (Node script) | Mode classification rule |
| `sync-bundle.sh --check` blocks OpenCode mirror drift | Hygiene checks in `/build-review` |
| CI workflow runs all the above on every push and PR | Honest-framing principle in CHANGELOG entries |
| `install.sh` post-install verification | Skip criteria for `/autoplan` |

When changing behavior, name which kind of enforcement you're adding. Don't claim mechanical enforcement where the model is honoring prose — the project's "honest framing" culture rejects this conflation. Every changelog entry to date distinguishes "validated" from "aspirational."

## Repo layout

```
triple-threat/
├── README.md, ROADMAP.md, MEMORY.md, PROJECT_MEMORY.md
├── LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
├── DEPENDENCIES.md
├── setup.sh                            ← top-level verifier
├── scripts/
│   └── test-fresh-install.sh           ← end-to-end install/uninstall test
├── docs/
│   ├── ARCHITECTURE.md                 ← this file
│   └── fast-mode-validation.md         ← Fast Mode evidence log
├── claude/
│   ├── .claude/skills/<skill>/SKILL.md ← Claude bundle skills
│   ├── scripts/                        ← lint-plan-tdd.js, audit-tdd-commits.js + tests + fixtures
│   ├── install.sh, uninstall.sh
│   ├── README.md, CLAUDE.md, CHANGELOG.md, VERSION
└── opencode/
    ├── skills/<skill>/SKILL.md         ← canonical OpenCode skills
    ├── commands/<command>.md           ← canonical OpenCode command wrappers
    ├── .opencode/skills/               ← mirror (kept in sync via scripts/sync-bundle.sh)
    ├── .opencode/commands/             ← mirror
    ├── scripts/                        ← bundle-internal scripts including sync-bundle.sh
    ├── install.sh, uninstall.sh
    ├── README.md, AGENTS.md, CHANGELOG.md, VERSION
```

The `claude/` and `opencode/` bundles are siblings: most skill prose is intentionally identical, but each has host-specific differences (Claude's Skill tool vs OpenCode's command/skill split). Don't blind-copy between them.

## OpenCode mirror discipline

OpenCode ships skills in two places:

- `opencode/skills/` and `opencode/commands/` (canonical) — used when the user installs to `~/.config/opencode/`.
- `opencode/.opencode/skills/` and `opencode/.opencode/commands/` (mirror) — used when the bundle is dropped into a project's `.opencode/`.

Both must contain identical content, but symlinks don't ship cleanly in zips, so they're real copies. `opencode/scripts/sync-bundle.sh` keeps them in sync; `--check` mode reports drift without modifying anything. CI requires `--check` to pass on every push.

When editing OpenCode skills, edit the canonical (`opencode/skills/`), then run `bash opencode/scripts/sync-bundle.sh` to propagate. The CI sync-check will catch drift if you forget.

## Where to make changes

| Change type | Where to edit |
|---|---|
| Pipeline behavior (TDD, classification, review orchestration, install flow) | `claude/.claude/skills/<skill>/SKILL.md` AND `opencode/skills/<skill>/SKILL.md`. Run sync-bundle.sh after OpenCode edit. |
| Host-specific (Claude `Skill` tool quirks, OpenCode command/skill split) | One bundle only. Note "Claude only" or "OpenCode only" in the PR. |
| TDD plan linter logic | `claude/scripts/lint-plan-tdd.js` and `opencode/scripts/lint-plan-tdd.js` (both are real-file copies; both must change together). Tests in same dirs. |
| TDD commit auditor | Same pattern as plan linter. |
| Top-level orchestration prose (this file, README, CONTRIBUTING) | Repo root. |
| Per-bundle install / uninstall | `<bundle>/install.sh` / `<bundle>/uninstall.sh` (each is bundle-local). |

## Versioning

Each bundle has its own `VERSION` file (`claude/VERSION`, `opencode/VERSION`) — currently `0.3.1`, the substance baseline. The repo's overall version is what gets tagged on the consolidated repo (`v0.4.0`, `v0.4.0-alpha.1`, etc.).

`/build-doctor` distinguishes *bundle* VERSION from *project* VERSION — a user's project may have its own `VERSION` file at root, which must not be conflated with Triple Threat's bundle version. See `<bundle>/.claude/skills/build-doctor/SKILL.md` Step 3.

## Honest-framing principle

Every release note distinguishes:

- **Validated** behavior — proven against real runs (smoke tests, real workloads, fresh-machine installs)
- **Aspirational** behavior — documented intent without a working test, marked clearly so users don't form false expectations

This is non-negotiable. The v0.2.3 bundle-drift incident, the v0.3.0 honest "Full Mode currently equals Standard" framing, and the v0.4.0 Fast Mode validation gate are all consequences of taking this principle seriously.

If you're adding a feature, write the changelog entry first. If the entry has to say "validated" without you actually validating it, you have a process problem before you have a code problem.

## Locked decisions (don't re-litigate)

See the **Locked decisions** section in [`MEMORY.md`](../MEMORY.md). Highlights:

- No separate `/build-fast` skill — Fast Mode lives inside `build-feature`.
- Fast Mode requires TDD + Superpowers two-stage review. Fast ≠ unverified.
- Zips contain real files; local installs may use symlinks; OpenCode project-local installs are real copies.
- Claude and OpenCode prose differs intentionally — don't blind-copy.
- Public final-release tags are gated on validation evidence in `docs/fast-mode-validation.md`.

These are settled. Override them only with strong new evidence and an issue describing what changed.
