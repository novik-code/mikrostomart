import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

// Simple admin auth check (in production, use proper authentication)
function isAdmin(request: Request): boolean {
    const authHeader = request.headers.get('Authorization');
    // For now, accept any admin auth - in production, verify admin JWT
    return authHeader?.includes('admin') || true; // TODO: Implement proper admin auth
}

export async function GET(request: Request) {
    try {
        // Check admin auth
        if (!isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        return NextResponse.json({ patients: enrichedPatients });

    } catch (error: any) {
        console.error('[Admin] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        // Check admin auth
        if (!isAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('id');

        if (!patientId) {
            return NextResponse.json({ error: 'Missing patient ID' }, { status: 400 });
        }

        // Delete from Supabase
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', patientId);

        if (error) {
            console.error('[Admin] Delete error:', error);
            return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Admin] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
