# Plan: root-level Python file, implementation-first split
#
# The critical regression fixture. This is the EXACT failure pattern we
# observed on Claude inline-writing during v0.1.1 testing — except with
# root-level hello.py instead of src/index.js.
#
# Without the v0.2.0 amendment (root-level production patterns), the
# linter would miss this because hello.py is not under src/. With the
# amendment, the linter MUST catch it. Exit code 1.

<tasks>
<task type="auto">
  <name>Task 1: Add hello function to hello.py</name>
  <files>hello.py</files>
  <action>
    Create hello.py with `def hello(): return "Hello, world!"`.
    No tests yet.
  </action>
  <verify>grep "def hello" hello.py</verify>
</task>

<task type="auto">
  <name>Task 2: Add tests for hello function</name>
  <files>test_hello.py</files>
  <action>
    Create test_hello.py asserting hello() == "Hello, world!".
  </action>
  <verify>python3 -m unittest passes</verify>
</task>
</tasks>
