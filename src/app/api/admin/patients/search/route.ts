import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/admin/patients/search?q=searchTerm
 * 
 * Search patients by name — fetches from Supabase, enriches with Prodentis names,
 * then filters by query. Returns top 10 matches with phone numbers.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim().toLowerCase();

        if (!query || query.length < 2) {
            return NextResponse.json({ patients: [], message: 'Query must be at least 2 characters' });
        }

        // Fetch all patients from Supabase
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone, email')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Supabase error: ${error.message}`);
        }

        if (!patients || patients.length === 0) {
            return NextResponse.json({ patients: [] });
        }

        // Enrich with Prodentis names and filter by query
        const results: Array<{
            id: string;
            prodentisId: string;
            phone: string;
            firstName: string;
            lastName: string;
            fullName: string;
        }> = [];

        // Process in parallel batches of 10 for speed
        const batchSize = 10;
        for (let i = 0; i < patients.length && results.length < 10; i += batchSize) {
            const batch = patients.slice(i, i + batchSize);

            const enriched = await Promise.all(
                batch.map(async (patient) => {
                    try {
                        const res = await fetch(
                            `${prodentisUrl}/api/patient/${patient.prodentis_id}/details`,
                            { signal: AbortSignal.timeout(2000) }
                        );

                        if (res.ok) {
                            const details = await res.json();
                            const firstName = details.firstName || '';
                            const lastName = details.lastName || '';
                            const fullName = `${firstName} ${lastName}`.trim();

                            // Check if name matches query
                            if (fullName.toLowerCase().includes(query)) {
                                return {
                                    id: patient.id,
                                    prodentisId: patient.prodentis_id,
                                    phone: patient.phone || '',
                                    firstName,
                                    lastName,
                                    fullName
                                };
                            }
                        }
                    } catch {
                        // Skip patients whose details can't be fetched
                    }
                    return null;
                })
            );

            for (const result of enriched) {
                if (result && results.length < 10) {
                    results.push(result);
                }
            }
        }

        return NextResponse.json({ patients: results });

    } catch (error) {
        console.error('[Patient Search] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
