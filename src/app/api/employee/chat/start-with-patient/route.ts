import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { czyPoprawnyIdPms } from '@/lib/prodentisId';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/chat/start-with-patient
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * Get-or-create OTWARTEJ konwersacji czatu dla konkretnego pacjenta (po prodentis_id).
 * Zwraca `conversationId`, którym apka otwiera `(staff)/czat/[id]`. Recepcja pisze
 * pierwszą wiadomość istniejącą ścieżką `POST /api/admin/chat/messages` (ona już
 * push+mailuje pacjenta) — dlatego TEN endpoint NIE wysyła żadnej wiadomości ani
 * powiadomienia: jest czysto idempotentnym „otwórz wątek".
 *
 * Body: { prodentis_id: string, patient_name?: string }
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: { prodentis_id?: string; patient_name?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const prodentisId = body.prodentis_id?.trim();
    if (!prodentisId) {
        return NextResponse.json({ error: 'Provide prodentis_id' }, { status: 400 });
    }
    // 🔴 P-035, spójność: tu wstrzyknięcie wymaga wiersza `patients` o takim id (lookup
    // niżej daje 404 wcześniej), więc jest praktycznie nieosiągalne — ale identyfikator
    // trafia potem w ŚCIEŻKĘ adresu PMS, a wyjątek od reguły trzyma się dokładnie do
    // pierwszej zmiany kolejności sprawdzeń.
    if (!czyPoprawnyIdPms(prodentisId)) {
        return NextResponse.json({ error: 'Nieprawidłowy identyfikator pacjenta' }, { status: 400 });
    }

    try {
        // Konto portalu pacjenta (patients.id = klucz konwersacji). Czat wymaga konta.
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', prodentisId)
            .limit(1)
            .maybeSingle();

        if (!patient) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'no_patient_account',
                    message: 'Pacjent nie ma konta w Strefie Pacjenta — nie można otworzyć czatu.',
                },
                { status: 404 }
            );
        }

        /**
         * Nazwa do wyświetlenia w liście konwersacji.
         *
         * 🔴 P-041: KOLEJNOŚĆ ODWRÓCONA (06.09). Do dziś pierwszeństwo miała wartość
         * z CIAŁA ŻĄDANIA — a to znaczy, że uwierzytelniony pracownik wołający tę trasę
         * spoza apki mógł nadać realnemu pacjentowi dowolną etykietę, która potem wędruje
         * do `chat_conversations` i do `employee_audit_log`. Kartoteka jest źródłem prawdy
         * o tym, jak pacjent się nazywa; ciało żądania nim nie jest.
         * ⚪ Koszt: jedno dodatkowe wywołanie PMS przy ZAKŁADANIU rozmowy (nie przy każdej
         * wiadomości). Wartość z apki zostaje jako zapasowa, żeby awaria PMS nie zamieniła
         * listy rozmów w kolumnę „Pacjent".
         *
         * 🪤 LIMIT DŁUGOŚCI NIE JEST KOSMETYKĄ. `logAudit` nie sprawdza `{error}`, a indeks
         * btree `idx_audit_log_patient` nie przyjmuje wartości powyżej ~2704 B — nazwa
         * dłuższa niż limit strony indeksu sprawiała, że wpis audytu RODO ginął PO CICHU,
         * a każdy późniejszy odczyt wątku kopiował tę samą nazwę i też ginął.
         * ⚪ Zmierzone na produkcji 06.09: najdłuższa istniejąca nazwa ma 18 znaków,
         * zero powyżej 200 — próg 120 nie obcina niczego, co dziś żyje w bazie.
         */
        const NAZWA_MAX = 120;
        const przytnij = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, NAZWA_MAX) : '');

        let patientName = '';
        try {
            const detRes = await prodentisFetch(`/api/patient/${encodeURIComponent(prodentisId)}/details`, {
                klucz: 'personel', timeoutMs: 5000 });
            if (detRes.ok) {
                const det = await detRes.json();
                patientName = przytnij(`${det.firstName || ''} ${det.lastName || ''}`.trim());
            }
        } catch (e) {
            /* nazwa nie jest krytyczna — ale awaria PMS (np. brak klucza) ma zostawić ślad */
            console.error('[EmployeeChat] Nie udało się pobrać nazwy pacjenta z PMS:', e);
        }
        if (!patientName) patientName = przytnij(body.patient_name);
        if (!patientName) patientName = 'Pacjent';

        // Get-or-create OTWARTEJ konwersacji (wzorzec z patients/chat POST).
        let { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .limit(1)
            .maybeSingle();

        let created = false;
        if (!conversation) {
            const { data: newConv, error: convError } = await supabase
                .from('chat_conversations')
                .insert({ patient_id: patient.id, patient_name: patientName })
                .select('id')
                .single();
            if (convError) throw convError;
            conversation = newConv;
            created = true;
        }

        // Audyt RODO — personel otworzył wątek czatu z pacjentem.
        logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'employee_start_patient_chat',
            resourceType: 'chat_conversation',
            resourceId: conversation!.id,
            patientName,
            metadata: { prodentis_id: prodentisId, created },
            request: req,
        });

        return NextResponse.json({
            success: true,
            conversationId: conversation!.id,
            created,
        });
    } catch (error) {
        console.error('[EmployeeChat] start-with-patient error:', error);
        return NextResponse.json({ error: 'Failed to start conversation' }, { status: 500 });
    }
}
