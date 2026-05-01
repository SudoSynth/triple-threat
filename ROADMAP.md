# Roadmap

What's planned, what's deferred, and what's explicitly off the table. This file is informational; nothing here is a commitment with a fixed date.

Last updated: 2026-05-01

## Now — v0.4.0 (pre-launch)

The first public release. Substance baseline is the verified v0.3.1 bundle; the v0.4.0 work is open-source-readiness polish, not pipeline behavior changes.

In flight:

- ✅ Steps 1–13 of the v0.4.0 plan (consolidation, identity, install paths, OSS hygiene files, CI, dep pinning, setup verifier, fresh-install test, build-doctor fix, Full Mode removal). See [`MEMORY.md`](MEMORY.md) for the full list.
- 🟡 Step 14: Fast Mode validation evidence. Gate: **5 of 10** entries in [`docs/fast-mode-validation.md`](docs/fast-mode-validation.md), with **≥2 outside this repo**. Currently **0 / 5**.
- ⏳ Step 15: README rewrite + CHANGELOG v0.4.0 entry.
- ⏳ Step 16: Tag `v0.4.0` + cut GitHub Release.

Public final-release tag is gated on the validation evidence. If feedback is needed earlier, an alpha pre-release tag (`v0.4.0-alpha.1`) may flip the repo public ahead of the gate, with the README clearly framing it as early access.

## Next — v0.4.x (post-launch)

Items that don't block launch but are tracked work:

- **Architecture explainer** — long-form `docs/ARCHITECTURE.md` covering why three frameworks compose, where to make changes, and the honest-framing principle in detail.
- **Remaining 5 Fast Mode validation slots** — continue accumulating evidence post-launch; informs any v0.4.x adjustments to the Fast Mode classifier or hard requirements.
- **OpenCode-only GSD support** — currently unsupported (see `opencode/README.md`). Either ship a working workaround against the actual upstream layout, or wait for the upstream installer to ship native OpenCode skills.
- **Release workflow** — GitHub Action that builds bundle zips on tag push and attaches them to the Release. Avoids the v0.2.3-class bundle-drift bug recurring publicly.
- **Stranger-test the install** — invite someone unfamiliar to follow the README and time them. Whatever confuses them feeds back into v0.4.x docs.
- **Legacy Desktop folder cleanup** — once the consolidated repo is proven in real usage, delete the v0.3.1-era dev folders that currently serve as rollback safety net.
- **Migrate to Node 24-runtime CI actions** — ✅ already done as launch-prep 2/9 (`actions/checkout@v6`, `actions/setup-node@v6`).

## Later — v0.5+

Speculative; only ships if the evidence supports it.

- **Reconsider Full Mode** — bring it back as a real third tier, but only with validated heavier gates (mandatory `/cso`, mandatory `/design-review`, stricter ambiguity gate, mandatory codebase mapping). The locked decision rules out a label-only Full Mode.
- **Additional host bundles** — Codex, Cursor, etc., if there's real demand and the host's skill model fits. Each bundle is a real maintenance commitment, not a copy-paste.
- **Project template depth** — richer `CLAUDE.md.template` / `AGENTS.md.template` beyond the basics, possibly per-language or per-domain.
- **Optional opt-in telemetry** — anonymous mode-classifier metrics so we can learn from real usage at scale. Strictly opt-in, never default-on.

## Locked decisions

These are settled. Don't re-litigate without strong new evidence — the rationale is in [`MEMORY.md`](MEMORY.md):

- **No separate `/build-fast` skill.** Fast Mode lives inside `build-feature` until repeated real usage proves direct invocation is needed.
- **Fast Mode is not "unverified."** TDD + Superpowers two-stage review remain non-negotiable in Fast Mode.
- **Zips contain real files, not symlinks.** Local installs may use symlinks.
- **Claude and OpenCode skill prose differs by host.** Don't blind-copy between them.
- **Public final releases are gated on real validation evidence.** No aspirational tier labels, no claims of mechanical enforcement that the model is actually honoring as prose.

## How to influence the roadmap

- **Open an issue** describing the use case, evidence, and proposed change.
- **Open a PR** — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Behavior changes need discussion in an issue first; prose / docs / fixture changes can go straight to PR.
- **For non-trivial changes**, expect a request for validation evidence. The project's culture treats validated-vs-aspirational as a hard distinction.
