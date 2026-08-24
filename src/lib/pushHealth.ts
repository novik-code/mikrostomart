/**
 * Rejestr zdrowia ścieżek push.
 *
 * 🔑 PO CO. `logPush` zapisuje historię NIEZALEŻNIE od tego, czy cokolwiek wyszło —
 * dlatego wiadomość pacjenta, która nigdy nie opuściła serwera, wyglądała w Alertach
 * na wysłaną. Ten rejestr odpowiada na inne pytanie: „kiedy ta droga OSTATNIO REALNIE
 * zadziałała". Bez tego cisza na ścieżce jest nieodróżnialna od braku ruchu.
 *
 * Zapisy są best-effort — awaria rejestru nie może wywrócić wysyłki powiadomienia.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type PushPathKey =
    | 'appointment_reminder'
    | 'careflow_task'
    | 'staff_chat'
    | 'staff_task'
    | 'patient_chat'
    | 'new_reservation'
    | 'appointment_cancelled'
    // Cykliczna, próg 48 h (mig 188) — funkcja kluczowa dla właściciela, a jej awaria
    // jest z natury CICHA: historia Alertów pokazuje wpis niezależnie od dostarczenia.
    | 'appointment_confirmed'
    // Zdarzeniowa (mig 187): `max_silence_minutes = NULL`, więc cron zdrowia jej
    // NIE alarmuje — cisza znaczy „nikt nic nie zepsuł", nie awarię kanału.
    | 'incident_blocking'
    // Zdarzeniowa (mig 199), z tego samego powodu co wyżej: cisza znaczy „nikt nie
    // zgłosił usterki". Push idzie tylko przy `kind='bug'` i BEZ treści zgłoszenia.
    | 'app_report_bug';

export interface PushPathHealthRow {
    path_key: string;
    label: string;
    max_silence_minutes: number | null;
    last_attempt_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    attempts_24h: number;
    failures_24h: number;
}

/**
 * Odnotuj próbę wysyłki na danej ścieżce.
 *
 * `sent > 0` = ścieżka realnie zadziałała (ktoś dostał). `sent === 0` przy niezerowej
 * liczbie odbiorców to porażka — i to jest dokładnie ten stan, którego wcześniej nikt
 * nie widział, bo historia i tak pokazywała wpis.
 */
export async function recordPushPath(
    pathKey: PushPathKey,
    result: { sent: number; failed: number; error?: string }
): Promise<void> {
    try {
        const now = new Date().toISOString();
        const ok = result.sent > 0;

        const { data: cur } = await supabase
            .from('push_path_health')
            .select('attempts_24h, failures_24h, last_attempt_at')
            .eq('path_key', pathKey)
            .maybeSingle();

        // Liczniki dobowe zerujemy, gdy poprzednia próba jest starsza niż doba —
        // prościej i taniej niż osobny cron, a do przeglądu w panelu w zupełności starcza.
        const prev = cur as { attempts_24h?: number; failures_24h?: number; last_attempt_at?: string } | null;
        const stale =
            !prev?.last_attempt_at ||
            Date.now() - new Date(prev.last_attempt_at).getTime() > 24 * 3600_000;

        await supabase
            .from('push_path_health')
            .update({
                last_attempt_at: now,
                ...(ok ? { last_success_at: now } : {}),
                last_error: ok ? null : (result.error ?? `sent=0 failed=${result.failed}`),
                attempts_24h: (stale ? 0 : prev?.attempts_24h ?? 0) + 1,
                failures_24h: (stale ? 0 : prev?.failures_24h ?? 0) + (ok ? 0 : 1),
                updated_at: now,
            })
            .eq('path_key', pathKey);
    } catch (err) {
        console.error('[PushHealth] Nie zapisano stanu ścieżki:', err instanceof Error ? err.message : err);
    }
}

/**
 * Ile godzin po terminie zadanie bez ANI JEDNEJ próby pusha uznajemy za zaniedbane.
 *
 * Cisza nocna kończy się o 07:00, a `careflow-push` chodzi co 5 minut od 05:00 UTC,
 * więc dwie godziny to zapas ponad ćwierć setki przebiegów. Górna granica to
 * `GRACE_HOURS` (12) z tego crona: powyżej niej zadanie i tak zamyka się samo jako
 * `skipped_at` i przestaje być sygnałem o kanale.
 */
const ZANIEDBANE_PO_H = 2;
const GRACE_H = 12;

/**
 * Sondy dla ścieżek ZDARZENIOWYCH — odpowiadają na pytanie „czy kanał ZAWIÓDŁ",
 * a nie „czy było cicho".
 *
 * 🔴 PO CO TO ISTNIEJE. `careflow_task` miała `max_silence_minutes = 180` i była
 * przez to traktowana jak ścieżka CYKLICZNA — a jest zdarzeniowa: odzywa się tylko,
 * gdy któryś pacjent ma akurat dawkę. Skutek był strukturalny, nie losowy:
 * **sama cisza nocna (00:00–07:00 = 420 minut) to 2,3× próg**, a alarm chodzi o 09:00.
 * Zdrowa ścieżka alarmowała więc KAŻDEGO RANKA — zmierzone 24.08: cisza 801 minut
 * przy progu 180, mimo że poprzedniego dnia wszystko zadziałało.
 *
 * 🔑 Alarmu NIE zdejmujemy przez `max_silence_minutes = NULL`. To ukryłoby realną
 * awarię kanału, a rejestr istnieje właśnie po to, żeby ją widzieć. Zmieniamy PYTANIE:
 * zamiast zegara patrzymy, czy jest ZALEGŁY KANDYDAT, którego nie powiadomiliśmy.
 */
const SONDY_ZDARZENIOWE: Record<string, () => Promise<{ zaniedbane: number } | null>> = {
    /**
     * `appointment_reminder` — DRUGA sztuka tego samego defektu, znaleziona przy okazji.
     *
     * Ścieżka wygląda na cykliczną (przypomnienia idą codziennie), ale gałąź PUSH odzywa
     * się wyłącznie wtedy, gdy odbiorca ma aplikację. Zmierzone na produkcji 24.08:
     * wczoraj 17 przypomnień, **wszystkie SMS-em**; tylko JEDEN odbiorca miał konto,
     * a ten jeden ma **zero tokenów push** (48 tokenów na całą bazę pacjentów).
     * Push-first zadziałał więc POPRAWNIE — sprawdził, nie znalazł, zszedł na SMS.
     * Rejestr notuje sukces tylko przy realnej wysyłce pusha, więc cisza rosła i alarm
     * szedł. To znowu „było cicho", a nie „kanał zawiódł".
     *
     * 🔑 Pytanie, które ma sens: czy ktoś, kto MA token push, dostał mimo to SMS-a?
     * To jest awaria push-first — czwarta odsłona tej samej klasy błędu wróciłaby
     * dokładnie tak.
     */
    appointment_reminder: async () => {
        const od = new Date(Date.now() - 26 * 3600_000).toISOString();

        const { data: przypomnienia, error: e1 } = await supabase
            .from('sms_reminders')
            .select('patient_id, delivery_channel')
            .eq('sms_type', 'reminder')
            .not('patient_id', 'is', null)
            .gte('sent_at', od)
            .limit(200);
        if (e1) {
            console.error('[PushHealth] Sonda appointment_reminder (przypomnienia):', e1.message);
            return null;
        }
        const smsem = (przypomnienia ?? []).filter(
            (r) => (r as { delivery_channel?: string }).delivery_channel !== 'push',
        );
        if (smsem.length === 0) return { zaniedbane: 0 };

        // UUID konta → prodentis_id (klucz, którym kluczowana jest tabela tokenów).
        const uuidy = [...new Set(smsem.map((r) => (r as { patient_id: string }).patient_id))];
        const { data: konta, error: e2 } = await supabase
            .from('patients')
            .select('prodentis_id')
            .in('id', uuidy);
        if (e2) {
            console.error('[PushHealth] Sonda appointment_reminder (konta):', e2.message);
            return null;
        }
        const pidy = (konta ?? [])
            .map((k) => (k as { prodentis_id?: string }).prodentis_id)
            .filter(Boolean) as string[];
        if (pidy.length === 0) return { zaniedbane: 0 };

        /**
         * 🪤 `patient_push_tokens.patient_id` trzyma **prodentis id**, NIE UUID konta —
         * mimo nazwy kolumny. Pomyłka tutaj daje zawsze zero trafień, czyli ciche
         * „nikt nie ma apki" i sondę, która nigdy nie strzeli.
         */
        const { data: tokeny, error: e3 } = await supabase
            .from('patient_push_tokens')
            .select('patient_id')
            .in('patient_id', pidy);
        if (e3) {
            console.error('[PushHealth] Sonda appointment_reminder (tokeny):', e3.message);
            return null;
        }
        // Ma token, a dostał SMS-a → push-first zawiódł.
        return { zaniedbane: (tokeny ?? []).length };
    },

    careflow_task: async () => {
        const teraz = Date.now();
        const gorna = new Date(teraz - ZANIEDBANE_PO_H * 3600_000).toISOString();
        const dolna = new Date(teraz - GRACE_H * 3600_000).toISOString();

        const { data, error } = await supabase
            .from('care_tasks')
            .select('id')
            .is('completed_at', null)
            .is('skipped_at', null)
            .eq('push_sent_count', 0)
            .lt('scheduled_at', gorna)
            .gt('scheduled_at', dolna)
            .limit(50);

        // 🪤 Błąd odczytu NIE jest dowodem, że wszystko gra. Zwracamy `null`, czyli
        // „nie wiem" — wołający zostawia wtedy stary warunek zegarowy zamiast
        // po cichu wygasić alarm. Tak samo jak przy `getTwoFactorStatus` (fail-closed).
        if (error) {
            console.error('[PushHealth] Sonda careflow_task:', error.message);
            return null;
        }
        return { zaniedbane: (data ?? []).length };
    },
};

/**
 * Ścieżki, które milczą dłużej, niż powinny.
 *
 * Bierzemy pod uwagę WYŁĄCZNIE wiersze z ustawionym `max_silence_minutes` — dla ścieżek
 * zdarzeniowych (rezerwacja, odwołanie, czat) cisza jest normalna i alarmowanie z jej
 * powodu nauczyłoby zespół ignorować te alerty.
 */
export async function findSilentPushPaths(): Promise<
    Array<{ path_key: string; label: string; silentMinutes: number | null; lastError: string | null }>
> {
    const { data, error } = await supabase
        .from('push_path_health')
        .select('path_key, label, max_silence_minutes, last_attempt_at, last_success_at, last_error')
        .not('max_silence_minutes', 'is', null);

    if (error) {
        console.error('[PushHealth] Odczyt rejestru:', error.message);
        return [];
    }

    const now = Date.now();
    const out: Array<{ path_key: string; label: string; silentMinutes: number | null; lastError: string | null }> = [];

    for (const row of (data ?? []) as unknown as PushPathHealthRow[]) {
        const limit = row.max_silence_minutes;
        if (limit == null) continue;

        /**
         * 🔑 ŚCIEŻKI NIGDY NIE PODJĘTEJ NIE ALARMUJEMY.
         *
         * Zmierzone na produkcji 2026-07-29: `appointment_reminder` miało
         * `attempts_24h = 0`, `last_attempt_at = null` i zero błędów — czyli ze 169
         * przypomnień ANI JEDNO nie trafiło do posiadacza aplikacji, bo takiego
         * kandydata po prostu nie było. Poprzednia wersja tego warunku traktowała
         * „nigdy nie zadziałała" jak awarię i wysyłała alert CODZIENNIE, od dnia
         * wgrania migracji 186. To dokładnie ten skutek, przed którym ostrzega
         * komentarz w cronie: alarm o ciszy tam, gdzie cisza jest normalna, uczy
         * zespół ignorować alerty — i wtedy przestaje działać cały mechanizm.
         *
         * Rozróżnienie jest proste i nie wymaga nowej kolumny: `last_attempt_at`
         * jest ustawiane przy KAŻDEJ próbie, niezależnie od wyniku. Brak tego
         * znacznika = nie było jeszcze ani jednego kandydata, czyli „czekamy na
         * pierwszego odbiorcę", a nie „kanał padł".
         */
        if (!row.last_attempt_at) continue;

        /**
         * Ścieżka ZDARZENIOWA z sondą — zegar jej nie dotyczy.
         * `null` z sondy = nie udało się sprawdzić; wtedy zostawiamy stary warunek
         * zegarowy, bo lepszy alarm nadmiarowy niż cicho zgaszony.
         */
        const sonda = SONDY_ZDARZENIOWE[row.path_key];
        if (sonda) {
            const wynik = await sonda();
            if (wynik !== null) {
                if (wynik.zaniedbane > 0) {
                    out.push({
                        path_key: row.path_key,
                        label: row.label,
                        silentMinutes: null,
                        lastError: `zaległe zadania bez próby pusha: ${wynik.zaniedbane}`,
                    });
                }
                continue;
            }
        }

        // Podjęta, ale nigdy nieudana — to JEST awaria (są kandydaci, brak sukcesów).
        const silent = row.last_success_at
            ? Math.floor((now - new Date(row.last_success_at).getTime()) / 60_000)
            : null;
        if (silent === null || silent > limit) {
            out.push({ path_key: row.path_key, label: row.label, silentMinutes: silent, lastError: row.last_error });
        }
    }
    return out;
}
