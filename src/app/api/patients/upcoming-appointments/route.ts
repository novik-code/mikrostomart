import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/patients/upcoming-appointments
 * 
 * Returns all FUTURE appointments for the authenticated patient.
 * Scans the Prodentis schedule day-by-day for the next 90 days,
 * filtering by the patient's prodentisId.
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const patientId = payload.prodentisId;
        console.log('[UpcomingAppointments] Scanning schedule for patient:', patientId);

        // Scan the next 90 days of the schedule
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allFuture: any[] = [];
        const daysToScan = 90;
        const batchSize = 7; // Fetch 7 days at a time

        // Process in weekly batches to reduce API calls
        for (let dayOffset = 0; dayOffset < daysToScan; dayOffset += batchSize) {
            const batchPromises: Promise<any>[] = [];

            for (let d = dayOffset; d < Math.min(dayOffset + batchSize, daysToScan); d++) {
                const scanDate = new Date(today);
                scanDate.setDate(scanDate.getDate() + d);

                // Skip weekends (Sat=6, Sun=0)
                const dow = scanDate.getDay();
                if (dow === 0 || dow === 6) continue;

                const dateStr = scanDate.toISOString().split('T')[0];
                batchPromises.push(
                    fetch(`${PRODENTIS_API}/api/appointments/by-date?date=${dateStr}`, {
                        headers: { 'Content-Type': 'application/json' },
                        cache: 'no-store',
                    })
                        .then(res => res.ok ? res.json() : { appointments: [] })
                        .then(data => {
                            const apts = data.appointments || [];
                            // Filter only THIS patient's appointments
                            return apts.filter((a: any) => a.patientId === patientId);
                        })
                        .catch(() => [])
                );
            }

            const batchResults = await Promise.all(batchPromises);
            for (const result of batchResults) {
                allFuture.push(...result);
            }

            // Early stop: if we found appointments, keep scanning
            // but if no results after 4 weeks, stop early
            if (dayOffset >= 28 && allFuture.length === 0) {
                break;
            }
        }

        // Sort by date ascending
        allFuture.sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Map to the expected format
        const mapped = allFuture.map((apt: any) => ({
            scheduleId: apt.id || null,
            date: apt.date,
            endDate: apt.endDate || (() => {
                // Calculate endDate from duration if available
                const start = new Date(apt.date);
                start.setMinutes(start.getMinutes() + (apt.duration || 30));
                return start.toISOString();
            })(),
            doctor: apt.doctor || {},
            duration: apt.duration || 30,
        }));

        console.log('[UpcomingAppointments] Found', mapped.length, 'appointment(s) for patient', patientId);

        return NextResponse.json({ appointments: mapped });

    } catch (error: any) {
        console.error('[UpcomingAppointments] Error:', error);
        return NextResponse.json({ appointments: [] });
    }
}
