import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/patient-consents
 * Returns all signed consents with biometric data for admin viewer.
 * Auth: admin required.
 */
export async function GET(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = req.nextUrl.searchParams.get('id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    try {
        if (id) {
            // Single consent with full details
            const { data, error } = await supabase
                .from('patient_consents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        }

        // List consents (without heavy biometric data)
        const { data, error, count } = await supabase
            .from('patient_consents')
            .select('id, patient_name, prodentis_patient_id, consent_type, consent_label, file_url, file_name, signed_at, prodentis_synced, created_by, biometric_data', { count: 'exact' })
            .order('signed_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // For list view, only include biometric summary (not full strokes)
        const simplified = (data || []).map(c => {
            const bio = c.biometric_data;
            return {
                ...c,
                biometric_data: bio ? {
                    hasData: true,
                    pointCount: bio.pointCount || 0,
                    avgPressure: bio.avgPressure || 0,
                    maxPressure: bio.maxPressure || 0,
                    totalDuration: bio.totalDuration || 0,
                    pointerType: bio.deviceInfo?.pointerType || 'unknown',
                    strokeCount: bio.strokes?.length || 0,
                } : null,
            };
        });

        return NextResponse.json({ consents: simplified, total: count });
    } catch (err: any) {
        console.error('[AdminConsents] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
