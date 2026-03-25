import { isDemoMode } from './demoMode';

interface BrandConfig {
    name: string;
    fullName: string;
    slogan: string;
    logoAlt: string;
    phone1: string;
    phone2: string;
    email: string;
    streetAddress: string;
    city: string;
    postalCode: string;
    region: string;
    country: string;
    mapQuery: string;
    metadataBase: string;
    titleDefault: string;
    titleTemplate: string;
    description: string;
    keywords: string;
    ogSiteName: string;
    ogImageAlt: string;
    facebookUrl: string;
    schemaName: string;
    schemaAlternateName: string;
    schemaDescription: string;
    schemaId: string;
    schemaUrl: string;
    schemaImage: string;
    geoRegion: string;
    geoPlacename: string;
    geoPosition: string;
    icbm: string;
}

const PROD_BRAND: BrandConfig = {
    name: 'Mikrostomart',
    fullName: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna',
    slogan: 'Mikroskopowa Stomatologia Artystyczna',
    logoAlt: 'Mikrostomart Logo',
    phone1: '570-270-470',
    phone2: '570-810-800',
    email: 'gabinet@mikrostomart.pl',
    streetAddress: 'ul. Centralna 33a',
    city: 'Opole/Chmielowice',
    postalCode: '45-940',
    region: 'opolskie',
    country: 'PL',
    mapQuery: 'Mikrostomart+Opole+ul.+Centralna+33a',
    metadataBase: 'https://mikrostomart.pl',
    titleDefault: 'Dentysta Opole - Mikrostomart | Implanty i Stomatologia Mikroskopowa',
    titleTemplate: '%s | Mikrostomart - Dentysta Opole',
    description: 'Szukasz dentysty w Opolu? Mikrostomart to nowoczesny gabinet stomatologiczny. Specjalizujemy się w implantach, leczeniu kanałowym i estetyce. Umów wizytę w Opolu (Chmielowice).',
    keywords: 'dentysta opole, stomatolog opole, implanty opole, leczenie kanałowe opole, mikrostomart, stomatologia mikroskopowa',
    ogSiteName: 'Mikrostomart - Dentysta Opole',
    ogImageAlt: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna w Opolu',
    facebookUrl: 'https://www.facebook.com/mikrostomart',
    schemaName: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna',
    schemaAlternateName: 'Mikrostomart Gabinet Stomatologiczny',
    schemaDescription: 'Nowoczesny gabinet stomatologiczny w Opolu specjalizujący się w implantologii, stomatologii mikroskopowej, leczeniu kanałowym i estetyce. Zaawansowana technologia, indywidualne podejście.',
    schemaImage: 'https://mikrostomart.pl/logo-transparent.png',
    schemaId: 'https://mikrostomart.pl',
    schemaUrl: 'https://mikrostomart.pl',
    geoRegion: 'PL-OP',
    geoPlacename: 'Opole',
    geoPosition: '50.677682;17.866163',
    icbm: '50.677682, 17.866163',
};

const DEMO_BRAND: BrandConfig = {
    name: 'DensFlow Demo',
    fullName: 'DensFlow — System Zarządzania Gabinetem',
    slogan: 'Nowoczesne Zarządzanie Gabinetem Stomatologicznym',
    logoAlt: 'DensFlow Demo',
    phone1: '000-000-000',
    phone2: '000-000-000',
    email: 'kontakt@demo.densflow.ai',
    streetAddress: 'ul. Przykładowa 1',
    city: 'Warszawa',
    postalCode: '00-001',
    region: 'mazowieckie',
    country: 'PL',
    mapQuery: 'Warszawa',
    metadataBase: 'https://demo.densflow.ai',
    titleDefault: 'DensFlow Demo — System Zarządzania Gabinetem Stomatologicznym',
    titleTemplate: '%s | DensFlow Demo',
    description: 'Wypróbuj DensFlow — kompleksowy system zarządzania gabinetem stomatologicznym. Rezerwacje online, panel pacjenta, zarządzanie zespołem, SMS, blog i więcej.',
    keywords: 'system gabinet stomatologiczny, oprogramowanie dentysta, zarządzanie gabinetem, densflow, rezerwacje online dentysta',
    ogSiteName: 'DensFlow Demo',
    ogImageAlt: 'DensFlow — System Zarządzania Gabinetem Stomatologicznym',
    facebookUrl: '',
    schemaName: 'DensFlow Demo — System Zarządzania Gabinetem',
    schemaAlternateName: 'DensFlow Demo Clinic',
    schemaDescription: 'Wersja demonstracyjna systemu DensFlow do zarządzania gabinetem stomatologicznym. Rezerwacje, panel pacjenta, panel pracownika, panel admina.',
    schemaImage: 'https://demo.densflow.ai/logo-transparent.png',
    schemaId: 'https://demo.densflow.ai',
    schemaUrl: 'https://demo.densflow.ai',
    geoRegion: 'PL-MZ',
    geoPlacename: 'Warszawa',
    geoPosition: '52.229676;21.012229',
    icbm: '52.229676, 21.012229',
};

export const brand: BrandConfig = isDemoMode ? DEMO_BRAND : PROD_BRAND;

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
