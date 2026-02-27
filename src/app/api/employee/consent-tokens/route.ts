import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { CONSENT_TYPES } from '@/lib/consentTypes';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/consent-tokens
 * Creates a token for tablet consent signing.
 * Body: { patientName, prodentisPatientId?, consentTypes: string[] }
 */
export async function POST(req: NextRequest) {
    try {
        const { patientName, prodentisPatientId, consentTypes } = await req.json();

        if (!patientName || !consentTypes?.length) {
            return NextResponse.json({ error: 'patientName and consentTypes required' }, { status: 400 });
        }

        // Validate consent types
        const invalid = consentTypes.filter((ct: string) => !CONSENT_TYPES[ct]);
        if (invalid.length) {
            return NextResponse.json({ error: `Invalid consent types: ${invalid.join(', ')}` }, { status: 400 });
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        const { data, error } = await supabase
            .from('consent_tokens')
            .insert({
                token,
                patient_name: patientName,
                prodentis_patient_id: prodentisPatientId || null,
                consent_types: consentTypes,
                expires_at: expiresAt.toISOString(),
            })
            .select('id, token')
            .single();

        if (error) throw error;

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mikrostomart.pl';
        const url = `${baseUrl}/zgody/${token}`;

        return NextResponse.json({
            success: true,
            token: data.token,
            url,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (err: any) {
        console.error('[ConsentTokens] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/employee/consent-tokens
 * Lists recent consent tokens.
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('consent_tokens')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({ tokens: data });
    } catch (err: any) {
        console.error('[ConsentTokens] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
