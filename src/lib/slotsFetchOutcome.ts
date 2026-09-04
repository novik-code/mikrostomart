/**
 * Rozstrzygnięcie: czy pusty kalendarz znaczy „brak wolnych terminów", czy „nie wiemy".
 *
 * 🔴 Powód powstania (2026-09-03). Kalendarz rezerwacji pobiera tydzień PIĘCIOMA równoległymi
 * zapytaniami, a każde z nich kończyło się `.catch(() => [])`. `Promise.all` nad promisami,
 * które SAME łapią wyjątek, nigdy nie odrzuca — więc zewnętrzny `catch` ustawiający komunikat
 * błędu wraz z numerem telefonu był **kodem martwym i nie pokazał się ani razu**.
 *
 * Skutek dla pacjenta: HTTP 429 (nasz limit 30/min, wyczerpywany po ~6 kliknięciach „następny
 * tydzień"), awaria PMS-u, zły kształt odpowiedzi i realnie zapełniony grafik dawały jeden
 * i ten sam napis — „Brak wolnych terminów w wybranym dniu". Człowiek szukający pomocy
 * dostawał informację, że terminów nie ma, także wtedy, gdy były.
 *
 * 🔑 Reguła (przeniesiona z aplikacji mobilnej, gdzie działa od sierpnia): jeśli NIC nie
 * dojechało, a przynajmniej jeden dzień padł — to jest AWARIA, nie pustka. Pustkę wolno
 * ogłosić dopiero wtedy, gdy wszystkie dni odpowiedziały i wszystkie były puste.
 *
 * ⚪ Świadomie: gdy część dni padła, ale inne przywiozły terminy — pokazujemy terminy.
 * Pacjent ma wtedy co kliknąć, a wołanie „awaria" nad działającą listą byłoby hałasem.
 */

/** Wynik pobrania JEDNEGO dnia. */
export type WynikDnia =
    | { ok: true; liczbaSlotow: number }
    | { ok: false; status?: number };

export type StanKalendarza =
    | { rodzaj: 'terminy' }
    | { rodzaj: 'pusto' }
    | { rodzaj: 'blad'; powod: 'limit' | 'awaria' };

/**
 * @param dni            wyniki pobrania poszczególnych dni tygodnia
 * @param slotowPoFiltrach ile terminów zostało PO naszych filtrach (lekarz, siatka, wyprzedzenie)
 */
export function ocenTydzien(dni: WynikDnia[], slotowPoFiltrach: number): StanKalendarza {
    if (slotowPoFiltrach > 0) return { rodzaj: 'terminy' };

    const padniete = dni.filter((d) => !d.ok) as Array<{ ok: false; status?: number }>;
    if (padniete.length === 0) return { rodzaj: 'pusto' };

    // 429 dostaje własny komunikat, bo lek jest inny: nie „zadzwoń", tylko „odczekaj chwilę".
    // Rozróżnienie ma znaczenie także dla nas — limit jest NASZ i jego wyczerpanie to sygnał,
    // że pacjent przewijał tygodnie w poszukiwaniu terminu, czyli że ich nie znalazł.
    const limit = padniete.some((d) => d.status === 429);
    return { rodzaj: 'blad', powod: limit ? 'limit' : 'awaria' };
}
