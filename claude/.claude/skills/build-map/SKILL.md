---
name: build-map
description: "Run the GSD codebase mapping pass. Spawns 4 parallel agents that analyze the codebase from different angles and write 7 cheat-sheet documents to .planning/codebase/. Use standalone when you want to refresh codebase analysis after a major refactor, or to prep an inherited repo without starting feature work."
argument-hint: "[--remap]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
---

# /build-map — Codebase mapping

Wraps `/gsd-map-codebase`. Spawns 4 parallel subagents that analyze the codebase from different angles and write structured documents to `.planning/codebase/`:

- `STACK.md` — languages, frameworks, build tools, package managers
- `ARCHITECTURE.md` — high-level structure, layers, data flow
- `STRUCTURE.md` — directory layout
- `INTEGRATIONS.md` — external services, APIs, databases
- `CONVENTIONS.md` — naming, formatting, patterns
- `TESTING.md` — test framework, where tests live
- `CONCERNS.md` — known issues, fragile areas

## Pre-flight checks

### Check 1: workspace exists
If `.planning/` does not exist, the workspace has not been bootstrapped yet. Tell the user to run `/build-init` first (which bootstraps the workspace AND runs mapping). Do not auto-bootstrap from this skill.

### Check 2: existing map
If `.planning/codebase/` already exists AND contains `STACK.md` and `ARCHITECTURE.md`:
- If `--remap` flag was passed → proceed with re-mapping (overwrites existing).
- If no flag → use AskUserQuestion to ask: "Codebase map already exists. Refresh it?"
  - "Refresh" → proceed with re-mapping
  - "Use existing" → stop, report current map age and exit

## Run the mapping

Invoke the `gsd-map-codebase` skill via the Skill tool (bare name, no leading slash). It handles its own subagent dispatch and file writes.

## Confirm

After completion, verify the 7 expected files exist in `.planning/codebase/`. Report:
```
✓ Codebase mapped: <N> files written to .planning/codebase/
   - STACK.md, ARCHITECTURE.md, STRUCTURE.md
   - INTEGRATIONS.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
```

If any expected file is missing, surface that as a partial-completion warning.
