import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { broadcastPush } from '@/lib/pushService';
import { sendTelegramNotification } from '@/lib/telegram';
import { getEmailTemplate } from '@/lib/emailTemplates';
import { samePhone } from '@/lib/phone';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { verifyRegistrationToken } from '@/lib/registrationToken';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

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

        /**
         * 🔒 LIMIT PRÓB REJESTRACJI (dodany 2026-08-14).
         *
         * Trasa jest PUBLICZNA i przy każdym wywołaniu robi dwie kosztowne rzeczy:
         * `bcrypt.hash` (celowo wolny) oraz WYSYŁKĘ MAILA na adres podany w ciele
         * żądania. Bez limitu dawało to trzy nadużycia naraz:
         *  · bombardowanie dowolnego adresu e-mail wiadomościami od kliniki,
         *  · wysycenie lambdy samym bcryptem,
         *  · zalanie recepcji zgłoszeniami „konto czeka na zatwierdzenie".
         *
         * Dwa wymiary, bo każdy łapie co innego: IP odcina masową wysyłkę z jednego
         * źródła, a token — uporczywe powtarzanie na tej samej, raz zweryfikowanej
         * tożsamości (token z /verify jest wielorazowy przez pełne 10 minut).
         *
         * `failClosed: true` — przy awarii licznika WOLIMY odmówić rejestracji niż
         * zostawić otwarty kanał wysyłki maili. To ta sama asymetria co przy limitach
         * symulatora: koszt fałszywej odmowy jest odwracalny, koszt nadużycia nie.
         */
        const regIp = getClientIP(request);
        const [okIp, okToken] = await Promise.all([
            checkRateLimit(`pregister:ip:${regIp}`, 5, 15 * 60_000, { failClosed: true }),
            checkRateLimit(`pregister:tok:${prodentisId}`, 3, 60 * 60_000, { failClosed: true }),
        ]);
        if (!okIp.allowed || !okToken.allowed) {
            console.warn('[Register] limit prób rejestracji przekroczony');
            return NextResponse.json(
                { error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za kilkanaście minut.' },
                { status: 429, headers: { 'Retry-After': String(!okIp.allowed ? 15 * 60 : 60 * 60) } }
            );
        }

        // Anti-substitution: phone w body musi pasować do phone w tokenie.
        // (Token wystawiony jest na konkretny numer; zmiana phone w body
        // bez nowego /verify call to próba podstawienia czyjegoś prodentisId.)
        // 🔴 TU PĘKAŁO ZAKŁADANIE KONTA. Porównanie było równością stringów po usunięciu
        // wyłącznie spacji i myślników, więc prefiks kraju przeżywał: krok 1 podpisywał
        // token numerem WPISANYM przez pacjenta, a klient zaraz potem nadpisywał pole
        // numerem odczytanym z Prodentisa. Gdy notacje się różniły ("+48 790 740 770"
        // vs "790740770"), pacjent dostawał 403 na ostatnim kroku i nie miał jak przejść
        // dalej inaczej niż trafiając w format Prodentisa. Zgłoszenie: Marek Nega, 2026-08-05.
        //
        // Zabezpieczenie przed podstawieniem CUDZEGO numeru zostaje nienaruszone —
        // porównujemy nadal ten sam numer, tylko sprowadzony do jednej postaci.
        if (!samePhone(phone, tokenPayload.phone)) {
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

        // Send verification email — Z RETRY (łapie transienty Resend/sieci) i
        // JAWNYM zapisem statusu, żeby dało się ustalić, czy mail wyszedł.
        const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl')}/strefa-pacjenta/register/verify-email/${token}`;

        const { subject, html } = getEmailTemplate('verification_email', locale, {
            verificationUrl,
            year: String(new Date().getFullYear()),
        });

        const MAX_EMAIL_ATTEMPTS = 3;
        let emailSent = false;
        let emailError: string | null = 'not attempted';
        let emailAttempts = 0;
        for (let i = 0; i < MAX_EMAIL_ATTEMPTS; i++) {
            emailAttempts = i + 1;
            // sendEmail NIE rzuca — zwraca { success, id, error }. Sprawdzamy wynik.
            const res = await sendEmail({ to: email, subject, html });
            if (res.success) {
                emailSent = true;
                emailError = null;
                console.log(`[Register] Verification email sent (attempt ${emailAttempts}) id: ${res.id}`);
                break;
            }
            emailError = res.error ?? 'unknown';
            console.error(`[Register] Verification email FAILED (attempt ${emailAttempts}/${MAX_EMAIL_ATTEMPTS}):`, emailError);
            if (i < MAX_EMAIL_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 800));
        }

        // Ślad diagnostyczny na tokenie (mig 176): czy mail wyszedł / po ilu próbach / błąd.
        // Zapytanie „komu mail nie wyszedł": email_verification_tokens WHERE email_sent=false AND used=false.
        const { error: statusErr } = await supabase
            .from('email_verification_tokens')
            .update({
                email_sent: emailSent,
                email_sent_at: emailSent ? new Date().toISOString() : null,
                email_error: emailError,
                email_attempts: emailAttempts,
            })
            .eq('token', token);
        if (statusErr) console.error('[Register] Failed to record email status:', statusErr.message);

        // Push notification to admin — na OBA kanały (web-push FCM + apka przez Expo).
        // 🪤 Bez `alsoApp` powiadomienie leci WYŁĄCZNIE na `fcm_tokens`, czyli do przeglądarki.
        // Admin korzystający z apki dostawał wtedy sam Telegram i wyglądało to na awarię pusha
        // (zgłoszone z produkcji 2026-08-05). Rejestracje są rzadkie i każda wymaga reakcji
        // (zatwierdzenie konta), więc kanał aplikacji jest tu właściwy.
        broadcastPush('admin', 'patient_registered', { email }, '/admin', { alsoApp: true }).catch(console.error);

        // Telegram do recepcji — JAWNIE oznacz, czy mail wyszedł.
        const now = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' });
        const mailLine = emailSent
            ? `✅ <b>Mail weryfikacyjny wysłany.</b> Pacjent musi kliknąć link, aby konto trafiło do zatwierdzenia.`
            : `⚠️ <b>UWAGA: MAIL NIE WYSZEDŁ</b> (po ${emailAttempts} próbach: ${emailError}). Pacjent NIE dostał linku i NIE pojawi się do zatwierdzenia — recepcja musi się z nim skontaktować.`;
        const telegramMsg =
            `👤 <b>NOWY PACJENT — REJESTRACJA</b>\n\n` +
            `🔵 <b>ID Prodentis:</b> ${prodentisId}\n` +
            `📧 <b>Email:</b> ${email}\n` +
            `📲 <b>Telefon:</b> ${normalizedPhone}\n` +
            `🕒 <b>Data rejestracji:</b> ${now}\n\n` +
            mailLine;
        sendTelegramNotification(telegramMsg, 'default').catch(console.error);

        return NextResponse.json({
            success: true,
            emailSent, // additive — live app ignoruje; nowszy build może pokazać właściwy komunikat
            message: emailSent
                ? 'Sprawdź swoją skrzynkę email, aby dokończyć rejestrację'
                : 'Konto założone, ale nie udało się wysłać maila. Recepcja wkrótce się z Tobą skontaktuje.',
        });

    } catch (error: any) {
        console.error('[Register] Error:', error);
        return NextResponse.json(
            { error: 'Błąd serwera' },
            { status: 500 }
        );
    }
}
