import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prodentisId, phone, password, email } = body;

        // Validation
        if (!prodentisId || !phone || !password) {
            return NextResponse.json(
                { error: 'Brak wymaganych danych: prodentisId, phone, password' },
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

        // Insert to database
        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                prodentis_id: prodentisId,
                phone: normalizedPhone,
                password_hash: passwordHash,
                email: email || null,
            })
            .select()
            .single();

        if (error) {
            console.error('[Register] Supabase error:', error);
            return NextResponse.json(
                { error: 'Nie udało się utworzyć konta' },
                { status: 500 }
            );
        }

        console.log('[Register] Account created:', patient.id);

        return NextResponse.json({
            success: true,
            patientId: patient.id,
        });

    } catch (error: any) {
        console.error('[Register] Error:', error);
        return NextResponse.json(
            { error: 'Błąd serwera' },
            { status: 500 }
        );
    }
}
