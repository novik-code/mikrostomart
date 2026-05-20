import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { broadcastPush } from '@/lib/pushService';
import { sendTelegramNotification } from '@/lib/telegram';
import { getEmailTemplate } from '@/lib/emailTemplates';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { verifyRegistrationToken } from '@/lib/registrationToken';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { verificationToken, phone, password, email, locale: requestLocale } = body;
        const locale = ['pl', 'en', 'de', 'ua'].includes(requestLocale) ? requestLocale : 'pl';

        // Validation - specific error messages
        if (!email) {
            return NextResponse.json(
                { error: 'Adres email jest wymagany' },
                { status: 400 }
            );
        }

        // S10-2: wymagamy podpisanego tokenu z /api/patients/verify.
        // Atakujący bez prior Prodentis match nie ma jak go wygenerować.
        if (!verificationToken || !phone || !password) {
            return NextResponse.json(
                { error: 'Brak wymaganych danych rejestracyjnych' },
                { status: 400 }
            );
        }

        // Verify signed token. Bound do prodentisId+phone — zwraca payload albo null.
        const tokenPayload = verifyRegistrationToken(verificationToken);
        if (!tokenPayload) {
            console.warn('[Register] Invalid or expired verification token');
            return NextResponse.json(
                { error: 'Sesja weryfikacji wygasła lub jest nieprawidłowa. Rozpocznij rejestrację od nowa.' },
                { status: 403 }
            );
        }

        const prodentisId = tokenPayload.prodentisId;

        // Anti-substitution: phone w body musi pasować do phone w tokenie.
        // (Token wystawiony jest na konkretny numer; zmiana phone w body
        // bez nowego /verify call to próba podstawienia czyjegoś prodentisId.)
        const normalizedBodyPhone = String(phone).replace(/[\s-]/g, '');
        const normalizedTokenPhone = String(tokenPayload.phone).replace(/[\s-]/g, '');
        if (normalizedBodyPhone !== normalizedTokenPhone) {
            console.warn('[Register] Phone mismatch between body and token');
            return NextResponse.json(
                { error: 'Niezgodność danych. Rozpocznij rejestrację od nowa.' },
                { status: 403 }
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
        const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl')}/strefa-pacjenta/register/verify-email/${token}`;

        console.log('[Register] Attempting to send verification email to:', email);
        console.log('[Register] Verification URL:', verificationUrl);

        try {
            const { subject, html } = getEmailTemplate('verification_email', locale, {
                verificationUrl,
                year: String(new Date().getFullYear()),
            });

            await sendEmail({ to: email, subject, html });

            console.log('[Register] Verification email sent successfully');
        } catch (emailError) {
            console.error('[Register] Failed to send verification email:', emailError);
            // Don't fail the registration if email fails - log it
            // User can request new verification link later
        }

        // Push notification to admin
        broadcastPush('admin', 'patient_registered', { email }, '/admin').catch(console.error);

        // Telegram notification to default channel
        const now = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' });
        const telegramMsg =
            `👤 <b>NOWY PACJENT — REJESTRACJA</b>\n\n` +
            `🔵 <b>ID Prodentis:</b> ${prodentisId}\n` +
            `📧 <b>Email:</b> ${email}\n` +
            `📲 <b>Telefon:</b> ${normalizedPhone}\n` +
            `🕒 <b>Data rejestracji:</b> ${now}\n\n` +
            `ℹ️ Pacjent musi zweryfikować email, aby aktywować konto.`;
        sendTelegramNotification(telegramMsg, 'default').catch(console.error);

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
