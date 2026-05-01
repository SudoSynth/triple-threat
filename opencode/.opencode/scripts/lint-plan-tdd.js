#!/usr/bin/env node
// lint-plan-tdd.js — Triple Threat v0.2.0 deterministic TDD linter for PLAN.md
//
// Reads a GSD-format PLAN.md, walks each <task> block, and asserts that any
// task touching production source code follows the TDD schema (RED before
// GREEN). Returns deterministic exit codes — no model interpretation.
//
// Exit codes:
//   0 = pass (plan is TDD-compliant or contains no production-touching tasks)
//   1 = fail (one or more code-changing tasks violate the TDD schema)
//   2 = parse error (file not found, malformed, no tasks present)
//   3 = override granted (--allow-override flag set; failures bypassed but logged)
//
// Usage:
//   node lint-plan-tdd.js <path-to-PLAN.md>
//   node lint-plan-tdd.js <path-to-PLAN.md> --allow-override "<reason>"
//
// Custom production patterns: place .planning/lint-config.json with shape:
//   { "production_patterns": ["^api/", "^services/"], "test_exclusion_patterns": ["^.*\\.spec\\.rb$"] }

const fs = require('node:fs');
const path = require('node:path');

// ─── Path classification ────────────────────────────────────────────────

const DEFAULT_PRODUCTION_PATTERNS = [
  // directory-rooted
  /^(src|lib|app|pkg|internal|cmd|components)\//,
  // root-level by extension (catches hello.py, index.js at repo root)
  /^[^/]+\.py$/,
  /^[^/]+\.js$/,
  /^[^/]+\.mjs$/,
  /^[^/]+\.cjs$/,
  /^[^/]+\.ts$/,
  /^[^/]+\.jsx$/,
  /^[^/]+\.tsx$/,
  /^[^/]+\.go$/,
  /^[^/]+\.rb$/,
  /^[^/]+\.rs$/,
  /^[^/]+\.java$/,
  /^[^/]+\.kt$/,
  /^[^/]+\.swift$/,
  /^[^/]+\.cs$/,
];

const DEFAULT_TEST_EXCLUSION_PATTERNS = [
  // Python
  /^test_.*\.py$/,
  /^.*_test\.py$/,
  // generic test directory
  /^tests?\//,
  /\/tests?\//,
  /__tests__\//,
  // JS/TS
  /\.test\.(js|mjs|cjs|ts|jsx|tsx)$/,
  /\.spec\.(js|mjs|cjs|ts|jsx|tsx)$/,
  // Go
  /_test\.go$/,
  // Ruby
  /_test\.rb$/,
  /_spec\.rb$/,
  // Rust
  /_test\.rs$/,
  // Java/Kotlin
  /Test\.(java|kt)$/,
  /Tests\.(java|kt)$/,
  /Spec\.(java|kt)$/,
];

const DEFAULT_DOC_PATTERNS = [
  /\.md$/,
  /\.json$/,
  /\.toml$/,
  /\.yaml$/,
  /\.yml$/,
  /\.xml$/,
  /\.config\./,
  /^docs?\//,
  /^CHANGELOG/,
  /^README/,
  /^LICENSE/,
  /^\.gitignore$/,
  /^\.env/,
];

function loadConfigPatterns() {
  const configPath = '.planning/lint-config.json';
  let cfg = {};
  if (fs.existsSync(configPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      console.error(`Warning: failed to parse ${configPath}: ${err.message}`);
    }
  }
  const toRegex = (s) => new RegExp(s);
  return {
    production: [
      ...DEFAULT_PRODUCTION_PATTERNS,
      ...(Array.isArray(cfg.production_patterns) ? cfg.production_patterns.map(toRegex) : []),
    ],
    testExclusion: [
      ...DEFAULT_TEST_EXCLUSION_PATTERNS,
      ...(Array.isArray(cfg.test_exclusion_patterns) ? cfg.test_exclusion_patterns.map(toRegex) : []),
    ],
    doc: [
      ...DEFAULT_DOC_PATTERNS,
      ...(Array.isArray(cfg.doc_patterns) ? cfg.doc_patterns.map(toRegex) : []),
    ],
  };
}

function classifyFile(filePath, patterns) {
  // Normalize: strip leading ./
  const p = filePath.replace(/^\.\//, '');
  // Doc / config files are not production
  if (patterns.doc.some((r) => r.test(p))) return 'doc';
  // Test files are not production (even if extension matches production patterns)
  if (patterns.testExclusion.some((r) => r.test(p))) return 'test';
  if (patterns.production.some((r) => r.test(p))) return 'production';
  return 'other';
}

// ─── PLAN.md parsing ────────────────────────────────────────────────────

function parseTasks(content) {
  const tasks = [];
  // Match <task> or <task <attrs>>; explicitly NOT <tasks> (the wrapper).
  // Require: literal "<task", then either ">" (no attrs) or whitespace + attrs + ">".
  const taskRegex = /<task(?:\s+([^>]*?))?>([\s\S]*?)<\/task\s*>/g;
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    tasks.push({
      attributes: match[1] || '',
      body: match[2] || '',
      offset: match.index,
    });
  }
  return tasks;
}

function getElement(body, elementName) {
  const re = new RegExp(`<${elementName}>([\\s\\S]*?)<\\/${elementName}>`);
  const m = re.exec(body);
  return m ? { content: m[1], offset: m.index } : null;
}

function hasElement(body, elementName) {
  return getElement(body, elementName) !== null;
}

function getTaskFiles(taskBody) {
  const el = getElement(taskBody, 'files');
  if (!el) return [];
  return el.content
    .split(/[,\n]/)
    .map((s) => s.trim())
    .map((s) => s.replace(/^[`\-*\s]+/, '').replace(/[`\s]+$/, ''))
    .map((s) => s.replace(/\s*\([^)]*\)\s*$/, '')) // strip "(read-only)" annotations
    .filter((s) => s.length > 0 && !s.startsWith('#'));
}

function getTaskName(taskBody) {
  const el = getElement(taskBody, 'name');
  return el ? el.content.trim() : '<unnamed task>';
}

function hasAttribute(attributesStr, key, value) {
  const re = new RegExp(`\\b${key}\\s*=\\s*["']?${value}["']?`, 'i');
  return re.test(attributesStr);
}

function blockContainsKeywords(taskBody, blockName, keywords) {
  const el = getElement(taskBody, blockName);
  if (!el) return false;
  return keywords.some((kw) => kw.test(el.content));
}

// ─── Per-task linting ───────────────────────────────────────────────────

function lintTask(task, taskNumber, patterns) {
  const taskName = getTaskName(task.body);
  const files = getTaskFiles(task.body);
  const classifications = files.map((f) => ({ file: f, kind: classifyFile(f, patterns) }));
  const productionFiles = classifications.filter((c) => c.kind === 'production').map((c) => c.file);
  const testFiles = classifications.filter((c) => c.kind === 'test').map((c) => c.file);

  // No production code touched → TDD validation skipped
  if (productionFiles.length === 0) {
    return {
      taskNumber,
      taskName,
      verdict: 'pass',
      reason: 'no production code touched',
      files,
      productionFiles: [],
      testFiles,
      errors: [],
      warnings: [],
    };
  }

  // Production-touching task: apply TDD schema
  const errors = [];
  const warnings = [];

  // Check 1: tdd="true" attribute
  if (!hasAttribute(task.attributes, 'tdd', 'true')) {
    errors.push(
      `Task touches production code (${productionFiles.join(', ')}) but lacks tdd="true" attribute. ` +
      `Required: <task tdd="true"> for any task modifying production source.`
    );
  }

  // Check 2: <red> block present
  const redEl = getElement(task.body, 'red');
  if (!redEl) {
    errors.push(
      `Missing <red> block. Code-changing tasks must define a RED phase: write failing test, run it, observe failure.`
    );
  }

  // Check 3: <green> block present
  const greenEl = getElement(task.body, 'green');
  if (!greenEl) {
    errors.push(
      `Missing <green> block. Code-changing tasks must define a GREEN phase: implement minimum production code, observe pass.`
    );
  }

  // Check 4: <red> precedes <green> (HARD RULE)
  if (redEl && greenEl) {
    if (redEl.offset > greenEl.offset) {
      errors.push(
        `<red> block appears AFTER <green> in task body (red at offset ${redEl.offset}, green at offset ${greenEl.offset}). ` +
        `Required order: <red> first, <green> second.`
      );
    }
  }

  // Check 5: <red> contains failure-detection keywords
  if (redEl) {
    const failKeywords = [/\bfail/i, /\bRED\b/, /expect.*fail/is, /observe.*fail/is, /should.*fail/is];
    if (!blockContainsKeywords(task.body, 'red', failKeywords)) {
      errors.push(
        `<red> block missing failure-detection language. Required: at least one of "fail", "RED", "expect ... fail", "observe failure".`
      );
    }
  }

  // Check 6: <green> contains pass-detection keywords
  if (greenEl) {
    const passKeywords = [/\bpass/i, /\bGREEN\b/, /expect.*pass/is, /observe.*pass/is];
    if (!blockContainsKeywords(task.body, 'green', passKeywords)) {
      errors.push(
        `<green> block missing pass-detection language. Required: at least one of "pass", "GREEN", "expect ... pass", "observe pass".`
      );
    }
  }

  // Check 7 (WARNING ONLY, per user-amendment): <files> ordering
  if (testFiles.length > 0 && productionFiles.length > 0) {
    const firstTestIdx = files.findIndex((f) => testFiles.includes(f));
    const firstProdIdx = files.findIndex((f) => productionFiles.includes(f));
    if (firstProdIdx !== -1 && firstTestIdx !== -1 && firstProdIdx < firstTestIdx) {
      warnings.push(
        `<files> lists production file (${files[firstProdIdx]}) before test file (${files[firstTestIdx]}). ` +
        `Convention is test-first. Not blocking — <red> before <green> is the hard rule.`
      );
    }
  }

  return {
    taskNumber,
    taskName,
    verdict: errors.length > 0 ? 'fail' : 'pass',
    files,
    productionFiles,
    testFiles,
    errors,
    warnings,
  };
}

// ─── Output formatting ──────────────────────────────────────────────────

function formatResults(results, planPath) {
  const lines = [];
  lines.push(`TDD lint of ${planPath}`);
  lines.push('='.repeat(70));

  for (const r of results) {
    lines.push('');
    lines.push(`Task ${r.taskNumber}: "${r.taskName}"`);
    if (r.files && r.files.length) {
      lines.push(`  Files: ${r.files.join(', ')}`);
    } else {
      lines.push(`  Files: (none listed)`);
    }
    if (r.verdict === 'pass' && r.reason) {
      lines.push(`  Verdict: PASS (${r.reason})`);
    } else if (r.verdict === 'pass') {
      lines.push(`  Verdict: PASS (TDD-shaped)`);
    } else {
      lines.push(`  Verdict: FAIL`);
    }
    for (const e of r.errors || []) {
      lines.push(`  [ERROR] ${e}`);
    }
    for (const w of r.warnings || []) {
      lines.push(`  [WARNING] ${w}`);
    }
  }

  return lines.join('\n');
}

function formatBlockedReport(results, planPath) {
  const failed = results.filter((r) => r.verdict === 'fail');
  const lines = [];
  lines.push('');
  lines.push('═'.repeat(70));
  lines.push('BLOCKED: PLAN.md fails TDD validation.');
  lines.push('');
  lines.push(`File: ${planPath}`);
  lines.push(`Failed tasks: ${failed.length} of ${results.length}`);
  lines.push('');
  lines.push('Required schema for code-changing tasks:');
  lines.push('');
  lines.push('  <task tdd="true">');
  lines.push('    <name>Task N: <description></name>');
  lines.push('    <files>tests/foo.test.js, src/foo.js</files>');
  lines.push('    <red>');
  lines.push('      Step 1: Add failing test for <behavior>');
  lines.push('      Step 2: Run focused test, observe FAIL with reason: <expected error>');
  lines.push('    </red>');
  lines.push('    <green>');
  lines.push('      Step 3: Implement minimum production code');
  lines.push('      Step 4: Run focused test, observe PASS');
  lines.push('      Step 5: Run full test suite, observe PASS');
  lines.push('    </green>');
  lines.push('    <commit>');
  lines.push('      git add tests/foo.test.js src/foo.js');
  lines.push('      git commit -m "feat: <description>"');
  lines.push('    </commit>');
  lines.push('  </task>');
  lines.push('');
  lines.push('Next:');
  lines.push('  - Re-run /build-plan to produce a schema-compliant plan, OR');
  lines.push('  - Manually amend PLAN.md to use the schema above for each');
  lines.push('    code-changing task.');
  lines.push('');
  lines.push('Override (NOT recommended; only after explicit user approval):');
  lines.push('  node lint-plan-tdd.js --allow-override "<your justification>" <PLAN.md>');
  lines.push('  Override is recorded in build-exec output and propagated to phase SUMMARY.md.');
  lines.push('═'.repeat(70));
  return lines.join('\n');
}

// ─── Main entry ─────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let allowOverride = null;
  let planPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--allow-override') {
      allowOverride = args[++i] || '<no reason given>';
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: lint-plan-tdd.js <path-to-PLAN.md> [--allow-override "<reason>"]');
      console.log('Exit codes: 0=pass, 1=fail, 2=parse-error, 3=override-granted');
      process.exit(0);
    } else if (!planPath) {
      planPath = args[i];
    }
  }

  if (!planPath) {
    console.error('Error: missing PLAN.md path argument.');
    console.error('Usage: lint-plan-tdd.js <path-to-PLAN.md> [--allow-override "<reason>"]');
    process.exit(2);
  }

  if (!fs.existsSync(planPath)) {
    console.error(`Error: PLAN.md not found at ${planPath}`);
    process.exit(2);
  }

  let content;
  try {
    content = fs.readFileSync(planPath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${planPath}: ${err.message}`);
    process.exit(2);
  }

  const tasks = parseTasks(content);
  if (tasks.length === 0) {
    console.error(`Error: no <task>...</task> blocks found in ${planPath}`);
    console.error('Expected GSD plan format with <task>...</task> elements inside <tasks>...</tasks>.');
    process.exit(2);
  }

  const patterns = loadConfigPatterns();
  const results = tasks.map((t, i) => lintTask(t, i + 1, patterns));
  const failedCount = results.filter((r) => r.verdict === 'fail').length;
  const warningCount = results.reduce((acc, r) => acc + (r.warnings?.length || 0), 0);

  console.log(formatResults(results, planPath));
  console.log('');
  console.log('─'.repeat(70));
  console.log(`Summary: ${failedCount} task(s) failed validation, ${warningCount} warning(s).`);

  if (failedCount === 0) {
    console.log('Verdict: PASS — plan is TDD-compliant.');
    if (allowOverride) {
      console.log(`Note: --allow-override was set ("${allowOverride}") but plan passed without it.`);
    }
    process.exit(0);
  }

  if (allowOverride) {
    console.log('');
    console.log('─'.repeat(70));
    console.log(`OVERRIDE GRANTED: "${allowOverride}"`);
    console.log('Linter found violations but execution will proceed.');
    console.log('This override is recorded for audit purposes — it should appear in phase SUMMARY.md.');
    process.exit(3);
  }

  console.log(formatBlockedReport(results, planPath));
  process.exit(1);
}

main();
