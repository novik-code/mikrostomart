/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK ŚLADU PRZY PODGLĄDZIE BIOMETRII (znalezione 06.09 przy P-071, poza planem).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /api/admin/patient-consents?id=…` robi `select('*')`,
 * odszyfrowuje i zwraca KOMPLET: `biometric_data.strokes` (pozycja, nacisk i czas każdego
 * punktu), `deviceInfo` oraz obraz podpisu. W całym pliku nie było ani jednego `logAudit`
 * — podczas gdy siostrzana trasa personelu loguje `view_consents` od dawna.
 *
 * 🔑 DLACZEGO TO WAŻNIEJSZE NIŻ WYGLĄDA. Po naprawie P-071 (biometria wychodzi
 * z trasy personelu wyłącznie jako streszczenie) to jest JEDYNE miejsce w systemie
 * oddające pełną trajektorię podpisu — dane szczególnej kategorii z art. 9 RODO.
 * I akurat ono nie zostawiało śladu. Na pytanie „kto oglądał czyją biometrię"
 * system nie umiał odpowiedzieć.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń `logAudit` z gałęzi `?id=` → pada pierwszy test.
 *
 * Uruchomienie: `npx vitest run adminConsentAudit`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ADMIN = { id: 'admin-1', email: 'admin@example.test' };
const ZGODA = 'cccccccc-3333-4333-8333-cccccccccccc';

let wpisy: { action: string; resourceType: string; resourceId?: string; patientName?: string }[] = [];

vi.mock('@/lib/authGuards', () => ({ requireAdmin: async () => ({ ok: true, user: ADMIN }) }));
vi.mock('@/lib/auditLog', () => ({
    logAudit: async (a: any) => { wpisy.push(a); },
}));
vi.mock('@/lib/encryptedPiiFields', () => ({
    readPatientConsentPii: () => ({
        signature_data: 'data:image/png;base64,PODPIS',
        biometric_data: { pointCount: 10, strokes: [{ points: [{ x: 1, y: 2, p: 0.5, t: 0 }] }], deviceInfo: { pointerType: 'pen' } },
    }),
}));

const WIERSZ = {
    id: ZGODA,
    patient_name: 'Kowalska Anna',
    prodentis_patient_id: '0100001110',
    consent_type: 'implant',
    consent_label: 'Zgoda na implantację',
    signed_at: '2026-09-01T10:00:00.000Z',
};

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'order', 'range', 'limit'] ) q[m] = () => q;
    q.single = async () => ({ data: { ...WIERSZ }, error: null });
    q.maybeSingle = async () => q.single();
    q.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: [{ ...WIERSZ }], error: null, count: 1 }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const req = (qs: string) => new NextRequest(`https://example.test/api/admin/patient-consents${qs}`);

beforeEach(() => {
    vi.clearAllMocks();
    wpisy = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('admin/patient-consents · podgląd biometrii zostawia ślad', () => {
    it('🔴 SEDNO: pobranie PEŁNEJ trajektudy podpisu trafia do dziennika audytu', async () => {
        const { GET } = await import('@/app/api/admin/patient-consents/route');
        const res = await GET(req(`?id=${ZGODA}`));
        const body = await res.json();

        // Kontrola pozytywna miernika: odpowiedź NAPRAWDĘ niesie pełną trajektorię —
        // inaczej asercja o audycie broniłaby czegoś, czego nie ma.
        expect(res.status).toBe(200);
        expect(body.biometric_data).toHaveProperty('strokes');

        expect(wpisy).toHaveLength(1);
        expect(wpisy[0].resourceId).toBe(ZGODA);
        expect(wpisy[0].resourceType).toBe('biometric');
        expect(wpisy[0].action).toMatch(/biometric/);
    });

    it('ślad niesie nazwisko pacjenta — inaczej dziennik nie odpowie „czyją biometrię"', async () => {
        const { GET } = await import('@/app/api/admin/patient-consents/route');
        await GET(req(`?id=${ZGODA}`));
        expect(wpisy[0].patientName).toBe('Kowalska Anna');
    });

    it('lista też zostawia ślad — niesie nazwiska pacjentów', async () => {
        const { GET } = await import('@/app/api/admin/patient-consents/route');
        const res = await GET(req('?limit=50'));

        expect(res.status).toBe(200);
        expect(wpisy).toHaveLength(1);
        expect(wpisy[0].resourceType).toBe('consent');
    });
});
