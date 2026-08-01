/**
 * Pseudonimizacja korespondencji mailowej idącej do modelu językowego.
 *
 * 🔴 STAN SPRZED 2026-08-01: obie ścieżki AI dla poczty — generowanie odpowiedzi
 * na żądanie (`/api/employee/email-generate-reply`) i cron (`/api/cron/email-ai-drafts`)
 * — wkładały do promptu **treść maila pacjenta i adres nadawcy w oryginale**.
 * `lib/aiAnonymizer.ts` istniał od lipca, ale wołał go WYŁĄCZNIE asystent. Reguła
 * „żadnych danych wrażliwych do OpenAI" obowiązywała więc w asystencie, a w poczcie nie.
 *
 * 🔑 **JEDEN moduł dla obu tras.** Ta sama klasa błędu (naprawa jednej ścieżki
 * z trzech) wracała w tym projekcie trzykrotnie przy pushu. Dlatego logika żyje
 * w jednym miejscu, a `emailAiPrivacyWiring.test.ts` pilnuje, że każda trasa
 * wysyłająca maila do OpenAI naprawdę przez nią przechodzi.
 *
 * ── CO ZAMIENIAMY, A CZEGO NIE ─────────────────────────────────────────────
 *
 * ZAMIENIAMY (strona PACJENTA):
 *   · nazwę i adres nadawcy · temat · treść wiadomości
 *   · historię poprawek (`email_ai_feedback`) — to zapis wcześniejszej
 *     korespondencji z pacjentami, więc niesie nazwiska tak samo jak świeży mail
 *
 * NIE ZAMIENIAMY (strona GABINETU):
 *   · bazy wiedzy, instrukcji admina, wgranych plików wiedzy, wolnych terminów
 *
 * 🔑 **Dlaczego asymetrycznie.** Baza wiedzy to publiczne materiały gabinetu —
 * te same nazwiska lekarzy stoją na stronie. Przepuszczenie ich przez scrubber
 * dałoby odpowiedzi w rodzaju „Zapraszamy do LEKARZ_1", czyli zepsułoby produkt
 * bez żadnego zysku dla prywatności. Wrażliwe jest POŁĄCZENIE treści z tożsamością
 * PACJENTA — i to połączenie rozcinamy.
 *
 * ⚠️ To pseudonimizacja (art. 4 pkt 5 RODO), nie anonimizacja nieodwracalna.
 * Mapa żetonów żyje w pamięci JEDNEGO żądania i nigdzie się nie zapisuje.
 */

import { createScrubber, type Scrubber } from '@/lib/aiAnonymizer';

export interface IncomingEmail {
    fromName?: string | null;
    fromAddress?: string | null;
    subject?: string | null;
    /** Treść tekstowa maila (już bez HTML). */
    body?: string | null;
    /** Data w postaci, w jakiej ma trafić do promptu (nie jest identyfikatorem). */
    date?: string | null;
}

/** Wpis historii poprawek — trafia do promptu jako przykład tonu. */
export interface FeedbackEntry {
    ai_analysis?: string | null;
    feedback_note?: string | null;
    original_draft_html?: string | null;
    corrected_draft_html?: string | null;
}

export interface PreparedEmail {
    /** Scrubber z mapą żetonów — użyj `restoreForHuman` na odpowiedzi modelu. */
    scrubber: Scrubber;
    /** Wartości BEZPIECZNE do wstawienia w prompt. */
    safe: {
        fromName: string;
        fromAddress: string;
        subject: string;
        body: string;
        date: string;
    };
    /** Historia poprawek po pseudonimizacji (ta sama kolejność co wejście). */
    safeFeedback: FeedbackEntry[];
    /** Ile różnych bytów ukryto — do logu i do pomiaru skuteczności. */
    hidden: number;
}

/**
 * Przygotowuje maila do wysłania modelowi.
 *
 * 🪤 **Wartości czyścimy POJEDYNCZO, przed złożeniem promptu — nigdy gotowego
 * JSON-a.** `JSON.stringify` zamienia znak nowej linii na dwa znaki, więc
 * „…natychmiastowe\r\n\r\nEla" daje w tekście ciąg liter `nEla`; rdzeń „ela"
 * przestaje pasować i imię wychodzi do modelu mimo poprawnego słownika.
 * Ta klasa błędu została już raz złapana pomiarem w asystencie — patrz
 * `scrubDeep` w `aiAnonymizer.ts`.
 */
export function prepareEmailForModel(
    email: IncomingEmail,
    feedback: FeedbackEntry[] = [],
): PreparedEmail {
    const scrubber = createScrubber();

    // Nadawca do słownika PRZED czyszczeniem treści: dzięki temu jego nazwisko
    // zostanie wycięte także tam, gdzie pada w środku wiadomości („z poważaniem, …"),
    // a `learn` rozbija formę wielowyrazową, więc łapie też samo nazwisko.
    scrubber.learn(email.fromName, 'PACJENT');
    scrubber.learn(email.fromAddress, 'EMAIL');

    const safe = scrubber.scrubDeep({
        fromName: String(email.fromName ?? '').trim() || 'Nieznany nadawca',
        fromAddress: String(email.fromAddress ?? '').trim(),
        subject: String(email.subject ?? ''),
        body: String(email.body ?? ''),
        // Data nie jest identyfikatorem — przepuszczamy ją przez `scrubDeep` tylko
        // dlatego, że idzie w tej samej strukturze; ciąg ISO nie ma czego stracić.
        date: String(email.date ?? ''),
    });

    const safeFeedback = scrubber.scrubDeep(feedback);

    return { scrubber, safe, safeFeedback, hidden: scrubber.size() };
}

/**
 * Przygotowuje parę „propozycja AI → poprawka pracownika" do analizy przez model.
 *
 * 🔴 To była TRZECIA ścieżka wysyłająca dane pacjenta do OpenAI i nie widać jej
 * z nazwy trasy: `PUT /api/employee/email-drafts` z akcją `return_for_learning`
 * albo `learn_from_compose` prosi model o wnioski, wkładając w prompt CAŁY draft
 * odpowiedzi. A draft zaczyna się od „Dzień dobry Panie Michale" i często kończy
 * podpisem z numerem telefonu. Wykrył ją dopiero strażnik okablowania — przegląd
 * kodu jej nie łapał, bo trasa nie ma w nazwie ani „generate", ani „cron".
 *
 * Tutaj nie ma nadawcy do nauczenia z góry, więc pracują same warstwy wzorców
 * i rdzeni imion — dokładnie tak, jak przy notatkach w asystencie.
 */
export function prepareLearningPairForModel(pair: {
    original?: string | null;
    corrected?: string | null;
    note?: string | null;
    tags?: string[] | null;
}): { scrubber: Scrubber; safe: { original: string; corrected: string; note: string; tags: string[] } } {
    const scrubber = createScrubber();
    const safe = scrubber.scrubDeep({
        original: String(pair.original ?? ''),
        corrected: String(pair.corrected ?? ''),
        note: String(pair.note ?? ''),
        tags: (pair.tags ?? []).map(String),
    });
    return { scrubber, safe };
}

/**
 * Odtwarza prawdziwe dane w odpowiedzi modelu.
 *
 * Model pisze „Dzień dobry PACJENT_1" — człowiek ma zobaczyć prawdziwe imię,
 * a do bazy ma trafić gotowa treść. Działa na STRUKTURZE, nie na stringu JSON-a,
 * z tego samego powodu co czyszczenie.
 */
export function restoreForHuman<T>(scrubber: Scrubber, value: T): T {
    return scrubber.restoreDeep(value);
}

/**
 * Czy w tekście idącym do modelu został jeszcze jakiś oczywisty identyfikator?
 *
 * 🔑 To NIE jest zabezpieczenie, tylko **czujka**: scrubber opiera się na słowniku
 * i liście rdzeni imion, więc nazwisko spoza obu może się prześlizgnąć. Wynik
 * trafia do logu i do zliczeń, żeby dało się zmierzyć skuteczność na realnym
 * ruchu, zamiast zakładać, że jest stuprocentowa. Świadomie łapie tylko wzorce
 * jednoznaczne — e-mail, PESEL, telefon PL — bo tylko one dają zero fałszywych
 * alarmów na tekście po pseudonimizacji.
 */
export function residualIdentifiers(text: string): string[] {
    const found: string[] = [];
    const patterns: Array<[RegExp, string]> = [
        [/[\w.+-]+@[\w-]+\.[\w.-]+/g, 'email'],
        [/(?<!\d)\d{11}(?!\d)/g, 'pesel'],
        [/(?<!\d)(?:\+?48[ -]?)?(?:\d[ -]?){9}(?!\d)/g, 'telefon'],
    ];
    for (const [re, label] of patterns) {
        if (re.test(text)) found.push(label);
    }
    return found;
}
