import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/consent-mappings
 * Returns all consent type mappings. Public read (consent signing page needs it).
 */
export async function GET() {
    const { data, error } = await supabase
        .from('consent_field_mappings')
        .select('*')
        .eq('is_active', true)
        .order('consent_key');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

/**
 * POST /api/admin/consent-mappings
 * Create a new consent type. Admin only.
 * Body: { consent_key, label, pdf_file, fields? }
 */
export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { consent_key, label, pdf_file, fields } = body;

    if (!consent_key || !label || !pdf_file) {
        return NextResponse.json({ error: 'consent_key, label, pdf_file required' }, { status: 400 });
    }

    // Validate consent_key format (lowercase, alphanumeric + underscore)
    if (!/^[a-z0-9_]+$/.test(consent_key)) {
        return NextResponse.json({ error: 'consent_key must be lowercase alphanumeric with underscores' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('consent_field_mappings')
        .insert({
            consent_key,
            label,
            pdf_file,
            fields: fields || {},
            updated_by: user.email,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: `Typ zgody "${consent_key}" już istnieje` }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}

/**
 * PUT /api/admin/consent-mappings
 * Update consent type fields/label. Admin only.
 * Body: { consent_key, fields?, label?, pdf_file?, is_active? }
 */
export async function PUT(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { consent_key, ...updates } = body;

    if (!consent_key) {
        return NextResponse.json({ error: 'consent_key required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: user.email,
    };

    if (updates.fields !== undefined) updateData.fields = updates.fields;
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.pdf_file !== undefined) updateData.pdf_file = updates.pdf_file;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    const { data, error } = await supabase
        .from('consent_field_mappings')
        .update(updateData)
        .eq('consent_key', consent_key)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(data);
}

/**
 * DELETE /api/admin/consent-mappings
 * Deactivate a consent type (soft delete). Admin only.
 * Body: { consent_key }
 */
export async function DELETE(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { consent_key } = body;

    if (!consent_key) {
        return NextResponse.json({ error: 'consent_key required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('consent_field_mappings')
        .update({ is_active: false, updated_by: user.email, updated_at: new Date().toISOString() })
        .eq('consent_key', consent_key);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
