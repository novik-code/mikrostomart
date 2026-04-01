import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(request: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
            const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
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
                await sendEmail({
                    to: patient.email,
                    subject: 'Konto zatwierdzone - Mikrostomart Strefa Pacjenta',
                    html: demoSanitize(`
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
                                   style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Zaloguj się
                                </a>
                            </p>
                            <p style="color: #666; font-size: 0.9rem; margin-top: 2rem;">
                                Pozdrawiamy,<br/>
                                Zespół Mikrostomart
                            </p>
                        </div>
                    `)
                });
            } catch (emailError) {
                console.error('Failed tosend approval email:', emailError);
                // Don't fail the whole request if email fails
            }
        }

        // GDPR audit log
        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'patient_approved',
            resourceType: 'patient',
            resourceId: patient_id,
            request,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Admin] Approve error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
