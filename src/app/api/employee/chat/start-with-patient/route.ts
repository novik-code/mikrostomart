import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/chat/start-with-patient
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * Get-or-create OTWARTEJ konwersacji czatu dla konkretnego pacjenta (po prodentis_id).
 * Zwraca `conversationId`, którym apka otwiera `(staff)/czat/[id]`. Recepcja pisze
 * pierwszą wiadomość istniejącą ścieżką `POST /api/admin/chat/messages` (ona już
 * push+mailuje pacjenta) — dlatego TEN endpoint NIE wysyła żadnej wiadomości ani
 * powiadomienia: jest czysto idempotentnym „otwórz wątek".
 *
 * Body: { prodentis_id: string, patient_name?: string }
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { prodentis_id?: string; patient_name?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const prodentisId = body.prodentis_id?.trim();
    if (!prodentisId) {
        return NextResponse.json({ error: 'Provide prodentis_id' }, { status: 400 });
    }

    try {
        // Konto portalu pacjenta (patients.id = klucz konwersacji). Czat wymaga konta.
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', prodentisId)
            .limit(1)
            .maybeSingle();

        if (!patient) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'no_patient_account',
                    message: 'Pacjent nie ma konta w Strefie Pacjenta — nie można otworzyć czatu.',
                },
                { status: 404 }
            );
        }

        // Nazwa do wyświetlenia w liście konwersacji: preferuj przekazaną z apki
        // (hub ma ją z wizyty), w ostateczności pobierz z Prodentisa.
        let patientName = body.patient_name?.trim() || '';
        if (!patientName) {
            try {
                const prodentisUrl =
                    process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
                const detRes = await fetch(`${prodentisUrl}/api/patient/${prodentisId}/details`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (detRes.ok) {
                    const det = await detRes.json();
                    patientName = `${det.firstName || ''} ${det.lastName || ''}`.trim();
                }
            } catch {
                /* nazwa nie jest krytyczna */
            }
        }
        if (!patientName) patientName = 'Pacjent';

        // Get-or-create OTWARTEJ konwersacji (wzorzec z patients/chat POST).
        let { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .limit(1)
            .maybeSingle();

        let created = false;
        if (!conversation) {
            const { data: newConv, error: convError } = await supabase
                .from('chat_conversations')
                .insert({ patient_id: patient.id, patient_name: patientName })
                .select('id')
                .single();
            if (convError) throw convError;
            conversation = newConv;
            created = true;
        }

        // Audyt RODO — personel otworzył wątek czatu z pacjentem.
        logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'employee_start_patient_chat',
            resourceType: 'chat_conversation',
            resourceId: conversation!.id,
            patientName,
            metadata: { prodentis_id: prodentisId, created },
            request: req,
        });

        return NextResponse.json({
            success: true,
            conversationId: conversation!.id,
            created,
        });
    } catch (error) {
        console.error('[EmployeeChat] start-with-patient error:', error);
        return NextResponse.json({ error: 'Failed to start conversation' }, { status: 500 });
    }
}
