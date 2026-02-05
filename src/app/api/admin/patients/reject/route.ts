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
        const { patient_id, reason } = body;

        if (!patient_id || !reason) {
            return NextResponse.json({ error: 'Missing patient_id or reason' }, { status: 400 });
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

        // Update status to rejected with reason
        const { error: updateError } = await supabase
            .from('patients')
            .update({
                account_status: 'rejected',
                admin_rejection_reason: reason
            })
            .eq('id', patient_id);

        if (updateError) {
            console.error('Failed to reject:', updateError);
            return NextResponse.json({ error: 'Failed to reject account' }, { status: 500 });
        }

        // Send rejection email
        if (patient.email) {
            try {
                await resend.emails.send({
                    from: 'Mikrostomart <noreply@mikrostomart.pl>',
                    to: patient.email,
                    subject: 'Rejestracja w Strefie Pacjenta - wymagane wyjaśnienie',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #ef4444;">Witaj ${firstName}!</h2>
                            <p>Niestety nie mogliśmy automatycznie zatwierdzić Twojego konta.</p>
                            <div style="background: #fee; border-left: 4px solid #ef4444; padding: 1rem; margin: 1.5rem 0;">
                                <strong>Powód:</strong> ${reason}
                            </div>
                            <p>Prosimy o kontakt z recepcją:</p>
                            <ul>
                                <li>📞 <strong>570 270 470</strong></li>
                                <li>📧 <strong>kontakt@mikrostomart.pl</strong></li>
                            </ul>
                            <p style="color: #666; font-size: 0.9rem; margin-top: 2rem;">
                                Pozdrawiamy,<br/>
                                Zespół Mikrostomart
                            </p>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError);
                // Don't fail the whole request if email fails
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Admin] Reject error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
