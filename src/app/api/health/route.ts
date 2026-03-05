/**
 * GET /api/health
 *
 * System health check endpoint.
 * Returns status of: database, Prodentis API, cron jobs, and deployment info.
 *
 * Access: public (no auth required) — shows only operational status, no sensitive data.
 * For full details: add ?secret=CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Expected max interval between cron runs (in hours)
const CRON_MAX_AGE: Record<string, number> = {
    'daily-article': 25,           // daily
    'appointment-reminders': 25,   // daily
    'sms-auto-send': 25,           // daily
    'task-reminders': 25,          // daily
    'push-appointment-1h': 1,      // every 15 min
    'post-visit-sms': 25,          // daily
    'post-visit-auto-send': 25,    // daily
    'week-after-visit-sms': 25,    // daily
    'online-booking-digest': 25,   // daily
    'push-cleanup': 25,            // daily
    'birthday-wishes': 25,         // daily
};

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const url = new URL(req.url);
    const isDetailedView = url.searchParams.get('secret') === process.env.CRON_SECRET;

    const checks: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

    // ── 1. Database connectivity ────────────────────────────────────
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { count, error } = await supabase
            .from('site_settings')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        checks.database = { status: 'ok', latency_ms: Date.now() - startTime };
    } catch (err: any) {
        checks.database = { status: 'error', error: err.message };
        overallStatus = 'down';
    }

    // ── 2. Prodentis API reachability ───────────────────────────────
    const prodentisStart = Date.now();
    try {
        const prodentisUrl = process.env.PRODENTIS_API_URL;
        if (!prodentisUrl) {
            checks.prodentis = { status: 'not_configured' };
        } else {
            const resp = await fetch(`${prodentisUrl}/api/doctors`, {
                signal: AbortSignal.timeout(5000),
            });
            checks.prodentis = {
                status: resp.ok ? 'ok' : 'error',
                http_status: resp.status,
                latency_ms: Date.now() - prodentisStart,
            };
            if (!resp.ok && overallStatus === 'healthy') overallStatus = 'degraded';
        }
    } catch (err: any) {
        checks.prodentis = {
            status: 'unreachable',
            error: err.message,
            latency_ms: Date.now() - prodentisStart,
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
    }

    // ── 3. Cron heartbeats ──────────────────────────────────────────
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: heartbeats, error } = await supabase
            .from('cron_heartbeats')
            .select('cron_name, last_run_at, status, message, duration_ms')
            .order('cron_name') as {
                data: Array<{
                    cron_name: string;
                    last_run_at: string;
                    status: string;
                    message: string | null;
                    duration_ms: number | null;
                }> | null; error: any
            };

        if (error) throw error;

        const now = Date.now();
        const cronStatus: Record<string, any> = {};
        let staleCrons = 0;
        let errorCrons = 0;

        for (const hb of heartbeats || []) {
            const maxAgeHours = CRON_MAX_AGE[hb.cron_name] || 25;
            const ageMs = now - new Date(hb.last_run_at).getTime();
            const ageHours = Math.round(ageMs / 3600000 * 10) / 10;
            const isStale = ageMs > maxAgeHours * 3600000;
            const isError = hb.status === 'error';

            if (isStale) staleCrons++;
            if (isError) errorCrons++;

            cronStatus[hb.cron_name] = {
                status: isStale ? 'stale' : (isError ? 'error' : 'ok'),
                last_run: hb.last_run_at,
                age_hours: ageHours,
                ...(isDetailedView && {
                    message: hb.message,
                    duration_ms: hb.duration_ms,
                }),
            };
        }

        checks.crons = {
            status: staleCrons > 0 || errorCrons > 0 ? 'warning' : 'ok',
            total: (heartbeats || []).length,
            stale: staleCrons,
            errors: errorCrons,
            ...(isDetailedView && { details: cronStatus }),
        };

        if (staleCrons > 2 && overallStatus === 'healthy') overallStatus = 'degraded';
    } catch (err: any) {
        checks.crons = { status: 'unknown', error: err.message };
    }

    // ── 4. Environment info ─────────────────────────────────────────
    checks.environment = {
        node: process.version,
        region: process.env.VERCEL_REGION || 'unknown',
        ...(isDetailedView && {
            deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
            env: process.env.NODE_ENV,
        }),
    };

    // ── Response ────────────────────────────────────────────────────
    const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
        checks,
    };

    return NextResponse.json(response, {
        status: overallStatus === 'down' ? 503 : 200,
        headers: {
            'Cache-Control': 'no-store, no-cache',
        },
    });
}
