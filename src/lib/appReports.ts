/**
 * Zgłoszenia z aplikacji — typy i pomocniki (migracja 199).
 *
 * Kanał zwrotny z apki mobilnej: usterka, pomysł albo uwaga. Do 1.3.1 takiego
 * kanału nie było i jedyną drogą był czat z recepcją — czyli mieszanie błędów
 * oprogramowania z pytaniami o leczenie w skrzynce o zupełnie innym czasie reakcji.
 *
 * 🔑 Zgłasza ZALOGOWANY **i GOŚĆ** (`patient_id` NULL). Człowiek, któremu psuje się
 * logowanie, nie zgłosi tego jako zalogowany — a to jest ta klasa usterki, o której
 * trzeba wiedzieć najbardziej. Cena (spam) płacona limitem w trasie, nie zamknięciem
 * kanału.
 *
 * 🔴 Push idzie WYŁĄCZNIE przy `kind='bug'` i **bez treści zgłoszenia** — sam sygnał
 * i link. Zgłoszenie potrafi zawierać zdanie o własnym leczeniu, a powiadomienie
 * ląduje na ekranie blokady.
 */

export type ReportKind = 'bug' | 'idea' | 'other';
export type ReportStatus = 'new' | 'in_progress' | 'done' | 'declined';

export const REPORT_KINDS: readonly ReportKind[] = ['bug', 'idea', 'other'] as const;
export const REPORT_STATUSES: readonly ReportStatus[] = [
    'new',
    'in_progress',
    'done',
    'declined',
] as const;

/** Statusy, których nie wolno ustawić bez odpowiedzi (lustro CHECK-a z migracji 199). */
export const CLOSING_STATUSES: readonly ReportStatus[] = ['done', 'declined'] as const;

/** Limity długości — lustro tego, co robi baza; tutaj po to, by odciąć śmieci wcześniej. */
export const MAX_MESSAGE = 4000;
export const MAX_CONTACT = 200;
export const MAX_REPLY = 4000;
/** Pola diagnostyczne to krótkie etykiety; 120 znaków to zapas ×3 wobec realnych. */
export const MAX_DIAG = 120;

export interface AppReport {
    id: string;
    kind: ReportKind;
    message: string;
    /**
     * `null` = gość. 🔑 Nie ma pola z nazwiskiem: `patients` nie ma żadnej kolumny
     * z imieniem (zmierzone). Tożsamość niesie ten wskaźnik, dokładniej niż tekst.
     */
    patient_id: string | null;
    contact: string | null;
    app_version: string | null;
    platform: string | null;
    os_version: string | null;
    device_model: string | null;
    locale: string | null;
    screen: string | null;
    status: ReportStatus;
    reply: string | null;
    replied_by: string | null;
    replied_name: string | null;
    replied_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Kolumny, które wolno oddać ZGŁASZAJĄCEMU. Bez `patient_id`, bez `replied_by`. */
export const PATIENT_VISIBLE_COLUMNS =
    'id, kind, message, status, reply, replied_name, replied_at, created_at, updated_at';

/**
 * Przycinanie pola diagnostycznego.
 *
 * 🪤 `screen` bywa trasą z parametrem (`/(staff)/pacjenci/<uuid>`), a to jest
 * identyfikator pacjenta w polu, które personel ogląda przy każdym zgłoszeniu.
 * Dlatego wszystko po pierwszym segmencie z parametrem leci precz — patrz
 * `sanitizeScreen`. Ta funkcja obsługuje wyłącznie długość i typ.
 */
export function diagField(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, MAX_DIAG);
}

/**
 * Ścieżka ekranu BEZ parametrów.
 *
 * 🔑 Trasa jest cenną informacją diagnostyczną, ale `/(staff)/pacjenci/9f2c…`
 * niesie id pacjenta, a `/(patient)/wiadomosc/1234` id rozmowy. Zostawiamy
 * segmenty statyczne, a każdy segment wyglądający na identyfikator (cyfry, UUID,
 * mieszanka dłuższa niż 20 znaków) zamieniamy na `:id`.
 *
 * Kontrola negatywna dla tej funkcji siedzi w harnessie apki — ta sama logika
 * stoi po obu stronach, bo serwer nie może ufać temu, co przyśle klient.
 */
export function sanitizeScreen(value: unknown): string | null {
    const raw = diagField(value);
    if (!raw) return null;
    const cleaned = raw
        .split('/')
        .map((seg) => {
            if (!seg) return seg;
            if (/^\d+$/.test(seg)) return ':id';
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg)) return ':id';
            if (seg.length > 20 && /\d/.test(seg)) return ':id';
            return seg;
        })
        .join('/');
    return cleaned.slice(0, MAX_DIAG);
}

/** Czy `status` wolno ustawić przy takiej odpowiedzi? Lustro CHECK-a z bazy. */
export function closingNeedsReply(status: ReportStatus, reply: string | null): boolean {
    if (!CLOSING_STATUSES.includes(status)) return false;
    return !reply || reply.trim().length < 3;
}
