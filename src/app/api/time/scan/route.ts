// POST /api/time/scan
// Pracownik skanuje QR i rejestruje przyjście / wyjście.
// Auth: zalogowany user z rolą employee lub admin
// Auto-typ: na podstawie ostatniego wpisu z dziś (clock_in → clock_out, brak → clock_in, ostatni clock_out → clock_in)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getEmployeeByAuthUserId } from '@/lib/timeTracking/employeeContext';
import { getLocationById } from '@/lib/timeTracking/locationService';
import { parsePayload, validateToken } from '@/lib/timeTracking/qrToken';
import {
    getExpectedNextType,
    getTodayEntries,
    insertTimeEntry,
    isDuplicateTap,
} from '@/lib/timeTracking/timeEntryService';
import { isDemoMode } from '@/lib/demoMode';
import type { TimeScanRequest } from '@/lib/timeTracking/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    // 1. Auth
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [isEmployee, isAdmin] = await Promise.all([
        hasRole(user.id, 'employee'),
        hasRole(user.id, 'admin'),
    ]);
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Body
    let body: TimeScanRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body?.qrPayload || typeof body.qrPayload !== 'string') {
        return NextResponse.json({ error: 'Brak pola qrPayload' }, { status: 400 });
    }

    // 3. Demo mode short-circuit
    if (isDemoMode) {
        const now = new Date();
        return NextResponse.json({
            ok: true,
            type: 'clock_in',
            scannedAt: now.toISOString(),
            employeeName: 'Demo User',
            locationName: 'Klinika Demo',
            todayWorkedMinutes: 0,
            isDemoMode: true,
        });
    }

    // 4. Parsing payloadu
    const parts = parsePayload(body.qrPayload);
    if (!parts) {
        return NextResponse.json({ error: 'Niepoprawny format QR' }, { status: 400 });
    }

    // 5. Lokalizacja
    const location = await getLocationById(parts.locationId);
    if (!location) {
        return NextResponse.json({ error: 'Nieznana lokalizacja w QR' }, { status: 400 });
    }

    // 6. Walidacja tokenu
    const verdict = validateToken(
        location.id,
        location.qr_secret,
        parts.period,
        parts.token,
        Date.now(),
        location.rotation_seconds
    );
    if (!verdict.valid) {
        const reason = verdict.reason ?? 'invalid';
        const message =
            reason === 'expired' ? 'QR wygasł — skanuj ponownie świeży kod z ekranu'
            : reason === 'out_of_window' ? 'QR poza oknem czasowym (sprawdź zegar telefonu)'
            : 'Niepoprawny QR';
        return NextResponse.json({ error: message, code: reason }, { status: 400 });
    }

    // 7. Pracownik
    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) {
        return NextResponse.json(
            { error: 'Twoje konto nie jest powiązane z aktywnym pracownikiem' },
            { status: 403 }
        );
    }

    const now = new Date();

    // 8. Auto-detekcja typu
    const expectedType = await getExpectedNextType(employee.id, now);

    // 9. Tap-protection (60s window)
    const dup = await isDuplicateTap(employee.id, expectedType, now);
    if (dup) {
        const todayDup = await getTodayEntries(employee.id, now);
        return NextResponse.json({
            ok: true,
            duplicate: true,
            type: expectedType,
            scannedAt: dup.scanned_at,
            employeeName: employee.name,
            locationName: location.name,
            todayWorkedMinutes: todayDup.workedMinutes,
            message: `Już zarejestrowano (${expectedType === 'clock_in' ? 'przyjście' : 'wyjście'}) o ${new Date(dup.scanned_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
        });
    }

    // 10. Zapis
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    const ua = request.headers.get('user-agent') ?? null;

    let entry;
    try {
        entry = await insertTimeEntry({
            employeeId: employee.id,
            type: expectedType,
            locationId: location.id,
            qrTokenUsed: parts.token,
            qrPeriod: parts.period,
            deviceInfo: body.deviceInfo ?? null,
            ipAddress: ip,
            userAgent: ua,
        });
    } catch (err) {
        console.error('[time/scan] insert failed:', err);
        return NextResponse.json({ error: 'Nie udało się zapisać wpisu' }, { status: 500 });
    }

    const today = await getTodayEntries(employee.id, now);

    return NextResponse.json({
        ok: true,
        type: expectedType,
        scannedAt: entry.scanned_at,
        employeeName: employee.name,
        locationName: location.name,
        todayWorkedMinutes: today.workedMinutes,
    });
}
