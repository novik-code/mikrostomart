import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { poprawnaLiczba, poprawnyIdPms, poprawnyTekst } from '@/lib/walidacjaWejscia';

/**
 * POST /api/intake/generate-token
 * Generuje jednorazowy token do cyfrowej karty pacjenta.
 * Wywoływane przez pracownika z grafiku / strefy pracownika.
 *
 * Body: {
 *   prodentisPatientId?: string,   // jeśli pacjent już istnieje
 *   prefillFirstName?: string,
 *   prefillLastName?: string,
 *   appointmentId?: string,
 *   appointmentDate?: string,
 *   appointmentType?: string,
 *   createdByEmployee: string,     // e-mail pracownika
 *   expiresInHours?: number,       // domyślnie 24
 * }
 *
 * Response: { token, url, expiresAt }
 */
export async function POST(req: Request) {
    // S8-3: add auth check (was missing — slip from S1 audit). Token grants
    // access to fill patient medical card via QR → must be employee-initiated.
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
        prodentisPatientId,
        prefillFirstName,
        prefillLastName,
        appointmentId,
        appointmentDate,
        appointmentType,
        createdByEmployee,
        expiresInHours = 24,
    } = body;

    if (!createdByEmployee) {
        return NextResponse.json({ error: 'createdByEmployee is required' }, { status: 400 });
    }

    /**
     * 🔴 P-104: KSZTAŁT WEJŚCIA. `expiresInHours` szło stąd wprost do arytmetyki daty —
     * 87600 dawało link do e-Karty ważny dziesięć lat, a napis kończył się nieobsłużonym
     * błędem i 500. `prodentisPatientId` był przyjmowany jako dowolny tekst i trafiał
     * potem bez kodowania do ścieżki żądania do PMS.
     * Górna granica to 168 godzin (tydzień) — link do e-Karty ma być doraźny.
     */
    if (!poprawnaLiczba(expiresInHours, 1, 168)) {
        return NextResponse.json(
            { error: 'expiresInHours musi być liczbą całkowitą z zakresu 1–168.' },
            { status: 400 },
        );
    }
    if (prodentisPatientId !== undefined && prodentisPatientId !== null && !poprawnyIdPms(prodentisPatientId)) {
        return NextResponse.json({ error: 'Nieprawidłowy identyfikator kartoteki.' }, { status: 400 });
    }
    for (const [nazwa, wartosc] of [['prefillFirstName', prefillFirstName], ['prefillLastName', prefillLastName], ['appointmentType', appointmentType]] as const) {
        if (wartosc !== undefined && !poprawnyTekst(wartosc, 200)) {
            return NextResponse.json({ error: `Pole ${nazwa} musi być tekstem do 200 znaków.` }, { status: 400 });
        }
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('patient_intake_tokens')
        .insert({
            prodentis_patient_id: prodentisPatientId || null,
            prefill_first_name: prefillFirstName || null,
            prefill_last_name: prefillLastName || null,
            appointment_id: appointmentId || null,
            appointment_date: appointmentDate || null,
            appointment_type: appointmentType || null,
            /**
             * 🔑 AUTOR Z SESJI, NIE Z CIAŁA. Pole z żądania było przyjmowane na wiarę,
             * choć realny autor jest już poprawnie w `audit_logs`. Nikt tej kolumny nie
             * czyta, ale kolumna, która KŁAMIE, jest gorsza niż pusta.
             */
            created_by_employee: auth.user?.email || createdByEmployee,
            expires_at: expiresAt,
        })
        .select('token, expires_at')
        .single();

    if (error) {
        console.error('Error creating intake token:', error);
        return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
    const url = `${baseUrl}/ekarta/${data.token}`;

    logAudit({
        userId: auth.user.id, userEmail: auth.user.email || createdByEmployee,
        action: 'create_intake_token', resourceType: 'patient_intake_token',
        resourceId: data.token,
        patientName: (prefillFirstName || prefillLastName)
            ? `${prefillFirstName || ''} ${prefillLastName || ''}`.trim()
            : undefined,
        metadata: {
            prodentis_patient_id: prodentisPatientId || null,
            appointment_id: appointmentId || null,
            expires_in_hours: expiresInHours,
        },
        request: req,
    });

    return NextResponse.json({
        token: data.token,
        url,
        expiresAt: data.expires_at,
    });
}
