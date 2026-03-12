import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/employees/deactivate
 * Deactivates (hides) an employee from the app.
 * Sets is_active=false in the employees table.
 * The employee will no longer appear in:
 *   - Task assignment dropdowns
 *   - Push notification recipients
 *   - Staff listings
 * They remain in Prodentis (external system) — no data is deleted.
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Set is_active = false in employees table
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('email', email)
            .select()
            .single();

        if (empError && empError.code !== 'PGRST116') {
            console.error('[Deactivate] employees update error:', empError);
        }

        // 2. Remove employee role from user_roles (so they can't log in to employee zone)
        const { error: roleError } = await supabase
            .from('user_roles')
            .delete()
            .eq('email', email)
            .eq('role', 'employee');

        if (roleError) {
            console.error('[Deactivate] user_roles delete error:', roleError);
        }

        // 3. Remove their push subscriptions
        if (employee?.user_id) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', employee.user_id)
                .eq('user_type', 'employee');
        }

        console.log(`[Deactivate] Employee ${email} deactivated by ${user.email}`);

        return NextResponse.json({
            success: true,
            message: `Pracownik ${email} został dezaktywowany`,
            deactivatedEmployee: employee?.name || email,
        });
    } catch (error: any) {
        console.error('[Deactivate] Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
