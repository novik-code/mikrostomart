/**
 * Identyfikatory idące do ŚCIEŻKI adresu Prodentisa — jedno źródło wzorca (P-035, 06.09).
 *
 * 🔴 PO CO. Trasy personelu sklejały identyfikator prosto w ścieżkę:
 *
 *     prodentisFetch(`/api/patient/${patientId}/details`, { klucz: 'personel' })
 *
 * a `patientId` przychodził z `searchParams.get(...)`, czyli JUŻ ZDEKODOWANY, i był
 * sprawdzany wyłącznie na niepustość. WHATWG `URL` normalizuje `..` i ucina wszystko
 * po `#`, więc pracownik po 2FA mógł wykonać DOWOLNE żądanie GET do API Prodentisa
 * kluczem `personel`. Zmierzone wykonaniem:
 *
 *     '../patients/search?q=kow&limit=500#'  →  /api/patients/search?q=kow&limit=500
 *     '../../admin/export'                   →  /admin/export/details
 *
 * Odpowiedź (u nas: lista pacjentów z PESEL-ami i telefonami) wracała w całości jako 200,
 * a wpis audytu RODO zapisywał wstrzyknięty string jako `resourceId` — czyli rejestr
 * dostępu do danych medycznych stawał się bezużyteczny dokładnie wtedy, gdy jest potrzebny.
 *
 * 🔑 DWIE WARSTWY, obie tanie: biała lista na wejściu (tutaj) ORAZ `encodeURIComponent`
 * przy sklejaniu. Sama biała lista wystarcza, ale kodowanie kosztuje jeden nawias i chroni
 * przed następnym miejscem, w którym ktoś zapomni o walidacji.
 *
 * ⚪ Wzorzec `^[0-9]{6,12}$` NIE jest zgadnięty. Zmierzone na produkcji 06.09:
 * `patients.prodentis_id` — **149 ze 149** kont to dokładnie 10 cyfr z zerami wiodącymi;
 * identyfikatory wizyt (`0100234418`, `0100213775`, …) mają ten sam kształt. Ten sam
 * wzorzec stoi już w `employee/patient-label/route.ts` i w CHECK migracji 183 — tutaj
 * przenosimy go do JEDNEGO miejsca, żeby nie rozjechał się między trasami.
 * 🪤 Nie zawężać do 10 cyfr: dostawca PMS nie obiecał stałej długości, a zbyt wąski
 * wzorzec daje 400 dla LEGALNYCH pacjentów — to droższa awaria niż ta, którą zamyka.
 */

/** Identyfikator pacjenta albo wizyty w Prodentisie. */
export const PRODENTIS_ID_RE = /^[0-9]{6,12}$/;

export function czyPoprawnyIdPms(wartosc: unknown): wartosc is string {
    return typeof wartosc === 'string' && PRODENTIS_ID_RE.test(wartosc);
}

/**
 * Limit z parametru zapytania → liczba całkowita w przedziale `1..max`.
 *
 * 🪤 Do 06.09 `limit` leciał do PMS jako SUROWY STRING (`?limit=${limit}`), więc był
 * drugim wejściem do tej samej ścieżki — i jednocześnie nie miał żadnego pułapu.
 * Śmieci albo wartość spoza zakresu → wracamy do domyślnej, zamiast oddawać 400:
 * to parametr wygody, a nie tożsamości, i nie ma powodu przerywać przez niego odczytu.
 */
export function parsePmsLimit(surowy: unknown, domyslny: number, max: number): number {
    const n = Number.parseInt(String(surowy ?? ''), 10);
    if (!Number.isFinite(n) || n < 1) return domyslny;
    return Math.min(n, max);
}
