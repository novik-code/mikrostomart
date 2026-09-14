/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapa łańcucha PostgREST jest z natury dynamiczna. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK: kod zapisuje do `sms_reminders.status` WYŁĄCZNIE wartości, które baza przyjmuje.
 *
 * ══ CO BYŁO ZEPSUTE (zmierzone 2026-09-14) ══════════════════════════════════
 * `updateDeliveryStatus` po udanym pushu zapisywał `status: 'push_sent'`, a CHECK
 * z migracji 007 dopuszczał tylko draft/sent/failed/cancelled. Postgres odrzucał CAŁY
 * UPDATE — razem z kanałem, `push_sent = true` i godziną — więc przypomnienie wysłane
 * pushem zostawało szkicem i znikało przy czyszczeniu szkiców. Od 07.09 36 pushy doszło
 * do pacjentów, a w tabeli nie ma ani jednego wiersza z `push_sent = true`.
 *
 * Testy jednostkowe tego nie widziały, bo atrapa bazy nie zna ograniczeń CHECK.
 * Dlatego ten strażnik czyta dozwolone wartości z MIGRACJI (ostatniej, która ustawia
 * CHECK statusu tej tabeli) i porównuje z tym, co kod naprawdę zapisuje:
 *   1) WYKONUJE `updateDeliveryStatus` dla każdego wyniku dostarczenia,
 *   2) inwentarz po skutku: KAŻDY literał w wyrażeniu statusu zapisu do `sms_reminders` —
 *      także w operatorze warunkowym (`status: x ? 'push_sent' : 'draft'`) i w obiekcie
 *      zbudowanym w zmiennej przed zapisem (`updateData.status = …`, `insert(logEntry)`).
 *      🪤 Pierwsza wersja łapała tylko `status: '…'` i nie widziała żadnego z trzech
 *      miejsc, które piszą `push_sent` — wykrył to przegląd przed wdrożeniem.
 *
 * DOWÓD, ŻE GRYZIE (cofki): usuń `'push_sent'` z migracji 204 → pada 🔴 (1) i (2);
 * zmień ternary w `post-visit-sms` na `'push_delivered'` → pada 🔴 (2).
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const zapisy: Array<Record<string, unknown>> = [];
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({
            update: (dane: Record<string, unknown>) => { zapisy.push(dane); return { eq: async () => ({ error: null }) }; },
        }),
    }),
}));
vi.mock('../pushService', () => ({ pushToPatientAll: async () => ({ sent: 0, fcm: { sent: 0, failed: 0 }, expo: { sent: 0, failed: 0 } }) }));
vi.mock('../expoPush', () => ({ hasPatientAppToken: async () => ({ has: false }) }));
vi.mock('../smsService', () => ({ sendSMS: async () => ({ success: true }) }));

const KATALOG_MIGRACJI = path.join(process.cwd(), 'supabase_migrations');

/** Dozwolone statusy z OSTATNIEJ migracji, która ustawia CHECK statusu `sms_reminders`. */
function dozwoloneStatusy(): { plik: string; wartosci: string[] } {
    let wynik: { plik: string; wartosci: string[] } | null = null;
    for (const plik of fs.readdirSync(KATALOG_MIGRACJI).filter((f) => f.endsWith('.sql')).sort()) {
        const sql = fs.readFileSync(path.join(KATALOG_MIGRACJI, plik), 'utf8').replace(/--[^\n]*/g, '');
        for (const instrukcja of sql.split(';')) {
            if (!/sms_reminders/i.test(instrukcja)) continue;
            const m = instrukcja.match(/CHECK\s*\(\s*status\s+IN\s*\(([^)]*)\)\s*\)/i);
            if (m) wynik = { plik, wartosci: [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) };
        }
    }
    if (!wynik) throw new Error('Nie znaleziono CHECK statusu sms_reminders w migracjach');
    return wynik;
}

function bezKomentarzy(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function plikiKodu(katalog: string): string[] {
    return fs.readdirSync(katalog, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(katalog, d.name);
        if (d.isDirectory()) return d.name === '__tests__' ? [] : plikiKodu(p);
        return /\.(ts|tsx)$/.test(d.name) ? [p] : [];
    });
}

/** Wszystkie literały w wyrażeniu (do końca linii/przecinka na poziomie obiektu). */
function literalyWyrazenia(wyrazenie: string): string[] {
    return [...wyrazenie.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}

/** Literały statusu zapisywane do `sms_reminders` w jednym pliku. */
function statusyWPliku(kod: string): string[] {
    const wynik: string[] = [];
    for (const m of kod.matchAll(/from\('sms_reminders'\)/g)) {
        let blok = kod.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + 1500);
        const nastepny = blok.indexOf("from('");
        if (nastepny >= 0) blok = blok.slice(0, nastepny);
        const zapis = blok.match(/\.(update|insert|upsert)\(\s*([\s\S]*)/);
        if (!zapis) continue;
        // (a) obiekt podany wprost: `status: <wyrażenie>` — z ternary włącznie
        for (const s of zapis[2].matchAll(/\bstatus:\s*([^,\n}]+)/g)) wynik.push(...literalyWyrazenia(s[1]));
        // (b) obiekt zbudowany w zmiennej przed zapisem: `.update(updateData)` / `.insert([logEntry])`
        const zmienna = zapis[2].match(/^\[?\s*([A-Za-z_]\w*)\s*\]?\s*\)/);
        if (zmienna) {
            const id = zmienna[1];
            for (const s of kod.matchAll(new RegExp(`\\b${id}\\.status\\s*=\\s*([^;\\n]+)`, 'g'))) wynik.push(...literalyWyrazenia(s[1]));
            const deklaracja = kod.match(new RegExp(`\\b(?:const|let)\\s+${id}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};?`));
            if (deklaracja) for (const s of deklaracja[1].matchAll(/\bstatus:\s*([^,\n}]+)/g)) wynik.push(...literalyWyrazenia(s[1]));
        }
    }
    return wynik;
}

describe('sms_reminders.status · kod zapisuje tylko to, co baza przyjmie', () => {
    const { plik, wartosci } = dozwoloneStatusy();

    it('KONTROLA MIERNIKA: parser znalazł ograniczenie z sensowną listą', () => {
        expect(wartosci).toEqual(expect.arrayContaining(['draft', 'sent', 'failed', 'cancelled']));
        expect(plik, 'ostatnia migracja ustawiająca CHECK statusu').toMatch(/^\d{3}_/);
    });

    it('🔴 (1) updateDeliveryStatus: każdy wynik dostarczenia daje status dozwolony w bazie', async () => {
        const { updateDeliveryStatus } = await import('@/lib/patientDelivery');
        const baza = { patientHasAccount: true, patientHasPush: true };
        const wyniki = [
            { ...baza, channel: 'push' as const, pushSent: true, smsSent: false },
            { ...baza, channel: 'sms' as const, pushSent: false, smsSent: true, pushError: 'x' },
            { ...baza, channel: 'push+sms' as const, pushSent: true, smsSent: true },
            { ...baza, channel: 'none' as const, pushSent: false, smsSent: false },
        ];
        zapisy.length = 0;
        for (const w of wyniki) await updateDeliveryStatus('r1', w);
        const statusy = zapisy.map((z) => z.status).filter((s): s is string => typeof s === 'string');
        // Kontrola: udany push MUSI coś zapisać do statusu — inaczej asercja niżej przeszłaby na pustce.
        expect(statusy).toContain('push_sent');
        for (const s of statusy) {
            expect(wartosci, `status '${s}' odrzuciłby CHECK z ${plik} — cały zapis dostarczenia przepadłby`).toContain(s);
        }
    });

    it('🔴 (2) inwentarz po skutku: każdy literał statusu w zapisie do sms_reminders jest dozwolony', () => {
        const znalezione: Array<{ plik: string; status: string }> = [];
        for (const p of plikiKodu(path.join(process.cwd(), 'src'))) {
            for (const status of statusyWPliku(bezKomentarzy(fs.readFileSync(p, 'utf8')))) {
                znalezione.push({ plik: path.relative(process.cwd(), p), status });
            }
        }
        // Kontrola zasięgu: `push_sent` piszą TRZY miejsca (patientDelivery przez zmienną,
        // post-visit-sms i week-after-visit-sms przez ternary). Jeśli inwentarz ich nie widzi,
        // nie widzi też klasy błędu, przed którą chroni.
        const zPushSent = new Set(znalezione.filter((z) => z.status === 'push_sent').map((z) => z.plik));
        expect([...zPushSent].sort(), 'inwentarz nie widzi zapisów push_sent — wzorzec zmurszał').toEqual(expect.arrayContaining([
            'src/app/api/cron/post-visit-sms/route.ts',
            'src/app/api/cron/week-after-visit-sms/route.ts',
            'src/lib/patientDelivery.ts',
        ]));
        const zle = znalezione.filter((z) => !wartosci.includes(z.status));
        expect(zle.map((z) => `${z.plik}: '${z.status}'`)).toEqual([]);
    });
});
