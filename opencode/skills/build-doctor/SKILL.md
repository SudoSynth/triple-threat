---
name: build-doctor
description: "Read-only diagnostic. Audits the active host's Triple Threat install state across OS, required tools, bundle and project version, framework presence, command wrappers, skill registry liveness, and project-local install (if applicable). Surfaces what's missing and platform-specific fix commands. Never modifies state. Use when something feels off, when a /build-* command returns 'no matching items', or after install on a new machine."
---

# /build-doctor — Triple Threat install diagnostic

Audits install state. Reports what's present, what's missing, and the platform-specific fix command for each gap. Read-only — never modifies state.

**This is v1: install + registry checks only.** It does NOT diagnose `.planning/` corruption, broken phases, or pipeline runtime state. Those live in v2 (after real failure data).

## Host-targeting

Each distributed copy of `/build-doctor` is host-targeted:
- The Claude bundle copy checks Claude paths (`~/.claude/skills/`, `~/.claude/plugins/`)
- The OpenCode bundle copy checks OpenCode paths (`~/.config/opencode/skills/`, `~/.config/opencode/commands/`)

This SKILL.md is the OpenCode copy. It checks OpenCode paths primarily. If Claude Code also appears installed, it reports the other host briefly at the end.

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

## Step 3: Triple Threat bundle and project VERSION

Two distinct VERSION files may be relevant. Keep them separate; don't conflate them.

**Triple Threat bundle version.** Triple Threat installs build-doctor as a symlink (v0.2.4+); the symlink target points into the unpacked bundle. Resolve the real location to find `<bundle>/VERSION`:

- Prefer any "Loaded from" base path the host exposes for this skill. Use that as the authoritative loaded path.
- Otherwise inspect the symlink target directly. `readlink -f` is not portable on macOS by default — use plain `readlink` (one-level) or `ls -l`:

```bash
readlink ~/.config/opencode/skills/build-doctor
# or, for full visibility:
ls -l ~/.config/opencode/skills/build-doctor
```

The OpenCode symlink target points into `<bundle>/skills/build-doctor`. Walk up two levels to the bundle root and read its `VERSION`.

If detection fails (non-symlink install, missing VERSION, etc.), report `unknown` — never guess, never substitute the project VERSION.

**Project VERSION.** If the current working directory has a `VERSION` file AND that file is not the same as the Triple Threat bundle's VERSION (the user is in their own repo, not inside the bundle), read and report it as the *project* version.

**Output.**

```
Triple Threat bundle: 0.3.1
Project VERSION:      1.2.0
```

Show only the lines that are detectable. If neither is detectable, omit the section.

A common pitfall: many user projects have a `VERSION` file at root. This skill must NOT label that as the "Triple Threat bundle version" — they are different artifacts. When in doubt, prefer `unknown` for the bundle line over mislabeling the project file.

## Step 4: Framework presence (active host: OpenCode)

Use the Bash tool to check the file system. Do NOT yet probe via the Skill tool — that's step 5.

Check for:

- **Triple Threat orchestrator skill:** `~/.config/opencode/skills/build-feature/SKILL.md` exists?
- **Triple Threat command wrapper:** `~/.config/opencode/commands/build-feature.md` exists?
- **GSD command + workflow install (what `npx get-shit-done-cc@latest --opencode --global` actually produces):**
  - `~/.config/opencode/command/gsd-new-project.md` — note `command/` (singular), not `commands/`
  - `~/.config/opencode/command/gsd-execute-phase.md`
  - `~/.config/opencode/get-shit-done/workflows/new-project.md`
  - `~/.config/opencode/get-shit-done/workflows/execute-phase.md`
- **GSD native Skill artifacts (preferred but not produced by current installer):** `~/.config/opencode/skills/gsd-new-project/SKILL.md` and `~/.config/opencode/skills/gsd-execute-phase/SKILL.md` exist? If absent, the Triple Threat pipeline depends on cross-host fallback to `~/.claude/skills/` for GSD skill resolution. Step 5 verifies whether that fallback actually works.
- **GStack back-end:** `~/.config/opencode/skills/gstack/autoplan/SKILL.md` exists?
- **Superpowers discipline:** `~/.config/opencode/skills/superpowers-test-driven-development/SKILL.md` exists?

**Important:** Command/workflow files present + native Skill files absent does NOT mean GSD is broken — it means the pipeline relies on cross-host fallback. Step 5's GSD probes are the real readiness check. Do not mark GSD green based on Step 4 alone.

For each missing framework, output the install command from the bundle's README:

- **Triple Threat skills missing:** `cp -r <bundle>/skills/* ~/.config/opencode/skills/`
- **Triple Threat command wrappers missing:** `cp <bundle>/commands/*.md ~/.config/opencode/commands/`
- **GSD missing:** `npx get-shit-done-cc@latest --opencode --global`
- **GStack missing:** clone repo + run `./setup --host opencode` (requires `bun`)
- **Superpowers missing:** clone repo + symlink loop into `~/.config/opencode/skills/superpowers-*/`

Reference the bundle README for the full install commands.

## Step 4.5: Triple Threat symlink integrity (read-only)

As of v0.2.4, Triple Threat ships with `~/.config/opencode/skills/<build-* | triple-threat>` and `~/.config/opencode/commands/build-*.md` as symlinks into the unpacked OpenCode bundle (the canonical source). This step verifies those symlinks resolve.

Run a read-only broken-symlink scan over the discovery paths. Use `find` + `test -e` only — never write or modify:

```bash
find ~/.config/opencode/skills ~/.config/opencode/commands -maxdepth 1 -type l ! -exec test -e {} \; -print 2>/dev/null
```

For each broken symlink found, classify by name:

- **Triple Threat skill or wrapper** (name matches `build-*` or `triple-threat`): ❌ — install regression. The bundle moved or the symlink target is wrong. Surface as a problem in the summary. Recommended fix:
  ```
  # for a broken skill symlink:
  rm ~/.config/opencode/skills/<name>
  ln -s "/path/to/your/triple-threat/opencode/skills/<name>" \
        ~/.config/opencode/skills/<name>

  # for a broken command wrapper symlink:
  rm ~/.config/opencode/commands/<name>.md
  ln -s "/path/to/your/triple-threat/opencode/commands/<name>.md" \
        ~/.config/opencode/commands/<name>.md
  ```
  (Replace `/path/to/your/triple-threat` with your clone path. `triple-threat` is the recommended folder name, but you can clone wherever you like.)
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

- **Skill load succeeds AND base dir under `~/.config/opencode/skills/...`** → ✅ active (native OpenCode resolution)
- **Skill load succeeds AND base dir under `~/.claude/skills/...`** → ⚠ cross-host fallback. The skill is being resolved via the user's Claude install. Works on this machine but will fail on OpenCode-only machines (no Claude installed). Flag specifically for `gsd-new-project` and `gsd-execute-phase` since they're the most likely victims of GSD's current OpenCode installer gap.
- **File present in step 4 AND Skill load fails** → ⚠ registry stale → recommend restart OpenCode TUI (the host re-scans skills on restart)
- **No native or fallback file AND Skill load fails** → ❌ not installed / not routable. Triple Threat pipeline cannot run.

The Skill tool's result is what we record. The doctor skill does not catch failures programmatically — failures surface to the session and we report them as observed.

## Step 6: Project-local checks (only if applicable)

Use the Bash tool to detect project-local install directories in the current working directory:

- If `.opencode/` exists in CWD → check `.opencode/skills/build-feature/SKILL.md` AND `.opencode/commands/build-feature.md`
- If `.claude/` exists in CWD → check `.claude/skills/build-feature/SKILL.md`

If neither directory exists, skip this section silently. **Do NOT inspect `.planning/`** — that's v2.

## Step 7: Other host optional

Briefly check if Claude Code also appears installed (this is the OpenCode copy):

- Run `[ -f ~/.claude/skills/build-feature/SKILL.md ] && echo found || echo absent`

If found, output one short line:
> ℹ Claude Code also installed at `~/.claude/skills/`. Run `/build-doctor` from Claude Code for a full check there.

If absent, omit this section entirely.

## Output format

Plain-text structured report, ordered most-critical first. Example:

```
Triple Threat /build-doctor — install diagnostic
Triple Threat bundle: 0.3.1
Project VERSION:      1.2.0   (omitted if no VERSION file at CWD)

Environment
  Host:         OpenCode
  OS:           Linux (WSL2)
  Platform:     ⚠ Likely supported, not yet validated (WSL2)

Required tools
  ✅ git    2.42.0
  ✅ node   v25.8.2
  ✅ npx    11.6.1
  ❌ bun    not found
     Fix (Linux/WSL): curl -fsSL https://bun.sh/install | bash
                       (then restart shell or source ~/.bashrc)
  ✅ curl   8.4.0

Framework install (active host: OpenCode)
  ✅ Triple Threat skill:    build-feature/SKILL.md present
  ✅ Triple Threat command:  build-feature.md wrapper present
  ⚠ GSD command/workflow:   present (gsd-new-project.md, execute-phase.md, workflows present)
  ⚠ GSD native skills:      missing at ~/.config/opencode/skills/gsd-*/SKILL.md
     → Pipeline relies on cross-host fallback. Verified in Step 5.
     → If fallback fails, see "GSD OpenCode caveat" in bundle README.
  ✅ GStack:                 gstack/autoplan/SKILL.md present
  ✅ Superpowers:            superpowers-test-driven-development/SKILL.md present

Skill registry liveness (7 probes)
  ✅ build-feature      loads from ~/.config/opencode/skills/build-feature
  ✅ build-exec         loads from ~/.config/opencode/skills/build-exec
  ⚠ build-debug        file present, registry stale → restart OpenCode TUI
  ✅ build-ship         loads from ~/.config/opencode/skills/build-ship
  ✅ triple-threat      loads from ~/.config/opencode/skills/triple-threat
  ⚠ gsd-new-project    loads from ~/.claude/skills/gsd-new-project (cross-host fallback)
     → Works because Claude is also installed; would fail on OpenCode-only machines.
  ⚠ gsd-execute-phase  loads from ~/.claude/skills/gsd-execute-phase (cross-host fallback)
     → Same caveat as gsd-new-project.

Project workspace (~/projects/foo)
  ✅ .opencode/skills/build-feature/SKILL.md present (project-local OpenCode install)
  ✅ .opencode/commands/build-feature.md present (project-local OpenCode wrapper)

Other host
  ℹ Claude Code also installed at ~/.claude/skills/.
    Run /build-doctor from Claude Code for a full check there.

Summary: 1 missing tool, 1 stale registry probe, 2 GSD skills resolving via cross-host fallback.
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
