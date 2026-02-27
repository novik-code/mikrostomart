import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CONSENT_TYPES } from '@/lib/consentTypes';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
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
        const { token, consentType, signedPdfBase64, signatureDataUrl } = await req.json();

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

        // Sync to Prodentis — add note with link to signed consent PDF
        // (The /api/patients/:id/documents endpoint creates a local file path reference
        //  but doesn't write the file to disk. Using /notes instead with a clickable link.)
        let prodentisSynced = false;
        if (tokenRow.prodentis_patient_id) {
            try {
                const noteText = `=== ZGODA PODPISANA ${date} ===\n` +
                    `Typ: ${consentInfo.label}\n` +
                    `Pacjent: ${tokenRow.patient_name}\n` +
                    `Plik: ${fileUrl}\n` +
                    `Status: Podpisano elektronicznie na tablecie`;

                const prodentisRes = await fetch(
                    `${PRODENTIS_API}/api/patients/${tokenRow.prodentis_patient_id}/notes`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': PRODENTIS_API_KEY,
                        },
                        body: JSON.stringify({
                            category: 'consent',
                            text: noteText,
                            appendMode: true,
                        }),
                    }
                );

                if (prodentisRes.ok) {
                    prodentisSynced = true;
                    console.log(`[ConsentSign] Note added to Prodentis for patient ${tokenRow.prodentis_patient_id}`);
                } else {
                    const errText = await prodentisRes.text();
                    console.error('[ConsentSign] Prodentis note failed:', errText);
                }
            } catch (e) {
                console.error('[ConsentSign] Prodentis note error:', e);
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
                created_by: tokenRow.created_by || null,
                prodentis_synced: prodentisSynced,
                metadata: {},
            })
            .select('id')
            .single();

        if (insertErr) throw insertErr;

        return NextResponse.json({
            success: true,
            consentId: consent.id,
            fileName,
            fileUrl,
            prodentisSynced,
        });
    } catch (err: any) {
        console.error('[ConsentSign] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
