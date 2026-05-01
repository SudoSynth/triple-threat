# Triple Threat — Claude Code Bundle

A portable bundle of the Triple Threat unified build pipeline for **Claude Code**. Combines Superpowers + GStack + GSD into a single low-friction `/build-*` command surface.

This bundle includes the orchestrator skill files, so it works even if Triple Threat isn't installed in your `~/.claude/skills/` already.

> **Note**: these instructions describe the legacy zip-based install. For the consolidated repo layout, see the [top-level README](../README.md). Full public install docs ship with v0.4.0.

---

## What's in this folder

```
Triple Threat - Claude/
├── README.md                          ← this file
├── CLAUDE.md                          ← project onboarding (auto-loads in Claude Code)
└── .claude/
    └── skills/
        ├── build-feature/SKILL.md     ← /build-feature  (full pipeline)
        ├── build-init/SKILL.md        ← /build-init     (bootstrap + map)
        ├── build-map/SKILL.md         ← /build-map      (codebase mapping)
        ├── build-spec/SKILL.md        ← /build-spec     (discuss + spec)
        ├── build-plan/SKILL.md        ← /build-plan     (autoplan + plan-phase)
        ├── build-exec/SKILL.md        ← /build-exec     (wave exec + TDD nest)
        ├── build-review/SKILL.md      ← /build-review   (review + cso + two-stage)
        ├── build-qa/SKILL.md          ← /build-qa       (browser QA, skips if no UI)
        ├── build-ship/SKILL.md        ← /build-ship     (ship + PR)
        ├── build-debug/SKILL.md       ← /build-debug    (explicit debug entry, ask-to-continue)
        └── triple-threat/             ← /triple-threat  (reference)
            ├── SKILL.md
            └── CLAUDE.md.template     ← master copy for auto-deployment
```

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

## How to use this bundle

### Option 1: Drop into a new project (per-project install)

Copy the contents of this folder into your new project:

```bash
cp -r "Triple Threat - Claude/." /path/to/your/new/project/
```

Open that project in Claude Code. The CLAUDE.md auto-loads with the onboarding doc, and the skills in `.claude/skills/` are immediately available.

This is the **portable** path — your project carries the orchestrator with it.

### Option 2: Install personally (system-wide) — **recommended**

Run the installer from the unzipped bundle root:

```bash
cd "Triple Threat - Claude"
bash install.sh
```

This creates absolute symlinks from `~/.claude/skills/<skill>` into the unzipped bundle. The skills are then "live" everywhere on your machine, and any future Triple Threat updates you apply to the bundle propagate automatically — no re-deploy step.

**Why symlinks instead of `cp -r`?** Earlier Triple Threat releases (v0.2.1 and v0.2.2) shipped with a stale Claude bundle bug because the maintainer's manual deploy missed copies. v0.2.4 eliminated that drift class by symlinking the global install into the bundle. The installer (v0.3.1+) gives end users the same architecture: edit-canonical-once, all installs follow.

The installer is **idempotent** — re-running it on an already-installed system is a no-op. It only modifies Triple Threat names; it never touches GSD, GStack, Superpowers, or any other symlinks in your skills directory.

**To remove the install later:**

```bash
cd "Triple Threat - Claude"
bash uninstall.sh
```

`uninstall.sh` removes only symlinks pointing into this bundle — it leaves alone any symlinks pointing elsewhere (e.g., another Triple Threat version, Superpowers, GStack). Pre-install backups of any files it replaced are preserved at `~/.claude/.tt-install-backup-<timestamp>/` for manual restore.

The `CLAUDE.md` and `CLAUDE.md.template` will auto-deploy to new projects when you run `/build-init` or `/build-feature`.

---

## ⚠️ Required: install the underlying frameworks

The orchestrator wraps three other frameworks. You must have them installed before `/build-feature` will actually work.

The commands below pin each framework to a known-working version. See [`DEPENDENCIES.md`](../DEPENDENCIES.md) for why these refs are pinned and how to update them.

### Install GSD (the spine)

```bash
npx get-shit-done-cc@1.38.5 --claude --global
```

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

git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
git checkout 6e1625c0d735f97346ecc3a111d84f8527e04416
./setup --host claude
```

### Install Superpowers (TDD discipline)

```bash
git clone https://github.com/obra/superpowers.git ~/.claude/plugins/superpowers
cd ~/.claude/plugins/superpowers && git checkout v5.0.7

# Symlink each Superpowers skill into ~/.claude/skills/ with prefix
cd ~/.claude/skills && for skill in ~/.claude/plugins/superpowers/skills/*/; do
  name=$(basename "$skill")
  ln -sf "$skill" "superpowers-$name"
done
```

After all three are installed, the orchestrator has everything it needs.

---

## Quick start

Once installed, in any project:

```
/build-feature add a user signup endpoint
```

That's the default verb for any feature, fix, or change. It walks the full pipeline (auto-bootstraps the workspace, runs the codebase map, walks spec → plan → exec → review → QA → ship).

For more, type `/triple-threat` in Claude Code to see the full command reference, or read the `CLAUDE.md` in this bundle.

If something looks wrong after install (a `/build-*` command returns "no matching items", or commands behave unexpectedly), run `/build-doctor` — read-only diagnostic that audits install state and surfaces the fix command for each gap.

---

## When NOT to use this bundle

- **For one-line config tweaks** — overkill. Use a regular editor.
- **For pure exploration with no commit intent** — the pipeline is designed for substantive work.
- **In a project that already has its own CLAUDE.md you care about** — the bundle's CLAUDE.md would conflict. Either rename one or merge them manually.

---

## Sharing with a teammate

If a teammate wants to use this bundle, they need:

1. **Claude Code installed** (the VSCode extension or CLI)
2. **The 3 underlying frameworks** (the install commands above)
3. **This bundle** (drop it into a project OR install the skills personally)

Once those three pieces are in place, `/build-feature` works the same as it does for you.

---

## Updating

The skills and CLAUDE.md in this bundle are snapshots. To pull in updates from your live `~/.claude/skills/`:

```bash
# Refresh skills
rm -rf "Triple Threat - Claude/.claude/skills/"*
cd "Triple Threat - Claude/.claude/skills" && for skill in build-feature build-init build-map build-spec build-plan build-exec build-review build-qa build-ship triple-threat; do
  cp -r ~/.claude/skills/$skill ./
done

# Refresh CLAUDE.md
cp ~/.claude/skills/triple-threat/CLAUDE.md.template "Triple Threat - Claude/CLAUDE.md"
```

---

## Bundle version

This bundle was created on 2026-04-26 and reflects the orchestrator state at that time.
