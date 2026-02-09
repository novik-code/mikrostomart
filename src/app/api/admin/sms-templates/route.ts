import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin API for SMS Templates Management
 * 
 * GET    - List all templates
 * PUT    - Update existing template
 * POST   - Add new template
 * DELETE - Delete template
 * 
 * Templates are stored in Supabase 'sms_templates' table.
 * On first GET, seeds the table from smsTemplates.json if empty.
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default templates to seed on first run
// All templates use {doctor} as a variable — matching is ONLY by appointment type
const DEFAULT_TEMPLATES = [
    { key: 'default', label: 'Domyślny', template: 'Gabinet Mikrostomart przypomina o jutrzejszej wizycie u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:pierwsza wizyta', label: 'Pierwsza wizyta', template: 'Gabinet Mikrostomart przypomina o jutrzejszej pierwszej wizycie u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:chirurgia', label: 'Chirurgia', template: 'Gabinet Mikrostomart przypomina o jutrzejszej wizycie chirurgicznej u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:protetyka', label: 'Protetyka', template: 'Gabinet Mikrostomart przypomina o jutrzejszej wizycie protetycznej u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:ortodoncja', label: 'Ortodoncja', template: 'Gabinet Mikrostomart przypomina o jutrzejszej wizycie ortodontycznej u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:kontrola', label: 'Kontrola', template: 'Gabinet Mikrostomart przypomina o jutrzejszej wizycie kontrolnej u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:higienizacja', label: 'Higienizacja', template: 'Gabinet Mikrostomart przypomina o jutrzejszej higienizacji u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:endodoncja', label: 'Endodoncja (kanałowe)', template: 'Gabinet Mikrostomart przypomina o jutrzejszym leczeniu kanałowym u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:konsultacja', label: 'Konsultacja', template: 'Gabinet Mikrostomart przypomina o jutrzejszej konsultacji u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
    { key: 'byType:laser', label: 'Laser', template: 'Gabinet Mikrostomart przypomina o jutrzejszym zabiegu laserowym u {doctor} o godz. {time}. Prosimy o potwierdzenie:' },
];

async function ensureTemplatesSeeded() {
    const { data: existing } = await supabase
        .from('sms_templates')
        .select('id')
        .limit(1);

    if (existing && existing.length > 0) return; // already seeded

    console.log('[SMS Templates] Seeding default templates...');
    const { error } = await supabase
        .from('sms_templates')
        .insert(DEFAULT_TEMPLATES.map(t => ({
            key: t.key,
            label: t.label,
            template: t.template,
            updated_at: new Date().toISOString(),
        })));

    if (error) {
        console.error('[SMS Templates] Seed error:', error);
    }
}

/**
 * GET /api/admin/sms-templates
 * Returns all templates
 */
export async function GET() {
    try {
        await ensureTemplatesSeeded();

        const { data: templates, error } = await supabase
            .from('sms_templates')
            .select('*')
            .order('key');

        if (error) throw new Error(error.message);

        return NextResponse.json({ templates: templates || [] });
    } catch (error) {
        console.error('[Admin SMS Templates] GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/sms-templates
 * Body: { id, template, label? }
 */
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, template, label } = body;

        if (!id || !template) {
            return NextResponse.json(
                { error: 'Missing required fields: id, template' },
                { status: 400 }
            );
        }

        const updateData: any = {
            template,
            updated_at: new Date().toISOString(),
        };
        if (label) updateData.label = label;

        const { data, error } = await supabase
            .from('sms_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, template: data });
    } catch (error) {
        console.error('[Admin SMS Templates] PUT error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/sms-templates
 * Body: { key, label, template }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { key, label, template } = body;

        if (!key || !template) {
            return NextResponse.json(
                { error: 'Missing required fields: key, template' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('sms_templates')
            .insert([{
                key,
                label: label || key,
                template,
                updated_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, template: data });
    } catch (error) {
        console.error('[Admin SMS Templates] POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/sms-templates?id=uuid
 */
export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('sms_templates')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin SMS Templates] DELETE error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
