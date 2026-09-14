/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK: odrzucenie albo usunięcie rezerwacji online NIE DOTYKA danych pacjenta w Prodentisie.
 *
 * ══ SKĄD TO SIĘ WZIĘŁO (2026-09-14) ══════════════════════════════════════════
 * Recepcja zakładała w Prodentisie nową pacjentkę i program wysypał się na
 * `Violation of PRIMARY KEY constraint 'PK_pacjenci' … duplicate key value is (0100008053)`.
 * Numer 0100008053 założyło 13.09 nasze API przy rezerwacji online, którą rano odrzucił
 * admin. Hipoteza właściciela: „odrzucenie skasowało kartotekę, więc Prodentis uznał numer
 * za wolny". Pomiar ją obalił: kartoteka 0100008053 nadal istnieje (odczyt z PMS), a sam
 * komunikat mówi, że zapis padł, bo numer był ZAJĘTY. Kolizję zrobił przydział numerów
 * w Prodentisie, nie nasze odrzucenie.
 *
 * Mimo to warunek właściciela jest słuszny i ma być pilnowany: API zakłada kartoteki
 * (to jego zadanie), a odrzucenie wizyty — bo pacjent umówił się źle i recepcja dzwoni,
 * żeby umówić ręcznie — nie może usunąć ani zmienić danych pacjenta. Dziś odrzucenie
 * zmienia wyłącznie wiersz u nas i wysyła powiadomienie; ten test pilnuje, żeby tak zostało.
 *
 * DOWÓD, ŻE GRYZIE (cofka): dopisz dowolne `prodentisFetch` w gałęzi `reject` albo w DELETE
 * → padają 🔴; dopisz kasowanie `/api/patients/…` gdziekolwiek w `src` → pada inwentarz.
 *
 * Uruchomienie: `npx vitest run odrzucenieRezerwacjiNieDotykaPms`
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const wywolaniaPms: Array<{ sciezka: string; metoda: string }> = [];

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (sciezka: string, opcje: { method?: string } = {}) => {
        const metoda = (opcje.method || 'GET').toUpperCase();
        wywolaniaPms.push({ sciezka, metoda });
        if (metoda === 'POST' && sciezka === '/api/schedule/appointment') {
            return { ok: true, status: 201, json: async () => ({ appointmentId: 'APT-TEST' }) };
        }
        return { ok: true, status: 200, json: async () => ({}) };
    },
}));
vi.mock('@/lib/authGuards', () => ({
    requireAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'admin@example.test' } }),
}));
vi.mock('@/lib/bookingDuration', () => ({ czasWizyty: async () => ({ minuty: 30, zrodlo: 'test' }) }));
vi.mock('@/lib/typUslugiPms', () => ({ typUslugiDlaPms: () => undefined }));
vi.mock('@/lib/doctorMapping', () => ({ getDoctorInfo: () => ({ prodentisId: '0100000001' }) }));
vi.mock('@/lib/pushService', () => ({ sendTranslatedPushToUser: async () => ({ sent: 0 }) }));
vi.mock('@/lib/smsService', () => ({ sendSMS: async () => ({ success: true }) }));
vi.mock('@/lib/emailService', () => ({
    sendBookingConfirmedEmail: async () => ({ success: true }),
    sendBookingRejectedEmail: async () => ({ success: true }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: () => {} }));

/** Rezerwacja nowego pacjenta, któremu API założyło już kartotekę — dokładnie przypadek z 13.09. */
const REZERWACJA = {
    id: 'b1',
    patient_name: 'Pacjent Testowy',
    patient_phone: '+48600000000',
    patient_email: 'pacjent@example.test',
    prodentis_patient_id: '0100000999',
    is_new_patient: true,
    patient_match_method: 'created',
    specialist_id: 'specjalista-testowy',
    specialist_name: 'Lekarz Testowy',
    doctor_prodentis_id: '0100000001',
    appointment_date: '2026-09-18',
    appointment_time: '11:30:00',
    service_type: 'Konsultacja',
    description: null,
    schedule_status: 'pending',
};

const zapisyBazy: Array<{ tabela: string; operacja: string; dane?: any }> = [];

function zapytanie(tabela: string): any {
    let aktualizacja: any = null;
    const q: any = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'in', 'neq']) q[m] = () => q;
    q.update = (dane: any) => { aktualizacja = dane; zapisyBazy.push({ tabela, operacja: 'update', dane }); return q; };
    q.delete = () => { zapisyBazy.push({ tabela, operacja: 'delete' }); return q; };
    const wiersz = () => (tabela === 'online_bookings' ? { ...REZERWACJA, ...(aktualizacja || {}) } : null);
    q.single = async () => ({ data: wiersz(), error: null });
    q.maybeSingle = async () => ({ data: wiersz(), error: null });
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(res, rej);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

beforeEach(() => {
    wywolaniaPms.length = 0;
    zapisyBazy.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

/** Powiadomienia idą „fire-and-forget" — dajemy im dojść, zanim policzymy wywołania PMS. */
const dajDojscPowiadomieniom = () => new Promise((r) => setTimeout(r, 0));

async function akcja(action: string) {
    const { PUT } = await import('@/app/api/admin/online-bookings/route');
    const res = await PUT(new Request('https://example.test/api/admin/online-bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: 'b1', action, approvedBy: 'admin' }),
    }));
    await dajDojscPowiadomieniom();
    return res;
}

describe('rezerwacja online · odrzucenie i usunięcie nie ruszają Prodentisa', () => {
    it('KONTROLA MIERNIKA: zatwierdzenie WOŁA Prodentis (atrapa naprawdę liczy wywołania)', async () => {
        // Bez tej kontroli „zero wywołań" niżej mogłoby znaczyć tylko tyle, że atrapa nie działa.
        const res = await akcja('approve');
        expect(res.status).toBe(200);
        expect(wywolaniaPms).toContainEqual({ sciezka: '/api/schedule/appointment', metoda: 'POST' });
    });

    it('🔴 odrzucenie: ZERO wywołań Prodentisa, zmienia się tylko status u nas', async () => {
        const res = await akcja('reject');
        expect(res.status).toBe(200);
        expect(wywolaniaPms, 'odrzucenie rezerwacji nie może niczego wysłać do PMS').toEqual([]);
        expect(zapisyBazy).toEqual([
            expect.objectContaining({ tabela: 'online_bookings', operacja: 'update', dane: expect.objectContaining({ schedule_status: 'rejected' }) }),
        ]);
        // Numer kartoteki zostaje przy rezerwacji — nikt go nie „zwalnia".
        expect(zapisyBazy[0].dane).not.toHaveProperty('prodentis_patient_id');
    });

    it('🔴 usunięcie rezerwacji z listy: ZERO wywołań Prodentisa', async () => {
        const { DELETE } = await import('@/app/api/admin/online-bookings/route');
        const res = await DELETE(new Request('https://example.test/api/admin/online-bookings?id=b1', { method: 'DELETE' }));
        await dajDojscPowiadomieniom();
        expect(res.status).toBe(200);
        expect(wywolaniaPms).toEqual([]);
    });
});

/** Kod bez komentarzy — żeby nie liczyć własnych opisów (pułapka powtarzana w tym repo). */
function bezKomentarzy(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function plikiKodu(katalog: string): string[] {
    return fs.readdirSync(katalog, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(katalog, d.name);
        if (d.isDirectory()) return d.name === '__tests__' || d.name === 'node_modules' ? [] : plikiKodu(p);
        return /\.(ts|tsx)$/.test(d.name) ? [p] : [];
    });
}

/** Pełny tekst wywołania `prodentisFetch(…)` — skan nawiasów od miejsca wywołania. */
function wywolaniaProdentisFetch(kod: string): string[] {
    const wyniki: string[] = [];
    let i = kod.indexOf('prodentisFetch(');
    while (i !== -1) {
        let glebokosc = 0;
        let j = i + 'prodentisFetch'.length;
        for (; j < kod.length; j++) {
            if (kod[j] === '(') glebokosc++;
            else if (kod[j] === ')' && --glebokosc === 0) break;
        }
        wyniki.push(kod.slice(i, j + 1));
        i = kod.indexOf('prodentisFetch(', j);
    }
    return wyniki;
}

describe('inwentarz po SKUTKU · żadne kasowanie w PMS nie celuje w kartotekę pacjenta', () => {
    const kasowania = plikiKodu(path.join(process.cwd(), 'src'))
        .filter((p) => !p.endsWith(path.join('lib', 'prodentisFetch.ts')))
        .flatMap((plik) => wywolaniaProdentisFetch(bezKomentarzy(fs.readFileSync(plik, 'utf8')))
            .filter((w) => /method\s*:\s*['"`]DELETE['"`]/.test(w))
            .map((w) => ({ plik: path.relative(process.cwd(), plik), wywolanie: w })));

    it('inwentarz w ogóle coś znajduje (wzorzec nie zmurszał)', () => {
        // Dziś jest dokładnie jedno kasowanie: skreślenie WIZYTY przez pacjenta w strefie pacjenta.
        expect(kasowania.length).toBeGreaterThanOrEqual(1);
    });

    it('🔴 każde DELETE do PMS kasuje WIZYTĘ w grafiku, nigdy pacjenta', () => {
        const zle = kasowania.filter((k) => !/^prodentisFetch\(\s*`\/api\/schedule\/appointment\//.test(k.wywolanie));
        expect(
            zle.map((k) => `${k.plik}: ${k.wywolanie.slice(0, 120)}`),
            'kasowanie w PMS poza wizytą w grafiku — dane pacjenta nie mogą znikać z naszej inicjatywy',
        ).toEqual([]);
    });
});
