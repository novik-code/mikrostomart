import { createClient } from '@supabase/supabase-js';

/**
 * Expo Push Service — powiadomienia do aplikacji mobilnej pacjenta.
 * Tokeny (ExponentPushToken[...]) rejestruje apka przez POST /api/patients/push-token
 * (tabela patient_push_tokens, mig 173). Wysyłka przez https://exp.host — NIE wymaga
 * kluczy Firebase po stronie serwera (Expo pośredniczy do APNs/FCM).
 * Wpięte w pushService.pushToUser dla userType='patient' (obok web-push FCM).
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100; // limit Expo na request

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ExpoPushPayload {
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

function isExpoToken(token: string): boolean {
    return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

/**
 * Wyślij push Expo na wszystkie urządzenia pacjenta (po prodentisId).
 * Nieblokujące błędy; tokeny DeviceNotRegistered są usuwane z bazy.
 */
export async function sendExpoPushToPatient(
    patientId: string,
    payload: ExpoPushPayload
): Promise<{ sent: number; failed: number }> {
    try {
        const { data: rows } = await supabase
            .from('patient_push_tokens')
            .select('token')
            .eq('patient_id', patientId);

        const tokens = (rows || []).map(r => r.token).filter(isExpoToken);
        if (tokens.length === 0) return { sent: 0, failed: 0 };

        let sent = 0, failed = 0;
        const dead: string[] = [];

        for (let i = 0; i < tokens.length; i += CHUNK) {
            const chunk = tokens.slice(i, i + CHUNK);
            const messages = chunk.map(to => ({
                to,
                title: payload.title,
                body: payload.body,
                sound: 'default',
                data: payload.data ?? {},
            }));

            const res = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(messages),
            });

            if (!res.ok) {
                console.error(`[ExpoPush] HTTP ${res.status} for patient ${patientId}`);
                failed += chunk.length;
                continue;
            }

            const json = await res.json();
            const tickets: Array<{ status: string; details?: { error?: string } }> = json?.data ?? [];
            tickets.forEach((ticket, idx) => {
                if (ticket.status === 'ok') {
                    sent++;
                } else {
                    failed++;
                    if (ticket.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx]);
                }
            });
        }

        if (dead.length > 0) {
            await supabase.from('patient_push_tokens').delete().in('token', dead);
            console.log(`[ExpoPush] Pruned ${dead.length} dead token(s)`);
        }

        if (sent + failed > 0) {
            console.log(`[ExpoPush] patient ${patientId}: sent=${sent} failed=${failed}`);
        }
        return { sent, failed };
    } catch (err) {
        console.error('[ExpoPush] Error:', err);
        return { sent: 0, failed: 0 };
    }
}
