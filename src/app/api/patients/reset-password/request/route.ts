import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { phone } = await request.json();

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'Numer telefonu jest wymagany' },
                { status: 400 }
            );
        }

        // Find patient by phone (only select fields that exist in Supabase)
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('prodentis_id, email')
            .eq('phone', phone.replace(/\s/g, ''))
            .single();

        console.log('[Password Reset] Patient lookup result:', { patient, patientError });

        // Always return success to prevent enumeration attacks
        if (patientError || !patient) {
            console.log('[Password Reset] Patient not found, returning generic success');
            return NextResponse.json({
                success: true,
                message: 'Jeśli konto istnieje, wysłaliśmy link resetujący na podany email.'
            });
        }

        // Check if patient has email
        if (!patient.email) {
            return NextResponse.json({
                success: false,
                error: 'To konto nie ma przypisanego adresu email. Skontaktuj się z recepcją.'
            });
        }

        // Generate reset token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour validity

        // Save token to database
        const { error: tokenError } = await supabase
            .from('password_reset_tokens')
            .insert({
                prodentis_id: patient.prodentis_id,
                phone: phone.replace(/\s/g, ''),  // Normalized phone
                token,
                expires_at: expiresAt.toISOString(),
                used: false
            });

        if (tokenError) {
            console.error('Failed to create reset token:', tokenError);
            return NextResponse.json(
                { success: false, error: 'Nie udało się wygenerować tokenu resetującego' },
                { status: 500 }
            );
        }

        // Send email with reset link
        const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl'}/strefa-pacjenta/reset-password/${token}`;

        console.log('[Password Reset] Attempting to send email to:', patient.email);
        console.log('[Password Reset] Reset URL:', resetUrl);

        try {
            const emailResult = await resend.emails.send({
                from: 'Mikrostomart <noreply@mikrostomart.pl>',
                to: patient.email,
                subject: 'Resetowanie hasła - Strefa Pacjenta',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #dcb14a, #f0c96c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .header h1 { color: #000; margin: 0; font-size: 24px; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                            .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🦷 Mikrostomart</h1>
                            </div>
                            <div class="content">
                                <h2>Witaj!</h2>
                                <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Strefie Pacjenta.</p>
                                
                                <p>Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
                                
                                <div style="text-align: center;">
                                    <a href="${resetUrl}" class="button">Zresetuj hasło</a>
                                </div>
                                
                                <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
                                <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                                    ${resetUrl}
                                </p>
                                
                                <div class="warning">
                                    <strong>⚠️ Ważne:</strong>
                                    <ul>
                                        <li>Link jest ważny przez <strong>1 godzinę</strong></li>
                                        <li>Można go użyć tylko <strong>jeden raz</strong></li>
                                        <li>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość</li>
                                    </ul>
                                </div>
                                
                                <p>W razie pytań, skontaktuj się z nami:</p>
                                <p>📞 570 270 470<br>
                                📧 gabinet@mikrostomart.pl</p>
                            </div>
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Mikrostomart - Gabinet Stomatologiczny</p>
                                <p>ul. Centralna 15, 45-362 Opole</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });

            console.log('[Password Reset] Email sent successfully:', emailResult);
        } catch (emailError) {
            console.error('[Password Reset] Failed to send email:', emailError);
            return NextResponse.json(
                { success: false, error: 'Nie udało się wysłać emaila resetującego' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Link resetujący został wysłany na Twój email.'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        return NextResponse.json(
            { success: false, error: 'Wystąpił błąd podczas wysyłania emaila' },
            { status: 500 }
        );
    }
}
