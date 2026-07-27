import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
// Jedno źródło prawdy o oknie retencji czatu wewnętrznego (sekcja 13). Apka chowa
// wiadomości dokładnie tym rachunkiem — cron musi kasować tym samym, nie własnym.
import { retentionCutoffIso } from '@/lib/staffMessaging';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/cron/data-retention-cleanup
 *
 * Hotfix Sprint S8-5: consolidated retention crons dla 12 tabel rosnących
 * monotonicznie. RODO Art. 5 ust. 1 lit. e (limitation of storage) — dane
 * przechowywane nie dłużej niż konieczne.
 *
 * Schedule: daily 04:00 UTC (po audit-log-cleanup 03:30 UTC, żeby nie kolidować).
 *
 * Auth:
 *  - Vercel cron: Authorization: Bearer ${CRON_SECRET}
 *  - Manual trigger (admin): ?manual=true z admin session
 *
 * Query params:
 *  - dry_run=true  → tylko count rekordów do usunięcia, nic nie kasuje (SAFE).
 *                    Default na 2 tygodnie po deploy, potem Marcin remove z
 *                    vercel.json cron path żeby uruchomić real delete.
 *  - manual=true   → bypass CRON_SECRET, require admin (do testowania)
 *
 * Retention policies (decyzje pragmatyczne):
 *   patient_intake_tokens:    used > 30d  OR  (unused AND expires_at < now())
 *   consent_tokens:           used > 30d  OR  (unused AND expires_at < now())
 *   short_links:              created > 1y AND clicks = 0 (unused links)
 *   sms_reminders:            status IN sent/cancelled/failed AND created > 180d (6 mies)
 *   appointment_actions:      action IS NOT NULL AND created > 180d
 *   cancelled_appointments:   cancelled > 5y (medical legal retention)
 *   online_bookings:          schedule_status IN scheduled/rejected/failed AND created > 1y
 *   birthday_wishes:          year < current_year - 2
 *   email_ai_drafts:          status IN sent/rejected/skipped/learned AND created > 90d
 *   email_compose_drafts:     updated > 90d (drafts that never got sent → orphan)
 *   fcm_tokens:               last_active_at < now() - 90d (stale push subs)
 *   social_video_queue:       status IN done/failed AND created > 90d
 *   staff_messages (DM):      wątki kind='dm', created starsze niż 12 miesięcy kalendarzowych
 *                             (`retentionCutoffIso`) → TWARDY DELETE (mig 183, D4)
 *   staff_conversations (DM): wątki bez wiadomości po powyższym kasowaniu (wiersz wątku
 *                             trzyma szyfrogram podglądu ostatniej wiadomości)
 *
 * NOT touched (świadomie):
 *   - patients (RODO Art. 9 medical — soft-delete only przez delete-account)
 *   - patient_intake_submissions (RODO 20-letnia retention, Ustawa art. 29 ust. 1)
 *   - patient_consents (medical document, permanent)
 *   - employee_audit_log + login_attempts + ai_conversations → osobny cron (S8-3)
 *   - staff_messages KANAŁU GRUPOWEGO (kind='group') — archiwum admina, patrz sekcja 13
 *   - Storage buckets (intake-pdfs/consent-pdfs/social-media/task-images/chat-attachments)
 *     — osobne iteracje wymagają Storage API (file-by-file listing). Dla DM liczbę plików,
 *     które zostają po skasowanych załącznikach, raportujemy w `staff_dm_orphan_files`.
 */
export async function GET(req: NextRequest) {
    const t0 = Date.now();
    if (isDemoMode) {
        await logCronHeartbeat('data-retention-cleanup', 'ok', 'demo mode skip', Date.now() - t0);
        return NextResponse.json({ skipped: 'demo mode' });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';
    const isManual = url.searchParams.get('manual') === 'true';

    // Auth
    if (isManual) {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
    } else {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Cutoffs (ISO strings)
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const d5y = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();
    const currentYear = now.getFullYear();
    /**
     * Czat wewnętrzny (sekcja 13) NIE używa `d365`. `retentionCutoffIso` liczy w MIESIĄCACH
     * KALENDARZOWYCH (RETENTION_MONTHS = 12), a 365 dni to nie to samo: w oknie z 29 lutego
     * cutoff „365 dni" wypada dzień PÓŹNIEJ, więc cron skasowałby dobę wiadomości, które apka
     * wciąż pokazuje. Wspólna funkcja gwarantuje też, że zmiana RETENTION_MONTHS przestawi
     * naraz widoczność i kasowanie, zamiast rozjechać je po cichu.
     */
    const chatCutoff = retentionCutoffIso(now);

    type TableResult = { description: string; cutoff: string; deleted: number; error: string | null };
    const results: Record<string, TableResult> = {};

    // Helper: execute count-only (dry_run) lub delete with count.
    // `applyFilters` aplikuje filters typu `.eq()`, `.lt()`, `.in()`, `.not()` na
    // FilterBuilder zwracanym z `.select()` lub `.delete()` (oba zwracają ten sam
    // typ, więc działa polymorficznie).
    //
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type FilterBuilder = any;

    async function clean(
        key: string,
        description: string,
        cutoffLabel: string,
        table: string,
        applyFilters: (q: FilterBuilder) => FilterBuilder
    ): Promise<void> {
        try {
            if (dryRun) {
                const baseQuery = supabase.from(table).select('*', { count: 'exact', head: true });
                const { count, error } = await applyFilters(baseQuery);
                results[key] = {
                    description,
                    cutoff: cutoffLabel,
                    deleted: count ?? 0,
                    error: error?.message ?? null,
                };
            } else {
                const baseQuery = supabase.from(table).delete({ count: 'exact' });
                const { count, error } = await applyFilters(baseQuery);
                results[key] = {
                    description,
                    cutoff: cutoffLabel,
                    deleted: count ?? 0,
                    error: error?.message ?? null,
                };
                if (error) {
                    console.error(`[RetentionCleanup] ${key} error:`, error);
                } else {
                    console.log(`[RetentionCleanup] ${key}: deleted ${count ?? 0} rows`);
                }
            }
        } catch (err) {
            results[key] = {
                description,
                cutoff: cutoffLabel,
                deleted: 0,
                error: (err as Error).message,
            };
            console.error(`[RetentionCleanup] ${key} exception:`, err);
        }
    }

    // 1. patient_intake_tokens: used > 30d, lub unused expired
    await clean('patient_intake_tokens_used', 'Used QR tokens > 30 days old', d30, 'patient_intake_tokens',
        q => q.not('used_at', 'is', null).lt('created_at', d30)
    );
    await clean('patient_intake_tokens_expired', 'Unused QR tokens past expiry', nowISO, 'patient_intake_tokens',
        q => q.is('used_at', null).lt('expires_at', nowISO)
    );

    // 2. consent_tokens: same retention
    await clean('consent_tokens_used', 'Used consent tokens > 30 days old', d30, 'consent_tokens',
        q => q.not('used_at', 'is', null).lt('created_at', d30)
    );
    await clean('consent_tokens_expired', 'Unused consent tokens past expiry', nowISO, 'consent_tokens',
        q => q.is('used_at', null).lt('expires_at', nowISO)
    );

    // 3. short_links: > 1y AND clicks = 0
    await clean('short_links_unused', 'Unused short links > 1 year', d365, 'short_links',
        q => q.eq('clicks', 0).lt('created_at', d365)
    );

    // 3b. smile_leads: leady symulatora/wyceniarki > 12 mies. (deklaracja
    // retencji z rodo sec11 / politykaPriv sec5 — draft smilelead-v1-2026-07)
    await clean('smile_leads_old', 'Smile/estimate leads > 12 months', d365, 'smile_leads',
        q => q.lt('created_at', d365)
    );

    // 4. sms_reminders: status sent/cancelled/failed + > 180d
    await clean('sms_reminders_old', 'SMS reminders sent/failed > 180 days', d180, 'sms_reminders',
        q => q.in('status', ['sent', 'cancelled', 'failed']).lt('created_at', d180)
    );

    // 5. appointment_actions: action filled + > 180d
    await clean('appointment_actions_old', 'Appointment actions resolved > 180 days', d180, 'appointment_actions',
        q => q.not('action', 'is', null).lt('created_at', d180)
    );

    // 6. cancelled_appointments: > 5 lat (legal)
    await clean('cancelled_appointments_legal', 'Cancelled appointments > 5 years (legal retention)', d5y, 'cancelled_appointments',
        q => q.lt('cancelled_at', d5y)
    );

    // 7. online_bookings: scheduled/rejected/failed + > 1y
    await clean('online_bookings_old', 'Online bookings resolved > 1 year', d365, 'online_bookings',
        q => q.in('schedule_status', ['scheduled', 'rejected', 'failed']).lt('created_at', d365)
    );

    // 8. birthday_wishes: year < current_year - 2
    await clean('birthday_wishes_old', `Birthday wishes from year < ${currentYear - 2}`, `${currentYear - 2}`, 'birthday_wishes',
        q => q.lt('year', currentYear - 2)
    );

    // 9. email_ai_drafts: terminal statuses + > 90d
    await clean('email_ai_drafts_old', 'Email AI drafts in terminal status > 90 days', d90, 'email_ai_drafts',
        q => q.in('status', ['sent', 'rejected', 'skipped', 'learned']).lt('created_at', d90)
    );

    // 10. email_compose_drafts: updated > 90d (orphan, never sent)
    await clean('email_compose_drafts_orphan', 'Compose drafts unchanged > 90 days', d90, 'email_compose_drafts',
        q => q.lt('updated_at', d90)
    );

    // 11. fcm_tokens: last_active_at > 90d
    await clean('fcm_tokens_stale', 'FCM tokens inactive > 90 days', d90, 'fcm_tokens',
        q => q.lt('last_active_at', d90)
    );

    // 12. social_video_queue: done/failed + > 90d
    await clean('social_video_queue_old', 'Processed videos in queue > 90 days', d90, 'social_video_queue',
        q => q.in('status', ['done', 'failed']).lt('created_at', d90)
    );

    // ── 13. Czat wewnętrzny zespołu (mig 183) — retencja D4 ───────────────────
    //
    // RÓŻNICA MIĘDZY WĄTKIEM PRYWATNYM A KANAŁEM GRUPOWYM JEST ŚWIADOMA:
    //  · DM (kind='dm')       → wiadomości starsze niż 12 miesięcy KASUJEMY TWARDO.
    //    Zespołowi obiecano KASOWANIE, nie ukrywanie. Dopóki wiersz leży w bazie, jest
    //    w eksporcie, w kopii zapasowej i pod rolą serwisową — filtr widoczności przy
    //    odczycie (`visibilityFloorIso` w src/lib/staffMessaging.ts) tej obietnicy NIE
    //    realizuje, bo chowa treść wyłącznie przed apką.
    //  · GRUPA (kind='group') → NIE kasujemy ANI JEDNEGO wiersza. Po 12 miesiącach kanał
    //    znika tylko z widoku zwykłego pracownika, a admin czyta całość — to jest owo
    //    „archiwum widoczne tylko dla admina". Cron kasujący grupę zostawiłby puste archiwum.
    //
    // ZAŁĄCZNIKI — DŁUG ZNANY I ŚWIADOMIE ODŁOŻONY:
    //   DELETE wiadomości zabiera kaskadą wiersz `chat_attachments`, ale PLIK W STORAGE
    //   zostaje. Ten cron nie rusza Storage przy ŻADNYM zasobie (patrz „NOT touched"
    //   w nagłówku): trzeba do tego listowania obiektów przez Storage API, a bucket
    //   `chat-attachments` na dziś jeszcze nie istnieje (mig 183, „ŚWIADOMIE POZA MIGRACJĄ" p.1).
    //   Zamiast to przemilczeć, LICZYMY pliki, które zostaną osierocone, i oddajemy tę
    //   liczbę w `staff_dm_orphan_files` — żeby rozmiar długu był widoczny w każdym przebiegu.

    /** UUID-y w `.in()` lądują w URL-u zapytania: 100 sztuk to ~4 kB, bezpiecznie pod limitem. */
    const CHAT_CHUNK = 100;

    function chunk<T>(items: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
        return out;
    }

    /** Id wątków spełniających filtr, stronicowane — PostgREST oddaje max 1000 wierszy naraz. */
    async function fetchConversationIds(
        applyFilters: (q: FilterBuilder) => FilterBuilder
    ): Promise<{ ids: string[]; error: string | null }> {
        const PAGE = 1000;
        const ids: string[] = [];
        for (let page = 0; page < 50; page++) {
            const { data, error } = await applyFilters(
                supabase.from('staff_conversations').select('id')
            ).order('id', { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
            if (error) return { ids, error: error.message };
            const batch = (data ?? []) as { id: string }[];
            ids.push(...batch.map(r => r.id));
            if (batch.length < PAGE) break;
        }
        return { ids, error: null };
    }

    /** null = policzenie się nie udało („nie wiem"), 0 = policzone i naprawdę zero. */
    let staffDmOrphanFiles: number | null = 0;

    async function cleanStaffDmMessages(): Promise<void> {
        const key = 'staff_dm_messages_old';
        const description = 'Internal staff DM messages > 12 months (HARD delete, mig 183 D4)';
        try {
            const { ids: dmIds, error: idsError } = await fetchConversationIds(q => q.eq('kind', 'dm'));
            if (idsError) {
                results[key] = { description, cutoff: chatCutoff, deleted: 0, error: `staff_conversations: ${idsError}` };
                console.error('[RetentionCleanup] staff_dm_messages_old lookup error:', idsError);
                return;
            }

            let deleted = 0;
            const errs: string[] = [];
            for (const part of chunk(dmIds, CHAT_CHUNK)) {
                // Pliki liczymy PRZED kasowaniem — po kaskadzie nie ma już czego liczyć.
                const orphansSoFar = staffDmOrphanFiles;
                if (orphansSoFar !== null) {
                    const { count, error: attError } = await supabase
                        .from('chat_attachments')
                        .select('id, staff_messages!inner(conversation_id, created_at)', { count: 'exact', head: true })
                        .in('staff_messages.conversation_id', part)
                        .lt('staff_messages.created_at', chatCutoff);
                    // Nieudane policzenie DŁUGU nie jest błędem retencji (nie wywracamy
                    // przebiegu), ale nie wolno go raportować jako zero — stąd null.
                    if (attError) staffDmOrphanFiles = null;
                    else staffDmOrphanFiles = orphansSoFar + (count ?? 0);
                }

                const query: FilterBuilder = dryRun
                    ? supabase.from('staff_messages').select('*', { count: 'exact', head: true })
                    : supabase.from('staff_messages').delete({ count: 'exact' });
                const { count, error } = await query.in('conversation_id', part).lt('created_at', chatCutoff);
                if (error) errs.push(error.message);
                else deleted += count ?? 0;
            }

            results[key] = {
                description,
                cutoff: chatCutoff,
                deleted,
                error: errs.length > 0 ? errs.join('; ') : null,
            };
            if (errs.length > 0) console.error(`[RetentionCleanup] ${key} errors:`, errs.join('; '));
            else if (!dryRun) console.log(`[RetentionCleanup] ${key}: deleted ${deleted} rows`);
        } catch (err) {
            results[key] = { description, cutoff: chatCutoff, deleted: 0, error: (err as Error).message };
            console.error(`[RetentionCleanup] ${key} exception:`, err);
        }
    }

    /**
     * Puste wątki DM po skasowaniu wiadomości. Sam wiersz `staff_conversations` też trzyma
     * treść — `last_message_preview` to SZYFROGRAM podglądu ostatniej wiadomości. Zostawienie
     * go spełnia obietnicę kasowania w połowie. DELETE wątku zabiera kaskadą również
     * `staff_conversation_members` (kto z kim rozmawiał) i ewentualne resztki załączników.
     *
     * Wątki, które PRZEŻYWAJĄ: skoro `last_message_at` to czas najnowszej wiadomości, wątek
     * z choćby jedną wiadomością z ostatnich 12 miesięcy nie trafia nawet do kandydatów,
     * a jego `last_message_preview` dalej wskazuje wiadomość, która NIE została skasowana.
     */
    async function cleanEmptyStaffDmThreads(): Promise<void> {
        const key = 'staff_dm_threads_empty';
        const baseDescription = 'Empty DM threads after retention delete (row holds encrypted preview)';
        // Cron chodzi codziennie, więc zaległość i tak się rozejdzie; limit pilnuje, żeby
        // pierwszy przebieg nie wysycił `maxDuration` na zapytaniach kontrolnych.
        const MAX_PER_RUN = 300;
        try {
            const { ids: stale, error: idsError } = await fetchConversationIds(
                q => q.eq('kind', 'dm').lt('last_message_at', chatCutoff)
            );
            if (idsError) {
                results[key] = { description: baseDescription, cutoff: chatCutoff, deleted: 0, error: `staff_conversations: ${idsError}` };
                console.error('[RetentionCleanup] staff_dm_threads_empty lookup error:', idsError);
                return;
            }

            const candidates = stale.slice(0, MAX_PER_RUN);
            const description = stale.length > candidates.length
                ? `${baseDescription} [limit ${MAX_PER_RUN}/${stale.length}, reszta w kolejnym przebiegu]`
                : baseDescription;

            const errs: string[] = [];
            const empty: string[] = [];
            for (const id of candidates) {
                // Liczymy WYŁĄCZNIE wiadomości, które przeżywają retencję (>= cutoff).
                // Ten sam warunek działa w obu trybach: w dry-run nic jeszcze nie skasowano,
                // a mimo to raport pokazuje prawdziwą liczbę wątków do usunięcia. Nie opieramy
                // się przy tym na samym `last_message_at` — gdyby denormalizacja się rozjechała,
                // wątek z żywą wiadomością i tak nie zostanie skasowany.
                const { count, error } = await supabase
                    .from('staff_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', id)
                    .gte('created_at', chatCutoff);
                if (error) { errs.push(error.message); continue; }
                if ((count ?? 0) === 0) empty.push(id);
            }

            let deleted = empty.length;
            if (!dryRun && empty.length > 0) {
                deleted = 0;
                for (const part of chunk(empty, CHAT_CHUNK)) {
                    const { count, error } = await supabase
                        .from('staff_conversations')
                        .delete({ count: 'exact' })
                        .in('id', part)
                        // Dwa pasy bezpieczeństwa powtórzone W SAMYM DELETE, nie tylko w kodzie:
                        //  · kind='dm' — kanał grupowy nie może tu wpaść nigdy,
                        //  · last_message_at < cutoff — jeśli między kontrolą a kasowaniem ktoś
                        //    napisał, `last_message_at` skacze na teraz i DELETE mija ten wątek.
                        .eq('kind', 'dm')
                        .lt('last_message_at', chatCutoff);
                    if (error) errs.push(error.message);
                    else deleted += count ?? 0;
                }
            }

            results[key] = {
                description,
                cutoff: chatCutoff,
                deleted,
                error: errs.length > 0 ? errs.join('; ') : null,
            };
            if (errs.length > 0) console.error(`[RetentionCleanup] ${key} errors:`, errs.join('; '));
            else if (!dryRun) console.log(`[RetentionCleanup] ${key}: deleted ${deleted} rows`);
        } catch (err) {
            results[key] = { description: baseDescription, cutoff: chatCutoff, deleted: 0, error: (err as Error).message };
            console.error(`[RetentionCleanup] ${key} exception:`, err);
        }
    }

    await cleanStaffDmMessages();
    await cleanEmptyStaffDmThreads();

    if (staffDmOrphanFiles === null || staffDmOrphanFiles > 0) {
        console.warn(
            `[RetentionCleanup] staff DM: ${staffDmOrphanFiles ?? 'nieznana liczba'} plików zostaje w Storage ` +
            '(kaskada kasuje wiersz chat_attachments, nie obiekt w buckecie)'
        );
    }

    // Summary
    const totalDeleted = Object.values(results).reduce((sum, r) => sum + (r.deleted || 0), 0);
    const errors = Object.entries(results).filter(([, r]) => r.error).map(([k, r]) => `${k}: ${r.error}`);
    const summary = `${dryRun ? '[DRY RUN] ' : ''}Total ${totalDeleted} rows across ${Object.keys(results).length} tables. Errors: ${errors.length}`;

    await logCronHeartbeat(
        'data-retention-cleanup',
        errors.length > 0 ? 'error' : 'ok',
        summary,
        Date.now() - t0
    );

    return NextResponse.json({
        ok: errors.length === 0,
        dry_run: dryRun,
        summary,
        total_deleted: totalDeleted,
        /**
         * Pliki w Storage osierocone W TYM PRZEBIEGU przez skasowane załączniki DM (sekcja 13,
         * liczba per przebieg — nie licznik narastający). Kaskada bazy
         * zabiera wiersz `chat_attachments`, obiekt w buckecie zostaje — sprzątanie plików to
         * osobny przebieg po Storage API. `null` = liczba nieznana (zapytanie kontrolne padło),
         * NIE „zero". W dry-run to liczba plików, które zostaną po realnym uruchomieniu.
         */
        staff_dm_orphan_files: staffDmOrphanFiles,
        errors: errors.length > 0 ? errors : undefined,
        results,
    });
}
