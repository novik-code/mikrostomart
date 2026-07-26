import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * POST /api/employee/careflow/enrollments/[id]/reject
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * Odrzucenie propozycji auto-kwalifikacji: zapis idzie na 'cancelled' i nigdy nie
 * dostaje zadań ani powiadomień. Dotyczy WYŁĄCZNIE statusu 'proposed' — anulowanie
 * już działającego protokołu robi PUT ze `status: 'cancelled'`.
 *
 * Body: { reason? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { id } = await params;

        let body: { reason?: string } = {};
        try {
            body = (await req.json()) || {};
        } catch {
            body = {}; // odrzucenie bez ciała żądania jest poprawne
        }

        const { data: enrollment } = await supabase
            .from('care_enrollments')
            .select('id, status, patient_id, patient_name, template_name')
            .eq('id', id)
            .maybeSingle();

        if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        if (enrollment.status !== 'proposed') {
            return NextResponse.json({ error: 'not_proposed' }, { status: 409, headers: NO_STORE });
        }

        // Compare-and-swap: warunek na statusie chroni przed wyścigiem z akceptacją.
        const { data: rejected, error } = await supabase
            .from('care_enrollments')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'proposed')
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('[CareFlow] Reject proposal update failed:', error);
            return NextResponse.json({ error: 'Nie udało się odrzucić propozycji' }, { status: 500, headers: NO_STORE });
        }
        if (!rejected) {
            return NextResponse.json({ error: 'not_proposed' }, { status: 409, headers: NO_STORE });
        }

        await supabase.from('care_audit_log').insert({
            enrollment_id: id,
            action: 'proposal_rejected',
            actor: auth.user.email || 'employee',
            details: {
                reason: body.reason || null,
                template_name: enrollment.template_name,
                rejected_by_user_id: auth.user.id,
            },
        });

        await logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'reject_careflow_proposal',
            resourceType: 'careflow',
            resourceId: id,
            patientName: enrollment.patient_name || undefined,
            metadata: { reason: body.reason || null, patient_id: enrollment.patient_id },
            request: req,
        });

        return NextResponse.json({ success: true }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] Reject proposal error:', err);
        return NextResponse.json({ error: 'Nie udało się odrzucić propozycji' }, { status: 500, headers: NO_STORE });
    }
}
