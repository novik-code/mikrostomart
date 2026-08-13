import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { anonymizeCareflowForPatient } from '@/lib/careflowLifecycle';
import { removeAttachmentFiles } from '@/lib/chatAttachments';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Dane pacjenta — nic nie może osiąść w cache CDN ani przeglądarki. */
const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/**
 * POST /api/patients/delete-account
 * RODO: Soft-delete patient account — anonymizes PII, sets status to 'deleted'
 * Requires password confirmation for security
 *
 * Poza tabelą `patients` czyścimy też ślady poza nią (deklaracja `usunKonto.scopeDeleted`
 * złożona sklepom): tokeny push i dane osobowe w CareFlow. Dokumentacja medyczna
 * (zapisy, zadania, leki) ZOSTAJE — 20-letnia retencja, art. 17 ust. 3 lit. b RODO.
 */
export async function POST(request: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401, headers: NO_STORE });
        }

        const { password } = await request.json();

        if (!password) {
            return NextResponse.json({ error: 'Podaj hasło w celu potwierdzenia' }, { status: 400, headers: NO_STORE });
        }

        // Fetch patient
        const { data: patient, error: fetchError } = await supabase
            .from('patients')
            .select('id, password_hash, first_name, last_name, phone, prodentis_id')
            .eq('id', payload.userId)
            .single();

        if (fetchError || !patient) {
            return NextResponse.json({ error: 'Pacjent nie znaleziony' }, { status: 404, headers: NO_STORE });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, patient.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: 'Nieprawidłowe hasło' }, { status: 403, headers: NO_STORE });
        }

        // Soft-delete: anonymize PII, set status to 'deleted'
        const anonymizedId = `deleted_${patient.id.substring(0, 8)}`;
        const { error: updateError } = await supabase
            .from('patients')
            .update({
                first_name: 'Usunięty',
                last_name: 'Pacjent',
                phone: anonymizedId,
                email: null,
                password_hash: 'DELETED',
                account_status: 'deleted',
                /**
                 * 🔑 Usunięcie konta unieważnia stare tokeny (migracja 197).
                 * Usunięcie jest MIĘKKIE, więc bez tego token wydany przed skasowaniem
                 * nadal otwierałby dane pacjenta — przez 30 dni po tym, jak poprosił
                 * o usunięcie konta z RODO. ⏳ Czyta to strażnik z taktu 2.
                 */
                sessions_valid_from: new Date().toISOString(),
                notification_preferences: null,
            })
            .eq('id', payload.userId);

        if (updateError) {
            console.error('[DeleteAccount] Update error:', updateError);
            return NextResponse.json({ error: 'Nie udało się usunąć konta' }, { status: 500, headers: NO_STORE });
        }

        // ── Tokeny push: bez tego na urządzeniu dalej lądują powiadomienia ──
        // Nieblokująco względem usunięcia konta — awaria czyszczenia nie może go cofnąć.
        try {
            if (patient.prodentis_id) {
                const { error: expoErr } = await supabase
                    .from('patient_push_tokens')
                    .delete()
                    .eq('patient_id', patient.prodentis_id);
                if (expoErr) console.error('[DeleteAccount] patient_push_tokens cleanup error:', expoErr);
            }
            const { error: fcmErr } = await supabase
                .from('fcm_tokens')
                .delete()
                .eq('user_id', String(payload.userId))
                .eq('user_type', 'patient');
            if (fcmErr) console.error('[DeleteAccount] fcm_tokens cleanup error:', fcmErr);
        } catch (tokenErr) {
            console.error('[DeleteAccount] Push token cleanup failed:', tokenErr);
        }

        // ── Załączniki pacjenta: art. 17 (prawo do usunięcia) ─────────────────
        // Zdjęcia przysłane na czacie to dane o zdrowiu. Kaskada z `chat_messages` NIE
        // zabiera plików ze Storage (kasuje tylko wiersze), a tu w ogóle nie ma kaskady:
        // usunięcie konta jest MIĘKKIE (nadpisujemy PII), więc `ON DELETE CASCADE` nigdy
        // się nie odpala. Bez tego bloku zdjęcia zostają w buckecie bezterminowo.
        try {
            const { data: convIds } = await supabase
                .from('chat_conversations')
                .select('id')
                .eq('patient_id', payload.userId);
            const ids = (convIds ?? []).map((c: { id: string }) => c.id);
            if (ids.length > 0) {
                const { data: msgIds } = await supabase
                    .from('chat_messages')
                    .select('id')
                    .in('conversation_id', ids);
                const mIds = (msgIds ?? []).map((m: { id: string }) => m.id);
                if (mIds.length > 0) {
                    const { data: atts } = await supabase
                        .from('chat_attachments')
                        .select('id, storage_path, thumb_path')
                        .in('chat_message_id', mIds);
                    const rows = (atts ?? []) as { id: string; storage_path: string; thumb_path: string | null }[];
                    if (rows.length > 0) {
                        await removeAttachmentFiles(
                            rows.flatMap((r) => (r.thumb_path ? [r.storage_path, r.thumb_path] : [r.storage_path])),
                        );
                        const { error: attDelErr } = await supabase
                            .from('chat_attachments')
                            .delete()
                            .in('id', rows.map((r) => r.id));
                        if (attDelErr) console.error('[DeleteAccount] chat_attachments cleanup error:', attDelErr);
                    }
                }
            }
        } catch (attErr) {
            // Nieblokująco — awaria sprzątania plików nie może cofnąć usunięcia konta.
            console.error('[DeleteAccount] Attachment cleanup failed:', attErr);
        }

        // ── CareFlow: imię, telefon i powiązanie z kontem znikają, leczenie zostaje ──
        // Helper sam łapie błędy (nigdy nie rzuca), więc nie wywróci usunięcia konta.
        await anonymizeCareflowForPatient({
            patientDbId: String(payload.userId),
            prodentisId: patient.prodentis_id,
            patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
            patientPhone: patient.phone,
        });

        // Clear httpOnly cookie
        const response = NextResponse.json({
            success: true,
            message: 'Konto zostało usunięte. Wszystkie dane osobowe zostały zanonimizowane.',
        }, { headers: NO_STORE });
        response.headers.set('Set-Cookie', 'patient_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');

        console.log('[DeleteAccount] Account deleted:', payload.userId);
        return response;

    } catch (err) {
        console.error('[DeleteAccount] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
