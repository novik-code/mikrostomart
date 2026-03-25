import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TEMPLATE_SECTIONS } from '@/lib/templateSections';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Detect active template from saved theme config
async function getActiveTemplate(): Promise<string> {
    try {
        const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'theme')
            .single();
        if (data?.value?.navbar?.logoText) {
            // Try to match logoText to a preset
            const logo = data.value.navbar.logoText;
            if (logo === 'DENSFLOW') return 'densflow-light';
            if (logo === 'DENTAL LUXE') return 'dental-luxe';
            if (logo === 'FRESH SMILE') return 'fresh-smile';
            if (logo === 'NORDIC DENTAL') return 'nordic-dental';
            if (logo === 'WARM CARE') return 'warm-care';
        }
    } catch { /* ignore */ }

    // Demo mode defaults to densflow-light
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return 'densflow-light';

    return 'default-gold';
}

// Public GET — returns current sections config
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'sections')
            .single();

        if (error || !data || !Array.isArray(data.value) || data.value.length === 0) {
            // No custom sections saved — return template-specific defaults
            const template = await getActiveTemplate();
            const templateSections = TEMPLATE_SECTIONS[template] || TEMPLATE_SECTIONS['default-gold'];
            return NextResponse.json(templateSections, {
                headers: { 'Cache-Control': 'no-store, max-age=0' }
            });
        }

        return NextResponse.json(data.value, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch {
        return NextResponse.json([]);
    }
}
