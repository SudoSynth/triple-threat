# Plan: <red> block appears AFTER <green> in document order

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Add titlecase function</name>
  <files>tests/index.test.js, src/index.js</files>
  <action>Walk through TDD cycle.</action>
  <green>
    Implement titlecase, observe tests pass.
  </green>
  <red>
    Now add the failing test that should have been first.
    Observe failure (will not happen because impl exists).
  </red>
</task>
</tasks>
