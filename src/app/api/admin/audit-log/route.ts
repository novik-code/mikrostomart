import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/audit-log
 *
 * RODO Art. 30 — retrieve audit log entries for review (admin only).
 *
 * Query params (all optional):
 *  - limit (default 100, max 500)
 *  - offset (default 0)
 *  - user_email (filter by acting employee)
 *  - action (filter by action type, e.g. 'view_patient_data')
 *  - resource_type (filter by resource type)
 *  - patient_name (case-insensitive ilike search)
 *  - from / to (ISO date strings — created_at range)
 *
 * Returns: { entries: [], total: number, limit: number, offset: number }
 */
export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const userEmail = url.searchParams.get('user_email');
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resource_type');
    const patientName = url.searchParams.get('patient_name');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let query = supabase
        .from('employee_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (userEmail) query = query.eq('user_email', userEmail);
    if (action) query = query.eq('action', action);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (patientName) query = query.ilike('patient_name', `%${patientName}%`);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
        console.error('[AuditLog GET]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        entries: data || [],
        total: count || 0,
        limit,
        offset,
    });
}
