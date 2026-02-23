import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendPushToGroups, sendPushToSpecificUsers, PushGroup } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

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
 *   groups?: PushGroup[]  — target groups (patients/doctors/hygienists/reception/assistant/admin)
 *   userIds?: string[]    — target individual user IDs
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

        let totalSent = 0;
        let totalFailed = 0;

        // Send to groups
        if (groups && groups.length > 0) {
            const result = await sendPushToGroups(groups as PushGroup[], payload);
            totalSent += result.sent;
            totalFailed += result.failed;
        }

        // Send to individual users (dedup from groups by tracking sent endpoints — simplified here)
        if (userIds && userIds.length > 0) {
            const result = await sendPushToSpecificUsers(userIds, payload);
            totalSent += result.sent;
            totalFailed += result.failed;
        }

        console.log(`[PushSend] ${user.email} sent manual push → sent=${totalSent} failed=${totalFailed}`);

        return NextResponse.json({ sent: totalSent, failed: totalFailed });
    } catch (err: any) {
        console.error('[PushSend] Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
