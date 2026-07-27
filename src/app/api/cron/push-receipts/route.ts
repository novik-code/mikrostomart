import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';

export const maxDuration = 60;

const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
/** Expo przyjmuje do 1000 identyfikatorów na żądanie; trzymamy zapas. */
const CHUNK = 300;
/** Expo przechowuje receipty ~24 h. Starsze bilety to strata czasu — zamykamy je. */
const MAX_AGE_H = 24;

/**
 * GET /api/cron/push-receipts
 *
 * Odpytuje Expo o RECEIPTY wysłanych powiadomień i sprząta martwe tokeny.
 *
 * 🔑 PO CO TO ISTNIEJE. Ticket „ok" znaczy tylko tyle, że Expo przyjęło żądanie.
 * Prawdziwy wynik dostarczenia przychodzi w receipcie — i to właśnie tam pojawia się
 * `DeviceNotRegistered`. Dotychczasowy prune czytał wyłącznie tickety, więc tokeny po
 * reinstalacji apki zostawały w bazie i cicho zjadały wysyłki (usuwane ręcznie, dwa razy).
 *
 * Cron jest IDEMPOTENTNY: bierze wyłącznie bilety z `checked_at IS NULL`, a po odpowiedzi
 * stempluje je niezależnie od wyniku, więc drugi przebieg ich nie ruszy.
 */
export async function GET(req: Request) {
    if (isDemoMode) return NextResponse.json({ skipped: 'demo mode' });

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const started = Date.now();
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let checked = 0, pruned = 0, errors = 0;

    try {
        const cutoff = new Date(Date.now() - MAX_AGE_H * 3600_000).toISOString();

        // Bilety przeterminowane zamykamy bez pytania — Expo i tak ich nie zna.
        await supabase
            .from('push_receipts')
            .update({ checked_at: new Date().toISOString(), status: 'error', error_code: 'expired_unchecked' })
            .is('checked_at', null)
            .lt('created_at', cutoff);

        const { data: rows, error: fetchErr } = await supabase
            .from('push_receipts')
            .select('ticket_id, token, token_table')
            .is('checked_at', null)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: true })
            .limit(CHUNK * 4);

        if (fetchErr) throw new Error(`Odczyt biletów: ${fetchErr.message}`);

        const pending = rows ?? [];
        if (pending.length === 0) {
            await logCronHeartbeat('push-receipts', 'ok', 'Brak biletów do sprawdzenia', Date.now() - started);
            return NextResponse.json({ success: true, checked: 0, pruned: 0 });
        }

        const byTicket = new Map(pending.map(r => [r.ticket_id as string, r]));

        for (let i = 0; i < pending.length; i += CHUNK) {
            const ids = pending.slice(i, i + CHUNK).map(r => r.ticket_id as string);

            const res = await fetch(EXPO_RECEIPTS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ ids }),
            });

            if (!res.ok) {
                // Awaria po stronie Expo nie może stemplować biletów jako sprawdzonych —
                // inaczej stracilibyśmy jedyną szansę na wykrycie martwego tokenu.
                errors++;
                console.error(`[PushReceipts] HTTP ${res.status} ${res.statusText}`);
                continue;
            }

            const json = await res.json();
            const receipts: Record<string, { status?: string; details?: { error?: string } }> = json?.data ?? {};

            // Grupujemy martwe tokeny per tabela — jedno DELETE zamiast N.
            const dead: Record<string, string[]> = {};
            const stamped: Array<{ ticket_id: string; status: string; error_code: string | null }> = [];

            for (const [ticketId, receipt] of Object.entries(receipts)) {
                const row = byTicket.get(ticketId);
                if (!row) continue;
                const code = receipt?.details?.error ?? null;
                stamped.push({
                    ticket_id: ticketId,
                    status: receipt?.status === 'ok' ? 'ok' : 'error',
                    error_code: code,
                });
                if (code === 'DeviceNotRegistered') {
                    const tbl = row.token_table as string;
                    (dead[tbl] ??= []).push(row.token as string);
                }
                checked++;
            }

            for (const [tbl, tokens] of Object.entries(dead)) {
                const uniq = Array.from(new Set(tokens));
                const { error } = await supabase.from(tbl).delete().in('token', uniq);
                if (error) {
                    console.error(`[PushReceipts] Nie usunięto martwych tokenów z ${tbl}: ${error.message}`);
                } else {
                    pruned += uniq.length;
                    console.log(`[PushReceipts] Usunięto ${uniq.length} martwy(ch) token(ów) z ${tbl}`);
                }
            }

            // Stempel po ticket_id — pojedynczo, bo upsert wymagałby kompletu kolumn NOT NULL.
            for (const s of stamped) {
                await supabase
                    .from('push_receipts')
                    .update({ checked_at: new Date().toISOString(), status: s.status, error_code: s.error_code })
                    .eq('ticket_id', s.ticket_id);
            }
        }

        await logCronHeartbeat(
            'push-receipts',
            errors > 0 ? 'warn' : 'ok',
            `Sprawdzono: ${checked}, usunięto martwych tokenów: ${pruned}${errors ? `, błędy Expo: ${errors}` : ''}`,
            Date.now() - started
        );

        return NextResponse.json({ success: true, checked, pruned, expoErrors: errors });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PushReceipts] Fatal:', msg);
        await logCronHeartbeat('push-receipts', 'error', msg, Date.now() - started);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
