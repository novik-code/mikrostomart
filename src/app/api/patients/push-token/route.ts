import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/patients/push-token — rejestracja tokena Expo Push aplikacji mobilnej.
 * Auth: Bearer (JWT pacjenta). Body: { token: 'ExponentPushToken[...]', platform: 'ios'|'android' }.
 * Upsert po tokenie (token może zmienić właściciela po ponownym logowaniu na urządzeniu).
 * Tabela: patient_push_tokens (mig 173). Wysyłka: src/lib/expoPush.ts.
 */
export async function POST(request: NextRequest) {
    const payload = verifyTokenFromRequest(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { token, platform } = await request.json();

        if (typeof token !== 'string' || !/^Expo(nent)?PushToken\[.+\]$/.test(token) || token.length > 200) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }
        const plat = platform === 'android' ? 'android' : 'ios';

        const { error } = await supabase
            .from('patient_push_tokens')
            .upsert(
                {
                    patient_id: payload.prodentisId,
                    token,
                    platform: plat,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'token' }
            );

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[PushToken] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
