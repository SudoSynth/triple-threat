---
name: build-init
description: "One-time setup for a new repo: bootstrap the .planning/ workspace and run the codebase map. Use when you want to prep a repo for future /build-feature calls without committing to actual feature work yet. Useful for inherited codebases."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
---

# /build-init — Bootstrap workspace + map

Sets up everything `/build-feature` needs in a repo, but stops short of starting any feature work. Use this when you've inherited a codebase and want it prepped for future Claude Code work, or when you want to read the codebase analysis before deciding what to build.

## Steps

### 0. Git pre-flight (HARD GATE — runs before workspace bootstrap)

Local Git history is required before any planning artifacts get written. Run these checks first.

#### 0.1 Git installed?

Run `git --version` via Bash. If exit code is non-zero or `git` is not found:

HALT. Print exactly this message (no improvisation):

```
BLOCKED: Git is not installed.
The Triple Threat pipeline requires Git for durable history.

Install Git per platform:
  macOS:        brew install git    (or: xcode-select --install)
  Linux/WSL:    sudo apt install git    (or your distro's package manager)
  Windows:      winget install Git.Git    (or download from git-scm.com)

After installing, restart your shell and re-run /build-init.
```

Exit. Do NOT proceed. Do NOT create `.planning/`.

#### 0.2 Working directory is a Git repository?

Run `git rev-parse --is-inside-work-tree 2>/dev/null` via Bash. If exit code is zero AND output is `true`, this is already a Git repo — continue to 0.3.

If not, the folder is not a Git repository. Use AskUserQuestion to ask:

> "This folder isn't a Git repository. The Triple Threat pipeline requires local Git history (specs, plans, and execution artifacts get committed under `.planning/`). Initialize one now?"

Options:
- **"Yes, initialize (Recommended)"** — run `git init -b main 2>/dev/null || (git init && git symbolic-ref HEAD refs/heads/main)`
- **"No, cancel"** — exit cleanly; the user must manually init or move to an existing repo before retrying

If "No," exit cleanly. Do NOT proceed.

#### 0.3 Safe `.gitignore`

Required entries (project-agnostic, safe across stacks):

```
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
Thumbs.db
__pycache__/
*.pyc
```

If `.gitignore` does NOT exist: create it with the required entries (one per line, trailing newline).

If `.gitignore` EXISTS: read existing entries; for each required entry not present, append it to the end of the file. **Never overwrite or reorder existing entries.**

**Do NOT add `.planning/` to `.gitignore`.** The `.planning/` directory is the durable state spine for the pipeline. GSD's convention is to track it.

#### 0.4 Initial commit (only if newly initialized)

If 0.2 just ran `git init`:

1. `git add .gitignore`.
2. Run `git status --short` to see other untracked files.
3. **If only `.gitignore` shows up** (empty folder): skip to step 5 with only `.gitignore` staged.
4. **If other untracked files show up** (non-empty / inherited folder):
   - Do NOT silently run `git add -A`.
   - Show the `git status --short` output to the user.
   - AskUserQuestion: "This folder contains existing files. Stage them in the initial commit?"
   - Options:
     - **"Commit existing project files (Recommended)"** — after consent + visibility, run `git add -A`. Visibility was the `git status --short` output; consent is this explicit selection.
     - **"Commit only `.gitignore`"** — leaves existing files untracked.
     - **"Cancel"** — exit cleanly. Do NOT proceed to create `.planning/`, `CLAUDE.md`, or run codebase mapping. The Git repo and `.gitignore` remain in place.
5. `git commit -m "Initial commit (Triple Threat pipeline init)"`.

**Invariant:** `git add -A` is allowed only after `git status --short` was shown AND the user explicitly chose "Commit existing project files." Empty-folder path commits only `.gitignore` with no prompt.

If the repo was already a Git repo: skip — no no-op commit.

#### 0.5 Record remote presence

Run `git remote -v` via Bash. Note whether a remote is configured (used downstream by `/build-ship`). No action here.

After Git pre-flight passes, continue to step 1.

### 1. Bootstrap the GSD workspace

Check if `.planning/` exists in the current working directory.
- If yes → already bootstrapped, skip to step 2.
- If no → invoke the `gsd-new-project` skill via the Skill tool (bare skill name, no leading slash) with sensible defaults (project name = current directory basename). This creates `.planning/` and the workspace metadata.

### 2. Deploy the CLAUDE.md template

Check if `CLAUDE.md` exists in the current working directory.
- If yes → leave it alone (don't overwrite the user's existing CLAUDE.md). Skip to step 3.
- If no → copy the Triple Threat CLAUDE.md template into the project root and commit it explicitly using the Bash tool:
  ```bash
  cp ~/.claude/skills/triple-threat/CLAUDE.md.template ./CLAUDE.md
  git add CLAUDE.md
  git commit -m "docs: deploy Triple Threat onboarding (CLAUDE.md)"
  ```
  Commit explicitly here — do NOT rely on a downstream `gsd-sdk query commit` to capture CLAUDE.md, because the SDK has been observed to silently drop paths from its `files:` array, leaving CLAUDE.md floating untracked. Committing in this step makes the onboarding doc durable in history immediately. The template includes the setup checklist, command quick reference, and operating principles.

### 3. Run the codebase map

Check if `.planning/codebase/` exists AND contains both `STACK.md` and `ARCHITECTURE.md`.
- If yes → mapping already done, inform user and stop.
- If no → invoke the `build-map` skill via the Skill tool. This runs the 4-parallel-agent mapping (gsd-map-codebase under the hood).

### 4. Confirm and stop

Report what was done in one or two lines:
```
✓ Workspace bootstrapped at .planning/
✓ CLAUDE.md deployed (or kept existing)
✓ Codebase map written to .planning/codebase/
Repo is ready. Run /build-feature when you have something to build.
```

Do NOT continue into spec/plan/exec stages. That's the job of `/build-feature`.

## Failure handling

If `gsd-new-project` fails: surface the error and stop. Do not attempt to manually create `.planning/` directories — let the GSD skill own its own setup.

If `/build-map` fails partway: leave whatever was written in place, report the error, and suggest re-running `/build-map` directly.
