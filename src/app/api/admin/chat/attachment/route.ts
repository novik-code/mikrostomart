import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { verifyAdmin } from '@/lib/auth';
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
import { checkRateLimit } from '@/lib/rateLimit';
import { hasRole } from '@/lib/roles';

/**
 * POST /api/admin/chat/attachment — zdjęcie od RECEPCJI w czacie z pacjentem.
 * Multipart: `file` + `messageId` (wiadomość recepcji musi już istnieć).
 *
 * 🔴 PO CO TO POWSTAŁO. Od migracji 184 pacjent mógł wysłać zdjęcie, a recepcja tylko je
 * OGLĄDAĆ — odesłać pliku nie miała czym. Schemat dopuszczał to od początku (komentarz
 * przy `chat_att_origin_shape_check` mówi wprost: „recepcja odpowiada plikiem w czacie
 * pacjenta"), brakowało wyłącznie trasy. Objawem był kanał jednokierunkowy: pacjent
 * przysyła zdjęcie zęba, a odpowiedź ze skierowaniem albo zaleceniem trzeba było wysyłać
 * mailem, poza wątkiem.
 *
 * 🔒 `origin = 'staff'` + `uploaded_by_user_id`, NIGDY odwrotnie — baza wymusza to
 * CHECK-iem `chat_att_origin_shape_check`, ale wołający i tak musi podać poprawną parę.
 *
 * 🔑 `is_health_data = false`, inaczej niż w torze pacjenta. Tam zdjęcie „tego, co mnie
 * niepokoi" jest daną o zdrowiu (art. 9 RODO) i uruchamia audyt odczytu, eksport art. 15
 * i kasowanie art. 17. Tutaj plik pochodzi OD KLINIKI (skierowanie, zalecenie, instrukcja)
 * i nie jest wypowiedzią pacjenta o jego stanie. Flaga ma opisywać pochodzenie danych,
 * nie sam fakt, że rozmowa dotyczy zdrowia.
 *
 * 🪤 Wątki GOŚCI są odsiewane (`is_anonymous`): gość jest uwierzytelniony samym
 * `guest_token`, więc nie ma pewności, do kogo trafia plik.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp = binarka libvips, na edge nie wystartuje

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recepcja obsługuje wiele wątków naraz — limit luźniejszy niż pacjentowi, ale jest. */
const STAFF_ATTACH_RATE_LIMIT = { max: 40, windowMs: 60_000 };

export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const rl = await checkRateLimit(
            `staff-chat-attach:${user.id}`,
            STAFF_ATTACH_RATE_LIMIT.max,
            STAFF_ATTACH_RATE_LIMIT.windowMs,
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

        // ── Autoryzacja: wiadomość MUSI pochodzić od recepcji i stać w wątku pacjenta ──
        // Bez sprawdzenia `sender_role` recepcja mogłaby doczepić plik do wiadomości
        // PACJENTA — w wątku wyglądałoby to, jakby przysłał go on sam.
        const { data: msg } = await supabase
            .from('chat_messages')
            .select('id, conversation_id, sender_role')
            .eq('id', messageId)
            .maybeSingle();
        if (!msg || msg.sender_role !== 'reception') {
            return NextResponse.json({ error: 'Nie znaleziono wiadomości' }, { status: 404 });
        }

        const { data: conv } = await supabase
            .from('chat_conversations')
            .select('id, patient_id, is_anonymous')
            .eq('id', msg.conversation_id)
            .maybeSingle();
        if (!conv || conv.is_anonymous || !conv.patient_id) {
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

        // Normalizacja usuwa EXIF także tutaj — zdjęcie zrobione w gabinecie niesie
        // współrzędne gabinetu, a re-enkodowanie jest zarazem sanityzacją pliku.
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
                origin: 'staff',
                uploaded_by_user_id: user.id,
                is_health_data: false,
            })
            .select(ATTACHMENT_COLUMNS)
            .single();

        if (insErr || !row) {
            console.error('[Chat] Zapis załącznika recepcji nieudany:', insErr);
            // Plik jest już w buckecie — bez tego zostałby tam osierocony na zawsze.
            await removeAttachmentFiles([stored.storagePath, stored.thumbPath]);
            return NextResponse.json({ error: 'Nie udało się wysłać załącznika' }, { status: 500 });
        }

        // Podbicie aktywności wątku. 🔑 `unread_by_admin` zostaje BEZ ZMIAN — to recepcja
        // właśnie wysłała plik, więc oznaczanie wątku jako nieprzeczytanego przez nią samą
        // byłoby kłamstwem (odwrotnie niż w torze pacjenta, gdzie flaga jest sednem).
        await supabase
            .from('chat_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', msg.conversation_id);

        return NextResponse.json({ attachment: mapAttachmentRow(row) }, { status: 201 });
    } catch (err) {
        console.error('[Chat] Błąd załącznika recepcji:', err);
        return NextResponse.json({ error: 'Nie udało się wysłać załącznika' }, { status: 500 });
    }
}
