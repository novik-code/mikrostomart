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
 * GET /api/employee/tasks?status=todo&assignedTo=doctorId&mine=true
 * 
 * Lists all tasks. Optional filters:
 * - status: 'todo' | 'in_progress' | 'done'
 * - assignedTo: Prodentis doctor ID
 * - mine: 'true' to filter by current user's tasks
 */
export async function GET(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const assignedTo = url.searchParams.get('assignedTo');

    let query = supabase
        .from('employee_tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }
    if (assignedTo) {
        query = query.eq('assigned_to_doctor_id', assignedTo);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[Tasks] Error listing tasks:', error);
        return NextResponse.json({ error: 'Failed to list tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [] });
}

/**
 * POST /api/employee/tasks
 * 
 * Creates a new task.
 * Body: { title, description?, status?, priority?, patient_id?, patient_name?,
 *         appointment_type?, due_date?, linked_appointment_date?, linked_appointment_info?,
 *         assigned_to_doctor_id?, assigned_to_doctor_name? }
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const body = await req.json();

        if (!body.title || body.title.trim().length === 0) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const task = {
            title: body.title.trim(),
            description: body.description?.trim() || null,
            status: body.status || 'todo',
            priority: body.priority || 'normal',
            patient_id: body.patient_id || null,
            patient_name: body.patient_name || null,
            appointment_type: body.appointment_type || null,
            due_date: body.due_date || null,
            linked_appointment_date: body.linked_appointment_date || null,
            linked_appointment_info: body.linked_appointment_info || null,
            assigned_to_doctor_id: body.assigned_to_doctor_id || null,
            assigned_to_doctor_name: body.assigned_to_doctor_name || null,
            created_by: user.id,
            created_by_email: user.email,
        };

        const { data, error } = await supabase
            .from('employee_tasks')
            .insert(task)
            .select()
            .single();

        if (error) {
            console.error('[Tasks] Error creating task:', error);
            return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
        }

        console.log(`[Tasks] Created task "${task.title}" by ${user.email}`);
        return NextResponse.json({ task: data }, { status: 201 });

    } catch (error: any) {
        console.error('[Tasks] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
