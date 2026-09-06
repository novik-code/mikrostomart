/**
 * Odwołane wizyty pacjenta do paczki RODO (art. 15) — sekcja 9 `export-data`.
 *
 * 🔴 PO CO OSOBNY PLIK. Do 05.09 ta sekcja składała filtr PostgREST STRINGIEM:
 *
 *     const cancelFilters = [];
 *     if (patient.prodentis_id) cancelFilters.push(`patient_prodentis_id.eq.${patient.prodentis_id}`);
 *     if (patient.phone)        cancelFilters.push(`patient_phone.eq.${patient.phone}`);
 *     ….or(cancelFilters.join(','))
 *
 * `.or()` przyjmuje SUROWĄ składnię PostgREST i wysyła ją dosłownie, a przecinek jest w niej
 * separatorem warunków. `patients.phone` jest zaś polem, które pacjent sam sobie ustawia
 * przez `PATCH /api/patients/me` — do 05.09 bez żadnej walidacji formatu. Wystarczyło więc
 * zapisać sobie numer `x,reason.gte.`, żeby do zapytania doszedł trzeci warunek
 * `reason >= ''` — prawdziwy dla każdego wiersza z niepustym powodem. Zapytanie idzie
 * kluczem `service_role`, czyli OMIJA RLS, a `select('*')` zwraca `patient_name`,
 * `patient_phone`, `doctor_name`, `appointment_date` i `reason`.
 * Skutek: pacjent pobierał w SWOJEJ paczce RODO odwołane wizyty WSZYSTKICH pacjentów.
 *
 * 🔑 DLACZEGO DWA `.eq()`, A NIE ESCAPOWANIE. `.eq()` wkłada wartość do OSOBNEGO parametru
 * zapytania, więc przecinek przestaje cokolwiek znaczyć — nie ma czego escapować i nie ma
 * jak się pomylić. Wariant „przepuść telefon przez regex" odrzuciłby przy okazji pacjentów
 * z nietypowym zapisem numeru i po cichu zgubił ich wiersze w paczce RODO; tu nie gubimy
 * nikogo, bo nie filtrujemy wejścia, tylko przestajemy je sklejać w składnię.
 *
 * 🪤 Scalenie i sortowanie robimy w JS, bo dwa zapytania mogą zwrócić TEN SAM wiersz
 * (pacjent pasuje i po `prodentis_id`, i po telefonie). Deduplikacja po `id`; gdyby wiersz
 * nie miał `id`, zostawiamy go — lepiej duplikat w paczce niż brak.
 */

/**
 * Minimalny kształt klienta, jakiego potrzebujemy — dzięki temu strażnik podstawia własny
 * i WYKONUJE tę funkcję, zamiast czytać kod trasy.
 *
 * 🪤 Wołający rzutuje tu prawdziwego `SupabaseClient`. To NIE jest lenistwo: typy
 * `postgrest-js` są tak głębokie, że próba zadeklarowania zgodnego interfejsu kończy się
 * `TS2589: Type instantiation is excessively deep`. Rzutowanie stoi w JEDNYM miejscu
 * (trasa), a tutaj mamy kontrakt, który da się odtworzyć w teście.
 */
export interface KlientOdwolanych {
    from(tabela: string): {
        select(kolumny: string): {
            eq(kolumna: string, wartosc: string): {
                order(
                    kolumna: string,
                    opcje: { ascending: boolean },
                ): PromiseLike<{ data: Record<string, unknown>[] | null }>;
            };
        };
    };
}

export async function pobierzOdwolaneWizyty(
    supabase: KlientOdwolanych,
    tozsamosc: { prodentisId?: string | null; phone?: string | null },
): Promise<Record<string, unknown>[]> {
    const zapytania: PromiseLike<{ data: Record<string, unknown>[] | null }>[] = [];

    if (tozsamosc.prodentisId) {
        zapytania.push(
            supabase
                .from('cancelled_appointments')
                .select('*')
                .eq('patient_prodentis_id', tozsamosc.prodentisId)
                .order('cancelled_at', { ascending: false }),
        );
    }
    if (tozsamosc.phone) {
        zapytania.push(
            supabase
                .from('cancelled_appointments')
                .select('*')
                .eq('patient_phone', tozsamosc.phone)
                .order('cancelled_at', { ascending: false }),
        );
    }
    if (zapytania.length === 0) return [];

    const wyniki = await Promise.all(zapytania);

    const poId = new Map<string, Record<string, unknown>>();
    const bezId: Record<string, unknown>[] = [];
    for (const { data } of wyniki) {
        for (const wiersz of data ?? []) {
            const id = wiersz?.id;
            if (id === undefined || id === null) bezId.push(wiersz);
            else poId.set(String(id), wiersz);
        }
    }

    return [...poId.values(), ...bezId].sort((a, b) => {
        const da = String(a?.cancelled_at ?? '');
        const db = String(b?.cancelled_at ?? '');
        return db.localeCompare(da); // malejąco, jak dotąd
    });
}
