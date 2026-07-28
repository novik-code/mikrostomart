import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { findSilentPushPaths } from '@/lib/pushHealth';
import { sendTelegramNotification } from '@/lib/telegram';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const maxDuration = 30;

/**
 * GET /api/cron/push-health-alert
 *
 * Raz dziennie sprawdza, czy któraś CYKLICZNA ścieżka push milczy dłużej, niż powinna,
 * i zgłasza to na Telegram.
 *
 * 🔑 DLACZEGO OSOBNY CRON, A NIE DOKLEJKA DO push-receipts. Receipty chodzą co 20 minut;
 * alert o ciszy wysyłany z tą częstotliwością nauczyłby zespół go ignorować. Cisza jest
 * z natury zjawiskiem dobowym — jedna wiadomość dziennie to właściwa rozdzielczość.
 *
 * Sprawdzane są WYŁĄCZNIE ścieżki z ustawionym `max_silence_minutes`. Dla zdarzeniowych
 * (rezerwacja, odwołanie, czat) cisza znaczy po prostu „nikt nic nie zrobił".
 */
export async function GET(req: Request) {
    if (isDemoMode) return NextResponse.json({ skipped: 'demo mode' });

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const started = Date.now();

    try {
        const silent = await findSilentPushPaths();

        if (silent.length === 0) {
            await logCronHeartbeat('push-health-alert', 'ok', 'Wszystkie ścieżki push odpowiadają', Date.now() - started);
            return NextResponse.json({ success: true, silent: [] });
        }

        const lines = silent.map(p => {
            const since = p.silentMinutes === null
                ? 'NIGDY nie zadziałała'
                : `cisza od ${Math.floor(p.silentMinutes / 60)} h`;
            return `• <b>${p.label}</b> — ${since}${p.lastError ? `\n   ostatni błąd: ${p.lastError}` : ''}`;
        });

        await sendTelegramNotification(
            `🔕 <b>Powiadomienia push — możliwy problem</b>\n\n${lines.join('\n')}\n\n` +
            `Sprawdź: /pracownik → Diagnostyka powiadomień.`
        );

        // 'warn', nie 'error': cron zadziałał poprawnie — to ŚCIEŻKA jest podejrzana.
        await logCronHeartbeat(
            'push-health-alert',
            'warn',
            `Milczące ścieżki: ${silent.map(p => p.path_key).join(', ')}`,
            Date.now() - started
        );

        return NextResponse.json({ success: true, silent });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PushHealthAlert] Fatal:', msg);
        await logCronHeartbeat('push-health-alert', 'error', msg, Date.now() - started);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
