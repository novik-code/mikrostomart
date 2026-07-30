import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { deliverReminderDraft } from '@/lib/reminderDelivery';
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
 * Dlatego wysyłka idzie przez WSPÓLNE `deliverReminderDraft` — tę samą ścieżkę co
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
            // Wspólna ścieżka dla WSZYSTKICH tras wysyłki — patrz `lib/reminderDelivery`.
            // Treść bierzemy z żądania, nie z bazy: operator mógł ją poprawić w panelu.
            const delivery = await deliverReminderDraft({ ...row, id, phone }, message);

            await logAudit({
                userId: user.id,
                userEmail: user.email || '',
                action: delivery.ok ? 'sms_sent' : 'sms_send_failed',
                resourceType: 'sms',
                resourceId: id,
                metadata: {
                    phone,
                    messageLength: message.length,
                    channel: delivery.channel,
                    messageId: delivery.messageId,
                },
                request: req,
            });

            return NextResponse.json({
                success: delivery.ok,
                channel: delivery.channel,
                messageId: delivery.messageId,
                error: delivery.error,
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
