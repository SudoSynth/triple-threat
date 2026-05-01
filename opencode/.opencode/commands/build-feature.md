---
description: Run the Triple Threat full feature pipeline
agent: build
---

Load the `build-feature` skill with the Skill tool and execute it as the Triple Threat `/build-feature` orchestrator.

User arguments:
`$ARGUMENTS`

If the skill is not available, stop and report that `build-feature` is not installed at `.opencode/skills/build-feature/SKILL.md` or `~/.config/opencode/skills/build-feature/SKILL.md`. Do not replace the orchestrator with an ad hoc implementation.
