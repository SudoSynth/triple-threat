# Plan: mixed task types — one TDD code-changing, one test-only, one doc-only
#
# Realistic plan shape. The TDD task must validate; the others are skipped.
# Should PASS overall.

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add new validation function with TDD</name>
  <files>tests/validators.test.js, src/validators.js</files>
  <red>
    Add failing test for isEmail('foo@bar.com') === true. Run, observe FAIL.
  </red>
  <green>
    Implement isEmail in src/validators.js. Run test, observe PASS.
  </green>
  <commit>git add tests/validators.test.js src/validators.js && git commit -m "feat: isEmail"</commit>
</task>

<task type="auto">
  <name>Task 2: Add edge-case tests for existing function</name>
  <files>tests/existing.test.js</files>
  <action>Add boundary-condition tests. No production code change.</action>
</task>

<task type="auto">
  <name>Task 3: Update README to mention new validator</name>
  <files>README.md</files>
  <action>Add validator section to README.</action>
</task>

</tasks>
