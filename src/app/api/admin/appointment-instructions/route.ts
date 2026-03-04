import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/appointment-instructions
 * Auth: admin required.
 */
export async function GET(req: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: instructions, error } = await supabase
            .from('appointment_instructions')
            .select('*')
            .order('appointment_type', { ascending: true });

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        return NextResponse.json({
            instructions: instructions || []
        });

    } catch (error) {
        console.error('[Admin Appointment Instructions] GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
