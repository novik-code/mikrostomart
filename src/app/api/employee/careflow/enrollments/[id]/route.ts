import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/careflow/enrollments/[id]
 * Full enrollment details with all tasks.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const { id } = await params;

        const { data: enrollment, error } = await supabase
            .from('care_enrollments')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const { data: tasks } = await supabase
            .from('care_tasks')
            .select('*')
            .eq('enrollment_id', id)
            .order('sort_order', { ascending: true });

        const { data: auditLog } = await supabase
            .from('care_audit_log')
            .select('*')
            .eq('enrollment_id', id)
            .order('created_at', { ascending: false })
            .limit(50);

        return NextResponse.json({ enrollment, tasks: tasks || [], auditLog: auditLog || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/employee/careflow/enrollments/[id]
 * Update enrollment (prescriptions, notes, follow-ups, status).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const { id } = await params;

        const body = await req.json();
        const updates: Record<string, any> = {};

        // Allow updating specific fields
        if (body.prescriptionCode !== undefined) updates.prescription_code = body.prescriptionCode;
        if (body.customNotes !== undefined) updates.custom_notes = body.customNotes;
        if (body.customMedications !== undefined) updates.custom_medications = body.customMedications;
        if (body.followUpAppointments !== undefined) updates.follow_up_appointments = body.followUpAppointments;
        if (body.status !== undefined) {
            updates.status = body.status;
            if (body.status === 'cancelled') updates.cancelled_at = new Date().toISOString();
            if (body.status === 'completed') updates.completed_at = new Date().toISOString();
        }

        const { error } = await supabase.from('care_enrollments').update(updates).eq('id', id);
        if (error) throw new Error(error.message);

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: id,
            action: body.status === 'cancelled' ? 'cancelled' : 'updated',
            actor: user.email || 'employee',
            details: updates,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
