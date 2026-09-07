/**
 * CZYSZCZENIE ADRESÓW PRZED WYSŁANIEM ZDARZENIA DO SENTRY.
 *
 * 🔴 PO CO. Sześć stron w tym projekcie trzyma sekret wprost w ŚCIEŻCE:
 * `/zgody/<token>`, `/ekarta/<token>`, `/opieka/<token>`, `/s/<code>`,
 * `/strefa-pacjenta/reset-password/<token>` i `/register/verify-email/<token>`.
 * Landing wizyty trzyma go w query. Każdy nieobsłużony błąd JS na którejkolwiek z nich
 * wysyłał do Sentry ŻYWE poświadczenie — a przy resecie hasła i weryfikacji e-maila
 * jest to poświadczenie PRZEJMUJĄCE KONTO.
 *
 * 🔑 `Referrer-Policy` NIE jest tu obroną. `next.config.ts` ustawia
 * `strict-origin-when-cross-origin`, więc do obcych domen idzie sam origin — Sentry
 * dostaje adres nie przez nagłówek Referer, tylko dlatego, że sami mu go wysyłamy
 * w ładunku zdarzenia.
 *
 * 🔑 DIAGNOSTYKA MA PRZEŻYĆ. Maskujemy WARTOŚĆ, nie adres: zostaje domena, trasa
 * i parametry, które o niczym nie decydują (`date`, `doctor`, `kategoria`). Zgłoszenie
 * bez adresu jest bezużyteczne, a wtedy ktoś wyłączy całe czyszczenie.
 */

/** Segmenty, PO KTÓRYCH następny element ścieżki jest sekretem. */
const RODZICE_SEKRETU = new Set([
    'zgody',
    'ekarta',
    'opieka',
    's',
    'reset-password',
    'verify-email',
]);

/** Nazwy parametrów zapytania, których wartość jest poświadczeniem. */
const TAJNE_PARAMETRY = [
    'token',
    'consenttoken',
    'secret',
    'apikey',
    'key',
    'code',
    'password',
];

const ZASLONA = '[usuniete]';

export function wyczyscAdresZSekretow(adres: string): string {
    if (!adres) return adres;

    let u: URL;
    try {
        u = new URL(adres);
    } catch {
        // Nie-adres (albo adres względny bez bazy) — zwracamy bez zmian.
        // `beforeSend` nie ma prawa rzucić: wywrotka tam gasi CAŁĄ telemetrię.
        return adres;
    }

    const segmenty = u.pathname.split('/');
    for (let i = 0; i < segmenty.length - 1; i++) {
        if (RODZICE_SEKRETU.has(segmenty[i]) && segmenty[i + 1]) {
            segmenty[i + 1] = ZASLONA;
        }
    }
    u.pathname = segmenty.join('/');

    for (const [nazwa] of [...u.searchParams]) {
        if (TAJNE_PARAMETRY.includes(nazwa.toLowerCase())) {
            u.searchParams.set(nazwa, ZASLONA);
        }
    }

    return u.toString();
}
