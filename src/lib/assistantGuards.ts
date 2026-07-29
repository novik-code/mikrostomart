/**
 * Czyste bramki i parsery asystenta — wydzielone z trasy, żeby dały się przetestować
 * bez mockowania OpenAI, Supabase, Prodentisa i Google Calendar naraz.
 */

/** Ile ostatnich wiadomości klienta bierzemy pod uwagę (reszta to koszt bez wartości). */
export const MAX_CLIENT_MESSAGES = 20;
export const MAX_CONTENT_CHARS = 4000;

export type SafeMessage = { role: 'user' | 'assistant'; content: string };

/**
 * 🔒 Wiadomości od klienta są DANYMI, nie częścią promptu.
 *
 * Trasa robiła `[systemPrompt, ...messages]` bez żadnej kontroli, więc klient mógł
 * dosłać własną wiadomość z rolą `system` i nadpisać instrukcje — łącznie z bramkami,
 * które trzymają asystenta z dala od cudzych zadań prywatnych. Przepuszczamy wyłącznie
 * `user` i `assistant`, wyłącznie z niepustą treścią tekstową.
 */
export function sanitizeMessages(raw: unknown): SafeMessage[] {
    if (!Array.isArray(raw)) return [];
    const out: SafeMessage[] = [];
    for (const m of raw.slice(-MAX_CLIENT_MESSAGES)) {
        if (!m || typeof m !== 'object') continue;
        const role = (m as { role?: unknown }).role;
        const content = (m as { content?: unknown }).content;
        if (role !== 'user' && role !== 'assistant') continue;
        if (typeof content !== 'string' || !content.trim()) continue;
        out.push({ role, content: content.slice(0, MAX_CONTENT_CHARS) });
    }
    return out;
}

/**
 * Godzina wizyty z Prodentisa.
 *
 * 🔑 Prodentis NIE ZWRACA pól `startTime` ani `time` — oddaje `date` jako pełny ISO.
 * Poprzednia wersja czytała `apt.startTime || apt.time || '?'`, więc KAŻDA wizyta
 * w odpowiedzi asystenta miała godzinę „?".
 *
 * 🔑 Godzinę wycinamy ze STRINGA, nie przez `new Date()`. Serwer Vercela chodzi w UTC,
 * a wizyty są czasem ściennym gabinetu — parsowanie datą przesunęłoby je o godzinę lub dwie.
 */
export function prodentisTime(apt: unknown): string {
    const a = apt as Record<string, unknown> | null;
    const raw = (a?.date ?? a?.startTime ?? a?.time) as unknown;
    if (typeof raw !== 'string') return '?';
    const t = raw.indexOf('T');
    if (t !== -1) return raw.slice(t + 1, t + 6);
    return /^\d{2}:\d{2}/.test(raw) ? raw.slice(0, 5) : '?';
}

/**
 * Nazwa typu wizyty.
 * 🔑 `appointmentType` to OBIEKT `{id,name}` — wstawienie go wprost do szablonu
 * dawało w odpowiedzi „[object Object]".
 */
export function prodentisTypeName(apt: unknown): string {
    const a = apt as Record<string, unknown> | null;
    const t = (a?.appointmentType ?? a?.type) as unknown;
    if (!t) return '';
    if (typeof t === 'string') return t;
    const name = (t as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
}
