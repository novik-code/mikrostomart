import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/push-token — rejestracja tokena Expo Push aplikacji mobilnej PERSONELU.
 * Auth: `verifyAdmin()` (Bearer-first / cookie-fallback) + rola employee|admin.
 * Body: { token: 'ExponentPushToken[...]', platform: 'ios'|'android' }.
 * Upsert po tokenie — to samo urządzenie po przelogowaniu zmienia właściciela wpisu.
 * Tabela: staff_push_tokens (mig 179). Wysyłka: src/lib/expoPush.ts → sendExpoPushToStaff*.
 *
 * DELETE — wyrejestrowanie tokena (wylogowanie ze strefy), body: { token }.
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
        const { token, platform } = await req.json();

        if (typeof token !== 'string' || !/^Expo(nent)?PushToken\[.+\]$/.test(token) || token.length > 200) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }
        const plat = platform === 'android' ? 'android' : 'ios';

        const { error } = await supabase
            .from('staff_push_tokens')
            .upsert(
                { user_id: user.id, token, platform: plat, updated_at: new Date().toISOString() },
                { onConflict: 'token' }
            );

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[StaffPushToken] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { token } = await req.json();
        if (typeof token !== 'string' || !token) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }
        // Kasujemy tylko WŁASNY wpis — token cudzego urządzenia nie może być zdjęty zdalnie.
        const { error } = await supabase
            .from('staff_push_tokens')
            .delete()
            .eq('token', token)
            .eq('user_id', user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[StaffPushToken] Delete error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
