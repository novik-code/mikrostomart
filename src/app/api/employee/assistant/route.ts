import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { executeAction } from '@/lib/assistantActions';

export const dynamic = 'force-dynamic';

// ─── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `Jesteś inteligentnym asystentem głosowym w klinice stomatologicznej "Mikrostomart" w Opolu.
Pomagasz pracownikom gabinetu w codziennych zadaniach. Komunikujesz się po polsku i jesteś zwięzły ale pomocny.

TWOJE MOŻLIWOŚCI:
1. **Tworzenie zadań** — tworzysz zadania w gabinetowym systemie Trello (employee_tasks)
2. **Kalendarz Google** — dodajesz wydarzenia i przypomnienia do kalendarza pracownika
3. **Przypomnienia** — ustawiasz przypomnienia z powiadomieniami push
4. **Dokumentacja** — przetwarzasz dyktowany tekst, redagujesz go i wysyłasz mailem
5. **Wyszukiwanie pacjentów** — szukasz pacjentów w systemie Prodentis
6. **Sprawdzanie grafiku** — pokazujesz dzisiejsze wizyty z systemu Prodentis

ZASADY:
- Jeśli brakuje Ci informacji do wykonania akcji, PYTAJ o doprecyzowanie (nie zgaduj)
- Dla zadań: WYMAGANY jest tytuł. Termin (due_date), priorytet, typ, pacjent, przypisani — opcjonalne ale warto zapytać
- Dla wydarzeń kalendarza: WYMAGANE są: tytuł (summary) i data/czas początkowy (start). Koniec — opcjonalny
- Dla przypomnień: WYMAGANE są: treść (text) i data/czas (datetime)
- Dla dokumentacji: WYMAGANY jest surowy tekst (raw_text). Temat i adres email — opcjonalne
- Daty podawaj w formacie ISO 8601 (np. 2026-02-20T14:00:00+01:00)
- Odpowiadaj KRÓTKO — pracownik jest w trakcie pracy
- Potwierdzaj wykonane akcje jednym zdaniem
- Dzisiejsza data: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
- Aktualna godzina: ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
- Strefa czasowa: Europe/Warsaw (UTC+1, letni UTC+2)

TYPY ZADAŃ W SYSTEMIE:
- Laboratorium — prace laboratoryjne (korony, protezy, modele)
- Zamówienia — zamówienia materiałów
- Recepcja — zadania recepcji
- Modele Archiwalne — archiwizacja modeli
- Skanowanie — skany/zdjęcia
- Inne — pozostałe

PRIORYTETY: low (niski), normal (normalny), urgent (pilny/wysoki)`;

// ─── OpenAI Function Definitions ─────────────────────────────

const FUNCTIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'createTask',
            description: 'Utwórz nowe zadanie w gabinetowym systemie zarządzania zadaniami (Trello). Używaj gdy pracownik chce dodać/stworzyć zadanie.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Tytuł zadania (krótki, opisowy)' },
                    description: { type: 'string', description: 'Szczegółowy opis zadania' },
                    priority: { type: 'string', enum: ['low', 'normal', 'urgent'], description: 'Priorytet zadania' },
                    task_type: { type: 'string', enum: ['Laboratorium', 'Zamówienia', 'Recepcja', 'Modele Archiwalne', 'Skanowanie', 'Inne'], description: 'Typ/kategoria zadania' },
                    patient_name: { type: 'string', description: 'Imię i nazwisko pacjenta (jeśli dotyczy)' },
                    assigned_to_names: { type: 'array', items: { type: 'string' }, description: 'Imiona/nazwiska pracowników do przypisania' },
                    due_date: { type: 'string', description: 'Termin realizacji w formacie YYYY-MM-DD' },
                    checklist_items: { type: 'array', items: { type: 'string' }, description: 'Punkty checklisty (opcjonalne)' },
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
            temperature: 0.4,
            max_tokens: 1000,
        });

        const responseMessage = completion.choices[0].message;

        // Check if the model wants to call a function
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
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
