/**
 * Pseudonimizacja danych wychodzących do modelu językowego.
 *
 * ZASADA: model NIGDY nie dostaje tożsamości. Każde nazwisko, telefon, e-mail,
 * PESEL i numer konta zamieniamy przed wysłaniem na stabilny żeton (`PACJENT_1`,
 * `LEKARZ_2`, `TEL_1`), a w odpowiedzi modelu podstawiamy wartości z powrotem —
 * użytkownik widzi prawdziwe dane, dostawca modelu nie widzi ich nigdy.
 *
 * 🔑 DLACZEGO TO WYSTARCZA. Opis kliniczny pozbawiony identyfikatorów
 * („usunięcie zębów, 6 implantów, sinus lift") nie jest daną osobową, bo nie da
 * się go przypisać do osoby. Wrażliwe jest dopiero POŁĄCZENIE treści z tożsamością
 * — i to połączenie rozcinamy. Żetony są odwracalne WYŁĄCZNIE po naszej stronie:
 * mapa żyje w pamięci pojedynczego żądania i nigdzie się nie zapisuje.
 *
 * 🔑 DLACZEGO NIE SAM REGEX. Wyrażenia regularne łapią wzorce (telefon, PESEL),
 * ale nie rozpoznają nazwiska w zdaniu „wycisk do pracowni pani Kasi". Dlatego
 * podstawą jest SŁOWNIK realnych nazwisk z bazy i z pobranego grafiku, a regexy
 * są drugą warstwą. Trzecia warstwa łapie konstrukcje „pani/pan/dr + Imię".
 *
 * ⚠️ CZEGO TO NIE ROBI: nie jest anonimizacją w rozumieniu nieodwracalnym.
 * To pseudonimizacja (art. 4 pkt 5 RODO) — dla dostawcy modelu dane są
 * nieprzypisywalne, ale my potrafimy je odtworzyć. O to właśnie chodzi.
 */

export interface Scrubber {
    /** Zarejestruj znane nazwisko/nazwę pod danym prefiksem żetonu. */
    learn(value: string | null | undefined, kind: TokenKind): void;
    /** Zamień identyfikatory na żetony. */
    scrub(text: string | null | undefined): string;
    /** Odtwórz prawdziwe wartości z żetonów (odpowiedź modelu → użytkownik). */
    restore(text: string | null | undefined): string;
    /** Jak `scrub`, ale po całej strukturze — używać ZAMIAST scrubowania JSON-a. */
    scrubDeep<T>(value: T): T;
    /** Jak `restore`, ale po całej strukturze (argumenty wywołań narzędzi). */
    restoreDeep<T>(value: T): T;
    /** Ile różnych bytów ukryto — do logu i do testów. */
    size(): number;
}

export type TokenKind = 'PACJENT' | 'LEKARZ' | 'OSOBA' | 'TEL' | 'EMAIL' | 'PESEL' | 'KONTO' | 'ADRES';

/** Słowa, których NIE traktujemy jak nazwiska, choć wyglądają na nazwy własne. */
const NOT_A_NAME = new Set([
    'chirurgia', 'ortodoncja', 'protetyka', 'endodoncja', 'higienizacja', 'implant', 'implanty',
    'przygotowanie', 'asysta', 'sprzątanie', 'sprzatanie', 'przegląd', 'przeglad', 'konsultacja',
    'pierwsza', 'wizyta', 'kontrola', 'badanie', 'leczenie', 'pacjent', 'pacjentka', 'gabinet',
    'telefon', 'wizualizacja', 'diagnostyka', 'proteza', 'protezy', 'korona', 'most',
]);

/**
 * Rdzenie popularnych polskich imion i zdrobnień — do wyłapywania osób
 * w WOLNYM TEKŚCIE notatek, gdzie nie ma ani tytułu, ani wpisu w kartotece.
 *
 * Dopasowanie po rdzeniu obejmuje odmianę (Ela/Eli/Elę, Kasia/Kasi/Kasię),
 * a limit +3 znaków trzyma je z dala od dłuższych słów. Lista celowo krótka
 * i pod kątem imion realnie występujących w polskim gabinecie — nie jest to
 * pełny rejestr, tylko druga siatka bezpieczeństwa pod słownikiem z bazy.
 */
const GIVEN_NAME_STEMS = [
    'ala', 'ani', 'anna', 'agat', 'agni', 'asi', 'basi', 'beat', 'bogus', 'celin',
    'dagmar', 'dani', 'domini', 'dorot', 'edyt', 'ela', 'elzbiet', 'elżbiet', 'emil',
    'ewa', 'ewel', 'gosi', 'grazyn', 'grażyn', 'hali', 'hann', 'iga', 'ilon', 'iren',
    'iwon', 'jadwig', 'jagod', 'jol', 'jul', 'justyn', 'kach', 'kamil', 'karol',
    'kasi', 'kasia', 'katarzyn', 'klaud', 'krysi', 'krystyn', 'lidi', 'lucyn', 'madzi',
    'magd', 'malgorz', 'małgorz', 'mari', 'mart', 'mate', 'michal', 'michał', 'mirek',
    'monik', 'natal', 'nikol', 'ola', 'oli', 'patrycj', 'pauli', 'piotr', 'renat',
    'robert', 'sylwi', 'tere', 'tomek', 'tomasz', 'urszul', 'ulа', 'wero', 'wiktor',
    'wojtek', 'zosi', 'zofi', 'zuz', 'adam', 'andrz', 'arek', 'artur', 'bart',
    'darek', 'dawid', 'filip', 'gabri', 'jacek', 'jakub', 'janusz', 'jarek', 'jerzy',
    'kuba', 'lukasz', 'łukasz', 'marcin', 'marek', 'norbert', 'pawel', 'paweł',
    'przemek', 'rafal', 'rafał', 'radek', 'seba', 'slawek', 'sławek', 'stefan',
    'szymon', 'tadeusz', 'wital', 'witek', 'zbys',
];

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createScrubber(): Scrubber {
    /** oryginał (lowercase) → żeton */
    const toToken = new Map<string, string>();
    /** żeton → oryginał */
    const toValue = new Map<string, string>();
    const counters: Record<string, number> = {};

    function mint(value: string, kind: TokenKind): string {
        const key = value.toLowerCase();
        const existing = toToken.get(key);
        if (existing) return existing;
        counters[kind] = (counters[kind] ?? 0) + 1;
        const token = `${kind}_${counters[kind]}`;
        toToken.set(key, token);
        toValue.set(token, value);
        return token;
    }

    function learn(value: string | null | undefined, kind: TokenKind): void {
        const v = String(value ?? '').trim();
        // Jednoznakowe i puste pomijamy — podmiana takiego ciągu zmasakrowałaby tekst.
        if (v.length < 3) return;
        mint(v, kind);
        // Uczymy się też SAMEGO NAZWISKA. W notatkach pada „pani Maćków" bez imienia,
        // a bez tego wpisu taki fragment wyszedłby do modelu w oryginale.
        const parts = v.split(/\s+/).filter(p => p.length > 2 && !NOT_A_NAME.has(p.toLowerCase()));
        if (parts.length > 1) {
            for (const p of parts) {
                const clean = p.replace(/[.,;:()]/g, '');
                if (clean.length > 2 && !/^(lek|dent|dr|hab|prof|m\.sc)$/i.test(clean)) {
                    const key = clean.toLowerCase();
                    if (!toToken.has(key)) {
                        // Fragment nazwiska wskazuje na TEN SAM byt co pełna forma.
                        toToken.set(key, toToken.get(v.toLowerCase())!);
                    }
                }
            }
        }
    }

    function scrub(text: string | null | undefined): string {
        let out = String(text ?? '');
        if (!out) return out;

        // ── 1. Wzorce twarde (przed słownikiem — są jednoznaczne) ───────────
        // E-mail
        out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, m => mint(m, 'EMAIL'));
        // PESEL: dokładnie 11 cyfr jako osobny token
        out = out.replace(/(?<!\d)\d{11}(?!\d)/g, m => mint(m, 'PESEL'));
        // Numery kont / długie ciągi cyfr (w notatkach realnie pojawiają się rachunki)
        out = out.replace(/(?<!\d)(?:\d[ -]?){12,}(?!\d)/g, m => mint(m.trim(), 'KONTO'));
        // Telefon PL: 9 cyfr z opcjonalnym +48 i separatorami
        out = out.replace(/(?<!\d)(?:\+?48[ -]?)?(?:\d[ -]?){9}(?!\d)/g, m => mint(m.trim(), 'TEL'));

        // ── 2. Słownik znanych nazwisk (najdłuższe najpierw) ────────────────
        const known = [...toToken.keys()].sort((a, b) => b.length - a.length);
        for (const key of known) {
            const token = toToken.get(key)!;
            // Już-żetonów nie ruszamy (klucz mógł powstać z regexu wyżej).
            if (key === token.toLowerCase()) continue;
            out = out.replace(new RegExp(`(?<![\\p{L}\\d_])${escapeRe(key)}(?![\\p{L}\\d_])`, 'giu'), token);
        }

        // ── 3. „pani Kasi", „pani kasi", „dr Kowalski" — imiona spoza bazy ──
        // 🔑 BEZ WYMOGU WIELKIEJ LITERY. Realna notatka z produkcji brzmi
        // „wycisk szybo do pracowi pani kasi" — wersja wymagająca `\p{Lu}`
        // przepuszczała to nietknięte.
        out = out.replace(
            /\b(pani|pana|panu|pan|dr|lek\.?|doktor)\s+(\p{L}{3,})/giu,
            (full, title: string, name: string) => (NOT_A_NAME.has(name.toLowerCase()) ? full : `${title} ${mint(name, 'OSOBA')}`),
        );

        // ── 4. Imiona i zdrobnienia w wolnym tekście ────────────────────────
        // 🔑 Notatki gabinetowe pisze człowiek w biegu: „Ela brudna asysta",
        // „przekazać Kasi". Takie formy nie mają tytułu przed sobą i nie ma ich
        // w kartotece, więc ani słownik, ani reguła wyżej ich nie złapią.
        // Dopasowujemy po RDZENIU, żeby objąć odmianę (Ela/Eli/Elę, Kasia/Kasi/Kasię).
        out = out.replace(/\p{L}{3,}/gu, (w) => {
            const lower = w.toLowerCase();
            if (NOT_A_NAME.has(lower)) return w;
            const stem = GIVEN_NAME_STEMS.find(
                (s) => lower.startsWith(s) && lower.length - s.length <= 3,
            );
            return stem ? mint(w, 'OSOBA') : w;
        });

        return out;
    }

    function restore(text: string | null | undefined): string {
        let out = String(text ?? '');
        if (!out) return out;
        // Od najdłuższych żetonów, żeby `PACJENT_10` nie został zjedzony przez `PACJENT_1`.
        const tokens = [...toValue.keys()].sort((a, b) => b.length - a.length);
        for (const tk of tokens) {
            out = out.replace(new RegExp(escapeRe(tk), 'g'), toValue.get(tk)!);
        }
        return out;
    }

    /**
     * Rekurencyjne czyszczenie STRUKTURY, nie zserializowanego JSON-a.
     *
     * 🔑 DLACZEGO TO MA ZNACZENIE — złapane pomiarem na realnych danych.
     * `JSON.stringify` zamienia znak nowej linii na DWA znaki: `\` i `n`. Notatka
     * „…natychmiastowe\r\n\r\nEla brudna asysta" po serializacji zawiera ciąg liter
     * `nEla`, bo litera z escape'u skleja się z imieniem. Rdzeń „ela" wtedy nie pasuje
     * i imię wychodziło do modelu mimo poprawnego słownika. Czyszczenie wartości
     * PRZED serializacją usuwa całą tę klasę błędu.
     */
    function scrubDeep<T>(value: T): T {
        if (typeof value === 'string') return scrub(value) as unknown as T;
        if (Array.isArray(value)) return value.map(v => scrubDeep(v)) as unknown as T;
        if (value && typeof value === 'object') {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubDeep(v);
            return out as unknown as T;
        }
        return value;
    }

    function restoreDeep<T>(value: T): T {
        if (typeof value === 'string') return restore(value) as unknown as T;
        if (Array.isArray(value)) return value.map(v => restoreDeep(v)) as unknown as T;
        if (value && typeof value === 'object') {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = restoreDeep(v);
            return out as unknown as T;
        }
        return value;
    }

    return { learn, scrub, restore, scrubDeep, restoreDeep, size: () => toValue.size };
}
