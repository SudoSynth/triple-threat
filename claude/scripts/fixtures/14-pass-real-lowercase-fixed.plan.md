# Plan: hypothetical TDD-corrected version of the real Phase 2 lowercase plan
#
# The original Phase 2 lowercase plan was impl-first (caught by v0.2.0 design
# but not by v0.1.1). This fixture shows what a correctly-shaped version of
# the same plan would look like. Should PASS.

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add `lowercase` export to src/index.js with TDD</name>
  <files>tests/index.test.js, src/index.js</files>
  <read_first>src/index.js, tests/index.test.js, .planning/phases/02-add-lowercase/02-SPEC.md</read_first>
  <action>
Walk the RED -> GREEN cycle below for the lowercase function.
  </action>
  <red>
Step 1: Update tests/index.test.js to import lowercase from '../src/index.js' (extend existing import line) and add four test cases:
  - `lowercase('HELLO')` returns `'hello'`
  - `lowercase('world')` returns `'world'` (already-lowercase unchanged)
  - `lowercase('')` returns `''`
  - `lowercase('Hello, World!')` returns `'hello, world!'` (mixed-case sanity)

Step 2: Run `npm test`. Expect FAIL with reason: lowercase is not exported (SyntaxError or undefined).
  </red>
  <green>
Step 3: Append to src/index.js after the existing `reverse` function:

```js
export function lowercase(str) {
  return str.toLowerCase();
}
```

Step 4: Run `npm test` again. Expect PASS — all 11 prior tests + 4 new lowercase tests.

Step 5: Run full test suite. Expect PASS.
  </green>
  <commit>
git add tests/index.test.js src/index.js
git commit -m "feat(lowercase): add lowercase() string utility (LOWER-01)"
  </commit>
</task>

</tasks>
