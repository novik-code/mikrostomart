/**
 * Decyzja: czy — i o czym — powiadomić pacjenta po akcji recepcji na rezerwacji online.
 *
 * 🔴 Powód wydzielenia (2026-09-03). Do tej pory warunek brzmiał
 * `if (action === 'approve' || action === 'reject')` i **nie zaglądał do wyniku zapisu
 * w Prodentisie**. Skutek: gdy wpis do grafiku padał (`SLOT_TAKEN`, `MISSING_PATIENT_ID`,
 * `NETWORK_ERROR`, `API_ERROR_*`) albo gdy w ogóle nie było klucza API, rezerwacja zostawała
 * ze statusem `approved` + `schedule_error`, wizyty w grafiku NIE BYŁO, a pacjent i tak
 * dostawał SMS „została POTWIERDZONA. Do zobaczenia!", push i e-mail. Błąd widział wyłącznie
 * pracownik — jako `alert()` w chwili kliknięcia i czerwoną plakietkę na liście.
 *
 * Scenariusz, który to realizuje: dwoje pacjentów na ten sam termin → recepcja zatwierdza oba
 * → drugi zapis wraca z 409 → drugi pacjent przyjeżdża na wizytę, której nie ma w grafiku.
 *
 * Reguła po naprawie: **potwierdzamy dopiero to, co realnie stoi w grafiku.**
 * Odmowa nie zależy od Prodentisa, więc `reject` powiadamia jak dotąd.
 */

export type BookingNotification = 'confirmed' | 'rejected' | null;

export interface NotifyDecisionInput {
    /** Akcja panelu: 'approve' | 'reject' | 'schedule' | 'fail' | 'pick_patient' | … */
    action: string;
    /** Czy PO tej operacji wizyta jest zapisana w grafiku Prodentisa. */
    scheduledNow: boolean;
    /** Czy była tam już PRZED operacją (chroni przed drugim SMS-em przy ponowieniu). */
    scheduledBefore: boolean;
}

export function decideBookingNotification(input: NotifyDecisionInput): BookingNotification {
    const { action, scheduledNow, scheduledBefore } = input;

    // Odmowa jest decyzją gabinetu, nie Prodentisa — informujemy niezależnie od grafiku.
    if (action === 'reject') return 'rejected';

    // Zatwierdzenie: potwierdzamy TYLKO wtedy, gdy wizyta realnie weszła do grafiku.
    if (action === 'approve') return scheduledNow ? 'confirmed' : null;

    // Ręczne ponowienie zapisu: pacjent nie dostał jeszcze potwierdzenia (bo zatwierdzenie
    // padło), więc gdy teraz się udało — czas go powiadomić. Jeśli wizyta stała w grafiku
    // już wcześniej, ponowienie niczego nie zmienia i drugi SMS byłby hałasem.
    if (action === 'schedule') return scheduledNow && !scheduledBefore ? 'confirmed' : null;

    // 'fail', 'pick_patient' i wszystko inne — cisza.
    return null;
}
