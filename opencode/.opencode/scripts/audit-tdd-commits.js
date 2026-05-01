#!/usr/bin/env node
// audit-tdd-commits.js — Triple Threat v0.2.0 Layer 5 audit
//
// Walks git commits in a given range and reports whether each
// production-code-touching commit was preceded by (or paired with) a
// test-touching commit. This is a POST-execution audit, not a hard gate
// — failures here surface in phase SUMMARY.md but do not halt the pipeline.
//
// Layer 4 (the linter) is the hard gate. Layer 5 catches the case where
// the plan was TDD-shaped but the executor cheated (implemented before
// tests, despite the plan saying otherwise).
//
// Exit codes:
//   0 = pass (no impl-without-test commits in range)
//   1 = warning (one or more suspicious commits — informational)
//   2 = parse error (git command failed, range invalid, etc.)
//
// Usage:
//   node audit-tdd-commits.js --since <sha> --until <sha-or-HEAD> [--phase-dir <path>]

const { execFileSync } = require('node:child_process');
const path = require('node:path');

// ─── Path classification (mirrors linter) ───────────────────────────────

const PRODUCTION_PATTERNS = [
  /^(src|lib|app|pkg|internal|cmd|components)\//,
  /^[^/]+\.py$/,
  /^[^/]+\.js$/, /^[^/]+\.mjs$/, /^[^/]+\.cjs$/,
  /^[^/]+\.ts$/, /^[^/]+\.jsx$/, /^[^/]+\.tsx$/,
  /^[^/]+\.go$/, /^[^/]+\.rb$/, /^[^/]+\.rs$/,
  /^[^/]+\.java$/, /^[^/]+\.kt$/, /^[^/]+\.swift$/, /^[^/]+\.cs$/,
];

const TEST_PATTERNS = [
  /^test_.*\.py$/, /^.*_test\.py$/,
  /^tests?\//, /\/tests?\//, /__tests__\//,
  /\.test\.(js|mjs|cjs|ts|jsx|tsx)$/,
  /\.spec\.(js|mjs|cjs|ts|jsx|tsx)$/,
  /_test\.go$/, /_test\.rb$/, /_spec\.rb$/, /_test\.rs$/,
  /Test\.(java|kt)$/, /Tests\.(java|kt)$/, /Spec\.(java|kt)$/,
];

const DOC_PATTERNS = [
  /\.md$/, /\.json$/, /\.toml$/, /\.yaml$/, /\.yml$/, /\.xml$/,
  /\.config\./, /^docs?\//, /^CHANGELOG/, /^README/, /^LICENSE/,
  /^\.gitignore$/, /^\.env/, /^\.planning\//,
];

function classifyFile(filePath) {
  const p = filePath.replace(/^\.\//, '');
  if (DOC_PATTERNS.some((r) => r.test(p))) return 'doc';
  if (TEST_PATTERNS.some((r) => r.test(p))) return 'test';
  if (PRODUCTION_PATTERNS.some((r) => r.test(p))) return 'production';
  return 'other';
}

// ─── Git interaction ────────────────────────────────────────────────────

function gitCommitsInRange(since, until) {
  // Returns array of { sha, subject, files: [{path, kind}] }
  // Excludes merge commits.
  let raw;
  try {
    raw = execFileSync('git', [
      'log',
      `${since}..${until}`,
      '--no-merges',
      '--reverse',  // chronological order, oldest first
      '--pretty=format:__COMMIT__%H%n%s',
      '--name-only',
    ], { encoding: 'utf8' });
  } catch (err) {
    throw new Error(`git log failed: ${err.message}`);
  }

  const commits = [];
  const blocks = raw.split(/\n?__COMMIT__/).filter((b) => b.trim());
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l !== undefined);
    if (lines.length < 2) continue;
    const sha = lines[0].trim();
    const subject = lines[1].trim();
    const files = lines.slice(2).filter((l) => l.trim()).map((p) => ({
      path: p.trim(),
      kind: classifyFile(p.trim()),
    }));
    commits.push({ sha, subject, files });
  }
  return commits;
}

// ─── Audit logic ────────────────────────────────────────────────────────

function auditCommits(commits) {
  const findings = [];
  let testCommitsSeen = 0;
  let prodCommitsSeen = 0;

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    const hasProduction = c.files.some((f) => f.kind === 'production');
    const hasTest = c.files.some((f) => f.kind === 'test');

    if (hasProduction && !hasTest) {
      // Production-only commit. Check if preceded by a test commit in range.
      const priorTest = commits.slice(0, i).some((p) => p.files.some((f) => f.kind === 'test'));
      if (!priorTest) {
        findings.push({
          severity: 'warning',
          sha: c.sha,
          subject: c.subject,
          message:
            `Production-only commit with no preceding test commit in range. ` +
            `Files: ${c.files.filter((f) => f.kind === 'production').map((f) => f.path).join(', ')}. ` +
            `Possible impl-without-test (executor may have ignored TDD-shaped plan).`,
        });
      }
    }
    if (hasProduction) prodCommitsSeen++;
    if (hasTest) testCommitsSeen++;
  }

  return {
    commitCount: commits.length,
    productionCommits: prodCommitsSeen,
    testCommits: testCommitsSeen,
    findings,
  };
}

// ─── Output ─────────────────────────────────────────────────────────────

function formatReport(audit, since, until, commits) {
  const lines = [];
  lines.push(`TDD commit audit (${since}..${until})`);
  lines.push('='.repeat(70));
  lines.push(`Commits in range: ${audit.commitCount} (excluding merges)`);
  lines.push(`  Production-touching: ${audit.productionCommits}`);
  lines.push(`  Test-touching:       ${audit.testCommits}`);
  lines.push('');

  if (audit.findings.length === 0) {
    lines.push('Verdict: PASS — no impl-without-test commits detected.');
    return lines.join('\n');
  }

  lines.push(`Findings: ${audit.findings.length} warning(s).`);
  lines.push('');
  for (const f of audit.findings) {
    lines.push(`[WARNING] ${f.sha.substring(0, 8)} "${f.subject}"`);
    lines.push(`  ${f.message}`);
    lines.push('');
  }

  lines.push('─'.repeat(70));
  lines.push('Verdict: WARN — see findings above.');
  lines.push('');
  lines.push('This is informational. The hard TDD gate is the pre-execution');
  lines.push('linter (Layer 4). This audit (Layer 5) catches plans that LOOKED');
  lines.push('TDD-shaped on paper but where the executor produced production');
  lines.push('commits without preceding test commits. Findings should be');
  lines.push('reviewed in phase SUMMARY.md before /build-ship.');
  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let since = null;
  let until = 'HEAD';
  let phaseDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--since') since = args[++i];
    else if (args[i] === '--until') until = args[++i];
    else if (args[i] === '--phase-dir') phaseDir = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: audit-tdd-commits.js --since <sha> [--until <sha>] [--phase-dir <path>]');
      console.log('Exit codes: 0=pass, 1=warning, 2=parse-error');
      process.exit(0);
    } else if (!since && !args[i].startsWith('--')) {
      // Allow positional phase-dir for convenience
      phaseDir = args[i];
    }
  }

  if (!since) {
    console.error('Error: --since <sha> is required.');
    console.error('Usage: audit-tdd-commits.js --since <sha> [--until <sha>] [--phase-dir <path>]');
    process.exit(2);
  }

  let commits;
  try {
    commits = gitCommitsInRange(since, until);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }

  if (commits.length === 0) {
    console.log(`TDD commit audit (${since}..${until})`);
    console.log('='.repeat(70));
    console.log('No commits in range. Nothing to audit.');
    process.exit(0);
  }

  const audit = auditCommits(commits);
  console.log(formatReport(audit, since, until, commits));

  if (audit.findings.length > 0) process.exit(1);
  process.exit(0);
}

main();
