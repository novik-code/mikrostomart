import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/chat/guest/start
 * Rozpoczyna (lub wznawia) anonimowy wątek czatu gościa z recepcją.
 * Publiczny — bez logowania. Dostęp do wątku TYLKO przez zwrócony `token`
 * (klient trzyma go w SecureStore). Telefon = kontakt zwrotny dla recepcji.
 *
 * Body: { name, phone, email?, token? }   (token = wznowienie istniejącego wątku)
 * Resp: { conversationId, token }
 */
export async function POST(req: NextRequest) {
    // Rate limit: 5 nowych wątków / min / IP
    const ip = getClientIP(req);
    const rl = await checkRateLimit(`guest-chat-start:${ip}`, 5, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele prób. Spróbuj za chwilę.' },
            { status: 429, headers: { 'Retry-After': '60' } }
        );
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const resumeToken = typeof body?.token === 'string' ? body.token.trim() : '';

    // Wznowienie istniejącego wątku po tokenie (per-urządzenie)
    if (resumeToken) {
        const { data: existing } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('guest_token', resumeToken)
            .eq('status', 'open')
            .maybeSingle();
        if (existing) {
            return NextResponse.json({ conversationId: existing.id, token: resumeToken });
        }
        // token nieznany/zamknięty → utwórz nowy wątek (poniżej)
    }

    if (name.length < 2) {
        return NextResponse.json({ error: 'Podaj imię i nazwisko.' }, { status: 400 });
    }
    if (phone.replace(/\D/g, '').length < 9) {
        return NextResponse.json({ error: 'Podaj prawidłowy numer telefonu.' }, { status: 400 });
    }

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');

    const { data: conv, error } = await supabase
        .from('chat_conversations')
        .insert({
            patient_id: null,
            patient_name: name, // pole wyświetlane w panelu recepcji = nazwa gościa
            is_anonymous: true,
            guest_name: name,
            guest_phone: phone,
            guest_email: email || null,
            guest_token: token,
            status: 'open',
        })
        .select('id')
        .single();

    if (error || !conv) {
        console.error('[GuestChat] start insert error:', error);
        return NextResponse.json({ error: 'Nie udało się rozpocząć czatu.' }, { status: 500 });
    }

    return NextResponse.json({ conversationId: conv.id, token });
}
