/**
 * POST /api/patients/reports — wyślij zgłoszenie z aplikacji (usterka / pomysł / inne)
 * GET  /api/patients/reports — moje zgłoszenia wraz ze statusem i odpowiedzią
 *
 * 🔑 POST działa TAKŻE BEZ LOGOWANIA (decyzja D1 migracji 199). Człowiek, któremu
 * psuje się logowanie albo rejestracja, nie zgłosi tego jako zalogowany — a to jest
 * dokładnie ta klasa usterki, o której trzeba wiedzieć najbardziej. Spam odcinamy
 * limitem, nie zamknięciem kanału.
 *
 * GET wymaga sesji z oczywistego powodu: gość nie ma tożsamości, więc nie ma czego
 * mu pokazać. Dlatego gość może zostawić `contact`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { pushToGroups } from '@/lib/pushService';
import { recordPushPath } from '@/lib/pushHealth';
import {
    diagField,
    sanitizeScreen,
    MAX_CONTACT,
    MAX_MESSAGE,
    PATIENT_VISIBLE_COLUMNS,
    REPORT_KINDS,
    type ReportKind,
} from '@/lib/appReports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

export async function POST(request: NextRequest) {
    // Sesja jest OPCJONALNA — brak tokenu to gość, nie błąd.
    const session = await verifyPatientSession(request);

    /**
     * Limity są ASYMETRYCZNE i to jest celowe.
     *
     * Gość: 3/godz. na IP, `failClosed`. Trasa jest publiczna i zapisuje do bazy,
     * więc przy niedostępnym liczniku wolę odmówić niż zostawić otwarty kanał —
     * ta sama asymetria co przy rejestracji (W1).
     * Zalogowany: 10/godz. na konto. Wyżej, bo jest tożsamość i realny powód, by
     * ktoś w jednej sesji zgłosił kilka rzeczy naraz.
     *
     * 🔑 Zalogowany ma limit LICZONY PO KONCIE, nie po IP — inaczej cała rodzina
     * za jednym NAT-em albo poczekalnia na wspólnym wi-fi dzielą się trzema
     * zgłoszeniami na godzinę.
     */
    const ip = getClientIP(request);
    const limitKey = session ? `appreport:pat:${session.userId}` : `appreport:ip:${ip}`;
    const limitMax = session ? 10 : 3;
    const { allowed } = await checkRateLimit(limitKey, limitMax, 60 * 60_000, {
        failClosed: true,
    });
    if (!allowed) {
        console.warn('[AppReports] limit zgłoszeń przekroczony');
        return NextResponse.json(
            {
                error: 'rate_limited',
                message: 'Przyjęliśmy już kilka zgłoszeń z tego urządzenia. Spróbuj za godzinę.',
            },
            { status: 429 }
        );
    }

    let body: {
        kind?: string;
        message?: string;
        contact?: string;
        appVersion?: string;
        platform?: string;
        osVersion?: string;
        deviceModel?: string;
        locale?: string;
        screen?: string;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message = (body.message ?? '').toString().trim();
    if (message.length < 3) {
        return NextResponse.json(
            { error: 'message_too_short', message: 'Opisz proszę, co się stało.' },
            { status: 400 }
        );
    }

    const kind: ReportKind = REPORT_KINDS.includes(body.kind as ReportKind)
        ? (body.kind as ReportKind)
        : 'bug';

    /**
     * Tożsamość bierzemy Z SESJI, nigdy z ciała żądania — inaczej dowolny gość
     * podpisałby zgłoszenie cudzym kontem.
     *
     * 🔴 Zapisujemy WYŁĄCZNIE `patient_id`, bez migawki nazwiska. Tabela `patients`
     * **nie ma żadnej kolumny z imieniem** — zmierzone wąskim zapytaniem przed
     * napisaniem tej trasy (`first_name` nie istnieje). Pierwsza wersja tego kodu
     * selektowała `first_name, last_name, name`; taki `select` wywraca się w całości,
     * `patient` wychodzi `null`, a KAŻDE zgłoszenie zalogowanego zapisywałoby się
     * jako gościa — cicho, bez błędu, z pustym ekranem „Moje zgłoszenia".
     */
    let patientId: string | null = null;
    if (session) {
        const { data: patient, error: pErr } = await supabase()
            .from('patients')
            .select('id')
            .eq('prodentis_id', session.prodentisId)
            .maybeSingle();
        // Błąd odczytu ≠ „nie ma konta". Logujemy, żeby cicha degradacja do gościa
        // nie została znów odkryta dopiero po miesiącach.
        if (pErr) console.error('[AppReports] odczyt pacjenta nieudany:', pErr.message);
        if (patient) patientId = patient.id as string;
    }

    // Kontakt przyjmujemy WYŁĄCZNIE od gościa: zalogowany dostaje odpowiedź
    // na ekranie „Moje zgłoszenia", więc pole byłoby zbieraniem danych bez celu.
    const contact = session
        ? null
        : ((body.contact ?? '').toString().trim().slice(0, MAX_CONTACT) || null);

    const { data, error } = await supabase()
        .from('app_reports')
        .insert({
            kind,
            message: message.slice(0, MAX_MESSAGE),
            patient_id: patientId,
            contact,
            app_version: diagField(body.appVersion),
            platform: ['ios', 'android', 'web'].includes(String(body.platform))
                ? String(body.platform)
                : null,
            os_version: diagField(body.osVersion),
            device_model: diagField(body.deviceModel),
            locale: diagField(body.locale),
            // 🔴 Czyszczone PO STRONIE SERWERA, mimo że apka czyści to samo u siebie:
            // serwer nie może ufać temu, co przyśle klient, a w tym polu potrafi
            // przyjechać id pacjenta z trasy strefy personelu.
            screen: sanitizeScreen(body.screen),
            status: 'new',
        })
        .select('id, created_at')
        .single();

    if (error) {
        console.error('[AppReports] zapis nieudany:', error.message);
        return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    /**
     * D6: push WYŁĄCZNIE przy usterce i WYŁĄCZNIE do `admin`.
     *
     * 🔴 Treść zgłoszenia NIE JEDZIE w powiadomieniu. Zgłoszenie potrafi zawierać
     * zdanie o własnym leczeniu („nie widzę wizyty u ortodonty"), a push ląduje
     * na ekranie blokady. Idzie sam sygnał i link — dokładnie ta sama zasada,
     * którą właściciel przyjął dla Telegrama.
     *
     * Awaria kanału powiadomień NIE MOŻE wywrócić zapisu: zgłoszenie jest już
     * w bazie i personel zobaczy je na liście, nawet gdyby push padł.
     */
    if (kind === 'bug') {
        try {
            const res = await pushToGroups(
                ['admin'],
                {
                    title: 'Nowe zgłoszenie z aplikacji',
                    body: 'Ktoś zgłosił usterkę. Otwórz, żeby przeczytać.',
                    url: '/pracownik/zgloszenia',
                    tag: `app-report-${data.id}`,
                    data: { type: 'app_report', reportId: data.id },
                },
                { alsoApp: true }
            );
            // 🔑 Rejestr zdrowia dostaje REALNY wynik wysyłki, nie samo „próbowałem".
            // Bez tego `logPush`-owa klasa błędu wraca: historia mówi „wysłane",
            // a nikt nie dostał powiadomienia.
            await recordPushPath('app_report_bug', { sent: res.sent, failed: res.failed });
        } catch (e) {
            console.error('[AppReports] powiadomienie nieudane (zgłoszenie zapisane):', e);
            await recordPushPath('app_report_bug', {
                sent: 0,
                failed: 1,
                error: e instanceof Error ? e.message : String(e),
            }).catch(() => {
                /* rejestr zdrowia nie może wywrócić zapisanego zgłoszenia */
            });
        }
    }

    return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
}

export async function GET(request: NextRequest) {
    const session = await verifyPatientSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: patient } = await supabase()
        .from('patients')
        .select('id')
        .eq('prodentis_id', session.prodentisId)
        .maybeSingle();

    // Konto bez wiersza w `patients` to nie błąd — to po prostu zero zgłoszeń.
    if (!patient) return NextResponse.json({ reports: [] });

    const { data, error } = await supabase()
        .from('app_reports')
        // 🔑 Wąska lista kolumn, nie `*`: pacjent nie ma powodu widzieć
        // `replied_by` (uuid pracownika) ani własnego `patient_id`.
        .select(PATIENT_VISIBLE_COLUMNS)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[AppReports] odczyt nieudany:', error.message);
        return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }

    return NextResponse.json({ reports: data ?? [] });
}
