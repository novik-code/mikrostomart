// PUT /api/admin/time-tracking/correct
// Body: { shiftId, correction: { ... }, reason }
// Korekta wyliczonego shift przez admina, audit log do time_tracking_audit.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CorrectionPayload {
    shiftId: string;
    reason: string;
    actual_start?: string | null;
    actual_end?: string | null;
    worked_minutes?: number;
    late_minutes?: number;
    early_leave_minutes?: number;
    overtime_total_minutes?: number;
    notes?: string | null;
    status?: 'admin_approved' | 'disputed' | 'frozen';
}

export async function PUT(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: CorrectionPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.shiftId) return NextResponse.json({ error: 'Brak shiftId' }, { status: 400 });
    const reason = (body.reason ?? '').trim();
    if (reason.length < 3) {
        return NextResponse.json({ error: 'Powód korekty wymagany (min 3 znaki)' }, { status: 400 });
    }
    if (reason.length > 500) {
        return NextResponse.json({ error: 'Powód za długi (max 500)' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Pobierz oryginał
    const { data: original, error: errOrig } = await supabase
        .from('calculated_shifts')
        .select('*')
        .eq('id', body.shiftId)
        .maybeSingle();

    if (errOrig || !original) {
        return NextResponse.json({ error: 'Nie znaleziono shift' }, { status: 404 });
    }

    // Zbuduj patch tylko z explicite podanych pól
    const patch: Record<string, any> = {};
    const fields: (keyof CorrectionPayload)[] = [
        'actual_start', 'actual_end', 'worked_minutes',
        'late_minutes', 'early_leave_minutes', 'overtime_total_minutes',
        'notes', 'status',
    ];
    for (const f of fields) {
        if (body[f] !== undefined) patch[f] = body[f];
    }
    patch.approved_by = user.id;
    patch.approved_at = new Date().toISOString();
    if (!patch.status) patch.status = 'admin_approved';

    const { data: updated, error: errUpd } = await supabase
        .from('calculated_shifts')
        .update(patch)
        .eq('id', body.shiftId)
        .select('*')
        .single();

    if (errUpd) {
        return NextResponse.json({ error: errUpd.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('time_tracking_audit').insert({
        target_employee_id: original.employee_id,
        target_table: 'calculated_shifts',
        target_id: body.shiftId,
        action: 'correct',
        old_value: original,
        new_value: updated,
        changed_by: user.id,
        reason,
    });

    return NextResponse.json({ ok: true, shift: updated });
}
