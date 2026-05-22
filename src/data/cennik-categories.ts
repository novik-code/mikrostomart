/**
 * Kategorie cennika — K-6 SEO-friendly hybrid (2026-05-21 NIGHT+1).
 *
 * Filozofia (zgodna z D1=B premium-only z K-0 Strategy Workshop):
 * - Bez konkretnych cen per zabieg — tylko widełki "od X zł"
 * - User dostaje skanowalny overview kategorii
 * - Deep-dive (konkretne wyceny) → CennikChat AI (#asystent-ai anchor)
 * - Googlebot widzi 8 kategorii w SSR HTML + Service+PriceSpec+OfferCatalog schema
 *
 * Każda kategoria:
 * - slug: stabilny identyfikator (dla key, aria, internal anchors)
 * - i18nKey: prefix klucza w `cennik` namespace (np. `catImplantologia.title`)
 * - href: link do /oferta/[slug] (deep content K-4+K-5) LUB null = scroll do chat
 * - priceFrom: number w PLN — używane TYLKO w Service schema PriceSpecification.
 *              Displayowane w UI jako i18n string "od X zł" / "from X PLN" etc.
 * - badge: optional pill badge (np. "Najpopularniejsze")
 */

export interface CennikCategory {
    slug: string;
    i18nKey: string;
    icon: string;
    href: string | null; // null = scroll do #asystent-ai
    priceFrom: number; // PLN, dla Service.offers.priceSpecification.minPrice
    priceTo?: number; // optional upper bound, dla zakresu "X-Y zł" (np. implant 6000-8000)
    badge?: 'popular' | 'new';
}

export const CENNIK_CATEGORIES: CennikCategory[] = [
    {
        slug: 'konsultacja',
        i18nKey: 'catKonsultacja',
        icon: '🩺',
        href: null, // konsultacja = umów wizytę przez chat lub /rezerwacja
        priceFrom: 250,
    },
    {
        slug: 'zachowawcza',
        i18nKey: 'catZachowawcza',
        icon: '🦷',
        href: '/oferta', // brak dedykowanej landing — listing
        priceFrom: 400,
    },
    {
        slug: 'endodoncja',
        i18nKey: 'catEndodoncja',
        icon: '🔬',
        href: '/oferta/leczenie-kanalowe',
        priceFrom: 800,
        badge: 'popular',
    },
    {
        slug: 'implantologia',
        i18nKey: 'catImplantologia',
        icon: '🦴',
        href: '/oferta/implantologia',
        priceFrom: 6000,
        priceTo: 8000, // standardowy pakiet implant + korona (chirurgia + protetyka)
        badge: 'popular',
    },
    {
        slug: 'estetyczna',
        i18nKey: 'catEstetyczna',
        icon: '✨',
        href: '/oferta/stomatologia-estetyczna',
        priceFrom: 500,
    },
    {
        slug: 'ortodoncja',
        i18nKey: 'catOrtodoncja',
        icon: '😁',
        href: '/oferta/ortodoncja',
        priceFrom: 8000,
    },
    {
        slug: 'higienizacja',
        i18nKey: 'catHigienizacja',
        icon: '🧼',
        href: '/oferta', // brak dedykowanej landing — listing
        priceFrom: 380,
    },
    {
        slug: 'chirurgia',
        i18nKey: 'catChirurgia',
        icon: '⚕️',
        href: '/oferta/chirurgia',
        priceFrom: 400,
    },
];

/**
 * 8 FAQ cenowych dla FAQPage schema + visible accordion.
 * Klucze w cennik namespace: faqQ1..Q8 + faqA1..A8.
 */
export const CENNIK_FAQ_COUNT = 8;
