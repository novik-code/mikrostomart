// POST /api/time/cancel
// Pracownik anuluje swój wpis z dziś (pomyłka). Soft-delete + powiadomienie admina.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getEmployeeByAuthUserId } from '@/lib/timeTracking/employeeContext';
import { cancelTimeEntry, getTodayEntries } from '@/lib/timeTracking/timeEntryService';
import { pushToGroups } from '@/lib/pushService';
import { isDemoMode } from '@/lib/demoMode';
import type { TimeCancelRequest } from '@/lib/timeTracking/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [isEmployee, isAdmin] = await Promise.all([
        hasRole(user.id, 'employee'),
        hasRole(user.id, 'admin'),
    ]);
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: TimeCancelRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body?.entryId || typeof body.entryId !== 'string') {
        return NextResponse.json({ error: 'Brak pola entryId' }, { status: 400 });
    }
    if (!body?.reason || typeof body.reason !== 'string') {
        return NextResponse.json({ error: 'Brak powodu anulowania' }, { status: 400 });
    }

    if (isDemoMode) {
        return NextResponse.json({
            ok: true,
            cancelledEntryId: body.entryId,
            type: 'clock_in',
            scannedAt: new Date().toISOString(),
            isDemoMode: true,
        });
    }

    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) {
        return NextResponse.json(
            { error: 'Twoje konto nie jest powiązane z aktywnym pracownikiem' },
            { status: 403 }
        );
    }

    const result = await cancelTimeEntry({
        entryId: body.entryId,
        employeeId: employee.id,
        cancelledByUserId: user.id,
        reason: body.reason,
    });

    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Powiadomienie admina (fire-and-forget — nie blokuje response)
    void notifyAdminCancelled(employee.name, result.entry.type, result.entry.scanned_at, result.entry.cancel_reason ?? '');

    return NextResponse.json({
        ok: true,
        cancelledEntryId: result.entry.id,
        type: result.entry.type,
        scannedAt: result.entry.scanned_at,
    });
}

async function notifyAdminCancelled(
    employeeName: string,
    type: 'clock_in' | 'clock_out',
    scannedAt: string,
    reason: string
) {
    try {
        const time = new Date(scannedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const action = type === 'clock_in' ? 'przyjście' : 'wyjście';
        await pushToGroups(['admin'], {
            title: `🚫 Anulowano ${action}`,
            body: `${employeeName} anulował ${action} z ${time} — powód: ${reason.slice(0, 200)}`,
            url: '/admin',
            tag: 'time-tracking-cancel',
        });
    } catch (err) {
        console.error('[time/cancel] notifyAdminCancelled failed:', err);
    }
}
