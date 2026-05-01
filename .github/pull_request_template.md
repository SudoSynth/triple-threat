## What

<!-- One-sentence summary. Link the issue if applicable. -->

## Host

- [ ] Claude (`claude/`)
- [ ] OpenCode (`opencode/`)
- [ ] Both

## Type

- [ ] Behavior change
- [ ] Prose change (no behavior shift)
- [ ] Docs / CHANGELOG only
- [ ] Tests / fixtures
- [ ] Build / install / CI

## Checklist

- [ ] Tests pass: `node claude/scripts/lint-plan-tdd.test.js && node claude/scripts/audit-tdd-commits.test.js` (required when `claude/scripts/` or `opencode/scripts/` touched)
- [ ] OpenCode mirror in sync: `bash opencode/scripts/sync-bundle.sh --check` exits 0 (required when `opencode/skills/` or `opencode/commands/` touched)
- [ ] CHANGELOG entry added in the affected bundle (`claude/CHANGELOG.md` and/or `opencode/CHANGELOG.md`)
- [ ] Docs updated (per-bundle README.md, SKILL.md, top-level MEMORY.md as relevant)
- [ ] Honest framing: validated vs aspirational distinguished where applicable

## Validation

<!-- How was this tested? Real workload, fresh-HOME smoke, /build-doctor pass, etc. -->

## Risk

<!-- What could break? Migration considerations, install regression, prose drift. -->
