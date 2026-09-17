/**
 * STRAŻNIK: service worker nie trzyma odpowiedzi API w pamięci i trafia w precache mimo `?dpl=`.
 *
 * ══ CO BYŁO ZEPSUTE (przegląd 2026-09-17, po naprawie instalacji workera) ══════
 *  1) `defaultCache` z @serwist/next ma regułę `apis`: GET `/api/*` → NetworkFirst, 24 h,
 *     po 10 s stara kopia. Dane zalogowanych trafiały do Cache Storage, a przyciski panelu
 *     wołające GET dostawały starą odpowiedź, choć serwer dalej pracował.
 *  2) Reguła `staff-pages` łapała `/api/admin/*`.
 *  3) Vercel dokleja `?dpl=` do plików `/_next/static`, więc precache nigdy nie trafiał.
 *
 * Test WYKONUJE pełną listę reguł z `opcjeSerwista()` (tę samą, którą dostaje `new Serwist`
 * w `sw.ts`) według semantyki Serwista: pierwsza pasująca wygrywa, RegExp sprawdza `url.href`
 * (dla obcej domeny tylko dopasowanie od początku), funkcja dostaje `{ url, request, sameOrigin }`.
 * DOWÓD, ŻE GRYZIE (cofka): bez reguły NetworkOnly dla `/api/*` → 🔴 „API”; stary regex
 * staff-pages → 🔴 „/api/admin”; bez `dpl` na liście → 🔴 „dpl”.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { RuntimeCaching, SerwistOptions } from 'serwist';

// 🪤 `defaultCache` poza produkcją to JEDNA reguła „wszystko NetworkOnly”. Pod vitestem
// (NODE_ENV=test) testy API przechodziłyby na pusto — wykryła to kontrola miernika.
// Moduły ładujemy dopiero po ustawieniu NODE_ENV=production.
let NetworkFirst: typeof import('serwist').NetworkFirst;
let NetworkOnly: typeof import('serwist').NetworkOnly;
let defaultCache: RuntimeCaching[];
let opcje: SerwistOptions;
let reguly: RuntimeCaching[];

beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    ({ NetworkFirst, NetworkOnly } = await import('serwist'));
    ({ defaultCache } = await import('@serwist/next/worker'));
    const { opcjeSerwista } = await import('@/lib/swOpcje');
    opcje = opcjeSerwista([]);
    reguly = opcje.runtimeCaching!;
});

const ORIGIN = 'https://www.mikrostomart.pl';

function pierwszaRegula(reguly: RuntimeCaching[], href: string, tryb: RequestMode = 'cors'): RuntimeCaching | undefined {
    const url = new URL(href);
    const sameOrigin = url.origin === ORIGIN;
    const request = { mode: tryb, method: 'GET', headers: new Headers(), url: href } as unknown as Request;
    return reguly.find((r) => {
        const m = r.matcher;
        if (m instanceof RegExp) {
            const wynik = m.exec(url.href);
            return !!wynik && (sameOrigin || wynik.index === 0);
        }
        if (typeof m === 'function') return !!m({ url, request, sameOrigin, event: {} as ExtendableEvent });
        return false;
    });
}

const nazwaPamieci = (r?: RuntimeCaching) => (r?.handler as { cacheName?: string } | undefined)?.cacheName;

describe('service worker · API nigdy z pamięci', () => {
    it('KONTROLA MIERNIKA: produkcyjny defaultCache kieruje /api/* do pamięci „apis” (NetworkFirst)', () => {
        expect(defaultCache.length).toBeGreaterThan(10);
        const r = pierwszaRegula(defaultCache, `${ORIGIN}/api/patients/me`);
        expect(r?.handler).toBeInstanceOf(NetworkFirst);
        expect(nazwaPamieci(r)).toBe('apis');
    });

    it.each([
        '/api/patients/me',
        '/api/employee/schedule?date=2026-09-17',
        '/api/admin/employees',
        '/api/cron/post-visit-sms?manual=true',
        '/api/auth/2fa/status',
    ])('🔴 API: %s → NetworkOnly', (sciezka) => {
        expect(pierwszaRegula(reguly, `${ORIGIN}${sciezka}`)?.handler).toBeInstanceOf(NetworkOnly);
    });

    it('🔴 /api/admin nie trafia do staff-pages; strony personelu tak', () => {
        expect(nazwaPamieci(pierwszaRegula(reguly, `${ORIGIN}/api/admin/sms-reminders`))).not.toBe('staff-pages');
        expect(nazwaPamieci(pierwszaRegula(reguly, `${ORIGIN}/pracownik`, 'navigate'))).toBe('staff-pages');
        expect(nazwaPamieci(pierwszaRegula(reguly, `${ORIGIN}/admin/sms`, 'navigate'))).toBe('staff-pages');
        expect(nazwaPamieci(pierwszaRegula(reguly, `${ORIGIN}/pl/oferta`, 'navigate'))).not.toBe('staff-pages');
    });

    it('logowanie Supabase z innej domeny → NetworkOnly', () => {
        expect(pierwszaRegula(reguly, 'https://abc.supabase.co/auth/v1/token?grant_type=password')?.handler).toBeInstanceOf(NetworkOnly);
    });
});

describe('service worker · precache trafia mimo ?dpl=', () => {
    const ignorowany = (parametr: string) => (opcje.precacheOptions!.ignoreURLParametersMatching ?? []).some((w) => w.test(parametr));

    it('🔴 dpl jest ignorowany, zwykłe parametry nie', () => {
        expect(ignorowany('dpl')).toBe(true);
        expect(ignorowany('utm_source')).toBe(true);
        expect(ignorowany('v')).toBe(false);
        expect(ignorowany('dplx')).toBe(false);
    });

    it('stare pamięci precache są sprzątane', () => {
        expect(opcje.precacheOptions!.cleanupOutdatedCaches).toBe(true);
    });
});
