import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * GET /api/cron/daily-report
 * Vercel Cron — runs daily at 6:30 AM Warsaw time
 * 
 * Sends a comprehensive morning digest to Telegram with:
 * 1. Today's appointments from Prodentis
 * 2. Pending online bookings
 * 3. Overdue/upcoming tasks
 * 4. Today's birthdays
 */
export async function GET(req: NextRequest) {
    const startTime = Date.now();

    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const warsaw = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
        const todayStr = warsaw.toISOString().slice(0, 10); // YYYY-MM-DD
        const todayMonth = warsaw.getMonth() + 1;
        const todayDay = warsaw.getDate();
        const dayName = warsaw.toLocaleDateString('pl-PL', { weekday: 'long' });
        const dateDisplay = warsaw.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

        let msg = `📋 <b>Raport poranny — ${dayName}, ${dateDisplay}</b>\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        // ═══════════════════════════════════════════════════
        // 1. TODAY'S APPOINTMENTS FROM PRODENTIS
        // ═══════════════════════════════════════════════════
        let appointmentCount = 0;
        let doctorSummary: Record<string, number> = {};

        try {
            const res = await fetch(`${PRODENTIS_API}/api/appointments/by-date?date=${todayStr}`, {
                signal: AbortSignal.timeout(10000),
            });
            if (res.ok) {
                const appointments = await res.json();
                if (Array.isArray(appointments)) {
                    appointmentCount = appointments.length;
                    // Group by doctor
                    for (const apt of appointments) {
                        const doc = apt.doctorName || apt.doctor || 'Nieznany';
                        doctorSummary[doc] = (doctorSummary[doc] || 0) + 1;
                    }
                }
            }
        } catch (e) {
            console.warn('[DailyReport] Failed to fetch Prodentis appointments:', e);
        }

        msg += `🩺 <b>Wizyty dzisiaj: ${appointmentCount}</b>\n`;
        if (appointmentCount > 0) {
            const sorted = Object.entries(doctorSummary).sort((a, b) => b[1] - a[1]);
            for (const [doc, count] of sorted) {
                msg += `   • ${doc}: <b>${count}</b>\n`;
            }
        } else {
            msg += `   Brak wizyt w grafiku\n`;
        }
        msg += `\n`;

        // ═══════════════════════════════════════════════════
        // 2. PENDING ONLINE BOOKINGS
        // ═══════════════════════════════════════════════════
        const { data: pendingBookings } = await supabase
            .from('online_bookings')
            .select('id, patient_name, appointment_date, appointment_time, specialist_name')
            .eq('schedule_status', 'pending')
            .order('appointment_date', { ascending: true });

        const pendingCount = pendingBookings?.length || 0;
        msg += `📅 <b>Oczekujące rezerwacje online: ${pendingCount}</b>\n`;
        if (pendingBookings && pendingBookings.length > 0) {
            for (const b of pendingBookings.slice(0, 5)) {
                const dateStr = new Date(b.appointment_date).toLocaleDateString('pl-PL', {
                    weekday: 'short', day: 'numeric', month: 'short'
                });
                const timeStr = b.appointment_time?.slice(0, 5) || '?';
                msg += `   ⏳ ${dateStr} ${timeStr} — ${b.patient_name} (${b.specialist_name})\n`;
            }
            if (pendingBookings.length > 5) {
                msg += `   ... i ${pendingBookings.length - 5} więcej\n`;
            }
        }
        msg += `\n`;

        // ═══════════════════════════════════════════════════
        // 3. OVERDUE & TODAY'S TASKS
        // ═══════════════════════════════════════════════════
        const { data: overdueTasks } = await supabase
            .from('tasks')
            .select('id, title, due_date, priority')
            .in('status', ['todo', 'in_progress'])
            .not('due_date', 'is', null)
            .lte('due_date', todayStr)
            .order('due_date', { ascending: true });

        const overdueCount = overdueTasks?.length || 0;
        const todayTasks = overdueTasks?.filter(t => t.due_date === todayStr) || [];
        const pastDueTasks = overdueTasks?.filter(t => t.due_date < todayStr) || [];

        msg += `📋 <b>Zadania:</b>\n`;
        if (pastDueTasks.length > 0) {
            msg += `   🔴 Zaległe: <b>${pastDueTasks.length}</b>\n`;
            for (const t of pastDueTasks.slice(0, 3)) {
                const priority = t.priority === 'high' ? '❗' : t.priority === 'medium' ? '⚡' : '';
                msg += `      ${priority} ${t.title}\n`;
            }
            if (pastDueTasks.length > 3) msg += `      ... i ${pastDueTasks.length - 3} więcej\n`;
        }
        if (todayTasks.length > 0) {
            msg += `   🟡 Na dziś: <b>${todayTasks.length}</b>\n`;
            for (const t of todayTasks.slice(0, 3)) {
                msg += `      • ${t.title}\n`;
            }
            if (todayTasks.length > 3) msg += `      ... i ${todayTasks.length - 3} więcej\n`;
        }
        if (overdueCount === 0) {
            msg += `   ✅ Brak zaległych zadań\n`;
        }
        msg += `\n`;

        // ═══════════════════════════════════════════════════
        // 4. TODAY'S BIRTHDAYS
        // ═══════════════════════════════════════════════════
        const { data: birthdayPatients } = await supabase
            .from('patients')
            .select('prodentis_id, birth_date')
            .not('birth_date', 'is', null);

        const todayBirthdays = (birthdayPatients || []).filter(p => {
            if (!p.birth_date) return false;
            const bd = new Date(p.birth_date);
            return (bd.getMonth() + 1) === todayMonth && bd.getDate() === todayDay;
        });

        if (todayBirthdays.length > 0) {
            msg += `🎂 <b>Urodziny dzisiaj: ${todayBirthdays.length}</b>\n`;
            // Fetch names from Prodentis for birthday patients
            for (const p of todayBirthdays.slice(0, 5)) {
                let name = `ID: ${p.prodentis_id}`;
                try {
                    const res = await fetch(`${PRODENTIS_API}/api/patient/${p.prodentis_id}/details`, {
                        signal: AbortSignal.timeout(3000),
                    });
                    if (res.ok) {
                        const det = await res.json();
                        name = `${det.firstName || ''} ${det.lastName || ''}`.trim() || name;
                    }
                } catch { /* use ID */ }
                const age = warsaw.getFullYear() - new Date(p.birth_date).getFullYear();
                msg += `   🎁 ${name} (${age} lat)\n`;
            }
            msg += `\n`;
        }

        // ═══════════════════════════════════════════════════
        // 5. UNREAD CHAT MESSAGES
        // ═══════════════════════════════════════════════════
        const { count: unreadChats } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_admin', false)
            .eq('read', false);

        if (unreadChats && unreadChats > 0) {
            msg += `💬 <b>Nieprzeczytane wiadomości: ${unreadChats}</b>\n\n`;
        }

        // ═══════════════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════════════
        msg += `🔗 <a href="https://mikrostomart.pl/admin">Panel admina</a> | <a href="https://mikrostomart.pl/pracownik">Panel pracownika</a>`;

        // Send via Telegram
        const sent = await sendTelegramNotification(msg, 'default');

        const duration = Date.now() - startTime;
        await logCronHeartbeat(
            'daily-report',
            'ok',
            `appointments=${appointmentCount}, pending=${pendingCount}, overdue=${overdueCount}, birthdays=${todayBirthdays.length}`,
            duration
        );

        console.log(`[DailyReport] Sent in ${duration}ms: appointments=${appointmentCount}, pending=${pendingCount}`);

        return NextResponse.json({
            success: true,
            sent,
            stats: {
                appointments: appointmentCount,
                pendingBookings: pendingCount,
                overdueTasks: overdueCount,
                birthdays: todayBirthdays.length,
                unreadChats: unreadChats || 0,
            },
        });

    } catch (err: any) {
        console.error('[DailyReport] Error:', err);
        const duration = Date.now() - startTime;
        await logCronHeartbeat('daily-report', 'error', err.message, duration);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
