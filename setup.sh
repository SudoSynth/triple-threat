#!/usr/bin/env bash
# Triple Threat — verifier-guided setup.
#
# Usage:
#   bash setup.sh --check      Read-only verification of tools + frameworks.
#   bash setup.sh --claude     Install Triple Threat skills for Claude Code.
#   bash setup.sh --opencode   Install Triple Threat skills for OpenCode.
#   bash setup.sh --both       Install for both hosts.
#   bash setup.sh --help       Show this help.
#
# What this script DOES:
#   - Checks that required tools are on PATH (node, npx, git, bun, host CLI).
#   - Detects which underlying frameworks (GSD, GStack, Superpowers) are
#     installed for each host.
#   - Prints the pinned install commands from DEPENDENCIES.md.
#   - Runs claude/install.sh or opencode/install.sh after a target is chosen.
#
# What this script does NOT do:
#   - Auto-install system tools (Bun, Node, host CLIs).
#   - Auto-clone GStack or Superpowers, or run any framework installer.
#     The pinned commands are printed; you run them with eyes open.
#   - Modify anything outside Triple Threat's symlink targets.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET=""
CHECK_ONLY=0

usage() {
  cat <<'USAGE'
Usage: bash setup.sh [option]

Options:
  --check        Verify prerequisites and report status. Read-only.
  --claude       Install Triple Threat skills into Claude Code.
  --opencode     Install Triple Threat skills into OpenCode.
  --both         Install for both hosts.
  --help, -h     Show this help.

Triple Threat composes three frameworks (GSD, GStack, Superpowers). See
DEPENDENCIES.md for the pinned upstream refs. This script does not install
those frameworks for you; it shows the exact commands to run.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK_ONLY=1 ;;
    --claude) TARGET="claude" ;;
    --opencode) TARGET="opencode" ;;
    --both) TARGET="both" ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

if [ -z "$TARGET" ] && [ "$CHECK_ONLY" = "0" ]; then
  usage
  exit 0
fi

have() { command -v "$1" >/dev/null 2>&1; }

check_tool() {
  local label="$1" cmd="$2"
  if have "$cmd"; then
    echo "  ✓ $label"
    return 0
  fi
  echo "  ✗ $label ($cmd not on PATH)"
  return 1
}

check_framework() {
  local label="$1" host="$2" pattern="$3" base
  case "$host" in
    claude)   base="$HOME/.claude/skills" ;;
    opencode) base="$HOME/.config/opencode/skills" ;;
    *) return 2 ;;
  esac
  if ls "$base/"$pattern >/dev/null 2>&1; then
    echo "  ✓ $label installed ($host)"
    return 0
  fi
  echo "  ✗ $label not detected ($host)"
  return 1
}

# Header
echo "Triple Threat setup"
echo "  Repo:   $REPO_ROOT"
echo "  Target: ${TARGET:-(check only)}"
echo "  Mode:   $([ "$CHECK_ONLY" = "1" ] && echo 'verify only (no changes)' || echo 'verify + install bundle')"
echo ""

# Required tools (block --check on failure)
echo "Required tools:"
tool_warnings=0
check_tool "Node.js" node || tool_warnings=$((tool_warnings+1))
check_tool "npx (GSD installer)" npx || tool_warnings=$((tool_warnings+1))
check_tool "git" git || tool_warnings=$((tool_warnings+1))

# Optional tools (informational; do not affect --check exit code)
echo ""
echo "Optional tools:"
check_tool "Bun (only needed to run GStack)" bun || true
check_tool "Claude Code CLI binary (IDE/desktop apps don't need it)" claude || true
check_tool "OpenCode CLI binary" opencode || true

# Framework presence (informational — missing frameworks don't block Triple Threat install)
echo ""
echo "Frameworks (informational; pinned in DEPENDENCIES.md):"
if [ "$TARGET" = "claude" ] || [ "$TARGET" = "both" ] || [ "$CHECK_ONLY" = "1" ]; then
  check_framework "GSD"         claude "gsd-*"         || true
  check_framework "GStack"      claude "gstack"        || true
  check_framework "Superpowers" claude "superpowers-*" || true
fi
if [ "$TARGET" = "opencode" ] || [ "$TARGET" = "both" ] || [ "$CHECK_ONLY" = "1" ]; then
  check_framework "GSD"         opencode "gsd-*"         || true
  check_framework "GStack"      opencode "gstack"        || true
  check_framework "Superpowers" opencode "superpowers-*" || true
fi

# Pinned install commands
echo ""
echo "Pinned framework install commands (run yourself; see DEPENDENCIES.md for rationale):"
echo ""
echo "  GSD (npm get-shit-done-cc@1.38.5):"
echo "    npx get-shit-done-cc@1.38.5 --claude --global"
echo "    npx get-shit-done-cc@1.38.5 --opencode --global"
echo ""
echo "  GStack (commit 6e1625c0d735f97346ecc3a111d84f8527e04416):"
echo "    git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack"
echo "    cd ~/.claude/skills/gstack"
echo "    git checkout 6e1625c0d735f97346ecc3a111d84f8527e04416"
echo "    ./setup --host claude"
echo "    (or --host opencode for an OpenCode install)"
echo ""
echo "  Superpowers (tag v5.0.7):"
echo "    git clone https://github.com/obra/superpowers.git ~/.claude/plugins/superpowers"
echo "    cd ~/.claude/plugins/superpowers && git checkout v5.0.7"
echo "    (then symlink each skill into ~/.claude/skills/ with 'superpowers-' prefix —"
echo "     see claude/README.md or opencode/README.md)"

# --check exits here
if [ "$CHECK_ONLY" = "1" ]; then
  echo ""
  if [ "$tool_warnings" -gt 0 ]; then
    echo "✗ Verify finished — $tool_warnings tool check(s) failed."
    exit 1
  fi
  echo "✓ Verify finished — required tools present."
  exit 0
fi

# OpenCode-only caveat
if [ "$TARGET" = "opencode" ]; then
  echo ""
  echo "⚠ OpenCode-only install caveat:"
  echo "  OpenCode-only GSD native-skill installation is not currently validated."
  echo "  GSD skills required by /build-feature may need Claude Code installed"
  echo "  alongside as a cross-host fallback source. See DEPENDENCIES.md and"
  echo "  opencode/README.md for current state."
  echo ""
  printf "  Continue with OpenCode-only setup anyway? [y/N] "
  read -r reply
  case "$reply" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "Aborted."; exit 0 ;;
  esac
fi

# Run bundle installers
case "$TARGET" in
  claude)
    echo ""
    echo "→ Running claude/install.sh"
    bash "$REPO_ROOT/claude/install.sh"
    ;;
  opencode)
    echo ""
    echo "→ Running opencode/install.sh"
    bash "$REPO_ROOT/opencode/install.sh"
    ;;
  both)
    echo ""
    echo "→ Running claude/install.sh"
    bash "$REPO_ROOT/claude/install.sh"
    echo ""
    echo "→ Running opencode/install.sh"
    bash "$REPO_ROOT/opencode/install.sh"
    ;;
esac

echo ""
echo "Triple Threat skills installed for: $TARGET"
echo "Run framework installs from the commands printed above if not already done."
