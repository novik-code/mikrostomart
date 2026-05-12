#!/usr/bin/env node
/**
 * Audits hreflang circle completeness across all public URLs × 4 locales.
 *
 * Problem: pre-Faza G1 root layout declared a single global hreflang block,
 * so /oferta in EN locale linked to /en as its PL alternate instead of /oferta.
 * G1 moved hreflang to per-page `pageMetadata()`. This audit verifies the fix
 * stuck for every public URL and that every page exposes a complete circle:
 *   pl + en + de + uk + x-default (5 entries).
 *
 * Validations per URL:
 *   1. All 5 hreflang values present (pl, en, de, uk, x-default).
 *   2. No `hreflang="ua"` — ISO 639-1 code for Ukrainian is `uk`; `ua` is a
 *      common bug that Google logs as invalid.
 *   3. Self-link present (this URL appears in its own alternates).
 *   4. Per-page consistency: alternates for path /X in locale L point to the
 *      same physical paths as alternates for /X in any other locale (circle
 *      closes — every locale sees the same set of target URLs).
 *
 * Usage:
 *   npm run build && PORT=3789 npm start &
 *   node scripts/audit-hreflang.mjs
 *   # report at scripts/audit-hreflang-report.md
 *
 * Server is expected on PORT 3789 by default; override with AUDIT_BASE_URL.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3789';
const EXPECTED_LANGS = ['pl', 'en', 'de', 'uk', 'x-default'];
const LOCALES = ['pl', 'en', 'de', 'ua']; // URL prefixes

// Mirror sitemap.ts mainPaths + contentPaths + toolPaths + legalPaths.
// /dla-pacjentow-przyjezdnych is part of H7 international landing.
//
// EXCLUDED: /privacy-policy — EN-only legal page (TikTok API compliance), distinct
// content from /polityka-prywatnosci. Foreign locales canonical→PL privacy with
// noindex; hreflang circle is intentionally not declared (single-locale page).
const PUBLIC_PATHS = [
    '', '/o-nas', '/oferta', '/oferta/implantologia', '/oferta/leczenie-kanalowe',
    '/oferta/stomatologia-estetyczna', '/oferta/ortodoncja', '/oferta/chirurgia', '/oferta/protetyka',
    '/cennik', '/kontakt', '/rezerwacja', '/dla-pacjentow-przyjezdnych',
    '/aktualnosci', '/baza-wiedzy', '/metamorfozy', '/sklep', '/faq', '/nowosielski',
    '/mapa-bolu', '/kalkulator-leczenia', '/porownywarka', '/selfie', '/symulator',
    '/aplikacja', '/zadatek',
    '/regulamin', '/polityka-cookies', '/polityka-prywatnosci', '/rodo',
];

function urlFor(locale, path) {
    const prefix = locale === 'pl' ? '' : `/${locale}`;
    // Homepage: PL is `/`, foreign locales are `/en` (no trailing slash — Next.js
    // redirects `/en/` → `/en` and the redirect strips alternates from the response).
    if (path === '') {
        return `${BASE_URL}${prefix || '/'}`;
    }
    return `${BASE_URL}${prefix}${path}`;
}

/**
 * Strip leading hostname from a URL so audits compare paths regardless of which
 * BASE_URL the server runs on (localhost vs prod). Returns the path portion.
 */
function pathOf(url) {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

async function fetchAlternates(url) {
    try {
        const res = await fetch(url, { redirect: 'manual' });
        if (res.status >= 300 && res.status < 400) {
            return { ok: false, status: res.status, alternates: {}, error: `redirect to ${res.headers.get('location') || '?'}` };
        }
        if (!res.ok) {
            return { ok: false, status: res.status, alternates: {}, error: `HTTP ${res.status}` };
        }
        const html = await res.text();
        const alternates = {};
        // Match <link rel="alternate" hreflang="XX" href="URL" />.
        // Next.js emits these as `<link rel="alternate" hrefLang="..." href="..."/>` in JSX
        // but they serialize to lowercase hreflang in HTML. Regex stays case-insensitive.
        const linkRe = /<link[^>]+rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi;
        const linkReReverse = /<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*hreflang=["']([^"']+)["']/gi;
        for (const m of html.matchAll(linkRe)) alternates[m[1]] = m[2];
        for (const m of html.matchAll(linkReReverse)) {
            if (!alternates[m[2]]) alternates[m[2]] = m[1];
        }
        return { ok: true, status: res.status, alternates };
    } catch (e) {
        return { ok: false, status: 0, alternates: {}, error: String(e?.message || e) };
    }
}

function validateAlternates(url, alternates) {
    const issues = [];

    // 1. All 5 hreflang values present
    for (const lang of EXPECTED_LANGS) {
        if (!alternates[lang]) {
            issues.push(`missing hreflang="${lang}"`);
        }
    }

    // 2. No `ua` — should be `uk` (ISO 639-1)
    if (alternates['ua']) {
        issues.push(`uses hreflang="ua" instead of "uk" (ISO 639-1 for Ukrainian)`);
    }

    // 3. Self-link present (this URL's path appears in own alternates)
    const selfPath = pathOf(url);
    const altPaths = Object.values(alternates).map(pathOf);
    if (!altPaths.includes(selfPath)) {
        issues.push(`self-link missing (page is ${selfPath} but no alternate points to it)`);
    }

    return issues;
}

const results = [];
const startTime = Date.now();

console.log(`Auditing ${PUBLIC_PATHS.length} paths × ${LOCALES.length} locales = ${PUBLIC_PATHS.length * LOCALES.length} URLs at ${BASE_URL}\n`);

for (const path of PUBLIC_PATHS) {
    for (const locale of LOCALES) {
        const url = urlFor(locale, path);
        const { ok, status, alternates, error } = await fetchAlternates(url);
        if (!ok) {
            results.push({ url, path, locale, status, error, issues: [`fetch failed: ${error}`], alternates });
            process.stdout.write('!');
            continue;
        }
        const issues = validateAlternates(url, alternates);
        results.push({ url, path, locale, status, alternates, issues });
        process.stdout.write(issues.length === 0 ? '.' : 'x');
    }
}

console.log(`\n\nDone in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);

// Aggregate per-path circle consistency:
// For each path, alternates across the 4 locale variants should describe the
// same set of target paths. Mismatch = broken circle (e.g. /en/oferta points
// to /pl/oferta but /oferta points to /en/oferta-old).
const pathGroups = new Map();
for (const r of results) {
    if (!pathGroups.has(r.path)) pathGroups.set(r.path, []);
    pathGroups.get(r.path).push(r);
}

for (const [path, group] of pathGroups) {
    // Skip if any variant failed to fetch — no point checking circle.
    if (group.some((r) => Object.keys(r.alternates).length === 0)) continue;
    const reference = group[0];
    const refTargets = Object.fromEntries(
        Object.entries(reference.alternates).map(([lang, url]) => [lang, pathOf(url)])
    );
    for (const r of group.slice(1)) {
        for (const lang of Object.keys(refTargets)) {
            const localPath = r.alternates[lang] ? pathOf(r.alternates[lang]) : null;
            if (localPath && refTargets[lang] && localPath !== refTargets[lang]) {
                r.issues.push(`circle break: ${r.locale} variant points hreflang="${lang}" to ${localPath}, but ${reference.locale} variant points to ${refTargets[lang]}`);
            }
        }
    }
}

// === REPORT ===
const total = results.length;
const broken = results.filter((r) => r.issues.length > 0);
const okCount = total - broken.length;

let md = `# Hreflang Circle Audit Report\n\n`;
md += `**Generated**: ${new Date().toISOString()}\n`;
md += `**Base URL**: ${BASE_URL}\n`;
md += `**Total URLs**: ${total} (${PUBLIC_PATHS.length} paths × ${LOCALES.length} locales)\n`;
md += `**OK**: ${okCount} / ${total}\n`;
md += `**Broken**: ${broken.length} / ${total}\n\n`;

if (broken.length === 0) {
    md += `## ✅ All URLs have complete hreflang circles.\n`;
} else {
    md += `## ❌ Broken URLs\n\n`;
    // Group by path so fixes can be done per layout.tsx
    const byPath = new Map();
    for (const r of broken) {
        if (!byPath.has(r.path)) byPath.set(r.path, []);
        byPath.get(r.path).push(r);
    }
    for (const [path, group] of byPath) {
        md += `### \`${path || '/'}\` (${group.length} broken variant(s))\n\n`;
        for (const r of group) {
            md += `- **${r.locale}** → ${r.url}\n`;
            for (const issue of r.issues) {
                md += `  - ⚠️ ${issue}\n`;
            }
            const altSummary = Object.entries(r.alternates).map(([lang, url]) => `${lang}=${pathOf(url)}`).join(', ');
            md += `  - alternates: ${altSummary || '(none)'}\n`;
        }
        md += `\n`;
    }
}

md += `\n---\n\n## Summary by path\n\n`;
md += `| Path | OK locales | Broken locales |\n|---|---|---|\n`;
for (const [path, group] of pathGroups) {
    const okLocales = group.filter((r) => r.issues.length === 0).map((r) => r.locale).join(', ') || '–';
    const brokenLocales = group.filter((r) => r.issues.length > 0).map((r) => r.locale).join(', ') || '–';
    md += `| \`${path || '/'}\` | ${okLocales} | ${brokenLocales} |\n`;
}

const reportPath = join(REPO_ROOT, 'scripts/audit-hreflang-report.md');
writeFileSync(reportPath, md, 'utf8');
console.log(`Report: ${reportPath}`);
console.log(`Summary: ${okCount} OK, ${broken.length} broken out of ${total}`);

// Non-zero exit if broken so this can run as a CI gate later.
process.exit(broken.length > 0 ? 1 : 0);
