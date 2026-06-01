import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { brand } from '@/lib/brandConfig';
import { isDemoMode } from '@/lib/demoMode';
import { routing } from '@/i18n/routing';
import { routeMtimes, buildTime } from '@/lib/generated-route-mtimes';
import { METAMORPHOSES } from '@/data/metamorphoses';

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

// Absolutize image path for image sitemap (image:loc must be absolute URL).
const absImg = (img: string): string => (img.startsWith('http') ? img : `${BASE_URL}${img}`);

// Generate sitemap entries for a path across all locales.
// Pakiet image-sitemap (2026-06-01): opcjonalne `images` → Next renderuje
// <image:image><image:loc> (Next 14.2+) dla Google Images discovery.
function multiLocaleEntries(
    path: string,
    options: { changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; priority: number; images?: string[] }
): MetadataRoute.Sitemap {
    const lastModified = lastModForPath(path);
    return routing.locales.map((locale) => ({
        url: `${BASE_URL}${localePath(locale, path)}`,
        lastModified,
        changeFrequency: options.changeFrequency,
        priority: options.priority,
        alternates: { languages: buildAlternates(path) },
        ...(options.images && options.images.length ? { images: options.images } : {}),
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Demo deployment (demo.densflow.ai) must not be indexed: it would cannibalize
    // mikrostomart.pl in Google. Robots.txt blocks crawling, sitemap returns empty.
    if (isDemoMode) return [];

    // Knowledge Base articles — multi-locale (each article × 4 rows in DB linked by group_id)
    const { data: kbArticlesRaw } = await supabase
        .from('articles')
        .select('slug, published_date, locale, group_id, image_url');

    // S10-4 (audyt SEO SEO-01): defensywny filter slug pattern. 4 KB articles w DB
    // miały slugi z polskimi/niemieckimi diacritics (`lęk`, `świeżości`, `błyszczacy`,
    // `natürliches`) które routing'iem Next.js zwracał 404 — sitemap zgłaszał ich
    // URLs jako indexable ale strona nie istnieje. GSC: "Submitted URL not found".
    // Filter accepts tylko URL-safe slugi (a-z, 0-9, dash). Jeśli przyjdzie kolejny
    // artykuł z diacritics — auto-skip + warning w build log zamiast 404 w sitemap.
    const SAFE_SLUG = /^[a-z0-9-]+$/;
    const isSafeSlug = (slug: string | null | undefined): boolean =>
        typeof slug === 'string' && SAFE_SLUG.test(slug);

    const kbArticles = (kbArticlesRaw || []).filter((a) => {
        if (!isSafeSlug(a.slug)) {
            console.warn(`[sitemap] Skipping KB article with unsafe slug: "${a.slug}" (locale=${a.locale}) — rename slug in DB to URL-safe pattern.`);
            return false;
        }
        return true;
    });

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
        '/akredytacje', // K-2b index page
        '/akredytacje/pte',
        '/akredytacje/ese',
        '/akredytacje/ptsl',
        '/akredytacje/rwth-aachen',
        '/akredytacje/la-ha',
        // Batch SEO-2 (2026-05-21): dedykowane strony zespołu (audyt P1).
        // Każda osoba = osobny URL z własnym Person/Physician schema.
        '/zespol/marcin-nowosielski',
        '/zespol/elzbieta-nowosielska',
        // L-4 (2026-05-21): warranty hub — multi-locale indexable (trust signal
        // dla foreign dental tourism, locale-aware Kostenerstattung dla DE).
        '/gwarancje',
    ];
    const mainRoutes = mainPaths.flatMap((path) =>
        multiLocaleEntries(path, {
            changeFrequency: 'weekly',
            priority: path === '' ? 1 : 0.9,
        })
    );

    // ── Content & features (medium priority) — multi-locale ──
    // S10-4 (audyt SEO SEO-01): `/sklep` wykluczone z multi-locale emit.
    // S5-2 ustawił /en/sklep, /de/sklep, /ua/sklep jako noindex (content PL-only),
    // ale sitemap nadal emituje je multi-locale → GSC raportuje "Submitted URL
    // marked noindex". Fix: tylko PL emit poniżej w osobnym bloku.
    const contentPaths = [
        '/aktualnosci',
        '/baza-wiedzy',
        '/faq',
        '/nowosielski',
    ];
    const contentRoutes = contentPaths.flatMap((path) =>
        multiLocaleEntries(path, { changeFrequency: 'weekly', priority: 0.8 })
    );

    // /metamorfozy — multi-locale + image sitemap. 16 metamorfoz × 2 (before/after)
    // = 32 obrazów do Google Images (high visual intent: "metamorfoza zębów", "implant Opole").
    const metamorphosisImages = METAMORPHOSES.flatMap((m) => [absImg(m.before), absImg(m.after)]);
    const metamorfozyRoutes = multiLocaleEntries('/metamorfozy', {
        changeFrequency: 'weekly', priority: 0.8, images: metamorphosisImages,
    });

    // /sklep — PL only (foreign locales są noindex via layout.tsx)
    const shopRoute: MetadataRoute.Sitemap = [{
        url: `${BASE_URL}/sklep`,
        lastModified: lastModForPath('/sklep'),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }];

    // L-1 (2026-05-21 NIGHT+1): /implanty-opole — PL-only local geo page
    // (foreign locales są noindex via layout.tsx — PL slug bez intencji organicznej w EN/DE/UA).
    const implantyOpoleRoute: MetadataRoute.Sitemap = [{
        url: `${BASE_URL}/implanty-opole`,
        lastModified: lastModForPath('/implanty-opole'),
        changeFrequency: 'monthly' as const,
        priority: 0.9, // local geo + high commercial intent
    }];

    // L-2 (2026-05-21 NIGHT+1): 2 dodatkowe PL-only local geo pages
    const localGeoRoutes: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}/leczenie-kanalowe-opole-mikroskop`,
            lastModified: lastModForPath('/leczenie-kanalowe-opole-mikroskop'),
            changeFrequency: 'monthly' as const,
            priority: 0.9, // specialty + high commercial intent (endodoncja Marcina specjalność)
        },
        {
            url: `${BASE_URL}/dentysta-opole-centrum`,
            lastModified: lastModForPath('/dentysta-opole-centrum'),
            changeFrequency: 'monthly' as const,
            priority: 0.9, // broad geo query, high search volume
        },
    ];

    // Pakiet C (2026-06-01): dedykowane geo-landingi DE/EN — indeksowane TYLKO w
    // target locale (DE/EN), pozostałe locale noindex (layout.tsx). Emitujemy URL
    // tylko dla indeksowanego locale + hreflang alternates (buildAlternates).
    const intlGeoRoutes: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}/de/zahnarzt-opole`,
            lastModified: lastModForPath('/zahnarzt-opole'),
            changeFrequency: 'monthly' as const,
            priority: 0.9, // DE dental tourism, high commercial intent
            alternates: { languages: buildAlternates('/zahnarzt-opole') },
        },
        {
            url: `${BASE_URL}/en/dentist-opole`,
            lastModified: lastModForPath('/dentist-opole'),
            changeFrequency: 'monthly' as const,
            priority: 0.9, // EN international dental tourism
            alternates: { languages: buildAlternates('/dentist-opole') },
        },
    ];

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
    // S10-4 (audyt SEO SEO-01): `/privacy-policy` EN-only (PL/DE/UA wersje
    // są noindex via layout.tsx canonical → /polityka-prywatnosci). Wcześniej
    // sitemap emitował wszystkie 4 locale → GSC "Submitted URL marked noindex"
    // dla /privacy-policy + /de/privacy-policy + /ua/privacy-policy.
    const internationalLegalRoutes: MetadataRoute.Sitemap = [{
        url: `${BASE_URL}/en/privacy-policy`,
        lastModified: lastModForPath('/privacy-policy'),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
    }];
    const legalRoutes = [...plOnlyLegalRoutes, ...internationalLegalRoutes];

    // ── Dynamic: news articles from DB (multi-locale via title_en/de/ua, content_en/de/ua) ──
    // News uses the same slug across all locales (one row in `news` table per article,
    // with translations stored in {field}_{locale} columns). For each row we emit one
    // URL per locale + alternates.languages pointing to all 4 versions.
    const { data: newsRowsRaw } = await supabase
        .from('news')
        .select('slug, date, image, title_en, title_de, title_ua');

    // S10-4: same defensywny filter dla news slugs (na wszelki wypadek — news
    // slug pattern jest historycznie URL-safe ale prewencja regresji).
    const newsRows = (newsRowsRaw || []).filter((n: any) => {
        if (!isSafeSlug(n.slug)) {
            console.warn(`[sitemap] Skipping news article with unsafe slug: "${n.slug}"`);
            return false;
        }
        return true;
    });

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
        const img = post.image ? { images: [absImg(post.image)] } : {};

        // Emit one entry per available locale (skip locales without translation)
        const entries: MetadataRoute.Sitemap = [
            { url: `${BASE_URL}/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages }, ...img },
        ];
        if (post.title_en) entries.push({ url: `${BASE_URL}/en/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages }, ...img });
        if (post.title_de) entries.push({ url: `${BASE_URL}/de/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages }, ...img });
        if (post.title_ua) entries.push({ url: `${BASE_URL}/ua/aktualnosci/${post.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages }, ...img });

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
                ...(post.image_url ? { images: [absImg(post.image_url)] } : {}),
            };
        });

    return [...mainRoutes, ...contentRoutes, ...metamorfozyRoutes, ...shopRoute, ...implantyOpoleRoute, ...localGeoRoutes, ...intlGeoRoutes, ...toolRoutes, ...legalRoutes, ...newsRoutes, ...kbRoutes];
}
