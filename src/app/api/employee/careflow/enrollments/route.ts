import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/careflow/enrollments
 * List all active enrollments.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const url = new URL(req.url);
        const status = url.searchParams.get('status') || 'active';
        const patientId = url.searchParams.get('patientId');

        let query = supabase
            .from('care_enrollments')
            .select('*, care_tasks(id, title, sort_order, scheduled_at, completed_at, skipped_at)')
            .order('appointment_date', { ascending: true });

        if (status !== 'all') {
            query = query.eq('status', status);
        }
        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        // Compute completion stats
        const enrollments = (data || []).map((e: any) => {
            const tasks = e.care_tasks || [];
            const total = tasks.length;
            const completed = tasks.filter((t: any) => t.completed_at).length;
            const pending = tasks.filter((t: any) => !t.completed_at && !t.skipped_at && new Date(t.scheduled_at) <= new Date()).length;
            return {
                ...e,
                stats: { total, completed, pending, progress: total > 0 ? Math.round((completed / total) * 100) : 0 },
                care_tasks: undefined,
            };
        });

        return NextResponse.json({ enrollments });
    } catch (err: any) {
        console.error('[CareFlow] GET enrollments error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
