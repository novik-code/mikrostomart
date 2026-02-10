import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple in-memory rate limiting: 3 requests per email per 5 minutes
const resetAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();
    const attempt = resetAttempts.get(key);

    if (!attempt || now > attempt.resetAt) {
        resetAttempts.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 });
        return true;
    }

    if (attempt.count >= 3) {
        return false;
    }

    attempt.count++;
    return true;
}

/**
 * POST /api/auth/reset-password
 * Server-side password reset using Admin API + Resend.
 * Bypasses Supabase's built-in email rate limits.
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

        // Our own rate limiting (gentler than Supabase's)
        if (!checkRateLimit(normalizedEmail)) {
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
            // Don't reveal whether user exists — return success anyway
            console.log('[ResetPassword] User not found:', normalizedEmail);
            return NextResponse.json({
                success: true,
                message: 'Jeśli konto istnieje, link resetujący został wysłany.',
            });
        }

        // Generate recovery link via Admin API (bypasses Supabase email rate limits)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl';
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: normalizedEmail,
            options: {
                redirectTo: `${siteUrl}/auth/callback?next=/admin/update-password`,
            },
        });

        if (linkError || !linkData?.properties?.action_link) {
            console.error('[ResetPassword] Failed to generate link:', linkError);
            return NextResponse.json(
                { error: 'Nie udało się wygenerować linku. Spróbuj ponownie.' },
                { status: 500 }
            );
        }

        const recoveryUrl = linkData.properties.action_link;

        // Send email via Resend (bypasses Supabase email sending)
        const resend = new Resend(process.env.RESEND_API_KEY!);
        const { error: emailError } = await resend.emails.send({
            from: 'Mikrostomart <noreply@mikrostomart.pl>',
            to: normalizedEmail,
            subject: 'Resetowanie hasła — Mikrostomart',
            html: `
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
                            <strong>⚠️ Ważne:</strong> Link jest jednorazowy i wygasa po 24 godzinach.<br>
                            Jeśli nie prosiłeś o zmianę hasła, zignoruj tę wiadomość.
                        </div>
                        <p>📞 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                    </div>
                </div></body></html>
            `,
        });

        if (emailError) {
            console.error('[ResetPassword] Resend error:', emailError);
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
