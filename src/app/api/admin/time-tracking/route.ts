// GET /api/admin/time-tracking?from=YYYY-MM-DD&to=YYYY-MM-DD&employeeId=
// Lista wyliczonych shifts w przedziale (max 31 dni).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const employeeId = url.searchParams.get('employeeId');
    const onlyAnomalies = url.searchParams.get('onlyAnomalies') === 'true';

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return NextResponse.json({ error: 'Brak from/to (YYYY-MM-DD)' }, { status: 400 });
    }
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    if (toMs < fromMs) return NextResponse.json({ error: 'to < from' }, { status: 400 });
    if ((toMs - fromMs) / 86400000 > 92) {
        return NextResponse.json({ error: 'Maks. 92 dni' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
        .from('calculated_shifts')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
        .order('employee_id', { ascending: true });
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (onlyAnomalies) query = query.gt('anomaly_flags', '{}');

    const { data: shifts, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employeeIds = Array.from(new Set((shifts ?? []).map((s: any) => s.employee_id)));
    let employees: Array<{ id: string; name: string; position: string | null }> = [];
    if (employeeIds.length > 0) {
        const { data: emp } = await supabase
            .from('employees')
            .select('id, name, position')
            .in('id', employeeIds);
        employees = emp ?? [];
    }

    return NextResponse.json({ shifts: shifts ?? [], employees });
}
