---
name: build-doctor
description: "Read-only diagnostic. Audits the active host's Triple Threat install state across OS, required tools, bundle version, framework presence, command wrappers (OpenCode), skill registry liveness, and project-local install (if applicable). Surfaces what's missing and platform-specific fix commands. Never modifies state. Use when something feels off, when a /build-* command returns 'no matching items', or after install on a new machine."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Skill
---

# /build-doctor — Triple Threat install diagnostic

Audits install state. Reports what's present, what's missing, and the platform-specific fix command for each gap. Read-only — never modifies state.

**This is v1: install + registry checks only.** It does NOT diagnose `.planning/` corruption, broken phases, or pipeline runtime state. Those live in v2 (after real failure data).

## Host-targeting

Each distributed copy of `/build-doctor` is host-targeted:
- The Claude bundle copy checks Claude paths (`~/.claude/skills/`, `~/.claude/plugins/`)
- The OpenCode bundle copy checks OpenCode paths (`~/.config/opencode/skills/`, `~/.config/opencode/commands/`)

This SKILL.md is the Claude copy. It checks Claude paths primarily. If OpenCode also appears installed, it reports the other host briefly at the end.

## Step 1: Detect environment

Use the Bash tool to gather:

- `uname -s` → operating system (Darwin / Linux)
- `uname -m` → architecture (Apple Silicon if Darwin + arm64)
- `[ -f /proc/version ] && grep -qi microsoft /proc/version && echo WSL || echo native` → WSL detection (only on Linux)

Map to a platform support tier:
- **macOS** (Darwin) → ✅ Primary target
- **Linux (non-WSL)** → ⚠ Likely supported, not yet validated
- **Linux (WSL2)** → ⚠ Likely supported, not yet validated (WSL2)
- **Native Windows** → ❓ Untested / not recommended

## Step 2: Check required tools

For each tool, run `which <tool>` and `<tool> --version` (or equivalent):

- `git`
- `node`
- `npx`
- `bun`
- `curl`

Record present/missing and version. If a tool is missing, surface the platform-specific install command:

- **bun on macOS:** `brew install oven-sh/bun/bun`
- **bun on Linux/WSL:** `curl -fsSL https://bun.sh/install | bash` (then restart shell or `source ~/.bashrc` / `source ~/.zshrc`)
- **bun on native Windows:** Use WSL2 and follow the Linux command
- **node/npx:** Direct user to nodejs.org or their package manager
- **git:** Direct user to git-scm.com or their package manager
- **curl:** Generally pre-installed; recommend system package manager if not

## Step 3: Bundle VERSION check

If the current working directory contains a `VERSION` file at the root (i.e., the user is running `/build-doctor` from inside an unpacked bundle), read and report it. Otherwise skip silently.

## Step 4: Framework presence (active host: Claude)

Use the Bash tool to check the file system. Do NOT yet probe via the Skill tool — that's step 5.

Check for:

- **Triple Threat orchestrator:** `~/.claude/skills/build-feature/SKILL.md` exists?
- **GSD spine:** `~/.claude/skills/gsd-new-project/SKILL.md` and `~/.claude/skills/gsd-execute-phase/SKILL.md` exist?
- **GStack back-end:** `~/.claude/skills/gstack/autoplan/SKILL.md` exists?
- **Superpowers discipline:** `~/.claude/skills/superpowers-test-driven-development/SKILL.md` exists?

For each missing framework, output the install command from the bundle's README:

- **Triple Threat missing:** `cp -r <bundle>/.claude/skills/* ~/.claude/skills/`
- **GSD missing:** `npx get-shit-done-cc@latest --claude --global`
- **GStack missing:** clone repo + run `./setup --host claude` (requires `bun`)
- **Superpowers missing:** clone repo + symlink loop into `~/.claude/skills/superpowers-*/`

Reference the bundle README for the full install commands.

## Step 4.5: Triple Threat symlink integrity (read-only)

As of v0.2.4, Triple Threat ships with `~/.claude/skills/<build-* | triple-threat>` as symlinks into the unpacked Claude bundle (the canonical source). This step verifies those symlinks resolve.

Run a read-only broken-symlink scan over the discovery path. Use `find` + `test -e` only — never write or modify:

```bash
find ~/.claude/skills -maxdepth 1 -type l ! -exec test -e {} \; -print 2>/dev/null
```

For each broken symlink found, classify by name:

- **Triple Threat skill** (name matches `build-*` or `triple-threat`): ❌ — install regression. The bundle moved or the symlink target is wrong. Surface as a problem in the summary. Recommended fix:
  ```
  rm ~/.claude/skills/<name>
  ln -s "/absolute/path/to/Triple Threat - Claude/.claude/skills/<name>" \
        ~/.claude/skills/<name>
  ```
  (Adjust path to wherever the user's bundle lives.)
- **External skill** (any name starting with `gstack-`, `superpowers-`, etc., or anything else not Triple Threat): ℹ — pre-existing or external framework issue, NOT a Triple Threat failure. Report for awareness only. Recommend the user check that framework's install instructions; do not surface as a Triple Threat regression.

If any Triple Threat broken symlinks are found, mark this section ❌ in the summary. External broken symlinks alone do not mark the section as failing — they only get an informational line.

If no broken symlinks of either class are found: ✅ "Triple Threat symlinks healthy."

## Step 5: Skill registry liveness — 7 probes + base-directory classification

Attempt to invoke each of the following skills via the Skill tool, **one at a time**. For each successful load, the Skill tool result includes a `Loaded from: file:///...` base directory — capture it and classify by host prefix.

1. `build-feature`
2. `build-exec`
3. `build-debug`
4. `build-ship`
5. `triple-threat`
6. `gsd-new-project` — required for `/build-init` and the spec stage of `/build-feature`
7. `gsd-execute-phase` — required for `/build-exec` and the exec stage of `/build-feature`

Map results to states:

- **Skill load succeeds AND base dir under `~/.claude/skills/...`** → ✅ active (native Claude resolution)
- **Skill load succeeds AND base dir under `~/.config/opencode/skills/...`** → ⚠ cross-host fallback. The skill is being resolved via the user's OpenCode install. Works on this machine but will fail on Claude-only machines (no OpenCode installed). Less common than the OpenCode-side fallback but worth flagging.
- **File present in step 4 AND Skill load fails** → ⚠ registry stale → recommend restart host (Cmd+Q on Claude Code, then reopen)
- **No native or fallback file AND Skill load fails** → ❌ not installed / not routable. Triple Threat pipeline cannot run.

The Skill tool's result is what we record. The doctor skill does not catch failures programmatically — failures surface to the session and we report them as observed.

## Step 6: Project-local checks (only if applicable)

Use the Bash tool to detect project-local install directories in the current working directory:

- If `.claude/` exists in CWD → check `.claude/skills/build-feature/SKILL.md`
- If `.opencode/` exists in CWD → check `.opencode/skills/build-feature/SKILL.md` and `.opencode/commands/build-feature.md`

If neither directory exists, skip this section silently. **Do NOT inspect `.planning/`** — that's v2.

## Step 7: Other host optional

Briefly check if OpenCode also appears installed (this is the Claude copy):

- Run `[ -f ~/.config/opencode/skills/build-feature/SKILL.md ] && echo found || echo absent`

If found, output one short line:
> ℹ OpenCode also installed at `~/.config/opencode/skills/`. Run `/build-doctor` from OpenCode for a full check there.

If absent, omit this section entirely.

## Output format

Plain-text structured report, ordered most-critical first. Example:

```
Triple Threat /build-doctor — install diagnostic
Bundle VERSION: 0.1.0 (if detected)

Environment
  Host:         Claude Code
  OS:           macOS 14.5 (Apple Silicon)
  Platform:     ✅ Primary target

Required tools
  ✅ git    2.42.0
  ✅ node   v25.8.2
  ✅ npx    11.6.1
  ❌ bun    not found
     Fix (macOS):  brew install oven-sh/bun/bun
  ✅ curl   8.4.0

Framework install (active host: Claude)
  ✅ Triple Threat:  build-feature/SKILL.md present
  ✅ GSD:            gsd-new-project/SKILL.md present
  ⚠ GStack:         gstack/autoplan/SKILL.md missing
     Fix: see "Install GStack" in the bundle README (requires bun)
  ✅ Superpowers:    superpowers-test-driven-development/SKILL.md present

Skill registry liveness (7 probes)
  ✅ build-feature      loads from ~/.claude/skills/build-feature
  ✅ build-exec         loads from ~/.claude/skills/build-exec
  ⚠ build-debug        file present, registry stale → restart Claude Code (Cmd+Q)
  ✅ build-ship         loads from ~/.claude/skills/build-ship
  ✅ triple-threat      loads from ~/.claude/skills/triple-threat
  ✅ gsd-new-project    loads from ~/.claude/skills/gsd-new-project
  ✅ gsd-execute-phase  loads from ~/.claude/skills/gsd-execute-phase

Project workspace (~/projects/foo)
  ✅ .claude/skills/build-feature/SKILL.md present (project-local Claude install)

Other host
  ℹ OpenCode also installed at ~/.config/opencode/skills/.
    Run /build-doctor from OpenCode for a full check there.

Summary: 1 missing tool, 1 missing framework, 1 stale registry probe.
Apply the fix commands above, then re-run /build-doctor to verify.
```

If everything is healthy, the summary line says:
> ✅ All checks passed. Triple Threat install is healthy.

## Failure handling

If any check itself fails (Bash command errors, file globs return nothing, etc.), record that as part of the report — do not abort. The diagnostic's job is to surface the full state, including unknowns.

## What this skill does NOT do (v1)

- Does not modify any files (read-only)
- Does not auto-fix anything (surfaces commands; user runs them)
- Does not check `.planning/` health (deferred to v2 after real failure data)
- Does not validate framework versions (deferred until known-good baseline exists)
- Does not deeply audit both hosts simultaneously (active host primary; other host is a one-line acknowledgement)
- Does not replace `/build-init` for first-time setup (that's a workspace bootstrap; this is install diagnostic)
