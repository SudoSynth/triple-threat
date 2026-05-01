---
description: Run Triple Threat browser QA when UI is present
agent: build
---

Load the `build-qa` skill with the Skill tool and execute it as the Triple Threat `/build-qa` orchestrator.

User arguments:
`$ARGUMENTS`

If the skill is not available, stop and report that `build-qa` is not installed at `.opencode/skills/build-qa/SKILL.md` or `~/.config/opencode/skills/build-qa/SKILL.md`.
