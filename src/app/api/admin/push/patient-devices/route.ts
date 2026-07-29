import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * GET /api/admin/push/patient-devices
 *
 * Lista pacjentów z zainstalowaną aplikacją wraz ze stanem powiadomień.
 *
 * 🔒 WYŁĄCZNIE ADMIN — i to jest powód, dla którego to osobna trasa, a nie pole
 * w `/api/employee/push/diagnostics`. Tamten ekran celowo nie zawiera ani jednej
 * danej osobowej, dzięki czemu może go otworzyć każdy pracownik. Tutaj są telefon
 * i e-mail konkretnego pacjenta, więc bramka jest węższa, a dostęp trafia do audytu.
 *
 * 🔑 IMION I NAZWISK TU NIE MA. Zgodnie z zasadą D3 tożsamość pacjenta nie jest
 * przechowywana poza Prodentisem — nazwiska dociąga interfejs osobnym wywołaniem
 * `/api/employee/patient-label`, które ma własny audyt i pamięć podręczną.
 */
export async function GET(request: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });

    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) {
        return NextResponse.json({ error: 'Wymagane uprawnienia administratora' }, { status: 403, headers: NO_STORE });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tokenRows, error: tokenErr } = await supabase
        .from('patient_push_tokens')
        .select('patient_id, token, platform, created_at, updated_at')
        .order('updated_at', { ascending: false });

    if (tokenErr) {
        return NextResponse.json({ error: tokenErr.message }, { status: 500, headers: NO_STORE });
    }

    const tokens = (tokenRows ?? []) as Array<{
        patient_id: string;
        token: string;
        platform: string | null;
        created_at: string;
        updated_at: string;
    }>;

    if (tokens.length === 0) {
        return NextResponse.json({ patients: [], generatedAt: new Date().toISOString() }, { headers: NO_STORE });
    }

    // ⚠️ Kolumna nazywa się `patient_id`, ale trzyma PRODENTIS ID, nie UUID konta.
    // Pomyłka w tę stronę już raz kosztowała: zapytanie o cudzy klucz trafia w innego pacjenta.
    const prodentisIds = [...new Set(tokens.map(t => String(t.patient_id)))];

    const [accountsRes, receiptsRes] = await Promise.all([
        supabase
            .from('patients')
            .select('prodentis_id, phone, email, account_status, last_login, notification_preferences')
            .in('prodentis_id', prodentisIds),
        // Ostatnie receipty dla tych tokenów — stąd wiadomo, czy token jeszcze żyje.
        supabase
            .from('push_receipts')
            .select('token, status, error_code, checked_at')
            .in('token', tokens.map(t => t.token))
            .not('checked_at', 'is', null)
            .order('checked_at', { ascending: false })
            .limit(2000),
    ]);

    const accounts = new Map(
        ((accountsRes.data ?? []) as Array<Record<string, unknown>>).map(a => [String(a.prodentis_id), a])
    );

    // Tylko NAJŚWIEŻSZY receipt na token — starsze niosą nieaktualny stan urządzenia.
    const lastReceipt = new Map<string, { status: string | null; error_code: string | null; checked_at: string }>();
    for (const r of (receiptsRes.data ?? []) as Array<{
        token: string; status: string | null; error_code: string | null; checked_at: string;
    }>) {
        if (!lastReceipt.has(r.token)) lastReceipt.set(r.token, r);
    }

    const byPatient = new Map<string, ReturnType<typeof emptyEntry>>();
    function emptyEntry(prodentisId: string) {
        const acc = accounts.get(prodentisId);
        const prefs = (acc?.notification_preferences ?? null) as Record<string, boolean> | null;
        return {
            prodentisId,
            phone: (acc?.phone as string | null) ?? null,
            email: (acc?.email as string | null) ?? null,
            accountStatus: (acc?.account_status as string | null) ?? null,
            lastLogin: (acc?.last_login as string | null) ?? null,
            /**
             * Preferencje są ODRĘBNĄ sprawą od żywotności tokenu: pacjent może mieć
             * sprawną aplikację i świadomie wyłączyć przypomnienia. Mieszanie tego
             * w jedną flagę „ma push" dałoby administratorowi fałszywy obraz.
             */
            prefs,
            devices: [] as Array<{
                platform: string | null;
                tokenTail: string;
                registeredAt: string;
                lastSeenAt: string;
                state: 'ok' | 'dead' | 'unknown';
                lastError: string | null;
                lastCheckedAt: string | null;
            }>,
        };
    }

    for (const t of tokens) {
        const id = String(t.patient_id);
        if (!byPatient.has(id)) byPatient.set(id, emptyEntry(id));
        const rec = lastReceipt.get(t.token);
        // `DeviceNotRegistered` = aplikacja odinstalowana albo powiadomienia cofnięte
        // w systemie. Brak receiptu to NIE to samo — po prostu nic jeszcze nie wysłano.
        const state: 'ok' | 'dead' | 'unknown' =
            !rec ? 'unknown' : rec.status === 'ok' ? 'ok' : rec.error_code === 'DeviceNotRegistered' ? 'dead' : 'unknown';

        byPatient.get(id)!.devices.push({
            platform: t.platform,
            tokenTail: `…${t.token.slice(-8)}`,
            registeredAt: t.created_at,
            lastSeenAt: t.updated_at,
            state,
            lastError: rec?.error_code ?? null,
            lastCheckedAt: rec?.checked_at ?? null,
        });
    }

    const patients = [...byPatient.values()]
        .map(p => ({
            ...p,
            // „Push działa" = jest choć jedno urządzenie, którego ostatni receipt nie
            // zgłosił wyrejestrowania. Urządzenia bez ani jednego receiptu liczymy jako
            // niewiadomą, nie jako sprawne — inaczej ekran obiecywałby coś niesprawdzonego.
            pushLive: p.devices.some(d => d.state === 'ok'),
            pushDead: p.devices.length > 0 && p.devices.every(d => d.state === 'dead'),
        }))
        .sort((a, b) => (b.devices[0]?.lastSeenAt ?? '').localeCompare(a.devices[0]?.lastSeenAt ?? ''));

    await logAudit({
        userId: user.id,
        userEmail: user.email || '',
        action: 'view_patient_push_devices',
        resourceType: 'push_diagnostics',
        metadata: { patients: patients.length, devices: tokens.length },
        request,
    });

    return NextResponse.json({ patients, generatedAt: new Date().toISOString() }, { headers: NO_STORE });
}
