/**
 * Odświeżenie stanu wizyty w Prodentisie PRZED operacją zapisu (punkt 3h uzgodnień z PMS).
 *
 * 🔴 Po co. Zapamiętany u nas `prodentis_id` bywa nieaktualny, a dowiadywaliśmy się o tym
 * dopiero z błędu operacji zapisu. Dostawca PMS zalecał to dwukrotnie (13.05 i ponownie
 * w rundzie 4) — u nas nigdy nie zostało wdrożone: trzy ścieżki zapisu (odwołanie, przełożenie,
 * potwierdzenie obecności) czytały zapamiętany identyfikator niezależnie od siebie.
 *
 * Skala, zmierzona przez dostawcę na naszych 50 rezerwacjach:
 *   · **14 z 50 (28 %)** stoi w grafiku u INNEGO lekarza, niż wysłaliśmy — zmiana lekarza
 *     jest w Prodentisie wykonywana W MIEJSCU, na tym samym rekordzie;
 *   · zmiana TERMINU tworzy natomiast NOWY rekord z nowym identyfikatorem — stąd nasze 404.
 * Znaleziony przy okazji przykład na żywo: wizyta `0100234418` ma u nas w bazie `11.09 14:30`,
 * a w Prodentisie **16:30**. Bez odświeżenia potwierdzenie dla pacjenta podałoby złą godzinę.
 *
 * 🪤 NAJWAŻNIEJSZA REGUŁA TEGO PLIKU: awaria łączności NIE jest „wizyty nie ma".
 * `unavailable` znaczy „nie wiemy" i wołający ma wtedy działać jak dotąd (na zapamiętanym
 * identyfikatorze), a nie ogłaszać pacjentowi, że wizyta zniknęła. To ta sama rodzina błędu,
 * którą naprawialiśmy w kalendarzu: jeden widok na dwie różne przyczyny.
 */

import { prodentisFetch } from '@/lib/prodentisFetch';

export interface WizytaPMS {
    id: string;
    patientId: string;
    doctorId: string;
    doctorName: string;
    /** „2026-09-11" */
    date: string;
    /** „16:30" */
    startTime: string;
    endTime: string;
    duration: number;
    status: string;
    cancelDate: string | null;
}

export type StanWizyty =
    | { ok: true; wizyta: WizytaPMS }
    /** 404 — identyfikator nieaktualny (najczęściej: wizytę przełożono, powstał nowy rekord). */
    | { ok: false; powod: 'not_found' }
    /** Wizyta istnieje, ale jest skreślona. */
    | { ok: false; powod: 'cancelled'; wizyta: WizytaPMS }
    /** Nie udało się zapytać — awaria, timeout, brak konfiguracji. NIE znaczy „nie ma". */
    | { ok: false; powod: 'unavailable' };

/**
 * @param prodentisId identyfikator zapamiętany u nas
 * @param _apiKey     ⚠️ PRZESTARZAŁY, ignorowany. Klucz wstrzykuje `prodentisFetch` i tylko on;
 *                    parametr został wyłącznie po to, żeby nie łamać istniejących wywołań.
 *                    Brak klucza to dziś `BrakKluczaPMS` — łapie go `catch` niżej jako
 *                    `unavailable`, czyli „nie wiemy", zgodnie z regułą tego pliku.
 */
export async function odswiezWizyte(
    prodentisId: string | null | undefined,
): Promise<StanWizyty> {
    if (!prodentisId) return { ok: false, powod: 'unavailable' };

    try {
        const res = await prodentisFetch(`/api/schedule/appointment/${prodentisId}`, {
            timeoutMs: 10_000,
        });

        if (res.status === 404) return { ok: false, powod: 'not_found' };
        if (!res.ok) return { ok: false, powod: 'unavailable' };

        const wizyta = (await res.json()) as WizytaPMS;
        if (!wizyta?.id) return { ok: false, powod: 'unavailable' };

        // 🔑 Skreślona wizyta wraca ze statusem 200 — samo `res.ok` nie wystarcza.
        if (wizyta.status === 'cancelled' || wizyta.cancelDate) {
            return { ok: false, powod: 'cancelled', wizyta };
        }
        return { ok: true, wizyta };
    } catch {
        // Timeout, zerwana sieć, zły JSON — wszystko to znaczy „nie wiemy", nie „nie ma".
        return { ok: false, powod: 'unavailable' };
    }
}

/** Czy stan zapamiętany u nas rozjechał się z tym, co stoi w Prodentisie. */
export function rozjazdWizyty(
    wizyta: WizytaPMS,
    zapamietane: { date?: string | null; time?: string | null; doctorProdentisId?: string | null },
): string[] {
    const roznice: string[] = [];
    if (zapamietane.date && zapamietane.date !== wizyta.date) {
        roznice.push(`data: u nas ${zapamietane.date}, w PMS ${wizyta.date}`);
    }
    const czas = (zapamietane.time || '').slice(0, 5);
    if (czas && czas !== wizyta.startTime) {
        roznice.push(`godzina: u nas ${czas}, w PMS ${wizyta.startTime}`);
    }
    if (zapamietane.doctorProdentisId && zapamietane.doctorProdentisId !== wizyta.doctorId) {
        roznice.push(`lekarz: u nas ${zapamietane.doctorProdentisId}, w PMS ${wizyta.doctorId}`);
    }
    return roznice;
}
