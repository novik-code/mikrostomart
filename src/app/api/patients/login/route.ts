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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, password } = body;

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
                { error: 'Nieprawidłowy numer telefonu lub hasło' },
                { status: 401 }
            );
        }

        // Verify password
        const valid = await bcrypt.compare(password, patient.password_hash);

        if (!valid) {
            console.log('[Login] Invalid password for:', loginIdentifier);
            await recordLoginAttempt(loginIdentifier, ip, false);
            return NextResponse.json(
                { error: 'Nieprawidłowy numer telefonu lub hasło' },
                { status: 401 }
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
            const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
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

        const signOptions: SignOptions = {
            expiresIn: '7d' as const
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
            token, // kept for backward compatibility
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
