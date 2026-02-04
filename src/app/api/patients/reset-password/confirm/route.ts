import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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
            .update({ password_hash: hashedPassword })
            .eq('prodentis_id', resetToken.prodentis_id);

        if (updateError) {
            console.error('Failed to update password:', updateError);
            return NextResponse.json(
                { success: false, error: 'Nie udało się zaktualizować hasła' },
                { status: 500 }
            );
        }

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
