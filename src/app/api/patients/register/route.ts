import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prodentisId, phone, password, email } = body;

        // Validation - specific error messages
        if (!email) {
            return NextResponse.json(
                { error: 'Adres email jest wymagany' },
                { status: 400 }
            );
        }

        if (!prodentisId || !phone || !password) {
            return NextResponse.json(
                { error: 'Brak wymaganych danych rejestracyjnych' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Nieprawidłowy format adresu email' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Hasło musi zawierać minimum 8 znaków' },
                { status: 400 }
            );
        }

        // Check if patient already exists
        const { data: existing } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', prodentisId)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Konto już istnieje. Zaloguj się.' },
                { status: 409 }
            );
        }

        // Hash password
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const passwordHash = await bcrypt.hash(password, rounds);

        // Normalize phone
        const normalizedPhone = phone.replace(/[\s-]/g, '');

        // Generate verification token (24h validity)
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Save verification token (DON'T create account yet)
        const { error: tokenError } = await supabase
            .from('email_verification_tokens')
            .insert({
                prodentis_id: prodentisId,
                email: email,
                phone: normalizedPhone,
                password_hash: passwordHash,
                token: token,
                expires_at: expiresAt.toISOString(),
                used: false,
            });

        if (tokenError) {
            console.error('[Register] Failed to create verification token:', tokenError);
            return NextResponse.json(
                { error: 'Nie udało się wygenerować tokenu weryfikacyjnego' },
                { status: 500 }
            );
        }

        // Send verification email
        const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl'}/strefa-pacjenta/register/verify-email/${token}`;

        console.log('[Register] Attempting to send verification email to:', email);
        console.log('[Register] Verification URL:', verificationUrl);

        try {
            await resend.emails.send({
                from: 'Mikrostomart <noreply@mikrostomart.pl>',
                to: email,
                subject: 'Potwierdź swój adres email - Strefa Pacjenta',
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
                                <p>Dziękujemy za rejestrację w Strefie Pacjenta.</p>
                                
                                <p>Aby dokończyć rejestrację, potwierdź swój adres email klikając poniższy przycisk:</p>
                                
                                <div style="text-align: center;">
                                    <a href="${verificationUrl}" class="button">Potwierdź email</a>
                                </div>
                                
                                <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
                                <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                                    ${verificationUrl}
                                </p>
                                
                                <div class="warning">
                                    <strong>⚠️ Ważne:</strong>
                                    <ul>
                                        <li>Link jest ważny przez <strong>24 godziny</strong></li>
                                        <li>Po kliknięciu Twoje konto zostanie utworzone i przekazane do weryfikacji przez administratora</li>
                                        <li>Weryfikacja przez administratora potrwa do <strong>48 godzin</strong></li>
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

            console.log('[Register] Verification email sent successfully');
        } catch (emailError) {
            console.error('[Register] Failed to send verification email:', emailError);
            // Don't fail the registration if email fails - log it
            // User can request new verification link later
        }

        return NextResponse.json({
            success: true,
            message: 'Sprawdź swoją skrzynkę email, aby dokończyć rejestrację',
        });

    } catch (error: any) {
        console.error('[Register] Error:', error);
        return NextResponse.json(
            { error: 'Błąd serwera' },
            { status: 500 }
        );
    }
}
