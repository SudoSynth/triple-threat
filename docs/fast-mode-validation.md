# Fast Mode Validation Log

Empirical evidence for whether Triple Threat's Fast Mode prose holds under real-world use.

## Why this file exists

v0.3.0 introduced Fast Mode inside `/build-feature`: focused TDD + Superpowers two-stage review + commit, skipping spec/plan/qa/ship for small precise tasks. The mode is **prose-level** — read by the model and applied at runtime, not deterministic gates. Until it has been used on real workloads, the claim "Fast Mode keeps discipline without ceremony" is theoretical.

This log captures real Fast Mode runs. Each entry is empirical evidence (pass / partial / fail) toward validating the mode.

## v0.4.0 launch gate

| Requirement | Threshold |
|---|---|
| Total slots tracked | **10** |
| Required for v0.4.0 launch | **≥ 5** completed |
| Outside this repo | **≥ 2** of those 5 should be Fast Mode runs in projects other than `triple-threat` itself, to avoid self-referential validation |
| v0.4.1 evidence | The remaining 5 slots continue to fill post-launch and inform any v0.4.1 adjustments |

If validation surfaces issues (Fast Mode prose drift, requirements skipped, ambiguous routing, etc.), the v0.4.0 launch should either incorporate fixes or honestly disclaim the issue in `claude/CHANGELOG.md` and `opencode/CHANGELOG.md` per the project's "honest framing" principle.

## Status

- Completed: **0 / 10**
- v0.4.0 gate: **0 / 5** — ⚠ not met
- Outside-repo entries: **0 / 2** — ⚠ not met
- PASS rate: —

(Update this block whenever an entry is added.)

## How to add an entry

Append a new `## Run N — YYYY-MM-DD` section to the **Runs** list below using this template, then update the **Status** block above.

```markdown
## Run N — YYYY-MM-DD

- **Repo / project**: 
- **Task summary**: 
- **Fast Mode eligibility signals**: which heuristics from `build-feature/SKILL.md` matched (precise spec, ≤2 files, no domain risk, etc.)
- **Files changed**: list (count)
- **Failing test first**: yes / N/A (doc-only or config-only) / SKIPPED ⚠
- **Superpowers two-stage review**: ran / SKIPPED ⚠
- **Other verification**: focused tests, smoke runs, manual checks, etc.
- **Result**: PASS / PARTIAL / FAIL
- **Notes**: what worked, what was awkward, whether the task should have routed to Standard instead
```

A run is **PASS** only if both Fast Mode hard requirements were honored:

- Failing test before implementation (unless doc-only or config-only)
- Superpowers two-stage review on the diff

A run that produces correct code while skipping either is **PARTIAL** at best — the SKILL.md treats those as non-negotiable.

## Runs

*No runs yet. First entry will land here.*
