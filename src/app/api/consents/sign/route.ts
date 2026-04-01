import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getConsentTypesFromDB } from '@/lib/consentTypes';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
const PRODENTIS_API_KEY = process.env.PRODENTIS_API_KEY || '2c9bd5b4-5090-4007-8f06-936811bd0947';

/**
 * POST /api/consents/sign
 * Accepts signed PDF (base64):
 * 1. Saves to Supabase Storage
 * 2. Creates patient_consents record
 * 3. Uploads to Prodentis via API v8.0
 * Body: { token, consentType, signedPdfBase64, signatureDataUrl }
 */
export async function POST(req: NextRequest) {
    try {
        const { token, consentType, signedPdfBase64, signatureDataUrl, biometricData } = await req.json();

        if (!token || !consentType || !signedPdfBase64) {
            return NextResponse.json({ error: 'token, consentType, signedPdfBase64 required' }, { status: 400 });
        }

        // Verify token
        const { data: tokenRow, error: tokenErr } = await supabase
            .from('consent_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenErr || !tokenRow) {
            return NextResponse.json({ error: 'Token nieważny' }, { status: 404 });
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token wygasł' }, { status: 410 });
        }

        if (!tokenRow.consent_types.includes(consentType)) {
            return NextResponse.json({ error: 'Consent type not in token' }, { status: 400 });
        }

        const CONSENT_TYPES = await getConsentTypesFromDB();
        const consentInfo = CONSENT_TYPES[consentType];
        if (!consentInfo) {
            return NextResponse.json({ error: 'Unknown consent type' }, { status: 400 });
        }

        // Build filename — ASCII-only for Prodentis compatibility
        const date = new Date().toISOString().slice(0, 10);
        const polishToAscii = (str: string) => str
            .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
            .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
            .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
            .replace(/Ą/g, 'A').replace(/Ć/g, 'C').replace(/Ę/g, 'E')
            .replace(/Ł/g, 'L').replace(/Ń/g, 'N').replace(/Ó/g, 'O')
            .replace(/Ś/g, 'S').replace(/Ź/g, 'Z').replace(/Ż/g, 'Z')
            .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
            .replace(/_+/g, '_');
        const safeName = polishToAscii(tokenRow.patient_name);
        const safeLabel = polishToAscii(consentType);
        const fileName = `${safeLabel}_${safeName}_${date}.pdf`;

        // Decode base64 to buffer
        const pdfBuffer = Buffer.from(signedPdfBase64, 'base64');

        // Upload to Supabase Storage
        const storagePath = `${tokenRow.prodentis_patient_id || 'unknown'}/${fileName}`;
        const { error: uploadErr } = await supabase
            .storage
            .from('consents')
            .upload(storagePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadErr) {
            console.error('[ConsentSign] Upload error:', uploadErr);
            throw uploadErr;
        }

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('consents')
            .getPublicUrl(storagePath);

        const fileUrl = urlData?.publicUrl || storagePath;

        // Sync to Prodentis — upload PDF to patient's documents
        let prodentisSynced = false;
        let prodentisDocumentId: string | null = null;
        if (tokenRow.prodentis_patient_id) {
            try {
                // Upload actual PDF file via documents API (requires fileBase64 + fileName)
                const prodentisRes = await fetch(
                    `${PRODENTIS_API}/api/patients/${tokenRow.prodentis_patient_id}/documents`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': PRODENTIS_API_KEY,
                        },
                        body: JSON.stringify({
                            fileBase64: signedPdfBase64,
                            fileName: fileName,
                            description: `${consentInfo.label} — podpisano ${date}`,
                        }),
                    }
                );

                if (prodentisRes.ok) {
                    const docResult = await prodentisRes.json();
                    prodentisSynced = true;
                    prodentisDocumentId = docResult.documentId || null;
                    console.log(`[ConsentSign] Document uploaded to Prodentis: ${prodentisDocumentId} for patient ${tokenRow.prodentis_patient_id}`);
                } else {
                    const errText = await prodentisRes.text();
                    console.error('[ConsentSign] Prodentis document upload failed:', errText);
                }
            } catch (e) {
                console.error('[ConsentSign] Prodentis document upload error:', e);
            }
        }

        // Save record
        const { data: consent, error: insertErr } = await supabase
            .from('patient_consents')
            .insert({
                patient_name: tokenRow.patient_name,
                prodentis_patient_id: tokenRow.prodentis_patient_id || null,
                consent_type: consentType,
                consent_label: consentInfo.label,
                file_url: fileUrl,
                file_name: fileName,
                signature_data: signatureDataUrl || null,
                biometric_data: biometricData || null,
                created_by: tokenRow.created_by || null,
                prodentis_synced: prodentisSynced,
                metadata: {},
            })
            .select('id')
            .single();

        if (insertErr) throw insertErr;

        // Auto-export signature + biometric data to Prodentis
        let bioExportResults: any = null;
        if (tokenRow.prodentis_patient_id && (signatureDataUrl || biometricData)) {
            bioExportResults = { signatureExported: false, biometricExported: false, errors: [] as string[] };

            // Export signature PNG
            if (signatureDataUrl) {
                try {
                    const base64Match = signatureDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
                    const pngBase64 = base64Match ? base64Match[1] : signatureDataUrl;
                    const sigFileName = `Podpis_${safeLabel}_${safeName}_${date}.png`;

                    const sigRes = await fetch(
                        `${PRODENTIS_API}/api/patients/${tokenRow.prodentis_patient_id}/documents`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': PRODENTIS_API_KEY },
                            body: JSON.stringify({ fileBase64: pngBase64, fileName: sigFileName, description: `Podpis biometryczny — ${consentInfo.label} (${date})` }),
                        }
                    );
                    if (sigRes.ok) {
                        bioExportResults.signatureExported = true;
                        console.log(`[ConsentSign] Auto-exported signature PNG for consent ${consent.id}`);
                    } else {
                        bioExportResults.errors.push(`Signature: ${await sigRes.text()}`);
                    }
                } catch (e: any) {
                    bioExportResults.errors.push(`Signature: ${e.message}`);
                }
            }

            // Export biometric JSON
            if (biometricData) {
                try {
                    const bioJson = JSON.stringify(biometricData, null, 2);
                    const bioBase64 = Buffer.from(bioJson, 'utf-8').toString('base64');
                    const bioFileName = `Biometria_${safeLabel}_${safeName}_${date}.json`;

                    const bioRes = await fetch(
                        `${PRODENTIS_API}/api/patients/${tokenRow.prodentis_patient_id}/documents`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': PRODENTIS_API_KEY },
                            body: JSON.stringify({ fileBase64: bioBase64, fileName: bioFileName, description: `Dane biometryczne podpisu — ${consentInfo.label} (${date})` }),
                        }
                    );
                    if (bioRes.ok) {
                        bioExportResults.biometricExported = true;
                        console.log(`[ConsentSign] Auto-exported biometric JSON for consent ${consent.id}`);
                    } else {
                        bioExportResults.errors.push(`Biometric: ${await bioRes.text()}`);
                    }
                } catch (e: any) {
                    bioExportResults.errors.push(`Biometric: ${e.message}`);
                }
            }

            // Update consent metadata with export results
            await supabase
                .from('patient_consents')
                .update({
                    metadata: {
                        biometric_auto_exported: true,
                        biometric_exported_at: new Date().toISOString(),
                        biometric_export_results: bioExportResults,
                    },
                })
                .eq('id', consent.id);
        }

        return NextResponse.json({
            success: true,
            consentId: consent.id,
            fileName,
            fileUrl,
            prodentisSynced,
            bioExport: bioExportResults,
        });
    } catch (err: any) {
        console.error('[ConsentSign] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
