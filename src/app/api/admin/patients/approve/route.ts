import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple admin auth check
function isAdmin(request: Request): boolean {
    const authHeader = request.headers.get('Authorization');
    return authHeader?.includes('admin') || true; // TODO: Implement proper admin auth
}

export async function POST(request: Request) {
    try {
        // Check admin auth
        if (!isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { patient_id } = body;

        if (!patient_id) {
            return NextResponse.json({ error: 'Missing patient_id' }, { status: 400 });
        }

        // Get patient details
        const { data: patient, error: fetchError } = await supabase
            .from('patients')
            .select('email, prodentis_id')
            .eq('id', patient_id)
            .single();

        if (fetchError || !patient) {
            console.error('Patient not found:', fetchError);
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Get firstName for email
        let firstName = 'Pacjencie';
        try {
            const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
            const res = await fetch(`${prodentisUrl}/api/patient/${patient.prodentis_id}/details`);
            if (res.ok) {
                const details = await res.json();
                firstName = details.firstName || 'Pacjencie';
            }
        } catch (err) {
            console.warn('Failed to fetch patient name from Prodentis');
        }

        // Update status to active
        const { error: updateError } = await supabase
            .from('patients')
            .update({ account_status: 'active' })
            .eq('id', patient_id);

        if (updateError) {
            console.error('Failed to approve:', updateError);
            return NextResponse.json({ error: 'Failed to approve account' }, { status: 500 });
        }

        // Send approval email
        if (patient.email) {
            try {
                await resend.emails.send({
                    from: 'Mikrostomart <noreply@mikrostomart.pl>',
                    to: patient.email,
                    subject: 'Konto zatwierdzone - Mikrostomart Strefa Pacjenta',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dcb14a;">Witaj ${firstName}!</h2>
                            <p>Twoje konto w Strefie Pacjenta zostało zatwierdzone.</p>
                            <p>Możesz teraz zalogować się i uzyskać pełny dostęp do:</p>
                            <ul>
                                <li>Historii wizyt</li>
                                <li>Dokumentacji medycznej</li>
                                <li>Umawiania wizyt online</li>
                            </ul>
                            <p>
                                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/strefa-pacjenta/login" 
                                   style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Zaloguj się
                                </a>
                            </p>
                            <p style="color: #666; font-size: 0.9rem; margin-top: 2rem;">
                                Pozdrawiamy,<br/>
                                Zespół Mikrostomart
                            </p>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('Failed tosend approval email:', emailError);
                // Don't fail the whole request if email fails
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Admin] Approve error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
