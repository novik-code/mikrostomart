import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/careflow/stats
 * Returns aggregated CareFlow analytics data for the dashboard.
 */
export async function GET() {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isAdmin = await hasRole(user.id, 'admin');
        const isEmployee = await hasRole(user.id, 'employee');
        if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // ── Fetch all enrollments ──
        const { data: enrollments, error: eErr } = await supabase
            .from('care_enrollments')
            .select('id, status, patient_name, template_name, doctor_name, enrolled_at, completed_at, appointment_date, report_exported_to_prodentis');

        if (eErr) throw new Error(eErr.message);
        const all = enrollments || [];

        // ── Fetch all tasks ──
        const { data: tasks, error: tErr } = await supabase
            .from('care_tasks')
            .select('id, enrollment_id, scheduled_at, completed_at, skipped_at, sms_sent');

        if (tErr) throw new Error(tErr.message);
        const allTasks = tasks || [];

        // ── Overview stats ──
        const total = all.length;
        const active = all.filter(e => e.status === 'active').length;
        const completed = all.filter(e => e.status === 'completed').length;
        const cancelled = all.filter(e => e.status === 'cancelled').length;
        const completionRate = (completed + cancelled) > 0
            ? Math.round((completed / (completed + cancelled)) * 100)
            : 0;

        // ── Avg completion time (hours) ──
        const completionTimes = all
            .filter(e => e.status === 'completed' && e.completed_at && e.enrolled_at)
            .map(e => (new Date(e.completed_at!).getTime() - new Date(e.enrolled_at).getTime()) / (1000 * 60 * 60));
        const avgCompletionHours = completionTimes.length > 0
            ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
            : 0;

        // ── Per-enrollment compliance ──
        const enrollmentTaskMap = new Map<string, { total: number; completed: number }>();
        for (const t of allTasks) {
            const entry = enrollmentTaskMap.get(t.enrollment_id) || { total: 0, completed: 0 };
            entry.total++;
            if (t.completed_at) entry.completed++;
            enrollmentTaskMap.set(t.enrollment_id, entry);
        }

        const complianceRates = Array.from(enrollmentTaskMap.values())
            .filter(e => e.total > 0)
            .map(e => Math.round((e.completed / e.total) * 100));
        const avgCompliance = complianceRates.length > 0
            ? Math.round(complianceRates.reduce((a, b) => a + b, 0) / complianceRates.length)
            : 0;

        // ── Avg response time (minutes) for completed tasks ──
        const responseTimes = allTasks
            .filter(t => t.completed_at && t.scheduled_at)
            .map(t => {
                const diff = new Date(t.completed_at!).getTime() - new Date(t.scheduled_at).getTime();
                return Math.max(0, diff / (1000 * 60)); // minutes, min 0
            });
        const avgResponseMinutes = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;

        // ── SMS fallback rate ──
        const totalTasks = allTasks.length;
        const smsSentTasks = allTasks.filter(t => t.sms_sent).length;
        const smsFallbackRate = totalTasks > 0
            ? Math.round((smsSentTasks / totalTasks) * 100)
            : 0;

        // ── Prodentis export count ──
        const exportedToProdentis = all.filter(e => e.report_exported_to_prodentis).length;

        // ── Template breakdown ──
        const templateMap = new Map<string, { count: number; completed: number; cancelled: number }>();
        for (const e of all) {
            const name = e.template_name || 'Brak szablonu';
            const entry = templateMap.get(name) || { count: 0, completed: 0, cancelled: 0 };
            entry.count++;
            if (e.status === 'completed') entry.completed++;
            if (e.status === 'cancelled') entry.cancelled++;
            templateMap.set(name, entry);
        }
        const byTemplate = Array.from(templateMap.entries())
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                completed: stats.completed,
                cancelled: stats.cancelled,
                completionRate: (stats.completed + stats.cancelled) > 0
                    ? Math.round((stats.completed / (stats.completed + stats.cancelled)) * 100)
                    : 0,
            }))
            .sort((a, b) => b.count - a.count);

        // ── Doctor breakdown ──
        const doctorMap = new Map<string, { count: number; completed: number }>();
        for (const e of all) {
            const name = e.doctor_name || 'Brak lekarza';
            const entry = doctorMap.get(name) || { count: 0, completed: 0 };
            entry.count++;
            if (e.status === 'completed') entry.completed++;
            doctorMap.set(name, entry);
        }

        // Compute avg compliance per doctor
        const doctorComplianceMap = new Map<string, number[]>();
        for (const e of all) {
            const name = e.doctor_name || 'Brak lekarza';
            const taskStats = enrollmentTaskMap.get(e.id);
            if (taskStats && taskStats.total > 0) {
                const arr = doctorComplianceMap.get(name) || [];
                arr.push(Math.round((taskStats.completed / taskStats.total) * 100));
                doctorComplianceMap.set(name, arr);
            }
        }

        const byDoctor = Array.from(doctorMap.entries())
            .map(([name, stats]) => {
                const compArr = doctorComplianceMap.get(name) || [];
                return {
                    name,
                    count: stats.count,
                    completed: stats.completed,
                    avgCompliance: compArr.length > 0
                        ? Math.round(compArr.reduce((a, b) => a + b, 0) / compArr.length)
                        : 0,
                };
            })
            .sort((a, b) => b.count - a.count);

        // ── Monthly timeline (last 6 months) ──
        const monthlyMap = new Map<string, number>();
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(key, 0);
        }
        for (const e of all) {
            const d = new Date(e.enrolled_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap.has(key)) {
                monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
            }
        }
        const monthlyTimeline = Array.from(monthlyMap.entries()).map(([month, count]) => ({
            month,
            count,
        }));

        return NextResponse.json({
            overview: {
                total,
                active,
                completed,
                cancelled,
                completionRate,
                avgCompletionHours,
                avgCompliance,
                avgResponseMinutes,
                smsFallbackRate,
                exportedToProdentis,
                totalTasks,
                smsSentTasks,
            },
            byTemplate,
            byDoctor,
            monthlyTimeline,
        });
    } catch (err: any) {
        console.error('[CareFlow Stats] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
