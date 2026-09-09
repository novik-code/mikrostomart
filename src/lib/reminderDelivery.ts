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
import { loadConfirmationLink, buildAppointmentReminderPush, buildReminderBody } from './appointmentReminderPush';
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

/**
 * 🔑 Ładunek i link potwierdzenia pochodzą ze WSPÓLNEGO modułu
 * `lib/appointmentReminderPush`. Do 2026-09-09 ten plik miał WŁASNE kopie obu
 * funkcji, tak jak `cron/sms-auto-send` — i właśnie dlatego trzeci producent
 * (`cron/push-appointment-1h`) mógł się rozjechać i wysyłać push bez `data.type`,
 * przez co pacjenci nie mogli potwierdzić wizyty z powiadomienia.
 */

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

    const confirm = await loadConfirmationLink(supabase, row.prodentis_id, row.appointment_date);

    const delivery = await deliverToPatient({
        patientId: row.patient_id || null,
        // ⚠️ TYLKO DO LOGÓW. `sms_reminders.prodentis_id` trzyma id WIZYTY, nie pacjenta —
        // `deliverToPatient` szuka tokenów wyłącznie po `patientId` (UUID konta).
        prodentisPatientId: String(row.prodentis_id || ''),
        phone,
        pushPayload: buildAppointmentReminderPush({
            title: 'Przypomnienie o wizycie',
            body: buildReminderBody(row),
            appointmentProdentisId: row.prodentis_id,
            confirm,
        }),
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
