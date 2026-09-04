import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Realny czas trwania wizyty przy zapisie rezerwacji online do grafiku Prodentisa.
 *
 * 🔴 Po co powstało (2026-09-04). Dostawca PMS zmierzył, że **wszystkie 50 rezerwacji online
 * stoi w jego grafiku na 30 minut — łącznie z sześcioma higienizacjami**, które trwają 60.
 * Odpowiedzieliśmy, że to naprawione. To była prawda tylko w połowie: PYTANIE o wolne okna
 * wysyłało już realny czas, ale ZAPIS brał `booking.duration || 30`.
 *
 * 🪤 A `booking.duration` nie było `undefined` czasami — było ZAWSZE. Kolumny `duration`
 * w tabeli `online_bookings` **nigdy nie było** (zmierzone: PostgREST oddaje `42703
 * column online_bookings.duration does not exist`). Czyli nie fallback, który się czasem
 * odpala, tylko 100 % przypadków, z każdej powierzchni i z każdej wersji aplikacji —
 * także z tej zamrożonej w sklepach. Pacjent umawiający się na higienizację dostawał
 * w grafiku okno o połowę za krótkie.
 *
 * 🔑 Dlaczego czytamy z `employees`, a nie dokładamy kolumny: czas wizyty jest funkcją
 * SPECJALISTY i tam jest jego źródło prawdy (`booking_duration_minutes`, to samo, którym
 * karmi się `/api/specialists` i wszystkie trzy powierzchnie rezerwacji). Dołożenie kolumny
 * wymagałoby migracji, a INSERT z nieistniejącą kolumną wywraca CAŁĄ rezerwację — czyli
 * poprawka defektu mogłaby zamienić „za krótka wizyta" w „rezerwacja nie powstaje wcale",
 * gdyby deploy wyprzedził migrację. Ta wersja działa od razu i obejmuje też rezerwacje
 * złożone wcześniej.
 *
 * ⚪ Czego ta wersja NIE robi: nie zapamiętuje, jaki czas pacjent WIDZIAŁ w chwili rezerwacji.
 * Gdyby gabinet zmienił długość wizyty między złożeniem a zatwierdzeniem, weźmiemy nową.
 * Dla dzisiejszego defektu bez znaczenia — do rozważenia razem z kolumną, osobno.
 */

export const DOMYSLNY_CZAS_MIN = 30;

export interface ZrodloCzasu {
    minuty: number;
    /** Skąd wzięliśmy wartość — do logu, żeby „30" nigdy znów nie było niewidoczne. */
    zrodlo: 'employees' | 'rezerwacja' | 'domyslny';
}

/**
 * @param booking wiersz `online_bookings`; interesują nas identyfikatory specjalisty
 *                i — gdy kiedyś powstanie kolumna — zapamiętany czas.
 */
export async function czasWizyty(
    supabase: SupabaseClient,
    booking: {
        doctor_prodentis_id?: string | null;
        specialist_id?: string | null;
        duration_minutes?: number | null;
    },
): Promise<ZrodloCzasu> {
    // 1. Czas zapamiętany przy rezerwacji — najwierniejszy temu, co widział pacjent.
    if (typeof booking.duration_minutes === 'number' && booking.duration_minutes > 0) {
        return { minuty: booking.duration_minutes, zrodlo: 'rezerwacja' };
    }

    // 2. Źródło prawdy: ustawienie specjalisty. To samo, którym karmi się `/api/specialists`.
    const id = booking.doctor_prodentis_id || booking.specialist_id;
    if (id) {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('booking_duration_minutes')
                .eq('prodentis_id', id)
                .eq('is_active', true)
                .maybeSingle();

            // 🪤 supabase-js NIE rzuca przy błędzie zapytania — bez sprawdzenia `error`
            // literówka w nazwie kolumny wróciłaby jako „brak danych", czyli po cichu
            // przywróciłaby dokładnie ten defekt, który ten plik naprawia.
            if (error) {
                console.error('[czasWizyty] Odczyt z employees padł:', error.message);
            } else if (data?.booking_duration_minutes) {
                return { minuty: data.booking_duration_minutes, zrodlo: 'employees' };
            }
        } catch (err) {
            console.error('[czasWizyty] Nieoczekiwany błąd odczytu:', err);
        }
    }

    // 3. Ostatnia deska. Głośno, bo to jest dokładnie ta wartość, która przez pół roku
    //    trafiała do grafiku bez niczyjej wiedzy.
    console.warn(
        `[czasWizyty] Nie ustalono czasu wizyty dla specjalisty ${id ?? '(brak id)'} — ` +
            `wysyłam domyślne ${DOMYSLNY_CZAS_MIN} min. Sprawdź employees.booking_duration_minutes.`,
    );
    return { minuty: DOMYSLNY_CZAS_MIN, zrodlo: 'domyslny' };
}
