import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyTokenFromRequest } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        // Verify JWT
        const payload = verifyTokenFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        // Validation
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Podaj aktualne i nowe hasło' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Nowe hasło musi mieć minimum 6 znaków' },
                { status: 400 }
            );
        }

        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: 'Nowe hasło musi być inne niż aktualne' },
                { status: 400 }
            );
        }

        // Fetch patient from DB
        const { data: patient, error: fetchError } = await supabase
            .from('patients')
            .select('id, password_hash')
            .eq('id', payload.userId)
            .single();

        if (fetchError || !patient) {
            return NextResponse.json({ error: 'Pacjent nie znaleziony' }, { status: 404 });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, patient.password_hash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Aktualne hasło jest nieprawidłowe' },
                { status: 403 }
            );
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 12);

        // Update in DB
        const { error: updateError } = await supabase
            .from('patients')
            .update({ password_hash: newHash })
            .eq('id', payload.userId);

        if (updateError) {
            console.error('[ChangePassword] Update error:', updateError);
            return NextResponse.json({ error: 'Nie udało się zmienić hasła' }, { status: 500 });
        }

        console.log('[ChangePassword] Success for user:', payload.userId);

        // Send email notification (non-blocking)
        try {
            const { data: patientData } = await supabase
                .from('patients')
                .select('email, first_name')
                .eq('id', payload.userId)
                .single();

            if (patientData?.email) {
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: 'Mikrostomart <noreply@mikrostomart.pl>',
                    to: patientData.email,
                    subject: 'Hasło zostało zmienione — Mikrostomart',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #dcb14a;">🔒 Zmiana hasła</h2>
                            <p>Cześć ${patientData.first_name || ''},</p>
                            <p>Twoje hasło do portalu pacjenta Mikrostomart zostało właśnie zmienione.</p>
                            <p style="color: #999; font-size: 0.9em;">
                                Jeśli to nie Ty zmieniałeś/aś hasło, natychmiast skontaktuj się z nami 
                                pod numerem <strong>728 943 943</strong>.
                            </p>
                            <hr style="border: 1px solid #eee; margin: 20px 0;" />
                            <p style="color: #aaa; font-size: 0.8em;">Mikrostomart — Gabinet Stomatologiczny</p>
                        </div>
                    `,
                });
                console.log('[ChangePassword] Email notification sent to:', patientData.email);
            }
        } catch (emailErr) {
            console.error('[ChangePassword] Email notification failed:', emailErr);
            // Don't fail the password change if email fails
        }

        return NextResponse.json({ success: true, message: 'Hasło zostało zmienione' });

    } catch (err) {
        console.error('[ChangePassword] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}
