#!/usr/bin/env node
/**
 * Audits every URL in sitemap.xml for indexability.
 *
 * Problem (S10-4, audyt SEO SEO-01): pre-fix sitemap zgłaszał 6 URL-i z
 * `<meta robots noindex>` (/en/sklep, /de/sklep, /ua/sklep, /privacy-policy,
 * /de/privacy-policy, /ua/privacy-policy) i 4 dead KB slugi (404). GSC raportuje
 * "Submitted URL marked noindex" + "Submitted URL not found" → obniża jakość
 * sitemap jako sygnału discovery + marnuje crawl budget.
 *
 * This script fetches sitemap.xml, extracts every <loc>, then for each URL
 * verifies:
 *   1. HTTP status 200 (no 404/410/5xx)
 *   2. No `<meta name="robots" content="noindex">` in HTML head
 *   3. No `X-Robots-Tag: noindex` response header
 *
 * Exit 0 if all URLs indexable. Exit 1 with diff list if any fail.
 *
 * Usage:
 *   # Against local preview server:
 *   npm run build && PORT=3789 npm start &
 *   node scripts/audit-sitemap-indexability.mjs
 *
 *   # Against production:
 *   AUDIT_BASE_URL=https://www.mikrostomart.pl node scripts/audit-sitemap-indexability.mjs
 *
 * CI gate: add to GitHub Actions lint workflow (post-build) so future regressions
 * in sitemap.ts → CI fail before merge.
 */

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3789';
const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;

async function fetchText(url, opts = {}) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        const text = await res.text();
        return { status: res.status, headers: res.headers, text };
    } finally {
        clearTimeout(tid);
    }
}

function extractLocs(xml) {
    // Cheap XML parse — sitemap is well-formed and small.
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
    return matches.map((m) => m[1].trim());
}

function hasNoindex(html, headers) {
    // X-Robots-Tag response header
    const xRobots = headers.get('x-robots-tag') || '';
    if (/noindex/i.test(xRobots)) return 'X-Robots-Tag header';

    // <meta name="robots" content="noindex">
    const metaMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
    if (metaMatch && /noindex/i.test(metaMatch[1])) return `<meta robots> = "${metaMatch[1]}"`;

    return null;
}

async function checkUrl(url) {
    try {
        const { status, headers, text } = await fetchText(url);
        if (status !== 200) {
            return { url, fail: true, reason: `HTTP ${status}` };
        }
        const noindexReason = hasNoindex(text, headers);
        if (noindexReason) {
            return { url, fail: true, reason: `noindex via ${noindexReason}` };
        }
        return { url, fail: false };
    } catch (err) {
        return { url, fail: true, reason: `fetch error: ${err.message}` };
    }
}

async function main() {
    console.log(`[sitemap-audit] Fetching ${BASE_URL}/sitemap.xml ...`);
    const { status, text } = await fetchText(`${BASE_URL}/sitemap.xml`);
    if (status !== 200) {
        console.error(`[sitemap-audit] FATAL: sitemap.xml returned HTTP ${status}`);
        process.exit(2);
    }

    const locs = extractLocs(text);
    console.log(`[sitemap-audit] Found ${locs.length} URLs in sitemap`);

    if (locs.length === 0) {
        console.error('[sitemap-audit] FATAL: no <loc> entries — sitemap malformed?');
        process.exit(2);
    }

    // Parallel checks with concurrency cap
    const results = [];
    let idx = 0;
    async function worker() {
        while (idx < locs.length) {
            const my = idx++;
            const r = await checkUrl(locs[my]);
            results[my] = r;
            if ((my + 1) % 50 === 0) {
                console.log(`[sitemap-audit] ${my + 1}/${locs.length} checked`);
            }
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const failures = results.filter((r) => r && r.fail);
    const ok = results.length - failures.length;

    console.log(`\n[sitemap-audit] Summary: ${ok}/${results.length} OK, ${failures.length} failures`);

    if (failures.length === 0) {
        console.log('[sitemap-audit] ✅ All URLs in sitemap are indexable.');
        process.exit(0);
    }

    console.log('\n[sitemap-audit] ❌ FAILURES:');
    for (const f of failures) {
        console.log(`  ${f.url}`);
        console.log(`    → ${f.reason}`);
    }
    console.log(`\n[sitemap-audit] Exit 1 — fix sitemap.ts or page noindex/404.`);
    process.exit(1);
}

main().catch((err) => {
    console.error('[sitemap-audit] FATAL:', err);
    process.exit(2);
});
