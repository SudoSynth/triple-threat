# Plan: real Phase 3 titlecase plan from 2026-04-27 testing
#
# This is the actual structure of the impl-first plan that Claude wrote
# during v0.1.1 testing. v0.1.1's prompt-level enforcement let it through.
# v0.2.0 MUST catch it. This fixture is the load-bearing regression test.

<tasks>

<task type="auto">
  <name>Task 1: Append `titlecase` export to src/index.js</name>
  <files>src/index.js</files>
  <read_first>src/index.js, .planning/phases/03-add-titlecase/03-SPEC.md</read_first>
  <action>
Append a new named export immediately after the existing `lowercase` function in `src/index.js`. The new function must be:

```js
export function titlecase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}
```

Match the existing file's whitespace exactly: 2-space indent, single blank line between exports.

Do NOT:
- Add JSDoc, TypeScript types, or `@param` annotations
- Add input validation, type coercion
- Use `.toLocaleLowerCase()` or `.toLocaleUpperCase()`
- Touch `uppercase`, `reverse`, `lowercase`, or any other file
  </action>
  <verify>
    grep "export function titlecase" src/index.js (one match)
    grep "export function uppercase" src/index.js (still one match)
    node smoke test: import and call titlecase('hello world') returns 'Hello World'
  </verify>
  <acceptance_criteria>
    src/index.js contains the literal `export function titlecase(str)`.
    Existing exports unchanged.
  </acceptance_criteria>
  <done>All four functions exported from src/index.js.</done>
</task>

<task type="auto">
  <name>Task 2: Append `titlecase` tests to tests/index.test.js</name>
  <files>tests/index.test.js</files>
  <read_first>tests/index.test.js, src/index.js</read_first>
  <action>
1. Update the import line to include `titlecase`.

2. Append eight test cases for titlecase covering: lowercase phrase, uppercase phrase, mixed case, apostrophe-internal, hyphen-internal, empty string, single char, whitespace preservation.

Do NOT modify any of the existing 11 tests.
  </action>
  <verify>npm test passes 19 tests</verify>
  <acceptance_criteria>
    8 new test names appear, npm test exits 0.
  </acceptance_criteria>
  <done>npm test passes with all 19 tests green.</done>
</task>

</tasks>
