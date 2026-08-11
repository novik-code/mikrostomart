/**
 * Polityka drugiego składnika (2FA) dla personelu — JEDNO źródło terminu.
 *
 * Decyzja właściciela 2026-08-11: **od 1 września 2026 dwuskładnikowe logowanie
 * obowiązuje CAŁY zespół, nie tylko adminów.** Kto nie skonfiguruje, nie wejdzie
 * do panelu, dopóki tego nie zrobi.
 *
 * Stan zastany, na którym to stoi (zmierzone 2026-08-11, nie założone):
 *  · 14 aktywnych pracowników, **4 z 2FA — i wszyscy czterej to adminowie**,
 *  · 10 bez 2FA to wyłącznie NIE-adminowie, czyli dokładnie ta grupa, dla której
 *    kreator w panelu działa (dla admina bez 2FA logowanie kończy się wcześniej),
 *  · `MFA_SESSION_SECRET` jest ustawiony na Production i Preview — bez tego
 *    przełączenie zabiłoby środowisko, bo `mfaSession.ts` rzuca przy braku sekretu.
 *
 * 🔑 DLACZEGO TERMIN JEST TU, A NIE W ZMIENNEJ ŚRODOWISKOWEJ. Zmienna daje pozorną
 * elastyczność, a realnie rozjeżdża dwa środowiska i nie zostawia śladu w historii.
 * Data w kodzie przechodzi przez przegląd, ma commit i jest widoczna w teście.
 *
 * 🪤 OFFSET WPISANY JAWNIE. Vercel chodzi w UTC, a 1 września 2026 Polska jest w CEST
 * (UTC+2 — czas letni kończy się dopiero pod koniec października). Gdyby zapisać
 * `2026-09-01T00:00:00Z`, wymuszenie ruszyłoby o 02:00 czasu gabinetu, czyli dzień
 * wcześniej z punktu widzenia człowieka patrzącego na zegarek.
 */

/** 1 września 2026, 00:00 czasu gabinetu (CEST = UTC+2). */
export const MFA_MANDATORY_FROM_ISO = '2026-09-01T00:00:00+02:00';
export const MFA_MANDATORY_FROM_MS = Date.parse(MFA_MANDATORY_FROM_ISO);

/** Etykieta dla ludzi — do maila, banera i komunikatów. Jedna, żeby się nie rozjechały. */
export const MFA_DEADLINE_LABEL_PL = '1 września 2026';

/**
 * Czy 2FA obowiązuje już KAŻDEGO pracownika?
 * Przed terminem: tylko adminów (stan sprzed decyzji). Po terminie: wszystkich.
 */
export function isMfaMandatoryForAll(now: number = Date.now()): boolean {
    return now >= MFA_MANDATORY_FROM_MS;
}

/**
 * Ile pełnych dni zostało do terminu (0 = dziś jest ostatni dzień, ujemne = po terminie).
 * Do banera „zostało X dni" i do stopniowania tonu przypomnień.
 */
export function daysUntilMfaDeadline(now: number = Date.now()): number {
    return Math.floor((MFA_MANDATORY_FROM_MS - now) / 86_400_000);
}
