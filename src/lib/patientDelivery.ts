/**
 * Patient Delivery Service — Push-First, SMS Fallback
 *
 * Central module for delivering notifications to patients.
 * Logic: Check patient account → check push tokens → push first → SMS fallback.
 *
 * 🔑 DWA NIEZALEŻNE KANAŁY PUSH, DWIE RÓŻNE TABELE:
 *   · `fcm_tokens`          — web-push z przeglądarki (PWA), kluczowana `patients.id` (UUID),
 *   · `patient_push_tokens` — aplikacja mobilna (Expo, mig 173), kluczowana `prodentis_id`.
 * Bramka MUSI pytać o obie. Wcześniej czytała wyłącznie `fcm_tokens`, więc pacjent
 * mający TYLKO apkę wyglądał na „bez pusha" i dostawał SMS-a — mimo działającego
 * tokenu Expo. To ta sama klasa błędu co w `broadcastPush` (naprawione osobno).
 *
 * Used by all patient-facing cron jobs:
 *   - appointment-reminders (reminder)
 *   - post-visit-sms (post_visit)
 *   - week-after-visit-sms (week_after_visit)
 */
import { createClient } from '@supabase/supabase-js';
import { pushToPatientAll, PushPayload } from './pushService';
import { hasPatientAppToken } from './expoPush';
import { sendSMS } from './smsService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────

export interface DeliveryResult {
    /** Which channel was ultimately used */
    channel: 'push' | 'sms' | 'push+sms' | 'none';
    /** Whether push was sent successfully */
    pushSent: boolean;
    /** Push error message (if push failed or was skipped) */
    pushError?: string;
    /** Whether SMS was sent */
    smsSent: boolean;
    /** SMS error message (if SMS failed) */
    smsError?: string;
    /** SMS provider message ID */
    smsMessageId?: string;
    /** Whether patient has a portal account */
    patientHasAccount: boolean;
    /** Whether patient has an active FCM push token */
    patientHasPush: boolean;
}

/**
 * Klucz ścieżki w rejestrze zdrowia (`push_path_health`, migracja 186) dla danego typu SMS-a.
 *
 * 🪤 Tylko `reminder` ma dziś zarejestrowaną ścieżkę — `post_visit` i `week_after_visit`
 * NIE MAJĄ wiersza w `push_path_health` i (co ważniejsze) ich rekordy w `sms_reminders`
 * mają `patient_id = null`, więc push-first i tak ich nie obejmuje. Zwracamy `undefined`
 * zamiast zmyślać klucz: `recordPushPath` po nieistniejącym kluczu to UPDATE zerujący
 * zero wierszy, czyli cichy no-op, który wyglądałby na działającą diagnostykę.
 */
const PATH_KEY_BY_SMS_TYPE: Record<'reminder' | 'post_visit' | 'week_after_visit', string | undefined> = {
    reminder: 'appointment_reminder',
    post_visit: undefined,
    week_after_visit: undefined,
};


export interface DeliveryOptions {
    /**
     * Supabase patient UUID (from patients table).
     * JEDYNY wiarygodny klucz pacjenta w tym module — po nim idzie wyszukanie
     * obu rodzajów tokenów push.
     */
    patientId: string | null;
    /**
     * Prodentis ID — WYŁĄCZNIE do logów i śledzenia.
     * ⚠️ NIE używać do adresowania powiadomień: część wołających przekazuje tu
     * id WIZYTY zamiast id pacjenta (patrz `post-visit-sms`, `week-after-visit-sms`).
     */
    prodentisPatientId?: string;
    /** Patient phone number (for SMS fallback) */
    phone: string;
    /** Push notification content */
    pushPayload: PushPayload;
    /** SMS message text (for SMS channel) */
    smsMessage: string;
    /** SMS type for tracking */
    smsType: 'reminder' | 'post_visit' | 'week_after_visit';
    /** Force SMS regardless of push success (both channels) */
    forceSms?: boolean;
    /** Skip SMS entirely (push-only) */
    skipSms?: boolean;
}

// ─── Core Delivery Logic ─────────────────────────────────────

/**
 * Deliver a notification to a patient using push-first strategy.
 *
 * Flow:
 * 1. Check if patient has account → check for FCM tokens
 * 2. If has tokens → send push
 * 3. If push succeeds and !forceSms → done (push only)
 * 4. If push fails or no tokens → send SMS as fallback
 * 5. Return complete delivery result for admin visibility
 */
export async function deliverToPatient(options: DeliveryOptions): Promise<DeliveryResult> {
    const {
        patientId,
        phone,
        pushPayload,
        smsMessage,
        forceSms = false,
        skipSms = false,
    } = options;

    const result: DeliveryResult = {
        channel: 'none',
        pushSent: false,
        smsSent: false,
        patientHasAccount: false,
        patientHasPush: false,
    };

    // ─── Step 1: Check for push tokens on BOTH channels ───────
    // Zapytania są niezależne: awaria jednego nie może ukryć drugiego kanału.
    // supabase-js NIE rzuca — błąd wraca w `error`, więc sprawdzamy go jawnie,
    // inaczej awaria bazy wygląda identycznie jak „pacjent nie ma pusha".
    let hasFcmTokens = false;
    let hasAppTokens = false;
    let tokenLookupFailed = false;

    if (patientId) {
        result.patientHasAccount = true;

        const { data: tokenRows, error: fcmErr } = await supabase
            .from('fcm_tokens')
            .select('fcm_token')
            .eq('user_id', patientId)
            .eq('user_type', 'patient');

        if (fcmErr) {
            tokenLookupFailed = true;
            console.error(`  ⚠️ [Delivery] fcm_tokens lookup error: ${fcmErr.message}`);
        }
        hasFcmTokens = (tokenRows && tokenRows.length > 0) || false;
    }

    // Apka mobilna. Mapowanie UUID→prodentisId siedzi w expoPush.ts.
    //
    // 🔴 KLUCZEM JEST WYŁĄCZNIE `patientId` (UUID konta) — NIGDY `prodentisPatientId`.
    // To pole jest w praktyce niewiarygodne: `post-visit-sms` i `week-after-visit-sms`
    // przekazują w nim id WIZYTY, nie pacjenta. Oba są numerycznymi ciągami, więc
    // `resolveProdentisId` puściłby je dalej bez mrugnięcia i zapytanie o
    // `patient_push_tokens` mogłoby trafić w KONTO INNEGO PACJENTA.
    // Brak konta = brak apki (logowanie wymaga konta), więc nic na tym nie tracimy.
    if (patientId) {
        const appTokens = await hasPatientAppToken(patientId);
        hasAppTokens = appTokens.has;
        if (appTokens.error) tokenLookupFailed = true;
    }

    result.patientHasPush = hasFcmTokens || hasAppTokens;

    // ─── Step 2: Try push (if patient has tokens) ─────────────
    // Wysyłka idzie przez pushToPatientAll: AWAITUJE oba kanały i sumuje `sent`.
    // pushToUser liczył wyłącznie FCM (kanał Expo szedł fire-and-forget), więc
    // pacjent z samą apką dostawał sent:0 i był eskalowany do SMS-a.
    if (patientId && result.patientHasPush) {
        try {
            // `smsType` jest kluczem ścieżki w rejestrze zdrowia — ten sam, którego
            // używa `recordPushPath` niżej. Bez niego bilety Expo zapisywały się
            // z `path_key = NULL` i diagnostyka nie umiała przypisać niedostarczeń.
            const pushResult = await pushToPatientAll(patientId, pushPayload, PATH_KEY_BY_SMS_TYPE[options.smsType]);

            if (pushResult.sent > 0) {
                result.pushSent = true;
                result.channel = 'push';
                console.log(
                    `  📲 [Delivery] Push sent to patient ${patientId} ` +
                    `(fcm=${pushResult.fcm.sent} app=${pushResult.expo.sent})`
                );
            } else {
                result.pushError = `Push sent to 0 devices (fcm failed=${pushResult.fcm.failed}, app failed=${pushResult.expo.failed})`;
                console.log(`  ⚠️ [Delivery] Push failed: ${result.pushError}`);
            }
        } catch (err: any) {
            result.pushError = err.message || 'Push exception';
            console.error(`  ❌ [Delivery] Push error: ${result.pushError}`);
        }
    } else if (!patientId) {
        result.pushError = 'Pacjent nie ma konta w portalu';
    } else if (tokenLookupFailed) {
        // Rozróżnienie jest istotne dla diagnostyki: „nie wiemy" ≠ „nie ma".
        result.pushError = 'Nie udało się odczytać tokenów push (błąd bazy) — wysyłam SMS';
    } else {
        result.pushError = 'Brak tokenu push (pacjent nie ma apki ani powiadomień w przeglądarce)';
    }

    // ─── Step 3: SMS fallback / force ─────────────────────────
    const shouldSendSms = !skipSms && (
        forceSms ||                     // Force both channels
        !result.pushSent                // Push didn't work → fallback
    );

    if (shouldSendSms && phone) {
        try {
            const smsResult = await sendSMS({ to: phone, message: smsMessage });
            if (smsResult.success) {
                result.smsSent = true;
                result.smsMessageId = smsResult.messageId;
                result.channel = result.pushSent ? 'push+sms' : 'sms';
                console.log(`  📱 [Delivery] SMS sent to ${phone}`);
            } else {
                result.smsError = smsResult.error;
                console.error(`  ❌ [Delivery] SMS failed: ${result.smsError}`);
            }
        } catch (err: any) {
            result.smsError = err.message || 'SMS exception';
            console.error(`  ❌ [Delivery] SMS error: ${result.smsError}`);
        }
    }

    // If push sent but SMS skipped (no forced fallback)
    if (result.pushSent && !result.smsSent && !forceSms) {
        result.channel = 'push';
    }

    // Nothing worked
    if (!result.pushSent && !result.smsSent) {
        result.channel = 'none';
    }

    return result;
}

/**
 * Update an sms_reminders record with delivery result info.
 * Called after deliverToPatient() to persist channel tracking.
 */
export async function updateDeliveryStatus(
    reminderId: string,
    deliveryResult: DeliveryResult
): Promise<void> {
    const updateData: Record<string, any> = {
        delivery_channel: deliveryResult.channel,
        push_sent: deliveryResult.pushSent,
        push_error: deliveryResult.pushError || null,
        push_sent_at: deliveryResult.pushSent ? new Date().toISOString() : null,
        patient_has_account: deliveryResult.patientHasAccount,
        patient_has_push: deliveryResult.patientHasPush,
        updated_at: new Date().toISOString(),
    };

    // If push succeeded and no SMS needed → mark as "push_sent" instead of "draft"
    if (deliveryResult.pushSent && !deliveryResult.smsSent) {
        updateData.status = 'push_sent';
    }

    // If SMS was sent → mark as "sent"
    if (deliveryResult.smsSent) {
        updateData.status = 'sent';
        updateData.sent_at = new Date().toISOString();
        updateData.sms_message_id = deliveryResult.smsMessageId || null;
    }

    const { error } = await supabase
        .from('sms_reminders')
        .update(updateData)
        .eq('id', reminderId);

    if (error) {
        console.error(`[Delivery] Failed to update reminder ${reminderId}:`, error.message);
    }
}

/**
 * Check if a patient has responded to an appointment action.
 * Used by escalation cron to decide if SMS fallback is needed.
 */
export async function hasPatientResponded(
    prodentisId: string,
    appointmentDate: string
): Promise<boolean> {
    const { data } = await supabase
        .from('appointment_actions')
        .select('status')
        .eq('prodentis_id', prodentisId)
        .gte('appointment_date', `${appointmentDate.split('T')[0]}T00:00:00.000Z`)
        .lte('appointment_date', `${appointmentDate.split('T')[0]}T23:59:59.999Z`)
        .in('status', ['confirmed', 'cancelled', 'reschedule_requested'])
        .limit(1);

    return (data && data.length > 0) || false;
}
