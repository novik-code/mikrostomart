/**
 * Strażnik: każdy cron z `vercel.json` musi meldować się w rejestrze zdrowia.
 *
 * 🔑 Po co (2026-09-05). `/api/health` pokazywał **11 z 21 cronów jako „milczące"**, w tym
 * siedem z komunikatem „Awaiting first monitored run" i datą zasiewu z marca. Żaden z nich
 * nie był zepsuty — po prostu **nie wołały `logCronHeartbeat` ANI RAZU**. Rejestr odpowiadał
 * więc „nie wiem", a wyglądało to jak awaria, przez pół roku.
 *
 * 🪤 To jest odsłona reguły, którą sami zapisaliśmy przy `careflow_task`: **alarm o ciszy ma
 * sens tylko dla ścieżek, które mają się odzywać.** Tam zmieniliśmy pytanie; tu brakowało
 * odpowiadającego. Oba warianty wyglądają na ekranie identycznie.
 *
 * 🪤 Sprawdzamy DWA kierunki, nie jeden: sukces i błąd. Cron, który melduje się wyłącznie po
 * udanym przebiegu, zamienia awarię w ciszę — a cisza jest u nas nieodróżnialna od „nie było
 * czego robić". To rodzina „jeden kod błędu na dwie przyczyny".
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const KORZEN = process.cwd();

/** Nazwy cronów z `vercel.json`, bez parametrów zapytania i bez powtórzeń. */
function cronyZKonfiguracji(): string[] {
    const v = JSON.parse(readFileSync(join(KORZEN, 'vercel.json'), 'utf8')) as {
        crons?: Array<{ path: string }>;
    };
    const nazwy = (v.crons ?? [])
        .map(c => c.path.split('?')[0])
        .filter(p => p.startsWith('/api/cron/'))
        .map(p => p.replace('/api/cron/', ''));
    return [...new Set(nazwy)];
}

const CRONY = cronyZKonfiguracji();

/**
 * Wyciąga ARGUMENTY każdego wywołania `logCronHeartbeat(...)` — z liczeniem nawiasów, nie regexem.
 *
 * 🪤 Pierwsza wersja tego strażnika szukała literału `'error'` na drugiej pozycji i zapaliła się
 * na `data-retention-cleanup`, który raportuje błędy poprawnie, tylko przez wyrażenie warunkowe
 * (`errors.length > 0 ? 'error' : 'ok'`). Fałszywy alarm we WŁASNYM mierniku — ten sam błąd,
 * przed którym strażnik ma chronić. Pytanie brzmi „czy ta ścieżka umie zgłosić błąd", a nie
 * „czy stoi tam dokładnie taki napis".
 */
function wywolaniaMeldunku(txt: string): string[] {
    const out: string[] = [];
    const IGLA = 'logCronHeartbeat(';
    let i = txt.indexOf(IGLA);
    while (i !== -1) {
        let gl = 0;
        let j = i + IGLA.length - 1;
        for (; j < txt.length; j++) {
            if (txt[j] === '(') gl++;
            else if (txt[j] === ')') { gl--; if (gl === 0) break; }
        }
        out.push(txt.slice(i + IGLA.length, j));
        i = txt.indexOf(IGLA, j);
    }
    return out;
}

/**
 * ⚪ Świadome wyjątki. Trasa pomocnicza, która sama JEST rejestrem — meldowanie się do siebie
 * dałoby zieloną lampkę niezależnie od stanu reszty.
 */
const BEZ_MELDUNKU = ['push-health-alert'];

/**
 * 🔴 DŁUG, NIE ZWOLNIENIE (stan na 2026-09-05). Te crony też nie meldują się w ogóle —
 * i dlatego `/api/health` ich NIE POKAZUJE nawet jako milczących: nie mają wiersza w rejestrze,
 * więc są niewidzialne, a nie „stale". Gorszy stan niż tamte jedenaście.
 *
 * Nie dopisujemy meldunków hurtem w jednym przebiegu: to żywe crony kliniki o bardzo różnym
 * kształcie (od 40 do 900 linii, część bez zewnętrznego `try`), a ślepe łatanie dziewięciu
 * plików naraz to prosta droga do regresji w kodzie, który realnie coś wysyła.
 *
 * ⚪ `careflow-push` został z tej listy ZDJĘTY 05.09 i uzbrojony — to on wysyła pacjentom
 *    przypomnienia o lekach po zabiegu i jego cisza kosztowałaby najwięcej.
 * 🪤 Lista ma tylko MALEĆ. Nowy cron bez meldunku ma zapalić strażnika, nie dopisać się tutaj.
 */
const DLUG_BEZ_MELDUNKU = [
    'careflow-auto-qualify',
    'careflow-report',
    'audit-log-cleanup',
    'youtube-sync',
    'video-process',
    'social-generate',
    'social-publish',
    'social-comments',
];

describe('okablowanie rejestru zdrowia cronów', () => {
    it('konfiguracja w ogóle się czyta (kontrola miernika)', () => {
        expect(CRONY.length).toBeGreaterThan(10);
        expect(CRONY).toContain('push-cleanup');
    });

    it('🔴 każdy cron melduje się po UDANYM przebiegu', () => {
        const niemi: string[] = [];
        for (const c of CRONY) {
            if (BEZ_MELDUNKU.includes(c) || DLUG_BEZ_MELDUNKU.includes(c)) continue;
            const p = join(KORZEN, 'src/app/api/cron', c, 'route.ts');
            if (!existsSync(p)) continue;   // trasa mogła zniknąć — to inny problem niż cisza
            const txt = readFileSync(p, 'utf8');
            const maOk = wywolaniaMeldunku(txt).some(w => /['"](ok|warn)['"]/.test(w));
            if (!maOk) niemi.push(c);
        }
        expect(niemi).toEqual([]);
    });

    it('🔴 każdy cron melduje się także po BŁĘDZIE — inaczej awaria zamienia się w ciszę', () => {
        const niemi: string[] = [];
        for (const c of CRONY) {
            if (BEZ_MELDUNKU.includes(c) || DLUG_BEZ_MELDUNKU.includes(c)) continue;
            const p = join(KORZEN, 'src/app/api/cron', c, 'route.ts');
            if (!existsSync(p)) continue;
            const txt = readFileSync(p, 'utf8');
            const maErr = wywolaniaMeldunku(txt).some(w => /['"]error['"]/.test(w));
            if (!maErr) niemi.push(c);
        }
        expect(niemi).toEqual([]);
    });

    it('🪤 nazwa w meldunku zgadza się z nazwą trasy — inaczej rejestr opisuje nie ten cron', () => {
        const rozjazdy: string[] = [];
        for (const c of CRONY) {
            const p = join(KORZEN, 'src/app/api/cron', c, 'route.ts');
            if (!existsSync(p)) continue;
            const uzyte = wywolaniaMeldunku(readFileSync(p, 'utf8'))
                .map(w => w.match(/^\s*['"]([^'"]+)['"]/)?.[1])
                .filter((x): x is string => !!x);
            for (const u of new Set(uzyte)) if (u !== c) rozjazdy.push(`${c} → ${u}`);
        }
        expect(rozjazdy).toEqual([]);
    });

    it('🪤 lista długu ma MALEĆ — nowy cron bez meldunku zapala strażnika, nie dopisuje się', () => {
        // Gdy któryś zostanie uzbrojony, ten test przypomni o zdjęciu go z listy.
        const juzUzbrojone = DLUG_BEZ_MELDUNKU.filter(c => {
            const p = join(KORZEN, 'src/app/api/cron', c, 'route.ts');
            return existsSync(p) && /logCronHeartbeat\(/.test(readFileSync(p, 'utf8'));
        });
        expect(juzUzbrojone).toEqual([]);
        expect(DLUG_BEZ_MELDUNKU.length).toBeLessThanOrEqual(8);
    });

    it('DOWÓD COFKI: asercje łapią dokładnie kształt sprzed naprawy', () => {
        // `push-cleanup` do 05.09.2026 wyglądał dokładnie tak — zero meldunków.
        const przed = "export async function GET(req: NextRequest) {\n    return NextResponse.json({ deleted: 0 });\n}";
        expect(/logCronHeartbeat\(\s*['"][^'"]+['"]\s*,\s*['"](ok|warn)['"]/.test(przed)).toBe(false);
        expect(/logCronHeartbeat\(\s*['"][^'"]+['"]\s*,\s*['"]error['"]/.test(przed)).toBe(false);

        expect(wywolaniaMeldunku(przed)).toEqual([]);

        // Meldunek wyłącznie po sukcesie przechodzi pierwszą asercję i pada na drugiej —
        // to jest ta połowiczna naprawa, przed którą strażnik ma chronić.
        const polowicznie = "await logCronHeartbeat('push-cleanup', 'ok', 'zrobione', 1);";
        expect(wywolaniaMeldunku(polowicznie).some(w => /['"](ok|warn)['"]/.test(w))).toBe(true);
        expect(wywolaniaMeldunku(polowicznie).some(w => /['"]error['"]/.test(w))).toBe(false);

        // 🪤 Status LICZONY też się liczy — na tym miernik potknął się przy pierwszym uruchomieniu.
        const warunkowo = "await logCronHeartbeat('x', errors.length > 0 ? 'error' : 'ok', s, 1);";
        expect(wywolaniaMeldunku(warunkowo).some(w => /['"]error['"]/.test(w))).toBe(true);
    });
});
