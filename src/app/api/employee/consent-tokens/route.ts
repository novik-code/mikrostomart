import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { getConsentTypesFromDB } from '@/lib/consentTypes';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { demoSanitize } from '@/lib/brandConfig';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/consent-tokens
 * Creates a token for tablet consent signing.
 * Auth: employee or admin role required.
 * Body: { patientName, prodentisPatientId?, consentTypes: string[] }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { patientName, prodentisPatientId, consentTypes } = await req.json();

        if (!patientName || !consentTypes?.length) {
            return NextResponse.json({ error: 'patientName and consentTypes required' }, { status: 400 });
        }

        // Validate consent types from DB
        const CONSENT_TYPES = await getConsentTypesFromDB();
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

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
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
 * Auth: employee or admin role required.
 */
export async function GET() {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
