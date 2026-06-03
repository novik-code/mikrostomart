/**
 * Lista stron usług dla siatki nawigacyjnej na /oferta (landing).
 *
 * Single source of truth — dodanie nowej strony /oferta/[slug] = dopisanie 1 wpisu
 * tutaj + 2 kluczy i18n ({key}Name, {key}Desc) w namespace `ofertaServices`
 * (messages/{locale}/pages.json). Dzięki temu nowa strona usługi automatycznie
 * pojawia się w siatce na /oferta (rozwiązuje problem „footer-only" discoverability).
 *
 * `slug`  — segment URL pod /oferta/
 * `key`   — prefiks klucza i18n (camelCase) w namespace `ofertaServices`
 */
export interface OfertaServiceItem {
    slug: string;
    key: string;
}

export const OFERTA_SERVICES: OfertaServiceItem[] = [
    { slug: 'implantologia', key: 'implantologia' },
    { slug: 'laser', key: 'laser' },
    { slug: 'leczenie-kanalowe', key: 'leczenieKanalowe' },
    { slug: 'stomatologia-estetyczna', key: 'estetyczna' },
    { slug: 'ortodoncja', key: 'ortodoncja' },
    { slug: 'chirurgia', key: 'chirurgia' },
    { slug: 'protetyka', key: 'protetyka' },
    { slug: 'periodontologia', key: 'periodontologia' },
];
