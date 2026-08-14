import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { revokePatientPushTokens } from '@/lib/patientPushRevoke';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Token i nowe hasło są wymagane' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Hasło musi mieć minimum 8 znaków' },
                { status: 400 }
            );
        }

        // Find reset token
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenError || !resetToken) {
            return NextResponse.json(
                { success: false, error: 'Nieprawidłowy lub wygasły link resetujący' },
                { status: 400 }
            );
        }

        // Check if token is already used
        if (resetToken.used) {
            return NextResponse.json(
                { success: false, error: 'Ten link został już wykorzystany' },
                { status: 400 }
            );
        }

        // Check if token is expired
        const expiresAt = new Date(resetToken.expires_at);
        if (expiresAt < new Date()) {
            return NextResponse.json(
                { success: false, error: 'Link resetujący wygasł. Poproś o nowy.' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update patient password
        const { error: updateError } = await supabase
            .from('patients')
            /**
             * 🔑 TRZECIA droga do zmiany hasła — i najważniejsza dla rewokacji (migracja 197).
             *
             * `change-password` używa ktoś, kto ma dostęp. Tej ścieżki używa ktoś, kto go
             * STRACIŁ — czyli dokładnie ten przypadek, w którym stary token trzeba ubić.
             * Pominięcie jej zostawiłoby napraw­ę połowiczną: pacjent po przejęciu konta
             * resetuje hasło, a token napastnika żyje dalej przez 30 dni.
             * („Jedna naprawa nie wystarczy — policz wszystkich pisarzy": trzy trasy
             *  dotykają `password_hash`, wszystkie trzy muszą przestawiać datę.)
             */
            .update({ password_hash: hashedPassword, sessions_valid_from: new Date().toISOString() })
            .eq('prodentis_id', resetToken.prodentis_id);

        if (updateError) {
            console.error('Failed to update password:', updateError);
            return NextResponse.json(
                { success: false, error: 'Nie udało się zaktualizować hasła' },
                { status: 500 }
            );
        }

        /**
         * 🔒 To jest ścieżka po PRZEJĘCIU KONTA — tu rewokacja musi być kompletna.
         * Bez zdjęcia tokenów push urządzenie napastnika traci dostęp do danych,
         * ale nadal dostaje powiadomienia o wizytach razem z deep-linkiem.
         * Aktualizacja szła po `prodentis_id`, więc mamy go wprost z tokenu resetu;
         * UUID konta nie jest tu potrzebny do tabeli Expo, a `fcm_tokens` sprząta
         * gałąź po `userId` (pomijana, gdy go nie znamy — patrz helper).
         */
        await revokePatientPushTokens(
            supabase,
            { prodentisId: resetToken.prodentis_id, userId: null },
            'ResetPassword',
        );

        // Mark token as used
        await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('token', token);

        return NextResponse.json({
            success: true,
            message: 'Hasło zostało zmienione. Możesz się teraz zalogować.'
        });

    } catch (error) {
        console.error('Password reset confirm error:', error);
        return NextResponse.json(
            { success: false, error: 'Wystąpił błąd podczas resetowania hasła' },
            { status: 500 }
        );
    }
}
