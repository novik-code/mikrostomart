/**
 * Identyfikator i token wiersza `appointment_actions` dla przebiegu crona przypomnień.
 *
 * 🔴 PO CO (przegląd 18.09.2026). Cron robi upsert po (prodentis_id, appointment_date) i przy
 * KAŻDYM przebiegu wstawiał NOWY `id` i NOWY `confirmation_token`. Wizyty poniedziałkowe
 * przechodzą przez crona dwa razy (piątek w trybie „monday” + niedziela w trybie dziennym),
 * więc piątkowy link z SMS-a po niedzieli przestawał działać: `/api/appointments/state` oddawał
 * 404, a strona z linku zamiast „wizyta potwierdzona — nie można odwołać” pokazywała przyciski,
 * które kończyły się „Appointment not found”. Zmieniał się też `id`, którego używa panel apki.
 *
 * 🔑 Istniejący wiersz zachowuje swój `id` i token. Błąd odczytu → nowe wartości, czyli
 * dokładnie dotychczasowe zachowanie crona (przypomnienie ma wyjść, nawet gdy odczyt zawiódł).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- łańcuch PostgREST jest dynamiczny
type KlientBazy = { from: (tabela: string) => any };

export interface KluczeAkcji {
    id: string;
    token: string;
    /** Czy wiersz tej wizyty już istniał (wtedy `id`/`token` pochodzą z bazy). */
    istnial: boolean;
}

export async function kluczeAkcjiWizyty(
    supabase: KlientBazy,
    prodentisId: string,
    appointmentDate: string,
    nowe: { id: string; token: string },
): Promise<KluczeAkcji> {
    try {
        const { data, error } = await supabase
            .from('appointment_actions')
            .select('id, confirmation_token')
            .eq('prodentis_id', prodentisId)
            .eq('appointment_date', appointmentDate)
            .maybeSingle();
        if (error || !data?.id) {
            if (error) console.warn(`[KLUCZE-AKCJI] Odczyt wiersza ${prodentisId} nie powiódł się — nowe klucze:`, error.message);
            return { ...nowe, istnial: false };
        }
        const token = typeof data.confirmation_token === 'string' && data.confirmation_token
            ? data.confirmation_token
            : nowe.token;
        return { id: String(data.id), token, istnial: true };
    } catch (e) {
        console.warn(`[KLUCZE-AKCJI] Odczyt wiersza ${prodentisId} rzucił — nowe klucze:`, e);
        return { ...nowe, istnial: false };
    }
}
