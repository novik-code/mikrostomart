/**
 * Strażnik okablowania: zapis sekcji bazy wiedzy MUSI docierać do tabeli
 * `ai_knowledge_base`, a nie ginąć po drodze.
 *
 * 🔴 PO CO. Edytor bazy wiedzy w zakładce Poczta nie działał NIGDY, i to z dwóch
 * niezależnych powodów naraz — z których żaden nie wywalał typów, testów ani builda:
 *
 *  1. Na wejściu `PUT /api/employee/email-ai-config` stał BEZWARUNKOWY wartownik
 *     `if (!id) return 400 'Missing id'`, a gałąź `knowledge_base` kluczuje po
 *     `section` i żaden klient nie wysyłał `id`. Żądanie umierało ~50 linii przed
 *     kodem, który miał je obsłużyć.
 *  2. Nawet gdyby doszło dalej, zapis szedł do `site_settings.ai_knowledge_base`,
 *     a AI czyta z TABELI `ai_knowledge_base` (`loadKnowledgeBase` w `unifiedAI`).
 *
 * Ten test nie sprawdza działania Supabase — sprawdza rzeczy, których nie widać
 * w przeglądzie kodu: że wartownik nie zjada gałęzi, która go nie potrzebuje,
 * i że zapis celuje w tabelę, z której model naprawdę czyta.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROUTE = path.join(
    process.cwd(),
    'src/app/api/employee/email-ai-config/route.ts',
);

/** Klienci tej trasy — oba repo. Apka bywa niedostępna w CI, więc jest opcjonalna. */
const CLIENTS = [
    path.join(process.cwd(), 'src/app/pracownik/components/EmailTab.tsx'),
    path.join(process.env.HOME || '', 'mikrostomart-app/src/lib/api.ts'),
];

function putBody(src: string): string {
    const i = src.indexOf('export async function PUT');
    expect(i, 'trasa musi mieć handler PUT').toBeGreaterThan(-1);
    const j = src.indexOf('export async function DELETE', i);
    return src.slice(i, j > -1 ? j : undefined);
}

describe('okablowanie zapisu bazy wiedzy', () => {
    const src = fs.readFileSync(ROUTE, 'utf8');
    const put = putBody(src);

    it('wartownik "Missing id" NIE blokuje gałęzi knowledge_base', () => {
        const guard = put.indexOf(`{ error: 'Missing id' }`);
        const branch = put.indexOf(`type === 'knowledge_base'`);
        expect(guard, 'wartownik id musi istnieć — rule/instruction go potrzebują').toBeGreaterThan(-1);
        expect(branch, 'gałąź knowledge_base musi istnieć').toBeGreaterThan(-1);

        // Albo gałąź stoi PRZED wartownikiem, albo wartownik jawnie ją wyłącza.
        const branchFirst = branch < guard;
        const guardExcludesKb = /if\s*\(\s*type\s*!==\s*['"]knowledge_base['"]\s*&&\s*!id\s*\)/.test(put)
            || /if\s*\(\s*!id\s*&&\s*type\s*!==\s*['"]knowledge_base['"]\s*\)/.test(put);

        expect(
            branchFirst || guardExcludesKb,
            'PUT odrzuca zapis bazy wiedzy z "Missing id" — gałąź knowledge_base jest nieosiągalna',
        ).toBe(true);
    });

    it('zapis celuje w TABELĘ ai_knowledge_base, nie w site_settings', () => {
        const branch = put.slice(put.indexOf(`type === 'knowledge_base'`));
        expect(branch).toContain(`.from('ai_knowledge_base')`);
        expect(
            branch.includes(`'site_settings'`),
            'site_settings to ślepa uliczka — getKnowledgeBase() nie ma wywołań w repo',
        ).toBe(false);
    });

    it('zapis kluczuje po section i unieważnia cache bazy wiedzy', () => {
        const branch = put.slice(put.indexOf(`type === 'knowledge_base'`));
        expect(branch).toContain(`.eq('section', section)`);
        expect(branch).toContain('invalidateKBCache()');
    });

    it('klienci wysyłają section (a nie polegają na id)', () => {
        for (const file of CLIENTS) {
            if (!fs.existsSync(file)) continue; // apka bywa poza CI
            const client = fs.readFileSync(file, 'utf8');
            if (!client.includes(`'knowledge_base'`)) continue;
            const call = client.slice(client.indexOf(`type: 'knowledge_base'`));
            expect(call.slice(0, 200), `${path.basename(file)} musi wysyłać section`).toContain('section');
        }
    });
});
