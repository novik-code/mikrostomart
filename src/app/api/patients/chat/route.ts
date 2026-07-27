import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { loadAttachmentsByMessage } from '@/lib/chatAttachments';
import { checkRateLimit } from '@/lib/rateLimit';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Ten sam limit co w czacie zespołowym — jedna miara długości wiadomości w całym projekcie. */
const MAX_PATIENT_MESSAGE_LENGTH = 4000;

// POST — patient sends a message
export async function POST(request: NextRequest) {
    const payload = verifyTokenFromRequest(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Limit wysyłki per pacjent. Do tej pory trasa nie miała ŻADNEGO — ani tu, ani na
    // długości treści — więc jedno konto mogło zalać recepcję (a od Fazy 4 także Storage).
    const rl = await checkRateLimit(`patient-chat:${payload.prodentisId}`, 20, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele wiadomości. Odczekaj chwilę.' },
            { status: 429, headers: { 'Retry-After': '60' } },
        );
    }

    // `request.json()` MUSI być w try: przy nieparsowalnym ciele Next rzucał surowym 500.
    let content: unknown;
    try {
        ({ content } = await request.json());
    } catch {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }
    if (content.length > MAX_PATIENT_MESSAGE_LENGTH) {
        return NextResponse.json(
            { error: `Wiadomość jest za długa (limit ${MAX_PATIENT_MESSAGE_LENGTH} znaków)` },
            { status: 400 },
        );
    }

    try {
        // Get patient id from Supabase
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (!patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Get patient name from Prodentis API
        let patientName = 'Pacjent';
        try {
            const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
            const detailsRes = await fetch(`${prodentisUrl}/api/patient/${payload.prodentisId}/details`);
            if (detailsRes.ok) {
                const details = await detailsRes.json();
                patientName = `${details.firstName || ''} ${details.lastName || ''}`.trim() || 'Pacjent';
            }
        } catch (e) {
            console.error('[Chat] Failed to fetch patient name from Prodentis:', e);
        }

        // Find or create open conversation
        let { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .single();

        let isNewConversation = false;

        if (!conversation) {
            const { data: newConv, error: convError } = await supabase
                .from('chat_conversations')
                .insert({
                    patient_id: patient.id,
                    patient_name: patientName,
                })
                .select('id')
                .single();

            if (convError) throw convError;
            conversation = newConv;
            isNewConversation = true;
        }

        // Insert message
        const { data: message, error: msgError } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: conversation!.id,
                sender_role: 'patient',
                sender_name: patientName,
                content: content.trim(),
            })
            .select()
            .single();

        if (msgError) throw msgError;

        // Update conversation timestamps and unread flag
        await supabase
            .from('chat_conversations')
            .update({
                last_message_at: new Date().toISOString(),
                unread_by_admin: true,
            })
            .eq('id', conversation!.id);

        // Telegram notification for new conversations or messages
        const prefix = isNewConversation ? '🆕 NOWA ROZMOWA CZAT' : '💬 NOWA WIADOMOŚĆ CZAT';
        const telegramMsg = `${prefix}\n\n👤 Pacjent: ${patientName}\n✉️ ${content.trim().substring(0, 200)}`;
        sendTelegramNotification(telegramMsg, 'messages').catch(console.error);

        // Push notification to all admin/employee subscribers
        broadcastPush(
            'admin',
            'chat_patient_to_admin',
            { name: patientName, message: content.trim().substring(0, 100) },
            '/pracownik?tab=czat'
        ).catch(console.error);
        broadcastPush(
            'employee',
            'chat_patient_to_admin',
            { name: patientName, message: content.trim().substring(0, 100) },
            '/pracownik?tab=czat'
        ).catch(console.error);

        return NextResponse.json({ message });
    } catch (error) {
        console.error('[Chat] Send error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

// GET — patient loads conversation messages
export async function GET(request: NextRequest) {
    const payload = verifyTokenFromRequest(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get patient
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (!patient) {
            return NextResponse.json({ messages: [], conversationId: null });
        }

        // Find open conversation
        const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .single();

        if (!conversation) {
            return NextResponse.json({ messages: [], conversationId: null });
        }

        // Mark messages from reception as read
        await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('conversation_id', conversation.id)
            .eq('sender_role', 'reception')
            .eq('read', false);

        // Mark conversation as read by patient
        await supabase
            .from('chat_conversations')
            .update({ unread_by_patient: false })
            .eq('id', conversation.id);

        // Fetch messages
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Załączniki jednym zapytaniem dla całego wątku (nie N+1). Klient renderuje po
        // DŁUGOŚCI tej tablicy — stara tabela `chat_messages` nie ma flagi `has_attachments`.
        const rows = messages || [];
        const attachments = await loadAttachmentsByMessage(
            'chat_message_id',
            rows.map((m: { id: string }) => m.id),
        );

        return NextResponse.json({
            messages: rows.map((m: { id: string }) => ({
                ...m,
                attachments: attachments.get(m.id) ?? [],
            })),
            conversationId: conversation.id,
        });
    } catch (error) {
        console.error('[Chat] Load error:', error);
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }
}
