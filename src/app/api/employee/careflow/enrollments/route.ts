import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * Jawna lista kolumn zamiast `*`. Poza odpowiedzią świadomie zostają:
 * - `access_token` — bezhasłowy dostęp do strony pacjenta z danymi medycznymi
 *   (wydaje go wyłącznie `GET .../[id]/link`, z wpisem audytowym),
 * - `report_pdf_url` — signed URL ważny rok; klient dostaje tylko flagę `hasReport`,
 *   a świeży link na 5 minut wydaje `GET .../[id]/report-link`.
 * `report_pdf_url` czytamy z bazy, ale usuwamy z odpowiedzi niżej.
 */
const ENROLLMENT_SELECT = `
    id, patient_id, patient_name, patient_phone, patient_db_id,
    template_id, template_name, appointment_id, appointment_date,
    doctor_name, doctor_id, status,
    custom_medications, custom_notes, prescription_code, follow_up_appointments,
    enrolled_by, enrolled_at, completed_at, cancelled_at,
    report_exported_to_prodentis, report_generated_at, report_pdf_url,
    care_tasks(id, title, sort_order, scheduled_at, completed_at, skipped_at, sms_sent)
`;

const ALLOWED_STATUSES = ['active', 'completed', 'cancelled', 'paused', 'proposed'];

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * GET /api/employee/careflow/enrollments
 * List enrollments. Query: ?status=active|completed|cancelled|paused|proposed|all,
 * ?patientId=, ?doctorId=, ?limit= (default 100, max 500).
 */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });

        const url = new URL(req.url);
        const status = url.searchParams.get('status') || 'active';
        const patientId = url.searchParams.get('patientId');
        const doctorId = url.searchParams.get('doctorId');

        if (status !== 'all' && !ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Nieprawidłowy status' }, { status: 400, headers: NO_STORE });
        }

        const limitParam = Number(url.searchParams.get('limit'));
        const limit = Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(Math.trunc(limitParam), MAX_LIMIT)
            : DEFAULT_LIMIT;

        let query = supabase
            .from('care_enrollments')
            .select(ENROLLMENT_SELECT)
            .order('appointment_date', { ascending: false })
            .limit(limit);

        if (status !== 'all') {
            query = query.eq('status', status);
        }
        if (patientId) {
            query = query.eq('patient_id', patientId);
        }
        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[CareFlow] GET enrollments query failed:', error);
            return NextResponse.json({ error: 'Nie udało się pobrać listy CareFlow' }, { status: 500, headers: NO_STORE });
        }

        // Compute completion stats
        const enrollments = (data || []).map((e: any) => {
            const tasks = e.care_tasks || [];
            const total = tasks.length;
            const completed = tasks.filter((t: any) => t.completed_at).length;
            const pending = tasks.filter((t: any) => !t.completed_at && !t.skipped_at && new Date(t.scheduled_at) <= new Date()).length;
            return {
                ...e,
                stats: { total, completed, pending, progress: total > 0 ? Math.round((completed / total) * 100) : 0 },
                hasReport: !!e.report_pdf_url,
                care_tasks: undefined,
                report_pdf_url: undefined,
            };
        });

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'view_careflow_list',
            resourceType: 'careflow',
            metadata: { status, patientId: patientId || null, doctorId: doctorId || null, limit, count: enrollments.length },
            request: req,
        });

        return NextResponse.json({ enrollments }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] GET enrollments error:', err);
        return NextResponse.json({ error: 'Nie udało się pobrać listy CareFlow' }, { status: 500, headers: NO_STORE });
    }
}
