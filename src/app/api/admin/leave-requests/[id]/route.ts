// PUT /api/admin/leave-requests/[id]
// Body: { decision: 'approved' | 'rejected', rejectedReason? }
// Po approve: auto-wpis absence do work_schedules + push do pracownika.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { decideLeaveRequest, LEAVE_TYPE_LABELS } from '@/lib/timeTracking/leaveService';
import { pushToUser } from '@/lib/pushService';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    if (!(await hasRole(user.id, 'admin'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    let body: { decision: 'approved' | 'rejected'; rejectedReason?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (body.decision !== 'approved' && body.decision !== 'rejected') {
        return NextResponse.json({ error: 'decision musi być approved/rejected' }, { status: 400 });
    }

    const result = await decideLeaveRequest({
        requestId: id,
        adminUserId: user.id,
        decision: body.decision,
        rejectedReason: body.rejectedReason,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // Push do pracownika
    if (!isDemoMode && result.request) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: emp } = await supabase
            .from('employees')
            .select('user_id, name')
            .eq('id', result.request.employee_id)
            .maybeSingle();

        if (emp?.user_id) {
            const typeLabel = LEAVE_TYPE_LABELS[result.request.type] ?? result.request.type;
            const dateRange = result.request.date_from === result.request.date_to
                ? result.request.date_from
                : `${result.request.date_from} – ${result.request.date_to}`;
            void pushToUser(emp.user_id, 'employee', {
                title: body.decision === 'approved' ? '✅ Wniosek urlopowy zaakceptowany' : '❌ Wniosek urlopowy odrzucony',
                body: body.decision === 'approved'
                    ? `${typeLabel} (${dateRange}) zatwierdzony.`
                    : `${typeLabel} (${dateRange}) odrzucony. ${result.request.rejected_reason ?? ''}`.slice(0, 200),
                url: '/pracownik?tab=urlopy',
                tag: 'leave-decision',
            });
        }
    }

    return NextResponse.json({ ok: true, request: result.request });
}
