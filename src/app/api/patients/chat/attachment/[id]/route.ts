import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { signAttachment, SIGNED_URL_TTL_SECONDS } from '@/lib/chatAttachments';
import { verifyPatientSession } from '@/lib/jwt';

/**
 * GET /api/patients/chat/attachment/[id]?thumb=1
 * Signed URL o krótkim TTL do załącznika w WŁASNYM wątku pacjenta.
 *
 * Obsługuje oba kierunki: zdjęcie wysłane przez pacjenta i plik odesłany przez recepcję —
 * o dostępie decyduje przynależność wiadomości do wątku tego pacjenta, nie autor pliku.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const payload = await verifyPatientSession(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
    }

    try {
        const { id } = await params;
        if (!UUID_RE.test(id)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        }

        const { data: att } = await supabase
            .from('chat_attachments')
            .select('id, chat_message_id, storage_path, thumb_path')
            .eq('id', id)
            .maybeSingle();
        // Załączniki czatu ZESPOŁOWEGO pacjentowi nie przysługują pod żadnym pozorem.
        if (!att || !att.chat_message_id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        }

        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();
        if (!patient) {
            return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        }

        const { data: msg } = await supabase
            .from('chat_messages')
            .select('id, conversation_id')
            .eq('id', att.chat_message_id)
            .maybeSingle();
        if (!msg) {
            return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        }

        const { data: conv } = await supabase
            .from('chat_conversations')
            .select('id, patient_id')
            .eq('id', msg.conversation_id)
            .maybeSingle();
        if (!conv || conv.patient_id !== patient.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        }

        const wantsThumb = new URL(request.url).searchParams.get('thumb') === '1';
        const path = wantsThumb && att.thumb_path ? att.thumb_path : att.storage_path;
        const url = await signAttachment(path);
        if (!url) {
            return NextResponse.json({ error: 'Not found' }, { status: 500, headers: NO_STORE });
        }

        // Pacjent oglądający własny załącznik nie podlega audytowi dostępu personelu —
        // ten rejestr służy rozliczaniu, kto z KLINIKI sięgnął po dane pacjenta.
        return NextResponse.json({ url, expiresIn: SIGNED_URL_TTL_SECONDS }, { headers: NO_STORE });
    } catch (err) {
        console.error('[Chat] Signed URL pacjenta nieudany:', err);
        return NextResponse.json({ error: 'Not found' }, { status: 500, headers: NO_STORE });
    }
}
