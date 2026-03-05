/**
 * Cron heartbeat helper.
 * Call logCronHeartbeat() at the end of every cron job
 * to record execution time and status in Supabase.
 *
 * Migration required: 069_cron_heartbeats.sql
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Log a cron heartbeat to the database.
 * Call this at the END of your cron handler, in a try/finally.
 *
 * @param cronName - Must match the cron_name in cron_heartbeats table
 * @param status - 'ok' or 'error'
 * @param message - Optional summary or error message
 * @param durationMs - Execution time in milliseconds
 */
export async function logCronHeartbeat(
    cronName: string,
    status: 'ok' | 'error' = 'ok',
    message?: string,
    durationMs?: number
): Promise<void> {
    try {
        await (supabase
            .from('cron_heartbeats') as any)
            .upsert({
                cron_name: cronName,
                last_run_at: new Date().toISOString(),
                status,
                message: message?.slice(0, 500) || null,
                duration_ms: durationMs || null,
            }, { onConflict: 'cron_name' });
    } catch (err) {
        // Never let heartbeat logging break the cron itself
        console.error(`[CronHeartbeat] Failed to log ${cronName}:`, err);
    }
}
