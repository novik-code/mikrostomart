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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl';

/**
 * GET /api/employee/careflow/enrollments/[id]/link
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * `access_token` to bezterminowe, bezhasłowe uwierzytelnienie do danych medycznych
 * pacjenta, więc NIE jedzie w liście ani w szczegółach zapisu. Wychodzi wyłącznie
 * tędy — punktowo, na żądanie i zawsze z wpisem audytowym (kto i kiedy poprosił).
 *
 * Zwraca: { patientUrl }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { id } = await params;

        const { data: enrollment, error } = await supabase
            .from('care_enrollments')
            .select('id, access_token, patient_name, patient_id')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('[CareFlow] Patient link query failed:', error);
            return NextResponse.json({ error: 'Nie udało się pobrać linku pacjenta' }, { status: 500, headers: NO_STORE });
        }
        if (!enrollment || !enrollment.access_token) {
            return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        }

        await logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'view_careflow_patient_link',
            resourceType: 'careflow',
            resourceId: id,
            patientName: enrollment.patient_name || undefined,
            metadata: { patient_id: enrollment.patient_id },
            request: req,
        });

        return NextResponse.json(
            { patientUrl: `${SITE_URL}/opieka/${enrollment.access_token}` },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[CareFlow] Patient link error:', err);
        return NextResponse.json({ error: 'Nie udało się pobrać linku pacjenta' }, { status: 500, headers: NO_STORE });
    }
}
