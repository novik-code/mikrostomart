import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTranslatedPushToUser } from '@/lib/webpush';

export const maxDuration = 30;

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/**
 * 1-Hour Appointment Push Notification Cron
 * 
 * Runs every 15 minutes.
 * Checks for appointments starting in the 45-75 minute window from now.
 * Sends push notifications to subscribed patients.
 * 
 * Uses a simple dedup table check to avoid sending duplicates.
 */
export async function GET(req: Request) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('⏰ [Push 1h] Starting 1-hour appointment push cron...');

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let sent = 0;
    let skipped = 0;

    try {
        // Calculate time window: 45 min to 75 min from now
        const now = new Date();
        const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

        // Format for Prodentis API date query
        const today = now.toISOString().split('T')[0];
        console.log(`⏰ [Push 1h] Checking appointments for ${today} between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

        // Fetch today's appointments from Prodentis
        const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${today}`;
        const apiResponse = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!apiResponse.ok) {
            throw new Error(`Prodentis API error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const appointments = data.appointments || [];

        console.log(`⏰ [Push 1h] Found ${appointments.length} total appointments for today`);

        // Filter to appointments in the 45-75 min window
        for (const apt of appointments) {
            const aptDate = new Date(apt.date);
            if (aptDate < windowStart || aptDate > windowEnd) continue;

            const aptTime = `${aptDate.getUTCHours().toString().padStart(2, '0')}:${aptDate.getUTCMinutes().toString().padStart(2, '0')}`;
            const doctorName = apt.doctor?.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || 'Lekarz';

            console.log(`⏰ [Push 1h] Processing: ${apt.patientName} at ${aptTime} with ${doctorName}`);

            // Find patient in our DB
            const { data: patient } = await supabase
                .from('patients')
                .select('id')
                .eq('prodentis_id', apt.patientId)
                .maybeSingle();

            if (!patient?.id) {
                console.log(`   ⏭ Skipping: Patient not in our DB`);
                skipped++;
                continue;
            }

            // Check if push already sent for this appointment (dedup)
            const dedupKey = `push_1h_${apt.id}_${today}`;
            const { data: existing } = await supabase
                .from('push_subscriptions')
                .select('id')
                .eq('user_id', patient.id)
                .eq('user_type', 'patient')
                .limit(1);

            if (!existing || existing.length === 0) {
                console.log(`   ⏭ Skipping: Patient not subscribed to push`);
                skipped++;
                continue;
            }

            // Send push notification
            const result = await sendTranslatedPushToUser(
                patient.id,
                'patient',
                'appointment_1h',
                {
                    time: aptTime,
                    doctor: doctorName,
                },
                '/strefa-pacjenta/dashboard'
            );

            if (result.sent > 0) {
                sent++;
                console.log(`   ✅ Push sent to ${apt.patientName}`);
            } else {
                skipped++;
            }
        }

        console.log(`⏰ [Push 1h] Done: ${sent} sent, ${skipped} skipped`);

        return NextResponse.json({
            success: true,
            sent,
            skipped,
        });

    } catch (error: any) {
        console.error('⏰ [Push 1h] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
