import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { getUserRoles } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * S10-3 (audyt P1 #1 hijack):
 * Endpoint MUSI ustalać userId/userType z aktualnej sesji, NIE z body.
 * Bez tego każdy mógł zarejestrować swój FCM token jako admin/employee dla
 * dowolnego userId → odbierałby powiadomienia administracyjne.
 *
 * Auth flow:
 *   1. Supabase Auth (admin/employee/pracownik) → użyj user.id + role lookup
 *   2. Patient JWT (httpOnly cookie patient_token) → userType='patient' + userId z JWT
 *   3. Brak żadnej sesji → 401
 *
 * Body: { fcmToken, deviceLabel? } (userType/userId IGNOROWANE jeśli przesłane)
 */
async function getAuthenticatedUser(request: NextRequest): Promise<
    | { userType: 'admin' | 'employee' | 'patient'; userId: string }
    | null
> {
    // 1. Try Supabase Auth (admin/employee/pracownik sessions)
    try {
        const cookieStore = await cookies();
        const sb = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: () => { /* read-only */ },
                },
            }
        );
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
            const roles = await getUserRoles(user.id);
            if (roles.includes('admin')) return { userType: 'admin', userId: user.id };
            if (roles.includes('employee')) return { userType: 'employee', userId: user.id };
            // logged-in Supabase user but no admin/employee role — not allowed for staff push
        }
    } catch (e) {
        console.warn('[Push] Supabase auth check failed:', e);
    }

    // 2. Try patient JWT cookie (custom auth for /strefa-pacjenta)
    const patient = verifyTokenFromRequest(request);
    if (patient && patient.userId) {
        return { userType: 'patient', userId: patient.userId };
    }

    return null;
}

/**
 * POST /api/push/subscribe
 * Register an FCM token for push notifications.
 * Body: { fcmToken, deviceLabel? }
 * Auth: Supabase session (admin/employee) OR patient JWT cookie.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fcmToken, deviceLabel } = await request.json();

        if (!fcmToken || typeof fcmToken !== 'string') {
            return NextResponse.json(
                { error: 'fcmToken is required' },
                { status: 400 }
            );
        }

        // Upsert with ALL identity from auth (body's userType/userId never trusted)
        const { error } = await supabase
            .from('fcm_tokens')
            .upsert(
                {
                    user_id: auth.userId,
                    user_type: auth.userType,
                    fcm_token: fcmToken,
                    device_label: typeof deviceLabel === 'string' ? deviceLabel.slice(0, 100) : null,
                    last_active_at: new Date().toISOString(),
                },
                { onConflict: 'fcm_token' }
            );

        if (error) throw error;

        console.log(`[Push] FCM token registered: ${auth.userType}/${auth.userId} device=${deviceLabel || 'unknown'}`);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[Push] Subscribe error:', error);
        return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }
}

/**
 * DELETE /api/push/subscribe
 * Remove an FCM token. Caller must be authenticated and own the token
 * (token's user_id MUST match auth's userId — anti-griefing).
 * Body: { fcmToken } or { endpoint } (legacy compatibility)
 */
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const token = body.fcmToken || body.endpoint; // support legacy endpoint field

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'fcmToken required' }, { status: 400 });
        }

        // Only delete if token belongs to authenticated user (anti-griefing — user A
        // cannot delete user B's token, even if they somehow know its value).
        const { error, count } = await supabase
            .from('fcm_tokens')
            .delete({ count: 'exact' })
            .eq('fcm_token', token)
            .eq('user_id', auth.userId);

        if (error) throw error;

        if (count === 0) {
            // Token didn't exist OR belonged to another user — same response (no leak)
            console.log(`[Push] Delete no-op (not owned by ${auth.userId}): ${token.substring(0, 30)}...`);
            return NextResponse.json({ success: true, deleted: false });
        }

        console.log(`[Push] FCM token removed: ${token.substring(0, 30)}... (owner: ${auth.userId})`);
        return NextResponse.json({ success: true, deleted: true });
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
}
