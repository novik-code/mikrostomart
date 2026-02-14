import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Human-readable field labels for history
const FIELD_LABELS: Record<string, string> = {
    title: 'Tytuł',
    description: 'Opis',
    status: 'Status',
    priority: 'Priorytet',
    task_type: 'Typ zadania',
    due_date: 'Termin',
    assigned_to_doctor_name: 'Przypisano do',
    image_url: 'Zdjęcie',
};

/**
 * GET /api/employee/tasks/:id?history=true
 * 
 * Returns the task's edit history.
 */
export async function GET(
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

    const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', id)
        .order('changed_at', { ascending: false });

    if (error) {
        console.error('[TaskHistory] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    return NextResponse.json({ history: data || [] });
}

/**
 * PATCH /api/employee/tasks/:id
 * 
 * Updates a task and records changes in task_history.
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
            'task_type', 'checklist_items', 'image_url',
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

        // Fetch current task before updating (for diff)
        const { data: oldTask } = await supabase
            .from('employee_tasks')
            .select('*')
            .eq('id', id)
            .single();

        // Perform the update
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

        // Record history if we have the old task
        if (oldTask) {
            try {
                // Determine change type
                let changeType = 'edit';
                if ('status' in body && Object.keys(body).length === 1) {
                    changeType = 'status';
                } else if ('checklist_items' in body && Object.keys(body).length === 1) {
                    changeType = 'checklist';
                }

                // Build changes object
                const changes: Record<string, any> = {};

                if (changeType === 'checklist') {
                    // Find which checklist items changed
                    const oldItems = oldTask.checklist_items || [];
                    const newItems = body.checklist_items || [];
                    for (let i = 0; i < newItems.length; i++) {
                        if (oldItems[i] && oldItems[i].done !== newItems[i].done) {
                            changes[`checklist_${i}`] = {
                                item: newItems[i].label,
                                done: newItems[i].done,
                            };
                        }
                    }
                } else {
                    // Compare field-by-field
                    for (const field of allowedFields) {
                        if (field in body && field !== 'checklist_items') {
                            const oldVal = oldTask[field];
                            const newVal = body[field];
                            // Only record if actually changed
                            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                changes[field] = {
                                    old: oldVal ?? null,
                                    new: newVal ?? null,
                                };
                            }
                        }
                    }
                }

                // Only insert if there are actual changes
                if (Object.keys(changes).length > 0) {
                    await supabase.from('task_history').insert({
                        task_id: id,
                        changed_by: user.email,
                        change_type: changeType,
                        changes,
                    });
                }
            } catch (histErr) {
                // Don't fail the update if history insert fails
                console.error('[TaskHistory] Error recording history:', histErr);
            }
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
