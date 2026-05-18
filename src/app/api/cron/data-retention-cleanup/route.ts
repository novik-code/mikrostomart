import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/cron/data-retention-cleanup
 *
 * Hotfix Sprint S8-5: consolidated retention crons dla 12 tabel rosnących
 * monotonicznie. RODO Art. 5 ust. 1 lit. e (limitation of storage) — dane
 * przechowywane nie dłużej niż konieczne.
 *
 * Schedule: daily 04:00 UTC (po audit-log-cleanup 03:30 UTC, żeby nie kolidować).
 *
 * Auth:
 *  - Vercel cron: Authorization: Bearer ${CRON_SECRET}
 *  - Manual trigger (admin): ?manual=true z admin session
 *
 * Query params:
 *  - dry_run=true  → tylko count rekordów do usunięcia, nic nie kasuje (SAFE).
 *                    Default na 2 tygodnie po deploy, potem Marcin remove z
 *                    vercel.json cron path żeby uruchomić real delete.
 *  - manual=true   → bypass CRON_SECRET, require admin (do testowania)
 *
 * Retention policies (decyzje pragmatyczne):
 *   patient_intake_tokens:    used > 30d  OR  (unused AND expires_at < now())
 *   consent_tokens:           used > 30d  OR  (unused AND expires_at < now())
 *   short_links:              created > 1y AND clicks = 0 (unused links)
 *   sms_reminders:            status IN sent/cancelled/failed AND created > 180d (6 mies)
 *   appointment_actions:      action IS NOT NULL AND created > 180d
 *   cancelled_appointments:   cancelled > 5y (medical legal retention)
 *   online_bookings:          schedule_status IN scheduled/rejected/failed AND created > 1y
 *   birthday_wishes:          year < current_year - 2
 *   email_ai_drafts:          status IN sent/rejected/skipped/learned AND created > 90d
 *   email_compose_drafts:     updated > 90d (drafts that never got sent → orphan)
 *   fcm_tokens:               last_active_at < now() - 90d (stale push subs)
 *   social_video_queue:       status IN done/failed AND created > 90d
 *
 * NOT touched (świadomie):
 *   - patients (RODO Art. 9 medical — soft-delete only przez delete-account)
 *   - patient_intake_submissions (RODO 20-letnia retention, Ustawa art. 29 ust. 1)
 *   - patient_consents (medical document, permanent)
 *   - employee_audit_log + login_attempts + ai_conversations → osobny cron (S8-3)
 *   - Storage buckets (intake-pdfs/consent-pdfs/social-media/task-images) — osobne
 *     iteracje wymagają Storage API (file-by-file listing)
 */
export async function GET(req: NextRequest) {
    const t0 = Date.now();
    if (isDemoMode) {
        await logCronHeartbeat('data-retention-cleanup', 'ok', 'demo mode skip', Date.now() - t0);
        return NextResponse.json({ skipped: 'demo mode' });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';
    const isManual = url.searchParams.get('manual') === 'true';

    // Auth
    if (isManual) {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
    } else {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Cutoffs (ISO strings)
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const d5y = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();
    const currentYear = now.getFullYear();

    type TableResult = { description: string; cutoff: string; deleted: number; error: string | null };
    const results: Record<string, TableResult> = {};

    // Helper: execute count-only (dry_run) lub delete with count.
    // `applyFilters` aplikuje filters typu `.eq()`, `.lt()`, `.in()`, `.not()` na
    // FilterBuilder zwracanym z `.select()` lub `.delete()` (oba zwracają ten sam
    // typ, więc działa polymorficznie).
    //
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type FilterBuilder = any;

    async function clean(
        key: string,
        description: string,
        cutoffLabel: string,
        table: string,
        applyFilters: (q: FilterBuilder) => FilterBuilder
    ): Promise<void> {
        try {
            if (dryRun) {
                const baseQuery = supabase.from(table).select('*', { count: 'exact', head: true });
                const { count, error } = await applyFilters(baseQuery);
                results[key] = {
                    description,
                    cutoff: cutoffLabel,
                    deleted: count ?? 0,
                    error: error?.message ?? null,
                };
            } else {
                const baseQuery = supabase.from(table).delete({ count: 'exact' });
                const { count, error } = await applyFilters(baseQuery);
                results[key] = {
                    description,
                    cutoff: cutoffLabel,
                    deleted: count ?? 0,
                    error: error?.message ?? null,
                };
                if (error) {
                    console.error(`[RetentionCleanup] ${key} error:`, error);
                } else {
                    console.log(`[RetentionCleanup] ${key}: deleted ${count ?? 0} rows`);
                }
            }
        } catch (err) {
            results[key] = {
                description,
                cutoff: cutoffLabel,
                deleted: 0,
                error: (err as Error).message,
            };
            console.error(`[RetentionCleanup] ${key} exception:`, err);
        }
    }

    // 1. patient_intake_tokens: used > 30d, lub unused expired
    await clean('patient_intake_tokens_used', 'Used QR tokens > 30 days old', d30, 'patient_intake_tokens',
        q => q.not('used_at', 'is', null).lt('created_at', d30)
    );
    await clean('patient_intake_tokens_expired', 'Unused QR tokens past expiry', nowISO, 'patient_intake_tokens',
        q => q.is('used_at', null).lt('expires_at', nowISO)
    );

    // 2. consent_tokens: same retention
    await clean('consent_tokens_used', 'Used consent tokens > 30 days old', d30, 'consent_tokens',
        q => q.not('used_at', 'is', null).lt('created_at', d30)
    );
    await clean('consent_tokens_expired', 'Unused consent tokens past expiry', nowISO, 'consent_tokens',
        q => q.is('used_at', null).lt('expires_at', nowISO)
    );

    // 3. short_links: > 1y AND clicks = 0
    await clean('short_links_unused', 'Unused short links > 1 year', d365, 'short_links',
        q => q.eq('clicks', 0).lt('created_at', d365)
    );

    // 4. sms_reminders: status sent/cancelled/failed + > 180d
    await clean('sms_reminders_old', 'SMS reminders sent/failed > 180 days', d180, 'sms_reminders',
        q => q.in('status', ['sent', 'cancelled', 'failed']).lt('created_at', d180)
    );

    // 5. appointment_actions: action filled + > 180d
    await clean('appointment_actions_old', 'Appointment actions resolved > 180 days', d180, 'appointment_actions',
        q => q.not('action', 'is', null).lt('created_at', d180)
    );

    // 6. cancelled_appointments: > 5 lat (legal)
    await clean('cancelled_appointments_legal', 'Cancelled appointments > 5 years (legal retention)', d5y, 'cancelled_appointments',
        q => q.lt('cancelled_at', d5y)
    );

    // 7. online_bookings: scheduled/rejected/failed + > 1y
    await clean('online_bookings_old', 'Online bookings resolved > 1 year', d365, 'online_bookings',
        q => q.in('schedule_status', ['scheduled', 'rejected', 'failed']).lt('created_at', d365)
    );

    // 8. birthday_wishes: year < current_year - 2
    await clean('birthday_wishes_old', `Birthday wishes from year < ${currentYear - 2}`, `${currentYear - 2}`, 'birthday_wishes',
        q => q.lt('year', currentYear - 2)
    );

    // 9. email_ai_drafts: terminal statuses + > 90d
    await clean('email_ai_drafts_old', 'Email AI drafts in terminal status > 90 days', d90, 'email_ai_drafts',
        q => q.in('status', ['sent', 'rejected', 'skipped', 'learned']).lt('created_at', d90)
    );

    // 10. email_compose_drafts: updated > 90d (orphan, never sent)
    await clean('email_compose_drafts_orphan', 'Compose drafts unchanged > 90 days', d90, 'email_compose_drafts',
        q => q.lt('updated_at', d90)
    );

    // 11. fcm_tokens: last_active_at > 90d
    await clean('fcm_tokens_stale', 'FCM tokens inactive > 90 days', d90, 'fcm_tokens',
        q => q.lt('last_active_at', d90)
    );

    // 12. social_video_queue: done/failed + > 90d
    await clean('social_video_queue_old', 'Processed videos in queue > 90 days', d90, 'social_video_queue',
        q => q.in('status', ['done', 'failed']).lt('created_at', d90)
    );

    // Summary
    const totalDeleted = Object.values(results).reduce((sum, r) => sum + (r.deleted || 0), 0);
    const errors = Object.entries(results).filter(([, r]) => r.error).map(([k, r]) => `${k}: ${r.error}`);
    const summary = `${dryRun ? '[DRY RUN] ' : ''}Total ${totalDeleted} rows across ${Object.keys(results).length} tables. Errors: ${errors.length}`;

    await logCronHeartbeat(
        'data-retention-cleanup',
        errors.length > 0 ? 'error' : 'ok',
        summary,
        Date.now() - t0
    );

    return NextResponse.json({
        ok: errors.length === 0,
        dry_run: dryRun,
        summary,
        total_deleted: totalDeleted,
        errors: errors.length > 0 ? errors : undefined,
        results,
    });
}
