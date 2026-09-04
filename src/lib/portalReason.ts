/**
 * Powód operacji przekazywany do Prodentisa przy odwołaniu i przełożeniu wizyty.
 *
 * 🔑 Format uzgodniony z dostawcą PMS (2026-09-04): **prefiks maszynowy, półpauza, opis dla
 * człowieka**. Wartość ląduje w kolumnie `skreslenie_notatka`, którą **recepcja widzi
 * w Prodentisie przy skreślonej wizycie** — stąd obie części:
 *
 *     portal:cancel — pacjent odwołał przez portal
 *     portal:reschedule — pacjent przełożył przez portal
 *
 * Po stronie PMS filtruje się po prefiksie przed półpauzą; tekst po niej może się zmieniać
 * dowolnie. Sam prefiks bez opisu byłby dla pracownika nieczytelny, a sam opis po polsku
 * zmuszałby PMS do dopasowywania po treści — czyli do tego, przed czym obie strony
 * ostrzegały się przy kodach błędów.
 *
 * 🪤 Dlaczego to w ogóle powstało: kod skreślenia `106` okazał się **natywnym kodem
 * Prodentisa**, używanym przez personel ~15 tys. razy — nie da się z niego wnioskować, czy
 * wizytę odwołał pacjent, czy recepcja. To pole jest jedynym działającym znacznikiem
 * pochodzenia, jaki mamy, więc **wysyłamy je ZAWSZE**, także gdy pacjent nie podał powodu.
 *
 * ⚪ Czego tu NIE MA i dlaczego: uzgodniona była też wartość `portal:gdpr_erasure`.
 * Nie ma dla niej producenta — usunięcie konta na żądanie RODO jest u nas **miękkie**
 * (anonimizacja PII, rewokacja sesji i tokenów push, skasowanie załączników z czatu)
 * i **nie odwołuje przyszłych wizyt**. Gdyby to się kiedyś zmieniło, wartość dopisać tutaj,
 * a nie budować drugiego formatu obok.
 */

export type AkcjaPortalu = 'cancel' | 'reschedule';

const OPISY: Record<AkcjaPortalu, string> = {
    cancel: 'pacjent odwołał przez portal',
    reschedule: 'pacjent przełożył przez portal',
};

/** Ile znaków własnego tekstu pacjenta dopuszczamy do notatki w Prodentisie. */
const MAX_POWOD_PACJENTA = 160;

/**
 * @param akcja         co pacjent zrobił
 * @param powodPacjenta opcjonalny powód wpisany przez pacjenta (dopisywany po opisie)
 */
export function powodPortalu(akcja: AkcjaPortalu, powodPacjenta?: string | null): string {
    const baza = `portal:${akcja} — ${OPISY[akcja]}`;

    // Notatka jest polem jednoliniowym w widoku recepcji — łamania linii i nadmiar
    // spacji tylko utrudniałyby czytanie.
    const wlasny = (powodPacjenta ?? '').replace(/\s+/g, ' ').trim();
    if (!wlasny) return baza;

    const przyciety = wlasny.length > MAX_POWOD_PACJENTA
        ? `${wlasny.slice(0, MAX_POWOD_PACJENTA - 1)}…`
        : wlasny;

    return `${baza}: ${przyciety}`;
}
