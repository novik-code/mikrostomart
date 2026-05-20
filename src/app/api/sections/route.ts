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

        const template = await getActiveTemplate();
        const templateSections = TEMPLATE_SECTIONS[template] || TEMPLATE_SECTIONS['default-gold'];

        if (error || !data || !Array.isArray(data.value) || data.value.length === 0) {
            // No custom sections saved — return template-specific defaults
            return NextResponse.json(templateSections, {
                headers: { 'Cache-Control': 'no-store, max-age=0' }
            });
        }

        // Auto-merge: DB sections + brakujące template defaults (auto-inject new
        // section types added to template po DB write, np. K-2 trust-stats).
        // Pozwala dodać nową sekcję do default template bez wymuszania manual
        // resave site_settings przez admin panel.
        const dbSections = data.value;
        const dbByType = new Map(dbSections.map((s: any) => [s.type, s]));
        const dbTypes = new Set(dbSections.map((s: any) => s.type));
        const missing = templateSections.filter(t => !dbTypes.has(t.type));

        if (missing.length === 0) {
            return NextResponse.json(dbSections, {
                headers: { 'Cache-Control': 'no-store, max-age=0' }
            });
        }

        // Template ordering jest source of truth dla pozycji. Dla każdej sekcji
        // template: jeśli istnieje w DB → użyj DB config (visible/config) z template
        // order; jeśli nie → użyj template version. Sekcje w DB ale nie w template
        // (np. custom cta-banner-X dodane przez admin) dopisz na końcu.
        const merged: any[] = templateSections.map((t, idx) => {
            const dbVer = dbByType.get(t.type);
            if (dbVer) {
                return { ...dbVer, order: idx }; // zachowaj DB config, użyj template order
            }
            return { ...t, order: idx };
        });
        const extraDbSections = dbSections.filter((s: any) =>
            !templateSections.some(t => t.type === s.type)
        );
        extraDbSections.forEach((s: any, idx: number) => {
            merged.push({ ...s, order: templateSections.length + idx });
        });

        return NextResponse.json(merged, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch {
        return NextResponse.json([]);
    }
}
