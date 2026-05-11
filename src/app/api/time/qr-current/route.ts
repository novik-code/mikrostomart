// GET /api/time/qr-current
// Zwraca aktualny payload QR dla strony kioskowej /qr-display.
// Auth (jedno z dwóch wystarczy):
//   1. Sesja admina (Supabase) + rola 'admin' — jak dla pozostałych ścieżek admin
//   2. Ważny httpOnly cookie kiosk_token — tablet zalogowany raz przez admina
//      otrzymuje długo-żyjący token (7/30/90 dni). Po wygaśnięciu sesji Supabase
//      strona dalej działa do końca TTL kiosk-tokenu.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getPrimaryLocation } from '@/lib/timeTracking/locationService';
import { buildPayload } from '@/lib/timeTracking/qrToken';
import {
    verifyKioskToken,
    KIOSK_COOKIE_NAME,
} from '@/lib/timeTracking/kioskAuth';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    let authMode: 'admin' | 'kiosk' | null = null;
    let kioskExpiresMs: number | null = null;

    // 1. Kiosk-token najpierw (czysty HMAC, bez DB roundtrip)
    const kioskCookie = request.cookies.get(KIOSK_COOKIE_NAME)?.value;
    if (kioskCookie) {
        const verdict = verifyKioskToken(kioskCookie);
        if (verdict.valid) {
            authMode = 'kiosk';
            kioskExpiresMs = verdict.expiresMs ?? null;
        }
    }

    // 2. Fallback: sesja admina
    if (!authMode) {
        const user = await verifyAdmin();
        if (user) {
            const isAdmin = await hasRole(user.id, 'admin');
            if (isAdmin) {
                authMode = 'admin';
            }
        }
    }

    if (!authMode) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();

    if (isDemoMode) {
        return NextResponse.json({
            payload: 'mst://demo/preview',
            period: 0,
            rotationSeconds: 30,
            validUntil: now + 30000,
            locationName: 'Klinika Demo (tryb demonstracyjny)',
            locationId: 'demo',
            serverTime: now,
            isDemoMode: true,
            authMode,
            kioskExpiresMs,
        });
    }

    const location = await getPrimaryLocation();
    if (!location) {
        return NextResponse.json(
            { error: 'No primary location configured' },
            { status: 500 }
        );
    }

    const built = buildPayload(
        location.id,
        location.qr_secret,
        now,
        location.rotation_seconds
    );

    return NextResponse.json({
        payload: built.payload,
        period: built.period,
        rotationSeconds: location.rotation_seconds,
        validUntil: built.validUntil,
        locationName: location.name,
        locationId: location.id,
        serverTime: now,
        isDemoMode: false,
        authMode,
        kioskExpiresMs,
    });
}
