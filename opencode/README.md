# Triple Threat — OpenCode Bundle

A portable bundle of the Triple Threat unified build pipeline adapted for **OpenCode**. Combines Superpowers + GStack + GSD into a single low-friction `/build-*` command surface.

This bundle includes both OpenCode command files and orchestrator skill files. Both are required. It also includes a project-local `.opencode/` copy so the folder can be used directly as an OpenCode project base.

> **Note**: these instructions describe the legacy zip-based install. For the consolidated repo layout, see the [top-level README](../README.md). Full public install docs ship with v0.4.0.

---

## Important: OpenCode commands and skills are separate

OpenCode does **not** turn `SKILL.md` files into slash commands. It has two extension surfaces:

- `.opencode/commands/<name>.md` or `~/.config/opencode/commands/<name>.md` creates user-facing slash commands like `/build-feature`.
- `.opencode/skills/<name>/SKILL.md` or `~/.config/opencode/skills/<name>/SKILL.md` creates agent-loadable skills used by those commands.

The `/build-*` commands in this bundle are thin wrappers. They tell OpenCode to load the matching skill through the Skill tool, then the skill runs the Triple Threat orchestration.

---

## What's in this folder

```
Triple Threat - OpenCode/
├── README.md                          ← this file
├── AGENTS.md                          ← project onboarding (drop into your project root)
├── .opencode/                         ← project-local install, works when opened directly
│   ├── commands/                      ← OpenCode discovers /build-* here
│   └── skills/                        ← OpenCode discovers skills here
├── commands/                          ← install to ~/.config/opencode/commands/
│   ├── build-feature.md               ← /build-feature  (full pipeline)
│   ├── build-init.md                  ← /build-init     (bootstrap + map)
│   ├── build-map.md                   ← /build-map      (codebase mapping)
│   ├── build-spec.md                  ← /build-spec     (discuss + spec)
│   ├── build-plan.md                  ← /build-plan     (autoplan + plan-phase)
│   ├── build-exec.md                  ← /build-exec     (wave exec + TDD nest)
│   ├── build-review.md                ← /build-review   (review + cso + two-stage)
│   ├── build-qa.md                    ← /build-qa       (browser QA, skips if no UI)
│   ├── build-ship.md                  ← /build-ship     (ship + PR)
│   ├── build-debug.md                 ← /build-debug    (explicit debug entry)
│   └── triple-threat.md               ← /triple-threat  (reference)
└── skills/
    ├── build-feature/SKILL.md         ← skill loaded by /build-feature
    ├── build-init/SKILL.md            ← skill loaded by /build-init
    ├── build-map/SKILL.md             ← skill loaded by /build-map
    ├── build-spec/SKILL.md            ← skill loaded by /build-spec
    ├── build-plan/SKILL.md            ← skill loaded by /build-plan
    ├── build-exec/SKILL.md            ← skill loaded by /build-exec
    ├── build-review/SKILL.md          ← skill loaded by /build-review
    ├── build-qa/SKILL.md              ← skill loaded by /build-qa
    ├── build-ship/SKILL.md            ← skill loaded by /build-ship
    ├── build-debug/SKILL.md           ← skill loaded by /build-debug
    └── triple-threat/                 ← skill loaded by /triple-threat
        ├── SKILL.md
        └── AGENTS.md.template         ← master copy for auto-deployment
```

The `.opencode/` directory is the self-contained project-local install. The top-level `commands/` and `skills/` directories are the portable source copies for global install or syncing.

---

## Platform Support

| Platform | Status | Notes |
|---|---|---|
| macOS (Intel + Apple Silicon) | ✅ Primary target | Apple Silicon may show codesigning/quarantine warnings on first GStack browser run. If needed, remove quarantine from the affected binary with `xattr -d com.apple.quarantine <path>`. |
| Linux | ⚠️ Likely supported, not yet validated | Underlying frameworks are expected to work on Linux. Install uses curl-based Bun setup instead of Homebrew. GStack cookie import features that depend on macOS Keychain will not work; core pipeline skills should. |
| Windows via WSL2 | ⚠️ Likely supported, not yet validated | Treat as Linux from the orchestrator's perspective. Same Linux caveats apply. |
| Native Windows (no WSL) | ❓ Untested / not recommended | Some underlying workflows assume bash, POSIX paths, and symlink-compatible installs. Use WSL2 for now. Native Windows support may be investigated later. |

**Validated platforms:** macOS only at v0.1.0. Linux and WSL2 support are documented based on framework expectations but have not yet been exercised end-to-end.

---

## Install

### Global install (recommended)

Run the installer from the unzipped bundle root:

```bash
cd "Triple Threat - OpenCode"
bash install.sh
```

This creates absolute symlinks for both skills (`~/.config/opencode/skills/<skill>`) and command wrappers (`~/.config/opencode/commands/<skill>.md`) pointing into the unzipped bundle. Restart the OpenCode TUI after install so it rescans command files. Now `/build-feature`, `/triple-threat`, and the other commands work in **every** OpenCode project on your machine.

**Why symlinks instead of `cp`?** Earlier Triple Threat releases used `cp` and produced wrapper-text drift across releases. v0.2.4 eliminated that drift class by symlinking the global install into the bundle. The installer (v0.3.1+) gives end users the same architecture: edit-canonical-once, all installs follow.

The installer is **idempotent** — re-running it on an already-installed system is a no-op. It only modifies Triple Threat names; it never touches GSD, GStack, Superpowers, or any other symlinks in your skills/commands directories.

**To remove the install later:**

```bash
cd "Triple Threat - OpenCode"
bash uninstall.sh
```

`uninstall.sh` removes only symlinks pointing into this bundle — it leaves alone any symlinks pointing elsewhere (e.g., another Triple Threat version). Pre-install backups of any files it replaced are preserved at `~/.config/opencode/.tt-install-backup-<timestamp>/` for manual restore.

### Project-local install (copy `.opencode/` into a project)

The installer scripts only handle global installs. For a per-project install, copy the bundle's `.opencode/` directory into your project root:

```bash
cp -r "Triple Threat - OpenCode/.opencode/" /path/to/your/project/
```

Project-local installs are self-contained and ship as real files (not symlinks). When you open the project in OpenCode, the local copy takes precedence.

### Onboarding doc

To use the project onboarding doc in a specific project, drop `AGENTS.md` into the project root:

```bash
cp "Triple Threat - OpenCode/AGENTS.md" /path/to/your/project/
```

OpenCode auto-loads it on session start.

---

## ⚠️ Required: install the underlying frameworks

The orchestrator wraps three other frameworks. You must have them installed before `/build-feature` will actually work.

The commands below pin each framework to a known-working version. See [`DEPENDENCIES.md`](../DEPENDENCIES.md) for why these refs are pinned and how to update them.

### Install GSD (the spine)

```bash
npx get-shit-done-cc@1.38.5 --opencode --global
```

**Caveat: GSD's OpenCode installer ships command wrappers, not native OpenCode skills.**

As of v0.1.0 of this bundle, `npx get-shit-done-cc@1.38.5 --opencode --global` produces:
- `~/.config/opencode/command/gsd-*.md` (command wrappers — note `command/` singular)
- `~/.config/opencode/get-shit-done/workflows/*.md` (workflow content)

It does NOT produce `~/.config/opencode/skills/gsd-*/SKILL.md`. The Triple Threat pipeline calls `gsd-new-project` and `gsd-execute-phase` via the Skill tool, so:

- **If Claude Code is also installed** with GSD at `~/.claude/skills/gsd-*/`, OpenCode resolves the skills via cross-host fallback and the pipeline works. `/build-doctor` will flag this as `⚠ cross-host fallback`.
- **If OpenCode is the only host installed**, those Skill calls will fail and `/build-feature` cannot complete its spec or exec stages.

**OpenCode-only GSD is currently unsupported.**

A previous workaround in this README cloned a GSD source repo and copied skill directories. That no longer works. The repo URL it referenced (`garrytan/get-shit-done-cc`) does not exist, and the actual upstream (`gsd-build/get-shit-done`) does not ship the `skills/gsd-*` layout the copy step assumed. Both verified against the GitHub API.

Today's options for an OpenCode-only setup:

1. **Recommended**: also install Claude Code. OpenCode resolves the missing GSD skills via cross-host fallback from `~/.claude/skills/gsd-*/`. `/build-doctor` flags this as `⚠ cross-host fallback`; the pipeline works.
2. **Or**: stay OpenCode-only and accept that `/build-feature` will fail at the spec and exec stages until the upstream GSD installer ships native OpenCode skills.

`bash setup.sh --opencode` from the Triple Threat repo prints this caveat at install time and asks for confirmation before continuing.

A working OpenCode-only install is tracked as a future improvement — open an issue if you want to help validate it.

### Install GStack (review / QA / ship)

```bash
# Bun is required — install if not present.
# macOS:
brew install oven-sh/bun/bun
# Linux / WSL2:
curl -fsSL https://bun.sh/install | bash
# Restart your shell, or run: source ~/.bashrc
# If you use zsh, run: source ~/.zshrc
# Native Windows is not recommended for v0.1.0.
# Use WSL2 and follow the Linux / WSL2 commands.

mkdir -p ~/.config/opencode/skills
git clone https://github.com/garrytan/gstack.git ~/.config/opencode/skills/gstack
cd ~/.config/opencode/skills/gstack
git checkout 6e1625c0d735f97346ecc3a111d84f8527e04416
./setup --host opencode
```

### Install Superpowers (TDD discipline)

```bash
mkdir -p ~/.config/opencode/plugins
git clone https://github.com/obra/superpowers.git ~/.config/opencode/plugins/superpowers
cd ~/.config/opencode/plugins/superpowers && git checkout v5.0.7

# Symlink each Superpowers skill into ~/.config/opencode/skills/ with prefix
cd ~/.config/opencode/skills && for skill in ~/.config/opencode/plugins/superpowers/skills/*/; do
  name=$(basename "$skill")
  ln -sf "$skill" "superpowers-$name"
done
```

After all three are installed (plus the Triple Threat commands and skills above), the orchestrator has everything it needs.

---

## Quick start

Once installed, in any project:

```
/build-feature add a user signup endpoint
```

Or if the project has the AGENTS.md deployed:

```
start
```

That triggers the onboarding protocol — verifies all frameworks are installed, shows the command reference, and asks what you want to do.

For more, type `/triple-threat` in OpenCode to see the full architecture overview, or read the `AGENTS.md` in this bundle.

If something looks wrong after install (a `/build-*` command returns "no matching items", or commands behave unexpectedly), run `/build-doctor` — read-only diagnostic that audits install state and surfaces the fix command for each gap.

---

## When NOT to use this bundle

- **For one-line config tweaks** — overkill. Use a regular editor.
- **For pure exploration with no commit intent** — the pipeline is designed for substantive work.
- **In a project that already has its own AGENTS.md you care about** — would conflict. Either rename one or merge them manually.

---

## Differences from the Claude Code bundle

| Concern | Claude Code bundle | OpenCode bundle |
|---|---|---|
| Slash command files | Built into Claude Code skill command surface | `.opencode/commands/*.md` or `~/.config/opencode/commands/*.md` |
| Skill install path | `~/.claude/skills/` | `.opencode/skills/` or `~/.config/opencode/skills/` |
| Onboarding filename | `CLAUDE.md` | `AGENTS.md` |
| GSD install flag | `--claude` | `--opencode` |
| GStack install flag | `--host claude` | `--host opencode` |
| Slash command discovery | Skill name doubles as command | Command file forwards to skill |

If your OpenCode setup uses different conventions, edit the command files, SKILL.md files, and AGENTS.md.template paths to match.

---

## Sharing with a teammate

If a teammate wants to use this bundle, they need:

1. **OpenCode installed**
2. **The 3 underlying frameworks** (the install commands above)
3. **This bundle's commands** copied to `~/.config/opencode/commands/`
4. **This bundle's skills** copied to `~/.config/opencode/skills/`

Once those four pieces are in place, `/build-feature` should work the same as it does for you.

---

## Bundle version

This bundle was created on 2026-04-26 and reflects the orchestrator state at that time. Paths adapted from the Claude Code source bundle.
