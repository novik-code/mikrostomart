import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendPushToSpecificUsers } from '@/lib/pushService';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/employee/push/send
 *
 * Send a manual one-time push notification.
 * Accessible to employees AND admins.
 *
 * Body:
 *   title: string         — notification title (required)
 *   body: string          — notification body text (required)
 *   url?: string          — optional click URL
 *   groups?: string[]     — target groups (patients/doctors/hygienists/reception/assistant/admin)
 *   userIds?: string[]    — target individual user IDs
 *
 * Deduplication: if a user matches both a group and an explicit userId,
 * they receive exactly ONE notification (not two).
 * This works by collecting all target user_ids into a Set first,
 * then sending via sendPushToSpecificUsers which deduplicates by endpoint.
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const { title, body: bodyText, url, groups, userIds } = await req.json();

        if (!title?.trim() || !bodyText?.trim()) {
            return NextResponse.json({ error: 'Wymagany tytuł i treść' }, { status: 400 });
        }

        const hasTargets = (groups && groups.length > 0) || (userIds && userIds.length > 0);
        if (!hasTargets) {
            return NextResponse.json({ error: 'Wybierz co najmniej jedną grupę lub odbiorcę' }, { status: 400 });
        }

        const payload = {
            title: title.trim(),
            body: bodyText.trim(),
            url: url || '/pracownik',
            tag: `manual-${Date.now()}`,
        };

        // ── Collect all target user IDs (groups + explicit), deduplicated ──
        // This prevents a user in both a group and the explicit list from
        // receiving duplicate notifications.
        const allUserIds = new Set<string>(userIds || []);

        if (groups && groups.length > 0) {
            const groupMap: Record<string, string> = {
                doctors: 'doctor', doctor: 'doctor',
                hygienists: 'hygienist', hygienist: 'hygienist',
                reception: 'reception',
                assistant: 'assistant',
            };

            for (const group of groups as string[]) {
                if (group === 'patients' || group === 'patient') {
                    const { data: subs } = await supabase
                        .from('push_subscriptions').select('user_id').eq('user_type', 'patient');
                    (subs || []).forEach((s: any) => allUserIds.add(s.user_id));
                } else if (group === 'admin') {
                    const { data: subs } = await supabase
                        .from('push_subscriptions').select('user_id').eq('user_type', 'admin');
                    (subs || []).forEach((s: any) => allUserIds.add(s.user_id));
                } else {
                    const dbGroup = groupMap[group];
                    if (!dbGroup) continue;
                    const { data: subs } = await supabase
                        .from('push_subscriptions').select('user_id').eq('user_type', 'employee')
                        .or(`employee_groups.cs.{"${dbGroup}"},employee_group.eq.${dbGroup}`);
                    (subs || []).forEach((s: any) => allUserIds.add(s.user_id));
                }
            }
        }

        if (allUserIds.size === 0) {
            return NextResponse.json({ sent: 0, failed: 0, message: 'Brak subskrybentów w wybranych grupach' });
        }

        // Single deduplicated send — sendPushToSpecificUsers keeps max 3 subs per user
        // (covers genuine multi-device users) and cleans up expired subscriptions.
        const result = await sendPushToSpecificUsers([...allUserIds], payload);

        console.log(`[PushSend] ${user.email} manual push → users=${allUserIds.size} sent=${result.sent} failed=${result.failed}`);
        return NextResponse.json({ sent: result.sent, failed: result.failed });
    } catch (err: any) {
        console.error('[PushSend] Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
