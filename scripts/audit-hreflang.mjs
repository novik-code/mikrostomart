#!/usr/bin/env node
/**
 * Audits hreflang circle completeness across all public URLs × 4 locales,
 * plus robots meta + canonical consistency for PL-only and multi-locale pages.
 *
 * Problem: pre-Faza G1 root layout declared a single global hreflang block,
 * so /oferta in EN locale linked to /en as its PL alternate instead of /oferta.
 * G1 moved hreflang to per-page `pageMetadata()`. This audit verifies the fix
 * stuck for every public URL and that every page exposes a complete circle:
 *   pl + en + de + uk + x-default (5 entries).
 *
 * Validations per URL (multi-locale path):
 *   1. All 5 hreflang values present (pl, en, de, uk, x-default).
 *   2. No `hreflang="ua"` — ISO 639-1 code for Ukrainian is `uk`; `ua` is a
 *      common bug that Google logs as invalid.
 *   3. Self-link present (this URL appears in its own alternates).
 *   4. Per-page consistency: alternates for path /X in locale L point to the
 *      same physical paths as alternates for /X in any other locale (circle
 *      closes — every locale sees the same set of target URLs).
 *   5. Page is indexable (no `<meta name="robots" content="noindex">`).
 *   6. Canonical points to self (not to a different locale variant).
 *
 * Validations per URL (PL_ONLY path — /implanty-opole, /sklep, etc.):
 *   1. PL locale: indexable + canonical = PL self.
 *   2. Foreign locales (EN/DE/UA): MUST have noindex.
 *   3. Hreflang SCOPED (1B, 2026-06-08): only pl + x-default (→PL) declared;
 *      foreign hreflang (en/de/uk) MUST be absent — pointing hreflang at noindex
 *      variants is a contradictory signal Google may ignore. LOCALE_ONLY pages
 *      mirror this: only the indexed locale + x-default (→ that locale).
 *
 * L-10 (2026-05-25): added PL_ONLY_PATHS set + robots/canonical checks.
 * New paths added: /implanty-opole (L-1), /leczenie-kanalowe-opole-mikroskop +
 * /dentysta-opole-centrum (L-2), /gwarancje (L-4 multi-locale), /akredytacje +
 * 5 detail slugs (K-2b), /zespol/marcin-nowosielski + elzbieta-nowosielska
 * (Batch SEO-2).
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

// Mirror sitemap.ts mainPaths + contentPaths + toolPaths + legalPaths +
// L-1/L-2 PL-only geo + L-4 gwarancje + K-2b akredytacje + Batch SEO-2 zespol.
//
// EXCLUDED: /privacy-policy — EN-only legal page (TikTok API compliance), distinct
// content from /polityka-prywatnosci. Foreign locales canonical→PL privacy with
// noindex; hreflang circle is intentionally not declared (single-locale page).
const PUBLIC_PATHS = [
    '', '/o-nas', '/oferta', '/oferta/implantologia', '/oferta/laser', '/oferta/periodontologia', '/oferta/stomatologia-dziecieca', '/oferta/stomatologia-zachowawcza', '/oferta/leczenie-kanalowe',
    '/oferta/stomatologia-estetyczna', '/oferta/ortodoncja', '/oferta/chirurgia', '/oferta/protetyka',
    '/cennik', '/kontakt', '/rezerwacja', '/dla-pacjentow-przyjezdnych',
    '/aktualnosci', '/baza-wiedzy', '/metamorfozy', '/sklep', '/faq', '/nowosielski',
    '/mapa-bolu', '/kalkulator-leczenia', '/porownywarka', '/selfie', '/symulator',
    '/aplikacja', '/zadatek',
    '/regulamin', '/polityka-cookies', '/polityka-prywatnosci', '/rodo',
    // K-2b (2026-05-20): akredytacje index + 5 detail pages (multi-locale)
    '/akredytacje', '/akredytacje/pte', '/akredytacje/ese', '/akredytacje/ptsl',
    '/akredytacje/rwth-aachen', '/akredytacje/la-ha',
    // Batch SEO-2 (2026-05-21): dedykowane strony zespołu (multi-locale)
    '/zespol/marcin-nowosielski', '/zespol/elzbieta-nowosielska',
    // L-4 (2026-05-22): warranty hub (multi-locale, DE Kostenerstattung)
    '/gwarancje',
    // L-1/L-2 (2026-05-22): PL-only local geo (foreign noindex via layout.tsx)
    '/implanty-opole',
    '/leczenie-kanalowe-opole-mikroskop',
    '/dentysta-opole-centrum',
    // Pakiet C (2026-06-01): dedykowane geo-landingi DE/EN (indexed only target locale)
    '/zahnarzt-opole',
    '/dentist-opole',
];

// PL-only paths: foreign locale URLs (en/de/ua) MUST be noindex.
// 1B (2026-06-08): hreflang is SCOPED to pl + x-default only (no en/de/uk
// entries) — hreflang must never point at noindex variants. The PL URL is the
// single indexable version.
const PL_ONLY_PATHS = new Set([
    '/sklep',              // S5-2: PL-only product list
    '/regulamin',          // S5-1: PL legal text
    '/polityka-cookies',
    '/polityka-prywatnosci',
    '/rodo',
    '/implanty-opole',     // L-1: geo, no organic intent in EN/DE/UA
    '/leczenie-kanalowe-opole-mikroskop', // L-2a
    '/dentysta-opole-centrum',            // L-2b
]);

// Globally noindex paths: noindex in EVERY locale (including PL). These are
// transactional / no-organic-intent landings — listed in sitemap.ts as removed
// so they shouldn't be in PUBLIC_PATHS at all... except they're often still
// reachable via internal links (Navbar, Footer), so we audit them to confirm
// the noindex is honoured.
const GLOBALLY_NOINDEX_PATHS = new Set([
    '/zadatek',            // J-2: thin content + URL params, no organic intent
]);

// Pakiet C (2026-06-01): single-locale-indexed paths. Indeksowane TYLKO w
// wskazanym locale; pozostałe locale MUSZĄ być noindex (odwrotność PL_ONLY).
// Dedykowane geo-landingi pod konkretny rynek z keyword-rich slug.
const LOCALE_ONLY_PATHS = new Map([
    ['/zahnarzt-opole', 'de'], // DE dental tourism
    ['/dentist-opole', 'en'],  // EN international dental tourism
]);

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
            return { ok: false, status: res.status, alternates: {}, robots: null, canonical: null, error: `redirect to ${res.headers.get('location') || '?'}` };
        }
        if (!res.ok) {
            return { ok: false, status: res.status, alternates: {}, robots: null, canonical: null, error: `HTTP ${res.status}` };
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

        // Extract <meta name="robots" content="..."> — both name+content and content+name orderings.
        // Next.js typically emits `<meta name="robots" content="noindex, follow"/>`. Case-insensitive.
        let robots = null;
        const robotsRe = /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i;
        const robotsReReverse = /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']robots["']/i;
        const robotsMatch = html.match(robotsRe) || html.match(robotsReReverse);
        if (robotsMatch) robots = robotsMatch[1].toLowerCase();

        // Extract <link rel="canonical" href="...">.
        let canonical = null;
        const canonicalRe = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;
        const canonicalReReverse = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i;
        const canonicalMatch = html.match(canonicalRe) || html.match(canonicalReReverse);
        if (canonicalMatch) canonical = canonicalMatch[1];

        return { ok: true, status: res.status, alternates, robots, canonical };
    } catch (e) {
        return { ok: false, status: 0, alternates: {}, robots: null, canonical: null, error: String(e?.message || e) };
    }
}

/**
 * Returns true if `robots` meta content indicates noindex (handles "noindex",
 * "noindex,follow", "noindex, follow", "follow,noindex", etc.).
 */
function isNoindex(robots) {
    if (!robots) return false;
    return /\bnoindex\b/.test(robots);
}

function validateAlternates(url, alternates, robots, canonical, path, locale) {
    const issues = [];
    const isPlOnly = PL_ONLY_PATHS.has(path);
    const isGloballyNoindex = GLOBALLY_NOINDEX_PATHS.has(path);
    const localeOnly = LOCALE_ONLY_PATHS.get(path);
    const noindex = isNoindex(robots);
    const selfPath = pathOf(url);
    const altPaths = Object.values(alternates).map(pathOf);
    const canonicalPath = canonical ? pathOf(canonical) : null;
    const plSelfPath = path === '' ? '/' : path;

    // Always: never use `ua` (ISO 639-1 for Ukrainian is `uk`).
    if (alternates['ua']) {
        issues.push(`uses hreflang="ua" instead of "uk" (ISO 639-1 for Ukrainian)`);
    }

    const hreflangOf = (loc) => (loc === 'ua' ? 'uk' : loc);
    const variantPath = (loc) => {
        const prefix = loc === 'pl' ? '' : `/${loc}`;
        return path === '' ? (prefix || '/') : `${prefix}${path}`;
    };

    if (isPlOnly) {
        // 1B (2026-06-08): hreflang SCOPED — PL-only pages declare only pl + x-default
        // (→ PL). Foreign hreflang (en/de/uk) MUST be absent (would point at noindex).
        const plPath = plSelfPath;
        if (!alternates['pl']) issues.push(`missing hreflang="pl"`);
        if (!alternates['x-default']) issues.push(`missing hreflang="x-default"`);
        for (const stray of ['en', 'de', 'uk']) {
            if (alternates[stray]) issues.push(`PL_ONLY page should not declare hreflang="${stray}" (points to noindex variant ${pathOf(alternates[stray])})`);
        }
        if (alternates['pl'] && pathOf(alternates['pl']) !== plPath) issues.push(`hreflang="pl" → ${pathOf(alternates['pl'])} (expected ${plPath})`);
        if (alternates['x-default'] && pathOf(alternates['x-default']) !== plPath) issues.push(`hreflang="x-default" → ${pathOf(alternates['x-default'])} (expected ${plPath})`);
        if (locale === 'pl') {
            if (noindex) issues.push(`PL_ONLY page in PL locale has noindex (should be indexable): robots="${robots}"`);
            if (canonicalPath && canonicalPath !== plSelfPath) issues.push(`PL canonical of PL_ONLY page points elsewhere: ${canonicalPath} (expected ${plSelfPath})`);
        } else {
            if (!noindex) issues.push(`PL_ONLY page in foreign locale '${locale}' is missing noindex meta: robots="${robots || '(none)'}"`);
        }
    } else if (localeOnly) {
        // 1B: single-locale-indexed pages declare only the target locale + x-default (→ target).
        const tgtCode = hreflangOf(localeOnly);
        const tgtPath = variantPath(localeOnly);
        if (!alternates[tgtCode]) issues.push(`missing hreflang="${tgtCode}"`);
        if (!alternates['x-default']) issues.push(`missing hreflang="x-default"`);
        for (const stray of ['pl', 'en', 'de', 'uk'].filter((l) => l !== tgtCode)) {
            if (alternates[stray]) issues.push(`LOCALE_ONLY page should not declare hreflang="${stray}" (points to noindex variant ${pathOf(alternates[stray])})`);
        }
        if (alternates[tgtCode] && pathOf(alternates[tgtCode]) !== tgtPath) issues.push(`hreflang="${tgtCode}" → ${pathOf(alternates[tgtCode])} (expected ${tgtPath})`);
        if (alternates['x-default'] && pathOf(alternates['x-default']) !== tgtPath) issues.push(`hreflang="x-default" → ${pathOf(alternates['x-default'])} (expected ${tgtPath})`);
        if (locale === localeOnly) {
            if (noindex) issues.push(`LOCALE_ONLY page (${path}) in its indexed locale '${locale}' has noindex (should be indexable): robots="${robots}"`);
            if (canonicalPath && canonicalPath !== selfPath) issues.push(`canonical of LOCALE_ONLY indexed page points to ${canonicalPath} instead of self ${selfPath}`);
        } else {
            if (!noindex) issues.push(`LOCALE_ONLY page (${path}, indexed in '${localeOnly}') missing noindex in '${locale}' locale: robots="${robots || '(none)'}"`);
        }
    } else {
        // Multi-locale (+ globally-noindex, which keeps the full 4-locale circle).
        for (const lang of EXPECTED_LANGS) {
            if (!alternates[lang]) issues.push(`missing hreflang="${lang}"`);
        }
        if (!altPaths.includes(selfPath)) {
            issues.push(`self-link missing (page is ${selfPath} but no alternate points to it)`);
        }
        if (isGloballyNoindex) {
            if (!noindex) issues.push(`globally-noindex page (${path}) is missing noindex meta in '${locale}' locale: robots="${robots || '(none)'}"`);
        } else {
            if (noindex) issues.push(`multi-locale page is noindex in '${locale}' locale (probably regression — should be indexable): robots="${robots}"`);
            if (canonicalPath && canonicalPath !== selfPath) issues.push(`canonical points to ${canonicalPath} instead of self ${selfPath}`);
        }
    }

    return issues;
}

const results = [];
const startTime = Date.now();

console.log(`Auditing ${PUBLIC_PATHS.length} paths × ${LOCALES.length} locales = ${PUBLIC_PATHS.length * LOCALES.length} URLs at ${BASE_URL}\n`);

for (const path of PUBLIC_PATHS) {
    for (const locale of LOCALES) {
        const url = urlFor(locale, path);
        const { ok, status, alternates, robots, canonical, error } = await fetchAlternates(url);
        if (!ok) {
            results.push({ url, path, locale, status, error, issues: [`fetch failed: ${error}`], alternates, robots, canonical });
            process.stdout.write('!');
            continue;
        }
        const issues = validateAlternates(url, alternates, robots, canonical, path, locale);
        results.push({ url, path, locale, status, alternates, robots, canonical, issues });
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
        const mode = GLOBALLY_NOINDEX_PATHS.has(path)
            ? '(globally noindex)'
            : PL_ONLY_PATHS.has(path)
                ? '(PL-only)'
                : LOCALE_ONLY_PATHS.has(path)
                    ? `(locale-only: ${LOCALE_ONLY_PATHS.get(path)})`
                    : '(multi-locale)';
        md += `### \`${path || '/'}\` ${mode} — ${group.length} broken variant(s)\n\n`;
        for (const r of group) {
            md += `- **${r.locale}** → ${r.url}\n`;
            for (const issue of r.issues) {
                md += `  - ⚠️ ${issue}\n`;
            }
            const altSummary = Object.entries(r.alternates).map(([lang, url]) => `${lang}=${pathOf(url)}`).join(', ');
            md += `  - alternates: ${altSummary || '(none)'}\n`;
            md += `  - robots: \`${r.robots ?? '(no meta robots)'}\`\n`;
            md += `  - canonical: \`${r.canonical ? pathOf(r.canonical) : '(none)'}\`\n`;
        }
        md += `\n`;
    }
}

md += `\n---\n\n## Summary by path\n\n`;
md += `| Path | Mode | OK locales | Broken locales |\n|---|---|---|---|\n`;
for (const [path, group] of pathGroups) {
    const mode = GLOBALLY_NOINDEX_PATHS.has(path)
        ? 'noindex'
        : PL_ONLY_PATHS.has(path)
            ? 'PL-only'
            : LOCALE_ONLY_PATHS.has(path)
                ? `locale:${LOCALE_ONLY_PATHS.get(path)}`
                : 'multi';
    const okLocales = group.filter((r) => r.issues.length === 0).map((r) => r.locale).join(', ') || '–';
    const brokenLocales = group.filter((r) => r.issues.length > 0).map((r) => r.locale).join(', ') || '–';
    md += `| \`${path || '/'}\` | ${mode} | ${okLocales} | ${brokenLocales} |\n`;
}

const reportPath = join(REPO_ROOT, 'scripts/audit-hreflang-report.md');
writeFileSync(reportPath, md, 'utf8');
console.log(`Report: ${reportPath}`);
console.log(`Summary: ${okCount} OK, ${broken.length} broken out of ${total}`);

// Non-zero exit if broken so this can run as a CI gate later.
process.exit(broken.length > 0 ? 1 : 0);
