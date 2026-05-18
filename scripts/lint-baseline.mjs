#!/usr/bin/env node
/**
 * ESLint baseline gate — Sprint 9 (Hotfix Sprint) housekeeping.
 *
 * The repo has ~1500 pre-existing lint errors accumulated across two years
 * of rapid feature work (KCP + CareFlow + AI + i18n + Hotfix sprints).
 * Fixing them all in one go isn't realistic and would balloon a "quality"
 * PR into a multi-thousand-line touch-everything change. So instead we
 * freeze the current state as a "baseline" and the CI gate only fails on
 * *regressions*:
 *
 *   1. A file in the baseline grew its error count → FAIL
 *   2. A new file (not in baseline) has any errors → FAIL
 *   3. A file in the baseline lost errors → OK (improvement)
 *   4. A new file with zero errors → OK
 *
 * Warnings are deliberately ignored. They're advisory, and treating them
 * as gates makes the signal-to-noise terrible at this baseline size.
 *
 * Usage:
 *   node scripts/lint-baseline.mjs            # CI mode: compare current vs baseline, exit 1 on regression
 *   node scripts/lint-baseline.mjs --update   # snapshot mode: regenerate .eslint-baseline.json
 *
 * Or via npm:
 *   npm run lint:ci          # CI gate (default mode)
 *   npm run lint:baseline    # regenerate snapshot (after deliberately fixing errors)
 *
 * Baseline file format (.eslint-baseline.json):
 *   {
 *     "generatedAt": "2026-05-18T...",
 *     "totalErrors": 1500,
 *     "files": { "<relative-path>": <errorCount>, ... }
 *   }
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(REPO_ROOT, '.eslint-baseline.json');

const UPDATE_MODE = process.argv.includes('--update');

/**
 * Run eslint in JSON format and return per-file error counts.
 * Warnings are tallied separately for informational output but never
 * affect the gate decision.
 */
function runEslint() {
    let raw;
    try {
        // `eslint --format json` exits with code 1 when any error is found;
        // execSync throws on non-zero exit. We catch and use stdout.
        raw = execSync('npx eslint --format json .', {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            maxBuffer: 100 * 1024 * 1024, // 100 MB — repo has ~1500 errors, JSON output is large
            stdio: ['ignore', 'pipe', 'ignore'],
        });
    } catch (err) {
        // Non-zero exit is expected when errors exist; we still need stdout.
        raw = err.stdout?.toString() || '';
        if (!raw) {
            console.error('✗ eslint failed without output:', err.message);
            process.exit(2);
        }
    }

    let results;
    try {
        results = JSON.parse(raw);
    } catch (parseErr) {
        console.error('✗ Failed to parse eslint JSON output:', parseErr.message);
        process.exit(2);
    }

    const perFile = {};
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
        const rel = relative(REPO_ROOT, result.filePath);
        if (result.errorCount > 0) {
            perFile[rel] = result.errorCount;
            totalErrors += result.errorCount;
        }
        totalWarnings += result.warningCount;
    }

    return { perFile, totalErrors, totalWarnings };
}

function loadBaseline() {
    if (!existsSync(BASELINE_PATH)) return null;
    try {
        return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    } catch (err) {
        console.error('✗ Failed to read .eslint-baseline.json:', err.message);
        process.exit(2);
    }
}

function writeBaseline(perFile, totalErrors) {
    const payload = {
        generatedAt: new Date().toISOString(),
        totalErrors,
        files: Object.fromEntries(
            Object.entries(perFile).sort(([a], [b]) => a.localeCompare(b))
        ),
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`✓ Wrote baseline: ${BASELINE_PATH}`);
    console.log(`  Total errors: ${totalErrors} across ${Object.keys(perFile).length} files`);
}

function compareAndReport(currentPerFile, baseline) {
    const regressions = [];
    const newFilesWithErrors = [];
    const improvements = [];

    const baselineFiles = baseline.files || {};

    for (const [file, currentCount] of Object.entries(currentPerFile)) {
        const baselineCount = baselineFiles[file];
        if (baselineCount === undefined) {
            // New file (not in baseline) → must be clean.
            newFilesWithErrors.push({ file, count: currentCount });
        } else if (currentCount > baselineCount) {
            // Regression: file gained errors.
            regressions.push({ file, was: baselineCount, now: currentCount });
        } else if (currentCount < baselineCount) {
            improvements.push({ file, was: baselineCount, now: currentCount });
        }
    }

    // Files that vanished from current scan but were in baseline → file deleted or fully fixed.
    for (const [file, baselineCount] of Object.entries(baselineFiles)) {
        if (currentPerFile[file] === undefined) {
            improvements.push({ file, was: baselineCount, now: 0 });
        }
    }

    return { regressions, newFilesWithErrors, improvements };
}

console.log('Running eslint…');
const { perFile, totalErrors, totalWarnings } = runEslint();
console.log(`  → ${totalErrors} errors, ${totalWarnings} warnings across ${Object.keys(perFile).length} files`);

if (UPDATE_MODE) {
    writeBaseline(perFile, totalErrors);
    process.exit(0);
}

const baseline = loadBaseline();
if (!baseline) {
    console.error('');
    console.error('✗ No .eslint-baseline.json found.');
    console.error('  Run `npm run lint:baseline` to create one, then commit it.');
    process.exit(2);
}

const { regressions, newFilesWithErrors, improvements } = compareAndReport(perFile, baseline);

console.log('');
console.log(`Baseline: ${baseline.totalErrors} errors (${baseline.generatedAt})`);
console.log(`Current:  ${totalErrors} errors`);
console.log('');

if (improvements.length > 0) {
    console.log(`✓ ${improvements.length} file(s) improved:`);
    for (const { file, was, now } of improvements.slice(0, 10)) {
        console.log(`    ${file}: ${was} → ${now}`);
    }
    if (improvements.length > 10) console.log(`    … and ${improvements.length - 10} more`);
    console.log('');
}

let failed = false;

if (regressions.length > 0) {
    console.error(`✗ ${regressions.length} file(s) regressed (more errors than baseline):`);
    for (const { file, was, now } of regressions) {
        console.error(`    ${file}: ${was} → ${now} (+${now - was})`);
    }
    console.error('');
    failed = true;
}

if (newFilesWithErrors.length > 0) {
    console.error(`✗ ${newFilesWithErrors.length} new file(s) with lint errors (new files must be clean):`);
    for (const { file, count } of newFilesWithErrors) {
        console.error(`    ${file}: ${count} error(s)`);
    }
    console.error('');
    failed = true;
}

if (failed) {
    console.error('To fix: either resolve the new errors, or — if intentional — run');
    console.error('  npm run lint:baseline');
    console.error('to refresh the baseline (and commit the diff for review).');
    process.exit(1);
}

console.log('✓ No regressions vs baseline. Lint gate passes.');
process.exit(0);
