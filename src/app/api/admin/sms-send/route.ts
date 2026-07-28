import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { deliverToPatient, updateDeliveryStatus } from '@/lib/patientDelivery';
import { recordPushPath } from '@/lib/pushHealth';
import { brand } from '@/lib/brandConfig';
import { requireAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/sms-send
 * Immediately send a single draft SMS and update status in DB
 * Auth: admin required.
 * Body: { id, phone, message }
 *
 * 🔑 TA TRASA JEST GŁÓWNYM KANAŁEM WYSYŁKI, NIE AWARYJNYM.
 * Recepcja wysyła poranne przypomnienia ręcznie z panelu — w praktyce OKOŁO GODZINY
 * PRZED cronem `sms-auto-send`, który potem nie ma już czego wysłać („No draft SMS
 * to send — likely already sent manually"). Dopóki ta trasa wołała samo `sendSMS`,
 * cała logika push-first była w realnym obiegu MARTWA: pacjent z aplikacją i tak
 * dostawał SMS-a, bo człowiek kliknął wcześniej niż zegar.
 *
 * Dlatego wysyłka idzie tu przez `deliverToPatient` — dokładnie tę samą ścieżkę co
 * w cronie. Kto nacisnął „wyślij" nie może decydować o tym, jakim kanałem
 * powiadomienie dotrze do pacjenta.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const { id, phone, message } = await req.json();
        if (!id || !phone || !message) {
            return NextResponse.json({ error: 'Missing id, phone, or message' }, { status: 400 });
        }

        // Kontekst draftu potrzebny, żeby dobrać kanał i dołożyć link potwierdzenia.
        // Braku wiersza NIE traktujemy jako błędu krytycznego — spadamy wtedy na
        // gołego SMS-a, czyli zachowanie sprzed tej zmiany.
        const { data: draft } = await supabase
            .from('sms_reminders')
            .select('patient_id, prodentis_id, appointment_date, doctor_name, appointment_type, sms_type')
            .eq('id', id)
            .maybeSingle();

        const row = draft as {
            patient_id?: string | null;
            prodentis_id?: string | number | null;
            appointment_date?: string | null;
            doctor_name?: string | null;
            appointment_type?: string | null;
            sms_type?: string | null;
        } | null;

        // Push-first wyłącznie dla przypomnień o wizycie. Pozostałe typy (po zabiegu,
        // tydzień po) mają własne crony i własną logikę — tu ich nie dublujemy.
        const isReminder = !row?.sms_type || row.sms_type === 'reminder';

        if (row && isReminder) {
            const confirm = await loadConfirmationLink(row.prodentis_id, row.appointment_date);

            const delivery = await deliverToPatient({
                patientId: row.patient_id || null,
                prodentisPatientId: String(row.prodentis_id || ''),
                phone,
                pushPayload: {
                    title: 'Przypomnienie o wizycie',
                    body: buildBody(row),
                    url: confirm ? confirm.url : '/strefa-pacjenta/powiadomienia',
                    tag: `appointment-${row.prodentis_id ?? 'unknown'}`,
                    data: {
                        type: 'appointment_reminder',
                        ...(confirm ? { confirmationToken: confirm.token } : {}),
                    },
                },
                // Treść SMS-a bierzemy Z ŻĄDANIA, nie z bazy: operator mógł ją
                // przed wysłaniem poprawić w panelu.
                smsMessage: message,
                smsType: 'reminder',
            });

            await updateDeliveryStatus(id, delivery);

            if (delivery.patientHasPush) {
                void recordPushPath('appointment_reminder', {
                    sent: delivery.pushSent ? 1 : 0,
                    failed: delivery.pushSent ? 0 : 1,
                    error: delivery.pushError,
                });
            }

            await logAudit({
                userId: user.id,
                userEmail: user.email || '',
                action: delivery.pushSent || delivery.smsSent ? 'sms_sent' : 'sms_send_failed',
                resourceType: 'sms',
                resourceId: id,
                metadata: {
                    phone,
                    messageLength: message.length,
                    channel: delivery.channel,
                    messageId: delivery.smsMessageId,
                },
                request: req,
            });

            return NextResponse.json({
                success: delivery.pushSent || delivery.smsSent,
                channel: delivery.channel,
                messageId: delivery.smsMessageId,
                error: delivery.smsError || delivery.pushError,
            });
        }

        // ── Ścieżka zapasowa: brak wiersza albo inny typ niż przypomnienie ──
        const result = await sendSMS({ to: phone, message });

        const updateData: Record<string, unknown> = {
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (result.success) {
            updateData.status = 'sent';
            updateData.sms_message_id = result.messageId;
        } else {
            updateData.status = 'failed';
            updateData.send_error = result.error;
        }

        await supabase.from('sms_reminders').update(updateData).eq('id', id);

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: result.success ? 'sms_sent' : 'sms_send_failed',
            resourceType: 'sms',
            resourceId: id,
            metadata: { phone, messageLength: message.length, messageId: result.messageId },
            request: req,
        });

        return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

/** Tytuł/treść pusha — bez nazwiska pacjenta, bo idzie na ekran blokady. */
function buildBody(row: { appointment_date?: string | null; doctor_name?: string | null; appointment_type?: string | null }): string {
    const time = row.appointment_date ? String(row.appointment_date).slice(11, 16) : '';
    const parts = [time && `Wizyta ${time}`, row.doctor_name, row.appointment_type].filter(Boolean);
    return parts.join(' — ') || 'Masz zaplanowaną wizytę';
}

/**
 * Ten sam short link, który niesie SMS. Powstaje w `appointment-reminders`;
 * gdy go nie ma, push idzie bez akcji potwierdzenia — tak samo jak SMS.
 */
async function loadConfirmationLink(
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
