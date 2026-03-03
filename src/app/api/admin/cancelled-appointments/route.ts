import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/cancelled-appointments
 * Returns list of cancelled appointments, sorted newest first.
 * Optional query params: ?limit=50&offset=0
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const { data, error, count } = await supabase
            .from('cancelled_appointments')
            .select('*', { count: 'exact' })
            .order('cancelled_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[CancelledAppts] Error:', error);
            return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
        }

        return NextResponse.json({
            appointments: data || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (err: any) {
        console.error('[CancelledAppts] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
