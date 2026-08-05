/**
 * Dopasowanie konta po adresie e-mail — czysta, testowalna decyzja.
 *
 * 🔴 PO CO TO ISTNIEJE. Logowanie pacjenta szukało konta przez `.ilike('email', wejscie)`,
 * a w `LIKE`/`ILIKE` znaki `_` i `%` są WIELOZNACZNE:
 *   `_` = dowolny pojedynczy znak, `%` = dowolny ciąg.
 * Podkreślenie jest legalnym i częstym znakiem w adresie (`jan_kowalski@…`), więc wzorzec
 * takiego pacjenta dopasowywał TAKŻE cudze konto. Zapytanie kończyło się `.single()`,
 * które przy dwóch wierszach zwraca błąd — a gałąź błędu oddaje 401 „nieprawidłowe dane
 * logowania". Skutek: pacjent z podkreśleniem w adresie NIE MÓGŁ SIĘ ZALOGOWAĆ mimo
 * poprawnego hasła, i nie miał jak się dowiedzieć dlaczego.
 *
 * ZMIERZONE NA PRODUKCJI 2026-08-05. Symulacja stara-vs-nowa na 95 realnych kontach:
 * **ZYSK 0 · STRATA 0**. Uczciwie: dziś ta pułapka nie odcina nikogo od logowania.
 * Trzy adresy zawierają znak wieloznaczny; dwa z nich rzeczywiście dają po dwa trafienia
 * w `ilike`, ale NIE z powodu wzorca — te dwa konta mają DOSŁOWNIE ten sam adres
 * (duplikat, oba `active`). Odmawia im więc i stara, i nowa logika, a logują się telefonem.
 * Trzecie konto z podkreśleniem działa i będzie działać dalej.
 *
 * Ta zmiana jest zatem PREWENCYJNA, nie ratunkowa. Wnosi dwie rzeczy:
 *  1. zamyka enumerację i obejście limitu prób — rotacja wzorców (`ofiara%`, `ofiara%%`)
 *     dopasowuje to samo konto, ale każdy wariant to inny klucz w `login_attempts`;
 *  2. chroni PRZYSZŁE konta: pierwszy pacjent z podkreśleniem, którego wzorzec trafi
 *     w cudzy adres, zostałby odcięty od logowania bez żadnego komunikatu.
 *
 * 🔑 DLACZEGO TO TYLKO POSZERZA, NIGDY NIE ZABIERA. Zapytanie `ilike` zostaje jako
 * SZEROKIE pobranie i jego wynik jest NADZBIOREM dokładnego dopasowania: adres zawsze
 * pasuje sam do siebie (znak dosłowny spełnia też własny wzorzec). Zawężenie robimy
 * dopiero tutaj, porównaniem dosłownym. Dla konta bez znaków wieloznacznych wynik jest
 * identyczny co do wiersza; dla konta ze znakiem wieloznacznym — przestaje być błędem.
 *
 * Wektor uboczny, który przy okazji znika: wpisanie w pole loginu wzorca (`ofiara%`)
 * nie może już trafić w cudze konto, bo dosłowne porównanie go odrzuca.
 */

/** Postać kanoniczna adresu do porównań: bez spacji brzegowych, małe litery. */
export function normalizeEmailKey(raw: string | null | undefined): string {
    return String(raw ?? '').trim().toLowerCase();
}

export type EmailMatchReason = 'ok' | 'none' | 'ambiguous';

/**
 * Wybiera DOKŁADNIE jedno konto o podanym adresie spośród wierszy zwróconych przez `ilike`.
 *
 * Zwraca `ambiguous`, gdy dosłownie ten sam adres mają dwa konta — wtedy nie zgadujemy,
 * do którego wpuścić (ta sama zasada, co przy numerze telefonu w `login/route.ts`).
 */
export function pickExactEmailMatch<T extends { email?: string | null }>(
    rows: T[],
    input: string
): { row: T | null; reason: EmailMatchReason } {
    const key = normalizeEmailKey(input);
    if (!key) return { row: null, reason: 'none' };

    const hits = rows.filter((r) => normalizeEmailKey(r.email) === key);
    if (hits.length === 1) return { row: hits[0], reason: 'ok' };
    return { row: null, reason: hits.length === 0 ? 'none' : 'ambiguous' };
}
