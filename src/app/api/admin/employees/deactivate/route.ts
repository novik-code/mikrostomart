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
 * Body: { id?: string, email?: string }  — at least one required
 */
export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, email } = await request.json();

        if (!id && !email) {
            return NextResponse.json({ error: 'id or email is required' }, { status: 400 });
        }

        // 1. Find the employee
        let query = supabase.from('employees').select('*');
        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.eq('email', email);
        }
        const { data: employee } = await query.single();

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // 2. Set is_active = false
        await supabase.from('employees')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', employee.id);

        // 3. Remove employee role from user_roles (if they have an email)
        if (employee.email) {
            await supabase.from('user_roles')
                .delete()
                .eq('email', employee.email)
                .eq('role', 'employee');
        }

        // 4. Remove their push subscriptions
        if (employee.user_id) {
            await supabase.from('push_subscriptions')
                .delete()
                .eq('user_id', employee.user_id)
                .eq('user_type', 'employee');
        }

        console.log(`[Deactivate] Employee ${employee.name || employee.email || employee.id} deactivated by ${user.email}`);

        return NextResponse.json({
            success: true,
            message: `Pracownik ${employee.name || employee.email} dezaktywowany`,
        });
    } catch (error: any) {
        console.error('[Deactivate] Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/employees/deactivate
 * RE-ACTIVATE a previously deactivated employee.
 * Body: { id: string }
 */
export async function PATCH(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        await supabase.from('employees')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', id);

        console.log(`[Reactivate] Employee ${id} reactivated by ${user.email}`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Reactivate] Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
