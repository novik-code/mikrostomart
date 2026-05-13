import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/appointments/reset-confirmation
 *
 * Admin-only diagnostic tool. Clears attendance_confirmed flags on an
 * appointment_action so the same SMS confirmation link can be tested
 * again with the same patient. Does NOT remove the smile icon from
 * Prodentis — that has to be cleared manually in the schedule.
 *
 * Body: { appointment_action_id: string }
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    try {
        const { appointment_action_id } = await req.json();
        if (!appointment_action_id || typeof appointment_action_id !== 'string') {
            return NextResponse.json({ error: 'Missing appointment_action_id' }, { status: 400 });
        }

        const { data: existing, error: fetchErr } = await supabase
            .from('appointment_actions')
            .select('id, attendance_confirmed, status')
            .eq('id', appointment_action_id)
            .single();

        if (fetchErr || !existing) {
            return NextResponse.json({ error: 'Appointment action not found' }, { status: 404 });
        }

        const { error: updateErr } = await supabase
            .from('appointment_actions')
            .update({
                attendance_confirmed: false,
                attendance_confirmed_at: null,
                status: 'pending',
                updated_at: new Date().toISOString(),
                last_updated_by: user.email,
            })
            .eq('id', appointment_action_id);

        if (updateErr) {
            console.error('[Reset Confirmation] Update error:', updateErr);
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        console.log(`[Reset Confirmation] ${user.email} reset ${appointment_action_id} (was confirmed=${existing.attendance_confirmed}, status=${existing.status})`);

        return NextResponse.json({
            success: true,
            message: 'Potwierdzenie cofnięte. Pacjent może ponownie kliknąć link SMS. UWAGA: ikona w Prodentis pozostała — usuń ręcznie w grafiku jeśli chcesz pełen retest.',
        });
    } catch (error) {
        console.error('[Reset Confirmation] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
