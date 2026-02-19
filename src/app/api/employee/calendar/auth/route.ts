import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getAuthUrl, exchangeCode, disconnectCalendar, isCalendarConnected } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/calendar/auth
 * Returns the OAuth consent URL + current connection status
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const status = await isCalendarConnected(user.id);
    const authUrl = getAuthUrl(user.id);

    return NextResponse.json({ ...status, authUrl });
}

/**
 * POST /api/employee/calendar/auth
 * Exchange OAuth authorization code for tokens
 * Body: { code: string }
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    try {
        const { code } = await req.json();
        if (!code) {
            return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
        }

        const result = await exchangeCode(code, user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, email: result.email });
    } catch (err: any) {
        console.error('[Calendar Auth] Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/employee/calendar/auth
 * Disconnect Google Calendar
 */
export async function DELETE() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    await disconnectCalendar(user.id);
    return NextResponse.json({ success: true });
}
