// GET /api/admin/time-tracking/report?employeeId=&month=YYYY-MM&format=pdf|csv
// Raport miesięczny pojedynczego pracownika.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { countWorkingDays } from '@/lib/timeTracking/leaveService';
import { generatePdfReport, generateCsvReport, type ReportData, type ReportShift } from '@/lib/timeTracking/reportGenerator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    if (!(await hasRole(user.id, 'admin'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const month = url.searchParams.get('month');
    const format = (url.searchParams.get('format') ?? 'pdf').toLowerCase();
    if (!employeeId || !month || !/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Brak employeeId / month (YYYY-MM)' }, { status: 400 });
    }
    if (format !== 'pdf' && format !== 'csv') {
        return NextResponse.json({ error: 'format = pdf|csv' }, { status: 400 });
    }

    return await buildReportResponse(employeeId, month, format);
}

async function buildReportResponse(employeeId: string, month: string, format: 'pdf' | 'csv'): Promise<Response> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Employee
    const { data: emp } = await supabase
        .from('employees')
        .select('id, name, position')
        .eq('id', employeeId)
        .maybeSingle();
    if (!emp) return NextResponse.json({ error: 'Pracownik nie znaleziony' }, { status: 404 });

    // Employment terms
    const monthFrom = `${month}-01`;
    const [year, mNum] = month.split('-').map((s) => Number.parseInt(s, 10));
    const lastDay = new Date(Date.UTC(year, mNum, 0)).getUTCDate();
    const monthTo = `${month}-${String(lastDay).padStart(2, '0')}`;

    const { data: terms } = await supabase
        .from('employment_terms')
        .select('daily_hours, contract_type, hourly_rate')
        .eq('employee_id', employeeId)
        .lte('valid_from', monthTo)
        .or(`valid_to.is.null,valid_to.gte.${monthFrom}`)
        .order('valid_from', { ascending: false })
        .limit(1);
    const dailyHours = (terms?.[0]?.daily_hours as number | undefined) ?? 8;
    const contractType = (terms?.[0]?.contract_type as string | undefined) ?? 'uop';
    const hourlyRate = (terms?.[0]?.hourly_rate as number | null | undefined) ?? null;

    // Working days w miesiącu
    const workingDays = await countWorkingDays(monthFrom, monthTo);
    const normaMinutes = workingDays * dailyHours * 60;

    // Calculated shifts
    const { data: shiftsRaw } = await supabase
        .from('calculated_shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', monthFrom)
        .lte('date', monthTo)
        .order('date', { ascending: true });

    const shifts = (shiftsRaw ?? []) as ReportShift[];

    // Totals
    const totals = {
        days: shifts.length,
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
    for (const s of shifts) {
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

    const reportData: ReportData = {
        employee: { id: emp.id, name: emp.name, position: emp.position, contractType },
        month,
        workingDays,
        dailyHours,
        normaMinutes,
        hourlyRate,
        shifts,
        totals,
    };

    const safeName = emp.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');

    if (format === 'pdf') {
        const pdfBytes = await generatePdfReport(reportData);
        return new Response(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="raport_${safeName}_${month}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    }

    const csv = generateCsvReport(reportData);
    return new Response('﻿' + csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="raport_${safeName}_${month}.csv"`,
            'Cache-Control': 'no-store',
        },
    });
}
