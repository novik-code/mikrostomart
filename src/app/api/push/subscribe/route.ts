import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { subscription, userType, userId, locale } = await request.json();

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }
        if (!userType || !userId) {
            return NextResponse.json({ error: 'userType and userId required' }, { status: 400 });
        }

        // Resolve push groups for employees
        let employee_group: string | null = null;
        let employee_groups: string[] | null = null;

        if (userType === 'employee') {
            const { data: emp } = await supabase
                .from('employees')
                .select('position, push_groups')
                .eq('user_id', userId)
                .single();

            // Prefer the new push_groups array (managed via admin panel)
            if (emp?.push_groups && emp.push_groups.length > 0) {
                employee_groups = emp.push_groups;
                employee_group = emp.push_groups[0];
            } else if (emp?.position) {
                // Derive from position string as fallback
                const pos = (emp.position || '').toLowerCase();
                if (pos.includes('lekarz') || pos.includes('doktor')) employee_group = 'doctor';
                else if (pos.includes('higienist')) employee_group = 'hygienist';
                else if (pos.includes('recep')) employee_group = 'reception';
                else if (pos.includes('asysta') || pos.includes('asystentka')) employee_group = 'assistant';
                if (employee_group) employee_groups = [employee_group];
            }

            // Fallback for admin users: if no groups found, assign ALL groups
            // so they receive every group-targeted notification in the Alerty tab.
            if (!employee_groups) {
                const { data: adminRole } = await supabase
                    .from('user_roles')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('role', 'admin')
                    .maybeSingle();
                if (adminRole) {
                    employee_groups = ['doctor', 'hygienist', 'reception', 'assistant'];
                    employee_group = 'doctor';
                    console.log(`[Push] Admin fallback: assigning all groups to user ${userId}`);
                }
            }
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
                    employee_groups,
                },
                { onConflict: 'endpoint' }
            );

        if (error) throw error;

        console.log(`[Push] Subscribed: ${userType}/${userId} (${locale}) groups:`, employee_groups);
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
