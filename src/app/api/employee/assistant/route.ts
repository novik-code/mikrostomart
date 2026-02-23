import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { executeAction } from '@/lib/assistantActions';

export const dynamic = 'force-dynamic';

// ─── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `Jesteś asystentem głosowym Mikrostomart — kliniki stomatologicznej w Opolu.
Mówisz po polsku. Jesteś rzeczowy, ciepły i naturalny — jak dobry współpracownik, nie robot.

TWOJE MOŻLIWOŚCI:
1. Tworzenie zadań (employee_tasks) — w tym zadań prywatnych (is_private=true)
2. Dodawanie wydarzeń do kalendarza Google (jeśli połączony)
3. Ustawianie przypomnień push
4. Dictowanie dokumentacji (redaguj i wyślij mailem)
5. Wyszukiwanie pacjentów w Prodentis
6. Sprawdzanie grafiku wizyt

FILOZOFIA DZIAŁANIA — BARDZO WAŻNE:
- NIE pytaj przed działaniem. DZIAŁAJ od razu, wywnioskowując brakujące dane z kontekstu.
- "Jutro na 16 mam fryzjera" → NATYCHMIAST createTask(title="Fryzjer", is_private=true, due_date=jutro, due_time="16:00") + addCalendarEvent
- "Zapisz że muszę zamówić protezy" → createTask(title="Zamówienie protez", task_type="Zamówienia") od razu
- Po wykonaniu akcji: powiedz CO zrobiłeś w 1-2 zdaniach, a następnie naturalnie zasugeruj CO JESZCZE można dodać bez pytania czy user tego chce
  Przykład: "Zapisałem fryzjera na jutro o 16. Jeśli chcesz, mogę jeszcze ustawić przypomnienie SMS albo dodać adres salonu."
- Gdy coś zostało zrobione z założeniem (np. tytuł wywnioskowałem) — powiedz to naturalnie
- Dla zadań klinicznych (laboratorium, zamówienia, recepcja) → is_private=false, task_type=odpowiedni
- Dla rzeczy prywatnych (fryzjer, dentysta, spotkanie z rodziną, itp.) → is_private=true, BRAK task_type

WNIOSKOWANIE DAT:
- "jutro" = ${(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
- "pojutrze" = ${(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0]; })()}
- "w przyszłym tygodniu" = ${(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })()}
- Godziny: "na 16" = 16:00, "o 9 rano" = 09:00, "po południu" = 14:00
- Strefa czasowa: Europe/Warsaw — ISO format: ${new Date().toISOString().split('T')[0]}T16:00:00+01:00

DZIŚ: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, godz. ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}

TYPY ZADAŃ KLINICZNYCH:
- Laboratorium, Zamówienia, Recepcja, Modele Archiwalne, Skanowanie, Inne

STYL ODPOWIEDZI:
- Krótko. Max 2-3 zdania.
- Naturalnie, jak człowiek. Bez listy kroków, bez formalizmu
- NIE zaczynaj od "Oczywiście!", "Jasne!", "Rozumiem!"
- Potwierdzaj co zrobiłeś, nie co "zamierzasz zrobić"`;

// ─── OpenAI Function Definitions ─────────────────────────────

const FUNCTIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'createTask',
            description: 'Utwórz zadanie w systemie. Dla zadań OSOBISTYCH (fryzjer, wizyta lekarska, spotkanie prywatne) ustaw is_private=true i NIE ustawiaj task_type. Dla zadań KLINICZNYCH (laboratorium, zamówienia) ustaw odpowiedni task_type i is_private=false. ZAWSZE wnioskuj tytuł z wypowiedzi — NIE pytaj o niego.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Tytuł zadania — wnioskuj z wypowiedzi, np. "fryzjer" → "Fryzjer", "protezy" → "Zamówienie protez". ZAWSZE podaj.' },
                    description: { type: 'string', description: 'Dodatkowe notatki do zadania' },
                    priority: { type: 'string', enum: ['low', 'normal', 'urgent'], description: 'Priorytet' },
                    task_type: { type: 'string', enum: ['Laboratorium', 'Zamówienia', 'Recepcja', 'Modele Archiwalne', 'Skanowanie', 'Inne'], description: 'Typ kliniczny — pomiń dla zadań prywatnych' },
                    patient_name: { type: 'string', description: 'Pacjent (jeśli kliniczne)' },
                    assigned_to_names: { type: 'array', items: { type: 'string' }, description: 'Przypisani pracownicy (pomiń dla prywatnych)' },
                    due_date: { type: 'string', description: 'Termin YYYY-MM-DD — wnioskuj z "jutro", "w piątek", "25 marca" itp.' },
                    due_time: { type: 'string', description: 'Godzina HH:MM — wnioskuj z "na 16", "o 9 rano" itp.' },
                    checklist_items: { type: 'array', items: { type: 'string' }, description: 'Checkboxy — dodaj sensowne kroki jeśli zadanie na to wskazuje' },
                    is_private: { type: 'boolean', description: 'true = zadanie prywatne (tylko dla właściciela). Ustaw true dla wszystkiego osobistego.' },
                },
                required: ['title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'addCalendarEvent',
            description: 'Dodaj wydarzenie do kalendarza Google pracownika. Używaj do spotkań biznesowych, kolacji, wydarzeń prywatnych itp.',
            parameters: {
                type: 'object',
                properties: {
                    summary: { type: 'string', description: 'Tytuł wydarzenia' },
                    description: { type: 'string', description: 'Opis wydarzenia' },
                    start: { type: 'string', description: 'Data i godzina rozpoczęcia w formacie ISO 8601 (np. 2026-02-20T14:00:00+01:00)' },
                    end: { type: 'string', description: 'Data i godzina zakończenia w formacie ISO 8601' },
                    all_day: { type: 'boolean', description: 'Czy wydarzenie całodniowe' },
                    location: { type: 'string', description: 'Lokalizacja wydarzenia' },
                },
                required: ['summary', 'start'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'addReminder',
            description: 'Ustaw przypomnienie w kalendarzu Google. Pracownik otrzyma powiadomienie push. Używaj gdy ktoś chce sobie o czymś przypomnieć.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Treść przypomnienia (np. "Kupić mleko", "Zadzwonić do laboratorium")' },
                    datetime: { type: 'string', description: 'Kiedy przypomnieć — data i godzina w formacie ISO 8601' },
                },
                required: ['text', 'datetime'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dictateDocumentation',
            description: 'Przetwórz podyktowany tekst do profesjonalnej dokumentacji i wyślij mailem. Używaj gdy ktoś dyktuje tekst do dokumentacji, notatki, raportu itp.',
            parameters: {
                type: 'object',
                properties: {
                    raw_text: { type: 'string', description: 'Surowy tekst podyktowany głosowo' },
                    subject: { type: 'string', description: 'Temat/tytuł dokumentu' },
                    recipient_email: { type: 'string', description: 'Adres email odbiorcy (domyślnie: email pracownika)' },
                },
                required: ['raw_text'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'searchPatient',
            description: 'Wyszukaj pacjenta w systemie Prodentis po imieniu lub nazwisku. Zwraca dane kontaktowe pacjenta.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Imię i/lub nazwisko pacjenta do wyszukania' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'checkSchedule',
            description: 'Sprawdź grafik wizyt na dany dzień z systemu Prodentis. Bez daty — pokazuje dzisiejszy grafik.',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: 'Data do sprawdzenia w formacie YYYY-MM-DD (domyślnie: dzisiaj)' },
                },
            },
        },
    },
];

// ─── API Handler ─────────────────────────────────────────────

export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Build full conversation context
        const conversationMessages: any[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
        ];

        // ─── Agentic loop ─────────────────────────────────────────────────
        // Execute tool calls until GPT returns a text reply (max 5 rounds).
        // This allows createTask + addCalendarEvent + addReminder all in one turn.
        const MAX_ROUNDS = 5;
        const executedActions: { name: string; args: Record<string, any>; result: any }[] = [];

        for (let round = 0; round < MAX_ROUNDS; round++) {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: conversationMessages,
                tools: FUNCTIONS,
                tool_choice: 'auto',
                temperature: 0.6,
                max_tokens: 1000,
            });

            const responseMessage = completion.choices[0].message;

            // No tool calls → GPT is done, return text reply
            if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
                return NextResponse.json({
                    reply: responseMessage.content || 'Gotowe.',
                    action: executedActions.length > 0 ? executedActions[executedActions.length - 1] : null,
                    actions: executedActions,
                });
            }

            // Add GPT's tool_calls response to conversation
            conversationMessages.push(responseMessage);

            // Execute ALL tool calls in this round
            for (const toolCall of responseMessage.tool_calls) {
                if (!('function' in toolCall)) continue;

                let functionArgs: Record<string, any> = {};
                try {
                    functionArgs = JSON.parse(toolCall.function.arguments);
                } catch {
                    functionArgs = {};
                }

                const functionName = toolCall.function.name;
                console.log(`[Assistant] Round ${round + 1}: ${functionName}`, JSON.stringify(functionArgs).substring(0, 200));

                const actionResult = await executeAction(functionName, functionArgs, user.id, user.email || '');
                executedActions.push({ name: functionName, args: functionArgs, result: actionResult });

                // Add tool result to conversation
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(actionResult),
                });
            }
            // Continue loop — GPT will now decide to call more tools or reply
        }

        // Max rounds reached — ask GPT to summarize
        const summary = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: conversationMessages,
            temperature: 0.5,
            max_tokens: 300,
        });

        return NextResponse.json({
            reply: summary.choices[0].message.content || 'Wykonano wszystkie akcje.',
            action: executedActions.length > 0 ? executedActions[executedActions.length - 1] : null,
            actions: executedActions,
        });

    } catch (error: any) {
        console.error('[Assistant] Error:', error);
        return NextResponse.json({ error: 'Wystąpił błąd asystenta', detail: error.message }, { status: 500 });
    }
}
