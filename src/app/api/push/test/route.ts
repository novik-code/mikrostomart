import { NextResponse } from 'next/server';
import { pushToUser } from '@/lib/pushService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { userId, userType } = await request.json();

        if (!userId || !userType) {
            return NextResponse.json({ error: 'Missing userId or userType' }, { status: 400 });
        }

        console.log(`[Push Test] Sending test push to ${userType}:${userId}`);

        const result = await pushToUser(
            userId,
            userType,
            {
                title: '🔔 Test Push Notification',
                body: 'If you see this, push notifications are working! / Powiadomienia push działają!',
                tag: 'push-test',
                url: '/strefa-pacjenta/wiadomosci',
            }
        );

        console.log(`[Push Test] Result:`, result);

        return NextResponse.json({
            success: true,
            message: 'Test push sent',
            result,
        });
    } catch (error: unknown) {
        console.error('[Push Test] Error:', error);
        return NextResponse.json(
            { error: 'Failed to send test push', details: String(error) },
            { status: 500 }
        );
    }
}
