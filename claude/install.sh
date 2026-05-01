#!/usr/bin/env bash
# install.sh — Triple Threat (Claude) symlink-based installer.
#
# Resolves bundle root from script location (portable, works wherever you unzip).
# For each Triple Threat skill:
#   - If destination is already the correct symlink → skip (idempotent)
#   - If destination exists otherwise → move to centralized timestamped backup
#   - Create absolute symlink from ~/.claude/skills/<skill> into this bundle
# Never touches GSD, GStack, Superpowers, or any non-Triple-Threat path.
# Re-running on an already-installed system is a no-op.
#
# Usage:  bash install.sh
# Uninstall:  bash uninstall.sh

set -euo pipefail

BUNDLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$BUNDLE_ROOT/.claude/skills"
SKILLS_DST="$HOME/.claude/skills"

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

if [ ! -d "$SKILLS_SRC" ]; then
  echo "ERROR: bundle source missing at $SKILLS_SRC" >&2
  echo "       Are you running this from the unzipped bundle root?" >&2
  exit 2
fi

TIMESTAMP="$(date +%Y-%m-%d-%H%M%S)"
BACKUP_DIR="$HOME/.claude/.tt-install-backup-$TIMESTAMP"

mkdir -p "$SKILLS_DST"

created=0
skipped=0
backed_up=0
errors=0

echo "Triple Threat (Claude) install"
echo "  Bundle: $BUNDLE_ROOT"
echo "  Target: $SKILLS_DST"
echo ""

for skill in "${TT_SKILLS[@]}"; do
  src="$SKILLS_SRC/$skill"
  dst="$SKILLS_DST/$skill"

  if [ ! -d "$src" ]; then
    echo "  WARN missing source for $skill (skipping)"
    continue
  fi

  # Idempotency: already correct symlink → skip
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    skipped=$((skipped + 1))
    echo "  SKIP $skill (already correct symlink)"
    continue
  fi

  # Destination exists in some other shape → backup before replacing
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    backup_path="$BACKUP_DIR/$skill"
    if [ -e "$backup_path" ]; then
      echo "  ERROR backup destination already exists: $backup_path" >&2
      echo "        refusing to overwrite. Move it manually and retry." >&2
      errors=$((errors + 1))
      continue
    fi
    mkdir -p "$BACKUP_DIR"
    if ! mv "$dst" "$backup_path"; then
      echo "  ERROR backup move failed for $skill" >&2
      errors=$((errors + 1))
      continue
    fi
    backed_up=$((backed_up + 1))
    echo "  BACKUP $skill → $backup_path"
  fi

  # Create symlink
  if ! ln -s "$src" "$dst"; then
    echo "  ERROR symlink creation failed for $skill" >&2
    if [ -e "$BACKUP_DIR/$skill" ]; then
      echo "         backup at: $BACKUP_DIR/$skill" >&2
      echo "         restore manually: mv \"$BACKUP_DIR/$skill\" \"$dst\"" >&2
    fi
    errors=$((errors + 1))
    continue
  fi

  created=$((created + 1))
  echo "  OK $skill"
done

# Post-install verification: every TT symlink must resolve
echo ""
echo "Post-install verification"
broken=0
for skill in "${TT_SKILLS[@]}"; do
  dst="$SKILLS_DST/$skill"
  if [ ! -L "$dst" ]; then
    echo "  MISSING $skill (no symlink)" >&2
    broken=$((broken + 1))
  elif [ ! -e "$dst" ]; then
    echo "  BROKEN $skill (symlink target unreachable)" >&2
    broken=$((broken + 1))
  fi
done
[ "$broken" = "0" ] && echo "  All ${#TT_SKILLS[@]} symlinks resolve."

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
