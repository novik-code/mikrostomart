/**
 * Tytuly i opisy artykulow pod wyniki wyszukiwania (2026-08-20).
 *
 * Powod (dane z Search Console, 3 miesiace, dostep uzyskany 20.08):
 * strony maja PRZYZWOITE POZYCJE i FATALNA KLIKALNOSC.
 *   /oferta                              poz. 3,6   CTR 1,8 %   (norma ~10 %)
 *   /baza-wiedzy/ile-kanalow-maja-zeby   poz. 8,5   CTR 0,36 %  przy 15 358 wyswietleniach
 *   /oferta/implantologia                poz. 8,6   CTR 1,1 %
 * Czyli Google nas pokazuje, a ludzie nie klikaja — problem jest w tym, co widza
 * w wynikach, nie w rankingu.
 *
 * Pomiar bazy (526 opublikowanych artykulow):
 *   455 (87 %) tytulow dluzszych niz 60 znakow — Google je ucina
 *   415 (79 %) opisow dluzszych niz 155 znakow — Google je ucina
 *   12 tytulow ma doklejone " | Mikrostomart Opole" JUZ W BAZIE
 *
 * Do tego szablon dokleja jeszcze " | Baza Wiedzy Mikrostomart" (27 znakow),
 * wiec przy medianie 74 znakow sufiks nigdy nie byl widoczny, a przy tych 12
 * artykulach marka pojawiala sie DWA RAZY — takze w H1 na samej stronie.
 */

/** Limity, po ktorych Google ucina. Przybliżone (liczy piksele), ale to standard branzowy. */
export const SERP_TITLE_MAX = 60;
export const SERP_DESCRIPTION_MAX = 155;

/**
 * Zdejmuje z tytulu doklejony na koncu segment z nazwa marki.
 * Uzywane takze do H1 i og:title — czytelnik nie powinien widziec
 * "…nieumiejetni dentysci | Mikrostomart Opole" jako naglowka artykulu.
 */
export function cleanArticleTitle(title: string, brandName: string): string {
    if (!title) return '';
    let out = title.trim();
    // Zdejmujemy wielokrotnie: zdarzaja sie tytuly z dwoma ogonami.
    for (let i = 0; i < 3; i++) {
        const cut = out.lastIndexOf('|');
        if (cut === -1) break;
        const tail = out.slice(cut + 1).trim();
        // Ucinamy TYLKO ogon z nazwa marki. Tytul typu "Implanty | koszt i przebieg"
        // zostaje nietkniety.
        if (!tail.toLowerCase().includes(brandName.toLowerCase())) break;
        out = out.slice(0, cut).trim();
    }
    return out || title.trim();
}

/**
 * Tytul do <title>. Marka doklejana TYLKO wtedy, gdy miesci sie w limicie —
 * inaczej zjadalaby budzet znakow, nie bedac widoczna.
 */
export function articleSeoTitle(title: string, brandName: string): string {
    const clean = cleanArticleTitle(title, brandName);
    const withBrand = `${clean} | ${brandName}`;
    return withBrand.length <= SERP_TITLE_MAX ? withBrand : clean;
}

/**
 * Opis do <meta name="description">. Przycinamy na granicy slowa, zeby
 * Google nie ucinal w polowie wyrazu. Pelny excerpt zostaje na stronie.
 */
export function articleSeoDescription(text: string | null | undefined): string | undefined {
    if (!text) return undefined;
    const s = text.trim().replace(/\s+/g, ' ');
    if (s.length <= SERP_DESCRIPTION_MAX) return s;
    const cut = s.slice(0, SERP_DESCRIPTION_MAX - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > SERP_DESCRIPTION_MAX * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:—-]+$/, '') + '…';
}
