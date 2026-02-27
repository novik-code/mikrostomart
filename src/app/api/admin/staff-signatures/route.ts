import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/staff-signatures — list active staff signatures
 * POST /api/admin/staff-signatures — save/update a signature
 * DELETE /api/admin/staff-signatures?id=... — deactivate a signature
 */
export async function GET() {
    const { data, error } = await supabase
        .from('staff_signatures')
        .select('*')
        .eq('is_active', true)
        .order('staff_name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const { staffName, role, signatureData } = await req.json();

    if (!staffName || !signatureData) {
        return NextResponse.json({ error: 'staffName and signatureData required' }, { status: 400 });
    }

    // Upsert — deactivate old signature for same person, insert new
    await supabase
        .from('staff_signatures')
        .update({ is_active: false })
        .eq('staff_name', staffName)
        .eq('is_active', true);

    const { data, error } = await supabase
        .from('staff_signatures')
        .insert({
            staff_name: staffName,
            role: role || 'lekarz',
            signature_data: signatureData,
        })
        .select('id')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
        .from('staff_signatures')
        .update({ is_active: false })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
