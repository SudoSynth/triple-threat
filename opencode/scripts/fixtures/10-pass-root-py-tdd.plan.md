# Plan: root-level Python file with proper TDD shape
#
# Validates the v0.2.0 amendment: root-level production files like hello.py
# (NOT under src/) must be classified as production code. This fixture has
# proper TDD structure so it should PASS — confirming detection works in
# the affirmative direction.

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Add hello() with TDD</name>
  <files>test_hello.py, hello.py</files>
  <action>
    Walk RED -> GREEN cycle for hello() returning "Hello, world!".
  </action>
  <red>
    Step 1: Create test_hello.py with assertion hello() == "Hello, world!".
    Step 2: Run python3 -m unittest, expect FAIL with ModuleNotFoundError.
  </red>
  <green>
    Step 3: Create hello.py with def hello(): return "Hello, world!".
    Step 4: Run python3 -m unittest, observe PASS.
  </green>
  <commit>
    git add hello.py test_hello.py
    git commit -m "feat: add hello function"
  </commit>
</task>
</tasks>
