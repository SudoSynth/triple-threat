# Triple Threat Dependencies

Pinned upstream refs for the three frameworks Triple Threat composes.

Last updated: 2026-05-01

## GSD (Get Shit Done)

- **Pinned by**: npm version
- **Pinned version**: `1.38.5`
- npm package: `get-shit-done-cc`
- Repo: https://github.com/gsd-build/get-shit-done
- Published: 2026-04-25
- **Validation status**: Selected for v0.4.0 pinning; full fresh-machine validation pending step 11.

## GStack

- **Pinned by**: git commit
- **Pinned commit**: `6e1625c0d735f97346ecc3a111d84f8527e04416`
- **Upstream version marker (commit message)**: `v1.25.0.0`
- Repo: https://github.com/garrytan/gstack
- Commit dated: 2026-05-01
- Note: GStack does not publish git tags or releases. Pinning is by commit SHA only.
- **Validation status**: Selected for v0.4.0 pinning; full fresh-machine validation pending step 11.

## Superpowers

- **Pinned by**: git tag
- **Pinned tag**: `v5.0.7`
- **Underlying commit**: `1f20bef3f59b85ad7b52718f822e37c4478a3ff5`
- Repo: https://github.com/obra/superpowers
- Tagged: 2026-03-31
- **Validation status**: Selected for v0.4.0 pinning; full fresh-machine validation pending step 11.

## Why pinned

Floating refs (`@latest`, default-branch clones) ship breaking-change risk to every Triple Threat install. A pin freezes the install instructions at a known-working substrate so an upstream breaking change doesn't break end users overnight.

GSD is currently iterating fast — 7 rc/canary releases between 1.38.5 and 1.39.0 in one week. **1.38.5** is the most recent stable that has at least 6 days of soak time, deliberately chosen over the same-day 1.39.0 to avoid pinning to a release that hasn't been validated against Triple Threat's pipeline yet.

GStack publishes no git tags or releases; pinning is by commit SHA. The commit message embeds an internal version marker (`v1.25.0.0`) for human reference.

Superpowers publishes clean semver tags. v5.0.7 is the latest stable release at the time of pinning, ~1 month old.

## How to update

1. Validate the new ref against Triple Threat's pipeline end-to-end (run `/build-feature` against a real workload, confirm review/qa/ship still work).
2. Update this file with the new ref + date + validation status.
3. Update install commands in `claude/README.md` and `opencode/README.md`.
4. Note the bump in the CHANGELOG entries for both bundles.
5. Open a PR with the dep-bump rationale.

## Rolling forward

These pins should be revisited at minimum:

- Before each Triple Threat release.
- When an upstream ships a security fix.
- When an upstream ships a feature Triple Threat wants to expose (a new GStack skill, a new Superpowers skill, etc.).
