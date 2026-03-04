import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';

/**
 * Admin API for Booking Settings
 *
 * GET  - Public (needed by booking form). Returns { min_days_ahead: number }
 * PUT  - Admin only. Body: { min_days_ahead: number }
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/admin/booking-settings — public, returns current setting */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('booking_settings')
            .select('min_days_ahead')
            .eq('id', 1)
            .single();

        if (error) {
            console.warn('[booking-settings] DB error, returning default:', error.message);
            return NextResponse.json({ min_days_ahead: 1 });
        }

        return NextResponse.json({ min_days_ahead: data?.min_days_ahead ?? 1 });
    } catch (err: any) {
        console.error('[booking-settings] GET error:', err);
        return NextResponse.json({ min_days_ahead: 1 });
    }
}

/** PUT /api/admin/booking-settings — admin only, updates setting */
export async function PUT(req: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { min_days_ahead } = body;

        if (typeof min_days_ahead !== 'number' || min_days_ahead < 0 || min_days_ahead > 90) {
            return NextResponse.json(
                { error: 'min_days_ahead must be a number between 0 and 90' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('booking_settings')
            .upsert({ id: 1, min_days_ahead, updated_at: new Date().toISOString() })
            .eq('id', 1);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, min_days_ahead });
    } catch (err: any) {
        console.error('[booking-settings] PUT error:', err);
        return NextResponse.json(
            { error: err.message || 'Unknown error' },
            { status: 500 }
        );
    }
}
