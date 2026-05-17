import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

export async function GET(request: Request) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        // Fetch all patients from Supabase
        const { data: patients, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Admin] Supabase error:', error);
            return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
        }

        // Enrich with Prodentis data for each patient
        const enrichedPatients = await Promise.all(
            (patients || []).map(async (patient) => {
                try {
                    const detailsRes = await fetch(
                        `${prodentisUrl}/api/patient/${patient.prodentis_id}/details`,
                        { signal: AbortSignal.timeout(3000) }
                    );

                    if (detailsRes.ok) {
                        const details = await detailsRes.json();
                        return {
                            id: patient.id,
                            prodentisId: patient.prodentis_id,
                            phone: patient.phone,
                            firstName: details.firstName,
                            lastName: details.lastName,
                            email: patient.email || details.email,
                            lastLogin: patient.last_login,
                            createdAt: patient.created_at,
                            accountStatus: patient.account_status,
                            emailVerified: patient.email_verified,
                            visitsCount: 0, // TODO: Get from Prodentis if needed
                        };
                    }
                } catch (err) {
                    console.error(`Failed to fetch details for ${patient.prodentis_id}`);
                }

                // Fallback if Prodentis API fails
                return {
                    id: patient.id,
                    prodentisId: patient.prodentis_id,
                    phone: patient.phone,
                    firstName: 'N/A',
                    lastName: 'N/A',
                    email: patient.email,
                    lastLogin: patient.last_login,
                    createdAt: patient.created_at,
                    accountStatus: patient.account_status,
                    emailVerified: patient.email_verified,
                    visitsCount: 0,
                };
            })
        );

        // List view NOT logged (frequent dashboard polling = noise in audit log).
        // Only specific patient deep-reads + actions are logged.

        return NextResponse.json({ patients: enrichedPatients });

    } catch (error: any) {
        console.error('[Admin] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('id');

        if (!patientId) {
            return NextResponse.json({ error: 'Missing patient ID' }, { status: 400 });
        }

        // Audit log BEFORE delete (so we can capture patient name if needed)
        const { data: patientToDelete } = await supabase
            .from('patients')
            .select('first_name, last_name, prodentis_id, phone')
            .eq('id', patientId)
            .maybeSingle();

        // Delete from Supabase
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', patientId);

        if (error) {
            console.error('[Admin] Delete error:', error);
            return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
        }

        logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'admin_delete_patient', resourceType: 'patient',
            resourceId: patientId,
            patientName: patientToDelete ? `${patientToDelete.first_name || ''} ${patientToDelete.last_name || ''}`.trim() : undefined,
            metadata: { prodentis_id: patientToDelete?.prodentis_id || null },
            request,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Admin] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
