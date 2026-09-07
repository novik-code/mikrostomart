/**
 * P-080 — KLUCZ KUBEŁKA LIMITU MUSI BYĆ TEN SAM DLA TEGO SAMEGO CZŁOWIEKA.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * Klucz limitu prób powstawał jako `phone.replace(/[\s-]/g, '')` (logowanie)
 * i `phone.replace(/\s/g, '')` (reset hasła) — czyli usuwał tylko spacje
 * i myślniki. Pacjenta natomiast szukamy przez `phoneLookupVariants`, która
 * zna postacie `+48…`, `0048…`, `48…` i gołe dziewięć cyfr.
 *
 * Skutek: `570810800`, `+48570810800`, `0048570810800` i `48570810800` to
 * TEN SAM pacjent, ale CZTERY RÓŻNE kubełki. Limit 5 prób na kwadrans mnożył
 * się przez liczbę zapisów numeru — bez żadnych przedwarunków, bez awarii,
 * bez znajomości czegokolwiek. Na resecie hasła jest gorzej niż na logowaniu:
 * `replace(/\s/g,'')` nie usuwa nawet myślnika, a nagrodą za obejście jest
 * zalewanie skrzynki pacjenta mailami resetującymi.
 *
 * Karta audytu P-080 tego NIE opisywała — mówiła wyłącznie o fail-open przy
 * awarii tabeli. Dziura z kluczem jest żywa niezależnie od awarii.
 *
 * ══ DLACZEGO WYKONANIEM ═════════════════════════════════════════════════════
 * Ten strażnik nie sprawdza, czy w pliku stoi słowo `phoneMatchKey`. Woła trasę
 * dwoma zapisami tego samego numeru i porównuje IDENTYFIKATOR, który trasa
 * realnie posłała do bazy. Asercja celuje w wartość przekazaną do zapytania,
 * nie w napis w źródle — asercja na nazwę świeciła w tym projekcie zielono
 * przy zdjętej ochronie trzy razy.
 *
 * ⚠️ Klucz WYSZUKANIA pacjenta zostaje nietknięty. `phoneLookupVariants` zawsze
 * zawiera surowe wejście, więc dopasowanie tylko się poszerza; przestawienie go
 * na postać kanoniczną mogłoby odciąć konto z numerem, którego nie da się
 * znormalizować (np. holenderskie „06 12 …”). Kanoniczny jest WYŁĄCZNIE kubełek.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Wszystko, co trasa posłała do bazy — do porównań między wywołaniami. */
type Zapis = { tabela: string; identifier?: string; success?: boolean };
let zapisy: Zapis[] = [];
let odczytaneIdentyfikatory: string[] = [];
let bladOdczytuLimitu = false;

/** Chainable atrapa PostgREST — zwraca samą siebie aż do await. */
function chain(wynik: () => { data: unknown; error: unknown; count?: number | null }) {
    const p: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(p, {
        get(_t, prop) {
            if (prop === 'then') {
                const r = wynik();
                return (res: (v: unknown) => void) => res(r);
            }
            return (...args: unknown[]) => {
                if (prop === 'eq' && args[0] === 'identifier') {
                    odczytaneIdentyfikatory.push(String(args[1]));
                }
                return proxy;
            };
        },
    });
    return proxy;
}

function makeSupabase() {
    return {
        from: (tabela: string) => {
            if (tabela === 'login_attempts') {
                return {
                    ...(chain(() => (bladOdczytuLimitu
                        ? { data: null, error: { code: '42P01', message: 'brak tabeli' }, count: null }
                        : { data: [], error: null, count: 0 })) as object),
                    select: (...a: unknown[]) => chain(() => (bladOdczytuLimitu
                        ? { data: null, error: { code: '42P01', message: 'brak tabeli' }, count: null }
                        : { data: [], error: null, count: 0 })),
                    insert: (row: Omit<Zapis, 'tabela'>) => {
                        zapisy.push({ ...row, tabela });
                        return chain(() => ({ data: null, error: null }));
                    },
                    delete: () => chain(() => ({ data: null, error: null })),
                };
            }
            // patients — zawsze „nie znaleziono", żeby trasa poszła ścieżką porażki
            return {
                select: () => chain(() => ({ data: null, error: { code: 'PGRST116' } })),
            };
        },
    };
}

let supabaseStub = makeSupabase();
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => supabaseStub.from(t) }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    zapisy = [];
    odczytaneIdentyfikatory = [];
    bladOdczytuLimitu = false;
    supabaseStub = makeSupabase();
    process.env.JWT_SECRET = 'x'.repeat(48);
});

async function login(numer: string) {
    const { POST } = await import('@/app/api/patients/login/route');
    const req = new Request('https://x/api/patients/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: numer, password: 'nieistotne' }),
    });
    return POST(req as never);
}

describe('P-080: warianty zapisu numeru trafiają do JEDNEGO kubełka', () => {
    const WARIANTY = ['570810800', '+48570810800', '0048570810800', '570-810-800', '570 810 800'];

    it('wszystkie zapisy tego samego numeru dają ten sam identyfikator kubełka', async () => {
        const klucze: string[] = [];
        for (const w of WARIANTY) {
            zapisy = [];
            await login(w);
            const zapis = zapisy.find(z => z.tabela === 'login_attempts' && z.identifier);
            expect(zapis, `wariant ${w} nie zapisał próby`).toBeTruthy();
            klucze.push(zapis!.identifier!);
        }
        expect(
            new Set(klucze).size,
            `warianty dały RÓŻNE kubełki: ${JSON.stringify(klucze)} — limit jest do obejścia`,
        ).toBe(1);
    });

    it('KONTROLA NEGATYWNA: dwa RÓŻNE numery mają różne kubełki', async () => {
        // Bez tego przypadku „naprawa" sprowadzająca wszystko do stałej też by przeszła.
        zapisy = [];
        await login('570810800');
        const a = zapisy.find(z => z.identifier)!.identifier;
        zapisy = [];
        await login('570810801');
        const b = zapisy.find(z => z.identifier)!.identifier;
        expect(a).not.toBe(b);
    });

    it('odczyt limitu pyta o TEN SAM klucz, którym zapisuje', async () => {
        // Rozjazd między kluczem odczytu a kluczem zapisu znaczyłby, że limit
        // nigdy nie widzi własnych wpisów — czyli nie istnieje.
        zapisy = [];
        odczytaneIdentyfikatory = [];
        await login('+48 570 810 800');
        const zapisany = zapisy.find(z => z.identifier)!.identifier!;
        expect(odczytaneIdentyfikatory).toContain(zapisany);
    });

    it('e-mail dalej działa jako identyfikator (bez zmiany zachowania)', async () => {
        zapisy = [];
        await login('Jan.Kowalski@Example.COM');
        const zapis = zapisy.find(z => z.identifier)!;
        expect(zapis.identifier).toBe('jan.kowalski@example.com');
    });
});

describe('P-080: awaria tabeli limitów nie może po cichu znosić limitu', () => {
    it('błąd odczytu kończy się odmową 503, nie wpuszczeniem', async () => {
        // Decyzja właściciela 07.09: fail-closed także na logowaniu.
        // Kod 503 (nie 429), bo to awaria po naszej stronie i jest przejściowa.
        bladOdczytuLimitu = true;
        const res = await login('570810800');
        expect(res.status).toBe(503);
    });
});
