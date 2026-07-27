import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import {
    ATTACHMENT_COLUMNS,
    countAttachments,
    detectImageMime,
    mapAttachmentRow,
    MAX_ATTACHMENTS_PER_MESSAGE,
    normalizeImage,
    readUploadedFile,
    removeAttachmentFiles,
    storeAttachment,
} from '@/lib/chatAttachments';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * POST /api/patients/chat/attachment — zdjęcie od PACJENTA w czacie z recepcją.
 * Multipart: `file` + `messageId` (wiadomość musi już istnieć — patrz niżej).
 *
 * 🔒 DANE O ZDROWIU (art. 9 RODO). Zdjęcie „tego, co mnie niepokoi" to inna kategoria niż
 * załącznik roboczy personelu, dlatego wiersz dostaje `is_health_data = true`: wpływa to
 * na audyt odczytu, eksport art. 15 i kasowanie art. 17.
 *
 * 🔒 GOŚĆ NIE MOŻE ZAŁĄCZAĆ — i nie chodzi o brak UI, tylko o brak podstawy: gość jest
 * uwierzytelniony wyłącznie `guest_token` na publicznej trasie, a plik od osoby
 * niezidentyfikowanej to dane zdrowotne bez podstawy przetwarzania. Ta trasa wymaga JWT
 * pacjenta, a baza dodatkowo wymusza `uploaded_by_patient_id` przy `origin = 'patient'`.
 *
 * 🔑 Kolejność wiadomość→plik jest wymuszona CHECK-iem `chat_att_one_owner_check`.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp = binarka libvips, na edge nie wystartuje

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ciaśniej niż personel, ale z zapasem NAD limitem plików na wiadomość.
 * 🔑 Limit równy `MAX_ATTACHMENTS_PER_MESSAGE` (5) odbijałby pacjenta kodem 429 zaraz
 * po wysłaniu JEDNEJ kompletnej wiadomości — czyli przy pierwszym realnym użyciu.
 */
const PATIENT_ATTACH_RATE_LIMIT = { max: 15, windowMs: 60_000 };

export async function POST(request: NextRequest) {
    const payload = verifyTokenFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const rl = await checkRateLimit(
            `patient-attach:${payload.prodentisId}`,
            PATIENT_ATTACH_RATE_LIMIT.max,
            PATIENT_ATTACH_RATE_LIMIT.windowMs,
        );
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Zbyt wiele załączników. Odczekaj chwilę.' },
                { status: 429, headers: { 'Retry-After': '60' } },
            );
        }

        let form: FormData;
        try {
            form = await request.formData();
        } catch {
            return NextResponse.json({ error: 'Nieprawidłowe dane wejściowe' }, { status: 400 });
        }

        const messageId = String(form.get('messageId') ?? '');
        if (!UUID_RE.test(messageId)) {
            return NextResponse.json({ error: 'Nie znaleziono wiadomości' }, { status: 404 });
        }

        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();
        if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

        // ── Autoryzacja: to MUSI być własna wiadomość pacjenta w jego własnym wątku ──
        const { data: msg } = await supabase
            .from('chat_messages')
            .select('id, conversation_id, sender_role')
            .eq('id', messageId)
            .maybeSingle();
        if (!msg || msg.sender_role !== 'patient') {
            return NextResponse.json({ error: 'Nie znaleziono wiadomości' }, { status: 404 });
        }

        const { data: conv } = await supabase
            .from('chat_conversations')
            .select('id, patient_id, is_anonymous')
            .eq('id', msg.conversation_id)
            .maybeSingle();
        // `is_anonymous` odsiewa wątki gości nawet gdyby ktoś podstawił ich id.
        if (!conv || conv.is_anonymous || conv.patient_id !== patient.id) {
            return NextResponse.json({ error: 'Nie znaleziono wiadomości' }, { status: 404 });
        }

        const existing = await countAttachments('chat_message_id', messageId);
        if (existing === null) {
            return NextResponse.json({ error: 'Nie udało się wysłać załącznika' }, { status: 500 });
        }
        if (existing >= MAX_ATTACHMENTS_PER_MESSAGE) {
            return NextResponse.json(
                { error: `Maksymalnie ${MAX_ATTACHMENTS_PER_MESSAGE} zdjęć na wiadomość` },
                { status: 400 },
            );
        }

        const raw = await readUploadedFile(form);
        if (!raw) {
            return NextResponse.json({ error: 'Nieprawidłowy plik (limit 10 MB)' }, { status: 413 });
        }
        if (!detectImageMime(raw)) {
            return NextResponse.json(
                { error: 'Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WebP.' },
                { status: 400 },
            );
        }

        // Normalizacja usuwa EXIF — w tym GPS. Zdjęcie zrobione telefonem w domu niesie
        // współrzędne mieszkania pacjenta; nie ma powodu, żeby trafiały na nasz serwer.
        const image = await normalizeImage(raw);
        if (!image) {
            return NextResponse.json({ error: 'Nie udało się przetworzyć zdjęcia' }, { status: 400 });
        }

        const stored = await storeAttachment(msg.conversation_id, image);
        if (!stored) {
            return NextResponse.json({ error: 'Nie udało się wysłać załącznika' }, { status: 500 });
        }

        const { data: row, error: insErr } = await supabase
            .from('chat_attachments')
            .insert({
                chat_message_id: messageId,
                storage_path: stored.storagePath,
                thumb_path: stored.thumbPath,
                mime: 'image/jpeg',
                size_bytes: stored.sizeBytes,
                width: stored.width,
                height: stored.height,
                origin: 'patient',
                uploaded_by_patient_id: patient.id,
                is_health_data: true,
            })
            .select(ATTACHMENT_COLUMNS)
            .single();

        if (insErr || !row) {
            console.error('[Chat] Zapis załącznika pacjenta nieudany:', insErr);
            await removeAttachmentFiles([stored.storagePath, stored.thumbPath]);
            return NextResponse.json({ error: 'Nie udało się wysłać załącznika' }, { status: 500 });
        }

        // Podbicie aktywności wątku, żeby recepcja zobaczyła go na górze listy — samo
        // zdjęcie bez tego mogłoby wpaść cicho pod starsze rozmowy.
        await supabase
            .from('chat_conversations')
            .update({ last_message_at: new Date().toISOString(), unread_by_admin: true })
            .eq('id', msg.conversation_id);

        return NextResponse.json({ attachment: mapAttachmentRow(row) }, { status: 201 });
    } catch (err) {
        console.error('[Chat] Błąd załącznika pacjenta:', err);
        return NextResponse.json({ error: 'Nie udało się wysłać załącznika' }, { status: 500 });
    }
}
