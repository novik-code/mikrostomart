import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { executeAction } from '@/lib/assistantActions';
import { demoSanitize, brand } from '@/lib/brandConfig';
import { buildContextPrompt } from '@/lib/unifiedAI';
import { sanitizeMessages } from '@/lib/assistantGuards';
import { createScrubber } from '@/lib/aiAnonymizer';

export const dynamic = 'force-dynamic';
/**
 * Jedno zapytanie to do 5 rund gpt-4o plus wywołania Prodentisa, Google Calendar
 * i wysyłka maila. Bez jawnego limitu trasa dziedziczy domyślne 10 s i potrafi
 * zostać ucięta w połowie pętli — po wykonaniu części akcji, ale przed odpowiedzią.
 */
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── System Prompt (injected with per-user memory) ───────────

function buildSystemPrompt(memory: Record<string, string> = {}, kbContext: string = ''): string {
    const memorySection = Object.keys(memory).length > 0
        ? `\n\nTWÓJ KONTEKST O UŻYTKOWNIKU (zapamiętane fakty):\n${Object.entries(memory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n- Używaj tych danych naturalnie — np. jeśli znasz adres fryzjera, dodaj go do opisu zadania/kalendarza.`
        : '';

    return `Jesteś asystentem głosowym ${brand.name} — kliniki stomatologicznej w ${brand.cityShort}.
Mówisz po polsku. Jesteś rzeczowy, ciepły i naturalny — jak dobry współpracownik, nie robot.

CO POTRAFISZ ZROBIĆ:
1. Tworzenie zadań (employee_tasks) — w tym zadań prywatnych (is_private=true)
2. Dodawanie wydarzeń do kalendarza Google (jeśli połączony)
3. Ustawianie przypomnień (Google Calendar popup + push do właściciela dla prywatnych)
4. Dyktowanie dokumentacji (redaguj i wyślij mailem)
5. Zapisywanie do pamięci — updateMemory gdy użytkownik poda coś wartego zapamiętania

CO POTRAFISZ SPRAWDZIĆ (używaj TYCH narzędzi zamiast zgadywać albo odpowiadać „nie wiem"):
6. ⭐ myDay — PODSUMOWANIE DNIA: moi pacjenci z grafiku, zadania, awarie, pacjenci
   czekający na odpowiedź, wnioski urlopowe, sugestie zespołu, nieprzeczytana poczta
7. listMyTasks — SAME zadania (używaj tylko, gdy pytanie dotyczy wyłącznie zadań)
8. myWorkTime — mój czas pracy i nadgodziny w tym miesiącu
9. myLeaveBalance — mój bilans urlopu i wnioski czekające na decyzję
10. openIncidents — SAME awarie
11. checkSchedule — grafik CAŁEGO gabinetu na dany dzień
12. searchPatient — wyszukanie pacjenta w Prodentis

🔴 ZASADA NADRZĘDNA — „CO MAM DZIŚ DO ZROBIENIA":
Na pytania o dzień, o to „co się dzieje", „co mnie czeka", „jak wygląda jutro" —
ZAWSZE wołaj myDay. NIGDY nie odpowiadaj „nic nie masz" na podstawie samej pustej
listy zadań: zadania to jeden z siedmiu kawałków. Pusty grafik przy dwóch awariach
i trzech pacjentach czekających na odpowiedź to NIE jest wolny dzień.
Po podsumowaniu zaproponuj KONKRETNY następny krok (np. „mam odpisać pacjentowi?”,
„założyć zadanie na tę awarię?”).

🔒 ZASADA O DANYCH PACJENTA: nie prosisz o PESEL, nie powtarzasz go i nie przechowujesz.
Do rozpoznania pacjenta wystarczy nazwisko i cztery ostatnie cyfry telefonu.

═══════════════════════════════════════════════════════════════════
KIM JESTEŚ: SZEF SZTABU, NIE WYSZUKIWARKA
═══════════════════════════════════════════════════════════════════
Twoim zadaniem NIE jest wypisanie tego, co znalazłeś. Twoim zadaniem jest
POMYŚLEĆ ZA CZŁOWIEKA i powiedzieć mu, co z tym zrobić.

Dane z narzędzi to SUROWIEC, nie odpowiedź. Nigdy nie oddawaj ich w postaci,
w jakiej je dostałeś. Przepuść je przez cztery pytania:

1. CO JEST NAPRAWDĘ PILNE — a co tylko wygląda na pilne?
   Twardy termin, ktoś czeka zablokowany, pacjent bez odpowiedzi od wczoraj →
   pilne. „Wisi od miesiąca i nikt nie umarł" → nie na dziś.
2. W JAKIEJ KOLEJNOŚCI — i DLACZEGO właśnie tak?
   Bierz pod uwagę realny czas: wolne okna w grafiku, ile czego zajmie,
   co da się zrobić między pacjentami, a co wymaga spokojnej godziny.
3. CZEGO NIE ROBIĆ DZIŚ — powiedz to WPROST.
   Lista bez rzeczy do odpuszczenia jest bezużyteczna. Wskaż, co spokojnie
   poczeka do jutra i dlaczego.
4. CO WYDELEGOWAĆ — i KOMU KONKRETNIE.
   Masz w podsumowaniu, kto jeszcze dziś pracuje i ile ma wizyt. Wskaż osobę
   po imieniu i uzasadnij („Ania ma dziś 3 wizyty, ma luz").
   Awaria bez opiekuna to pierwszy kandydat do delegowania.

🔴 ABSOLUTNY ZAKAZ: NIE PYTAJ O ZGODĘ NA SPRAWDZENIE.
Zdania w rodzaju „mogę sprawdzić w systemie", „czy chcesz, żebym sprawdził",
„mogę skontaktować się z personelem" są ZAKAZANE. Jeśli czegoś nie wiesz,
a masz narzędzie — UŻYJ GO OD RAZU i podaj wynik. Pytanie o pozwolenie na
zajrzenie do danych, do których i tak masz dostęp, zamienia asystenta
w przeszkodę. Jedyne dopuszczalne pytanie to takie, na które NIE ZNAJDZIESZ
odpowiedzi żadnym narzędziem, a które zmienia Twoją radę.
Pytanie „co to za zabieg o 9:00" → NATYCHMIAST patientDossier(time: "09:00").

🔴 BLOKI ORGANIZACYJNE TO NIE PACJENCI.
W grafiku Prodentisa siedzą wpisy, które NIE SĄ wizytami lekarza:
„CHIRURGIA PRZYGOTOWANIE" (czas asysty na przygotowanie sali), „Pomoc Sprzątanie",
„Przegląd unitów", „KONSULTACYJNY Pokój". Narzędzie myDay podaje je w osobnej
sekcji „BLOKI ORGANIZACYJNE" — NIGDY nie licz ich jako pacjentów ani jako pracy
do wykonania. Jeśli lekarz ma jedną realną wizytę i jeden blok przygotowania,
to ma JEDNĄ wizytę, a nie dwie. Możesz o bloku wspomnieć jako o kontekście
(„o 8:00 asysta przygotowuje salę"), ale nie jako o Twoim zadaniu.

PRZY PROBLEMIE — NIE ODSYŁAJ Z NICZYM:
Jeśli ktoś pyta „co zrobić z X", zaproponuj konkretny następny krok i powiedz,
GDZIE szukać rozwiązania (który ekran, kto w zespole to ostatnio robił, czy jest
sugestia albo awaria na ten temat). „Nie wiem" jest dopuszczalne tylko wtedy,
gdy najpierw sprawdziłeś narzędziami.

CZEGO NIE ROBIĆ NIGDY:
- Nie wypisuj wizyt, które JUŻ SIĘ ODBYŁY, gdy pytanie dotyczy dzisiaj.
- Nie zgaduj faktów. Wszystko, co twierdzisz o grafiku, zadaniach, awariach,
  urlopach czy poczcie, MUSI pochodzić z narzędzia. Nie masz innej wiedzy o dziś.
- Nie udawaj, że coś zrobiłeś, jeśli narzędzie zwróciło błąd — powiedz wprost.
- Nie zasypuj listą. Trzy rzeczy z uzasadnieniem biją dziesięć bez.

DŁUGOŚĆ: dopasuj do treści. Proste polecenie („zapisz fryzjera na jutro") →
jedno zdanie potwierdzenia. Pytanie o dzień albo o decyzję → tyle, ile trzeba,
żeby uzasadnić kolejność; zwykle 5–10 zdań, w punktach, bez lania wody.

═══════════════════════════════════════════════════════════════════

FILOZOFIA DZIAŁANIA PRZY POLECENIACH:
- Gdy dostajesz POLECENIE (zapisz, dodaj, przypomnij) — NIE pytaj, tylko wykonaj,
  wywnioskowując brakujące dane z kontekstu.
- Gdy dostajesz PYTANIE o sytuację — najpierw sprawdź narzędziami, potem doradź.
- Dopytuj TYLKO wtedy, gdy odpowiedź realnie zmieni radę, której udzielisz.
- "Jutro na 16 mam fryzjera" → NATYCHMIAST createTask(is_private=true, due_date=jutro, due_time=16:00), następnie updateMemory({"ostatni_fryzjer": "fryzjer, 16:00"})
- Po wykonaniu akcji: 1-2 zdania CO zrobiłeś, potem KONKRETNA propozycja co jeszcze można dodać
  Przykład: "Zapisałem fryzjera na jutro o 16 i dodałem do kalendarza Google automatycznie. Jeśli chcesz, podaj adres — dodam go do opisu."
- WAŻNE — kalendarz i zadania: gdy tworzysz zadanie z due_date przez createTask(), system AUTOMATYCZNIE dodaje je do kalendarza Google. NIE wywołuj addCalendarEvent() osobno dla tego samego zadania — to stworzy duplikat. Użyj addCalendarEvent() TYLKO dla wydarzeń które NIE są zadaniami w systemie (np. spotkanie biznesowe, kolacja prywatna).
- KRYTYCZNE — NIE duplikuj zadań: Jeśli użytkownik kontynuuje rozmowę o istniejącym zadaniu (np. "dopisz jeszcze mleko"), użyj updateTask(merge_checklist=[...]) zamiast createTask. Jeśli poprzednia odpowiedź zawierała task_id — użyj go od razu.
- Powiedz wprost co zrobiłeś z przypomnieniem: "Ustawiłem przypomnienie w Google Calendar na 15 minut przed."
- Powiedz użytkownikowi że wyślesz mu push na urządzenie (dla zadań prywatnych: tylko do niego)
- Zadania kliniczne → push do całego zespołu; Zadania prywatne → push TYLKO do właściciela
- updateMemory ZAWSZE gdy user poda: adres, telefon, preferencję, kogoś ważnego, termin cykliczny

WNIOSKOWANIE DAT:
- "jutro" = ${(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
- "pojutrze" = ${(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0]; })()}
- "w przyszłym tygodniu" = ${(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })()}
- Godziny: "na 16" = 16:00, "o 9 rano" = 09:00, "po południu" = 14:00
- Strefa czasowa: Europe/Warsaw — ISO format: ${new Date().toISOString().split('T')[0]}T16:00:00+01:00

DZIŚ: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, godz. ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}


WIEDZA O KLINICE (usługi, ceny, zespół):
${kbContext}

TYPY ZADAŃ KLINICZNYCH: Laboratorium, Zamówienia, Recepcja, Modele Archiwalne, Skanowanie, Inne

STYL ODPOWIEDZI:
- Mów jak doświadczony współpracownik, nie jak system. Konkretnie, bez ozdobników.
- NIE zaczynaj od "Oczywiście!", "Jasne!", "Rozumiem!"
- Potwierdzaj co ZROBIŁEŚ, nie co "zamierzasz zrobić"
- Przy doradzaniu: najpierw JEDNO zdanie sedna („Dzień masz ciasny, zdążysz z dwiema
  rzeczami"), potem punkty z uzasadnieniem, na końcu jedno pytanie albo propozycja
  następnego kroku.
- Liczby i godziny podawaj wprost. „Masz 40 minut o 12:20" jest warte więcej
  niż „masz trochę czasu w środku dnia".${memorySection}`;
}

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
    {
        type: 'function',
        function: {
            name: 'updateTask',
            description: 'Zaktualizuj istniejące zadanie (zmień tytuł, opis, prioryt, status, termin, lub DODAJ/PODMIEŃ pozycje na liście kontrolnej). ZAWSZE używaj tej funkcji gdy użytkownik chce dodać pozycje do istniejącego zadania (np. "dopisz do listy zakupów"). Nigdy nie twórz nowego zadania gdy user chce zmodyfikować istniejące.',
            parameters: {
                type: 'object',
                properties: {
                    task_id: { type: 'string', description: 'UUID zadania do aktualizacji (jeśli znany z poprzedniej odpowiedzi)' },
                    title_query: { type: 'string', description: 'Fragment tytułu do wyszukania gdy task_id nieznany. Np. "zakupy", "fryzjer"' },
                    new_title: { type: 'string', description: 'Nowy tytuł (jeśli zmieniony)' },
                    description: { type: 'string', description: 'Nowy opis zadania' },
                    priority: { type: 'string', enum: ['low', 'normal', 'urgent'], description: 'Priorytet' },
                    status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'archived'], description: 'Status' },
                    due_date: { type: 'string', description: 'Termin w formacie YYYY-MM-DD' },
                    due_time: { type: 'string', description: 'Godzina w formacie HH:MM' },
                    checklist_items: { type: 'array', items: { type: 'string' }, description: 'Pełna lista kontrolna (ZASTĘPUJE istniejącą)' },
                    merge_checklist: { type: 'array', items: { type: 'string' }, description: 'Pozycje do DODANIA do istniejącej listy (nie zastępuje — scala)' },
                },
                // At least one of task_id or title_query required
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'updateMemory',
            description: 'Zapisz fakty o użytkowniku do długoterminowej pamięci. ZAWSZE wywołuj gdy user poda: adres, telefon, preferencję, miejsce, osobę, termin cykliczny. Automatycznie wywołuj po każdej nowej informacji bez pytania.',
            parameters: {
                type: 'object',
                properties: {
                    facts: {
                        type: 'object',
                        description: 'Słownik klucz→wartość do zapamiętania. Wartość null = usuń ten fakt. Przykład: {"fryzjer_adres": "ul. Krakowska 15", "preferowana_godzina": "16:00"}',
                        additionalProperties: { type: 'string' },
                    },
                    reason: { type: 'string', description: 'Krótki opis dlaczego to zapamiętano (opcjonalne)' },
                },
                required: ['facts'],
            },
        },
    },
    // ── Narzędzia CZYTAJĄCE ────────────────────────────────────────────────
    // Do 2026-07-29 asystent miał wyłącznie narzędzia PISZĄCE i na pytanie
    // „co mam dziś do zrobienia" nie umiał odpowiedzieć.
    {
        type: 'function',
        function: {
            name: 'myDay',
            description:
                'PODSUMOWANIE DNIA — jedno wywołanie zbiera WSZYSTKO, co wymaga uwagi: moich pacjentów z grafiku (godzina, nazwisko, zabieg), zaległe i dzisiejsze zadania, otwarte awarie, pacjentów czekających na odpowiedź na czacie, wnioski urlopowe do decyzji, nowe sugestie zespołu i nieprzeczytaną pocztę. UŻYJ TEGO NARZĘDZIA przy każdym pytaniu w rodzaju „co mam dziś do zrobienia", „co się dzieje", „jak wygląda mój dzień", „co jutro" — NIE odpytuj listMyTasks osobno, bo zadania to tylko jeden z siedmiu kawałków i sama pusta lista zadań NIE znaczy, że nie ma nic do zrobienia.',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: 'Dzień w formacie YYYY-MM-DD. Pomiń dla dzisiaj.' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'patientDossier',
            description:
                'CO TO ZA ZABIEG / KTO TO JEST — kartoteka pacjenta spod konkretnej wizyty: typ wizyty, notatka, rozpoznanie, przebieg poprzednich wizyt, wykonane procedury z numerami zębów i zalecenia. UŻYJ ZAWSZE, gdy padnie pytanie „co to za zabieg", „co robimy z tym pacjentem", „o co chodzi z wizytą o 9". NIGDY nie pytaj użytkownika, czy masz to sprawdzić — po prostu sprawdź tym narzędziem.',
            parameters: {
                type: 'object',
                properties: {
                    time: { type: 'string', description: 'Godzina wizyty, np. „09:00" albo „9". Podaj, gdy pytanie wskazuje porę.' },
                    patientName: { type: 'string', description: 'Nazwisko pacjenta, gdy pytanie wskazuje osobę.' },
                    date: { type: 'string', description: 'Dzień YYYY-MM-DD. Pomiń dla dzisiaj.' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listMyTasks',
            description: 'Zwraca MOJE otwarte zadania (zaległe, na dziś, dalsze) wraz z postępem checklisty. Użyj przy pytaniach typu „co mam dziś do zrobienia", „co mi zostało", „czy mam coś zaległego".',
            parameters: {
                type: 'object',
                properties: {
                    scope: { type: 'string', enum: ['today', 'overdue', 'open'], description: 'today = tylko dzisiejsze, overdue = tylko po terminie, open = wszystkie otwarte (domyślne)' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'myWorkTime',
            description: 'Mój czas pracy i nadgodziny w bieżącym miesiącu (system kontroli czasu pracy). Użyj przy „ile mam nadgodzin", „ile przepracowałem".',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'myLeaveBalance',
            description: 'Mój bilans urlopu na bieżący rok i wnioski czekające na decyzję. Użyj przy „ile mam urlopu", „czy mój wniosek przeszedł".',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'openIncidents',
            description: 'Otwarte awarie i usterki w gabinecie. Użyj przy „co jest zepsute", „jakie mamy awarie".',
            parameters: { type: 'object', properties: {} },
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
        const { messages, locale } = await req.json();
        const safeMessages = sanitizeMessages(messages);

        if (safeMessages.length === 0) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Fetch user memory to personalize the system prompt
        let userMemory: Record<string, string> = {};
        try {
            const { data: memData } = await supabase
                .from('assistant_memory')
                .select('facts')
                .eq('user_id', user.id)
                .single();
            if (memData?.facts) userMemory = memData.facts;
        } catch { /* memory is optional */ }

        // Build full conversation context with personalized system prompt
        // Load clinic KB for voice assistant context
        let kbContext = '';
        try {
            kbContext = await buildContextPrompt('voice_assistant');
        } catch { /* KB is optional — falls back to role prompt only */ }

        /**
         * 🔒 PSEUDONIMIZACJA — model NIGDY nie dostaje tożsamości.
         *
         * Scrubber żyje dokładnie tyle, co to żądanie, i nigdzie się nie zapisuje.
         * Uczymy go z góry nazwisk CAŁEGO personelu (padają w notatkach: „wycisk
         * oddany do Maćków-Huras"), a nazwisk pacjentów uczy się w locie z wyników
         * narzędzi. Wszystko, co idzie do modelu — prompt systemowy z pamięcią
         * i bazą wiedzy, wiadomości użytkownika, wyniki narzędzi — przechodzi przez
         * `scrub`. Odpowiedź modelu i argumenty jego wywołań przechodzą przez
         * `restore`, więc użytkownik i baza widzą prawdziwe wartości.
         */
        const scrubber = createScrubber();
        try {
            const { data: staff } = await supabase.from('employees').select('name').eq('is_active', true);
            for (const e of staff ?? []) scrubber.learn((e as { name?: string }).name, 'OSOBA');
        } catch {
            /* brak listy personelu obniża skuteczność słownika, ale regexy działają dalej */
        }

        // 🌐 Odpowiedź MUSI być w języku interfejsu. Prompt systemowy jest po polsku,
        // więc model bez tej instrukcji odpowiada po polsku nawet na pytanie niemieckie —
        // a od 1.2 chipy podpowiedzi wysyłają pytanie w języku aplikacji. Routing narzędzi
        // działa niezależnie od języka (sprawdzone na żywym pytaniu po niemiecku).
        const LANG: Record<string, string> = {
            pl: 'polsku', en: 'angielskim', de: 'niemieckim', uk: 'ukraińskim', ua: 'ukraińskim',
        };
        const langName = LANG[String(locale || 'pl').slice(0, 2)] || 'polsku';
        const systemPrompt =
            buildSystemPrompt(userMemory, kbContext) +
            '\n\nJĘZYK ODPOWIEDZI: odpowiadaj ZAWSZE po ' + langName +
            '. Nazwy własne (imiona, nazwy zabiegów z kartoteki) zostaw w oryginale.';
        const conversationMessages: any[] = [
            // Pamięć per pracownik potrafi zawierać adresy i telefony — prompt też scrubujemy.
            { role: 'system', content: scrubber.scrub(systemPrompt) },
            ...safeMessages.map(m => ({ ...m, content: scrubber.scrub(m.content) })),
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
                /**
                 * 🔑 Niżej niż dawne 0.6. Ten asystent PISZE DO PRODUKCJI (zadania,
                 * kalendarz, maile) i jednocześnie ma doradzać — a rada ma być oparta
                 * na danych z narzędzi, nie na inwencji. Losowość pomaga przy tekstach
                 * marketingowych, szkodzi przy „co zrobić najpierw".
                 */
                temperature: 0.35,
                /**
                 * Dawne 1000 tokenów wymuszało skrótowość niezależnie od pytania —
                 * uzasadniona kolejność zadań po prostu się nie mieściła. Długość
                 * reguluje teraz prompt („dopasuj do treści"), a nie twardy limit.
                 */
                max_tokens: 2000,
            });

            const responseMessage = completion.choices[0].message;

            // No tool calls → GPT is done, return text reply
            if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
                // Model odpowiada ŻETONAMI — użytkownikowi oddajemy prawdziwe nazwiska.
                return NextResponse.json({
                    reply: scrubber.restore(responseMessage.content || '') || 'Gotowe.',
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
                console.log(`[Assistant] Round ${round + 1}: ${functionName}`);

                /**
                 * Argumenty od modelu mogą nieść ŻETONY — np. `createTask({
                 * patient_name: "PACJENT_2" })`, bo tak zobaczył pacjenta w wyniku
                 * poprzedniego narzędzia. Przed wykonaniem podstawiamy prawdziwe
                 * wartości, żeby do bazy trafiło nazwisko, a nie etykieta.
                 */
                const realArgs = scrubber.restoreDeep(functionArgs);

                const actionResult = await executeAction(functionName, realArgs, user.id, user.email || '');
                executedActions.push({ name: functionName, args: realArgs, result: actionResult });

                // Narzędzie zgłasza, kogo dotyczy jego odpowiedź — uczymy scrubbera
                // ZANIM cokolwiek z tej odpowiedzi pójdzie do modelu.
                for (const id of actionResult.identities ?? []) scrubber.learn(id.value, id.kind);

                // Do modelu leci wersja ZAŻETONOWANA; `identities` nie wysyłamy wcale.
                const { identities: _drop, ...forModel } = actionResult;
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    // ⚠️ `scrubDeep` PRZED serializacją, nigdy `scrub` na gotowym JSON-ie:
                    // escape'owany znak nowej linii skleja się z imieniem („\nEla") i psuje
                    // dopasowanie. Zmierzone na realnej notatce z produkcji.
                    content: JSON.stringify(scrubber.scrubDeep(forModel)),
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
            reply: scrubber.restore(summary.choices[0].message.content || '') || 'Wykonano wszystkie akcje.',
            action: executedActions.length > 0 ? executedActions[executedActions.length - 1] : null,
            actions: executedActions,
        });

    } catch (error: any) {
        // 🔒 `detail: error.message` wracało klientowi wewnętrzne komunikaty —
        // treści zapytań SQL, nazwy kolumn, fragmenty odpowiedzi OpenAI. Szczegół
        // zostaje w logu serwera, użytkownik dostaje komunikat, z którym da się żyć.
        console.error('[Assistant] Error:', error);
        return NextResponse.json({ error: 'Wystąpił błąd asystenta' }, { status: 500 });
    }
}
