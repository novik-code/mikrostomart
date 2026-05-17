import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/cron/audit-log-cleanup
 *
 * Hotfix Sprint S8-3: retention crons for audit logs + rate limit history.
 *
 *  - employee_audit_log: keep 90 days (Art. 30 RODO — security audit retention)
 *  - login_attempts:     keep 24 hours (rate limit history, anything older is irrelevant)
 *
 * Called by Vercel Cron daily at 03:30 UTC (04:30/05:30 PL depending on DST).
 *
 * Auth:
 *  - Cron invocation: Authorization: Bearer ${CRON_SECRET}
 *  - Manual trigger (admin only): ?manual=true with admin session
 *
 * Query params:
 *  - dry_run=true → don't delete, just count what would be deleted (safe testing)
 *  - manual=true  → bypass CRON_SECRET, require admin
 */
export async function GET(req: NextRequest) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';
    const isManual = url.searchParams.get('manual') === 'true';

    // Auth: either Vercel cron with CRON_SECRET, or manual admin trigger
    if (isManual) {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
    } else {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const auditCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const loginCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const results: {
        dry_run: boolean;
        employee_audit_log: { cutoff: string; deleted: number | null; error: string | null };
        login_attempts: { cutoff: string; deleted: number | null; error: string | null };
    } = {
        dry_run: dryRun,
        employee_audit_log: { cutoff: auditCutoff, deleted: null, error: null },
        login_attempts: { cutoff: loginCutoff, deleted: null, error: null },
    };

    // ── employee_audit_log (90 days) ──
    if (dryRun) {
        const { count, error } = await supabase
            .from('employee_audit_log')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', auditCutoff);
        results.employee_audit_log.deleted = count ?? 0;
        results.employee_audit_log.error = error?.message ?? null;
    } else {
        const { count, error } = await supabase
            .from('employee_audit_log')
            .delete({ count: 'exact' })
            .lt('created_at', auditCutoff);
        results.employee_audit_log.deleted = count ?? 0;
        results.employee_audit_log.error = error?.message ?? null;
        if (error) {
            console.error('[AuditCleanup] employee_audit_log error:', error);
        } else {
            console.log(`[AuditCleanup] employee_audit_log: deleted ${count ?? 0} entries older than ${auditCutoff}`);
        }
    }

    // ── login_attempts (24 hours) ──
    if (dryRun) {
        const { count, error } = await supabase
            .from('login_attempts')
            .select('*', { count: 'exact', head: true })
            .lt('attempted_at', loginCutoff);
        results.login_attempts.deleted = count ?? 0;
        results.login_attempts.error = error?.message ?? null;
    } else {
        const { count, error } = await supabase
            .from('login_attempts')
            .delete({ count: 'exact' })
            .lt('attempted_at', loginCutoff);
        results.login_attempts.deleted = count ?? 0;
        results.login_attempts.error = error?.message ?? null;
        if (error) {
            console.error('[AuditCleanup] login_attempts error:', error);
        } else {
            console.log(`[AuditCleanup] login_attempts: deleted ${count ?? 0} entries older than ${loginCutoff}`);
        }
    }

    return NextResponse.json({ ok: true, ...results });
}
