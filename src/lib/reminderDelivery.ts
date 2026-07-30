/**
 * Dostarczenie PRZYPOMNIENIA O WIZYCIE — jedno miejsce dla wszystkich wywołujących.
 *
 * 🔴 PO CO TO POWSTAŁO. Panel recepcji ma TRZY trasy wysyłki draftu:
 *   · `/api/admin/sms-send`                  (pojedynczy, z podglądem)
 *   · `/api/admin/sms-reminders/send`        (zbiorczo, „wyślij wszystkie")
 *   · `/api/admin/sms-reminders/send-manual` (SMS ad hoc, bez draftu)
 * Naprawa push-first z 2026-07-28 objęła WYŁĄCZNIE pierwszą z nich. Pozostałe
 * wołały `sendSMS` bezpośrednio, więc pacjent z aplikacją i tak dostawał SMS —
 * zgłoszone z produkcji 2026-07-30: właściciel z aktywną apką i świeżym tokenem
 * dostał samego SMS-a, a wiersz miał `patient_has_account = false` (czyli wartość
 * DOMYŚLNĄ kolumny, nie zapis kodu — ścieżki push nigdy nie podjęto).
 *
 * 🔑 Dlatego logika żyje TUTAJ, a trasy tylko ją wołają. Kolejny wywołujący
 * dostanie push-first za darmo, zamiast powielać trzecią kopię.
 */

import { createClient } from '@supabase/supabase-js';
import { brand } from './brandConfig';
import { deliverToPatient, updateDeliveryStatus, type DeliveryResult } from './patientDelivery';
import { recordPushPath } from './pushHealth';
import { sendSMS } from './smsService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ReminderRow {
    id: string;
    phone?: string | null;
    sms_message?: string | null;
    patient_id?: string | null;
    prodentis_id?: string | number | null;
    appointment_date?: string | null;
    doctor_name?: string | null;
    appointment_type?: string | null;
    sms_type?: string | null;
}

export interface ReminderDeliveryOutcome {
    ok: boolean;
    channel: DeliveryResult['channel'] | 'sms-fallback';
    messageId?: string | null;
    error?: string | null;
    pushSent: boolean;
}

/** Treść pusha — BEZ nazwiska pacjenta, bo ląduje na ekranie blokady. */
export function buildReminderBody(row: Pick<ReminderRow, 'appointment_date' | 'doctor_name' | 'appointment_type'>): string {
    const time = row.appointment_date ? String(row.appointment_date).slice(11, 16) : '';
    const parts = [time && `Wizyta ${time}`, row.doctor_name, row.appointment_type].filter(Boolean);
    return parts.join(' — ') || 'Masz zaplanowaną wizytę';
}

/**
 * Ten sam short link, który niesie SMS — czytany z bazy, NIE składany.
 * Slug `/wizyta/[type]` zależy od typu wizyty, więc sklejanie go w kodzie
 * rozjechałoby się z treścią SMS-a.
 */
export async function loadConfirmationLink(
    appointmentProdentisId: string | number | null | undefined,
    appointmentDate: string | null | undefined
): Promise<{ token: string; url: string } | null> {
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

    if (error) return null;
    const action = data as { id?: string; confirmation_token?: string } | null;
    if (!action?.confirmation_token || !action.id) return null;

    const { data: linkRow } = await supabase
        .from('short_links')
        .select('short_code')
        .eq('appointment_id', action.id)
        .limit(1)
        .maybeSingle();

    const code = (linkRow as { short_code?: string } | null)?.short_code;
    if (!code) return null;

    return { token: action.confirmation_token, url: `${brand.appUrl}/s/${code}` };
}

/**
 * Wyślij draft przypomnienia: NAJPIERW push do aplikacji, SMS dopiero jako zapas.
 *
 * `messageOverride` — treść z panelu, gdy operator poprawił ją przed wysłaniem.
 * Typy inne niż `reminder` (po zabiegu, tydzień po) mają własne crony i własną
 * logikę; tutaj idą gołym SMS-em, tak jak dotąd.
 */
export async function deliverReminderDraft(
    row: ReminderRow,
    messageOverride?: string | null
): Promise<ReminderDeliveryOutcome> {
    const phone = String(row.phone ?? '');
    const message = String(messageOverride ?? row.sms_message ?? '');
    const isReminder = !row.sms_type || row.sms_type === 'reminder';

    if (!isReminder || !phone || !message) {
        const res = await sendSMS({ to: phone, message });
        await supabase
            .from('sms_reminders')
            .update({
                status: res.success ? 'sent' : 'failed',
                sms_message_id: res.messageId ?? null,
                send_error: res.error ?? null,
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);
        return { ok: res.success, channel: 'sms-fallback', messageId: res.messageId, error: res.error, pushSent: false };
    }

    const confirm = await loadConfirmationLink(row.prodentis_id, row.appointment_date);

    const delivery = await deliverToPatient({
        patientId: row.patient_id || null,
        // ⚠️ TYLKO DO LOGÓW. `sms_reminders.prodentis_id` trzyma id WIZYTY, nie pacjenta —
        // `deliverToPatient` szuka tokenów wyłącznie po `patientId` (UUID konta).
        prodentisPatientId: String(row.prodentis_id || ''),
        phone,
        pushPayload: {
            title: 'Przypomnienie o wizycie',
            body: buildReminderBody(row),
            url: confirm ? confirm.url : '/strefa-pacjenta/powiadomienia',
            tag: `appointment-${row.prodentis_id ?? 'unknown'}`,
            data: {
                type: 'appointment_reminder',
                ...(confirm ? { confirmationToken: confirm.token } : {}),
            },
        },
        smsMessage: message,
        smsType: 'reminder',
    });

    await updateDeliveryStatus(row.id, delivery);

    if (delivery.patientHasPush) {
        void recordPushPath('appointment_reminder', {
            sent: delivery.pushSent ? 1 : 0,
            failed: delivery.pushSent ? 0 : 1,
            error: delivery.pushError,
        });
    }

    return {
        ok: delivery.pushSent || delivery.smsSent,
        channel: delivery.channel,
        messageId: delivery.smsMessageId,
        error: delivery.smsError || delivery.pushError,
        pushSent: delivery.pushSent,
    };
}
