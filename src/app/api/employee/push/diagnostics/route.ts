import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Dane operacyjne — nigdy z cache. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * GET /api/employee/push/diagnostics
 *
 * Przegląd zdrowia powiadomień push dla personelu (i dla ekranu w apce).
 *
 * 🔑 CZEGO TU CELOWO NIE MA: treści powiadomień ani nazwisk. Ekran odpowiada na pytanie
 * „czy kanał działa", a nie „co komu wysłano" — to drugie jest w Alertach i podlega
 * innym regułom dostępu. Dzięki temu ekran może zobaczyć każdy pracownik.
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

    const [pathsRes, tokensPatient, tokensStaff, receiptsRes] = await Promise.all([
        supabase
            .from('push_path_health')
            .select('path_key, label, max_silence_minutes, last_attempt_at, last_success_at, last_error, attempts_24h, failures_24h')
            .order('path_key'),
        supabase.from('patient_push_tokens').select('token', { count: 'exact', head: true }),
        supabase.from('staff_push_tokens').select('token', { count: 'exact', head: true }),
        // Receipty z ostatniej doby — to jedyne miejsce, gdzie widać RÓŻNICĘ między
        // „przyjęte przez Expo" a „dostarczone na urządzenie".
        supabase
            .from('push_receipts')
            .select('status, error_code')
            .gte('created_at', dayAgo)
            .not('checked_at', 'is', null)
            .limit(5000),
    ]);

    const receipts = (receiptsRes.data ?? []) as Array<{ status: string | null; error_code: string | null }>;
    const byError: Record<string, number> = {};
    let ok = 0;
    for (const r of receipts) {
        if (r.status === 'ok') ok++;
        else byError[r.error_code || 'unknown'] = (byError[r.error_code || 'unknown'] ?? 0) + 1;
    }

    const now = Date.now();
    const paths = ((pathsRes.data ?? []) as Array<Record<string, unknown>>).map(p => {
        const lastSuccess = p.last_success_at as string | null;
        const limit = p.max_silence_minutes as number | null;
        const silentMinutes = lastSuccess ? Math.floor((now - new Date(lastSuccess).getTime()) / 60_000) : null;
        // 'unknown' dla ścieżek zdarzeniowych bez limitu — świadomie NIE 'ok',
        // żeby nie sugerować, że coś zostało zweryfikowane.
        const status =
            limit == null ? 'unknown'
            : silentMinutes === null ? 'never'
            : silentMinutes > limit ? 'silent'
            : 'ok';
        return { ...p, silentMinutes, status };
    });

    return NextResponse.json(
        {
            paths,
            tokens: { app_patients: tokensPatient.count ?? 0, app_staff: tokensStaff.count ?? 0 },
            receipts24h: { checked: receipts.length, delivered: ok, errors: byError },
        },
        { headers: NO_STORE }
    );
}
