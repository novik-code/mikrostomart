import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyTokenFromRequest } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/patients/delete-account
 * RODO: Soft-delete patient account — anonymizes PII, sets status to 'deleted'
 * Requires password confirmation for security
 */
export async function POST(request: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
        }

        const { password } = await request.json();

        if (!password) {
            return NextResponse.json({ error: 'Podaj hasło w celu potwierdzenia' }, { status: 400 });
        }

        // Fetch patient
        const { data: patient, error: fetchError } = await supabase
            .from('patients')
            .select('id, password_hash, first_name, last_name, phone')
            .eq('id', payload.userId)
            .single();

        if (fetchError || !patient) {
            return NextResponse.json({ error: 'Pacjent nie znaleziony' }, { status: 404 });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, patient.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: 'Nieprawidłowe hasło' }, { status: 403 });
        }

        // Soft-delete: anonymize PII, set status to 'deleted'
        const anonymizedId = `deleted_${patient.id.substring(0, 8)}`;
        const { error: updateError } = await supabase
            .from('patients')
            .update({
                first_name: 'Usunięty',
                last_name: 'Pacjent',
                phone: anonymizedId,
                email: null,
                password_hash: 'DELETED',
                account_status: 'deleted',
                notification_preferences: null,
            })
            .eq('id', payload.userId);

        if (updateError) {
            console.error('[DeleteAccount] Update error:', updateError);
            return NextResponse.json({ error: 'Nie udało się usunąć konta' }, { status: 500 });
        }

        // Clear httpOnly cookie
        const response = NextResponse.json({
            success: true,
            message: 'Konto zostało usunięte. Wszystkie dane osobowe zostały zanonimizowane.',
        });
        response.headers.set('Set-Cookie', 'patient_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');

        console.log('[DeleteAccount] Account deleted:', payload.userId);
        return response;

    } catch (err) {
        console.error('[DeleteAccount] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}
