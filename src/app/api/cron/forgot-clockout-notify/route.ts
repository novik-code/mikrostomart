// GET /api/cron/forgot-clockout-notify
// Vercel Cron — co 15 min, godziny 14-22 PL (12-20 UTC).
// Dla każdego pracownika z grafikiem: jeśli planned_end minęła ≥30 min temu,
// jest aktywny (ostatni wpis = clock_in z dziś), brak clock_out i nie wysłano
// powiadomienia jeszcze tego dnia → wyślij push.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { pushToUser } from '@/lib/pushService';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const FORGOT_THRESHOLD_MIN = 30;

function todayInWarsaw(): string {
    const now = new Date();
    const warsaw = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    return warsaw.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const isManual = new URL(req.url).searchParams.get('manual') === 'true';
    if (
        authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
        process.env.NODE_ENV === 'production' &&
        !isManual
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDemoMode) {
        return NextResponse.json({ ok: true, demo: true });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const t0 = Date.now();
    let notified = 0;
    const today = todayInWarsaw();

    try {
        // Schedules na dziś z planned_end (nie nieobecność)
        const { data: schedules } = await supabase
            .from('work_schedules')
            .select('id, employee_id, planned_end, employees!inner(id, user_id, name, is_active)')
            .eq('date', today)
            .not('planned_end', 'is', null)
            .eq('employees.is_active', true);

        if (!schedules || schedules.length === 0) {
            await logCronHeartbeat('forgot-clockout-notify', 'ok', 'no schedules today', Date.now() - t0);
            return NextResponse.json({ ok: true, notified: 0, reason: 'no_schedules' });
        }

        // Czas teraz w PL
        const now = new Date();
        const warsawNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
        const warsawHHMM = `${String(warsawNow.getHours()).padStart(2, '0')}:${String(warsawNow.getMinutes()).padStart(2, '0')}`;

        for (const s of schedules as any[]) {
            const employee = s.employees;
            const plannedEnd = (s.planned_end as string).slice(0, 5);

            // Dodaj 30 min do planned_end
            const [h, m] = plannedEnd.split(':').map((x) => Number.parseInt(x, 10));
            const totalMinAfter = h * 60 + m + FORGOT_THRESHOLD_MIN;
            const [nowH, nowM] = warsawHHMM.split(':').map((x) => Number.parseInt(x, 10));
            const totalMinNow = nowH * 60 + nowM;

            // Jeszcze nie czas na powiadomienie
            if (totalMinNow < totalMinAfter) continue;

            // Sprawdź ostatni wpis pracownika dziś
            const todayStartUTC = new Date(`${today}T00:00:00+02:00`).toISOString();
            const todayEndUTC = new Date(new Date(today + 'T00:00:00+02:00').getTime() + 24 * 3600000).toISOString();
            const { data: entries } = await supabase
                .from('time_entries')
                .select('type, scanned_at')
                .eq('employee_id', employee.id)
                .eq('cancelled', false)
                .gte('scanned_at', todayStartUTC)
                .lt('scanned_at', todayEndUTC)
                .order('scanned_at', { ascending: false })
                .limit(1);

            const lastEntry = entries?.[0];
            // Brak wpisów = nie wbił się — pomiń (osobne powiadomienie nie ma sensu, pracownik nie pojawił się)
            // Ostatni clock_out = wybił się normalnie — pomiń
            if (!lastEntry || lastEntry.type === 'clock_out') continue;

            // Sprawdź czy nie wysyłaliśmy już dziś
            const { data: alreadyLogged } = await supabase
                .from('push_notifications_log')
                .select('id')
                .eq('user_id', employee.user_id)
                .eq('tag', 'forgot-clockout')
                .gte('sent_at', todayStartUTC)
                .limit(1);

            if (alreadyLogged && alreadyLogged.length > 0) continue;

            // Wyślij push
            await pushToUser(employee.user_id, 'employee', {
                title: '⏰ Zapomniałeś wybić wyjścia?',
                body: `Twoja zmiana skończyła się ${plannedEnd}. Otwórz aplikację i zarejestruj wyjście.`,
                url: '/pracownik?tab=czas-pracy',
                tag: 'forgot-clockout',
            });
            notified++;
        }

        await logCronHeartbeat('forgot-clockout-notify', 'ok', `notified=${notified}`, Date.now() - t0);
        return NextResponse.json({ ok: true, notified, total: schedules.length });
    } catch (err) {
        console.error('[cron/forgot-clockout-notify] error:', err);
        await logCronHeartbeat('forgot-clockout-notify', 'error', (err as Error).message?.slice(0, 200), Date.now() - t0);
        return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
    }
}
