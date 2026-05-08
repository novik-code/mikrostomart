// GET /api/employee/time-tracking-self?from=YYYY-MM-DD&to=YYYY-MM-DD
// Statystyki własne zalogowanego pracownika (tydzień / miesiąc).
// Zwraca calculated_shifts + agregaty + employment_terms (norma).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getEmployeeByAuthUserId } from '@/lib/timeTracking/employeeContext';
import { countWorkingDays } from '@/lib/timeTracking/leaveService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [isEmployee, isAdmin] = await Promise.all([hasRole(user.id, 'employee'), hasRole(user.id, 'admin')]);
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) return NextResponse.json({ error: 'Brak aktywnego pracownika' }, { status: 403 });

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return NextResponse.json({ error: 'Brak from/to (YYYY-MM-DD)' }, { status: 400 });
    }
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    if (toMs < fromMs) return NextResponse.json({ error: 'to < from' }, { status: 400 });
    if ((toMs - fromMs) / 86400000 > 366) {
        return NextResponse.json({ error: 'Maks 366 dni' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculated shifts dla pracownika
    const { data: shifts } = await supabase
        .from('calculated_shifts')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });

    // Employment terms (norma)
    const { data: terms } = await supabase
        .from('employment_terms')
        .select('daily_hours, weekly_hours, vacation_days_per_year, contract_type')
        .eq('employee_id', employee.id)
        .lte('valid_from', to)
        .or(`valid_to.is.null,valid_to.gte.${from}`)
        .order('valid_from', { ascending: false })
        .limit(1);
    const dailyHours = (terms?.[0]?.daily_hours as number | undefined) ?? 8;
    const contractType = (terms?.[0]?.contract_type as string | undefined) ?? 'uop';

    // Norma godzin w przedziale (dni robocze pn-pt minus święta) × daily_hours
    const workingDays = await countWorkingDays(from, to);
    const normaMinutes = workingDays * dailyHours * 60;

    // Agregaty
    const list = shifts ?? [];
    const totals = {
        days: list.length,
        worked_minutes: 0,
        planned_minutes: 0,
        late_minutes: 0,
        early_leave_minutes: 0,
        overtime_total_minutes: 0,
        overtime_justified_minutes: 0,
        overtime_unjustified_minutes: 0,
        absence_days: 0,
        days_with_anomalies: 0,
    };
    for (const s of list) {
        totals.worked_minutes += s.worked_minutes ?? 0;
        totals.planned_minutes += s.planned_minutes ?? 0;
        totals.late_minutes += s.late_minutes ?? 0;
        totals.early_leave_minutes += s.early_leave_minutes ?? 0;
        totals.overtime_total_minutes += s.overtime_total_minutes ?? 0;
        totals.overtime_justified_minutes += s.overtime_justified_minutes ?? 0;
        totals.overtime_unjustified_minutes += s.overtime_unjustified_minutes ?? 0;
        if (s.absence_type) totals.absence_days += 1;
        if ((s.anomaly_flags?.length ?? 0) > 0) totals.days_with_anomalies += 1;
    }

    return NextResponse.json({
        employee: { id: employee.id, name: employee.name, position: employee.position },
        from,
        to,
        workingDays,
        dailyHours,
        contractType,
        normaMinutes,
        shifts: list,
        totals,
    });
}
