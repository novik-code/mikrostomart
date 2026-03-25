import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { demoSanitize } from '@/lib/brandConfig';

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
// Target: max ~120 chars per template (short link adds ~36 chars → total ≤ 160 for 1 SMS)
const DEFAULT_TEMPLATES = [
    { key: 'default', label: 'Domyślny', template: 'Mikrostomart: wizyta u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:pierwsza wizyta', label: 'Pierwsza wizyta', template: 'Mikrostomart: pierwsza wizyta u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:chirurgia', label: 'Chirurgia', template: 'Mikrostomart: zabieg chirurgiczny u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:protetyka', label: 'Protetyka', template: 'Mikrostomart: wizyta protetyczna u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:ortodoncja', label: 'Ortodoncja', template: 'Mikrostomart: wizyta ortodontyczna u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:kontrola', label: 'Kontrola', template: 'Mikrostomart: kontrola u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:higienizacja', label: 'Higienizacja', template: 'Mikrostomart: higienizacja u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:endodoncja', label: 'Endodoncja (kanałowe)', template: 'Mikrostomart: leczenie kanalowe u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:konsultacja', label: 'Konsultacja', template: 'Mikrostomart: konsultacja u {doctor} jutro o {time}. Potwierdz:' },
    { key: 'byType:laser', label: 'Laser', template: 'Mikrostomart: zabieg laserowy u {doctor} jutro o {time}. Potwierdz:' },
    // Post-visit SMS templates (added Feb 2026)
    { key: 'post_visit_review', label: 'Po wizycie — prośba o recenzję', template: 'Dziękujemy za wizytę, {patientFirstName}! 😊 Podziel się z nami swoją opinią: {surveyUrl} A jeśli możesz — zostaw gwiazdki w Google. Dziękujemy!' },
    { key: 'post_visit_reviewed', label: 'Po wizycie — pacjent z recenzją', template: 'Dziękujemy za wizytę, {patientFirstName}! 😊 {funFact} Do zobaczenia! — Zespół Mikrostomart' },
    // Week-after-visit (app promotion, Feb 2026)
    { key: 'week_after_visit', label: 'Tydzień po wizycie — aplikacja', template: 'Dziekujemy, ze jestes naszym pacjentem! 😊 Miej Mikrostomart zawsze przy sobie - pobierz aplikacje na telefon: {appUrl}' },
];

async function ensureTemplatesSeeded() {
    // Instead of "seed only when empty", we upsert each default template by key.
    // This guarantees that new templates added in later code versions
    // always appear in the DB, even when the table already has rows.
    const { data: existing } = await supabase
        .from('sms_templates')
        .select('key');

    const existingKeys = new Set((existing || []).map((t: any) => t.key as string));
    const missing = DEFAULT_TEMPLATES.filter(t => !existingKeys.has(t.key));

    if (missing.length === 0) return; // all present

    console.log(`[SMS Templates] Seeding ${missing.length} missing template(s):`, missing.map(t => t.key));
    const { error } = await supabase
        .from('sms_templates')
        .insert(missing.map(t => ({
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
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
