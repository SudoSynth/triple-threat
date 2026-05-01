// lint-plan-tdd.test.js — Triple Threat v0.2.0 linter test suite
// Run with: node --test lint-plan-tdd.test.js

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const LINTER = path.join(__dirname, 'lint-plan-tdd.js');
const FIXTURES = path.join(__dirname, 'fixtures');

function runLinter(fixtureName, extraArgs = []) {
  const fixturePath = path.join(FIXTURES, fixtureName);
  const args = [LINTER, fixturePath, ...extraArgs];
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    stdout = execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    exitCode = err.status ?? 1;
    stdout = err.stdout?.toString() || '';
    stderr = err.stderr?.toString() || '';
  }
  return { exitCode, stdout, stderr };
}

// ─── Parse-error cases (exit 2) ─────────────────────────────────────────

test('01-empty: empty file → parse error (exit 2)', () => {
  const r = runLinter('01-empty.plan.md');
  assert.strictEqual(r.exitCode, 2, `expected exit 2, got ${r.exitCode}\nstderr: ${r.stderr}`);
});

test('02-no-tasks: file without <task> blocks → parse error (exit 2)', () => {
  const r = runLinter('02-no-tasks.plan.md');
  assert.strictEqual(r.exitCode, 2, `expected exit 2, got ${r.exitCode}\nstderr: ${r.stderr}`);
  assert.match(r.stderr, /no <task>/i, 'stderr should mention missing <task> blocks');
});

test('missing file: nonexistent path → parse error (exit 2)', () => {
  const r = runLinter('nonexistent-file.plan.md');
  assert.strictEqual(r.exitCode, 2);
  assert.match(r.stderr, /not found/i, 'stderr should mention file not found');
});

// ─── Pass cases (exit 0) ─────────────────────────────────────────────────

test('03-pass-test-only: test-only task → pass (exit 0)', () => {
  const r = runLinter('03-pass-test-only.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /no production code touched/i, 'should explain why TDD validation skipped');
});

test('04-pass-doc-only: doc-only task → pass (exit 0)', () => {
  const r = runLinter('04-pass-doc-only.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
});

test('05-pass-tdd-shaped: properly TDD-shaped task → pass (exit 0)', () => {
  const r = runLinter('05-pass-tdd-shaped.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /TDD-shaped/i);
});

test('10-pass-root-py-tdd: root-level Python with TDD → pass (exit 0)', () => {
  const r = runLinter('10-pass-root-py-tdd.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
});

test('12-pass-alphabetized-files-warning: TDD-shaped but files mis-ordered → pass with warning', () => {
  const r = runLinter('12-pass-alphabetized-files-warning.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /WARNING.*files/is, 'should warn about file ordering');
});

test('14-pass-real-lowercase-fixed: TDD-corrected real plan → pass (exit 0)', () => {
  const r = runLinter('14-pass-real-lowercase-fixed.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
});

test('15-pass-mixed-tasks: TDD task + test-only + doc-only → pass (exit 0)', () => {
  const r = runLinter('15-pass-mixed-tasks.plan.md');
  assert.strictEqual(r.exitCode, 0, `expected exit 0, got ${r.exitCode}\nstdout: ${r.stdout}`);
});

// ─── Fail cases (exit 1) ─────────────────────────────────────────────────

test('06-fail-impl-first-split: v0.1.1 failure mode (impl task then test task) → fail (exit 1)', () => {
  const r = runLinter('06-fail-impl-first-split.plan.md');
  assert.strictEqual(r.exitCode, 1, `expected exit 1, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /BLOCKED/, 'should print BLOCKED report');
  assert.match(r.stdout, /tdd="true"/, 'should mention required tdd attribute');
});

test('07-fail-no-tdd-attribute: production code without tdd="true" → fail (exit 1)', () => {
  const r = runLinter('07-fail-no-tdd-attribute.plan.md');
  assert.strictEqual(r.exitCode, 1, `expected exit 1, got ${r.exitCode}\nstdout: ${r.stdout}`);
});

test('08-fail-missing-red: tdd="true" present but no <red> block → fail (exit 1)', () => {
  const r = runLinter('08-fail-missing-red.plan.md');
  assert.strictEqual(r.exitCode, 1, `expected exit 1, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /<red>/, 'should mention missing <red> block');
});

test('09-fail-red-after-green: <red> block AFTER <green> → fail (exit 1)', () => {
  const r = runLinter('09-fail-red-after-green.plan.md');
  assert.strictEqual(r.exitCode, 1, `expected exit 1, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /AFTER.*<green>/, 'should explain ordering violation');
});

test('11-fail-root-py-impl-first: root-level hello.py impl-first → fail (exit 1) [REGRESSION]', () => {
  const r = runLinter('11-fail-root-py-impl-first.plan.md');
  assert.strictEqual(
    r.exitCode,
    1,
    `LOAD-BEARING REGRESSION TEST FAILED: root-level hello.py impl-first plan was NOT caught.\n` +
    `expected exit 1, got ${r.exitCode}\nstdout: ${r.stdout}`
  );
});

test('13-fail-real-titlecase-broken: real impl-first plan from v0.1.1 testing → fail (exit 1) [REGRESSION]', () => {
  const r = runLinter('13-fail-real-titlecase-broken.plan.md');
  assert.strictEqual(
    r.exitCode,
    1,
    `LOAD-BEARING REGRESSION TEST FAILED: the actual v0.1.1 failure-mode plan was NOT caught.\n` +
    `expected exit 1, got ${r.exitCode}\nstdout: ${r.stdout}`
  );
});

// ─── Override path (exit 3) ─────────────────────────────────────────────

test('--allow-override on failing plan → exit 3 (override granted)', () => {
  const r = runLinter('06-fail-impl-first-split.plan.md', ['--allow-override', 'testing override path']);
  assert.strictEqual(r.exitCode, 3, `expected exit 3, got ${r.exitCode}\nstdout: ${r.stdout}`);
  assert.match(r.stdout, /OVERRIDE GRANTED/);
  assert.match(r.stdout, /testing override path/, 'override reason should appear in output');
});

test('--allow-override on passing plan → still exit 0 (no-op when no failure)', () => {
  const r = runLinter('05-pass-tdd-shaped.plan.md', ['--allow-override', 'unnecessary']);
  assert.strictEqual(r.exitCode, 0);
  assert.match(r.stdout, /allow-override.*was set/i, 'should note override was unnecessary');
});

// ─── Help output ────────────────────────────────────────────────────────

test('--help: prints usage and exits 0', () => {
  let exitCode = 0;
  let stdout = '';
  try {
    stdout = execFileSync('node', [LINTER, '--help'], { encoding: 'utf8' });
  } catch (err) {
    exitCode = err.status ?? 1;
  }
  assert.strictEqual(exitCode, 0);
  assert.match(stdout, /Usage:/i);
  assert.match(stdout, /Exit codes/i);
});
