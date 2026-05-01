#!/usr/bin/env bash
# scripts/test-fresh-install.sh — fresh-machine install smoke test
#
# Verifies setup.sh and per-bundle install/uninstall scripts work end-to-end
# against a temporary HOME so the developer's real environment is untouched.
#
# Phases:
#   1. setup.sh --check  → required tools present, exit 0
#   2. setup.sh --claude → exactly 12 Triple Threat symlinks created
#   3. claude/uninstall.sh → 0 Triple Threat symlinks remaining
#   4. setup.sh --opencode (auto-confirm warning) → 23 symlinks created
#      (12 skills + 11 command wrappers)
#   5. opencode/uninstall.sh → 0 Triple Threat symlinks remaining
#
# Empty parent directories left behind by uninstall are NOT a failure —
# install.sh creates them via mkdir -p but uninstall.sh doesn't rmdir them.
# That's by design.
#
# Runs locally and in CI. Cleans up its own temp HOME on exit.

set -euo pipefail
shopt -s nullglob

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d)"
trap 'rm -rf "$TMP_HOME"' EXIT

EXPECTED_TT_SKILLS=(
  build-debug build-doctor build-exec build-feature build-init build-map
  build-plan build-qa build-review build-ship build-spec triple-threat
)

EXPECTED_OPENCODE_WRAPPERS=(
  build-debug build-doctor build-exec build-feature build-init build-map
  build-plan build-qa build-review build-ship build-spec
)

fail() { echo "FAIL: $*" >&2; exit 1; }

# Counts only Triple Threat symlinks (build-* | triple-threat | build-*.md)
# in $1. Returns 0 if directory missing.
count_tt_symlinks() {
  local dir="$1" n=0 entry name
  [ -d "$dir" ] || { echo 0; return; }
  for entry in "$dir"/*; do
    name=$(basename "$entry")
    case "$name" in
      build-*|triple-threat)
        [ -L "$entry" ] && n=$((n+1))
        ;;
    esac
  done
  echo "$n"
}

# Counts broken symlinks in $1 (any name).
count_broken_symlinks() {
  local dir="$1" n=0 entry
  [ -d "$dir" ] || { echo 0; return; }
  for entry in "$dir"/*; do
    [ -L "$entry" ] && [ ! -e "$entry" ] && n=$((n+1))
  done
  echo "$n"
}

echo "Triple Threat fresh-install smoke test"
echo "  Repo:     $REPO_ROOT"
echo "  TMP_HOME: $TMP_HOME"
echo ""

# Phase 1 — verifier
echo "Phase 1: setup.sh --check"
HOME="$TMP_HOME" bash "$REPO_ROOT/setup.sh" --check >/dev/null \
  || fail "setup.sh --check exit non-zero (required tools missing on test runner?)"
echo "  ✓ --check passed"

# Phase 2 — Claude install
echo ""
echo "Phase 2: setup.sh --claude"
HOME="$TMP_HOME" bash "$REPO_ROOT/setup.sh" --claude >/dev/null \
  || fail "setup.sh --claude exit non-zero"

claude_count=$(count_tt_symlinks "$TMP_HOME/.claude/skills")
[ "$claude_count" = "12" ] \
  || fail "expected 12 Claude Triple Threat symlinks, found $claude_count"

claude_broken=$(count_broken_symlinks "$TMP_HOME/.claude/skills")
[ "$claude_broken" = "0" ] \
  || fail "expected 0 broken Claude symlinks, found $claude_broken"

for skill in "${EXPECTED_TT_SKILLS[@]}"; do
  link="$TMP_HOME/.claude/skills/$skill"
  [ -L "$link" ] || fail "missing Claude symlink: $skill"
  [ -e "$link" ] || fail "broken Claude symlink: $skill"
done
echo "  ✓ 12 Claude Triple Threat symlinks created and resolve"

# Phase 3 — Claude uninstall
echo ""
echo "Phase 3: claude/uninstall.sh"
HOME="$TMP_HOME" bash "$REPO_ROOT/claude/uninstall.sh" >/dev/null \
  || fail "claude/uninstall.sh exit non-zero"

remaining=$(count_tt_symlinks "$TMP_HOME/.claude/skills")
[ "$remaining" = "0" ] \
  || fail "expected 0 Claude Triple Threat symlinks after uninstall, found $remaining"
echo "  ✓ 0 Claude Triple Threat symlinks after uninstall"

# Phase 4 — OpenCode install (auto-confirm OpenCode-only warning)
echo ""
echo "Phase 4: setup.sh --opencode (auto-confirm)"
printf 'y\n' | HOME="$TMP_HOME" bash "$REPO_ROOT/setup.sh" --opencode >/dev/null \
  || fail "setup.sh --opencode exit non-zero"

opencode_skills=$(count_tt_symlinks "$TMP_HOME/.config/opencode/skills")
opencode_cmds=$(count_tt_symlinks "$TMP_HOME/.config/opencode/commands")
opencode_total=$((opencode_skills + opencode_cmds))
[ "$opencode_total" = "23" ] \
  || fail "expected 23 OpenCode Triple Threat symlinks (12 skills + 11 commands), found $opencode_total ($opencode_skills skills + $opencode_cmds commands)"

opencode_broken_skills=$(count_broken_symlinks "$TMP_HOME/.config/opencode/skills")
opencode_broken_cmds=$(count_broken_symlinks "$TMP_HOME/.config/opencode/commands")
[ "$opencode_broken_skills" = "0" ] && [ "$opencode_broken_cmds" = "0" ] \
  || fail "broken OpenCode symlinks (skills: $opencode_broken_skills, cmds: $opencode_broken_cmds)"

for skill in "${EXPECTED_TT_SKILLS[@]}"; do
  link="$TMP_HOME/.config/opencode/skills/$skill"
  [ -L "$link" ] || fail "missing OpenCode skill symlink: $skill"
  [ -e "$link" ] || fail "broken OpenCode skill symlink: $skill"
done
for wrapper in "${EXPECTED_OPENCODE_WRAPPERS[@]}"; do
  link="$TMP_HOME/.config/opencode/commands/$wrapper.md"
  [ -L "$link" ] || fail "missing OpenCode command wrapper: $wrapper.md"
  [ -e "$link" ] || fail "broken OpenCode command wrapper: $wrapper.md"
done
echo "  ✓ 23 OpenCode Triple Threat symlinks created and resolve (12 skills + 11 wrappers)"

# Phase 5 — OpenCode uninstall
echo ""
echo "Phase 5: opencode/uninstall.sh"
HOME="$TMP_HOME" bash "$REPO_ROOT/opencode/uninstall.sh" >/dev/null \
  || fail "opencode/uninstall.sh exit non-zero"

remaining_skills=$(count_tt_symlinks "$TMP_HOME/.config/opencode/skills")
remaining_cmds=$(count_tt_symlinks "$TMP_HOME/.config/opencode/commands")
[ "$remaining_skills" = "0" ] \
  || fail "expected 0 OpenCode skill symlinks after uninstall, found $remaining_skills"
[ "$remaining_cmds" = "0" ] \
  || fail "expected 0 OpenCode command symlinks after uninstall, found $remaining_cmds"
echo "  ✓ 0 OpenCode Triple Threat symlinks after uninstall"

echo ""
echo "✅ All phases passed."
echo "   Claude:   12 install / 0 uninstall"
echo "   OpenCode: 23 install / 0 uninstall (12 skills + 11 wrappers)"
