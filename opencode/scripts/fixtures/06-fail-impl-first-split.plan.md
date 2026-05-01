# Plan: implementation-first split (the v0.1.1 failure mode)

This is the exact failure pattern observed on Claude inline-writing during
v0.1.1 testing — Task 1 adds the implementation, Task 2 adds tests after.
The linter MUST flag this.

<tasks>
<task type="auto">
  <name>Task 1: Add lowercase export to src/index.js</name>
  <files>src/index.js</files>
  <action>
    Append `export function lowercase(str) { return str.toLowerCase(); }`
    to src/index.js.
  </action>
  <verify>grep finds the new export</verify>
</task>

<task type="auto">
  <name>Task 2: Add lowercase tests to tests/index.test.js</name>
  <files>tests/index.test.js</files>
  <action>
    Append three test cases asserting lowercase behavior on typical input,
    already-lowercase input, and empty string.
  </action>
  <verify>npm test exits 0</verify>
</task>
</tasks>
