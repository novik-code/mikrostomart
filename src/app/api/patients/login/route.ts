import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DB-backed rate limiting — persists across deployments and cold starts
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_IDENTIFIER = 5;
const MAX_ATTEMPTS_PER_IP = 20;

async function checkRateLimit(identifier: string, ip: string | null): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

    // Check by identifier (phone/email)
    const { count: identifierCount } = await supabase
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('identifier', identifier)
        .gte('attempted_at', windowStart);

    if ((identifierCount ?? 0) >= MAX_ATTEMPTS_PER_IDENTIFIER) {
        return { allowed: false, retryAfterSeconds: RATE_LIMIT_WINDOW_MINUTES * 60 };
    }

    // Check by IP (if available)
    if (ip) {
        const { count: ipCount } = await supabase
            .from('login_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('ip_address', ip)
            .gte('attempted_at', windowStart);

        if ((ipCount ?? 0) >= MAX_ATTEMPTS_PER_IP) {
            return { allowed: false, retryAfterSeconds: RATE_LIMIT_WINDOW_MINUTES * 60 };
        }
    }

    return { allowed: true };
}

async function recordLoginAttempt(identifier: string, ip: string | null, success: boolean) {
    await supabase.from('login_attempts').insert({
        identifier,
        ip_address: ip,
        success,
    });

    // Cleanup: delete attempts older than 24h (non-blocking)
    void (async () => {
        try {
            await supabase
                .from('login_attempts')
                .delete()
                .lt('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        } catch (e) {
            console.error('[RateLimit] Cleanup error:', e);
        }
    })();
}

// S10-2: locale-aware error messages dla nowych account_status guards.
// Locale przekazywany z body (frontend i tak ma locale w URL), fallback PL.
type StatusErrorCode =
    | 'pending_email_verification'
    | 'pending_admin_approval'
    | 'rejected'
    | 'inactive'
    | 'invalid_credentials';

const STATUS_ERRORS: Record<StatusErrorCode, Record<'pl' | 'en' | 'de' | 'ua', string>> = {
    pending_email_verification: {
        pl: 'Konto nie zostało jeszcze potwierdzone. Sprawdź swój email i kliknij link weryfikacyjny.',
        en: 'Account not yet confirmed. Please check your email and click the verification link.',
        de: 'Konto noch nicht bestätigt. Bitte prüfen Sie Ihre E-Mail und klicken Sie auf den Bestätigungslink.',
        ua: 'Обліковий запис ще не підтверджено. Перевірте електронну пошту та натисніть посилання для підтвердження.',
    },
    pending_admin_approval: {
        pl: 'Konto oczekuje na zatwierdzenie przez administratora. Otrzymasz email po zatwierdzeniu (zwykle do 48h).',
        en: 'Account awaiting administrator approval. You will receive an email once approved (usually within 48h).',
        de: 'Konto wartet auf Genehmigung durch den Administrator. Sie erhalten eine E-Mail nach Genehmigung (in der Regel innerhalb von 48 Stunden).',
        ua: 'Обліковий запис очікує на затвердження адміністратором. Ви отримаєте електронний лист після затвердження (зазвичай протягом 48 годин).',
    },
    rejected: {
        pl: 'Konto zostało odrzucone. Skontaktuj się z kliniką, aby uzyskać więcej informacji.',
        en: 'Account has been rejected. Please contact the clinic for more information.',
        de: 'Konto wurde abgelehnt. Bitte kontaktieren Sie die Klinik für weitere Informationen.',
        ua: 'Обліковий запис відхилено. Зверніться до клініки для отримання додаткової інформації.',
    },
    inactive: {
        pl: 'Konto nie jest aktywne. Skontaktuj się z kliniką.',
        en: 'Account is not active. Please contact the clinic.',
        de: 'Konto ist nicht aktiv. Bitte kontaktieren Sie die Klinik.',
        ua: 'Обліковий запис неактивний. Зверніться до клініки.',
    },
    invalid_credentials: {
        pl: 'Nieprawidłowy numer telefonu lub hasło',
        en: 'Invalid phone number or password',
        de: 'Ungültige Telefonnummer oder Passwort',
        ua: 'Невірний номер телефону або пароль',
    },
};

function statusError(code: StatusErrorCode, locale: string): string {
    const loc = (['pl', 'en', 'de', 'ua'].includes(locale) ? locale : 'pl') as 'pl' | 'en' | 'de' | 'ua';
    return STATUS_ERRORS[code][loc];
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, password, locale: requestLocale } = body;
        const locale = ['pl', 'en', 'de', 'ua'].includes(requestLocale) ? requestLocale : 'pl';

        // Natywny klient (aplikacja mobilna) wysyła `X-Client: native`. Nie ma
        // dostępu do httpOnly cookie (trzyma token w SecureStore i wysyła jako
        // Authorization: Bearer), więc dostaje JWT w JSON OBOK cookie. Web zostaje
        // cookie-only (S4-5, anty-XSS). Brama na dokładne dopasowanie === 'native',
        // żeby przypadkowa wartość nagłówka nie odsłoniła tokenu.
        const isNativeClient = request.headers.get('x-client') === 'native';

        // Validation
        if (!phone || !password) {
            return NextResponse.json(
                { error: 'Brak numeru telefonu/email lub hasła' },
                { status: 400 }
            );
        }

        // Detect if input is email or phone
        const isEmail = phone.includes('@');
        const loginIdentifier = isEmail ? phone.trim().toLowerCase() : phone.replace(/[\s-]/g, '');

        // Extract IP address from request headers
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || null;

        // Rate limiting (DB-backed)
        const rateLimit = await checkRateLimit(loginIdentifier, ip);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Zbyt wiele prób logowania. Spróbuj za ' + Math.ceil((rateLimit.retryAfterSeconds || 900) / 60) + ' minut.' },
                { status: 429 }
            );
        }

        // Find patient in Supabase — by email or phone
        let query = supabase.from('patients').select('*');
        if (isEmail) {
            query = query.ilike('email', loginIdentifier);
        } else {
            query = query.eq('phone', loginIdentifier);
        }
        const { data: patient, error } = await query.single();

        if (error || !patient) {
            console.log('[Login] Patient not found:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: statusError('invalid_credentials', locale) },
                { status: 401 }
            );
        }

        // Verify password
        const valid = await bcrypt.compare(password, patient.password_hash);

        if (!valid) {
            console.log('[Login] Invalid password for:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: statusError('invalid_credentials', locale) },
                { status: 401 }
            );
        }

        // S10-2: account_status enforcement (audyt P0 #2).
        // Login musi blokować pending/rejected/deleted PRZED wydaniem JWT.
        // Patient's saved locale ma pierwszeństwo nad request locale (komunikat
        // w jego preferowanym języku), fallback do request locale.
        const patientLocale = patient.locale && ['pl', 'en', 'de', 'ua'].includes(patient.locale)
            ? patient.locale
            : locale;

        if (!patient.email_verified || patient.account_status === 'pending_email_verification') {
            console.log('[Login] Email not verified:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: statusError('pending_email_verification', patientLocale) },
                { status: 403 }
            );
        }

        if (patient.account_status === 'pending_admin_approval') {
            console.log('[Login] Pending admin approval:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: statusError('pending_admin_approval', patientLocale) },
                { status: 403 }
            );
        }

        if (patient.account_status === 'rejected') {
            console.log('[Login] Rejected account:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: statusError('rejected', patientLocale) },
                { status: 403 }
            );
        }

        // Catch-all dla deleted (z /api/patients/delete-account) lub innych
        // niestandardowych statusów. Status 'deleted' → bez info leaku, ten
        // sam generic message co dla każdego niestandardowego stanu.
        if (patient.account_status !== 'active') {
            console.log('[Login] Inactive account, status =', patient.account_status, 'for:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: statusError('inactive', patientLocale) },
                { status: 403 }
            );
        }

        // Fetch patient details — in demo mode, use Supabase data directly
        let patientDetails: any;

        if (isDemoMode) {
            console.log('[Login] DEMO MODE: Using Supabase patient data instead of Prodentis');
            patientDetails = {
                id: patient.prodentis_id || patient.id,
                firstName: patient.first_name || patient.name?.split(' ')[0] || 'Demo',
                lastName: patient.last_name || patient.name?.split(' ').slice(1).join(' ') || 'Pacjent',
                phone: patient.phone,
                email: patient.email,
                dateOfBirth: patient.date_of_birth || null,
                appointments: [],
            };
        } else {
            const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
            const detailsUrl = `${prodentisUrl}/api/patient/${patient.prodentis_id}/details`;

            const prodentisResponse = await fetch(detailsUrl);
            if (!prodentisResponse.ok) {
                console.error('[Login] Failed to fetch from Prodentis');
                return NextResponse.json(
                    { error: 'Błąd pobierania danych z systemu' },
                    { status: 500 }
                );
            }

            patientDetails = await prodentisResponse.json();
        }

        // Generate JWT
        const jwtSecret = process.env.JWT_SECRET!;

        // Natywna apka (X-Client: native) trzyma token w SecureStore i odblokowuje
        // biometrią → dłuższa sesja 30 dni. Web (cookie) zostaje na 7 dniach.
        const signOptions: SignOptions = {
            expiresIn: isNativeClient ? '30d' : '7d',
        };

        const token = jwt.sign(
            {
                prodentisId: patient.prodentis_id,
                phone: patient.phone,
                userId: patient.id,
            },
            jwtSecret,
            signOptions
        );

        // Update last_login
        await supabase
            .from('patients')
            .update({ last_login: new Date().toISOString() })
            .eq('id', patient.id);

        console.log('[Login] Success:', patient.prodentis_id);
        await recordLoginAttempt(loginIdentifier, ip, true);

        const response = NextResponse.json({
            success: true,
            // S4-5: `token` removed from response body for WEB clients. The JWT
            // lives ONLY in the httpOnly cookie set below — JS can't read it, so a
            // future XSS payload (if it bypasses sanitize-html from S4-1 v2)
            // can't exfiltrate the patient session.
            // Patient API endpoints all use verifyTokenFromRequest from
            // @/lib/jwt which falls back to the httpOnly cookie when the
            // Authorization header is missing — so removing the body-token
            // doesn't break any existing fetch in the patient zone.
            // WYJĄTEK natywny: aplikacja mobilna (X-Client: native) nie ma cookie,
            // więc dostaje token w JSON. To ten sam JWT co w cookie (poniżej).
            ...(isNativeClient ? { token } : {}),
            patient: {
                ...patientDetails,
                // Override with Supabase data if exists
                email: patient.email || patientDetails.email,
                // Include Supabase UUID for push subscriptions (matches chat_conversations.patient_id)
                supabaseId: patient.id,
                prodentis_id: patient.prodentis_id,
            },
        });

        // Set httpOnly cookie — browser cannot access via JS, only sent with requests
        response.cookies.set('patient_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days (matches JWT expiry)
        });

        return response;

    } catch (error: any) {
        console.error('[Login] Error:', error);
        return NextResponse.json(
            { error: 'Błąd serwera' },
            { status: 500 }
        );
    }
}
