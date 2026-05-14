import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { brand } from '@/lib/brandConfig';
import { isDemoMode } from '@/lib/demoMode';
import { routing } from '@/i18n/routing';
import { routeMtimes, buildTime } from '@/lib/generated-route-mtimes';

// Faza G3 (2026-05-09): cache sitemap przez 1 godzinę.
// Bez tego każdy ping Googlebota / każde wejście /sitemap.xml triggerowało DB query
// do Supabase (`articles` + `news` tables). Sitemap jest zwracany ze static cache,
// regenerowany w tle co 3600s.
//
// Faza J-1 (2026-05-12): lastModified per-URL z git history (zamiast `new Date()`
// dla każdej strony). Bez tego Google widział identyczną datę modyfikacji na całym
// sitemap i ignorował freshness signal. Mtimes generowane prebuild scriptem z
// `git log -1 --format=%aI -- <file>` per route file.
export const revalidate = 3600;

/**
 * Per-path lastModified: prefer git mtime snapshot, fall back to build time
 * (e.g. for paths added to sitemap.ts but not yet to the script's ROUTE_FILES map).
 */
function lastModForPath(path: string): Date {
    const iso = routeMtimes[path] ?? buildTime;
    return new Date(iso);
}

const BASE_URL = brand.appUrl;

// Locale → URL prefix. PL is default with no prefix; rest get /{locale}/...
function localePath(locale: string, path: string): string {
    if (locale === routing.defaultLocale) {
        return path; // /oferta
    }
    return `/${locale}${path}`; // /en/oferta, /de/oferta, /ua/oferta
}

// hreflang code mapping. URL prefix 'ua' corresponds to ISO 639-1 'uk' (Ukrainian).
const HREFLANG_MAP: Record<string, string> = {
    pl: 'pl',
    en: 'en',
    de: 'de',
    ua: 'uk',
};

// Build per-URL alternates.languages object for hreflang.
function buildAlternates(path: string): Record<string, string> {
    const langs: Record<string, string> = {};
    for (const locale of routing.locales) {
        const hreflang = HREFLANG_MAP[locale] || locale;
        langs[hreflang] = `${BASE_URL}${localePath(locale, path)}`;
    }
    // x-default points to PL (the default locale)
    langs['x-default'] = `${BASE_URL}${path}`;
    return langs;
}

// Generate sitemap entries for a path across all locales.
function multiLocaleEntries(
    path: string,
    options: { changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; priority: number }
): MetadataRoute.Sitemap {
    const lastModified = lastModForPath(path);
    return routing.locales.map((locale) => ({
        url: `${BASE_URL}${localePath(locale, path)}`,
        lastModified,
        changeFrequency: options.changeFrequency,
        priority: options.priority,
        alternates: { languages: buildAlternates(path) },
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Demo deployment (demo.densflow.ai) must not be indexed: it would cannibalize
    // mikrostomart.pl in Google. Robots.txt blocks crawling, sitemap returns empty.
    if (isDemoMode) return [];

    // Knowledge Base articles — multi-locale (each article × 4 rows in DB linked by group_id)
    const { data: kbArticlesRaw } = await supabase
        .from('articles')
        .select('slug, published_date, locale, group_id');
    const kbArticles = kbArticlesRaw || [];

    // ── Main pages (high priority) — multi-locale ──
    const mainPaths = [
        '',              // Homepage
        '/o-nas',
        '/oferta',
        '/oferta/implantologia',
        '/oferta/leczenie-kanalowe',
        '/oferta/stomatologia-estetyczna',
        '/oferta/ortodoncja',
        '/oferta/chirurgia',
        '/oferta/protetyka',
        '/cennik',
        '/kontakt',
        '/rezerwacja',
        '/dla-pacjentow-przyjezdnych', // H7 international landing
    ];
    const mainRoutes = mainPaths.flatMap((path) =>
        multiLocaleEntries(path, {
            changeFrequency: 'weekly',
            priority: path === '' ? 1 : 0.9,
        })
    );

    // ── Content & features (medium priority) — multi-locale ──
    const contentPaths = [
        '/aktualnosci',
        '/baza-wiedzy',
        '/metamorfozy',
        '/sklep',
        '/faq',
        '/nowosielski',
    ];
    const contentRoutes = contentPaths.flatMap((path) =>
        multiLocaleEntries(path, { changeFrequency: 'weekly', priority: 0.8 })
    );

    // ── Interactive tools (medium priority) — multi-locale ──
    // S5-1 (2026-05-15): /zadatek removed — page is noindex globally (Faza J-2)
    // because it has no organic search intent (one-purpose payment landing).
    const toolPaths = [
        '/mapa-bolu',
        '/kalkulator-leczenia',
        '/porownywarka',
        '/selfie',
        '/symulator',
        '/aplikacja',
    ];
    const toolRoutes = toolPaths.flatMap((path) =>
        multiLocaleEntries(path, { changeFrequency: 'monthly', priority: 0.7 })
    );

    // ── Legal pages (low priority) ──
    // S5-1 (2026-05-15): PL legal pages (regulamin/polityka-cookies/
    // polityka-prywatnosci/rodo) emit ONLY the PL URL — foreign locales render
    // the same Polish text and would compete for the wrong queries / get marked
    // as duplicate content. /privacy-policy stays multi-locale because it's the
    // dedicated international privacy page (separate folder, translated content).
    const plOnlyLegalPaths = [
        '/regulamin',
        '/polityka-cookies',
        '/polityka-prywatnosci',
        '/rodo',
    ];
    const plOnlyLegalRoutes: MetadataRoute.Sitemap = plOnlyLegalPaths.map((path) => ({
        url: `${BASE_URL}${path}`,
        lastModified: lastModForPath(path),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
    }));
    const internationalLegalRoutes = multiLocaleEntries('/privacy-policy', {
        changeFrequency: 'yearly',
        priority: 0.3,
    });
    const legalRoutes = [...plOnlyLegalRoutes, ...internationalLegalRoutes];

    // ── Dynamic: news articles from DB (multi-locale via title_en/de/ua, content_en/de/ua) ──
    // News uses the same slug across all locales (one row in `news` table per article,
    // with translations stored in {field}_{locale} columns). For each row we emit one
    // URL per locale + alternates.languages pointing to all 4 versions.
    const { data: newsRowsRaw } = await supabase
        .from('news')
        .select('slug, date, title_en, title_de, title_ua');
    const newsRows = newsRowsRaw || [];

    const newsRoutes: MetadataRoute.Sitemap = newsRows.flatMap((post: any) => {
        if (!post.slug) return [];

        // Build alternates for this article. PL is always present; others only if translated.
        // Slug is shared across locales — only the URL prefix differs per locale.
        const languages: Record<string, string> = {
            pl: `${BASE_URL}/aktualnosci/${post.slug}`,
            'x-default': `${BASE_URL}/aktualnosci/${post.slug}`,
        };
        if (post.title_en) languages.en = `${BASE_URL}/en/aktualnosci/${post.slug}`;
        if (post.title_de) languages.de = `${BASE_URL}/de/aktualnosci/${post.slug}`;
        if (post.title_ua) languages.uk = `${BASE_URL}/ua/aktualnosci/${post.slug}`;

        const lastModified = new Date(post.date);

        // Emit one entry per available locale (skip locales without translation)
        const entries: MetadataRoute.Sitemap = [
            { url: `${BASE_URL}/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages } },
        ];
        if (post.title_en) entries.push({ url: `${BASE_URL}/en/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages } });
        if (post.title_de) entries.push({ url: `${BASE_URL}/de/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages } });
        if (post.title_ua) entries.push({ url: `${BASE_URL}/ua/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages } });

        return entries;
    });

    // ── Dynamic: knowledge base articles — already per-locale in DB ──
    // Each row has its own locale + slug; we link translations via group_id for hreflang.
    const groupedKb = new Map<string, typeof kbArticles>();
    for (const a of kbArticles) {
        if (!a.group_id) continue;
        const list = groupedKb.get(a.group_id) || [];
        list.push(a);
        groupedKb.set(a.group_id, list);
    }
    const kbRoutes: MetadataRoute.Sitemap = kbArticles
        .filter((a) => a.locale && a.slug)
        .map((post) => {
            // For this row's URL: use locale prefix if not PL
            const url = `${BASE_URL}${localePath(post.locale, `/baza-wiedzy/${post.slug}`)}`;

            // Build hreflang alternates from all rows in the same group_id
            const groupRows = post.group_id ? groupedKb.get(post.group_id) || [post] : [post];
            const languages: Record<string, string> = {};
            for (const row of groupRows) {
                if (!row.locale || !row.slug) continue;
                const hreflang = HREFLANG_MAP[row.locale] || row.locale;
                languages[hreflang] = `${BASE_URL}${localePath(row.locale, `/baza-wiedzy/${row.slug}`)}`;
            }
            // x-default → PL row if exists
            const plRow = groupRows.find((r) => r.locale === 'pl');
            if (plRow?.slug) {
                languages['x-default'] = `${BASE_URL}/baza-wiedzy/${plRow.slug}`;
            }

            return {
                url,
                lastModified: new Date(post.published_date),
                changeFrequency: 'monthly' as const,
                priority: 0.7,
                alternates: { languages },
            };
        });

    return [...mainRoutes, ...contentRoutes, ...toolRoutes, ...legalRoutes, ...newsRoutes, ...kbRoutes];
}
