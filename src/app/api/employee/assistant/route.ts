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

        // Call OpenAI with function definitions
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages,
            ],
            tools: FUNCTIONS,
            tool_choice: 'auto',
            temperature: 0.6,
            max_tokens: 1000,
        });

        const responseMessage = completion.choices[0].message;

        // Check if the model wants to call a function
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];

            // Type guard: only handle 'function' type tool calls
            if (!('function' in toolCall)) {
                return NextResponse.json({ reply: 'Nieobsługiwany typ narzędzia', action: null });
            }

            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`[Assistant] Function call: ${functionName}`, functionArgs);

            // Execute the action
            const actionResult = await executeAction(
                functionName,
                functionArgs,
                user.id,
                user.email || ''
            );

            // Get a follow-up response from the model with the function result
            const followUp = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages,
                    responseMessage as any,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(actionResult),
                    },
                ],
                temperature: 0.4,
                max_tokens: 500,
            });

            const finalReply = followUp.choices[0].message.content;

            return NextResponse.json({
                reply: finalReply,
                action: {
                    name: functionName,
                    args: functionArgs,
                    result: actionResult,
                },
            });
        }

        // No function call — just a text response (clarification, greeting, etc.)
        return NextResponse.json({
            reply: responseMessage.content,
            action: null,
        });
    } catch (error: any) {
        console.error('[Assistant] Error:', error);
        return NextResponse.json({ error: 'Wystąpił błąd asystenta' }, { status: 500 });
    }
}
