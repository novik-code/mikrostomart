import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Brak tokenu weryfikacyjnego' },
                { status: 400 }
            );
        }

        console.log('[Verify Email] Verifying token:', token);

        // Find verification token
        const { data: tokenData, error: tokenError } = await supabase
            .from('email_verification_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData) {
            console.error('[Verify Email] Token not found:', tokenError);
            return NextResponse.json(
                { error: 'Nieprawidłowy lub wygasły link weryfikacyjny' },
                { status: 400 }
            );
        }

        // Check if already used
        if (tokenData.used) {
            console.log('[Verify Email] Token already used');
            return NextResponse.json(
                { error: 'Ten link został już użyty' },
                { status: 400 }
            );
        }

        // Check if expired
        const expiresAt = new Date(tokenData.expires_at);
        if (expiresAt < new Date()) {
            console.log('[Verify Email] Token expired');
            return NextResponse.json(
                { error: 'Link weryfikacyjny wygasł. Zarejestruj się ponownie.' },
                { status: 400 }
            );
        }

        // Check if account already exists
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', tokenData.prodentis_id)
            .single();

        if (existingPatient) {
            console.log('[Verify Email] Account already exists');
            return NextResponse.json(
                { error: 'Konto już istnieje. Zaloguj się.' },
                { status: 409 }
            );
        }

        // Create patient account with PENDING_ADMIN_APPROVAL status
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert({
                prodentis_id: tokenData.prodentis_id,
                phone: tokenData.phone,
                password_hash: tokenData.password_hash,
                email: tokenData.email,
                account_status: 'pending_admin_approval',
                email_verified: true,
                email_verified_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (patientError) {
            console.error('[Verify Email] Failed to create account:', patientError);
            return NextResponse.json(
                { error: 'Nie udało się utworzyć konta' },
                { status: 500 }
            );
        }

        // Mark token as used
        await supabase
            .from('email_verification_tokens')
            .update({
                used: true,
                used_at: new Date().toISOString(),
            })
            .eq('token', token);

        console.log('[Verify Email] Account created successfully:', patient.id);

        return NextResponse.json({
            success: true,
            message: 'Email zweryfikowany! Twoje konto oczekuje na zatwierdzenie przez administratora.',
        });

    } catch (error: any) {
        console.error('[Verify Email] Error:', error);
        return NextResponse.json(
            { error: 'Błąd serwera' },
            { status: 500 }
        );
    }
}
