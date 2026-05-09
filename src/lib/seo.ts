/**
 * SEO helpers — per-page hreflang + canonical + locale-aware metadata + structured data.
 *
 * Faza G1 (2026-05-09): rozwiązuje problem globalnego hreflang w root layout który
 * deklarował każdą podstronę jako homepage w innym locale (np. `/oferta` w EN miało
 * wskazywać na `/en` zamiast `/en/oferta`). Każda public page deklaruje teraz własny
 * zestaw alternates.languages z poprawnymi per-page URLami.
 *
 * Faza G2 (2026-05-09): dodano helpers schema.org:
 * - breadcrumbSchema() — generator BreadcrumbList JSON-LD
 * - getAggregateRating() — agregat z Google Reviews dla rich SERP gwiazdek
 */
import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { brand } from '@/lib/brandConfig';
import { isDemoMode } from '@/lib/demoMode';
import { supabase } from '@/lib/supabaseClient';

// URL prefix → ISO 639-1 hreflang code. UA prefix maps to 'uk' (Ukrainian language).
const HREFLANG_MAP: Record<string, string> = {
    pl: 'pl',
    en: 'en',
    de: 'de',
    ua: 'uk',
};

/**
 * Build a locale-prefixed path. PL (default) has no prefix.
 * @example localePath('en', '/oferta') → '/en/oferta'
 * @example localePath('pl', '/oferta') → '/oferta'
 * @example localePath('en', '/') → '/en'
 */
export function localePath(locale: string, path: string): string {
    const cleanPath = path === '/' ? '' : path;
    if (locale === routing.defaultLocale) {
        return cleanPath || '/';
    }
    return `/${locale}${cleanPath}`;
}

/**
 * Build hreflang alternates.languages map for a given path.
 * Returns absolute URLs for each locale + x-default.
 * @example buildHreflangAlternates('/oferta') →
 *   { pl: 'https://www.mikrostomart.pl/oferta',
 *     en: 'https://www.mikrostomart.pl/en/oferta',
 *     de: 'https://www.mikrostomart.pl/de/oferta',
 *     uk: 'https://www.mikrostomart.pl/ua/oferta',
 *     'x-default': 'https://www.mikrostomart.pl/oferta' }
 */
export function buildHreflangAlternates(path: string): Record<string, string> {
    const langs: Record<string, string> = {};
    for (const locale of routing.locales) {
        const hreflang = HREFLANG_MAP[locale] || locale;
        langs[hreflang] = `${brand.appUrl}${localePath(locale, path)}`;
    }
    langs['x-default'] = `${brand.appUrl}${localePath(routing.defaultLocale, path)}`;
    return langs;
}

/**
 * Build canonical URL (relative path) for current locale + path.
 * Returns relative path so Next.js prepends metadataBase automatically.
 */
export function buildCanonical(locale: string, path: string): string {
    return localePath(locale, path);
}

export interface PageSeoContent {
    title: string;
    description: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
}

/**
 * Per-locale SEO content map. Keys are locale codes (matching routing.locales),
 * values contain title/description/keywords for that locale.
 */
export type LocaleSeoMap = Partial<Record<string, PageSeoContent>>;

/**
 * High-level helper: build full Metadata object for a per-locale page with proper
 * canonical + hreflang + per-locale title/description.
 *
 * Falls back to PL content if the requested locale isn't in the map (safety net).
 *
 * Note: title is always emitted as `title.absolute` (bypassing root layout's
 * `titleTemplate` of `%s | Mikrostomart - Dentysta Opole`). PAGE_SEO entries
 * already include brand + location in the title — using the template would
 * duplicate brand suffix (e.g. "Oferta | Mikrostomart - Stomatolog Opole | Mikrostomart - Dentysta Opole").
 *
 * @param locale - the current page locale ('pl' | 'en' | 'de' | 'ua')
 * @param path - locale-agnostic path WITHOUT locale prefix (e.g. '/oferta', '/cennik')
 * @param content - per-locale content map. PL is required as fallback.
 * @param options - optional demo override
 */
export function pageMetadata(
    locale: string,
    path: string,
    content: LocaleSeoMap,
    options?: { demoOverride?: PageSeoContent }
): Metadata {
    const seo = (isDemoMode && options?.demoOverride)
        ? options.demoOverride
        : (content[locale] || content.pl || content.en);

    if (!seo) {
        // Should never happen if PL is provided, but be safe
        return {
            alternates: {
                canonical: buildCanonical(locale, path),
                languages: buildHreflangAlternates(path),
            },
        };
    }

    return {
        title: { absolute: seo.title },
        description: seo.description,
        keywords: seo.keywords,
        alternates: {
            canonical: buildCanonical(locale, path),
            languages: buildHreflangAlternates(path),
        },
        openGraph: {
            title: seo.ogTitle || seo.title,
            description: seo.ogDescription || seo.description,
        },
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Faza G2: Structured data helpers
// ════════════════════════════════════════════════════════════════════════════

export interface BreadcrumbItem {
    name: string;
    /** Absolute URL. Omit for the current (last) breadcrumb item — Google convention. */
    url?: string;
}

/**
 * Build a BreadcrumbList schema.org JSON-LD object.
 * Renders as `<script type="application/ld+json">` in page layout.
 *
 * Convention: last item (current page) typically has no URL — Google treats it
 * as "you are here" implicit reference.
 *
 * @example
 *   breadcrumbSchema([
 *     { name: 'Strona główna', url: brand.appUrl },
 *     { name: 'Cennik' }  // current page
 *   ])
 */
export function breadcrumbSchema(items: BreadcrumbItem[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            ...(item.url ? { item: item.url } : {}),
        })),
    };
}

export interface AggregateRating {
    ratingValue: number;
    reviewCount: number;
}

/**
 * Fetch aggregate rating from Google Reviews stored in Supabase.
 * Returns null on error or empty cache (caller should skip aggregateRating in schema).
 *
 * Used in root layout's Dentist schema to enable rich SERP stars.
 * Counts only reviews ≥ 4 stars (matches GoogleReviews component filter).
 *
 * Cached for 1 hour via Next.js Data Cache (revalidate tag).
 */
export async function getAggregateRating(): Promise<AggregateRating | null> {
    try {
        const { data, error } = await supabase
            .from('google_reviews')
            .select('rating')
            .gte('rating', 4);

        if (error || !data || data.length === 0) {
            return null;
        }

        const ratings = data.map((r) => r.rating).filter((r) => typeof r === 'number');
        if (ratings.length === 0) return null;

        const sum = ratings.reduce((acc, r) => acc + r, 0);
        const avg = sum / ratings.length;

        return {
            ratingValue: Math.round(avg * 10) / 10,
            reviewCount: ratings.length,
        };
    } catch {
        return null;
    }
}
