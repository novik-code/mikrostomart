import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Public GET — returns current theme config
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'theme')
            .single();

        if (error || !data) {
            return NextResponse.json({}, {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
            });
        }

        return NextResponse.json(data.value, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
        });
    } catch {
        return NextResponse.json({});
    }
}
