import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushToUser, PushPayload } from '@/lib/pushService';
import { verifyAdmin } from '@/lib/auth';

/**
 * POST /api/admin/push-send
 * Auth: admin required.
 * 
 * Send a manual push notification to a patient.
 * Looks up patient's portal account by phone number or prodentis_id.
 * 
 * Body: {
 *   phone?: string,           — patient phone to look up account
 *   prodentis_id?: string,    — prodentis patient ID to look up account  
 *   patient_name?: string,    — for logging
 *   title: string,            — push notification title
 *   body: string,             — push notification body
 *   url?: string,             — optional deep link URL
 *   sent_by: string           — admin email
 * }
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    console.log('🔔 [Manual Push] Starting...');

    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { phone, prodentis_id, patient_name, title, body: pushBody, url, sent_by } = body;

        if (!title || !pushBody) {
            return NextResponse.json(
                { error: 'Missing required fields: title, body' },
                { status: 400 }
            );
        }

        if (!phone && !prodentis_id) {
            return NextResponse.json(
                { error: 'Provide phone or prodentis_id to identify patient' },
                { status: 400 }
            );
        }

        // Find patient's portal account
        // Note: patients.id IS the user_id used for FCM tokens
        let patientUserId: string | null = null;
        let patientUserType: 'patient' | 'employee' | 'admin' = 'patient';

        // Strategy 1: Look up by phone in patients table
        if (phone) {
            const normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
            const phonePlus = `+${normalizedPhone}`;

            console.log(`  🔍 Looking up patient by phone: ${normalizedPhone} / ${phonePlus}`);

            // Search in patients table (portal accounts)
            const { data: patients, error: phoneErr } = await supabase
                .from('patients')
                .select('id, prodentis_id, phone')
                .or(`phone.eq.${normalizedPhone},phone.eq.${phonePlus}`)
                .limit(1);

            console.log(`  🔍 Phone lookup result:`, { found: patients?.length || 0, error: phoneErr?.message });

            if (patients && patients.length > 0) {
                patientUserId = patients[0].id;
                console.log(`  📲 Found portal account by phone: ${patientUserId} (prodentis: ${patients[0].prodentis_id})`);
            }
        }

        // Strategy 2: Look up by prodentis_id
        if (!patientUserId && prodentis_id) {
            console.log(`  🔍 Looking up patient by prodentis_id: ${prodentis_id}`);

            const { data: patients, error: prodErr } = await supabase
                .from('patients')
                .select('id, prodentis_id, phone')
                .eq('prodentis_id', prodentis_id)
                .limit(1);

            console.log(`  🔍 Prodentis lookup result:`, { found: patients?.length || 0, error: prodErr?.message });

            if (patients && patients.length > 0) {
                patientUserId = patients[0].id;
                console.log(`  📲 Found portal account by prodentis_id: ${patientUserId}`);
            }
        }

        if (!patientUserId) {
            console.log(`  ⚠️ No portal account found for phone=${phone} prodentis_id=${prodentis_id}`);
            return NextResponse.json({
                success: false,
                error: 'Pacjent nie ma konta w portalu pacjenta lub nie ma aktywnego tokenu push',
                details: 'Aby otrzymywać powiadomienia push, pacjent musi się zarejestrować w Strefie Pacjenta i zainstalować aplikację.'
            });
        }

        // Check if patient has FCM tokens
        const { data: tokenRows } = await supabase
            .from('fcm_tokens')
            .select('fcm_token')
            .eq('user_id', patientUserId)
            .eq('user_type', 'patient');

        const tokenCount = (tokenRows || []).length;

        if (tokenCount === 0) {
            console.log(`  ⚠️ Patient ${patientUserId} has account but no FCM tokens`);
            return NextResponse.json({
                success: false,
                error: 'Pacjent ma konto, ale nie włączył powiadomień push',
                details: 'Pacjent musi zainstalować aplikację i zezwolić na powiadomienia.',
                hasAccount: true,
                hasPush: false
            });
        }

        // Send push notification
        const payload: PushPayload = { title, body: pushBody };
        if (url) payload.url = url;

        console.log(`  🔔 Sending push to ${patientUserId} (${tokenCount} devices)...`);
        const pushResult = await pushToUser(patientUserId, patientUserType, payload);

        // Log to push_notifications_log (best-effort, table may not exist)
        try {
            await supabase.from('push_notifications_log').insert({
                user_id: patientUserId,
                user_type: 'patient',
                title,
                body: pushBody,
                url: url || null,
                sent_at: new Date().toISOString(),
                sent_by: sent_by || 'admin',
                devices_sent: pushResult.sent,
                devices_failed: pushResult.failed,
            });
        } catch { /* Ignore if table doesn't exist */ }

        if (pushResult.sent > 0) {
            console.log(`  ✅ Push sent to ${pushResult.sent} devices`);
            return NextResponse.json({
                success: true,
                sent: pushResult.sent,
                failed: pushResult.failed,
                message: `Push wysłany na ${pushResult.sent} urządzeń${pushResult.failed > 0 ? ` (${pushResult.failed} błędów)` : ''}`,
                patientName: patient_name,
            });
        } else {
            console.error(`  ❌ Push failed to all ${pushResult.failed} devices`);
            return NextResponse.json({
                success: false,
                error: `Push nie dotarł do żadnego urządzenia (${pushResult.failed} błędów)`,
                sent: 0,
                failed: pushResult.failed,
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[Manual Push] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
