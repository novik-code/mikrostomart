import { MetadataRoute } from 'next';
import { articles } from '@/data/articles'; // News
import { supabase } from '@/lib/supabaseClient';
import { brand } from '@/lib/brandConfig';
import { routing } from '@/i18n/routing';

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
    return routing.locales.map((locale) => ({
        url: `${BASE_URL}${localePath(locale, path)}`,
        lastModified: new Date(),
        changeFrequency: options.changeFrequency,
        priority: options.priority,
        alternates: { languages: buildAlternates(path) },
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    const toolPaths = [
        '/mapa-bolu',
        '/kalkulator-leczenia',
        '/porownywarka',
        '/selfie',
        '/symulator',
        '/aplikacja',
        '/zadatek',
    ];
    const toolRoutes = toolPaths.flatMap((path) =>
        multiLocaleEntries(path, { changeFrequency: 'monthly', priority: 0.7 })
    );

    // ── Legal pages (low priority) — multi-locale ──
    const legalPaths = [
        '/regulamin',
        '/polityka-cookies',
        '/polityka-prywatnosci',
        '/rodo',
        '/privacy-policy',
    ];
    const legalRoutes = legalPaths.flatMap((path) =>
        multiLocaleEntries(path, { changeFrequency: 'yearly', priority: 0.3 })
    );

    // ── Dynamic: news articles (currently PL only — translation pending) ──
    // TODO: when AI translates 14 articles from data/articles.ts to EN/DE/UA,
    // expand this to multi-locale entries.
    const newsRoutes: MetadataRoute.Sitemap = articles.map((post) => ({
        url: `${BASE_URL}/aktualnosci/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

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
