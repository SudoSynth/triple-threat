#!/usr/bin/env bash
# uninstall.sh — Triple Threat (OpenCode) safe uninstall.
#
# Removes only symlinks at:
#   ~/.config/opencode/skills/<tt-name>
#   ~/.config/opencode/commands/<tt-name>.md
# whose resolved target is under THIS bundle root. Leaves alone:
#   - non-symlink files/dirs (would be real installs we shouldn't touch)
#   - symlinks pointing to a different Triple Threat bundle (e.g. another version)
#   - symlinks pointing to anything else (Superpowers, GStack, etc.)
# Does not auto-restore backups. Prints backup locations for manual restore.
#
# Usage:  bash uninstall.sh

set -euo pipefail

BUNDLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

removed=0
left_alone=0
not_found=0

echo "Triple Threat (OpenCode) uninstall"
echo "  Bundle:        $BUNDLE_ROOT"
echo "  Skills target: $SKILLS_DST"
echo "  Cmds target:   $COMMANDS_DST"
echo ""
echo "Skills"

for skill in "${TT_SKILLS[@]}"; do
  dst="$SKILLS_DST/$skill"

  if [ ! -L "$dst" ] && [ ! -e "$dst" ]; then
    not_found=$((not_found + 1))
    continue
  fi

  if [ ! -L "$dst" ]; then
    echo "  LEFT-ALONE $skill (real file/dir, not a symlink — refusing to delete)"
    left_alone=$((left_alone + 1))
    continue
  fi

  target="$(readlink "$dst")"

  case "$target" in
    "$BUNDLE_ROOT"/*)
      rm "$dst"
      removed=$((removed + 1))
      echo "  REMOVED $skill"
      ;;
    *)
      echo "  LEFT-ALONE $skill (symlink points outside this bundle: $target)"
      left_alone=$((left_alone + 1))
      ;;
  esac
done

echo ""
echo "Command wrappers"

for wrapper in "${TT_WRAPPERS[@]}"; do
  dst="$COMMANDS_DST/$wrapper.md"

  if [ ! -L "$dst" ] && [ ! -e "$dst" ]; then
    not_found=$((not_found + 1))
    continue
  fi

  if [ ! -L "$dst" ]; then
    echo "  LEFT-ALONE $wrapper.md (real file, not a symlink — refusing to delete)"
    left_alone=$((left_alone + 1))
    continue
  fi

  target="$(readlink "$dst")"

  case "$target" in
    "$BUNDLE_ROOT"/*)
      rm "$dst"
      removed=$((removed + 1))
      echo "  REMOVED $wrapper.md"
      ;;
    *)
      echo "  LEFT-ALONE $wrapper.md (symlink points outside this bundle: $target)"
      left_alone=$((left_alone + 1))
      ;;
  esac
done

echo ""
echo "Summary"
echo "  Removed:    $removed"
echo "  Left alone: $left_alone"
echo "  Not found:  $not_found"

# Surface backup locations for manual restore
backup_dirs=()
while IFS= read -r d; do backup_dirs+=("$d"); done < <(ls -d "$HOME/.config/opencode/.tt-install-backup-"* 2>/dev/null || true)

if [ "${#backup_dirs[@]}" -gt 0 ]; then
  echo ""
  echo "Pre-install backups available for manual restore:"
  for d in "${backup_dirs[@]}"; do
    echo "  $d"
  done
  echo ""
  echo "To restore a single skill manually:"
  echo "  mv \"<backup-dir>/skills/<skill>\" \"$SKILLS_DST/<skill>\""
  echo "To restore a wrapper:"
  echo "  mv \"<backup-dir>/commands/<wrapper>.md\" \"$COMMANDS_DST/<wrapper>.md\""
fi

echo ""
echo "Uninstall complete."
exit 0
