import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/push/resubscribe
 *
 * Called by the service worker's `pushsubscriptionchange` event handler when
 * the browser rotates a push endpoint (e.g. after long inactivity).
 *
 * The SW doesn't know the userId — it only has the new subscription object.
 * We look up the old endpoint from the old subscription and update it in place,
 * OR insert a new row if not found (handles edge cases).
 *
 * No auth required — called from SW context which has no cookies/session.
 *
 * 🔴 ZAMKNIĘTE 2026-08-06: PRZEJĘCIE CUDZEGO KANAŁU POWIADOMIEŃ.
 * Trasa przyjmowała w ciele żądania `oldEndpoint` i na jego podstawie PRZEPISYWAŁA
 * wiersz — nowy adres i nowe klucze — zachowując `user_id` ofiary. Kto znał endpoint
 * subskrypcji pracownika (wyciek z logów, kopii bazy albo urządzenia gabinetu), jednym
 * nieuwierzytelnionym POST-em przekierowywał jego powiadomienia na własną przeglądarkę.
 * A powiadomienia personelu niosą treść wiadomości pacjenta i nazwisko.
 *
 * NAPRAWA: gałąź `oldEndpoint` USUNIĘTA. Zmierzone przed zmianą: nasz service worker
 * NIGDY jej nie używał — `public/push-sw.js:31-35` wysyła wyłącznie `{ subscription }`.
 * Była martwym kodem i czystym wektorem ataku.
 *
 * Zostaje wyłącznie dopasowanie po adresie z PRZYSŁANEJ subskrypcji, czyli operacja
 * na własnym wierszu wołającego — nie da się nią przejąć cudzego kanału.
 * ⚠️ Ryzyko resztkowe (świadome, odnotowane): kto zna cudzy endpoint, może podmienić
 * przypisane do niego klucze i w ten sposób zepsuć ofierze odbiór powiadomień (DoS,
 * nie przejęcie). Domknięcie wymaga dowodu posiadania starej subskrypcji, czego
 * dzisiejszy worker nie wysyła — do zrobienia razem ze zmianą po stronie klienta.
 */
export async function POST(request: NextRequest) {
    try {
        const { subscription } = await request.json();

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }

        const newEndpoint = subscription.endpoint;

        // Wyłącznie wiersz o adresie z PRZYSŁANEJ subskrypcji (idempotentne).
        const { data: existingRow } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('endpoint', newEndpoint)
            .single();

        if (existingRow) {
            // Update existing row with new endpoint and keys
            const { error } = await supabase
                .from('push_subscriptions')
                .update({
                    endpoint: newEndpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingRow.id);

            if (error) {
                // If update fails due to unique constraint (new endpoint already exists),
                // delete old row — the new endpoint will be registered separately
                if ((error as any).code === '23505') {
                    await supabase.from('push_subscriptions').delete().eq('id', existingRow.id);
                    console.log(`[PushResubscribe] Deleted duplicate old row (new endpoint already exists)`);
                    return NextResponse.json({ success: true, action: 'deleted_old' });
                }
                throw error;
            }

            // Bez identyfikatora użytkownika w logu — logi Vercela nie są miejscem na PII.
            console.log('[PushResubscribe] Updated subscription keys');
            return NextResponse.json({ success: true, action: 'updated' });
        }

        // No existing row found — this subscription is unknown to us, nothing to do.
        // The client-side renewal in PushNotificationPrompt will handle registration
        // on next app open.
        console.log(`[PushResubscribe] No existing row found for endpoint rotation`);
        return NextResponse.json({ success: true, action: 'not_found' });

    } catch (error: unknown) {
        console.error('[PushResubscribe] Error:', error);
        return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
    }
}
