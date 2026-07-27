/**
 * Rejestr zdrowia ścieżek push.
 *
 * 🔑 PO CO. `logPush` zapisuje historię NIEZALEŻNIE od tego, czy cokolwiek wyszło —
 * dlatego wiadomość pacjenta, która nigdy nie opuściła serwera, wyglądała w Alertach
 * na wysłaną. Ten rejestr odpowiada na inne pytanie: „kiedy ta droga OSTATNIO REALNIE
 * zadziałała". Bez tego cisza na ścieżce jest nieodróżnialna od braku ruchu.
 *
 * Zapisy są best-effort — awaria rejestru nie może wywrócić wysyłki powiadomienia.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type PushPathKey =
    | 'appointment_reminder'
    | 'careflow_task'
    | 'staff_chat'
    | 'staff_task'
    | 'patient_chat'
    | 'new_reservation'
    | 'appointment_cancelled';

export interface PushPathHealthRow {
    path_key: string;
    label: string;
    max_silence_minutes: number | null;
    last_attempt_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    attempts_24h: number;
    failures_24h: number;
}

/**
 * Odnotuj próbę wysyłki na danej ścieżce.
 *
 * `sent > 0` = ścieżka realnie zadziałała (ktoś dostał). `sent === 0` przy niezerowej
 * liczbie odbiorców to porażka — i to jest dokładnie ten stan, którego wcześniej nikt
 * nie widział, bo historia i tak pokazywała wpis.
 */
export async function recordPushPath(
    pathKey: PushPathKey,
    result: { sent: number; failed: number; error?: string }
): Promise<void> {
    try {
        const now = new Date().toISOString();
        const ok = result.sent > 0;

        const { data: cur } = await supabase
            .from('push_path_health')
            .select('attempts_24h, failures_24h, last_attempt_at')
            .eq('path_key', pathKey)
            .maybeSingle();

        // Liczniki dobowe zerujemy, gdy poprzednia próba jest starsza niż doba —
        // prościej i taniej niż osobny cron, a do przeglądu w panelu w zupełności starcza.
        const prev = cur as { attempts_24h?: number; failures_24h?: number; last_attempt_at?: string } | null;
        const stale =
            !prev?.last_attempt_at ||
            Date.now() - new Date(prev.last_attempt_at).getTime() > 24 * 3600_000;

        await supabase
            .from('push_path_health')
            .update({
                last_attempt_at: now,
                ...(ok ? { last_success_at: now } : {}),
                last_error: ok ? null : (result.error ?? `sent=0 failed=${result.failed}`),
                attempts_24h: (stale ? 0 : prev?.attempts_24h ?? 0) + 1,
                failures_24h: (stale ? 0 : prev?.failures_24h ?? 0) + (ok ? 0 : 1),
                updated_at: now,
            })
            .eq('path_key', pathKey);
    } catch (err) {
        console.error('[PushHealth] Nie zapisano stanu ścieżki:', err instanceof Error ? err.message : err);
    }
}

/**
 * Ścieżki, które milczą dłużej, niż powinny.
 *
 * Bierzemy pod uwagę WYŁĄCZNIE wiersze z ustawionym `max_silence_minutes` — dla ścieżek
 * zdarzeniowych (rezerwacja, odwołanie, czat) cisza jest normalna i alarmowanie z jej
 * powodu nauczyłoby zespół ignorować te alerty.
 */
export async function findSilentPushPaths(): Promise<
    Array<{ path_key: string; label: string; silentMinutes: number | null; lastError: string | null }>
> {
    const { data, error } = await supabase
        .from('push_path_health')
        .select('path_key, label, max_silence_minutes, last_success_at, last_error')
        .not('max_silence_minutes', 'is', null);

    if (error) {
        console.error('[PushHealth] Odczyt rejestru:', error.message);
        return [];
    }

    const now = Date.now();
    const out: Array<{ path_key: string; label: string; silentMinutes: number | null; lastError: string | null }> = [];

    for (const row of (data ?? []) as unknown as PushPathHealthRow[]) {
        const limit = row.max_silence_minutes;
        if (limit == null) continue;
        // Brak jakiegokolwiek sukcesu też jest sygnałem — ścieżka nigdy nie zadziałała.
        const silent = row.last_success_at
            ? Math.floor((now - new Date(row.last_success_at).getTime()) / 60_000)
            : null;
        if (silent === null || silent > limit) {
            out.push({ path_key: row.path_key, label: row.label, silentMinutes: silent, lastError: row.last_error });
        }
    }
    return out;
}
