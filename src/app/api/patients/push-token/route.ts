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

/**
 * DELETE /api/patients/push-token — wyrejestrowanie urządzenia przy wylogowaniu.
 *
 * 🔴 CZEGO BRAKOWAŁO: aplikacja 1.2.0 woła tę metodę przy wylogowaniu pacjenta
 * (mikrostomart-app/src/lib/notifications.ts), ale trasa miała WYŁĄCZNIE `POST` —
 * czyli żądanie kończyło się na 405, a wiersz w `patient_push_tokens` zostawał.
 * Skutek: po oddaniu, sprzedaniu albo przekazaniu telefonu dziecku, poprzedni
 * właściciel dalej dostawał powiadomienia o SWOIM planie leczenia i terminach wizyt.
 * Token znikał dopiero przy `DeviceNotRegistered` (odinstalowanie apki) albo gdy ktoś
 * zalogował się na tym urządzeniu na inne konto (upsert po `token` w POST powyżej).
 *
 * Kasujemy WYŁĄCZNIE własny wpis — dopasowanie po tokenie ORAZ po id kartoteki z JWT,
 * żeby znajomość cudzego tokenu nie pozwalała zdalnie wyciszyć czyjegoś urządzenia
 * (ten sam wzorzec co `DELETE /api/employee/push-token`).
 */
export async function DELETE(request: NextRequest) {
    const payload = verifyTokenFromRequest(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { token } = await request.json();

        if (typeof token !== 'string' || !token || token.length > 200) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        const { error } = await supabase
            .from('patient_push_tokens')
            .delete()
            .eq('token', token)
            .eq('patient_id', payload.prodentisId);

        if (error) throw error;

        // Idempotentnie: brak wiersza to też sukces — apka wylogowuje się raz,
        // a ponowna próba (np. po utracie sieci) nie może zwrócić błędu.
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[PushToken] Delete error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
