/**
 * PROSTE PREDYKATY KSZTAŁTU WEJŚCIA — wspólne dla tras personelu (P-104, P-105, P-106).
 *
 * 🔴 PO CO. Kilka tras zapisywało ciało żądania do bazy bez sprawdzenia typu, zakresu
 * ani długości. Skutki były dwojakie: zły typ kończył się 500 z Postgresa zamiast
 * czytelnym 400, a wartości spoza sensownego zakresu zapisywały się bez mrugnięcia —
 * `expiresInHours: 87600` dawało link do e-Karty ważny dziesięć lat, ujemny
 * `pushSentCount` wydłużał serię przypomnień, a dowolne `completedAt` wchodziło do
 * raportu PDF jako wykonanie zadania.
 *
 * 🪤 CELOWO BEZ ZODA, choć jest w zależnościach. W całym `src/` nie ma ani jednego
 * `from 'zod'` — walidacje są tu pisane ręcznie (`parsePmsLimit`, `isFlatBooleanMap`
 * w `PATCH /me`). Wprowadzanie drugiego stylu przy pozycji o niskiej wadze to zmiana
 * konwencji repo „przy okazji", a takie zmiany w tym projekcie kosztowały już dużo.
 */

/** Napis o rozsądnej długości albo `null`. Puste `undefined` sprawdzaj OSOBNO. */
export function poprawnyTekst(v: unknown, maxDl: number): boolean {
    return v === null || (typeof v === 'string' && v.length <= maxDl);
}

/** Liczba całkowita w domkniętym zakresie. Napisy odrzucamy — to nie jest parametr adresu. */
export function poprawnaLiczba(v: unknown, min: number, max: number): boolean {
    return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/** Znacznik czasu ISO albo `null` — bez „prawie dat", które Postgres przyjmie inaczej. */
export function poprawnaDataIso(v: unknown): boolean {
    if (v === null) return true;
    if (typeof v !== 'string') return false;
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) && v.length >= 10;
}

/** Niepusta lista napisów o rozsądnej długości. */
export function poprawnaListaTekstow(v: unknown, maxPozycji: number, maxDl: number): boolean {
    return Array.isArray(v)
        && v.length > 0
        && v.length <= maxPozycji
        && v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= maxDl);
}

/**
 * Identyfikator kartoteki PMS. Ten sam kształt, którego pilnuje `lib/prodentisId.ts`
 * przy ścieżkach — powtórzony tu jako predykat dla CIAŁA żądania, bo wartość stąd
 * trafia i do ścieżki storage, i do adresu żądania do Prodentisa.
 */
export function poprawnyIdPms(v: unknown): boolean {
    return typeof v === 'string' && /^[0-9]{6,12}$/.test(v);
}
