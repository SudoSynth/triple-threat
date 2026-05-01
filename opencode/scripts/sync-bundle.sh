#!/usr/bin/env bash
# sync-bundle.sh — Sync OpenCode bundle's internal mirror.
#
# Background:
#   The OpenCode bundle ships skills in two locations:
#     - top-level skills/ + commands/  (used when user installs to ~/.config/opencode)
#     - .opencode/skills/ + .opencode/commands/  (used when user installs to a project's .opencode/)
#   Both must contain the same content, but symlinks inside the bundle would break in shipped zips.
#   This script keeps them in sync as real files.
#
# Scope:
#   ONLY syncs the known Triple Threat skills + command wrappers below.
#   Does NOT recurse into untracked directories. Does NOT delete anything outside the explicit list.
#   Does NOT touch ~/.claude or ~/.config/opencode global installs (those are handled by symlinks).
#
# Direction:
#   Canonical = top-level skills/, commands/
#   Mirror    = .opencode/skills/, .opencode/commands/
#   Top-level → .opencode/ (one-way; top-level is the source of truth)
#
# Usage:
#   bash scripts/sync-bundle.sh [--check]
#     --check   Read-only mode: print what would change, exit 1 if drift detected
#
# Idempotent. Safe to run repeatedly.

set -euo pipefail

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

# Resolve bundle root from script location (scripts/ is at bundle root)
BUNDLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$BUNDLE_ROOT/skills" ] || [ ! -d "$BUNDLE_ROOT/commands" ]; then
  echo "ERROR: Expected skills/ and commands/ at $BUNDLE_ROOT — run from the OpenCode bundle." >&2
  exit 2
fi

# Explicit list — never blindly recurse, never blindly delete
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

drift=0
synced=0

# Sync skill directories (top-level skills/<skill>/ → .opencode/skills/<skill>/)
for skill in "${TT_SKILLS[@]}"; do
  src="$BUNDLE_ROOT/skills/$skill"
  dst="$BUNDLE_ROOT/.opencode/skills/$skill"
  if [ ! -d "$src" ]; then
    echo "WARN: source missing: skills/$skill (skipping)" >&2
    continue
  fi
  mkdir -p "$BUNDLE_ROOT/.opencode/skills"
  if [ -d "$dst" ] && diff -rq "$src" "$dst" > /dev/null 2>&1; then
    continue
  fi
  drift=$((drift + 1))
  if [ "$CHECK_ONLY" = "1" ]; then
    echo "DRIFT: skills/$skill differs from .opencode/skills/$skill"
  else
    rm -rf "$dst"
    cp -R "$src" "$dst"
    synced=$((synced + 1))
    echo "synced: skills/$skill → .opencode/skills/$skill"
  fi
done

# Sync command wrapper files (top-level commands/<skill>.md → .opencode/commands/<skill>.md)
for skill in "${TT_WRAPPERS[@]}"; do
  src="$BUNDLE_ROOT/commands/$skill.md"
  dst="$BUNDLE_ROOT/.opencode/commands/$skill.md"
  if [ ! -f "$src" ]; then
    echo "WARN: source missing: commands/$skill.md (skipping)" >&2
    continue
  fi
  mkdir -p "$BUNDLE_ROOT/.opencode/commands"
  if [ -f "$dst" ] && cmp -s "$src" "$dst"; then
    continue
  fi
  drift=$((drift + 1))
  if [ "$CHECK_ONLY" = "1" ]; then
    echo "DRIFT: commands/$skill.md differs from .opencode/commands/$skill.md"
  else
    cp "$src" "$dst"
    synced=$((synced + 1))
    echo "synced: commands/$skill.md → .opencode/commands/$skill.md"
  fi
done

if [ "$CHECK_ONLY" = "1" ]; then
  if [ "$drift" = "0" ]; then
    echo "sync-bundle: in sync (0 drift)"
    exit 0
  else
    echo "sync-bundle: $drift item(s) drifted"
    exit 1
  fi
fi

echo "sync-bundle: $synced item(s) synced"
exit 0
