import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/patient-details?patientId=...
 * Fetches patient data from Prodentis + e-karta intake from Supabase.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
    }

    const apiUrl = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
    const apiKey = process.env.PRODENTIS_API_KEY || '';

    try {
        // 1. Fetch patient details from Prodentis
        const detailsRes = await fetch(`${apiUrl}/api/patient/${patientId}/details`, {
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
            signal: AbortSignal.timeout(8000),
            cache: 'no-store',
        });

        if (!detailsRes.ok) {
            return NextResponse.json(
                { error: `Prodentis: ${detailsRes.status}` },
                { status: detailsRes.status }
            );
        }

        const details = await detailsRes.json();

        // 2. Try to get e-karta intake from Supabase (has PESEL, birthDate, gender, medical notes)
        let intake = null;
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data } = await supabase
                .from('patient_intake_submissions')
                .select('pesel, birth_date, gender, first_name, last_name, middle_name, maiden_name, medical_notes, medical_survey, marketing_consent, contact_consent, rodo_consent, submitted_at')
                .eq('prodentis_patient_id', patientId)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) intake = data;
        } catch (e) {
            // Supabase lookup is optional — continue without it
            console.warn('Supabase intake lookup failed:', e);
        }

        // 3. Try to fetch medical notes from Prodentis
        let medicalNotes = null;
        try {
            const notesRes = await fetch(`${apiUrl}/api/patients/${patientId}/notes`, {
                headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
                signal: AbortSignal.timeout(5000),
                cache: 'no-store',
            });
            if (notesRes.ok) {
                const notesData = await notesRes.json();
                if (notesData && (Array.isArray(notesData) ? notesData.length > 0 : true)) {
                    medicalNotes = notesData;
                }
            }
        } catch {
            // Notes endpoint may not exist — continue
        }

        return NextResponse.json({ ...details, intake, medicalNotes });
    } catch (e: any) {
        console.error('Patient details fetch error:', e);
        return NextResponse.json(
            { error: 'Brak połączenia z Prodentis', details: e.message },
            { status: 502 }
        );
    }
}
