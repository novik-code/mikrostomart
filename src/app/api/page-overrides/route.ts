import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Public GET — returns page overrides for rendering
// No auth required — these are applied to all visitors
export async function GET() {
    try {
        const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'page_overrides')
            .maybeSingle();

        return NextResponse.json(data?.value || {});
    } catch {
        return NextResponse.json({});
    }
}
