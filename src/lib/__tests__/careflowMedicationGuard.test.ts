/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK BRAMKI LEKOWEJ W ZAPISIE PROTOKOŁU OPIEKI (P-097).
 *
 * 🔴 CO BYŁO ZEPSUTE. `PUT /api/employee/careflow/enrollments/[id]` zapisywało
 * `customMedications`, `followUpAppointments`, `patientName` i `patientPhone` bez
 * sprawdzenia typu i BEZ `validateMedicationIndexes` — którą `enroll` i `accept`
 * traktują jako bramkę KLINICZNĄ.
 *
 * 🔴 DLACZEGO TO NIE JEST WALIDACJA FORMULARZA. Kroki protokołu wskazują lek po
 * POZYCJI na liście (`medication_index`). Skrócona lista podmienia lek pod krokiem:
 * krok „Weź antybiotyk" dostaje ibuprofen. Ta lista jest pokazywana PACJENTOWI,
 * drukowana w PDF planu opieki, a przy przełożeniu wizyty `careflowLifecycle` używa jej
 * POZYCYJNIE do wstawienia nowych zadań. Nie-tablica dodatkowo wywraca ekran szczegółów
 * w strefie personelu apki (`.map` na `(staff)/careflow/[id].tsx`).
 *
 * 🪤 Funkcja żyła w DWÓCH kopiach (`enroll`, `accept`) i w żadnej z nich nie było PUT-a.
 * Wyniesiona do `lib/careflowMedications.ts` — trzecia kopia byłaby trzecim miejscem
 * do poprawienia przy następnej korekcie.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń wywołanie walidatora z PUT → padają dwa pierwsze testy.
 *
 * Uruchomienie: `npx vitest run careflowMedicationGuard`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateMedicationIndexes } from '@/lib/careflowMedications';

describe('P-097 · sama reguła', () => {
    const kroki = [{ medication_index: 0 }, { medication_index: 1 }];
    const szablon = ['Amoksycylina', 'Ibuprofen'];

    it('🔴 krótsza lista przy krokach wskazujących pozycje → błąd', () => {
        const blad = validateMedicationIndexes({ steps: kroki, templateMedications: szablon, overrideMedications: ['Ibuprofen'] });
        expect(blad).toBeTruthy();
        expect(blad).toContain('POZYCJI');
    });

    it('🔴 lista, która NIE jest tablicą → błąd', () => {
        expect(validateMedicationIndexes({ steps: kroki, templateMedications: szablon, overrideMedications: 'Ibuprofen' })).toBeTruthy();
        expect(validateMedicationIndexes({ steps: kroki, templateMedications: szablon, overrideMedications: { a: 1 } })).toBeTruthy();
    });

    it('podmiana NA TEJ SAMEJ POZYCJI przechodzi — to jest dozwolone', () => {
        expect(validateMedicationIndexes({ steps: kroki, templateMedications: szablon, overrideMedications: ['Amoksycylina 1g', 'Paracetamol'] })).toBeNull();
    });

    it('🪤 brak nadpisania (undefined) NIE jest błędem — zostaje lista szablonu', () => {
        expect(validateMedicationIndexes({ steps: kroki, templateMedications: szablon, overrideMedications: undefined })).toBeNull();
    });

    it('🔴 krok wskazujący pozycję spoza listy → błąd', () => {
        expect(validateMedicationIndexes({ steps: [{ medication_index: 5 }], templateMedications: szablon, overrideMedications: null })).toBeTruthy();
    });
});

// ── Okablowanie PUT ─────────────────────────────────────────────────────────

let zapisane: Record<string, unknown>[] = [];

// 🪤 PUT idzie przez `verifyAdmin` + `hasRole`, nie przez `authGuards` — bez tych dwóch
// atrap trasa wywalała się na 'headers was called outside a request scope' i WSZYSTKIE
// asercje padały na 500, czyli z niewłaściwego powodu.
vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
    requireAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));
vi.mock('@/lib/careflowLifecycle', () => ({
    cancelCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] }),
    rescheduleCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] }),
    findOpenEnrollments: async () => [],
}));

const ZAPIS = { id: 'enr-1', patient_name: 'Jan Demo', appointment_date: '2026-09-11', template_id: 'tpl-1', status: 'active' };
const SZABLON = { id: 'tpl-1', default_medications: ['Amoksycylina', 'Ibuprofen'] };
const KROKI = [{ medication_index: 0 }, { medication_index: 1 }];

function zapytanie(tabela: string): any {
    const q: any = {};
    for (const m of ['eq', 'in', 'order', 'limit', 'is', 'neq']) q[m] = () => q;
    q.select = () => q;
    q.single = async () => q.maybeSingle();
    q.maybeSingle = async () => {
        if (tabela === 'care_enrollments') return { data: { ...ZAPIS }, error: null };
        if (tabela === 'care_templates') return { data: { ...SZABLON }, error: null };
        return { data: null, error: null };
    };
    q.update = (p: Record<string, unknown>) => { zapisane.push(p); return q; };
    q.insert = () => { const r: any = { select: () => r, single: async () => ({ data: null, error: null }) }; r.then = (res: any) => Promise.resolve({ data: null, error: null }).then(res); return r; };
    q.delete = () => q;
    q.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: tabela === 'care_steps' ? KROKI : [], error: null, count: 3 }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

const req = (body: unknown) =>
    new NextRequest('https://example.test/api/employee/careflow/enrollments/enr-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
const par = { params: Promise.resolve({ id: 'enr-1' }) };

beforeEach(() => {
    vi.clearAllMocks();
    zapisane = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-097 · PUT przechodzi przez tę samą bramkę co enroll i accept', () => {
    it('🔴 SEDNO: skrócona lista leków → 400 z kodem znanym apce, ZERO zapisu', async () => {
        const { PUT } = await import('@/app/api/employee/careflow/enrollments/[id]/route');
        const res = await PUT(req({ customMedications: ['Ibuprofen'] }), par);

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.code).toBe('medication_list_mismatch');
        expect(zapisane).toHaveLength(0);
    });

    it('🔴 lista, która nie jest tablicą, nie trafia do bazy', async () => {
        const { PUT } = await import('@/app/api/employee/careflow/enrollments/[id]/route');
        const res = await PUT(req({ customMedications: 'Ibuprofen' }), par);

        expect(res.status).toBe(400);
        expect(zapisane).toHaveLength(0);
    });

    it('poprawna podmiana na tych samych pozycjach przechodzi i zapisuje', async () => {
        const { PUT } = await import('@/app/api/employee/careflow/enrollments/[id]/route');
        const res = await PUT(req({ customMedications: ['Amoksycylina 1g', 'Paracetamol'] }), par);

        expect(res.status).toBeLessThan(400);
        expect(zapisane.some(z => 'custom_medications' in z)).toBe(true);
    });

    it('🪤 pola tekstowe: nie-napis i przesadna długość odrzucane', async () => {
        const { PUT } = await import('@/app/api/employee/careflow/enrollments/[id]/route');
        expect((await PUT(req({ patientName: { a: 1 } }), par)).status).toBe(400);
        expect((await PUT(req({ patientPhone: 'x'.repeat(500) }), par)).status).toBe(400);
        expect(zapisane).toHaveLength(0);
    });

    it('🪤 lista wizyt kontrolnych też musi być tablicą', async () => {
        const { PUT } = await import('@/app/api/employee/careflow/enrollments/[id]/route');
        expect((await PUT(req({ followUpAppointments: 'jutro' }), par)).status).toBe(400);
        expect(zapisane).toHaveLength(0);
    });
});
