import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { checkRateLimit } from '@/lib/rateLimit';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

/**
 * POST /api/auth/reset-password
 * Server-side password reset using Admin API + Resend.
 * Generates a recovery token and sends a DIRECT link to our update-password page.
 * NO Supabase redirect — our page calls verifyOtp() directly with the token.
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Podaj adres email.' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const rl = await checkRateLimit(`reset:${normalizedEmail}`, 3, 5 * 60 * 1000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.' },
                { status: 429 }
            );
        }

        // Check if user exists in Supabase Auth
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers?.users?.find(
            u => u.email?.toLowerCase() === normalizedEmail
        );

        if (!user) {
            // Don't reveal whether user exists
            console.log('[ResetPassword] User not found:', normalizedEmail);
            return NextResponse.json({
                success: true,
                message: 'Jeśli konto istnieje, link resetujący został wysłany.',
            });
        }

        // Generate recovery link via Admin API
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: normalizedEmail,
        });

        if (linkError || !linkData?.properties?.hashed_token) {
            console.error('[ResetPassword] Failed to generate link:', linkError);
            return NextResponse.json(
                { error: 'Nie udało się wygenerować linku. Spróbuj ponownie.' },
                { status: 500 }
            );
        }

        // Build a DIRECT link to our page (no Supabase redirect!)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
        const tokenHash = linkData.properties.hashed_token;
        const recoveryUrl = `${siteUrl}/admin/update-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

        console.log('[ResetPassword] Generated direct recovery URL for', normalizedEmail);

        const result = await sendEmail({
            to: normalizedEmail,
            subject: 'Resetowanie hasła — Mikrostomart',
            html: demoSanitize(`
                <!DOCTYPE html><html><head><meta charset="utf-8"></head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #38bdf8, #0ea5e9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #fff; margin: 0; font-size: 24px;">🦷 Mikrostomart</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2>Resetowanie hasła</h2>
                        <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta pracownika.</p>
                        <p>Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
                        <div style="text-align: center;">
                            <a href="${recoveryUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #38bdf8, #0ea5e9); color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Ustaw nowe hasło</a>
                        </div>
                        <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
                        <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 0.85rem;">${recoveryUrl}</p>
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                            <strong>⚠️ Ważne:</strong> Link jest jednorazowy i wygasa po 1 godzinie.<br>
                            Jeśli nie prosiłeś o zmianę hasła, zignoruj tę wiadomość.
                        </div>
                        <p>📞 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                    </div>
                </div></body></html>
            `),
        });

        if (!result.success) {
            console.error('[ResetPassword] Resend error:', result.error);
            return NextResponse.json(
                { error: 'Nie udało się wysłać emaila. Spróbuj ponownie.' },
                { status: 500 }
            );
        }

        console.log('[ResetPassword] Recovery email sent to', normalizedEmail);

        return NextResponse.json({
            success: true,
            message: 'Link do resetowania hasła został wysłany na Twój email.',
        });

    } catch (error) {
        console.error('[ResetPassword] Error:', error);
        return NextResponse.json(
            { error: 'Wystąpił błąd serwera. Spróbuj ponownie.' },
            { status: 500 }
        );
    }
}
