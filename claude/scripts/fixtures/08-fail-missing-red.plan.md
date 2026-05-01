# Plan: tdd="true" attribute present but no <red> block

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Add upper() function</name>
  <files>src/upper.py, tests/test_upper.py</files>
  <action>
    Implement upper() and add tests.
  </action>
  <green>
    Implement upper(), run pytest, observe pass.
  </green>
  <commit>
    git add . && git commit -m "feat: add upper"
  </commit>
</task>
</tasks>
