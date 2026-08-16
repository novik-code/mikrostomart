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

        /**
         * W3 — token personelu PRZEŻYWAŁ wylogowanie bez sieci.
         *
         * Apka kasuje swój wpis przy wylogowaniu, ale to żądanie sieciowe: gdy padnie
         * (a przy wylogowaniu w windzie pada), token zostaje w bazie na zawsze. Urządzenie
         * przekazane dalej albo porzucone nadal dostaje powiadomienia gabinetu — a te
         * niosą nazwiska pacjentów.
         *
         * `DeviceNotRegistered` z receiptów tego NIE ŁAPIE: aplikacja jest zainstalowana
         * i token technicznie żywy, tylko nikt się już nim nie loguje.
         *
         * 🔑 Próg oparty na POMIARZE, nie na wyczuciu: na produkcji 8 z 11 tokenów
         * odświeża się w ciągu ~2 dni (apka robi upsert przy KAŻDYM wejściu na wierzch),
         * więc 7 dni to siedmiokrotność normalnej kadencji. Czynna instalacja rejestruje
         * się z powrotem przy pierwszym otwarciu — koszt pomyłki to brak pusha do czasu
         * otwarcia apki, nie utrata dostępu.
         *
         * ⚪ ŚWIADOMIE NIE dotyczy `patient_push_tokens`: pacjent otwiera apkę raz na
         * kilka tygodni, więc ten sam próg wyciąłby przypomnienia o wizytach ludziom,
         * którzy niczego nie zrobili źle.
         */
        const progStaff = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
        let staleStaff = 0;
        {
            const { data: stare, error: errSel } = await supabase
                .from('staff_push_tokens')
                .select('token')
                .lt('updated_at', progStaff);
            if (errSel) {
                console.error(`[PushReceipts] Nie odczytano porzuconych tokenów personelu: ${errSel.message}`);
            } else if (stare && stare.length > 0) {
                const tokeny = stare.map((r) => r.token as string);
                const { error: errDel } = await supabase
                    .from('staff_push_tokens')
                    .delete()
                    .in('token', tokeny);
                if (errDel) {
                    console.error(`[PushReceipts] Nie usunięto porzuconych tokenów personelu: ${errDel.message}`);
                } else {
                    staleStaff = tokeny.length;
                    console.log(`[PushReceipts] Usunięto ${staleStaff} porzucony(ch) token(ów) personelu (>7 dni bez odświeżenia)`);
                }
            }
        }

        await logCronHeartbeat(
            'push-receipts',
            errors > 0 ? 'warn' : 'ok',
            `Sprawdzono: ${checked}, usunięto martwych tokenów: ${pruned}, porzuconych personelu: ${staleStaff}${errors ? `, błędy Expo: ${errors}` : ''}`,
            Date.now() - started
        );

        return NextResponse.json({ success: true, checked, pruned, staleStaff, expoErrors: errors });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PushReceipts] Fatal:', msg);
        await logCronHeartbeat('push-receipts', 'error', msg, Date.now() - started);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
