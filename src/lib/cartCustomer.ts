/**
 * W7 — granica tego, co publiczna trasa koszyka wpuszcza do bazy.
 *
 * `POST /api/cart/calculate-total` jest jawnie publiczne (każdy może wycenić swój
 * koszyk) i TWORZY WIERSZ w tabeli zamówień kliniki. `customerDetails` szło tam jako
 * dowolny obiekt i lądowało w kolumnie JSON — czyli była to publiczna wrzutka do bazy
 * pod dowolnymi kluczami i dowolnego rozmiaru. Panel czyta wyłącznie znane pola, więc
 * nikt by tego nie zobaczył.
 *
 * Bierzemy WYŁĄCZNIE pola używane przez checkout, każde przycięte. Nadmiarowe klucze
 * odrzucamy po cichu: to nie jest formularz, który walidujemy użytkownikowi, tylko
 * filtr wejścia.
 *
 * Moduł jest OSOBNY od trasy, żeby dało się go URUCHOMIĆ w teście — asercja na treści
 * pliku przepuściłaby `if (false && …)` i inne ciche regresje.
 */

export const POLA_KUPUJACEGO = [
    'name',
    'email',
    'phone',
    'street',
    'houseNumber',
    'apartmentNumber',
    'city',
    'zipCode',
] as const;

export type PoleKupujacego = (typeof POLA_KUPUJACEGO)[number];

export const MAX_DLUGOSC: Record<PoleKupujacego, number> = {
    name: 120,
    email: 160,
    phone: 32,
    street: 120,
    houseNumber: 20,
    apartmentNumber: 20,
    city: 80,
    zipCode: 16,
};

/** Górna granica koszyka — bez niej jedno żądanie każe wycenić tysiące pozycji. */
export const MAX_POZYCJI_KOSZYKA = 50;

export function przytnijDaneKupujacego(
    surowe: unknown,
): Record<string, string> | undefined {
    if (!surowe || typeof surowe !== 'object' || Array.isArray(surowe)) return undefined;
    const zrodlo = surowe as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const pole of POLA_KUPUJACEGO) {
        const v = zrodlo[pole];
        if (typeof v !== 'string') continue;
        const przyciete = v.trim().slice(0, MAX_DLUGOSC[pole]);
        if (przyciete) out[pole] = przyciete;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
