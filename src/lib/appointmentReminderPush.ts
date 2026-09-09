import type { SupabaseClient } from '@supabase/supabase-js';
import { brand } from '@/lib/brandConfig';

/**
 * JEDNO miejsce, w którym powstaje ładunek pusha o wizycie.
 *
 * ══ PO CO TEN PLIK POWSTAŁ ══════════════════════════════════════════════════
 * Push o wizycie produkowały TRZY niezależne miejsca, każde po swojemu:
 *   · `cron/sms-auto-send`        — przypomnienie dobowe (miało `data.type` i token),
 *   · `lib/reminderDelivery.ts`   — ręczna wysyłka draftu z panelu (miało),
 *   · `cron/push-appointment-1h`  — push GODZINĘ przed wizytą (NIE MIAŁO).
 *
 * 🔴 AWARIA 2026-09-09. Apka rozpoznaje powiadomienie wyłącznie po
 * `data.type === 'appointment_reminder'` i dopiero wtedy otwiera ekran
 * potwierdzenia (`NotificationRouter`). Push godzinny wysyłał
 * `{ title, body, url: '/strefa-pacjenta/dashboard' }` — bez `data` — więc
 * tapnięcie wpadało w fallback i lądowało na ekranie głównym. Pacjent nie miał
 * jak potwierdzić, odwołać ani przełożyć wizyty.
 *
 * To jest ten sam kształt błędu, który w tym projekcie wracał już pięć razy:
 * funkcję dostaje JEDNA trasa z kilku, bo każda ma własną kopię kodu.
 * Dlatego builder jest tutaj, a nie w którymkolwiek z cronów — trzeci
 * producent nie ma już jak się rozjechać.
 *
 * 🔑 `url` zostaje WEBOWY. Kanał FCM w przeglądarce otwiera stronę
 * potwierdzenia, a apka i tak przechwytuje powiadomienie natywnie po
 * `data.type`, używając tego samego `confirmationToken` co link w SMS-ie.
 * Oba kanały prowadzą więc do tej samej akcji na tym samym wierszu
 * `appointment_actions`.
 */

export type LinkPotwierdzenia = { token: string; url: string };

/** Kształt ładunku, jaki przyjmuje `pushToPatientAll` / `deliverToPatient`. */
export type LadunekPushaWizyty = {
    title: string;
    body: string;
    url: string;
    tag?: string;
    data: { type: 'appointment_reminder'; confirmationToken?: string };
};

/**
 * Ten sam short link, który niesie SMS — CZYTANY z bazy, nigdy składany.
 *
 * 🪤 Slug w `/wizyta/[type]` pochodzi z mapowania typu wizyty, więc sklejanie
 * adresu tutaj rozjechałoby oba kanały przy pierwszym nietypowym rodzaju wizyty.
 * Ten sam link = ta sama strona i ta sama telemetria.
 */
export async function loadConfirmationLink(
    supabase: SupabaseClient,
    appointmentProdentisId: string | number | null | undefined,
    appointmentDate: string | null | undefined,
): Promise<LinkPotwierdzenia | null> {
    if (!appointmentProdentisId || !appointmentDate) return null;

    const day = String(appointmentDate).split('T')[0];
    const { data, error } = await supabase
        .from('appointment_actions')
        .select('id, confirmation_token')
        .eq('prodentis_id', String(appointmentProdentisId))
        .gte('appointment_date', `${day}T00:00:00.000Z`)
        .lte('appointment_date', `${day}T23:59:59.999Z`)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(`[push-wizyty] nie udało się odczytać tokenu potwierdzenia: ${error.message}`);
        return null;
    }

    const action = data as { id?: string; confirmation_token?: string } | null;
    const token = action?.confirmation_token;
    if (!token || !action?.id) return null;

    const { data: linkRow } = await supabase
        .from('short_links')
        .select('short_code')
        .eq('appointment_id', action.id)
        .limit(1)
        .maybeSingle();

    const shortCode = (linkRow as { short_code?: string } | null)?.short_code;
    if (!shortCode) return null;

    return { token, url: `${brand.appUrl}/s/${shortCode}` };
}

/**
 * Buduje ładunek pusha o wizycie.
 *
 * 🔒 `data.type` jest USTAWIANY ZAWSZE, także gdy nie udało się odczytać linku
 * potwierdzenia. Bez tego apka nie rozpozna powiadomienia i wyląduje na ekranie
 * głównym — a to jest dokładnie awaria z 09.09. Gdy tokenu nie ma, apka otwiera
 * ekran potwierdzenia bez tokenu i poprosi o zalogowanie; to i tak lepsze niż
 * ekran główny bez żadnej akcji.
 */
export function buildAppointmentReminderPush(opts: {
    title: string;
    body: string;
    appointmentProdentisId?: string | number | null;
    confirm: LinkPotwierdzenia | null;
}): LadunekPushaWizyty {
    const { title, body, appointmentProdentisId, confirm } = opts;
    return {
        title,
        body,
        url: confirm ? confirm.url : '/strefa-pacjenta/powiadomienia',
        tag: `appointment-${appointmentProdentisId ?? 'unknown'}`,
        data: {
            type: 'appointment_reminder',
            ...(confirm ? { confirmationToken: confirm.token } : {}),
        },
    };
}

/** Treść przypomnienia dobowego — „Wizyta 14:30 — dr Kowalski — kontrola". */
export function buildReminderBody(row: {
    appointment_date?: string | null;
    doctor_name?: string | null;
    appointment_type?: string | null;
}): string {
    const time = row.appointment_date ? String(row.appointment_date).slice(11, 16) : '';
    const parts = [time && `Wizyta ${time}`, row.doctor_name, row.appointment_type].filter(Boolean);
    return parts.join(' — ') || 'Masz zaplanowaną wizytę';
}
