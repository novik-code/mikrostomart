import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/patients/push/history
 * Auth: patient JWT required.
 *
 * Returns all push notifications sent to this patient in the last 90 days.
 */
export async function GET(req: NextRequest) {
    const payload = verifyTokenFromRequest(req);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    const { data, error } = await supabase
        .from('push_notifications_log')
        .select('id, title, body, url, tag, sent_at')
        .eq('user_id', userId)
        .eq('user_type', 'patient')
        .gte('sent_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('[PatientPushHistory] Query error:', error);
        return NextResponse.json({ error: 'Błąd pobierania historii' }, { status: 500 });
    }

    return NextResponse.json({ notifications: data || [] });
}
