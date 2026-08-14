import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rateLimit';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * Ile czasu od terminu dawki pacjent ma na jej potwierdzenie (decyzja lekarza 2026-07-28).
 * Dotyczy WYŁĄCZNIE kroków lekowych — patrz komentarz przy sprawdzeniu.
 */
const CONFIRM_WINDOW_MS = 60 * 60 * 1000;

/** Dane medyczne — nic nie może osiąść w cache CDN ani przeglądarki. */
const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/** Wartość wchodzi do filtra PostgREST `or=` — przecinek/nawias rozwaliłby zapytanie. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Zapis pacjenta wiążemy DWOMA kluczami: `patient_id` to PRODENTIS ID (TEXT),
 * a `patient_db_id` to `patients.id` (UUID, bywa NULL). Filtr po jednym z nich
 * gubi część zapisów.
 */
function ownershipFilter(prodentisId?: string, userId?: string): string | null {
    const parts: string[] = [];
    if (prodentisId && SAFE_ID.test(prodentisId)) parts.push(`patient_id.eq.${prodentisId}`);
    if (userId && SAFE_ID.test(userId)) parts.push(`patient_db_id.eq.${userId}`);
    return parts.length > 0 ? parts.join(',') : null;
}

/**
 * POST /api/patients/careflow/tasks/[id]/complete
 *
 * Zalogowany pacjent potwierdza wykonanie kroku opieki (D5 — pomijanie zostaje
 * po stronie personelu). Body nieużywane.
 *
 * Twardsze niż wersja tokenowa: cudzy zasób dostaje 404 (nie potwierdzamy jego
 * istnienia), krok z przyszłości / jeszcze niewidoczny / nieoznaczony do
 * potwierdzenia → 409, a sam zapis completed_at jest atomowy (dwa urządzenia
 * klikające równocześnie nie zdublują wpisu w audycie).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        }

        // To przycisk, nie formularz — limit ma łapać pętlę/bota, nie realne klikanie.
        const rlKey = payload.userId || payload.prodentisId || 'unknown';
        const rl = await checkRateLimit(`careflow-complete:${rlKey}`, 60, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'rate_limited' },
                { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } }
            );
        }

        // Niepoprawny UUID wywaliłby zapytanie błędem Postgresa (22P02) → 500 zamiast 404.
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
        }

        const filter = ownershipFilter(payload.prodentisId, payload.userId);
        if (!filter) {
            console.error('[PatientCareFlow] Token bez użytecznego identyfikatora pacjenta');
            return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
        }

        const { data: task, error: taskErr } = await supabase
            .from('care_tasks')
            .select('id, enrollment_id, title, scheduled_at, visible_from, completed_at, skipped_at, requires_confirmation, medication_name')
            .eq('id', id)
            .maybeSingle();

        if (taskErr) {
            console.error('[PatientCareFlow] Task query error:', taskErr);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }
        if (!task) {
            return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
        }

        // Własność: zapis musi należeć do tego pacjenta. Cudzy → 404, nie 403.
        const { data: enrollment, error: enrollErr } = await supabase
            .from('care_enrollments')
            .select('id, status')
            .eq('id', task.enrollment_id)
            .or(filter)
            .maybeSingle();

        if (enrollErr) {
            console.error('[PatientCareFlow] Enrollment query error:', enrollErr);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }
        if (!enrollment) {
            return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
        }

        // Propozycja (`proposed`), zapis wstrzymany, zamknięty lub anulowany — nic nie odhaczamy.
        if (enrollment.status !== 'active') {
            return NextResponse.json({ error: 'not_active' }, { status: 409, headers: NO_STORE });
        }
        if (task.skipped_at) {
            return NextResponse.json({ error: 'skipped' }, { status: 409, headers: NO_STORE });
        }
        if (!task.requires_confirmation) {
            return NextResponse.json({ error: 'not_confirmable' }, { status: 409, headers: NO_STORE });
        }

        const now = new Date();
        const scheduledAt = task.scheduled_at ? new Date(task.scheduled_at) : null;
        // Krok z przyszłości (albo jeszcze ukryty) nie może być „wyklikany" na zapas.
        if (!scheduledAt || scheduledAt > now) {
            return NextResponse.json({ error: 'too_early' }, { status: 409, headers: NO_STORE });
        }
        if (task.visible_from && new Date(task.visible_from) > now) {
            return NextResponse.json({ error: 'too_early' }, { status: 409, headers: NO_STORE });
        }

        // ── OKNO POTWIERDZENIA (decyzja lekarza 2026-07-28) ──────────────────
        //
        // Krok LEKOWY można odhaczyć wyłącznie w ciągu godziny od terminu dawki.
        // Po tym czasie pole jest zamknięte i pacjent nie potwierdzi go wstecz.
        //
        // 🔑 PO CO: bez okna pacjent nadrabiał zaległości jednym ciągiem klików —
        // odhaczał dawki, których nie wziął, a raport zgodności eksportowany do
        // Prodentisa twierdził, że kuracja przebiegła zgodnie z ordynacją.
        // Dokumentacja medyczna kłamała, i to w stronę bezpieczną dla pacjenta pozornie,
        // a groźną klinicznie: lekarz nie widział, że osłona nie została przyjęta.
        //
        // 🔑 DLACZEGO TYLKO LEKI: kroki opisowe („nie płucz", „zimny okład", kontrola)
        // pacjent czyta i odhacza, kiedy dotrze — zamykanie ich po godzinie zostawiałoby
        // protokół pełen niedomkniętych zadań, a `medication_name` jest jedynym polem,
        // które jednoznacznie odróżnia dawkę od zalecenia.
        if (task.medication_name && scheduledAt) {
            const elapsedMs = now.getTime() - scheduledAt.getTime();
            if (elapsedMs > CONFIRM_WINDOW_MS) {
                return NextResponse.json(
                    { error: 'window_closed', windowMinutes: CONFIRM_WINDOW_MS / 60000 },
                    { status: 409, headers: NO_STORE }
                );
            }
        }

        // Atomowo: warunek `completed_at IS NULL` jest po stronie bazy, więc wyścig
        // dwóch urządzeń kończy się jednym wpisem, a drugie dostaje alreadyCompleted.
        const { data: updated, error: updateErr } = await supabase
            .from('care_tasks')
            .update({ completed_at: now.toISOString() })
            .eq('id', id)
            .is('completed_at', null)
            .select('id');

        if (updateErr) {
            console.error('[PatientCareFlow] Task update error:', updateErr);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }
        if (!updated || updated.length === 0) {
            return NextResponse.json({ success: true, alreadyCompleted: true }, { headers: NO_STORE });
        }

        const { error: auditErr } = await supabase.from('care_audit_log').insert({
            enrollment_id: enrollment.id,
            task_id: id,
            action: 'task_completed',
            actor: 'patient-app',
            details: { task_title: task.title },
        });
        if (auditErr) {
            // Audyt nie może wywrócić potwierdzenia, które już zapisaliśmy.
            console.error('[PatientCareFlow] Audit insert error:', auditErr);
        }

        // Jedno zapytanie załatwia i „czy zostało coś do zrobienia", i podpowiedź następnego kroku.
        const { data: nextPending, error: nextErr } = await supabase
            .from('care_tasks')
            .select('id, title, scheduled_at')
            .eq('enrollment_id', enrollment.id)
            .is('completed_at', null)
            .is('skipped_at', null)
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (nextErr) {
            console.error('[PatientCareFlow] Next task query error:', nextErr);
            return NextResponse.json({ success: true, allDone: false, nextTask: null }, { headers: NO_STORE });
        }

        const allDone = !nextPending;

        if (allDone) {
            // `.eq('status','active')` chroni przed nadpisaniem statusu zmienionego w międzyczasie
            // przez personel — i przed zdublowanym wpisem audytu przy równoległych zamknięciach.
            const { data: closed, error: closeErr } = await supabase
                .from('care_enrollments')
                .update({ status: 'completed', completed_at: now.toISOString() })
                .eq('id', enrollment.id)
                .eq('status', 'active')
                .select('id');

            if (closeErr) {
                console.error('[PatientCareFlow] Enrollment close error:', closeErr);
            } else if (closed && closed.length > 0) {
                await supabase.from('care_audit_log').insert({
                    enrollment_id: enrollment.id,
                    action: 'completed',
                    actor: 'system',
                    details: { reason: 'all_tasks_completed' },
                });
            }
        }

        return NextResponse.json(
            {
                success: true,
                allDone,
                nextTask: nextPending
                    ? { id: nextPending.id, title: nextPending.title, scheduledAt: nextPending.scheduled_at }
                    : null,
            },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[PatientCareFlow] Complete task error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
