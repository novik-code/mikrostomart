import { createClient } from '@supabase/supabase-js';

/**
 * Expo Push Service — powiadomienia do aplikacji mobilnej (pacjent ORAZ personel).
 * Tokeny (ExponentPushToken[...]) rejestruje apka:
 *   · pacjent  → POST /api/patients/push-token  (tabela patient_push_tokens, mig 173)
 *   · personel → POST /api/employee/push-token  (tabela staff_push_tokens,   mig 179)
 * Wysyłka przez https://exp.host — NIE wymaga kluczy Firebase po stronie serwera
 * (Expo pośredniczy do APNs/FCM).
 * Wpięte w pushService.pushToUser (patient + employee/admin) oraz pushToUsers (personel).
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
 * pushToUser dla pacjenta bywa wołany z RÓŻNYMI id: webowym UUID (patients.id —
 * np. czat admina, careflow) albo prodentisId (crony). Tokeny apki są kluczowane
 * prodentisId (z JWT), więc UUID trzeba najpierw rozwiązać przez tabelę patients.
 */
async function resolveProdentisId(patientId: string): Promise<string | null> {
    if (/^\d+$/.test(patientId)) return patientId; // już prodentisId
    const { data } = await supabase
        .from('patients')
        .select('prodentis_id')
        .eq('id', patientId)
        .maybeSingle();
    return data?.prodentis_id ?? null;
}

/**
 * Wspólny rdzeń wysyłki: chunkowanie, tickety Expo, prune tokenów DeviceNotRegistered.
 * `table` = tabela, z której usuwamy martwe tokeny (kluczowana kolumną `token`).
 */
async function deliver(
    tokens: string[],
    payload: ExpoPushPayload,
    table: 'patient_push_tokens' | 'staff_push_tokens',
    label: string
): Promise<{ sent: number; failed: number }> {
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
            console.error(`[ExpoPush] HTTP ${res.status} for ${label}`);
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
        await supabase.from(table).delete().in('token', dead);
        console.log(`[ExpoPush] Pruned ${dead.length} dead token(s) from ${table}`);
    }

    if (sent + failed > 0) {
        console.log(`[ExpoPush] ${label}: sent=${sent} failed=${failed}`);
    }
    return { sent, failed };
}

/**
 * Wyślij push Expo na wszystkie urządzenia pacjenta (web UUID lub prodentisId).
 * Nieblokujące błędy; tokeny DeviceNotRegistered są usuwane z bazy.
 */
export async function sendExpoPushToPatient(
    patientId: string,
    payload: ExpoPushPayload
): Promise<{ sent: number; failed: number }> {
    try {
        const prodentisId = await resolveProdentisId(patientId);
        if (!prodentisId) return { sent: 0, failed: 0 };

        const { data: rows } = await supabase
            .from('patient_push_tokens')
            .select('token')
            .eq('patient_id', prodentisId);

        const tokens = (rows || []).map(r => r.token).filter(isExpoToken);
        return deliver(tokens, payload, 'patient_push_tokens', `patient ${patientId}`);
    } catch (err) {
        console.error('[ExpoPush] Error:', err);
        return { sent: 0, failed: 0 };
    }
}

/**
 * Wyślij push Expo na wszystkie urządzenia PRACOWNIKA (auth user_id — to samo id
 * co `fcm_tokens.user_id`, więc żadnego mapowania nie potrzeba). Mig 179.
 */
export async function sendExpoPushToStaff(
    userId: string,
    payload: ExpoPushPayload
): Promise<{ sent: number; failed: number }> {
    try {
        const { data: rows } = await supabase
            .from('staff_push_tokens')
            .select('token')
            .eq('user_id', userId);

        const tokens = (rows || []).map(r => r.token).filter(isExpoToken);
        return deliver(tokens, payload, 'staff_push_tokens', `staff ${userId}`);
    } catch (err) {
        console.error('[ExpoPush] Staff error:', err);
        return { sent: 0, failed: 0 };
    }
}

/** Wariant zbiorczy — jeden strzał do Expo dla wielu pracowników naraz. */
export async function sendExpoPushToStaffMany(
    userIds: string[],
    payload: ExpoPushPayload
): Promise<{ sent: number; failed: number }> {
    try {
        if (!userIds?.length) return { sent: 0, failed: 0 };
        const { data: rows } = await supabase
            .from('staff_push_tokens')
            .select('token')
            .in('user_id', userIds);

        const tokens = (rows || []).map(r => r.token).filter(isExpoToken);
        return deliver(tokens, payload, 'staff_push_tokens', `staff x${userIds.length}`);
    } catch (err) {
        console.error('[ExpoPush] Staff error:', err);
        return { sent: 0, failed: 0 };
    }
}
