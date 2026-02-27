import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CONSENT_TYPES } from '@/lib/consentTypes';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/consents/sign
 * Accepts signed PDF (base64) and saves to Supabase Storage + DB.
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

        // Build filename
        const date = new Date().toISOString().slice(0, 10);
        const safeName = tokenRow.patient_name.replace(/\s+/g, '_');
        const fileName = `${consentInfo.label}_${safeName}_${date}.pdf`;

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
                prodentis_synced: false,
            })
            .select('id')
            .single();

        if (insertErr) throw insertErr;

        return NextResponse.json({
            success: true,
            consentId: consent.id,
            fileName,
            fileUrl,
        });
    } catch (err: any) {
        console.error('[ConsentSign] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
