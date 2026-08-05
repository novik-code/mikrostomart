import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushToPatientAll, PushPayload } from '@/lib/pushService';
import { hasPatientAppToken } from '@/lib/expoPush';
import { requireAdmin } from '@/lib/authGuards';

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
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

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
        // Phone can be stored as '792060718', '48792060718', or '+48792060718'
        // Prodentis search gives '48XXXXXXXXX'. We try ALL variants.
        if (phone) {
            // Strip everything to digits only
            const digits = phone.replace(/[^\d]/g, '');
            // Build all possible formats
            const variants: string[] = [];
            
            if (digits.startsWith('48') && digits.length >= 11) {
                // Input looks like 48XXXXXXXXX
                const local = digits.slice(2); // XXXXXXXXX
                variants.push(digits);          // 48XXXXXXXXX
                variants.push(`+${digits}`);    // +48XXXXXXXXX
                variants.push(local);           // XXXXXXXXX
            } else if (digits.length === 9) {
                // Input looks like XXXXXXXXX (local Polish number)
                variants.push(digits);           // XXXXXXXXX
                variants.push(`48${digits}`);    // 48XXXXXXXXX
                variants.push(`+48${digits}`);   // +48XXXXXXXXX
            } else {
                // Unknown format — try as-is and with/without +
                variants.push(digits);
                variants.push(`+${digits}`);
                variants.push(phone.replace(/\s+/g, ''));
            }

            const uniqueVariants = [...new Set(variants)];
            console.log(`  🔍 Looking up patient by phone variants:`, uniqueVariants);

            // Search with OR across all variants
            const orFilter = uniqueVariants.map(v => `phone.eq.${v}`).join(',');
            const { data: patients, error: phoneErr } = await supabase
                .from('patients')
                .select('id, prodentis_id, phone')
                .or(orFilter)
                .limit(1);

            console.log(`  🔍 Phone lookup result:`, { 
                found: patients?.length || 0, 
                error: phoneErr?.message,
                matchedPhone: patients?.[0]?.phone 
            });

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

        // 🔑 Bramka MUSI pytać o OBA kanały. Wcześniej czytała wyłącznie `fcm_tokens`
        // (web-push przeglądarki), więc pacjent z samą apką mobilną — token siedzi
        // w `patient_push_tokens` kluczowanej prodentis_id — dostawał odpowiedź
        // „nie włączył powiadomień push", mimo działającego kanału Expo. Ta sama
        // klasa błędu została już naprawiona w `/api/employee/push/to-patient`
        // i w `patientDelivery.ts`; ta trasa została wtedy pominięta.
        const { data: fcmRows, error: fcmErr } = await supabase
            .from('fcm_tokens')
            .select('fcm_token')
            .eq('user_id', patientUserId)
            .eq('user_type', 'patient');
        const appToken = await hasPatientAppToken(patientUserId);

        const fcmCount = (fcmRows || []).length;
        const tokenCheckFailed = !!fcmErr || appToken.error;
        const hasTokens = fcmCount > 0 || appToken.has;

        if (fcmErr) console.error('[Manual Push] fcm_tokens lookup error:', fcmErr.message);

        // 🔑 Blokujemy WYŁĄCZNIE przy pewności, że tokenów nie ma. Twarda blokada
        // postawiona na wyniku zepsutego zapytania to dokładnie ten mechanizm,
        // który uciszył wysyłkę na kilka miesięcy — przy błędzie odczytu próbujemy
        // wysłać, a realny wynik i tak widać w polach `fcm`/`expo` odpowiedzi.
        if (!hasTokens && !tokenCheckFailed) {
            console.log(`  ⚠️ Patient ${patientUserId} has account but no push tokens (fcm=0, expo=0)`);
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
        else payload.url = '/strefa-pacjenta/powiadomienia';

        console.log(`  🔔 Sending push to ${patientUserId} (fcm=${fcmCount}, app=${appToken.has})...`);
        console.log(`  📝 Payload: title="${payload.title}", body="${payload.body}", url="${payload.url}"`);

        // 🔑 `pushToPatientAll`, nie `pushToUser`: ten drugi puszcza kanał Expo
        // fire-and-forget i zwraca `sent` policzony WYŁĄCZNIE z `fcm_tokens`.
        // Skutek na produkcji: powiadomienie realnie lądowało na telefonie, a panel
        // raportował „Push nie dotarł do żadnego urządzenia" — więc operator wysyłał
        // drugi raz i pacjent dostawał duplikat. `pushToPatientAll` awaituje oba kanały
        // i zwraca policzalny wynik z rozbiciem `fcm`/`expo`.
        const pushResult = await pushToPatientAll(patientUserId, payload);

        // ⚠️ ŻADNEGO ręcznego insertu do `push_notifications_log` — `pushToPatientAll`
        // woła `logPush` samo (pushService.ts). Drugi zapis dawał DUPLIKAT w historii
        // powiadomień pacjenta. Metadane operatora (`sent_by`) zostają w logu serwera.
        if (sent_by) console.log(`  👤 Wysłał: ${sent_by}`);

        if (pushResult.sent > 0) {
            console.log(`  ✅ Push sent: fcm=${pushResult.fcm.sent} expo=${pushResult.expo.sent}`);
            return NextResponse.json({
                success: true,
                sent: pushResult.sent,
                failed: pushResult.failed,
                fcm: pushResult.fcm,
                expo: pushResult.expo,
                message: `Push wysłany na ${pushResult.sent} urządzeń${pushResult.failed > 0 ? ` (${pushResult.failed} błędów)` : ''}`,
                patientName: patient_name,
            });
        } else {
            console.error(`  ❌ Push failed: fcm=${pushResult.fcm.failed} expo=${pushResult.expo.failed}`);
            return NextResponse.json({
                success: false,
                error: `Push nie dotarł do żadnego urządzenia (${pushResult.failed} błędów)`,
                sent: 0,
                failed: pushResult.failed,
                fcm: pushResult.fcm,
                expo: pushResult.expo,
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
