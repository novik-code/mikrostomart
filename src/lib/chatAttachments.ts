import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

/**
 * Załączniki czatu — warstwa wspólna OBU torów (personel↔personel i pacjent↔recepcja).
 *
 * Jedno miejsce na walidację, sanityzację i zapis, żeby tory nie rozjechały się
 * w szczegółach, które decydują o bezpieczeństwie: magic bytes, strip EXIF, prywatny
 * bucket, ścieżka bez danych osobowych, signed URL o krótkim TTL.
 *
 * 🔒 Bucket `chat-attachments` jest PRYWATNY i nie ma ŻADNYCH polityk na `storage.objects`
 * (migracja 184). Plik opuszcza serwer wyłącznie jako signed URL wybity przez trasę,
 * która przy okazji zapisuje ślad w audycie. Nie ma drugiej drogi i nie wolno jej dorabiać.
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const ATTACHMENT_BUCKET = 'chat-attachments';

/** Twardy sufit plików na jedną wiadomość. Dziś UI też go pilnuje, ale UI nie jest bramką. */
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

/** Górna granica przyjmowanego pliku. Apka kompresuje wcześniej — to zabezpieczenie, nie budżet. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** „Link ma żyć tyle, ile trwa kliknięcie" — wzorzec z `careflow/report-link`. */
export const SIGNED_URL_TTL_SECONDS = 300;

/** Dłuższy bok pełnego obrazu po normalizacji. */
const FULL_MAX_PX = 1600;
/** Dłuższy bok miniatury — bez niej wątek z 20 zdjęciami to 20 pełnych pobrań. */
const THUMB_MAX_PX = 256;

/**
 * Sufit pikseli wejścia.
 *
 * 🔑 Limit ROZMIARU PLIKU nie chroni przed bombą dekompresyjną: 8 MB PNG jednolitego
 * tła to spokojnie 100+ megapikseli, a domyślny limit sharpa (~268 MP) zabija funkcję
 * lambdy zanim zdąży cokolwiek zwrócić. 40 MP z zapasem starczy na każde zdjęcie z telefonu.
 */
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Rozpoznanie typu po MAGIC BYTES, nie po deklarowanym MIME.
 * Kopia sprawdzonej implementacji z `api/contact/route.ts` — świadomie bez biblioteki
 * `file-type` (ESM-only, ryzyko `ERR_REQUIRE_ESM` w bundlu CJS Vercela).
 *
 * 🔑 Sniff idzie PRZED dekoderem, bo sharp dekoduje też SVG — plik `.svg` przepuszczony
 * do librsvg to zupełnie inna powierzchnia ataku niż dekoder JPEG.
 */
export function detectImageMime(bytes: Uint8Array): string | null {
    if (bytes.length < 12) return null;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) return 'image/png';
    // WebP: 'RIFF' .... 'WEBP'
    if (
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) return 'image/webp';
    return null;
}

export type NormalizedImage = {
    full: Buffer;
    thumb: Buffer;
    width: number;
    height: number;
    /** Rozmiar PEŁNEGO obrazu po normalizacji — to on leży pod `storage_path`. */
    sizeBytes: number;
};

/**
 * Normalizacja = de facto SANITYZACJA. Re-enkodowanie przez sharp usuwa cały EXIF,
 * w tym GPS — a zdjęcie zrobione telefonem w gabinecie niesie współrzędne.
 *
 * 🔑 `.rotate()` BEZ argumentu i jako PIERWSZE: stosuje orientację z EXIF-u, którego
 * za chwilę nie będzie. Pominięcie = zdjęcia z telefonu leżące na boku u wszystkich
 * odbiorców, nieodwracalnie.
 * 🔑 `.flatten()` bo przezroczysty PNG zapisany jako JPEG dostaje CZARNE tło.
 * 🔑 Jeden dekod: `base` + dwa `clone()`. Dwa osobne `sharp(input)` to dwa pełne dekody.
 * 🔑 Żadnego `withMetadata()`/`keepExif()` — to przywróciłoby dane, których się pozbywamy.
 */
export async function normalizeImage(input: Buffer): Promise<NormalizedImage | null> {
    try {
        const base = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
            .rotate()
            .flatten({ background: '#ffffff' });

        const full = await base
            .clone()
            .resize(FULL_MAX_PX, FULL_MAX_PX, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toBuffer({ resolveWithObject: true });

        const thumb = await base
            .clone()
            .resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();

        return {
            full: full.data,
            thumb,
            // Wymiary z `info` obrazu PO obrocie — przy orientacji 6/8 wejście i wyjście
            // mają zamienione boki, a UI rezerwujące złe proporcje skacze przy ładowaniu.
            width: full.info.width,
            height: full.info.height,
            sizeBytes: full.info.size,
        };
    } catch (err) {
        // Uszkodzony plik, format bez dekodera (HEIC — prebuilt libvips go NIE dekoduje)
        // albo przekroczony limit pikseli. Wszystko kończy się tak samo: odrzuceniem.
        console.warn('[chatAttachments] normalizacja nieudana:', err);
        return null;
    }
}

export type StoredAttachment = {
    storagePath: string;
    thumbPath: string;
    width: number;
    height: number;
    sizeBytes: number;
};

/**
 * Wgranie pary plików (pełny + miniatura) do prywatnego bucketa.
 *
 * 🔑 Ścieżka to `<conversationId>/<uuid>.jpg` — niezgadywalna i BEZ danych osobowych.
 * Nazwa pliku przysłana przez klienta (`IMG_pacjent_Kowalski.jpg`) NIE MOŻE tu trafić;
 * bucket `consents` popełnił dokładnie ten błąd i migracja 183 nazywa go po imieniu.
 * 🔑 `upsert: false` — ścieżka jest losowa, więc kolizja znaczy „coś jest nie tak",
 * a ciche nadpisanie zniszczyłoby cudzy załącznik.
 */
export async function storeAttachment(
    conversationId: string,
    image: NormalizedImage,
): Promise<StoredAttachment | null> {
    const uuid = crypto.randomUUID();
    const storagePath = `${conversationId}/${uuid}.jpg`;
    const thumbPath = `${conversationId}/thumb_${uuid}.jpg`;

    const opts = { contentType: 'image/jpeg', upsert: false, cacheControl: 'no-store' };

    const up = await supabase.storage.from(ATTACHMENT_BUCKET).upload(storagePath, image.full, opts);
    if (up.error) {
        console.error('[chatAttachments] upload pełnego obrazu nieudany:', up.error);
        return null;
    }

    const upThumb = await supabase.storage.from(ATTACHMENT_BUCKET).upload(thumbPath, image.thumb, opts);
    if (upThumb.error) {
        console.error('[chatAttachments] upload miniatury nieudany:', upThumb.error);
        // Bez miniatury wiersz nie ma sensu — sprzątamy pełny obraz, żeby nie zostawić sieroty.
        await removeAttachmentFiles([storagePath]);
        return null;
    }

    return {
        storagePath,
        thumbPath,
        width: image.width,
        height: image.height,
        sizeBytes: image.sizeBytes,
    };
}

/**
 * Skasowanie obiektów ze Storage.
 *
 * 🔑 Wołane, gdy INSERT wiersza padnie PO uploadzie. Kaskada w bazie kasuje wiersz,
 * ale NIE plik — a cron retencyjny wprost deklaruje, że po Storage nie chodzi.
 * Bez tego każdy nieudany zapis zostawia osierocony obiekt, którego nikt nigdy nie znajdzie.
 */
export async function removeAttachmentFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
        await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);
    } catch (err) {
        console.error('[chatAttachments] sprzątanie plików nieudane:', err);
    }
}

/** Signed URL o krótkim TTL. `null` = nie udało się podpisać. */
export async function signAttachment(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
        console.error('[chatAttachments] podpisanie nieudane:', error);
        return null;
    }
    return data.signedUrl;
}

/** Metadane załącznika oddawane klientowi. NIGDY URL — ten wybija się osobną trasą. */
export type AttachmentDto = {
    id: string;
    mime: string;
    width: number | null;
    height: number | null;
    sizeBytes: number;
    createdAt: string;
};

type AttachmentRow = {
    id: string;
    staff_message_id: string | null;
    chat_message_id: string | null;
    mime: string;
    width: number | null;
    height: number | null;
    size_bytes: number;
    created_at: string;
};

export const ATTACHMENT_COLUMNS =
    'id, staff_message_id, chat_message_id, mime, width, height, size_bytes, created_at';

export function mapAttachmentRow(row: AttachmentRow): AttachmentDto {
    return {
        id: row.id,
        mime: row.mime,
        width: row.width,
        height: row.height,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
    };
}

/**
 * Załączniki dla ZBIORU wiadomości — jedno zapytanie, nie N+1.
 *
 * 🔑 Jawny `.limit()`: PostgREST domyślnie ucina wynik na 1000 wierszach BEZ ŻADNEGO
 * błędu, więc przy długiej stronie wątku część załączników po prostu zniknęłaby z ekranu.
 *
 * @param column którą kolumnę właściciela pytamy (tor personelu vs tor pacjenta)
 */
export async function loadAttachmentsByMessage(
    column: 'staff_message_id' | 'chat_message_id',
    messageIds: string[],
): Promise<Map<string, AttachmentDto[]>> {
    const out = new Map<string, AttachmentDto[]>();
    if (messageIds.length === 0) return out;

    // 🔑 Chunkujemy po 100 id. `.in()` ląduje w QUERY STRINGU, a wątek pacjenta nie ma
    // paginacji — przy ~200 wiadomościach URL przekracza limit długości i PostgREST
    // odpowiada 414. Błąd jest łapany niżej, więc objawiłby się nie awarią, tylko
    // CICHYM brakiem zdjęcia u recepcji. Ten sam rozmiar porcji stosuje cron retencyjny.
    for (let i = 0; i < messageIds.length; i += 100) {
        const part = messageIds.slice(i, i + 100);
        const { data, error } = await supabase
            .from('chat_attachments')
            .select(ATTACHMENT_COLUMNS)
            .in(column, part)
            .order('created_at', { ascending: true })
            .limit(part.length * MAX_ATTACHMENTS_PER_MESSAGE);

        if (error) {
            // Brak załączników nie może wywrócić całego wątku — wiadomości są ważniejsze.
            console.error('[chatAttachments] odczyt załączników nieudany:', error);
            continue;
        }

        for (const row of (data ?? []) as AttachmentRow[]) {
            const owner = column === 'staff_message_id' ? row.staff_message_id : row.chat_message_id;
            if (!owner) continue;
            const list = out.get(owner) ?? [];
            list.push(mapAttachmentRow(row));
            out.set(owner, list);
        }
    }
    return out;
}

/** Ile załączników ma już ta wiadomość (bramka na `MAX_ATTACHMENTS_PER_MESSAGE`). */
export async function countAttachments(
    column: 'staff_message_id' | 'chat_message_id',
    messageId: string,
): Promise<number | null> {
    const { count, error } = await supabase
        .from('chat_attachments')
        .select('id', { count: 'exact', head: true })
        .eq(column, messageId);
    if (error) {
        console.error('[chatAttachments] liczenie załączników nieudane:', error);
        return null;
    }
    return count ?? 0;
}

/**
 * Wyciągnięcie bajtów z multipart. Zwraca `null`, gdy pola nie ma, jest puste
 * albo przekracza limit — wołający zamienia to na własny kod błędu.
 */
export async function readUploadedFile(form: FormData, field = 'file'): Promise<Buffer | null> {
    const file = form.get(field);
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    return buf.length > 0 ? buf : null;
}
