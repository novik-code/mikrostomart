import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/staff-signatures
 * Public read-only endpoint for active staff signatures.
 * Used by the consent signing page (/zgody/[token]) to embed doctor signatures in PDFs.
 * Only returns active signatures — no auth required (data is not sensitive).
 */
export async function GET() {
    const { data, error } = await supabase
        .from('staff_signatures')
        .select('id, staff_name, role, signature_data')
        .eq('is_active', true)
        .order('staff_name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
