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

/** Wiersz `care_tasks` w zakresie kolumn pokazywanych pacjentowi. */
type TaskRow = {
    id: string;
    sort_order: number | null;
    title: string | null;
    description: string | null;
    icon: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    skipped_at: string | null;
    medication_name: string | null;
    medication_dose: string | null;
    medication_description: string | null;
    visible_from: string | null;
    requires_confirmation: boolean | null;
};

/** Lek w zakresie pokazywanym pacjentowi. */
type Medication = { name: string; dose?: string; description?: string };

/**
 * Odtworzenie listy leków ze SNAPSHOTU ZADAŃ (`care_tasks`), dla zapisów bez
 * `custom_medications` (wiersze sprzed wprowadzenia snapshotu). To zawsze dokładnie
 * te leki, które pacjent realnie ma do wzięcia — w przeciwieństwie do żywego szablonu.
 * `medication_description` w zadaniu ma już doklejoną częstotliwość, więc osobnego
 * pola `frequency` tu nie ma.
 */
function medicationsFromTasks(tasks: TaskRow[]): Medication[] {
    const out: Medication[] = [];
    const seen = new Set<string>();
    for (const t of tasks) {
        const name = t.medication_name?.trim();
        if (!name) continue;
        const dose = t.medication_dose?.trim() || undefined;
        const description = t.medication_description?.trim() || undefined;
        const key = `${name}|${dose ?? ''}|${description ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name, dose, description });
    }
    return out;
}

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
const ENROLLMENT_FIELDS =
    'id, patient_name, template_name, appointment_date, doctor_name, status, prescription_code, custom_notes, custom_medications, follow_up_appointments';

/** Wiersz `care_enrollments` w zakresie potrzebnym tej trasie. */
type EnrollmentRow = {
    id: string;
    patient_name: string | null;
    template_name: string | null;
    appointment_date: string;
    doctor_name: string | null;
    status: string | null;
    prescription_code: string | null;
    custom_notes: string | null;
    custom_medications: unknown;
    follow_up_appointments: unknown;
    /** Brak pola = zapis odczytany fallbackiem, bo migracja 181 nie jest wgrana. */
    access_token_expires_at?: string | null;
};

/**
 * Odczyt zapisu po tokenie, ODPORNY na niewgraną migrację 181. Gdyby kod wyprzedził
 * migrację, `select` z `access_token_expires_at` wywala się na 42703 — wtedy ponawiamy
 * zapytanie bez tej kolumny i traktujemy token jak bezterminowy (skoro kolumny nie ma,
 * żaden zapis nie ma daty ważności). Pacjent nie może stracić dostępu do zaleceń
 * i listy leków tylko dlatego, że migracja czeka w kolejce.
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
 * GET /api/careflow/[token]
 * Public endpoint — token is the auth.
 * Returns enrollment data with tasks for the patient landing page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

        if (!token || token.length < 10) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400, headers: NO_STORE });
        }

        // Limit kluczujemy TOKENEM, nie IP: strona /opieka/[token] odświeża się co 60 s,
        // a pacjenci tego samego operatora dzielą adres za CGNAT — na kluczu IP potrafili
        // blokować się nawzajem. Zgadywanie tokenów łapie osobny licznik pudeł (niżej).
        const rl = await checkRateLimit(`careflow-view:${rateKeyForToken(token)}`, 30, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' },
                { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } }
            );
        }

        const { data: enrollment, error } = await loadEnrollment(token);

        // Błąd bazy to NIE to samo co brak wiersza. Wcześniej jedno `if (error || !enrollment)`
        // zwracało każdemu pacjentowi 404 „Nie znaleziono procesu opieki" i nie logowało nic —
        // totalna awaria (np. niewgrana migracja) wyglądała w logach jak „pacjenci wpisują
        // złe tokeny". Teraz awaria jest głośna (log serwerowy) i widoczna jako 500.
        if (error) {
            console.error('[CareFlow] Enrollment query error:', error.code, error.message);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }

        if (!enrollment) {
            // Limit po tokenie nie zatrzyma enumeracji (każde pudło = inny klucz), więc
            // CHYBIONE trafienia liczymy po IP. Trafienia w istniejący token go nie ruszają.
            const miss = await checkRateLimit(`careflow-miss:${getClientIP(req)}`, 20, 60_000);
            if (!miss.allowed) {
                return NextResponse.json(
                    { error: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' },
                    { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } }
                );
            }
            return NextResponse.json({ error: 'Nie znaleziono procesu opieki' }, { status: 404, headers: NO_STORE });
        }

        // Wygaśnięcie linku z SMS-a (mig 181). NULL/brak pola (fallback bez kolumny) = token
        // bezterminowy. Wygasły token dostaje DOKŁADNIE tę samą odpowiedź co nieistniejący — inaczej
        // zdradzalibyśmy, że pod tym adresem kiedyś były czyjeś dane medyczne.
        const expiresAt = enrollment.access_token_expires_at ? new Date(enrollment.access_token_expires_at) : null;
        if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
            return NextResponse.json({ error: 'Nie znaleziono procesu opieki' }, { status: 404, headers: NO_STORE });
        }

        // 'proposed' = propozycja auto-kwalifikacji, której lekarz jeszcze NIE zaakceptował.
        // Dla pacjenta taki proces jeszcze nie istnieje — odpowiadamy jak przy złym tokenie,
        // żeby nie zdradzić, że coś już czeka w systemie.
        if (enrollment.status === 'proposed') {
            return NextResponse.json({ error: 'Nie znaleziono procesu opieki' }, { status: 404, headers: NO_STORE });
        }

        if (enrollment.status === 'cancelled') {
            return NextResponse.json({ error: 'Ten proces opieki został anulowany', status: 'cancelled' }, { status: 410, headers: NO_STORE });
        }

        // 'paused' obsługujemy tak samo jak 'cancelled' (410 + własny `status`), bo POST
        // /complete i tak odrzuca wstrzymany proces — wcześniej strona wyglądała na aktywną,
        // a każde odhaczenie kroku kończyło się cichym błędem.
        if (enrollment.status === 'paused') {
            return NextResponse.json({ error: 'Ten proces opieki został tymczasowo wstrzymany. Skontaktuj się z gabinetem.', status: 'paused' }, { status: 410, headers: NO_STORE });
        }

        // Get tasks
        const now = new Date();
        const { data: tasks, error: taskErr } = await supabase
            .from('care_tasks')
            .select('id, sort_order, title, description, icon, scheduled_at, completed_at, skipped_at, medication_name, medication_dose, medication_description, visible_from, requires_confirmation')
            .eq('enrollment_id', enrollment.id)
            .order('sort_order', { ascending: true });

        // Zadania niosą snapshot leków, więc błąd ich odczytu = brak pewności, co pacjent
        // ma wziąć. Wtedy nie pokazujemy NICZEGO (fail-safe), zamiast niekompletnej listy.
        if (taskErr) {
            console.error('[CareFlow] Tasks query error:', taskErr);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }

        const allTasks = (tasks || []) as TaskRow[];

        // Filter tasks by visibility
        const visibleTasks = allTasks.filter((t) => {
            if (!t.visible_from) return true;
            return new Date(t.visible_from) <= now;
        });

        // Leki WYŁĄCZNIE ze snapshotu zapisu. Żywy `care_templates.default_medications`
        // NIE jest źródłem: edycja protokołu przez admina podmieniałaby pacjentowi listę
        // leków w trakcie trwającej kuracji. Brak snapshotu (stare wiersze) → odtwarzamy
        // listę ze snapshotu ZADAŃ, czyli z tego, co pacjent realnie ma do wzięcia.
        const snapshotMeds = enrollment.custom_medications;
        const medications = Array.isArray(snapshotMeds) && snapshotMeds.length > 0
            ? snapshotMeds
            : medicationsFromTasks(allTasks);

        // Determine current phase
        const aptDate = new Date(enrollment.appointment_date);
        const phase = now < aptDate ? 'pre' : 'post';

        // Time until appointment
        const msUntil = aptDate.getTime() - now.getTime();
        const hoursUntil = Math.round(msUntil / (1000 * 60 * 60) * 10) / 10;

        return NextResponse.json({
            enrollment: {
                patientName: enrollment.patient_name,
                templateName: enrollment.template_name,
                appointmentDate: enrollment.appointment_date,
                doctorName: enrollment.doctor_name,
                status: enrollment.status,
                prescriptionCode: enrollment.prescription_code,
                customNotes: enrollment.custom_notes,
                followUpAppointments: enrollment.follow_up_appointments || [],
            },
            tasks: visibleTasks.map((t) => ({
                id: t.id,
                sortOrder: t.sort_order,
                title: t.title,
                description: t.description,
                icon: t.icon,
                scheduledAt: t.scheduled_at,
                completedAt: t.completed_at,
                skippedAt: t.skipped_at,
                medicationName: t.medication_name,
                medicationDose: t.medication_dose,
                medicationDescription: t.medication_description,
                requiresConfirmation: t.requires_confirmation,
            })),
            medications,
            phase,
            hoursUntilAppointment: hoursUntil,
        }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] GET token error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
