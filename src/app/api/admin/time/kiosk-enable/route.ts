// POST /api/admin/time/kiosk-enable  — włącza tryb kiosk dla /qr-display
// DELETE /api/admin/time/kiosk-enable — wyłącza tryb kiosk
//
// Tylko admin sesja może włączyć/wyłączyć. Po włączeniu /api/time/qr-current
// akceptuje kiosk_token cookie nawet po wygaśnięciu sesji Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import {
    generateKioskToken,
    isAllowedTtl,
    KIOSK_COOKIE_NAME,
} from '@/lib/timeTracking/kioskAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { ttlDays?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const ttlDays = Number(body.ttlDays);
    if (!isAllowedTtl(ttlDays)) {
        return NextResponse.json(
            { error: 'ttlDays musi być 7, 30 lub 90' },
            { status: 400 }
        );
    }

    let token;
    try {
        token = generateKioskToken(ttlDays);
    } catch (err) {
        console.error('[kiosk-enable] generate failed:', err);
        return NextResponse.json(
            { error: 'Brak konfiguracji KIOSK_TOKEN_SECRET na serwerze' },
            { status: 500 }
        );
    }

    const maxAgeSec = ttlDays * 24 * 60 * 60;
    const res = NextResponse.json({
        ok: true,
        expiresMs: token.expiresMs,
        ttlDays,
    });
    res.cookies.set(KIOSK_COOKIE_NAME, token.raw, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeSec,
    });

    console.log(
        `[kiosk-enable] admin=${user.email} ttlDays=${ttlDays} validUntil=${new Date(token.expiresMs).toISOString()}`
    );
    return res;
}

export async function DELETE() {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(KIOSK_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    console.log(`[kiosk-enable] DELETE admin=${user.email}`);
    return res;
}
