import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { demoSanitize } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';

/**
 * Daily Telegram Digest of Online Bookings
 * Runs via Vercel CRON at 8:15 AM Warsaw time
 * Sends a summary of all unreported online bookings
 * Auth: CRON_SECRET required.
 */
export async function GET(request: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCronAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch bookings not yet reported via digest
        const { data: bookings, error } = await supabase
            .from('online_bookings')
            .select('*')
            .eq('reported_in_digest', false)
            .order('appointment_date', { ascending: true });

        if (error) {
            console.error('[Digest] Query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!bookings || bookings.length === 0) {
            console.log('[Digest] No new bookings to report');
            return NextResponse.json({ sent: false, count: 0 });
        }

        // Group by status
        const pending = bookings.filter(b => b.schedule_status === 'pending');
        const approved = bookings.filter(b => b.schedule_status === 'approved');
        const scheduled = bookings.filter(b => b.schedule_status === 'scheduled');
        const newPatients = bookings.filter(b => b.is_new_patient);

        // Build message
        let msg = `📊 <b>Podsumowanie wizyt online</b>\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        msg += `📋 Łącznie: <b>${bookings.length}</b> nowe\n`;
        if (pending.length > 0) msg += `⏳ Oczekujące: <b>${pending.length}</b>\n`;
        if (approved.length > 0) msg += `✅ Zatwierdzone: <b>${approved.length}</b>\n`;
        if (scheduled.length > 0) msg += `📅 W grafiku: <b>${scheduled.length}</b>\n`;
        if (newPatients.length > 0) msg += `🆕 Nowi pacjenci: <b>${newPatients.length}</b>\n`;
        msg += `\n`;

        // List each booking
        for (const b of bookings) {
            const dateStr = new Date(b.appointment_date).toLocaleDateString('pl-PL', {
                weekday: 'short', day: 'numeric', month: 'short'
            });
            const timeStr = b.appointment_time?.slice(0, 5) || '?';
            const statusEmoji: Record<string, string> = {
                pending: '⏳', approved: '✅', scheduled: '📅', rejected: '❌', failed: '⚠️'
            };

            msg += `${statusEmoji[b.schedule_status] || '•'} `;
            msg += `<b>${dateStr} ${timeStr}</b> — ${b.patient_name}`;
            msg += ` (${b.specialist_name})`;
            if (b.is_new_patient) msg += ' 🆕';
            msg += `\n`;
        }

        msg += `\n🔗 <a href="https://mikrostomart.pl/admin">Panel admina</a>`;

        // Send via Telegram
        const sent = await sendTelegramNotification(msg, 'default');

        // Mark as reported
        if (sent) {
            const ids = bookings.map(b => b.id);
            await supabase
                .from('online_bookings')
                .update({ reported_in_digest: true })
                .in('id', ids);
        }

        return NextResponse.json({ sent, count: bookings.length });
    } catch (err: any) {
        console.error('[Digest] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
