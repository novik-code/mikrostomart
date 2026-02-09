import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/admin/patients/search?q=searchTerm
 * 
 * Search patients by name in Prodentis appointment system.
 * Queries appointments across the next 14 days and past 7 days to build
 * a patient list, then filters by name query.
 * Returns unique patients with phone numbers.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim().toLowerCase();

        if (!query || query.length < 2) {
            return NextResponse.json({ patients: [], message: 'Query must be at least 2 characters' });
        }

        // Build date range: past 7 days + next 14 days = 21 days of appointments
        const dates: string[] = [];
        const now = new Date();
        for (let i = -7; i <= 14; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }

        // Fetch appointments for each date from Prodentis (in parallel batches)
        const allAppointments: any[] = [];
        const batchSize = 5;

        for (let i = 0; i < dates.length; i += batchSize) {
            const batch = dates.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(async (date) => {
                    try {
                        const res = await fetch(
                            `${PRODENTIS_API_URL}/api/appointments/by-date?date=${date}`,
                            {
                                headers: { 'Content-Type': 'application/json' },
                                signal: AbortSignal.timeout(5000)
                            }
                        );
                        if (res.ok) {
                            const data = await res.json();
                            return data.appointments || [];
                        }
                    } catch {
                        // Skip dates that fail
                    }
                    return [];
                })
            );
            allAppointments.push(...results.flat());
        }

        // Deduplicate patients by phone number and filter by name
        const patientMap = new Map<string, {
            phone: string;
            firstName: string;
            lastName: string;
            fullName: string;
        }>();

        for (const apt of allAppointments) {
            const name = apt.patientName || '';
            const phone = apt.patientPhone || '';

            if (!name || !phone) continue;

            // Check if name matches query
            if (!name.toLowerCase().includes(query)) continue;

            // Deduplicate by phone
            if (patientMap.has(phone)) continue;

            // Split name into parts (Prodentis gives "Imię NAZWISKO" or "Imię Nazwisko")
            const parts = name.trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';

            patientMap.set(phone, {
                phone,
                firstName,
                lastName,
                fullName: name.trim()
            });

            // Stop after 10 results
            if (patientMap.size >= 10) break;
        }

        const patients = Array.from(patientMap.values());

        console.log(`[Patient Search] Query: "${query}" → Found ${patients.length} matches from ${allAppointments.length} appointments`);

        return NextResponse.json({ patients });

    } catch (error) {
        console.error('[Patient Search] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
