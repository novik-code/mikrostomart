import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createEvent, listEvents, deleteEvent } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/calendar
 * List upcoming calendar events for the authenticated employee
 * Query: ?timeMin=ISO&timeMax=ISO&maxResults=20
 */
export async function GET(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const url = new URL(req.url);
    const timeMin = url.searchParams.get('timeMin') || undefined;
    const timeMax = url.searchParams.get('timeMax') || undefined;
    const maxResults = parseInt(url.searchParams.get('maxResults') || '20', 10);

    const result = await listEvents(user.id, timeMin, timeMax, maxResults);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ events: result.events });
}

/**
 * POST /api/employee/calendar
 * Create a new calendar event
 * Body: { summary, description?, start, end?, allDay?, location?, reminders? }
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
        const body = await req.json();

        if (!body.summary || !body.start) {
            return NextResponse.json({ error: 'summary and start are required' }, { status: 400 });
        }

        const result = await createEvent(user.id, {
            summary: body.summary,
            description: body.description,
            start: body.start,
            end: body.end,
            allDay: body.allDay,
            location: body.location,
            reminders: body.reminders,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            eventId: result.eventId,
            htmlLink: result.htmlLink,
        }, { status: 201 });
    } catch (err: any) {
        console.error('[Calendar] Create error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/employee/calendar
 * Delete a calendar event
 * Body: { eventId: string }
 */
export async function DELETE(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    try {
        const { eventId } = await req.json();
        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }

        const result = await deleteEvent(user.id, eventId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Calendar] Delete error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
