/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK PODPISU Z E-KARTY — domknięcie P-095 (druga trasa z tej samej pary).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /api/employee/patient-intake?prodentisId=…` oddawało
 * `signatureData` — obraz podpisu pacjenta z e-Karty — BEZWARUNKOWO, w każdej odpowiedzi.
 * Panel woła tę trasę przy KAŻDYM otwarciu szczegółu wizyty, w tym samym `Promise.all`
 * co zgody, a sekcję z podpisem renderuje warunkowo. Obraz jechał więc zawsze, także
 * wtedy, gdy nikt na niego nie patrzył.
 *
 * 🪤 P-095 zamknęło to dla ZGÓD i zostawiło e-Kartę: ta sama klasa danych, to samo
 * uwierzytelnienie, ta sama reguła — tylko druga trasa. Trasa sama liczy obok
 * `hasSignature: !!piiDecrypted?.signature_data`, więc bramka „czy jest podpis"
 * istniała i nie była wykorzystana do minimalizacji.
 *
 * 🔑 Apka personelu tej trasy NIE woła (zmierzone), więc zmiana nie dotyka binarek.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć bezwarunkowe `signatureData` → pada pierwszy test.
 *
 * Uruchomienie: `npx vitest run patientIntakeSignature`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const PODPIS = 'data:image/png;base64,PODPIS-PACJENTA-Z-EKARTY';

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
    requireAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));
vi.mock('@/lib/encryptedPiiFields', () => ({
    readIntakeSubmissionPii: () => ({ signature_data: PODPIS }),
    readPatientConsentPii: () => ({ signature_data: PODPIS, biometric_data: null }),
}));

const WIERSZ = {
    id: 'intake-1',
    first_name: 'Jan',
    last_name: 'Demo',
    pdf_url: 'https://example.test/ekarta.pdf',
    submitted_at: '2026-09-01T10:00:00.000Z',
};

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'in', 'order', 'limit', 'is', 'neq', 'gte', 'lte']) q[m] = () => q;
    q.single = async () => ({ data: { ...WIERSZ }, error: null });
    q.maybeSingle = async () => q.single();
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [{ ...WIERSZ }], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const req = (qs: string) => new NextRequest(`https://example.test/api/employee/patient-intake${qs}`);

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('patient-intake · obraz podpisu wyłącznie na żądanie', () => {
    it('🔴 SEDNO: domyślnie odpowiedź NIE niesie obrazu podpisu', async () => {
        const { GET } = await import('@/app/api/employee/patient-intake/route');
        const body = await (await GET(req('?prodentisId=0100001110'))).json();

        expect(JSON.stringify(body)).not.toContain('PODPIS-PACJENTA-Z-EKARTY');
        // Kontrola pozytywna: trasa nadal MÓWI, że podpis istnieje — panel po tym
        // rozpoznaje, czy w ogóle pokazać sekcję.
        expect(body.intake?.hasSignature).toBe(true);
    });

    it('panel dostaje obraz na żądanie: ?includeSignature=1', async () => {
        const { GET } = await import('@/app/api/employee/patient-intake/route');
        const body = await (await GET(req('?prodentisId=0100001110&includeSignature=1'))).json();
        expect(body.intake?.signatureData).toContain('PODPIS-PACJENTA-Z-EKARTY');
    });

    it('pola, z których żyje panel, zostają nietknięte', async () => {
        const { GET } = await import('@/app/api/employee/patient-intake/route');
        const body = await (await GET(req('?prodentisId=0100001110'))).json();

        expect(body.intake.id).toBe('intake-1');
        expect(body.intake.firstName).toBe('Jan');
        expect(body.intake.pdfUrl).toBe('https://example.test/ekarta.pdf');
    });

    it('🔴 druga połowa kontraktu: panel prosi o obraz', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('src/app/pracownik/components/ScheduleTab.tsx', 'utf8');

        // Kontrola pozytywna: panel nadal renderuje ten podpis.
        expect(zrodlo).toContain('src={patientSignature}');

        expect(zrodlo).toMatch(/patient-intake\?prodentisId=\$\{[^}]+\}&includeSignature=1/);
    });
});
