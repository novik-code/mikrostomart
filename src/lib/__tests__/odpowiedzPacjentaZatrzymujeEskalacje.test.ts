/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapa łańcucha PostgREST jest z natury dynamiczna. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK: reakcja pacjenta (potwierdzenie, odwołanie, przełożenie) zatrzymuje dosłanie SMS-a.
 *
 * ══ CO BYŁO ZEPSUTE (przegląd 2026-09-14) ═══════════════════════════════════
 * `hasPatientResponded` szukało statusów `confirmed`/`cancelled`/`reschedule_requested`
 * po dniu wizyty. Trasy piszą jednak `attendance_confirmed` (potwierdzenie z SMS-a
 * i z aplikacji) oraz `rescheduled` z NOWĄ datą (przełożenie w strefie pacjenta).
 * Pacjent, który potwierdził, wyglądał na takiego, który nie zareagował.
 * Martwe do migracji 204 — od niej `push-escalation` wysyłałby SMS „potwierdź"
 * każdemu, kto potwierdził pushem, a przełożonym SMS ze starą godziną.
 *
 * Inwentarz po SKUTKU: bierze statusy z KAŻDEGO zapisu do `appointment_actions`,
 * który ustawia `attendance_confirmed`/`cancellation_requested`/`reschedule_requested`
 * na true, i WYKONUJE `hasPatientResponded` na wierszu z takim statusem.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć stary filtr statusów i dnia → padają 🔴.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let wiersze: Array<Record<string, unknown>> = [];
const filtry: string[] = [];

function zapytanie(): any {
    const q: any = {};
    q.select = () => q;
    q.eq = (k: string) => { filtry.push(`eq:${k}`); return q; };
    q.gte = (k: string) => { filtry.push(`gte:${k}`); return q; };
    q.lte = (k: string) => { filtry.push(`lte:${k}`); return q; };
    q.in = (k: string, v: string[]) => { filtry.push(`in:${k}`); wiersze = wiersze.filter((w) => v.includes(String(w.status))); return q; };
    q.limit = () => q;
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve({ data: wiersze, error: null }).then(res, rej);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));
vi.mock('../pushService', () => ({ pushToPatientAll: async () => ({ sent: 0, fcm: { sent: 0, failed: 0 }, expo: { sent: 0, failed: 0 } }) }));
vi.mock('../expoPush', () => ({ hasPatientAppToken: async () => ({ has: false }) }));
vi.mock('../smsService', () => ({ sendSMS: async () => ({ success: true }) }));

beforeEach(() => { wiersze = []; filtry.length = 0; });

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

/** Statusy pisane RAZEM z flagą reakcji pacjenta w zapisach do `appointment_actions`. */
function statusyReakcji(): Array<{ plik: string; status: string }> {
    const wynik: Array<{ plik: string; status: string }> = [];
    for (const p of plikiKodu(path.join(process.cwd(), 'src/app/api'))) {
        const kod = bezKomentarzy(fs.readFileSync(p, 'utf8'));
        for (const m of kod.matchAll(/from\('appointment_actions'\)/g)) {
            let blok = kod.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + 1200);
            const nastepny = blok.indexOf("from('");
            if (nastepny >= 0) blok = blok.slice(0, nastepny);
            if (!/\.update\(/.test(blok)) continue;
            if (!/(attendance_confirmed|cancellation_requested|reschedule_requested)\s*:\s*true/.test(blok)) continue;
            for (const s of blok.matchAll(/status:\s*'([a-z_]+)'/g)) wynik.push({ plik: path.relative(process.cwd(), p), status: s[1] });
        }
    }
    return wynik;
}

describe('hasPatientResponded · każda reakcja pacjenta się liczy', () => {
    const reakcje = statusyReakcji();

    it('inwentarz znajduje trasy potwierdzenia, odwołania i przełożenia', () => {
        const statusy = new Set(reakcje.map((r) => r.status));
        expect(reakcje.length).toBeGreaterThanOrEqual(3);
        expect([...statusy]).toEqual(expect.arrayContaining(['attendance_confirmed', 'rescheduled']));
    });

    it('🔴 wiersz z KAŻDYM statusem reakcji (bez flag) → zareagował', async () => {
        const { hasPatientResponded } = await import('@/lib/patientDelivery');
        for (const r of reakcje) {
            wiersze = [{ status: r.status, attendance_confirmed: false, cancellation_requested: false, reschedule_requested: false }];
            expect(await hasPatientResponded('0100000001', '2026-09-15T10:00:00+00:00'), `${r.plik}: status '${r.status}'`).toBe(true);
        }
    });

    it('🔴 sama flaga reakcji wystarcza, nawet przy nieznanym statusie', async () => {
        const { hasPatientResponded } = await import('@/lib/patientDelivery');
        for (const flaga of ['attendance_confirmed', 'cancellation_requested', 'reschedule_requested']) {
            wiersze = [{ status: 'cokolwiek', attendance_confirmed: false, cancellation_requested: false, reschedule_requested: false, [flaga]: true }];
            expect(await hasPatientResponded('0100000001', '2026-09-15T10:00:00+00:00'), flaga).toBe(true);
        }
    });

    it('🔴 przełożona wizyta ma NOWĄ datę — funkcja nie może filtrować po starym dniu', async () => {
        const { hasPatientResponded } = await import('@/lib/patientDelivery');
        wiersze = [{ status: 'rescheduled', reschedule_requested: true, appointment_date: '2026-09-22T12:00:00+00:00' }];
        await hasPatientResponded('0100000001', '2026-09-15T10:00:00+00:00');
        expect(filtry.filter((f) => f.includes('appointment_date'))).toEqual([]);
    });

    it('KONTROLA NEGATYWNA: wizyta bez reakcji i brak wiersza → nie zareagował', async () => {
        const { hasPatientResponded } = await import('@/lib/patientDelivery');
        wiersze = [{ status: 'pending', attendance_confirmed: false, cancellation_requested: false, reschedule_requested: false }];
        expect(await hasPatientResponded('0100000001', '2026-09-15T10:00:00+00:00')).toBe(false);
        wiersze = [];
        expect(await hasPatientResponded('0100000001', '2026-09-15T10:00:00+00:00')).toBe(false);
    });
});
