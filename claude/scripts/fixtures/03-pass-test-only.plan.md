# Plan: test-only task

Some refactors are pure test additions or edits. No production code changes.
The linter should pass these without requiring TDD schema.

<tasks>
<task type="auto">
  <name>Task 1: Add coverage for edge case in existing function</name>
  <files>tests/index.test.js</files>
  <action>
    Add a new test case for the empty-string edge case of the existing
    function. No production code change needed.
  </action>
  <verify>npm test passes</verify>
</task>
</tasks>
