import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
const PRODENTIS_API_KEY = process.env.PRODENTIS_API_KEY || '2c9bd5b4-5090-4007-8f06-936811bd0947';

const polishToAscii = (str: string) => str
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/Ą/g, 'A').replace(/Ć/g, 'C').replace(/Ę/g, 'E')
    .replace(/Ł/g, 'L').replace(/Ń/g, 'N').replace(/Ó/g, 'O')
    .replace(/Ś/g, 'S').replace(/Ź/g, 'Z').replace(/Ż/g, 'Z')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_');

/**
 * POST /api/employee/export-biometric
 * Exports signature PNG + biometric JSON to Prodentis documents API.
 * Body: { consentId }
 */
export async function POST(req: NextRequest) {
    try {
        const { consentId } = await req.json();

        if (!consentId) {
            return NextResponse.json({ error: 'consentId required' }, { status: 400 });
        }

        // Fetch consent with full biometric data
        const { data: consent, error } = await supabase
            .from('patient_consents')
            .select('id, patient_name, prodentis_patient_id, consent_type, consent_label, signature_data, biometric_data, signed_at, metadata')
            .eq('id', consentId)
            .single();

        if (error || !consent) {
            return NextResponse.json({ error: 'Consent not found' }, { status: 404 });
        }

        if (!consent.prodentis_patient_id) {
            return NextResponse.json({ error: 'No Prodentis patient ID — cannot export' }, { status: 400 });
        }

        const date = new Date(consent.signed_at).toISOString().slice(0, 10);
        const safeName = polishToAscii(consent.patient_name);
        const safeType = polishToAscii(consent.consent_type);
        const results: { signatureExported: boolean; biometricExported: boolean; errors: string[] } = {
            signatureExported: false,
            biometricExported: false,
            errors: [],
        };

        // 1. Export signature as PNG
        if (consent.signature_data) {
            try {
                // signature_data is a data URL: "data:image/png;base64,..."
                const base64Match = consent.signature_data.match(/^data:image\/\w+;base64,(.+)$/);
                const pngBase64 = base64Match ? base64Match[1] : consent.signature_data;
                const signatureFileName = `Podpis_${safeType}_${safeName}_${date}.png`;

                const res = await fetch(
                    `${PRODENTIS_API}/api/patients/${consent.prodentis_patient_id}/documents`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': PRODENTIS_API_KEY,
                        },
                        body: JSON.stringify({
                            fileBase64: pngBase64,
                            fileName: signatureFileName,
                            description: `Podpis biometryczny — ${consent.consent_label} (${date})`,
                        }),
                    }
                );

                if (res.ok) {
                    results.signatureExported = true;
                    console.log(`[ExportBiometric] Signature PNG exported for consent ${consentId}`);
                } else {
                    const errText = await res.text();
                    results.errors.push(`Signature upload failed: ${errText}`);
                    console.error(`[ExportBiometric] Signature upload failed:`, errText);
                }
            } catch (e: any) {
                results.errors.push(`Signature export error: ${e.message}`);
                console.error(`[ExportBiometric] Signature export error:`, e);
            }
        } else {
            results.errors.push('No signature data available');
        }

        // 2. Export biometric data as JSON
        if (consent.biometric_data) {
            try {
                const biometricJson = JSON.stringify(consent.biometric_data, null, 2);
                const jsonBase64 = Buffer.from(biometricJson, 'utf-8').toString('base64');
                const biometricFileName = `Biometria_${safeType}_${safeName}_${date}.json`;

                const res = await fetch(
                    `${PRODENTIS_API}/api/patients/${consent.prodentis_patient_id}/documents`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': PRODENTIS_API_KEY,
                        },
                        body: JSON.stringify({
                            fileBase64: jsonBase64,
                            fileName: biometricFileName,
                            description: `Dane biometryczne podpisu — ${consent.consent_label} (${date})`,
                        }),
                    }
                );

                if (res.ok) {
                    results.biometricExported = true;
                    console.log(`[ExportBiometric] Biometric JSON exported for consent ${consentId}`);
                } else {
                    const errText = await res.text();
                    results.errors.push(`Biometric upload failed: ${errText}`);
                    console.error(`[ExportBiometric] Biometric upload failed:`, errText);
                }
            } catch (e: any) {
                results.errors.push(`Biometric export error: ${e.message}`);
                console.error(`[ExportBiometric] Biometric export error:`, e);
            }
        } else {
            results.errors.push('No biometric data available');
        }

        // 3. Update metadata with export status
        const existingMeta = consent.metadata || {};
        await supabase
            .from('patient_consents')
            .update({
                metadata: {
                    ...existingMeta,
                    biometric_exported_at: new Date().toISOString(),
                    biometric_export_results: results,
                },
            })
            .eq('id', consentId);

        return NextResponse.json({
            success: results.signatureExported || results.biometricExported,
            ...results,
        });
    } catch (err: any) {
        console.error('[ExportBiometric] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
