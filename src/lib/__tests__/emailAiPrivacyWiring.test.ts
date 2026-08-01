/**
 * Strażnik okablowania: KAŻDA trasa wysyłająca treść maila do OpenAI musi iść
 * przez `lib/emailAiPrivacy.ts`, a nie wkładać surowych wartości do promptu.
 *
 * 🔴 PO CO. Do 2026-08-01 obie ścieżki AI dla poczty wkładały do promptu treść
 * wiadomości i adres nadawcy w ORYGINALE. `lib/aiAnonymizer.ts` istniał od lipca,
 * ale wołał go wyłącznie asystent — reguła „żadnych danych wrażliwych do OpenAI"
 * obowiązywała w jednym miejscu, a w drugim nie.
 *
 * Ten test nie sprawdza jakości pseudonimizacji (od tego jest `emailAiPrivacy.test.ts`).
 * Sprawdza rzecz, której nie widać w przeglądzie kodu: że ktoś nie dołożył TRZECIEJ
 * trasy do OpenAI, znowu z `fullEmail.text` w środku — dokładnie tak, jak przy
 * push-first wróciła trzecia trasa wysyłki draftu.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src/app/api');

/** Trasy, które wysyłają TREŚĆ MAILA do modelu językowego. */
const MAIL_AI_ROUTES = [
    'employee/email-generate-reply/route.ts',
    'cron/email-ai-drafts/route.ts',
    // 🔴 Trzecia trasa, znaleziona przez ten test — z nazwy nie widać, że wysyła
    // treść do modelu: akcje `return_for_learning` i `learn_from_compose` proszą
    // GPT o wnioski, wkładając w prompt CAŁY draft odpowiedzi do pacjenta.
    'employee/email-drafts/route.ts',
];

/** Trasy budujące wiadomość dla modelu z pary „oryginał → poprawka", nie z maila. */
const LEARNING_ROUTES = ['employee/email-drafts/route.ts'];

/**
 * Surowe wyrażenia, których NIE WOLNO wstawiać do wiadomości dla modelu.
 * Każde z nich niesie tożsamość albo pełną treść korespondencji.
 */
const RAW_IN_PROMPT = [
    '${fullEmail.from.name}',
    '${fullEmail.from.address}',
    '${fullEmail.subject}',
    '${emailContent.substring',
    '${from || ',
    '${subject}',
    '${(emailBody || ',
];

function userMessageBlock(src: string): string {
    // Fragment od `role: 'user'` do końca obiektu wiadomości — tam ląduje treść maila.
    const i = src.indexOf("role: 'user'");
    expect(i, 'trasa musi budować wiadomość użytkownika dla modelu').toBeGreaterThan(-1);
    return src.slice(i, i + 900);
}

describe('okablowanie pseudonimizacji poczty', () => {
    for (const rel of MAIL_AI_ROUTES) {
        const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');

        it(`${rel} używa wspólnego modułu pseudonimizacji`, () => {
            expect(src).toContain("@/lib/emailAiPrivacy");
            expect(src).toContain(
                LEARNING_ROUTES.includes(rel) ? 'prepareLearningPairForModel' : 'prepareEmailForModel',
            );
            expect(src, 'bez odtwarzania człowiek zobaczy „Dzień dobry PACJENT_1"').toContain('restoreForHuman');
        });

        it(`${rel} nie wkłada surowej treści maila do promptu`, () => {
            if (LEARNING_ROUTES.includes(rel)) {
                // Tu prompt składa się z pary draftów, nie z maila.
                for (const raw of ['${draft.draft_html}', '${correctedHtml}', '${original_html}', '${corrected_html}']) {
                    expect(
                        src.includes(`content: \`ORYGINALNY (AI):\n${raw}`) || src.includes(`\n${raw}\n\nPOPRAWIONY`),
                        `prompt zawiera surowe ${raw} — draft niesie imię pacjenta i podpis`,
                    ).toBe(false);
                }
                expect(src).toMatch(/\$\{(learnPair|composePair)\.safe\./);
                return;
            }
            const block = userMessageBlock(src);
            for (const raw of RAW_IN_PROMPT) {
                expect(
                    block.includes(raw),
                    `wiadomość dla modelu zawiera surowe ${raw} — tożsamość pacjenta wychodzi do OpenAI`,
                ).toBe(false);
            }
            // Warunek POZYTYWNY: musi korzystać z przygotowanych wartości.
            expect(block).toMatch(/\$\{safe\.(fromName|subject|body)\}/);
        });
    }

    it('nie przybyła trzecia trasa wysyłająca maile do OpenAI poza modułem', () => {
        const found: string[] = [];
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (entry.name === 'route.ts') {
                    const src = fs.readFileSync(full, 'utf8');
                    // 🔑 Liczy się WYSYŁKA TREŚCI, nie samo dotknięcie OpenAI.
                    // `health/ai` woła `/v1/models` (lista modeli) i nic nie przesyła —
                    // bez tego zawężenia strażnik alarmował na kontroli zdrowia.
                    const wolaModel = src.includes('chat/completions');
                    // Heurystyka „ta trasa dotyka poczty": czyta wiadomości z IMAP-a
                    // albo zapisuje drafty mailowe.
                    const dotykaPoczty = src.includes('imapService')
                        || src.includes('email_ai_drafts')
                        || src.includes('getEmail(');
                    if (wolaModel && dotykaPoczty) found.push(path.relative(ROOT, full));
                }
            }
        };
        walk(ROOT);
        // Każda znaleziona trasa MUSI być na liście objętej strażnikiem wyżej.
        const nieobjete = found.filter(f => !MAIL_AI_ROUTES.includes(f));
        expect(
            nieobjete,
            `nowa trasa wysyła maile do OpenAI bez pseudonimizacji: ${nieobjete.join(', ')}`,
        ).toEqual([]);
    });
});
