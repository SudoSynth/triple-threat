#!/usr/bin/env bash
# install.sh — Triple Threat (OpenCode) symlink-based installer.
#
# Resolves bundle root from script location (portable, works wherever you unzip).
# Installs:
#   - 12 skills:   ~/.config/opencode/skills/<skill>      → BUNDLE_ROOT/skills/<skill>
#   - 11 wrappers: ~/.config/opencode/commands/<skill>.md → BUNDLE_ROOT/commands/<skill>.md
# For each:
#   - If destination is already the correct symlink → skip (idempotent)
#   - If destination exists otherwise → move to centralized timestamped backup
#   - Create absolute symlink into this bundle
# Never touches GSD, GStack, Superpowers, or any non-Triple-Threat path.
# Re-running on an already-installed system is a no-op.
#
# Project-local installs are NOT handled by this script — copy `.opencode/`
# into your project root manually if you want a per-project install.
#
# Usage:  bash install.sh
# Uninstall:  bash uninstall.sh

set -euo pipefail

BUNDLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$BUNDLE_ROOT/skills"
COMMANDS_SRC="$BUNDLE_ROOT/commands"
SKILLS_DST="$HOME/.config/opencode/skills"
COMMANDS_DST="$HOME/.config/opencode/commands"

TT_SKILLS=(
  build-debug
  build-doctor
  build-exec
  build-feature
  build-init
  build-map
  build-plan
  build-qa
  build-review
  build-ship
  build-spec
  triple-threat
)

TT_WRAPPERS=(
  build-debug
  build-doctor
  build-exec
  build-feature
  build-init
  build-map
  build-plan
  build-qa
  build-review
  build-ship
  build-spec
)

if [ ! -d "$SKILLS_SRC" ]; then
  echo "ERROR: bundle skills source missing at $SKILLS_SRC" >&2
  echo "       Are you running this from the unzipped bundle root?" >&2
  exit 2
fi
if [ ! -d "$COMMANDS_SRC" ]; then
  echo "ERROR: bundle commands source missing at $COMMANDS_SRC" >&2
  exit 2
fi

TIMESTAMP="$(date +%Y-%m-%d-%H%M%S)"
BACKUP_DIR="$HOME/.config/opencode/.tt-install-backup-$TIMESTAMP"

mkdir -p "$SKILLS_DST" "$COMMANDS_DST"

created=0
skipped=0
backed_up=0
errors=0

echo "Triple Threat (OpenCode) install"
echo "  Bundle:        $BUNDLE_ROOT"
echo "  Skills target: $SKILLS_DST"
echo "  Cmds target:   $COMMANDS_DST"
echo ""
echo "Skills"

for skill in "${TT_SKILLS[@]}"; do
  src="$SKILLS_SRC/$skill"
  dst="$SKILLS_DST/$skill"

  if [ ! -d "$src" ]; then
    echo "  WARN missing source for skill $skill (skipping)"
    continue
  fi

  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    skipped=$((skipped + 1))
    echo "  SKIP $skill (already correct symlink)"
    continue
  fi

  if [ -e "$dst" ] || [ -L "$dst" ]; then
    backup_path="$BACKUP_DIR/skills/$skill"
    if [ -e "$backup_path" ]; then
      echo "  ERROR backup destination already exists: $backup_path" >&2
      echo "        refusing to overwrite. Move it manually and retry." >&2
      errors=$((errors + 1))
      continue
    fi
    mkdir -p "$BACKUP_DIR/skills"
    if ! mv "$dst" "$backup_path"; then
      echo "  ERROR backup move failed for skill $skill" >&2
      errors=$((errors + 1))
      continue
    fi
    backed_up=$((backed_up + 1))
    echo "  BACKUP $skill → $backup_path"
  fi

  if ! ln -s "$src" "$dst"; then
    echo "  ERROR symlink creation failed for skill $skill" >&2
    if [ -e "$BACKUP_DIR/skills/$skill" ]; then
      echo "         backup at: $BACKUP_DIR/skills/$skill" >&2
      echo "         restore manually: mv \"$BACKUP_DIR/skills/$skill\" \"$dst\"" >&2
    fi
    errors=$((errors + 1))
    continue
  fi

  created=$((created + 1))
  echo "  OK $skill"
done

echo ""
echo "Command wrappers"

for wrapper in "${TT_WRAPPERS[@]}"; do
  src="$COMMANDS_SRC/$wrapper.md"
  dst="$COMMANDS_DST/$wrapper.md"

  if [ ! -f "$src" ]; then
    echo "  WARN missing source for wrapper $wrapper.md (skipping)"
    continue
  fi

  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    skipped=$((skipped + 1))
    echo "  SKIP $wrapper.md (already correct symlink)"
    continue
  fi

  if [ -e "$dst" ] || [ -L "$dst" ]; then
    backup_path="$BACKUP_DIR/commands/$wrapper.md"
    if [ -e "$backup_path" ]; then
      echo "  ERROR backup destination already exists: $backup_path" >&2
      echo "        refusing to overwrite. Move it manually and retry." >&2
      errors=$((errors + 1))
      continue
    fi
    mkdir -p "$BACKUP_DIR/commands"
    if ! mv "$dst" "$backup_path"; then
      echo "  ERROR backup move failed for wrapper $wrapper.md" >&2
      errors=$((errors + 1))
      continue
    fi
    backed_up=$((backed_up + 1))
    echo "  BACKUP $wrapper.md → $backup_path"
  fi

  if ! ln -s "$src" "$dst"; then
    echo "  ERROR symlink creation failed for wrapper $wrapper.md" >&2
    if [ -e "$BACKUP_DIR/commands/$wrapper.md" ]; then
      echo "         backup at: $BACKUP_DIR/commands/$wrapper.md" >&2
      echo "         restore manually: mv \"$BACKUP_DIR/commands/$wrapper.md\" \"$dst\"" >&2
    fi
    errors=$((errors + 1))
    continue
  fi

  created=$((created + 1))
  echo "  OK $wrapper.md"
done

# Post-install verification
echo ""
echo "Post-install verification"
broken=0
for skill in "${TT_SKILLS[@]}"; do
  dst="$SKILLS_DST/$skill"
  if [ ! -L "$dst" ]; then
    echo "  MISSING skill $skill (no symlink)" >&2
    broken=$((broken + 1))
  elif [ ! -e "$dst" ]; then
    echo "  BROKEN skill $skill (target unreachable)" >&2
    broken=$((broken + 1))
  fi
done
for wrapper in "${TT_WRAPPERS[@]}"; do
  dst="$COMMANDS_DST/$wrapper.md"
  if [ ! -L "$dst" ]; then
    echo "  MISSING wrapper $wrapper.md (no symlink)" >&2
    broken=$((broken + 1))
  elif [ ! -e "$dst" ]; then
    echo "  BROKEN wrapper $wrapper.md (target unreachable)" >&2
    broken=$((broken + 1))
  fi
done
[ "$broken" = "0" ] && echo "  All $((${#TT_SKILLS[@]} + ${#TT_WRAPPERS[@]})) symlinks resolve."

echo ""
echo "Summary"
echo "  Created:           $created"
echo "  Skipped (already): $skipped"
echo "  Backed up:         $backed_up"
[ "$backed_up" -gt 0 ] && echo "  Backup directory:  $BACKUP_DIR"
echo "  Errors:            $errors"
echo "  Broken post-check: $broken"

if [ "$errors" -gt 0 ] || [ "$broken" -gt 0 ]; then
  echo ""
  echo "Install completed with errors. Review messages above." >&2
  exit 1
fi

echo ""
echo "Install complete. Re-running this script is safe."
exit 0
