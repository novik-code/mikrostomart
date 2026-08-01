import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Znajdź otwarty wątek gościa po tokenie (jedyny klucz dostępu). */
async function findGuestConversation(token: string) {
    if (!token) return null;
    const { data } = await supabase
        .from('chat_conversations')
        .select('id, guest_name, patient_name')
        .eq('guest_token', token)
        .eq('is_anonymous', true)
        .eq('status', 'open')
        .maybeSingle();
    return data;
}

/**
 * GET /api/chat/guest
 * Wiadomości wątku gościa (polling). Token waliduje własność.
 *
 * 🔒 Token przyjmujemy PRZEDE WSZYSTKIM z nagłówka `X-Guest-Token`. W adresie trafiał
 * do logów serwera i pośredników przy każdym odpytaniu (co kilkanaście sekund), a daje
 * pełny wgląd w wątek z opisem dolegliwości i telefonem — i nie wygasa.
 * ⚠️ Wariant `?token=` ZOSTAJE: aplikacje 1.1.0 i 1.2.0 są już w sklepach i pytają tak.
 * Wolno go usunąć dopiero, gdy te wersje wyjdą z użycia.
 */
export async function GET(req: NextRequest) {
    const token =
        req.headers.get('x-guest-token')?.trim() ||
        req.nextUrl.searchParams.get('token')?.trim() ||
        '';
    const conv = await findGuestConversation(token);
    if (!conv) {
        return NextResponse.json({ messages: [], conversationId: null });
    }

    // oznacz wiadomości recepcji jako przeczytane + wyczyść flagę pacjenta
    await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', conv.id)
        .eq('sender_role', 'reception')
        .eq('read', false);
    await supabase
        .from('chat_conversations')
        .update({ unread_by_patient: false })
        .eq('id', conv.id);

    const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[GuestChat] GET error:', error);
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }
    return NextResponse.json({ messages: messages || [], conversationId: conv.id });
}

/**
 * POST /api/chat/guest  { token, content }
 * Gość wysyła wiadomość do recepcji.
 */
export async function POST(req: NextRequest) {
    // Rate limit: 20 wiadomości / min / IP (anty-spam)
    const ip = getClientIP(req);
    const rl = await checkRateLimit(`guest-chat-msg:${ip}`, 20, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele wiadomości. Zwolnij na chwilę.' },
            { status: 429, headers: { 'Retry-After': '60' } }
        );
    }

    let body: { token?: unknown; content?: unknown } | null = null;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const rawToken = body?.token;
    const rawContent = body?.content;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    if (!content) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const conv = await findGuestConversation(token);
    if (!conv) {
        return NextResponse.json({ error: 'Konwersacja nie istnieje lub została zamknięta.' }, { status: 404 });
    }

    const senderName = conv.guest_name || conv.patient_name || 'Gość';

    // czy to pierwsza wiadomość w wątku (do prefiksu powiadomienia)
    const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id);
    const isFirst = (count ?? 0) === 0;

    const { data: message, error: msgError } = await supabase
        .from('chat_messages')
        .insert({
            conversation_id: conv.id,
            sender_role: 'patient',
            sender_name: senderName,
            content,
        })
        .select()
        .single();

    if (msgError) {
        console.error('[GuestChat] POST insert error:', msgError);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString(), unread_by_admin: true })
        .eq('id', conv.id);

    // Powiadomienia recepcji (jak w czacie pacjenta)
    const prefix = isFirst ? '🆕 NOWA ROZMOWA CZAT (gość)' : '💬 NOWA WIADOMOŚĆ CZAT (gość)';
    const telegramMsg = `${prefix}\n\n👤 Gość: ${senderName}\n✉️ ${content.substring(0, 200)}`;
    sendTelegramNotification(telegramMsg, 'messages').catch(console.error);

    const pushParams = { name: senderName, message: content.substring(0, 100) };
    // `alsoApp` — czat MUSI dzwonić na telefonie recepcji; bez tego szedł wyłącznie web-push.
    broadcastPush('admin', 'chat_patient_to_admin', pushParams, '/pracownik?tab=czat', { alsoApp: true }).catch(console.error);
    broadcastPush('employee', 'chat_patient_to_admin', pushParams, '/pracownik?tab=czat', { alsoApp: true }).catch(console.error);

    return NextResponse.json({ message });
}
