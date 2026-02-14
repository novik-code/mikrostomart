import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/employee/tasks/:id
 * 
 * Updates a task. Any field can be updated.
 * Body: partial task object
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await req.json();

        // Only allow updating specific fields
        const allowedFields = [
            'title', 'description', 'status', 'priority',
            'patient_id', 'patient_name', 'appointment_type',
            'due_date', 'linked_appointment_date', 'linked_appointment_info',
            'assigned_to_doctor_id', 'assigned_to_doctor_name',
        ];

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const field of allowedFields) {
            if (field in body) {
                updates[field] = body[field];
            }
        }

        const { data, error } = await supabase
            .from('employee_tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Tasks] Error updating task:', error);
            return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        console.log(`[Tasks] Updated task ${id} by ${user.email}:`, Object.keys(updates));
        return NextResponse.json({ task: data });

    } catch (error: any) {
        console.error('[Tasks] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/employee/tasks/:id
 * 
 * Deletes a task.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const { error } = await supabase
            .from('employee_tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Tasks] Error deleting task:', error);
            return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
        }

        console.log(`[Tasks] Deleted task ${id} by ${user.email}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Tasks] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
