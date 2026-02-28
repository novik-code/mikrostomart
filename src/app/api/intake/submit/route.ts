import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEKartaPdf } from '@/app/api/intake/generate-pdf/route';

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

    // 2. Build medical notes text for Prodentis — with clear formatting
    const survey = formData.medicalSurvey || {};
    const date = new Date().toLocaleDateString('pl-PL');
    const yn = (v: any) => v ? 'TAK' : 'NIE';
    const sections: string[] = [];

    // Header
    sections.push(`=== E-KARTA PACJENTA ${date} ===`);
    sections.push('');

    // Stan ogólny
    sections.push('--- STAN OGÓLNY ---');
    sections.push(`Czuje się zdrowy/a: ${yn(survey.feelsHealthy)}`);
    if (survey.hospitalLast2Years) sections.push(`Szpital w ciągu 2 lat: TAK — ${survey.hospitalReason || '(brak szczegółów)'}`);
    if (survey.currentlyTreated) sections.push(`Aktualnie leczy się: TAK — ${survey.currentTreatment || '(brak szczegółów)'}`);
    if (survey.takesMedication) sections.push(`Przyjmuje leki: TAK — ${survey.medications || '(brak szczegółów)'}`);
    else sections.push('Przyjmuje leki: NIE');
    if (survey.hasAllergies) sections.push(`Uczulenia: TAK — ${survey.allergies || '(brak szczegółów)'}`);
    else sections.push('Uczulenia: NIE');
    sections.push('');

    // Skłonności
    sections.push('--- SKŁONNOŚCI ---');
    sections.push(`Skłonność do krwawień: ${yn(survey.bleedingTendency)}`);
    sections.push(`Omdlenia/utrata przytomności: ${yn(survey.faintingEpisodes)}`);
    sections.push(`Rozrusznik serca: ${yn(survey.hasPacemaker)}`);
    sections.push('');

    // Choroby
    const diseases: [string, boolean][] = [
        ['Choroby serca (zawał, wieńcowa, wada, zaburzenia rytmu)', survey.heartDiseases],
        ['Choroby układu krążenia (nadciśnienie, omdlenia)', survey.circulatoryDiseases],
        ['Choroby naczyń (żylaki, zapalenie żył)', survey.vascularDiseases],
        ['Choroby płuc (rozedma, astma, gruźlica, oskrzela)', survey.lungDiseases],
        ['Choroby układu pokarmowego (wrzody, choroby jelit)', survey.digestiveDiseases],
        ['Choroby wątroby (kamica, żółtaczka, marskość)', survey.liverDiseases],
        ['Choroby układu moczowego (nerek, kamica)', survey.urinaryDiseases],
        ['Zaburzenia przemiany materii (cukrzyca, dna)', survey.metabolicDiseases],
        ['Choroby tarczycy', survey.thyroidDiseases],
        ['Choroby ukł. nerwowego (padaczka, niedowłady)', survey.neurologicalDiseases],
        ['Choroby ukł. kostno-stawowego (zwyrodnienia)', survey.musculoskeletalDiseases],
        ['Choroby krwi i krzepnięcia (hemofilia, anemia)', survey.bloodDiseases],
        ['Choroby oczu (jaskra)', survey.eyeDiseases],
        ['Zmiany nastroju (depresja, nerwica)', survey.moodDisorders],
        ['Choroba reumatyczna', survey.rheumaticDisease],
        ['Osteoporoza', survey.osteoporosis],
    ];
    const positive = diseases.filter(([, v]) => v);
    sections.push('--- CHOROBY ---');
    if (positive.length === 0) {
        sections.push('Brak oznaczonych chorób.');
    } else {
        positive.forEach(([name]) => sections.push(`• ${name}: TAK`));
    }
    sections.push('');

    // Choroby zakaźne
    if (survey.infectiousDisease) {
        sections.push('--- CHOROBY ZAKAŹNE ---');
        if (survey.hepatitisA) sections.push('• Żółtaczka zakaźna A: TAK');
        if (survey.hepatitisB) sections.push('• Żółtaczka zakaźna B: TAK');
        if (survey.hepatitisC) sections.push('• Żółtaczka zakaźna C: TAK');
        if (survey.aids) sections.push('• AIDS/HIV: TAK');
        if (survey.tuberculosis) sections.push('• Gruźlica: TAK');
        if (survey.std) sections.push('• Choroby weneryczne: TAK');
        sections.push('');
    }

    // Inne
    if (survey.otherDiseases) sections.push(`Inne dolegliwości: ${survey.otherDiseases}`);
    if (survey.lastBloodPressure) sections.push(`Ostatnie ciśnienie: ${survey.lastBloodPressure}`);
    sections.push('');

    // Historia medyczna
    sections.push('--- HISTORIA MEDYCZNA ---');
    if (survey.hadSurgery) sections.push(`Operowany/a: TAK — ${survey.surgeryDetails || '(brak szczegółów)'}`);
    else sections.push('Operowany/a: NIE');
    sections.push(`Tolerancja znieczulenia: ${yn(survey.toleratedAnesthesia)}`);
    if (survey.hadBloodTransfusion) sections.push(`Przetaczanie krwi: TAK — ${survey.transfusionDetails || '(brak szczegółów)'}`);
    sections.push('');

    // Używki
    sections.push('--- UŻYWKI ---');
    if (survey.smoker) sections.push(`Tytoń: TAK — ${survey.smokingDetails || '(brak szczegółów)'}`);
    else sections.push('Tytoń: NIE');
    sections.push(`Alkohol: ${survey.drinksAlcohol || 'NIE'}`);
    if (survey.takesSedatives) sections.push(`Środki uspokajające/nasenne/narkotyki: TAK — ${survey.sedativesDetails || '(brak szczegółów)'}`);
    else sections.push('Środki uspokajające/nasenne: NIE');
    sections.push('');

    // Kobiety
    if (formData.gender === 'F') {
        sections.push('--- PYTANIA DLA KOBIET ---');
        sections.push(`Ciąża: ${yn(survey.isPregnant)}${survey.isPregnant && survey.pregnancyMonth ? ` — miesiąc: ${survey.pregnancyMonth}` : ''}`);
        if (survey.lastPeriod) sections.push(`Ostatnia miesiączka: ${survey.lastPeriod}`);
        sections.push(`Antykoncepcja doustna: ${yn(survey.usesContraceptives)}`);
        sections.push('');
    }

    sections.push(`[Dane z e-karty cyfrowej ${date}]`);
    const medicalNotes = sections.join('\n');

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

    // 5. Send to Prodentis API (synchronous — Vercel kills fire-and-forget)
    const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
    const prodentisKey = process.env.PRODENTIS_API_KEY || '';

    let prodentisStatus = 'pending';
    let prodentisPatientId = tokenRow.prodentis_patient_id || null;
    let prodentisError = '';

    if (prodentisKey) {
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

            if (prodentisPatientId) {
                // Known patient → PATCH existing + add notes
                const patchRes = await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                    body: JSON.stringify(patientPayload),
                    signal: AbortSignal.timeout(10000),
                });
                if (patchRes.ok) {
                    await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                        body: JSON.stringify({ category: 'medical_intake', text: medicalNotes, appendMode: true }),
                        signal: AbortSignal.timeout(10000),
                    });
                    prodentisStatus = 'sent';
                }
            } else {
                // New patient → POST create
                const createRes = await fetch(`${prodentisUrl}/api/patients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                    body: JSON.stringify(patientPayload),
                    signal: AbortSignal.timeout(10000),
                });
                const result = await createRes.json();

                if (createRes.status === 201 && result.prodentisId) {
                    // Created successfully — now also write notes to XML field
                    prodentisPatientId = result.prodentisId;
                    await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                        body: JSON.stringify({ category: 'medical_intake', text: medicalNotes, appendMode: true }),
                        signal: AbortSignal.timeout(10000),
                    });
                    prodentisStatus = 'sent';
                } else if (result.error === 'PATIENT_EXISTS' && result.prodentisId) {
                    // PESEL conflict → PATCH + notes
                    prodentisPatientId = result.prodentisId;
                    await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                        body: JSON.stringify(patientPayload),
                        signal: AbortSignal.timeout(10000),
                    });
                    await fetch(`${prodentisUrl}/api/patients/${prodentisPatientId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                        body: JSON.stringify({ category: 'medical_intake', text: medicalNotes, appendMode: true }),
                        signal: AbortSignal.timeout(10000),
                    });
                    prodentisStatus = 'sent';
                } else {
                    prodentisStatus = 'failed';
                    prodentisError = result.error || `HTTP ${createRes.status}`;
                }
            }
        } catch (e: any) {
            console.error('Prodentis send failed:', e.message);
            prodentisStatus = 'failed';
            prodentisError = e.message;
        }
    }

    // 6. Update submission with Prodentis result
    await supabase.from('patient_intake_submissions')
        .update({
            prodentis_status: prodentisStatus,
            prodentis_patient_id: prodentisPatientId,
            prodentis_error: prodentisError || null,
        })
        .eq('id', submission.id);

    // 7. Auto-generate e-karta PDF (read full submission, generate, upload)
    let pdfUrl: string | null = null;
    try {
        const { data: fullSubmission } = await supabase
            .from('patient_intake_submissions')
            .select('*')
            .eq('id', submission.id)
            .single();

        if (fullSubmission) {
            const pdfBytes = await generateEKartaPdf(fullSubmission);
            const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
            const firstName = formData.firstName || 'Pacjent';
            const lastName = formData.lastName || '';
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `ekarta_${firstName}_${lastName}_${dateStr}.pdf`.replace(/\s+/g, '_');
            const resolvedProdentisId = prodentisPatientId || tokenRow.prodentis_patient_id || 'unknown';
            const storagePath = `${resolvedProdentisId}/${fileName}`;

            const { error: pdfUploadErr } = await supabase.storage
                .from('consents')
                .upload(storagePath, Buffer.from(pdfBytes), {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (!pdfUploadErr) {
                const { data: urlData } = supabase.storage.from('consents').getPublicUrl(storagePath);
                pdfUrl = urlData?.publicUrl || storagePath;

                await supabase.from('patient_intake_submissions')
                    .update({ pdf_url: pdfUrl })
                    .eq('id', submission.id);

                // Upload to Prodentis documents
                if (resolvedProdentisId && resolvedProdentisId !== 'unknown' && prodentisKey) {
                    try {
                        await fetch(`${prodentisUrl}/api/patients/${resolvedProdentisId}/documents`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                            body: JSON.stringify({
                                fileBase64: pdfBase64,
                                fileName,
                                description: `E-Karta pacjenta — ${firstName} ${lastName} — ${dateStr}`,
                            }),
                            signal: AbortSignal.timeout(10000),
                        });
                        console.log(`[IntakeSubmit] PDF uploaded to Prodentis for patient ${resolvedProdentisId}`);
                    } catch (pe) {
                        console.error('[IntakeSubmit] PDF Prodentis upload error:', pe);
                    }
                }
            } else {
                console.error('[IntakeSubmit] PDF upload to Supabase failed:', pdfUploadErr);
            }
        }
    } catch (pdfErr) {
        console.error('[IntakeSubmit] PDF generation error:', pdfErr);
    }

    return NextResponse.json({
        success: true,
        submissionId: submission.id,
        prodentisStatus,
        prodentisPatientId,
        pdfUrl,
    });
}
