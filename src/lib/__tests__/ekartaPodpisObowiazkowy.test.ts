/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK: e-KARTA BEZ PODPISU NIE JEST PRZYJMOWANA (`POST /api/intake/submit`).
 *
 * 🔴 CO BYŁO ZEPSUTE. Zmierzone na produkcji 17.09.2026: 51 z 399 e-Kart trafiło do dokumentacji
 * i do Prodentisa BEZ podpisu (we wrześniu 8 z 42). Strona pozwalała wysłać kartę z pustym polem,
 * a trasa zapisywała `signature_data: null` bez słowa. Decyzja właściciela: podpis obowiązkowy.
 *
 * 🔑 Strona od 17.09 nie wyśle karty bez podpisu obejrzanego na podglądzie. Ta bramka łapie starą,
 * zbuforowaną wersję strony na tablecie — i stoi PRZED jakimkolwiek zapisem, więc token NIE jest
 * zużywany: pacjent podpisuje się i wysyła ponownie tym samym linkiem.
 *
 * Strażnik WYKONUJE prawdziwy handler i patrzy na skutki (zapis, zużycie tokenu, wywołania PMS).
 * DOWÓD, ŻE GRYZIE (cofka): usuń bramkę z trasy → padają testy braku i pustego obrazu; zamień ocenę
 * obrazu na samą kontrolę formatu → pada test PUSTEGO obrazu.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import sharp from 'sharp';

// Prawdziwe obrazy PNG, jak z płótna: przezroczyste tło, podpis = piksele z kryciem.
let PNG = '';
let PUSTY_PNG = '';
const naDataUrl = (b: Buffer) => 'data:image/png;base64,' + b.toString('base64');
beforeAll(async () => {
    const W = 60, H = 20;
    const surowe = Buffer.alloc(W * H * 4); // wszystko przezroczyste
    PUSTY_PNG = naDataUrl(await sharp(surowe, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
    const zTuszem = Buffer.from(surowe);
    for (let x = 10; x < 40; x++) { const i = (10 * W + x) * 4; zTuszem[i + 2] = 248; zTuszem[i + 3] = 255; }
    PNG = naDataUrl(await sharp(zTuszem, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
});

const zapisy: Array<{ tabela: string; op: string; dane?: any }> = [];
let tokenWazny = true;

function builder(tabela: string): any {
    const q: any = {};
    let op = 'select';
    let dane: any;
    for (const m of ['eq', 'is', 'order', 'limit', 'neq', 'gte', 'lte', 'in']) q[m] = () => q;
    q.select = () => q;
    q.insert = (d: any) => { op = 'insert'; dane = d; zapisy.push({ tabela, op, dane: d }); return q; };
    q.update = (d: any) => { op = 'update'; dane = d; zapisy.push({ tabela, op, dane: d }); return q; };
    q.single = async () => {
        if (tabela === 'patient_intake_tokens' && op === 'select') {
            return tokenWazny
                ? { data: { id: 'tok-1', token: 't', prodentis_patient_id: '0100000001', expires_at: new Date(Date.now() + 3_600_000).toISOString() }, error: null }
                : { data: null, error: { message: 'no rows' } };
        }
        if (tabela === 'patient_intake_submissions' && op === 'insert') return { data: { id: 'sub-1' }, error: null };
        return { data: null, error: null }; // odczyt pełnego zgłoszenia → brak → PDF pominięty
    };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: dane ?? null, error: null }).then(res);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => builder(t), storage: { from: () => ({}) } }),
}));
vi.mock('@/app/api/intake/generate-pdf/route', () => ({ generateEKartaPdf: async () => new Uint8Array() }));
vi.mock('@/lib/privateStorage', () => ({ storagePathsReady: async () => false }));
vi.mock('@/lib/encryptedPiiFields', () => ({
    prepareIntakeSubmissionInsert: (x: any) => ({ ...x }),
}));
const prodentisFetch = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
vi.mock('@/lib/prodentisFetch', () => ({ prodentisFetch: (...a: any[]) => (prodentisFetch as any)(...a) }));

const wyslij = async (formData: Record<string, unknown>) => {
    const { POST } = await import('@/app/api/intake/submit/route');
    const res = await POST(new Request('https://example.test/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 't', formData: { firstName: 'Jan', lastName: 'Demo', rodoConsent: true, medicalSurvey: {}, ...formData } }),
    }));
    return { status: res.status, body: await res.json() };
};

beforeEach(() => {
    zapisy.length = 0;
    tokenWazny = true;
    prodentisFetch.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('intake/submit · podpis obowiązkowy', () => {
    it('🔴 SEDNO: karta bez podpisu → 400, nic nie zapisane, token NIEzużyty, zero wywołań PMS', async () => {
        const { status, body } = await wyslij({ signatureData: '' });
        expect(status).toBe(400);
        expect(body.error).toMatch(/Brak podpisu/);
        expect(zapisy).toEqual([]);
        expect(prodentisFetch).not.toHaveBeenCalled();
    });

    it('🔴 PUSTY obraz płótna (stara strona zapisywała go przy samym dotknięciu) → 400, nic nie zapisane (przegląd 17.09)', async () => {
        const { status, body } = await wyslij({ signatureData: PUSTY_PNG });
        expect(status).toBe(400);
        expect(body.error).toMatch(/Brak podpisu/);
        expect(zapisy).toEqual([]);
        expect(prodentisFetch).not.toHaveBeenCalled();
    });

    it('brak pola, sam prefiks, obraz nie-PNG i śmieci z prefiksem PNG też są odrzucane', async () => {
        for (const signatureData of [undefined, null, 'data:image/png;base64,', 'data:image/svg+xml;base64,PHN2Zz4=', 12345, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', 'data:image/png;base64,PHN2Zz48L3N2Zz4=']) {
            zapisy.length = 0;
            const { status } = await wyslij({ signatureData });
            expect(status).toBe(400);
            expect(zapisy).toEqual([]);
        }
    });

    it('stara strona bez podglądu wysyłająca pustą kartę nie zużywa linku — ponowna wysyłka z podpisem przechodzi', async () => {
        expect((await wyslij({ signatureData: '' })).status).toBe(400);
        const ok = await wyslij({ signatureData: PNG });
        expect(ok.status).toBe(200);
    });

    it('kontrola pozytywna: karta z podpisem PNG jest zapisana z tym obrazem, a token zużyty', async () => {
        const { status, body } = await wyslij({ signatureData: PNG });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        const insert = zapisy.find((z) => z.tabela === 'patient_intake_submissions' && z.op === 'insert');
        expect(insert?.dane.signature_data).toBe(PNG);
        expect(zapisy.some((z) => z.tabela === 'patient_intake_tokens' && z.op === 'update' && z.dane.used_at)).toBe(true);
    });

    it('zużyty albo nieważny link dostaje SWÓJ komunikat (410), nie „brak podpisu"', async () => {
        tokenWazny = false;
        const { status } = await wyslij({ signatureData: '' });
        expect(status).toBe(410);
    });
});
