// POST /api/admin/schedule/copy-from-month
// Body: { source: 'YYYY-MM', target: 'YYYY-MM' }
// Kopiuje wpisy z poprzedniego miesiąca jako szablon. Nie nadpisuje istniejących.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { copyMonth } from '@/lib/timeTracking/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { source?: string; target?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body.source || !body.target) {
        return NextResponse.json({ error: 'Brak source/target' }, { status: 400 });
    }

    const result = await copyMonth(body.source, body.target, user.id);
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, copied: result.copied });
}
