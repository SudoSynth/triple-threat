# Plan: properly TDD-shaped task

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Add lowercase() with TDD</name>
  <files>tests/index.test.js, src/index.js</files>
  <action>
    Walk the RED -> GREEN cycle below.
  </action>
  <red>
    Step 1: Add failing test in tests/index.test.js asserting
    lowercase('HELLO') === 'hello'.
    Step 2: Run npm test, expect FAIL with reason: lowercase is undefined.
  </red>
  <green>
    Step 3: Implement lowercase in src/index.js as `str.toLowerCase()`.
    Step 4: Run npm test, observe PASS.
    Step 5: Run full test suite, observe PASS.
  </green>
  <commit>
    git add tests/index.test.js src/index.js
    git commit -m "feat: add lowercase string utility"
  </commit>
</task>
</tasks>
