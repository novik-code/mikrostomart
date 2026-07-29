import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Dane operacyjne — nigdy z cache. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Crony, które realnie wysyłają albo pilnują pusha — tylko one mają tu sens. */
const PUSH_CRONS = [
    'push-receipts',
    'push-health-alert',
    'sms-auto-send',
    'appointment-reminders',
    'careflow-push',
    'push-escalation',
    'push-cleanup',
];

/**
 * GET /api/employee/push/diagnostics
 *
 * Przegląd zdrowia powiadomień push dla personelu (i dla ekranu w apce).
 *
 * 🔑 CZEGO TU CELOWO NIE MA: treści powiadomień ani nazwisk. Ekran odpowiada na pytanie
 * „czy kanał działa", a nie „co komu wysłano" — to drugie jest w Alertach i podlega
 * innym regułom dostępu. Dzięki temu ekran może zobaczyć każdy pracownik.
 *
 * 🔑 DLACZEGO DWA RÓŻNE LICZNIKI. `push_notifications_log` zapisuje PRÓBĘ (`logPush` leci
 * niezależnie od dostarczenia), a `push_receipts` — odpowiedź Expo o losie konkretnego
 * ticketu. Różnica między nimi jest właśnie tym, czego nie dało się wcześniej zobaczyć:
 * powiadomienie, które „wygląda na wysłane", a nigdy nie opuściło serwera.
 */
export async function GET() {
    // Ten sam wzorzec bramki co `push/history` — Bearer-aware przez verifyAdmin().
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });

    const [isEmployee, isAdmin] = await Promise.all([
        hasRole(user.id, 'employee'),
        hasRole(user.id, 'admin'),
    ]);
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403, headers: NO_STORE });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

    const [pathsRes, tokensPatient, tokensStaff, receiptsRes, logRes, cronsRes] = await Promise.all([
        supabase
            .from('push_path_health')
            .select('path_key, label, max_silence_minutes, last_attempt_at, last_success_at, last_error, attempts_24h, failures_24h')
            .order('path_key'),
        supabase.from('patient_push_tokens').select('platform, updated_at'),
        supabase.from('staff_push_tokens').select('platform, updated_at'),
        // Receipty z tygodnia — to jedyne miejsce, gdzie widać RÓŻNICĘ między
        // „przyjęte przez Expo" a „dostarczone na urządzenie".
        supabase
            .from('push_receipts')
            .select('status, error_code, path_key, token_table, created_at, checked_at, token')
            .gte('created_at', weekAgo)
            .order('created_at', { ascending: false })
            .limit(5000),
        // Sama LICZBA prób i rozbicie po tagu — bez tytułów i treści.
        supabase
            .from('push_notifications_log')
            .select('user_type, tag, sent_at')
            .gte('sent_at', dayAgo)
            .limit(5000),
        supabase
            .from('cron_heartbeats')
            .select('cron_name, last_run_at, status, message, duration_ms')
            .in('cron_name', PUSH_CRONS),
    ]);

    const now = Date.now();

    // ── Receipty ────────────────────────────────────────────────────────────
    type Receipt = {
        status: string | null;
        error_code: string | null;
        path_key: string | null;
        token_table: string | null;
        created_at: string;
        checked_at: string | null;
        token: string | null;
    };
    const allReceipts = (receiptsRes.data ?? []) as Receipt[];
    const checked = allReceipts.filter(r => r.checked_at);
    const pending = allReceipts.length - checked.length;
    const last24 = checked.filter(r => r.created_at >= dayAgo);

    const summarize = (rows: Receipt[]) => {
        const byError: Record<string, number> = {};
        let ok = 0;
        for (const r of rows) {
            if (r.status === 'ok') ok++;
            else byError[r.error_code || 'unknown'] = (byError[r.error_code || 'unknown'] ?? 0) + 1;
        }
        return { checked: rows.length, delivered: ok, failed: rows.length - ok, errors: byError };
    };

    // Rozbicie per ścieżka — pokazuje, KTÓRY rodzaj powiadomienia się nie dostarcza,
    // zamiast jednej zbiorczej liczby błędów dla całego systemu.
    const perPath: Record<string, { delivered: number; failed: number; errors: Record<string, number> }> = {};
    for (const r of checked) {
        const key = r.path_key || 'nieprzypisane';
        perPath[key] = perPath[key] ?? { delivered: 0, failed: 0, errors: {} };
        if (r.status === 'ok') perPath[key].delivered++;
        else {
            perPath[key].failed++;
            const code = r.error_code || 'unknown';
            perPath[key].errors[code] = (perPath[key].errors[code] ?? 0) + 1;
        }
    }

    // Ostatnie niepowodzenia — token PRZYCIĘTY do ogona: wystarcza, żeby odróżnić
    // urządzenia między sobą, a nie jest materiałem do wysłania czegokolwiek.
    const recentFailures = checked
        .filter(r => r.status !== 'ok')
        .slice(0, 40)
        .map(r => ({
            at: r.checked_at,
            path: r.path_key,
            audience: r.token_table === 'staff_push_tokens' ? 'personel' : 'pacjent',
            error: r.error_code || 'unknown',
            tokenTail: r.token ? `…${r.token.slice(-8)}` : null,
        }));

    // ── Ścieżki ─────────────────────────────────────────────────────────────
    const paths = ((pathsRes.data ?? []) as Array<Record<string, unknown>>).map(p => {
        const lastSuccess = p.last_success_at as string | null;
        const lastAttempt = p.last_attempt_at as string | null;
        const limit = p.max_silence_minutes as number | null;
        const attempts = (p.attempts_24h as number | null) ?? 0;
        const silentMinutes = lastSuccess ? Math.floor((now - new Date(lastSuccess).getTime()) / 60_000) : null;

        /**
         * 🔑 `waiting` ODDZIELONE od `never`. Ścieżka, która nigdy nie miała ani jednej
         * PRÓBY, nie jest zepsuta — po prostu nie trafił się jeszcze odbiorca z apką.
         * Wrzucanie obu przypadków do „NIGDY nie zadziałała" sprawiało, że
         * `appointment_reminder` raportował awarię codziennie od dnia wgrania migracji 186.
         */
        const status =
            limit == null ? 'unknown'
            : lastSuccess == null && lastAttempt == null ? 'waiting'
            : lastSuccess == null ? 'never'
            : silentMinutes !== null && silentMinutes > limit ? 'silent'
            : 'ok';

        return { ...p, silentMinutes, status, attempts_24h: attempts };
    });

    // ── Tokeny ──────────────────────────────────────────────────────────────
    const tokenStats = (rows: Array<{ platform: string | null; updated_at: string | null }> | null) => {
        const list = rows ?? [];
        const byPlatform: Record<string, number> = {};
        let newest: string | null = null;
        for (const r of list) {
            const p = r.platform || 'nieznana';
            byPlatform[p] = (byPlatform[p] ?? 0) + 1;
            if (r.updated_at && (!newest || r.updated_at > newest)) newest = r.updated_at;
        }
        return { total: list.length, byPlatform, newest };
    };

    // ── Próby wysyłki (log) ─────────────────────────────────────────────────
    const logRows = (logRes.data ?? []) as Array<{ user_type: string | null; tag: string | null }>;
    const byTag: Record<string, number> = {};
    const byAudience: Record<string, number> = {};
    for (const r of logRows) {
        const tag = r.tag || 'bez tagu';
        byTag[tag] = (byTag[tag] ?? 0) + 1;
        const aud = r.user_type || 'nieznany';
        byAudience[aud] = (byAudience[aud] ?? 0) + 1;
    }

    return NextResponse.json(
        {
            generatedAt: new Date().toISOString(),
            paths,
            tokens: {
                patients: tokenStats(tokensPatient.data as never),
                staff: tokenStats(tokensStaff.data as never),
            },
            receipts: {
                last24h: summarize(last24),
                last7d: summarize(checked),
                pending,          // tickety jeszcze nieodpytane (cron chodzi co 20 min)
                perPath,
                recentFailures,
            },
            attempts24h: { total: logRows.length, byTag, byAudience },
            crons: (cronsRes.data ?? []) as Array<Record<string, unknown>>,
        },
        { headers: NO_STORE }
    );
}
