/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK KSZTAŁTU WEJŚCIA W TRZECH TRASACH PERSONELU (P-104, P-105, P-106).
 *
 * 🔴 JEDNA KLASA, TRZY TRASY. Wszystkie zapisywały ciało żądania do bazy bez sprawdzenia
 * typu, zakresu ani długości:
 *   · **P-104** `intake/generate-token` — `expiresInHours` bez pułapu (87600 → link do
 *     e-Karty ważny ~10 lat; napis → nieobsłużony błąd i 500), `prodentisPatientId` jako
 *     dowolny tekst, a `created_by_employee` brany z CIAŁA zamiast z sesji;
 *   · **P-105** `employee/consent-tokens` — `consentTypes` jako napis przechodziło bramkę
 *     `?.length` i wywalało `TypeError` → 500; wystawienie linku do zgód nie zostawiało
 *     wpisu w audycie, przez co `patient_consents.created_by` był zawsze pusty (art. 30);
 *   · **P-106** `careflow/tasks/[id]` — dowolne `completedAt` (raport PDF liczy je jako
 *     wykonanie zadania) i ujemny `pushSentCount` (wydłuża serię przypomnień).
 *
 * 🔑 Skutek jest ograniczony do UWIERZYTELNIONEGO personelu — to defensywa przed pomyłką
 * i przed insiderem, nie dziura dla obcego. Stąd waga niska i stąd brak tu nowych bramek
 * dostępu: naprawiamy KSZTAŁT, nie uprawnienia.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń walidację z dowolnej trasy → padają jej testy.
 *
 * Uruchomienie: `npx vitest run inputShapeGuards`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { poprawnaLiczba, poprawnaDataIso, poprawnaListaTekstow, poprawnyIdPms, poprawnyTekst } from '@/lib/walidacjaWejscia';

describe('predykaty kształtu', () => {
    it('liczba: tylko całkowita w zakresie, napis NIE przechodzi', () => {
        expect(poprawnaLiczba(24, 1, 168)).toBe(true);
        expect(poprawnaLiczba(87600, 1, 168)).toBe(false);
        expect(poprawnaLiczba('24', 1, 168)).toBe(false);
        expect(poprawnaLiczba(1.5, 1, 168)).toBe(false);
        expect(poprawnaLiczba(-1, 0, 10)).toBe(false);
    });

    it('data ISO: null wolno, „prawie data" nie', () => {
        expect(poprawnaDataIso(null)).toBe(true);
        expect(poprawnaDataIso('2026-09-11T14:30:00.000Z')).toBe(true);
        expect(poprawnaDataIso('wczoraj')).toBe(false);
        expect(poprawnaDataIso(123)).toBe(false);
    });

    it('lista napisów: pusta i nie-tablica odpadają', () => {
        expect(poprawnaListaTekstow(['rodo'], 20, 60)).toBe(true);
        expect(poprawnaListaTekstow([], 20, 60)).toBe(false);
        expect(poprawnaListaTekstow('rodo', 20, 60)).toBe(false);
        expect(poprawnaListaTekstow([1], 20, 60)).toBe(false);
    });

    it('identyfikator PMS: ten sam kształt co w ścieżkach', () => {
        expect(poprawnyIdPms('0100001110')).toBe(true);
        expect(poprawnyIdPms('../admin')).toBe(false);
        expect(poprawnyIdPms('')).toBe(false);
    });

    it('tekst: null wolno, przesadna długość nie', () => {
        expect(poprawnyTekst('Jan', 200)).toBe(true);
        expect(poprawnyTekst(null, 200)).toBe(true);
        expect(poprawnyTekst('x'.repeat(201), 200)).toBe(false);
        expect(poprawnyTekst(42, 200)).toBe(false);
    });
});

// ── Okablowanie ─────────────────────────────────────────────────────────────

let wstawione: Record<string, unknown>[] = [];
let zmienione: Record<string, unknown>[] = [];
let wpisyAudytu: string[] = [];

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'pracownik@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'pracownik@example.test' } }),
    requireAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'pracownik@example.test' } }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: async (a: any) => { wpisyAudytu.push(a?.action || '?'); } }));
vi.mock('@/lib/brandConfig', () => ({ demoSanitize: (s: string) => s, brand: { appUrl: 'https://example.test', name: 'X' } }));
vi.mock('@/lib/careflowSchedule', async (orig) => await orig());
// 🪤 Bez tej atrapy trasa odrzucała typ zgody jako nieznany i oddawała 400 — asercja
// o audycie padała z niewłaściwego powodu, bo do wpisu w ogóle nie dochodziło.
vi.mock('@/lib/consentTypes', () => ({
    getConsentTypesFromDB: async () => ({ rodo: { label: 'RODO' } }),
    CONSENT_TYPES: { rodo: { label: 'RODO' } },
    CONSENT_TYPE_KEYS: ['rodo'],
}));

function zapytanie(tabela: string): any {
    const q: any = {};
    for (const m of ['eq', 'in', 'order', 'limit', 'is', 'neq', 'gte', 'lte']) q[m] = () => q;
    q.select = () => q;
    q.single = async () => q.maybeSingle();
    q.maybeSingle = async () => {
        if (tabela === 'care_tasks') return { data: { id: 't1', enrollment_id: 'e1', title: 'Lek', scheduled_at: '2026-09-11T10:00:00Z', visible_from: null, skipped_at: null, description: null }, error: null };
        if (tabela === 'consent_types') return { data: null, error: null };
        return { data: { id: 'x', token: 'tok', expires_at: '2026-09-12T10:00:00Z' }, error: null };
    };
    q.insert = (p: Record<string, unknown>) => { wstawione.push(p); const r: any = { select: () => r, single: async () => ({ data: { id: 'x', token: 'tok', expires_at: '2026-09-12T10:00:00Z' }, error: null }) }; r.then = (res: any) => Promise.resolve({ data: null, error: null }).then(res); return r; };
    q.update = (p: Record<string, unknown>) => { zmienione.push(p); return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

const post = (adres: string, body: unknown) =>
    new NextRequest(adres, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const patch = (body: unknown) =>
    new NextRequest('https://example.test/api/employee/careflow/tasks/t1', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => {
    vi.clearAllMocks();
    wstawione = [];
    zmienione = [];
    wpisyAudytu = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-104 · intake/generate-token', () => {
    it('🔴 `expiresInHours` ponad pułap → 400, ZERO zapisu', async () => {
        const { POST } = await import('@/app/api/intake/generate-token/route');
        const res = await POST(post('https://example.test/api/intake/generate-token', { createdByEmployee: 'x', expiresInHours: 87600 }));
        expect(res.status).toBe(400);
        expect(wstawione).toHaveLength(0);
    });

    it('🔴 `expiresInHours` jako napis → 400, nie 500 z Postgresa', async () => {
        const { POST } = await import('@/app/api/intake/generate-token/route');
        expect((await POST(post('https://example.test/api/intake/generate-token', { createdByEmployee: 'x', expiresInHours: '24' }))).status).toBe(400);
    });

    it('🔴 `prodentisPatientId` spoza wzorca → 400 (wartość idzie do ścieżki żądania PMS)', async () => {
        const { POST } = await import('@/app/api/intake/generate-token/route');
        expect((await POST(post('https://example.test/api/intake/generate-token', { createdByEmployee: 'x', prodentisPatientId: '../admin' }))).status).toBe(400);
    });

    it('🔑 autor bierze się z SESJI, nie z ciała żądania', async () => {
        const { POST } = await import('@/app/api/intake/generate-token/route');
        await POST(post('https://example.test/api/intake/generate-token', { createdByEmployee: 'ktoś-inny@example.test', expiresInHours: 24 }));
        expect(wstawione[0].created_by_employee).toBe('pracownik@example.test');
    });

    it('poprawne żądanie przechodzi', async () => {
        const { POST } = await import('@/app/api/intake/generate-token/route');
        const res = await POST(post('https://example.test/api/intake/generate-token', { createdByEmployee: 'x', expiresInHours: 24, prodentisPatientId: '0100001110' }));
        expect(res.status).toBeLessThan(400);
        expect(wstawione).toHaveLength(1);
    });
});

describe('P-106 · careflow/tasks/[id]', () => {
    const par = { params: Promise.resolve({ id: 't1' }) };

    it('🔴 `completedAt` jako śmieć → 400, ZERO zapisu (raport PDF liczy to jako wykonanie)', async () => {
        const { PATCH } = await import('@/app/api/employee/careflow/tasks/[id]/route');
        const res = await PATCH(patch({ completedAt: 'wczoraj' }), par);
        expect(res.status).toBe(400);
        expect(zmienione).toHaveLength(0);
    });

    it('🔴 ujemny `pushSentCount` → 400 (wydłużałby serię przypomnień)', async () => {
        const { PATCH } = await import('@/app/api/employee/careflow/tasks/[id]/route');
        expect((await PATCH(patch({ pushSentCount: -5 }), par)).status).toBe(400);
        expect(zmienione).toHaveLength(0);
    });

    it('🔴 `title` jako nie-napis → 400, nie 500 z Postgresa', async () => {
        const { PATCH } = await import('@/app/api/employee/careflow/tasks/[id]/route');
        expect((await PATCH(patch({ title: { a: 1 } }), par)).status).toBe(400);
    });

    it('poprawna zmiana godziny dalej przechodzi', async () => {
        const { PATCH } = await import('@/app/api/employee/careflow/tasks/[id]/route');
        const res = await PATCH(patch({ scheduledAt: '2026-09-12T10:00:00.000Z' }), par);
        expect(res.status).toBeLessThan(400);
    });
});

describe('P-105 · employee/consent-tokens', () => {
    it('🔴 `consentTypes` jako napis → 400, nie 500 z TypeError', async () => {
        const { POST } = await import('@/app/api/employee/consent-tokens/route');
        const res = await POST(post('https://example.test/api/employee/consent-tokens', { patientName: 'Jan', consentTypes: 'rodo' }));
        expect(res.status).toBe(400);
        expect(wstawione).toHaveLength(0);
    });

    it('🔴 `prodentisPatientId` spoza wzorca → 400 (idzie do ścieżki storage i do PMS)', async () => {
        const { POST } = await import('@/app/api/employee/consent-tokens/route');
        expect((await POST(post('https://example.test/api/employee/consent-tokens', { patientName: 'Jan', consentTypes: ['rodo'], prodentisPatientId: '../x' }))).status).toBe(400);
        expect(wstawione).toHaveLength(0);
    });

    it('🔴 wystawienie linku do zgód zostawia ŚLAD w audycie (RODO art. 30)', async () => {
        const { POST } = await import('@/app/api/employee/consent-tokens/route');
        await POST(post('https://example.test/api/employee/consent-tokens', { patientName: 'Jan', consentTypes: ['rodo'], prodentisPatientId: '0100001110' }));
        expect(wpisyAudytu.length).toBeGreaterThan(0);
    });

    it('🔑 kolumna `created_by` przestaje być pusta — wiadomo, kto wystawił link', async () => {
        const { POST } = await import('@/app/api/employee/consent-tokens/route');
        await POST(post('https://example.test/api/employee/consent-tokens', { patientName: 'Jan', consentTypes: ['rodo'] }));
        expect(wstawione[0]?.created_by).toBe('pracownik@example.test');
    });
});
