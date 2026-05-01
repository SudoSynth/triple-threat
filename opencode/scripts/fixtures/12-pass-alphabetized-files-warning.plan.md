# Plan: <files> ordering puts production file first (alphabetical)
#
# Validates the v0.2.0 amendment that <files> ordering is a WARNING, not a
# blocking error. The hard rule is <red> before <green>. This plan has
# proper TDD structure but lists src/index.js before tests/index.test.js
# (which is alphabetical order). Should PASS with a warning.

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Add capitalize function</name>
  <files>src/index.js, tests/index.test.js</files>
  <action>
    Walk RED -> GREEN. Note files are alphabetical, not test-first.
  </action>
  <red>
    Step 1: Add failing test for capitalize.
    Step 2: Run npm test, expect FAIL.
  </red>
  <green>
    Step 3: Implement capitalize.
    Step 4: Run npm test, observe PASS.
  </green>
  <commit>
    git add src/index.js tests/index.test.js
    git commit -m "feat: add capitalize"
  </commit>
</task>
</tasks>
