import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — subscribe to push notifications
export async function POST(request: NextRequest) {
    try {
        const { subscription, userType, userId, locale } = await request.json();

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }
        if (!userType || !userId) {
            return NextResponse.json({ error: 'userType and userId required' }, { status: 400 });
        }

        // Resolve employee_group for employees
        let employee_group: string | null = null;
        if (userType === 'employee') {
            const { data: emp } = await supabase
                .from('employees')
                .select('position')
                .eq('user_id', userId)
                .single();

            const position = emp?.position?.toLowerCase() || '';
            if (position.includes('lekarz') || position.includes('doktor')) employee_group = 'doctor';
            else if (position.includes('higienist')) employee_group = 'hygienist';
            else if (position.includes('recep')) employee_group = 'reception';
            else if (position.includes('asysta') || position.includes('asystentka')) employee_group = 'assistant';
        }

        // Upsert — update locale/keys/group if endpoint already exists
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_type: userType,
                    user_id: userId,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    locale: locale || 'pl',
                    employee_group,
                },
                { onConflict: 'endpoint' }
            );

        if (error) throw error;

        console.log(`[Push] Subscribed: ${userType}/${userId} (${locale}) group: ${employee_group}`);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[Push] Subscribe error:', error);
        return NextResponse.json({ error: 'Failed to subscribe', details: String(error) }, { status: 500 });
    }
}


// DELETE — unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
    try {
        const { endpoint } = await request.json();

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        if (error) throw error;

        console.log(`[Push] Unsubscribed: ${endpoint.substring(0, 50)}...`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
}
