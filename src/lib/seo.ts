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

// URL prefix → OpenGraph locale (BCP 47-ish format `<lang>_<COUNTRY>`).
// OG spec uses `pl_PL`, `en_US`, etc. — language + country pair.
const OG_LOCALE_MAP: Record<string, string> = {
    pl: 'pl_PL',
    en: 'en_US',
    de: 'de_DE',
    ua: 'uk_UA',
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
            // Faza G5 (2026-05-10): per-locale OG locale (Facebook/LinkedIn share previews).
            locale: OG_LOCALE_MAP[locale] || OG_LOCALE_MAP.pl,
        },
        twitter: {
            // Faza G5: dodane Twitter description (root layout ma tylko card+image).
            // OG title/description są używane jeśli nie podamy własnych — ale jawne
            // Twitter tagi są bardziej niezawodne dla X/Twitter card preview.
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

// ════════════════════════════════════════════════════════════════════════════
// Faza G6 (2026-05-10): localized breadcrumbs
// Per-locale labels dla BreadcrumbList tak żeby EN/DE/UA użytkownicy widzieli
// w Google SERP "Home > Pricing" zamiast "Strona główna > Cennik".
// ════════════════════════════════════════════════════════════════════════════

const BREADCRUMB_LABELS: Record<string, Record<string, string>> = {
    pl: {
        home: 'Strona główna',
        oferta: 'Oferta',
        implantologia: 'Implantologia',
        chirurgia: 'Chirurgia Stomatologiczna',
        'leczenie-kanalowe': 'Leczenie Kanałowe',
        ortodoncja: 'Ortodoncja',
        protetyka: 'Protetyka',
        'stomatologia-estetyczna': 'Stomatologia Estetyczna',
        cennik: 'Cennik',
        kontakt: 'Kontakt',
        faq: 'FAQ',
        'mapa-bolu': 'Mapa bólu',
        'kalkulator-leczenia': 'Kalkulator czasu leczenia',
        porownywarka: 'Porównywarka rozwiązań',
        sklep: 'Sklep',
        metamorfozy: 'Metamorfozy',
        'o-nas': 'O nas',
        aktualnosci: 'Aktualności',
        'baza-wiedzy': 'Baza wiedzy',
        rezerwacja: 'Rezerwacja online',
        nowosielski: 'Blog Dr Nowosielski',
        aplikacja: 'Aplikacja PWA',
        selfie: 'Selfie Booth',
        symulator: 'Symulator uśmiechu',
    },
    en: {
        home: 'Home',
        oferta: 'Services',
        implantologia: 'Dental Implants',
        chirurgia: 'Oral Surgery',
        'leczenie-kanalowe': 'Root Canal Treatment',
        ortodoncja: 'Orthodontics',
        protetyka: 'Prosthodontics',
        'stomatologia-estetyczna': 'Aesthetic Dentistry',
        cennik: 'Pricing',
        kontakt: 'Contact',
        faq: 'FAQ',
        'mapa-bolu': 'Tooth Pain Map',
        'kalkulator-leczenia': 'Treatment Time Calculator',
        porownywarka: 'Treatment Comparator',
        sklep: 'Shop',
        metamorfozy: 'Smile Metamorphoses',
        'o-nas': 'About Us',
        aktualnosci: 'News',
        'baza-wiedzy': 'Knowledge Base',
        rezerwacja: 'Online Booking',
        nowosielski: "Dr Nowosielski's Blog",
        aplikacja: 'Patient App',
        selfie: 'Selfie Booth',
        symulator: 'Smile Simulator',
    },
    de: {
        home: 'Startseite',
        oferta: 'Leistungen',
        implantologia: 'Zahnimplantate',
        chirurgia: 'Mund-Kiefer-Chirurgie',
        'leczenie-kanalowe': 'Wurzelkanalbehandlung',
        ortodoncja: 'Kieferorthopädie',
        protetyka: 'Zahnprothetik',
        'stomatologia-estetyczna': 'Ästhetische Zahnmedizin',
        cennik: 'Preise',
        kontakt: 'Kontakt',
        faq: 'FAQ',
        'mapa-bolu': 'Zahnschmerzkarte',
        'kalkulator-leczenia': 'Behandlungsrechner',
        porownywarka: 'Behandlungsvergleich',
        sklep: 'Shop',
        metamorfozy: 'Lächeln-Metamorphosen',
        'o-nas': 'Über uns',
        aktualnosci: 'Aktuelles',
        'baza-wiedzy': 'Wissensdatenbank',
        rezerwacja: 'Online-Termin',
        nowosielski: 'Dr Nowosielski Blog',
        aplikacja: 'Patienten-App',
        selfie: 'Selfie Booth',
        symulator: 'Lächeln-Simulator',
    },
    ua: {
        home: 'Головна',
        oferta: 'Послуги',
        implantologia: 'Імпланти зубів',
        chirurgia: 'Стоматологічна хірургія',
        'leczenie-kanalowe': 'Лікування каналів',
        ortodoncja: 'Ортодонтія',
        protetyka: 'Протезування',
        'stomatologia-estetyczna': 'Естетична стоматологія',
        cennik: 'Ціни',
        kontakt: 'Контакти',
        faq: 'FAQ',
        'mapa-bolu': 'Карта болю',
        'kalkulator-leczenia': 'Калькулятор лікування',
        porownywarka: 'Порівняння методів',
        sklep: 'Магазин',
        metamorfozy: 'Метаморфози посмішки',
        'o-nas': 'Про нас',
        aktualnosci: 'Новини',
        'baza-wiedzy': 'База знань',
        rezerwacja: 'Онлайн запис',
        nowosielski: 'Блог д-ра Новосельського',
        aplikacja: 'Додаток пацієнта',
        selfie: 'Selfie Booth',
        symulator: 'Симулятор посмішки',
    },
};

export interface LocalizedBreadcrumbItem {
    /** Klucz w BREADCRUMB_LABELS (np. 'home', 'oferta', 'cennik'). Wymagany jeśli `name` nie podany. */
    key?: string;
    /** Explicit name override — używaj dla dynamic content (np. post.title). Bypassuje lookup w labels. */
    name?: string;
    /** URL pełny dla intermediate items. Omit dla current page (last item) — Google convention. */
    url?: string;
}

/**
 * Build a localized BreadcrumbList schema for the given locale.
 * Falls back to PL labels if locale not present, falls back to raw key if label missing.
 *
 * For dynamic content (article slugs, post titles) pass `name` directly:
 *   { name: post.title }  // skips key lookup
 *
 * @example
 *   localizedBreadcrumb('en', [
 *     { key: 'home', url: brand.appUrl },
 *     { key: 'oferta', url: `${brand.appUrl}/en/oferta` },
 *     { key: 'implantologia' }
 *   ])
 *   → BreadcrumbList z "Home > Services > Dental Implants"
 */
export function localizedBreadcrumb(locale: string, items: LocalizedBreadcrumbItem[]) {
    const labels = BREADCRUMB_LABELS[locale] || BREADCRUMB_LABELS.pl;
    return breadcrumbSchema(
        items.map((it) => ({
            name: it.name ?? (it.key ? (labels[it.key] || it.key) : ''),
            url: it.url,
        }))
    );
}

/**
 * Build the locale-prefixed URL for breadcrumb intermediate items.
 * @example breadcrumbHref('en', '/oferta') → 'https://www.mikrostomart.pl/en/oferta'
 */
export function breadcrumbHref(locale: string, path: string): string {
    return `${brand.appUrl}${localePath(locale, path)}`;
}

export interface AggregateRating {
    ratingValue: number;
    reviewCount: number;
}

export interface ListItem {
    name: string;
    url: string;
}

// ════════════════════════════════════════════════════════════════════════════
// H4 (2026-05-10): Localized Dentist availableService names
// Pre-H4 root layout emitted Polish service names (Implanty zębów,
// Leczenie kanałowe...) regardless of request locale, so EN/DE/UA pages
// returned schema with PL strings. This helper supplies per-locale names +
// locale-aware URLs.
// ════════════════════════════════════════════════════════════════════════════

interface ServiceItem {
    name: string;
    /** Locale-agnostic path of the service page (e.g. '/oferta/implantologia'). */
    path?: string;
}

const SERVICE_NAMES: Record<string, ServiceItem[]> = {
    pl: [
        { name: 'Implanty zębów', path: '/oferta/implantologia' },
        { name: 'Leczenie kanałowe pod mikroskopem', path: '/oferta/leczenie-kanalowe' },
        { name: 'Stomatologia estetyczna', path: '/oferta/stomatologia-estetyczna' },
        { name: 'Ortodoncja', path: '/oferta/ortodoncja' },
        { name: 'Protetyka', path: '/oferta/protetyka' },
        { name: 'Chirurgia stomatologiczna', path: '/oferta/chirurgia' },
        { name: 'Higienizacja i profilaktyka' }, // no dedicated landing page
    ],
    en: [
        { name: 'Dental Implants', path: '/oferta/implantologia' },
        { name: 'Microscopic Root Canal Treatment', path: '/oferta/leczenie-kanalowe' },
        { name: 'Aesthetic Dentistry', path: '/oferta/stomatologia-estetyczna' },
        { name: 'Orthodontics', path: '/oferta/ortodoncja' },
        { name: 'Prosthodontics', path: '/oferta/protetyka' },
        { name: 'Oral Surgery', path: '/oferta/chirurgia' },
        { name: 'Dental Hygiene and Prevention' },
    ],
    de: [
        { name: 'Zahnimplantate', path: '/oferta/implantologia' },
        { name: 'Mikroskopische Wurzelkanalbehandlung', path: '/oferta/leczenie-kanalowe' },
        { name: 'Ästhetische Zahnmedizin', path: '/oferta/stomatologia-estetyczna' },
        { name: 'Kieferorthopädie', path: '/oferta/ortodoncja' },
        { name: 'Zahnprothetik', path: '/oferta/protetyka' },
        { name: 'Mund-Kiefer-Chirurgie', path: '/oferta/chirurgia' },
        { name: 'Mundhygiene und Prävention' },
    ],
    ua: [
        { name: 'Імпланти зубів', path: '/oferta/implantologia' },
        { name: 'Мікроскопічне ендодонтичне лікування', path: '/oferta/leczenie-kanalowe' },
        { name: 'Естетична стоматологія', path: '/oferta/stomatologia-estetyczna' },
        { name: 'Ортодонтія', path: '/oferta/ortodoncja' },
        { name: 'Протезування', path: '/oferta/protetyka' },
        { name: 'Стоматологічна хірургія', path: '/oferta/chirurgia' },
        { name: 'Гігієна та профілактика' },
    ],
};

/**
 * Returns localized availableService array for Dentist/MedicalBusiness schema.
 * Each item is a MedicalProcedure with localized name + locale-aware absolute URL.
 *
 * @example
 *   getAvailableServices('en') →
 *     [{ "@type": "MedicalProcedure", name: "Dental Implants", url: "https://www.mikrostomart.pl/en/oferta/implantologia" }, ...]
 */
export function getAvailableServices(locale: string): Array<{ "@type": string; name: string; url?: string }> {
    const items = SERVICE_NAMES[locale] || SERVICE_NAMES.pl;
    return items.map((s) => ({
        "@type": "MedicalProcedure",
        "name": s.name,
        ...(s.path ? { url: `${brand.appUrl}${localePath(locale, s.path)}` } : {}),
    }));
}

/**
 * Maps URL prefix locale → ISO 639-1 BCP 47 hreflang code (ua → uk for Ukrainian).
 * Re-exposes HREFLANG_MAP for consumers outside seo.ts.
 */
export function hreflangCode(locale: string): string {
    return HREFLANG_MAP[locale] || locale;
}

/**
 * Build an ItemList schema.org JSON-LD object for collection pages
 * (e.g. /aktualnosci listing, /sklep, /nowosielski blog list).
 *
 * Faza G5 (2026-05-10): pomaga Google zrozumieć strukturę listingów i
 * pokazywać sitelinks w SERP.
 */
export function itemListSchema(items: ListItem[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: item.url,
            name: item.name,
        })),
    };
}

/**
 * Fetch news article slugs+titles for ItemList schema on /aktualnosci listing.
 * Locale-aware (uses translated title columns when available).
 * Returns empty array on error.
 */
export async function fetchNewsItems(locale: string): Promise<ListItem[]> {
    try {
        const titleColumn = locale === 'pl' ? 'title' : `title_${locale}`;
        const { data } = await supabase
            .from('news')
            .select(`slug, ${titleColumn}, title`)
            .order('date', { ascending: false })
            .limit(50);

        if (!data) return [];

        return data
            .filter((row: any) => row.slug)
            .map((row: any) => {
                const title = row[titleColumn] || row.title || row.slug;
                const url = locale === 'pl'
                    ? `${brand.appUrl}/aktualnosci/${row.slug}`
                    : `${brand.appUrl}/${locale}/aktualnosci/${row.slug}`;
                return { name: title, url };
            });
    } catch {
        return [];
    }
}

/**
 * Fetch shop products for ItemList schema on /sklep listing.
 * Uses translated names if available, falls back to PL.
 */
export async function fetchProductItems(locale: string): Promise<ListItem[]> {
    try {
        const { data } = await supabase
            .from('products')
            .select('id, name, name_translations, is_visible')
            .eq('is_visible', true)
            .limit(100);

        if (!data) return [];

        return data.map((row: any) => {
            const translations = row.name_translations || {};
            const name = (locale !== 'pl' && translations[locale]) || row.name || `Product ${row.id}`;
            // Shop doesn't have per-product URLs (modal-based) — link to shop with product ID
            const url = locale === 'pl'
                ? `${brand.appUrl}/sklep#product-${row.id}`
                : `${brand.appUrl}/${locale}/sklep#product-${row.id}`;
            return { name, url };
        });
    } catch {
        return [];
    }
}

/**
 * Fetch full product data for Product+Offer schemas on /sklep listing.
 * Returns enriched products eligible for Google Merchant rich results.
 *
 * H4 (2026-05-10): replaces bare ItemList with ItemList → Product entities.
 * Per-locale name + description; min_price used for variable-price products.
 */
interface ShopProduct {
    name: string;
    description: string;
    image?: string;
    url: string;
    price: number;
    priceCurrency: string;
}

export async function fetchShopProductsRich(locale: string): Promise<ShopProduct[]> {
    try {
        const { data } = await supabase
            .from('products')
            .select('id, name, description, image, price, min_price, is_variable_price, is_visible, name_translations, description_translations')
            .eq('is_visible', true)
            .limit(100);

        if (!data) return [];

        return data
            .filter((row: any) => row.name && (row.price || row.min_price))
            .map((row: any) => {
                const nameT = row.name_translations || {};
                const descT = row.description_translations || {};
                const name = (locale !== 'pl' && nameT[locale]) || row.name;
                const description = (locale !== 'pl' && descT[locale]) || row.description || name;

                const url = locale === 'pl'
                    ? `${brand.appUrl}/sklep#product-${row.id}`
                    : `${brand.appUrl}/${locale}/sklep#product-${row.id}`;

                // Variable-price vouchers use min_price as floor
                const price = row.is_variable_price ? Number(row.min_price) : Number(row.price);

                return {
                    name,
                    description,
                    image: row.image || undefined,
                    url,
                    price,
                    priceCurrency: 'PLN',
                };
            });
    } catch {
        return [];
    }
}

/**
 * Build ItemList → Product schemas for /sklep listing.
 * Each ListItem wraps a full Product entity with Offer (price, currency, availability).
 * Eligible for Google Shopping rich results.
 */
export function productListSchema(products: ShopProduct[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                name: p.name,
                description: p.description,
                ...(p.image ? { image: p.image } : {}),
                url: p.url,
                offers: {
                    '@type': 'Offer',
                    price: p.price,
                    priceCurrency: p.priceCurrency,
                    availability: 'https://schema.org/InStock',
                    url: p.url,
                },
            },
        })),
    };
}

/**
 * Fetch Dr Nowosielski blog posts for ItemList schema on /nowosielski listing.
 * Locale-aware via group_id for translations.
 */
export async function fetchBlogPostItems(locale: string): Promise<ListItem[]> {
    try {
        const { data } = await supabase
            .from('blog_posts')
            .select('slug, title, locale')
            .eq('locale', locale)
            .order('published_date', { ascending: false })
            .limit(50);

        if (!data || data.length === 0) {
            // Fallback to PL if no posts in requested locale
            const { data: plData } = await supabase
                .from('blog_posts')
                .select('slug, title, locale')
                .eq('locale', 'pl')
                .order('published_date', { ascending: false })
                .limit(50);
            if (!plData) return [];
            return plData.map((row: any) => ({
                name: row.title || row.slug,
                url: `${brand.appUrl}/nowosielski/${row.slug}`,
            }));
        }

        return data.map((row: any) => {
            const url = locale === 'pl'
                ? `${brand.appUrl}/nowosielski/${row.slug}`
                : `${brand.appUrl}/${locale}/nowosielski/${row.slug}`;
            return { name: row.title || row.slug, url };
        });
    } catch {
        return [];
    }
}

/**
 * Fetch aggregate rating from Google Reviews stored in Supabase.
 * Returns null on error or empty cache (caller should skip aggregateRating in schema).
 *
 * Used in root layout's Dentist schema to enable rich SERP stars.
 *
 * Counts ALL reviews 1-5★ — Google's "Review snippet" guidelines forbid filtering
 * out negatives ("manipulated rating" penalty). Pre-2026-05-10 implementation used
 * `.gte('rating', 4)` which inflated the rating; rolled back to honest aggregate.
 * If average drops below 3.5★ the schema is omitted entirely (low/0-rating rich
 * results actively hurt CTR).
 *
 * Cached for 1 hour via Next.js Data Cache (revalidate tag).
 */
export async function getAggregateRating(): Promise<AggregateRating | null> {
    try {
        const { data, error } = await supabase
            .from('google_reviews')
            .select('rating');

        if (error || !data || data.length === 0) {
            return null;
        }

        const ratings = data.map((r) => r.rating).filter((r) => typeof r === 'number');
        if (ratings.length === 0) return null;

        const sum = ratings.reduce((acc, r) => acc + r, 0);
        const avg = sum / ratings.length;

        if (avg < 3.5) return null;

        return {
            ratingValue: Math.round(avg * 10) / 10,
            reviewCount: ratings.length,
        };
    } catch {
        return null;
    }
}
