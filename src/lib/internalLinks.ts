/**
 * Internal-linking engine (SEO Faza 3A, 2026-06-09).
 *
 * Cel: przepływ link-equity z treści (blog / KB / news) → strony usług /oferta/*
 * + geo-landingi, oraz E-E-A-T (autor-treść wzmacnia money pages). Blog
 * /nowosielski miał dotąd 0 in-body links.
 *
 * Dwa wyjścia:
 *  - `linkifyHtml(html, locale)` — wstrzykuje pierwsze wystąpienie frazy-keyword
 *    jako <a> do treści HTML (blog). HTML-aware: NIE linkuje wewnątrz istniejących
 *    <a> ani nagłówków, każdy temat max 1×, globalny cap. Działa PO sanitize
 *    (dodajemy tylko zaufane <a> z naszą mapą URL — bez user-inputu).
 *  - `relatedServiceLink(text, locale)` — najlepiej pasująca usługa /oferta/*
 *    z tytułu+tagów (dla bloku „Zobacz też").
 *
 * Mapa per-locale. PL = najbogatsza (blog to głównie polski autor-content).
 * Geo-landingi (`/implanty-opole` itd.) są PL-only indexable — linkujemy je
 * TYLKO w locale `pl` (foreign = noindex, nie linkujemy do noindex; lekcja
 * z news #160 + Faza 1B hreflang scoping).
 */

export interface LinkRule {
    /** Identyfikator tematu — dedup: 1 link na temat / artykuł (geo LUB oferta, nie oba). */
    id: string;
    /** Frazy keyword (case-insensitive, granice słowa Unicode). */
    phrases: string[];
    /** Ścieżka docelowa BEZ prefiksu locale (np. `/oferta/implantologia`). */
    path: string;
    /** Etykieta usługi (dla bloku „Zobacz też"). */
    label: string;
    /** true = geo-landing PL-only indexable (linkuj tylko w `pl`). */
    geo?: boolean;
}

// Kolejność: geo-landingi danego tematu PRZED generyczną /oferta/* — przy remisie
// pozycji wygrywa geo (bardziej szczegółowa intencja lokalna).
const RULES_PL: LinkRule[] = [
    // implanty
    { id: 'implant', geo: true, path: '/implanty-opole', label: 'Implanty Opole',
        phrases: ['implanty zębów Opole', 'implanty Opole', 'implant Opole', 'implantolog Opole'] },
    { id: 'implant', path: '/oferta/implantologia', label: 'Implantologia',
        phrases: ['implantologia', 'implantologii', 'implanty zębów', 'implant zęba', 'implantów', 'implantami', 'implantach', 'wszczepy', 'implanty'] },
    // All-on-X
    { id: 'allon4', geo: true, path: '/all-on-4-opole', label: 'All-on-4 Opole',
        phrases: ['All-on-4 Opole', 'All-on-6 Opole', 'All on 4 Opole'] },
    { id: 'allon4', path: '/oferta/all-on-4', label: 'All-on-4 / All-on-6',
        phrases: ['All-on-4', 'All-on-6', 'All-on-X', 'All on 4', 'All on 6', 'stałe zęby na implantach', 'most na implantach'] },
    // endodoncja
    { id: 'endo', geo: true, path: '/leczenie-kanalowe-opole-mikroskop', label: 'Endodoncja mikroskopowa Opole',
        phrases: ['leczenie kanałowe Opole', 'endodoncja Opole', 'leczenie kanałowe pod mikroskopem'] },
    { id: 'endo', path: '/oferta/leczenie-kanalowe', label: 'Leczenie kanałowe',
        phrases: ['ponowne leczenie kanałowe', 'leczenie kanałowe', 'leczenia kanałowego', 'leczeniu kanałowym', 'endodoncja mikroskopowa', 'endodoncja', 'endodoncji', 're-endo'] },
    // licówki / estetyka
    { id: 'estetyka', geo: true, path: '/licowki-opole', label: 'Licówki Opole',
        phrases: ['licówki Opole', 'licówka Opole'] },
    { id: 'estetyka', path: '/oferta/stomatologia-estetyczna', label: 'Stomatologia estetyczna',
        phrases: ['licówki porcelanowe', 'licówki kompozytowe', 'licówek', 'licówki', 'licówka', 'bonding', 'wybielanie zębów', 'Digital Smile Design', 'DSD'] },
    // metamorfozy
    { id: 'metamorfoza', geo: true, path: '/metamorfoza-usmiechu-opole', label: 'Metamorfoza uśmiechu Opole',
        phrases: ['metamorfoza uśmiechu Opole', 'metamorfoza Opole'] },
    { id: 'metamorfoza', path: '/metamorfozy', label: 'Metamorfozy uśmiechu',
        phrases: ['metamorfoza uśmiechu', 'metamorfozy uśmiechu', 'metamorfoza', 'smile makeover'] },
    // dentysta centrum (broad geo)
    { id: 'dentysta-geo', geo: true, path: '/dentysta-opole-centrum', label: 'Dentysta Opole centrum',
        phrases: ['dentysta Opole centrum', 'stomatolog Opole centrum', 'dentysta w centrum Opola'] },
    // laser
    { id: 'laser', path: '/oferta/laser', label: 'Stomatologia laserowa',
        phrases: ['Fotona LightWalker', 'laser Fotona', 'laser Er:YAG', 'laser Nd:YAG', 'stomatologia laserowa', 'laseroterapia'] },
    // protetyka
    { id: 'protetyka', path: '/oferta/protetyka', label: 'Protetyka',
        phrases: ['korony pełnoceramiczne', 'korona cyrkonowa', 'most protetyczny', 'odbudowa protetyczna', 'protetyka', 'protetyki', 'koronę', 'korony', 'koron', 'cyrkon'] },
    // ortodoncja
    { id: 'ortodoncja', path: '/oferta/ortodoncja', label: 'Ortodoncja',
        phrases: ['Clear Correct', 'nakładki ortodontyczne', 'aparat ortodontyczny', 'ortodoncja', 'wyrównanie zębów'] },
    // chirurgia
    { id: 'chirurgia', path: '/oferta/chirurgia', label: 'Chirurgia stomatologiczna',
        phrases: ['ekstrakcja zęba', 'usunięcie ósemki', 'zatrzymany ząb', 'chirurgia stomatologiczna', 'apikektomia'] },
    // periodontologia
    { id: 'periodontologia', path: '/oferta/periodontologia', label: 'Periodontologia',
        phrases: ['leczenie paradontozy', 'paradontoza', 'paradontozy', 'choroby dziąseł', 'periodontologia', 'periimplantitis'] },
    // dziecięca
    { id: 'dziecieca', path: '/oferta/stomatologia-dziecieca', label: 'Stomatologia dziecięca',
        phrases: ['stomatologia dziecięca', 'leczenie zębów u dzieci', 'zęby mleczne', 'lakowanie'] },
    // zachowawcza
    { id: 'zachowawcza', path: '/oferta/stomatologia-zachowawcza', label: 'Stomatologia zachowawcza',
        phrases: ['leczenie próchnicy', 'próchnica', 'próchnicy', 'próchnicę', 'leczenie zachowawcze', 'leczenie bez wiercenia'] },
];

const RULES_EN: LinkRule[] = [
    { id: 'implant', path: '/oferta/implantologia', label: 'Dental implants',
        phrases: ['dental implants', 'dental implant', 'implantology', 'tooth implant'] },
    { id: 'allon4', path: '/oferta/all-on-4', label: 'All-on-4 / All-on-6',
        phrases: ['All-on-4', 'All-on-6', 'All-on-X', 'fixed teeth on implants', 'full-arch'] },
    { id: 'endo', path: '/oferta/leczenie-kanalowe', label: 'Root canal treatment',
        phrases: ['root canal treatment', 'microscopic endodontics', 'root canal', 'endodontics'] },
    { id: 'estetyka', path: '/oferta/stomatologia-estetyczna', label: 'Cosmetic dentistry',
        phrases: ['porcelain veneers', 'composite veneers', 'veneers', 'teeth whitening', 'bonding', 'Digital Smile Design'] },
    { id: 'metamorfoza', path: '/metamorfozy', label: 'Smile makeover',
        phrases: ['smile makeover', 'before and after'] },
    { id: 'protetyka', path: '/oferta/protetyka', label: 'Prosthetics',
        phrases: ['dental crowns', 'zirconia crown', 'dental bridge', 'prosthetics', 'dentures'] },
    { id: 'ortodoncja', path: '/oferta/ortodoncja', label: 'Orthodontics',
        phrases: ['Clear Correct', 'clear aligners', 'orthodontics', 'teeth straightening'] },
    { id: 'laser', path: '/oferta/laser', label: 'Laser dentistry',
        phrases: ['Fotona laser', 'Er:YAG laser', 'laser dentistry'] },
];

const RULES_DE: LinkRule[] = [
    { id: 'implant', path: '/oferta/implantologia', label: 'Implantologie',
        phrases: ['Zahnimplantate', 'Zahnimplantat', 'Implantologie', 'Implantate'] },
    { id: 'allon4', path: '/oferta/all-on-4', label: 'All-on-4 / All-on-6',
        phrases: ['All-on-4', 'All-on-6', 'All-on-X', 'feste Zähne auf Implantaten'] },
    { id: 'endo', path: '/oferta/leczenie-kanalowe', label: 'Wurzelkanalbehandlung',
        phrases: ['Wurzelkanalbehandlung', 'mikroskopische Endodontie', 'Endodontie', 'Wurzelbehandlung'] },
    { id: 'estetyka', path: '/oferta/stomatologia-estetyczna', label: 'Ästhetische Zahnheilkunde',
        phrases: ['Porzellanveneers', 'Veneers', 'Zahnaufhellung', 'Bleaching', 'Bonding'] },
    { id: 'metamorfoza', path: '/metamorfozy', label: 'Smile Makeover',
        phrases: ['Smile Makeover', 'vorher nachher'] },
    { id: 'protetyka', path: '/oferta/protetyka', label: 'Prothetik',
        phrases: ['Zahnkronen', 'Zirkonkrone', 'Zahnbrücke', 'Prothetik', 'Zahnersatz'] },
    { id: 'ortodoncja', path: '/oferta/ortodoncja', label: 'Kieferorthopädie',
        phrases: ['Clear Correct', 'Aligner', 'Kieferorthopädie', 'Zahnspange'] },
    { id: 'laser', path: '/oferta/laser', label: 'Laserzahnheilkunde',
        phrases: ['Fotona Laser', 'Er:YAG Laser', 'Laserzahnheilkunde'] },
];

const RULES_UA: LinkRule[] = [
    { id: 'implant', path: '/oferta/implantologia', label: 'Імплантологія',
        phrases: ['імплантація зубів', 'зубні імпланти', 'імпланти', 'імплант'] },
    { id: 'allon4', path: '/oferta/all-on-4', label: 'All-on-4 / All-on-6',
        phrases: ['All-on-4', 'All-on-6', 'All-on-X'] },
    { id: 'endo', path: '/oferta/leczenie-kanalowe', label: 'Лікування каналів',
        phrases: ['лікування кореневих каналів', 'лікування каналів', 'ендодонтія'] },
    { id: 'estetyka', path: '/oferta/stomatologia-estetyczna', label: 'Естетична стоматологія',
        phrases: ['вініри', 'відбілювання зубів', 'бондинг'] },
    { id: 'metamorfoza', path: '/metamorfozy', label: 'Перетворення усмішки',
        phrases: ['перетворення усмішки', 'до і після'] },
    { id: 'protetyka', path: '/oferta/protetyka', label: 'Протезування',
        phrases: ['цирконієва коронка', 'коронки', 'протезування', 'зубний міст'] },
    { id: 'ortodoncja', path: '/oferta/ortodoncja', label: 'Ортодонтія',
        phrases: ['Clear Correct', 'елайнери', 'ортодонтія'] },
    { id: 'laser', path: '/oferta/laser', label: 'Лазерна стоматологія',
        phrases: ['лазер Fotona', 'лазерна стоматологія'] },
];

const RULES_BY_LOCALE: Record<string, LinkRule[]> = {
    pl: RULES_PL,
    en: RULES_EN,
    de: RULES_DE,
    ua: RULES_UA,
};

function rulesFor(locale: string): LinkRule[] {
    return RULES_BY_LOCALE[locale] || RULES_PL;
}

/** Ścieżka z prefiksem locale (PL bez prefiksu; geo istnieją tylko w PL → bez prefiksu). */
function localizedHref(locale: string, path: string): string {
    return locale === 'pl' ? path : `/${locale}${path}`;
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cache skompilowanych regexów per fraza (granice słowa Unicode-aware: nie część
// dłuższego wyrazu; lookbehind/lookahead zero-width → m[0] === sama fraza).
const phraseRegexCache = new Map<string, RegExp>();
function phraseRegex(phrase: string): RegExp {
    let re = phraseRegexCache.get(phrase);
    if (!re) {
        re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escapeRegExp(phrase)})(?![\\p{L}\\p{N}])`, 'iu');
        phraseRegexCache.set(phrase, re);
    }
    return re;
}

const HAS_LETTER = /\p{L}/u;

interface BestMatch {
    start: number;
    length: number;
    rule: LinkRule;
    phraseLen: number;
}

/** Znajdź najwcześniejsze dopasowanie wśród niezużytych reguł w pojedynczym węźle tekstowym. */
function findBest(text: string, rules: LinkRule[], usedIds: Set<string>): BestMatch | null {
    let best: BestMatch | null = null;
    for (const rule of rules) {
        if (usedIds.has(rule.id)) continue;
        for (const phrase of rule.phrases) {
            const m = phraseRegex(phrase).exec(text);
            if (!m) continue;
            const cand: BestMatch = { start: m.index, length: m[0].length, rule, phraseLen: phrase.length };
            if (
                !best ||
                cand.start < best.start ||
                // remis pozycji → dłuższa fraza; potem geo (bardziej specyficzna)
                (cand.start === best.start && cand.phraseLen > best.phraseLen) ||
                (cand.start === best.start && cand.phraseLen === best.phraseLen && rule.geo && !best.rule.geo)
            ) {
                best = cand;
            }
        }
    }
    return best;
}

const LINK_STYLE = 'color:var(--color-primary);text-decoration:underline;font-weight:500';

function anchorFor(locale: string, rule: LinkRule, matched: string): string {
    const href = localizedHref(locale, rule.path);
    return `<a href="${href}" data-autolink="1" style="${LINK_STYLE}">${matched}</a>`;
}

/** Linkifikuj pojedynczy węzeł tekstowy (bez tagów). Zwraca [html, liczba dodanych]. */
function linkifyTextNode(
    text: string,
    locale: string,
    rules: LinkRule[],
    usedIds: Set<string>,
    remaining: number,
): [string, number] {
    let out = '';
    let rest = text;
    let added = 0;
    while (added < remaining) {
        const best = findBest(rest, rules, usedIds);
        if (!best) break;
        const matched = rest.slice(best.start, best.start + best.length);
        out += rest.slice(0, best.start) + anchorFor(locale, best.rule, matched);
        usedIds.add(best.rule.id);
        added++;
        rest = rest.slice(best.start + best.length);
    }
    return [out + rest, added];
}

function tagName(tag: string): { name: string; closing: boolean; selfClosing: boolean } | null {
    const close = tag.match(/^<\/([a-z0-9]+)/i);
    if (close) return { name: close[1].toLowerCase(), closing: true, selfClosing: false };
    const open = tag.match(/^<([a-z0-9]+)/i);
    if (open) return { name: open[1].toLowerCase(), closing: false, selfClosing: /\/>\s*$/.test(tag) };
    return null; // komentarz / doctype / inne
}

const SKIP_TAGS = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Wstrzykuje wewnętrzne linki do treści HTML (blog). NIE linkuje wewnątrz <a>
 * ani nagłówków, każdy temat max 1×, twardy globalny cap. Bezpieczne dla
 * zsanityzowanego HTML (tokenizacja po tagach — modyfikuje tylko węzły tekstowe).
 */
export function linkifyHtml(html: string, locale: string, maxLinks = 5): string {
    if (!html || maxLinks <= 0) return html;
    try {
        const rules = rulesFor(locale);
        const usedIds = new Set<string>();
        let linkCount = 0;
        let skipDepth = 0; // wewnątrz <a>/nagłówka
        const tokens = html.split(/(<[^>]+>)/);
        const out: string[] = [];
        for (const token of tokens) {
            if (!token) continue;
            if (token.startsWith('<') && token.endsWith('>')) {
                const info = tagName(token);
                if (info && SKIP_TAGS.has(info.name) && !info.selfClosing) {
                    if (info.closing) skipDepth = Math.max(0, skipDepth - 1);
                    else skipDepth++;
                }
                out.push(token);
                continue;
            }
            // węzeł tekstowy
            if (skipDepth > 0 || linkCount >= maxLinks || !HAS_LETTER.test(token)) {
                out.push(token);
                continue;
            }
            const [newText, added] = linkifyTextNode(token, locale, rules, usedIds, maxLinks - linkCount);
            linkCount += added;
            out.push(newText);
        }
        return out.join('');
    } catch {
        return html; // never break the page over linking
    }
}

/**
 * Najlepiej pasująca usługa /oferta/* dla bloku „Zobacz też" — skan tytułu+tagów.
 * Zwraca tylko reguły NIE-geo (kanoniczna strona usługi, multi-locale-safe).
 */
export function relatedServiceLink(
    text: string,
    locale: string,
): { href: string; label: string } | null {
    if (!text) return null;
    const rules = rulesFor(locale).filter((r) => !r.geo);
    for (const rule of rules) {
        for (const phrase of rule.phrases) {
            if (phraseRegex(phrase).test(text)) {
                return { href: localizedHref(locale, rule.path), label: rule.label };
            }
        }
    }
    return null;
}
