# Plan with no task blocks

This file exists but contains no executable task elements. The linter should
treat this as a parse error (exit 2), not a pass.

The orchestrator should never produce a plan without executable tasks; if it
does, that's a bug worth surfacing.

(Avoiding literal angle-bracket task syntax in this fixture so the linter
correctly counts zero tasks rather than matching prose.)
