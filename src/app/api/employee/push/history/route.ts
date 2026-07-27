import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { isStaffChatPush } from '@/lib/pushService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Ile wierszy surowych czytamy przed sklejeniem duplikatów. */
const RAW_LIMIT = 2000;
/** Ile pozycji oddajemy apce. */
const FEED_LIMIT = 200;
/**
 * Okno sklejania duplikatów. Jedno zdarzenie zapisuje się jako N wierszy (po jednym na
 * odbiorcę), a `logPush` wstawia je w pętli po kolei — kilkanaście INSERT-ów potrafi się
 * rozjechać o sekundy. Poprzednie kubełkowanie `floor(ts/2s)` gubiło sklejenie, gdy dwa
 * wiersze wypadły po dwóch stronach granicy kubełka.
 */
const DEDUP_WINDOW_MS = 10_000;

const DAYS_BACK = 30;

/**
 * GET /api/employee/push/history
 *
 * WSPÓLNY feed zdarzeń gabinetu z ostatnich 30 dni („Alerty" w apce personelu oraz
 * kafelek na /pracownik): wnioski urlopowe, anulowania czasu pracy, nowe rezerwacje.
 * Wspólny jest CELOWO — lekarz ma widzieć, co się dzieje w gabinecie, a nie wyłącznie
 * to, co zaadresowano imiennie do niego. Zawężenie do `user_id` zalogowanego (poprzednia
 * runda) wywracało ten ekran: większość zdarzeń przestawała być widoczna dla kogokolwiek
 * poza jedną osobą.
 *
 * PRYWATNOŚĆ ROZWIĄZANA WĘŻSZYM CIĘCIEM: powiadomienia czatu wewnętrznego (tytuł DM
 * zawiera nazwisko nadawcy) w ogóle nie trafiają do `push_notifications_log` — odcina je
 * skipHistory() w src/lib/pushService.ts. Filtr niżej jest drugą linią obrony: usuwa
 * wiersze zapisane, zanim ta zasada weszła, oraz wszystko, co ktoś kiedyś zaloguje z
 * czatowym `tag`/`url` z pominięciem pushService.
 *
 * `user_type` ograniczamy do wpisów personelu — powiadomienia pacjenckie (imienne,
 * z nazwiskami i terminami) zostają w panelu pacjenta.
 */
export async function GET(_req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403, headers: NO_STORE });
    }

    const { data, error } = await supabase
        .from('push_notifications_log')
        .select('id, title, body, url, tag, sent_at, user_type')
        .in('user_type', ['employee', 'admin'])
        .gte('sent_at', new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(RAW_LIMIT);

    if (error) {
        console.error('[PushHistory] Query error:', error);
        return NextResponse.json({ error: 'Błąd pobierania historii' }, { status: 500, headers: NO_STORE });
    }

    // Wiersze są posortowane malejąco po `sent_at`, więc porównanie z ostatnio
    // zachowanym wpisem o tej samej treści wystarcza do sklejenia serii.
    const lastKeptAt = new Map<string, number>();
    const unique: NonNullable<typeof data> = [];

    for (const row of data || []) {
        if (isStaffChatPush({ tag: row.tag, url: row.url })) continue;

        const ts = Date.parse(row.sent_at);
        const key = `${row.title}|${row.body}`;
        const prev = lastKeptAt.get(key);
        if (prev !== undefined && Number.isFinite(ts) && Math.abs(prev - ts) <= DEDUP_WINDOW_MS) continue;

        lastKeptAt.set(key, ts);
        unique.push(row);
        if (unique.length >= FEED_LIMIT) break;
    }

    await logAudit({
        userId: user.id,
        userEmail: user.email || '',
        action: 'read_push_history',
        resourceType: 'push_notifications_log',
        resourceId: user.id,
        metadata: { count: unique.length, scope: 'clinic_feed' },
        request: _req,
    });

    return NextResponse.json({ notifications: unique }, { headers: NO_STORE });
}
