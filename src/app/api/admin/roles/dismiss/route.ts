import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/roles/dismiss
 * Dismiss a patient from the promotion candidates list.
 * Body: { patientId: string }
 */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const adminUser = auth.user;

    try {
        const { patientId } = await request.json();

        if (!patientId) {
            return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
        }

        const { error } = await supabase
            .from('patients')
            .update({ promotion_dismissed: true })
            .eq('id', patientId);

        if (error) {
            console.error('[Dismiss] Error:', error);
            return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Dismiss] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
