import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple in-memory rate limiting (for production use Redis or similar)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(phone: string): boolean {
    const now = Date.now();
    const attempt = loginAttempts.get(phone);

    if (!attempt || now > attempt.resetAt) {
        loginAttempts.set(phone, { count: 1, resetAt: now + 60000 }); // 1 minute window
        return true;
    }

    if (attempt.count >= 5) {
        return false; // Too many attempts
    }

    attempt.count++;
    return true;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, password } = body;

        // Validation
        if (!phone || !password) {
            return NextResponse.json(
                { error: 'Brak numeru telefonu lub hasła' },
                { status: 400 }
            );
        }

        // Normalize phone
        const normalizedPhone = phone.replace(/[\s-]/g, '');

        // Rate limiting
        if (!checkRateLimit(normalizedPhone)) {
            return NextResponse.json(
                { error: 'Zbyt wiele prób logowania. Spróbuj za chwilę.' },
                { status: 429 }
            );
        }

        // Find patient in Supabase
        const { data: patient, error } = await supabase
            .from('patients')
            .select('*')
            .eq('phone', normalizedPhone)
            .single();

        if (error || !patient) {
            console.log('[Login] Patient not found:', normalizedPhone);
            return NextResponse.json(
                { error: 'Nieprawidłowy numer telefonu lub hasło' },
                { status: 401 }
            );
        }

        // Verify password
        const valid = await bcrypt.compare(password, patient.password_hash);

        if (!valid) {
            console.log('[Login] Invalid password for:', normalizedPhone);
            return NextResponse.json(
                { error: 'Nieprawidłowy numer telefonu lub hasło' },
                { status: 401 }
            );
        }

        // Fetch patient details from Prodentis
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

        const patientDetails = await prodentisResponse.json();

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

        return NextResponse.json({
            success: true,
            token,
            patient: {
                ...patientDetails,
                // Override with Supabase data if exists
                email: patient.email || patientDetails.email,
            },
        });

    } catch (error: any) {
        console.error('[Login] Error:', error);
        return NextResponse.json(
            { error: 'Błąd serwera' },
            { status: 500 }
        );
    }
}
