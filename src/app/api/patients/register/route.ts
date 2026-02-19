import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { broadcastPush } from '@/lib/webpush';
import { getEmailTemplate } from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prodentisId, phone, password, email, locale: requestLocale } = body;
        const locale = ['pl', 'en', 'de', 'ua'].includes(requestLocale) ? requestLocale : 'pl';

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
                locale: locale,
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
            const { subject, html } = getEmailTemplate('verification_email', locale, {
                verificationUrl,
                year: String(new Date().getFullYear()),
            });

            await resend.emails.send({
                from: 'Mikrostomart <noreply@mikrostomart.pl>',
                to: email,
                subject,
                html,
            });

            console.log('[Register] Verification email sent successfully');
        } catch (emailError) {
            console.error('[Register] Failed to send verification email:', emailError);
            // Don't fail the registration if email fails - log it
            // User can request new verification link later
        }

        // Push notification to admin
        broadcastPush('admin', 'patient_registered', { email }, '/admin').catch(console.error);

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
