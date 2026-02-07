import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/short-links/[code]
 * 
 * Resolve short link and return destination URL
 * Also tracks click analytics
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        console.log('[SHORT-LINK] Resolving:', code);

        // Find short link
        const { data: link, error } = await supabase
            .from('short_links')
            .select('*')
            .eq('short_code', code)
            .single();

        if (error || !link) {
            console.error('[SHORT-LINK] Not found:', error);
            return NextResponse.json(
                { error: 'Link not found' },
                { status: 404 }
            );
        }

        // Check if expired
        if (link.expires_at) {
            const expiresAt = new Date(link.expires_at);
            if (expiresAt < new Date()) {
                return NextResponse.json(
                    { error: 'Link expired' },
                    { status: 410 }
                );
            }
        }

        // Update click count (fire and forget)
        (async () => {
            try {
                await supabase
                    .from('short_links')
                    .update({
                        click_count: (link.click_count || 0) + 1,
                        last_clicked_at: new Date().toISOString()
                    })
                    .eq('id', link.id);
            } catch (e) {
                console.error('[SHORT-LINK] Click count update failed:', e);
            }
        })();

        return NextResponse.json({
            destinationUrl: link.destination_url,
            appointmentType: link.appointment_type
        });

    } catch (error) {
        console.error('[SHORT-LINK] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
