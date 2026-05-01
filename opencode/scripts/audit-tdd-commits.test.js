// audit-tdd-commits.test.js — tests for Layer 5 audit script
// Run with: node --test audit-tdd-commits.test.js

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const AUDIT = path.join(__dirname, 'audit-tdd-commits.js');

function setupRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  // initial commit
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test\n');
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

function commitFile(dir, filePath, content, msg) {
  const full = path.join(dir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  execFileSync('git', ['add', filePath], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', msg], { cwd: dir });
}

function runAudit(dir, since, until = 'HEAD') {
  let stdout = '', stderr = '', exitCode = 0;
  try {
    stdout = execFileSync('node', [AUDIT, '--since', since, '--until', until], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    exitCode = err.status ?? 1;
    stdout = err.stdout?.toString() || '';
    stderr = err.stderr?.toString() || '';
  }
  return { exitCode, stdout, stderr };
}

function getHead(dir) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
}

// ─── Pass cases ──────────────────────────────────────────────────────────

test('atomic TDD commit (test+impl together) → pass (exit 0)', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  // Single commit with both test and impl
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'tests/foo.test.js'), 'test()\n');
  fs.writeFileSync(path.join(dir, 'src/foo.js'), 'export const foo = 1\n');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'feat: foo with tests'], { cwd: dir });

  const r = runAudit(dir, start);
  assert.strictEqual(r.exitCode, 0, `expected 0, got ${r.exitCode}\n${r.stdout}`);
  assert.match(r.stdout, /no impl-without-test/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('test-first then impl (separate commits, RED→GREEN) → pass (exit 0)', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  commitFile(dir, 'tests/foo.test.js', 'test_foo()\n', 'test: failing test for foo');
  commitFile(dir, 'src/foo.js', 'foo = 1\n', 'feat: implement foo');

  const r = runAudit(dir, start);
  assert.strictEqual(r.exitCode, 0, `expected 0, got ${r.exitCode}\n${r.stdout}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('test-only commits → pass (exit 0)', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  commitFile(dir, 'tests/edge.test.js', 'edge cases\n', 'test: add edge cases');

  const r = runAudit(dir, start);
  assert.strictEqual(r.exitCode, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('doc-only commits → pass (exit 0)', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  commitFile(dir, 'docs/usage.md', '# Usage\n', 'docs: usage guide');
  commitFile(dir, 'CHANGELOG.md', '# Changes\n', 'docs: changelog');

  const r = runAudit(dir, start);
  assert.strictEqual(r.exitCode, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('empty range → pass (exit 0)', () => {
  const dir = setupRepo();
  const start = getHead(dir);

  const r = runAudit(dir, start, start);
  assert.strictEqual(r.exitCode, 0);
  assert.match(r.stdout, /Nothing to audit|No commits/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ─── Warning cases ───────────────────────────────────────────────────────

test('impl-only commit with no prior test → warning (exit 1)', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  // Commit production code with no test at all
  commitFile(dir, 'src/bar.js', 'export const bar = 2\n', 'feat: add bar (no tests)');

  const r = runAudit(dir, start);
  assert.strictEqual(r.exitCode, 1, `expected exit 1, got ${r.exitCode}\n${r.stdout}`);
  assert.match(r.stdout, /WARNING/);
  assert.match(r.stdout, /impl-without-test/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('impl-first split (impl commit before test commit) → warning (exit 1)', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  // The v0.1.1 failure pattern: implementation committed before tests
  commitFile(dir, 'src/baz.js', 'baz = 3\n', 'feat: add baz');
  commitFile(dir, 'tests/baz.test.js', 'test_baz\n', 'test: add baz tests');

  const r = runAudit(dir, start);
  assert.strictEqual(r.exitCode, 1, `expected exit 1 (impl-first detected), got ${r.exitCode}\n${r.stdout}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('root-level hello.py impl-only → warning (exit 1) [REGRESSION]', () => {
  const dir = setupRepo();
  const start = getHead(dir);
  commitFile(dir, 'hello.py', 'def hello(): return "hi"\n', 'feat: add hello (no tests)');

  const r = runAudit(dir, start);
  assert.strictEqual(
    r.exitCode,
    1,
    `LOAD-BEARING: root-level hello.py impl-only must trigger warning. got ${r.exitCode}\n${r.stdout}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

// ─── Parse error cases ───────────────────────────────────────────────────

test('missing --since flag → exit 2', () => {
  const dir = setupRepo();
  let exitCode = 0, stderr = '';
  try {
    execFileSync('node', [AUDIT], { cwd: dir, encoding: 'utf8' });
  } catch (err) {
    exitCode = err.status ?? 1;
    stderr = err.stderr?.toString() || '';
  }
  assert.strictEqual(exitCode, 2);
  assert.match(stderr, /--since.*required/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('invalid since SHA → exit 2', () => {
  const dir = setupRepo();
  const r = runAudit(dir, 'not-a-real-sha');
  assert.strictEqual(r.exitCode, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('--help → exit 0 with usage', () => {
  let exitCode = 0, stdout = '';
  try {
    stdout = execFileSync('node', [AUDIT, '--help'], { encoding: 'utf8' });
  } catch (err) {
    exitCode = err.status ?? 1;
  }
  assert.strictEqual(exitCode, 0);
  assert.match(stdout, /Usage:/i);
});
