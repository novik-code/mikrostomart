import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Dane medyczne pacjenta — żaden cache (przeglądarka, CDN, proxy) nie może ich przechować. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * Klucz limitu liczony z tokenu. Sam token to pełne uwierzytelnienie do danych
 * medycznych, więc do tabeli `rate_limit_entries` trafia wyłącznie jego skrót.
 */
function rateKeyForToken(token: string): string {
    return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

/** Błąd zapytania w zakresie, który nas interesuje (kształt `PostgrestError`). */
type DbError = { code?: string | null; message?: string | null } | null;

/**
 * Czy błąd znaczy „nie ma takiej kolumny"? Ten sam wzorzec i te same kody co
 * `isMissingColumnError` w `src/lib/careflowLifecycle.ts`: Postgres zwraca 42703,
 * a PostgREST odrzuca nieznaną kolumnę z cache'u schematu kodem PGRST204.
 */
function isMissingColumnError(error: DbError, column: string): boolean {
    if (!error) return false;
    if (error.code === '42703' || error.code === 'PGRST204') return true;
    const message = String(error.message ?? '');
    return message.includes(column) && /column|schema cache/i.test(message);
}

/** Kolumny zapisu BEZ `access_token_expires_at` — tę dokłada dopiero migracja 181. */
const ENROLLMENT_FIELDS = 'id, status, patient_name';

/** Wiersz `care_enrollments` w zakresie potrzebnym tej trasie. */
type EnrollmentRow = {
    id: string;
    status: string | null;
    patient_name: string | null;
    /** Brak pola = zapis odczytany fallbackiem, bo migracja 181 nie jest wgrana. */
    access_token_expires_at?: string | null;
};

/**
 * Odczyt zapisu po tokenie, ODPORNY na niewgraną migrację 181. Gdyby kod wyprzedził
 * migrację, `select` z `access_token_expires_at` wywala się na 42703 — wtedy ponawiamy
 * zapytanie bez tej kolumny i traktujemy token jak bezterminowy (skoro kolumny nie ma,
 * żaden zapis nie ma daty ważności). Pacjent nie może stracić możliwości potwierdzenia
 * kroku tylko dlatego, że migracja czeka w kolejce.
 */
async function loadEnrollment(token: string): Promise<{ data: EnrollmentRow | null; error: DbError }> {
    const withExpiry = await supabase
        .from('care_enrollments')
        .select(`${ENROLLMENT_FIELDS}, access_token_expires_at`)
        .eq('access_token', token)
        .maybeSingle();

    if (!withExpiry.error || !isMissingColumnError(withExpiry.error, 'access_token_expires_at')) {
        return { data: (withExpiry.data as EnrollmentRow | null) ?? null, error: withExpiry.error };
    }

    console.error(
        '[CareFlow] 🚨 Brak kolumny access_token_expires_at — migracja 181 NIE jest wgrana. ' +
            'Czytam zapis bez daty wygaśnięcia (token traktowany jako bezterminowy).'
    );

    const fallback = await supabase
        .from('care_enrollments')
        .select(ENROLLMENT_FIELDS)
        .eq('access_token', token)
        .maybeSingle();

    return { data: (fallback.data as EnrollmentRow | null) ?? null, error: fallback.error };
}

/**
 * POST /api/careflow/[token]/complete
 * Patient marks a task as completed (checkbox).
 * Public endpoint — token is the auth.
 * Body: { taskId }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json({ error: 'Missing token or taskId' }, { status: 400, headers: NO_STORE });
        }

        // Publiczna trasa zapisująca. Limit kluczujemy TOKENEM, nie IP: pacjenci tego
        // samego operatora dzielą adres za CGNAT i na kluczu IP blokowali się nawzajem.
        // Zgadywanie tokenów łapie osobny licznik pudeł po IP (niżej).
        const rl = await checkRateLimit(`careflow-complete:${rateKeyForToken(token)}`, 20, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' },
                { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } }
            );
        }

        let body: { taskId?: unknown } | null = null;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: NO_STORE });
        }
        const taskId = typeof body?.taskId === 'string' ? body.taskId.trim() : '';

        if (!taskId) {
            return NextResponse.json({ error: 'Missing token or taskId' }, { status: 400, headers: NO_STORE });
        }

        // Verify token → enrollment
        const { data: enrollment, error: enrollmentErr } = await loadEnrollment(token);

        // Błąd bazy to NIE to samo co brak wiersza. Wcześniej błąd zapytania nie był nawet
        // odbierany: awaria (np. niewgrana migracja) dawała pacjentowi 404 „Invalid token"
        // bez śladu w logach. Teraz awaria jest głośna (log serwerowy) i widoczna jako 500.
        if (enrollmentErr) {
            console.error('[CareFlow] Enrollment query error (complete):', enrollmentErr.code, enrollmentErr.message);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }

        if (!enrollment) {
            // Limit po tokenie nie zatrzyma enumeracji (każde pudło = inny klucz), więc
            // CHYBIONE trafienia liczymy po IP.
            const miss = await checkRateLimit(`careflow-miss:${getClientIP(req)}`, 20, 60_000);
            if (!miss.allowed) {
                return NextResponse.json(
                    { error: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' },
                    { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } }
                );
            }
            return NextResponse.json({ error: 'Invalid token' }, { status: 404, headers: NO_STORE });
        }

        // Wygaśnięcie linku z SMS-a (mig 181). NULL/brak pola (fallback bez kolumny) = token
        // bezterminowy. Wygasły token dostaje tę samą odpowiedź co nieistniejący.
        const expiresAt = enrollment.access_token_expires_at ? new Date(enrollment.access_token_expires_at) : null;
        if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 404, headers: NO_STORE });
        }

        // Tylko 'active'. 'proposed' (propozycja bez akceptacji lekarza), 'paused',
        // 'cancelled' i 'completed' nie przyjmują potwierdzeń.
        if (enrollment.status !== 'active') {
            return NextResponse.json({ error: 'CareFlow is not active' }, { status: 400, headers: NO_STORE });
        }

        // Potwierdzenie jednym UPDATE-em z pełnym zestawem warunków. Wcześniej było
        // read-then-write: dwa urządzenia pacjenta potrafiły odhaczyć ten sam krok dwa razy
        // (i dwa razy zapisać go w audycie), a krok z przyszłości blokowało tylko UI.
        const nowIso = new Date().toISOString();
        const { data: updated, error: updErr } = await supabase
            .from('care_tasks')
            .update({ completed_at: nowIso })
            .eq('id', taskId)
            .eq('enrollment_id', enrollment.id)
            .is('completed_at', null)
            .is('skipped_at', null)
            .lte('scheduled_at', nowIso)
            .or(`visible_from.is.null,visible_from.lte.${nowIso}`)
            .select('id, title')
            .maybeSingle();

        if (updErr) {
            console.error('[CareFlow] Complete task update error:', updErr.message);
            return NextResponse.json({ error: 'Nie udało się zapisać potwierdzenia' }, { status: 500, headers: NO_STORE });
        }

        if (!updated) {
            // 0 zaktualizowanych wierszy — dopiero teraz czytamy zadanie, żeby powiedzieć DLACZEGO.
            const { data: task } = await supabase
                .from('care_tasks')
                .select('id, completed_at, skipped_at, scheduled_at, visible_from')
                .eq('id', taskId)
                .eq('enrollment_id', enrollment.id)
                .maybeSingle();

            if (!task) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404, headers: NO_STORE });
            }
            if (task.completed_at) {
                return NextResponse.json({ success: true, alreadyCompleted: true }, { headers: NO_STORE });
            }
            if (task.skipped_at) {
                return NextResponse.json({ error: 'To zadanie zostało pominięte przez personel' }, { status: 409, headers: NO_STORE });
            }
            return NextResponse.json(
                { error: 'To zadanie nie jest jeszcze aktywne — wróć o wyznaczonej godzinie.' },
                { status: 409, headers: NO_STORE }
            );
        }

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: enrollment.id,
            task_id: taskId,
            action: 'task_completed',
            actor: 'patient',
            details: { task_title: updated.title },
        });

        // Check if all tasks are now completed
        const { data: remaining, error: remErr } = await supabase
            .from('care_tasks')
            .select('id')
            .eq('enrollment_id', enrollment.id)
            .is('completed_at', null)
            .is('skipped_at', null);

        // Błąd odczytu NIE może uchodzić za „wszystko zrobione": domknięcie zapisu wyłącza
        // dalsze przypomnienia o lekach, więc w wątpliwości zostawiamy proces otwarty.
        const allDone = !remErr && (remaining?.length ?? 0) === 0;

        if (allDone) {
            // `.eq('status','active')` jest OBOWIĄZKOWE: między odczytem statusu na górze
            // a tym zapisem personel mógł wstrzymać proces ('paused'). Bez warunku
            // domknięcie nadpisałoby decyzję gabinetu. 0 wierszy = ktoś zmienił status,
            // wtedy nie logujemy też domknięcia.
            const { data: closed, error: closeErr } = await supabase
                .from('care_enrollments')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', enrollment.id)
                .eq('status', 'active')
                .select('id')
                .maybeSingle();

            if (closeErr) {
                console.error('[CareFlow] Enrollment close error:', closeErr.message);
            } else if (closed) {
                await supabase.from('care_audit_log').insert({
                    enrollment_id: enrollment.id,
                    action: 'completed',
                    actor: 'system',
                    details: { reason: 'all_tasks_completed' },
                });
            }
        }

        // Find next pending task for feedback
        const { data: nextTask } = await supabase
            .from('care_tasks')
            .select('title, scheduled_at')
            .eq('enrollment_id', enrollment.id)
            .is('completed_at', null)
            .is('skipped_at', null)
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        return NextResponse.json({
            success: true,
            allDone,
            nextTask: nextTask ? { title: nextTask.title, scheduledAt: nextTask.scheduled_at } : null,
        }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] Complete task error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
