import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/intake/submit
 * Przyjmuje wypełnioną e-kartę pacjenta.
 * 1. Weryfikuje token
 * 2. Zapisuje dane do patient_intake_submissions
 * 3. Oznacza token jako użyty
 * 4. Próbuje wysłać do Prodentis API (jeśli dostępne)
 */
export async function POST(req: Request) {
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

    const { token, formData } = body;

    if (!token || !formData) {
        return NextResponse.json({ error: 'token and formData required' }, { status: 400 });
    }

    // 1. Verify token
    const { data: tokenRow, error: tokenErr } = await supabase
        .from('patient_intake_tokens')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .single();

    if (tokenErr || !tokenRow) {
        return NextResponse.json({ error: 'Token invalid or already used' }, { status: 410 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Token expired' }, { status: 410 });
    }

    // 2. Build medical notes text for Prodentis
    const survey = formData.medicalSurvey || {};
    const noteLines = [
        `=== E-KARTA PACJENTA ${new Date().toLocaleDateString('pl-PL')} ===`,
        `Choroby przewlekłe: ${survey.chronicDiseases || 'brak'}`,
    ];
    if (survey.heartDisease) noteLines.push('• Choroby serca/układu krążenia: TAK');
    if (survey.diabetes) noteLines.push('• Cukrzyca: TAK');
    if (survey.thyroid) noteLines.push('• Choroby tarczycy: TAK');
    if (survey.asthma) noteLines.push('• Astma/choroby oddechowe: TAK');
    if (survey.epilepsy) noteLines.push('• Padaczka/choroby neurologiczne: TAK');
    if (survey.bloodDisorder) noteLines.push('• Zaburzenia krzepliwości krwi: TAK');
    if (survey.osteoporosis) noteLines.push('• Osteoporoza/bisfosfoniany: TAK');
    if (survey.infectiousDisease) noteLines.push('• Choroby zakaźne (WZW/HIV): TAK');
    noteLines.push(`Leki na stałe: ${survey.medications || 'brak'}`);
    noteLines.push(`Alergie: ${survey.allergies || 'brak'}`);
    noteLines.push(`Lateks/metale: ${survey.latexAllergy ? 'TAK' : 'NIE'}`);
    if (formData.gender === 'F') {
        noteLines.push(`Ciąża: ${survey.pregnant ? 'TAK' : 'NIE'}`);
        noteLines.push(`Karmienie piersią: ${survey.breastfeeding ? 'TAK' : 'NIE'}`);
    }
    noteLines.push(`Ostatnie RTG: ${survey.lastXray || 'nie podano'}`);
    if (survey.additionalNotes) noteLines.push(`Uwagi: ${survey.additionalNotes}`);
    const medicalNotes = noteLines.join('\n');

    // 3. Save submission to Supabase
    const { data: submission, error: subErr } = await supabase
        .from('patient_intake_submissions')
        .insert({
            token_id: tokenRow.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            middle_name: formData.middleName || null,
            maiden_name: formData.maidenName || null,
            pesel: formData.pesel || null,
            birth_date: formData.birthDate || null,
            gender: formData.gender || null,
            street: formData.street || null,
            postal_code: formData.postalCode || null,
            city: formData.city || null,
            phone: formData.phone || null,
            email: formData.email || null,
            marketing_consent: formData.marketingConsent || false,
            contact_consent: formData.contactConsent !== false,
            rodo_consent: formData.rodoConsent !== false,
            medical_survey: survey,
            medical_notes: medicalNotes,
            signature_data: formData.signatureData || null,
            prodentis_status: 'pending',
        })
        .select('id')
        .single();

    if (subErr) {
        console.error('Error saving submission:', subErr);
        return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    // 4. Mark token as used
    await supabase
        .from('patient_intake_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenRow.id);

    // 5. Try to send to Prodentis (async, don't block response)
    const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';
    const prodentisKey = process.env.PRODENTIS_API_KEY || '';

    // Fire and forget — update status asynchronously
    (async () => {
        try {
            const patientPayload = {
                firstName: formData.firstName,
                middleName: formData.middleName || '',
                lastName: formData.lastName,
                maidenName: formData.maidenName || '',
                pesel: formData.pesel || '',
                birthDate: formData.birthDate || '',
                gender: formData.gender || '',
                address: {
                    street: formData.street || '',
                    postalCode: formData.postalCode || '',
                    city: formData.city || '',
                },
                phone: formData.phone || '',
                email: formData.email || '',
                marketingConsent: formData.marketingConsent || false,
                contactConsent: formData.contactConsent !== false,
                notes: medicalNotes,
            };

            let prodentisPatientId = tokenRow.prodentis_patient_id;

            if (prodentisPatientId) {
                // Update existing patient
                const patchRes = await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                    body: JSON.stringify(patientPayload),
                    signal: AbortSignal.timeout(10000),
                });
                if (patchRes.ok) {
                    // Add notes
                    await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                        body: JSON.stringify({ category: 'medical_intake', text: medicalNotes, appendMode: true }),
                        signal: AbortSignal.timeout(10000),
                    });
                    await supabase.from('patient_intake_submissions')
                        .update({ prodentis_status: 'sent', prodentis_patient_id: prodentisPatientId })
                        .eq('id', submission.id);
                }
            } else {
                // Create new patient
                const createRes = await fetch(`${prodentisUrl}/api/patients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                    body: JSON.stringify(patientPayload),
                    signal: AbortSignal.timeout(10000),
                });
                const result = await createRes.json();
                if (createRes.ok || result.prodentisId) {
                    prodentisPatientId = result.prodentisId;
                    await supabase.from('patient_intake_submissions')
                        .update({ prodentis_status: 'sent', prodentis_patient_id: prodentisPatientId })
                        .eq('id', submission.id);
                } else if (result.error === 'PATIENT_EXISTS' && result.prodentisId) {
                    // PESEL conflict — update existing
                    await fetch(`${prodentisUrl}/api/patients/${result.prodentisId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                        body: JSON.stringify({ category: 'medical_intake', text: medicalNotes, appendMode: true }),
                        signal: AbortSignal.timeout(10000),
                    });
                    await supabase.from('patient_intake_submissions')
                        .update({ prodentis_status: 'sent', prodentis_patient_id: result.prodentisId })
                        .eq('id', submission.id);
                }
            }
        } catch (e: any) {
            console.error('Prodentis async send failed (non-blocking):', e.message);
            await supabase.from('patient_intake_submissions')
                .update({ prodentis_status: 'failed', prodentis_error: e.message })
                .eq('id', submission.id);
        }
    })();

    return NextResponse.json({ success: true, submissionId: submission.id });
}
