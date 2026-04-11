import { isDemoMode } from './demoMode';

export interface BrandLegalEntity {
    name: string;           // e.g. "ELMAR sp. z o.o."
    nip: string;            // e.g. "7543251709"
    krs: string;            // e.g. "0000815074"
    board: string[];        // e.g. ["Marcin Nowosielski", "Elżbieta Nowosielska"]
}

export interface BrandConfig {
    // === Identity ===
    name: string;
    fullName: string;
    slogan: string;
    logoAlt: string;

    // === Contact ===
    phone1: string;
    phone2: string;
    email: string;                  // reception/main email (gabinet@)
    senderEmail: string;            // transactional email sender (noreply@)
    notificationEmail: string;      // notification sender (powiadomienia@)
    vapidEmail: string;             // VAPID contact for web push

    // === Address ===
    streetAddress: string;
    city: string;
    cityShort: string;              // without district, e.g. "Opole"
    postalCode: string;
    region: string;
    country: string;
    mapQuery: string;
    mapEmbedUrl: string;            // Google Maps embed iframe URL

    // === Legal Entity ===
    legalEntity: BrandLegalEntity;

    // === Domain / URLs ===
    appUrl: string;                 // e.g. "https://mikrostomart.pl"
    metadataBase: string;

    // === SEO ===
    titleDefault: string;
    titleTemplate: string;
    description: string;
    keywords: string;
    ogSiteName: string;
    ogImageAlt: string;

    // === Social ===
    facebookUrl: string;

    // === Schema.org ===
    schemaName: string;
    schemaAlternateName: string;
    schemaDescription: string;
    schemaId: string;
    schemaUrl: string;
    schemaImage: string;

    // === Geo ===
    geoRegion: string;
    geoPlacename: string;
    geoPosition: string;
    icbm: string;

    // === SMS ===
    smsSenderName: string;          // SMSAPI sender name

    // === AI Context ===
    aiClinicDescription: string;    // Used in system prompts: "gabinetu stomatologicznego X w Y"
    aiBlogAuthor: string;           // Used in blog generator: "Jesteś [name] — dentystą z [city]"

    // === PMS ===
    pmsName: string;                // e.g. "Prodentis", "Standalone"

    // === External Service IDs (optional) ===
    googlePlaceId?: string;
    youtubeChannelId?: string;
    githubOwner?: string;
    githubRepo?: string;

    // === Branding Wizard (optional) ===
    logoUrl?: string;
    companyName?: string;
    nip?: string;                   // @deprecated — use legalEntity.nip
}

const PROD_BRAND: BrandConfig = {
    // Identity
    name: 'Mikrostomart',
    fullName: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna',
    slogan: 'Mikroskopowa Stomatologia Artystyczna',
    logoAlt: 'Mikrostomart Logo',

    // Contact
    phone1: '570-270-470',
    phone2: '570-810-800',
    email: 'gabinet@mikrostomart.pl',
    senderEmail: 'noreply@mikrostomart.pl',
    notificationEmail: 'powiadomienia@mikrostomart.pl',
    vapidEmail: 'gabinet@mikrostomart.pl',

    // Address
    streetAddress: 'ul. Centralna 33a',
    city: 'Opole/Chmielowice',
    cityShort: 'Opole',
    postalCode: '45-940',
    region: 'opolskie',
    country: 'PL',
    mapQuery: 'Mikrostomart+Opole+ul.+Centralna+33a',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2533.8!2d17.866163!3d50.677682!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTDCsDQwJzM5LjciTiAxN8KwNTEnNTguMiJF!5e0!3m2!1spl!2spl',

    // Legal Entity
    legalEntity: {
        name: 'ELMAR sp. z o.o.',
        nip: '7543251709',
        krs: '0000815074',
        board: ['Marcin Nowosielski', 'Elżbieta Nowosielska'],
    },

    // Domain / URLs
    appUrl: 'https://mikrostomart.pl',
    metadataBase: 'https://mikrostomart.pl',

    // SEO
    titleDefault: 'Mikrostomart — Dentysta Opole',
    titleTemplate: '%s | Mikrostomart - Dentysta Opole',
    description: 'Szukasz dentysty w Opolu? Mikrostomart to nowoczesny gabinet stomatologiczny. Specjalizujemy się w implantach, leczeniu kanałowym i estetyce. Umów wizytę w Opolu (Chmielowice).',
    keywords: 'dentysta opole, stomatolog opole, implanty opole, leczenie kanałowe opole, mikrostomart, stomatologia mikroskopowa',
    ogSiteName: 'Mikrostomart - Dentysta Opole',
    ogImageAlt: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna w Opolu',

    // Social
    facebookUrl: 'https://www.facebook.com/mikrostomart',

    // Schema.org
    schemaName: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna',
    schemaAlternateName: 'Mikrostomart Gabinet Stomatologiczny',
    schemaDescription: 'Nowoczesny gabinet stomatologiczny w Opolu specjalizujący się w implantologii, stomatologii mikroskopowej, leczeniu kanałowym i estetyce. Zaawansowana technologia, indywidualne podejście.',
    schemaImage: 'https://mikrostomart.pl/logo-transparent.png',
    schemaId: 'https://mikrostomart.pl',
    schemaUrl: 'https://mikrostomart.pl',

    // Geo
    geoRegion: 'PL-OP',
    geoPlacename: 'Opole',
    geoPosition: '50.677682;17.866163',
    icbm: '50.677682, 17.866163',

    // SMS
    smsSenderName: 'Mikrostomart',

    // AI Context
    aiClinicDescription: 'gabinetu stomatologicznego Mikrostomart w Opolu',
    aiBlogAuthor: 'Jesteś Marcinem Nowosielskim — dentystą z Opola, prowadzącym gabinet Mikrostomart',

    // PMS
    pmsName: 'Prodentis',

    // External Service IDs
    googlePlaceId: 'ChIJ...',  // TODO: fill real Place ID
    youtubeChannelId: 'UC...',  // TODO: fill real Channel ID
    githubOwner: 'novik-code',
    githubRepo: 'mikrostomart',
};

const DEMO_BRAND: BrandConfig = {
    // Identity
    name: 'DensFlow Demo',
    fullName: 'DensFlow — System Zarządzania Gabinetem',
    slogan: 'Nowoczesne Zarządzanie Gabinetem Stomatologicznym',
    logoAlt: 'DensFlow Demo',

    // Contact
    phone1: '000-000-000',
    phone2: '000-000-000',
    email: 'kontakt@demo.densflow.ai',
    senderEmail: 'noreply@demo.densflow.ai',
    notificationEmail: 'powiadomienia@demo.densflow.ai',
    vapidEmail: 'kontakt@demo.densflow.ai',

    // Address
    streetAddress: 'ul. Przykładowa 1',
    city: 'Warszawa',
    cityShort: 'Warszawa',
    postalCode: '00-001',
    region: 'mazowieckie',
    country: 'PL',
    mapQuery: 'Warszawa',
    mapEmbedUrl: '',

    // Legal Entity
    legalEntity: {
        name: 'Demo Dental Sp. z o.o.',
        nip: '0000000000',
        krs: '0000000000',
        board: ['Jan Kowalski'],
    },

    // Domain / URLs
    appUrl: 'https://demo.densflow.ai',
    metadataBase: 'https://demo.densflow.ai',

    // SEO
    titleDefault: 'DensFlow Demo — System Zarządzania Gabinetem Stomatologicznym',
    titleTemplate: '%s | DensFlow Demo',
    description: 'Wypróbuj DensFlow — kompleksowy system zarządzania gabinetem stomatologicznym. Rezerwacje online, panel pacjenta, zarządzanie zespołem, SMS, blog i więcej.',
    keywords: 'system gabinet stomatologiczny, oprogramowanie dentysta, zarządzanie gabinetem, densflow, rezerwacje online dentysta',
    ogSiteName: 'DensFlow Demo',
    ogImageAlt: 'DensFlow — System Zarządzania Gabinetem Stomatologicznym',

    // Social
    facebookUrl: '',

    // Schema.org
    schemaName: 'DensFlow Demo — System Zarządzania Gabinetem',
    schemaAlternateName: 'DensFlow Demo Clinic',
    schemaDescription: 'Wersja demonstracyjna systemu DensFlow do zarządzania gabinetem stomatologicznym. Rezerwacje, panel pacjenta, panel pracownika, panel admina.',
    schemaImage: 'https://demo.densflow.ai/logo-transparent.png',
    schemaId: 'https://demo.densflow.ai',
    schemaUrl: 'https://demo.densflow.ai',

    // Geo
    geoRegion: 'PL-MZ',
    geoPlacename: 'Warszawa',
    geoPosition: '52.229676;21.012229',
    icbm: '52.229676, 21.012229',

    // SMS
    smsSenderName: 'DensFlow',

    // AI Context
    aiClinicDescription: 'gabinetu stomatologicznego Demo w Warszawie',
    aiBlogAuthor: 'Jesteś dentystą prowadzącym nowoczesny gabinet stomatologiczny',

    // PMS
    pmsName: 'Standalone',
};

// ===================== DYNAMIC BRAND =====================

const DEFAULT_BRAND: BrandConfig = isDemoMode ? DEMO_BRAND : PROD_BRAND;

/**
 * The active brand configuration.
 * Starts with hardcoded defaults (PROD_BRAND or DEMO_BRAND).
 * Updated at runtime via setBrand() on client or loadBrandFromDB() on server.
 * 
 * SAFETY CONTRACT: If DB is empty/errored, this always equals the hardcoded default.
 */
export let brand: BrandConfig = { ...DEFAULT_BRAND };

/**
 * Client-side: update brand from fetched data.
 * Merges overrides with defaults — never wipes fields.
 * Called by ThemeProvider after loading /api/theme.
 */
export function setBrand(overrides: Partial<BrandConfig>): void {
    if (!overrides || typeof overrides !== 'object') return;
    brand = { ...DEFAULT_BRAND, ...overrides };
}

/**
 * Server-side: load brand config from Supabase site_settings.
 * Returns full BrandConfig (DB values merged with defaults).
 * On ANY error, returns hardcoded defaults — production is never broken.
 */
export async function loadBrandFromDB(): Promise<BrandConfig> {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) return { ...DEFAULT_BRAND };

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'brand')
            .maybeSingle();

        if (error || !data?.value) return { ...DEFAULT_BRAND };

        const dbBrand = data.value as Partial<BrandConfig>;
        // Never override titleDefault from DB — it controls PWA install name
        // and must stay short. DB may have stale long SEO title.
        delete dbBrand.titleDefault;
        return { ...DEFAULT_BRAND, ...dbBrand };
    } catch {
        // SAFETY: on any error, return hardcoded defaults
        return { ...DEFAULT_BRAND };
    }
}

/**
 * Sanitizes text by replacing Mikrostomart-specific references with generic demo equivalents.
 * In production mode, returns the input string unchanged.
 * Use this at output points (emails, SMS, AI prompts, rendered text) to neutralize branding.
 */
export function demoSanitize(text: string): string {
    if (!isDemoMode || !text) return text;

    return text
        // Email / domain
        .replace(/gabinet@mikrostomart\.pl/gi, 'kontakt@demo.densflow.ai')
        .replace(/mikrostomart\.pl/gi, 'demo.densflow.ai')
        // Address
        .replace(/ul\.\s*Centralna?\s*33\s*[aA]?/gi, 'ul. Przykładowa 1')
        .replace(/45[\s-]*940/g, '00-001')
        .replace(/Opole[\s/]*Chmielowice/gi, 'Warszawa')
        .replace(/w\s+Opolu/gi, 'w Warszawie')
        .replace(/\bOpole\b/gi, 'Warszawa')
        // Phone
        .replace(/570[\s-]*270[\s-]*470/g, '000-000-000')
        .replace(/570[\s-]*810[\s-]*800/g, '000-000-000')
        // Brand name (order matters — longer patterns first)
        .replace(/MIKROSTOMART[\s–-]*Mikroskopow[aą]\s*Stomatologi[aąę]\s*Artystyczn[aąą]/gi, 'Klinika Demo — Gabinet Stomatologiczny')
        .replace(/Mikroskopow[aą]\s*Stomatologi[aąę]\s*Artystyczn[aąą]/gi, 'Gabinet Stomatologiczny')
        .replace(/MIKROSTOMART/g, 'KLINIKA DEMO')
        .replace(/Mikrostomart/g, 'Klinika Demo')
        .replace(/mikrostomart/g, 'klinika-demo')
        // NIP / company details
        .replace(/ELMAR\s+SP(?:ÓŁKA|\.)\s*Z\s*(?:OGRANICZONĄ\s*ODPOWIEDZIALNOŚCIĄ|O\.?\s*O\.?)/gi, 'Demo Dental Sp. z o.o.')
        .replace(/NIP:\s*7543251709/gi, 'NIP: 0000000000')
        .replace(/7543251709/g, '0000000000');
}

/**
 * Returns interpolation params for next-intl t() calls that use {brandName},
 * {cityShort}, {phone1}, {legalName}, or {email} tokens.
 *
 * Usage:
 *   t('greeting', brandI18nParams())          // server component
 *   t('copyright', { ...brandI18nParams(), year: new Date().getFullYear() })
 */
export function brandI18nParams(): Record<string, string> {
    return {
        brandName: brand.name,
        cityShort: brand.cityShort,
        phone1: brand.phone1,
        legalName: brand.legalEntity?.name || brand.name,
        email: brand.senderEmail,
    };
}
