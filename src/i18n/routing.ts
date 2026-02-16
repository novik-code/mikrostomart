import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['pl', 'en', 'de', 'ua'],
    defaultLocale: 'pl',
    localePrefix: 'as-needed', // PL has no prefix, EN/DE/UA get /en, /de, /ua
    pathnames: {
        '/': '/',
        '/oferta': {
            pl: '/oferta',
            en: '/services',
            de: '/leistungen',
            ua: '/послуги',
        },
        '/kontakt': {
            pl: '/kontakt',
            en: '/contact',
            de: '/kontakt',
            ua: '/контакт',
        },
        '/cennik': {
            pl: '/cennik',
            en: '/pricing',
            de: '/preise',
            ua: '/ціни',
        },
        '/faq': '/faq',
        '/o-nas': {
            pl: '/o-nas',
            en: '/about',
            de: '/ueber-uns',
            ua: '/про-нас',
        },
        '/metamorfozy': {
            pl: '/metamorfozy',
            en: '/transformations',
            de: '/metamorphosen',
            ua: '/метаморфози',
        },
        '/aktualnosci': {
            pl: '/aktualnosci',
            en: '/news',
            de: '/aktuelles',
            ua: '/новини',
        },
        '/rezerwacja': {
            pl: '/rezerwacja',
            en: '/booking',
            de: '/terminbuchung',
            ua: '/запис',
        },
        '/sklep': {
            pl: '/sklep',
            en: '/shop',
            de: '/shop',
            ua: '/магазин',
        },
        '/koszyk': {
            pl: '/koszyk',
            en: '/cart',
            de: '/warenkorb',
            ua: '/кошик',
        },
        '/mapa-bolu': {
            pl: '/mapa-bolu',
            en: '/pain-map',
            de: '/schmerzlandkarte',
            ua: '/карта-болю',
        },
        '/symulator': {
            pl: '/symulator',
            en: '/simulator',
            de: '/simulator',
            ua: '/симулятор',
        },
        '/selfie': '/selfie',
        '/porownywarka': {
            pl: '/porownywarka',
            en: '/comparator',
            de: '/vergleich',
            ua: '/порівняння',
        },
        '/kalkulator-leczenia': {
            pl: '/kalkulator-leczenia',
            en: '/treatment-calculator',
            de: '/behandlungsrechner',
            ua: '/калькулятор-лікування',
        },
        '/baza-wiedzy': {
            pl: '/baza-wiedzy',
            en: '/knowledge-base',
            de: '/wissensdatenbank',
            ua: '/база-знань',
        },
        '/nowosielski': '/nowosielski',
        '/zadatek': {
            pl: '/zadatek',
            en: '/deposit',
            de: '/anzahlung',
            ua: '/завдаток',
        },
        '/rodo': '/rodo',
        '/regulamin': {
            pl: '/regulamin',
            en: '/terms',
            de: '/agb',
            ua: '/правила',
        },
        '/polityka-prywatnosci': {
            pl: '/polityka-prywatnosci',
            en: '/privacy-policy',
            de: '/datenschutz',
            ua: '/політика-конфіденційності',
        },
        '/polityka-cookies': {
            pl: '/polityka-cookies',
            en: '/cookie-policy',
            de: '/cookie-richtlinie',
            ua: '/політика-cookies',
        },
    },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];
