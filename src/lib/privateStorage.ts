import { createClient } from '@supabase/supabase-js';

/**
 * Dokumenty pacjenta i zdjęcia zadań — warstwa dostępu do Storage.
 *
 * 🔒 PO CO. Buckety `consents`, `consent-pdfs` i `task-images` są dziś PUBLICZNE:
 * kto zna albo zgadnie adres, pobiera plik bez klucza, bez logowania i bez śladu
 * w audycie. W `consents` leżą e-Karty — PESEL, adres, wywiad zdrowotny, podpis —
 * a ścieżka to `<numer_kartoteki>/<plik>.pdf`, gdzie numer kartoteki jest KOLEJNY.
 *
 * Ten moduł jest jedynym miejscem, przez które te pliki mają odtąd wychodzić.
 * Wzorzec skopiowany z działających prywatnych bucketów: `lib/chatAttachments.ts`
 * (czat) i `lib/incidents.ts` (awarie) — te same reguły, ten sam kształt funkcji.
 *
 * 🔑 TRZY REGUŁY, KTÓRYCH NIE WOLNO ZŁAMAĆ (każda kupiona błędem w tym repo):
 *
 *  1. **Podpis powstaje przy OTWARCIU, nigdy w liście.** Lista podpisująca 30
 *     dokumentów zapisuje w audycie „pobrał listę" zamiast „otworzył dokument",
 *     a TTL wypala się przy zwykłym przewijaniu.
 *  2. **Ścieżkę od klienta WERYFIKUJE się w bazie**, nie po kształcie. Inaczej
 *     trasa podpisująca staje się generatorem linków do dowolnego obiektu
 *     w buckecie (`photoBelongsToIncident` powstał dokładnie z tego powodu).
 *  3. **Podpisanego adresu NIE ZAPISUJE się do bazy ani do maila.** Wygasa.
 *     Do bazy idzie KLUCZ OBIEKTU (kolumny `*_path`, migracja 192).
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Dokumenty pacjenta: podpisane zgody ORAZ e-Karty. */
export const PATIENT_DOC_BUCKET = 'consents';
/** Szablony zgód do podpisu na tablecie. */
export const CONSENT_TEMPLATE_BUCKET = 'consent-pdfs';
/** Zdjęcia doklejane do zadań personelu. */
export const TASK_IMAGE_BUCKET = 'task-images';

/**
 * TTL podpisanego adresu — **900 s** (decyzja właściciela, nie do otwierania na nowo).
 *
 * 🔑 Dlaczego nie 300 s jak w czacie: apka pobiera listę dokumentów, a człowiek
 * otwiera je po chwili patrzenia na ekran. Przy 300 s link potrafi wygasnąć
 * MIĘDZY wyświetleniem a dotknięciem i wygląda to na zepsuty dokument.
 */
export const SIGNED_URL_TTL_SECONDS = 900;

export type StorageBucket =
    | typeof PATIENT_DOC_BUCKET
    | typeof CONSENT_TEMPLATE_BUCKET
    | typeof TASK_IMAGE_BUCKET;

/**
 * Podpisany adres do obiektu. `null`, gdy podpisać się nie da.
 *
 * 🔑 Działa TAK SAMO na buckecie publicznym i prywatnym — dlatego wolno przepiąć
 * pisarzy i czytelników na podpisy ZANIM buckety zostaną zamknięte. Zamknięcie
 * przestaje wtedy być skokiem w ciemno: jeśli coś ma pęknąć, pęka wcześniej
 * i przy włączonym świetle.
 *
 * `downloadAs` ustawia nazwę pliku przy pobraniu — bez tego przeglądarka zapisuje
 * dokument pod nazwą-kluczem (`0100000123/ekarta_....pdf` → `ekarta_....pdf`).
 */
export async function signObject(
    bucket: StorageBucket,
    path: string,
    opts?: { downloadAs?: string; ttlSeconds?: number },
): Promise<string | null> {
    const czysta = (path || '').trim().replace(/^\/+/, '');
    if (!czysta) return null;

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(
            czysta,
            opts?.ttlSeconds ?? SIGNED_URL_TTL_SECONDS,
            opts?.downloadAs ? { download: opts.downloadAs } : undefined,
        );

    if (error || !data?.signedUrl) {
        console.error('[privateStorage] podpisanie nieudane:', bucket, error?.message);
        return null;
    }
    return data.signedUrl;
}

/**
 * Podpisy dla WIELU obiektów naraz — jedno wywołanie zamiast N.
 *
 * 🔑 PO CO OSOBNA FUNKCJA. Reguła 1 („podpis przy otwarciu, nigdy w liście") ma jeden
 * wyjątek, którego nie da się ominąć: obrazki, które klient RENDERUJE od razu przy
 * wyświetleniu listy. Zdjęcia zadań są dokładnie tym przypadkiem — apka 1.2.0 ze sklepu
 * (`lib/tasks.ts` `taskPhotos`) i panel webowy (`TasksTab.tsx`) wkładają adres prosto
 * w `<Image>`/`<img>`. Nie ma tam „otwarcia", które dałoby się podpisać osobno.
 * Pętla `signObject` po 200 zdjęciach to 200 żądań do Storage na każde wejście na listę;
 * `createSignedUrls` załatwia to jednym.
 *
 * Zwraca mapę klucz → podpisany adres. Klucze, których podpisać się nie dało, w mapie
 * NIE WYSTĘPUJĄ — wołający ma wtedy zdecydować sam, a nie dostać `undefined` udające adres.
 */
export async function signObjects(
    bucket: StorageBucket,
    paths: string[],
    opts?: { ttlSeconds?: number },
): Promise<Map<string, string>> {
    const wynik = new Map<string, string>();
    const czyste = Array.from(
        new Set(paths.map(p => (p || '').trim().replace(/^\/+/, '')).filter(Boolean)),
    );
    if (!czyste.length) return wynik;

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(czyste, opts?.ttlSeconds ?? SIGNED_URL_TTL_SECONDS);

    if (error || !Array.isArray(data)) {
        console.error('[privateStorage] podpisanie wsadowe nieudane:', bucket, error?.message);
        return wynik;
    }

    for (const wiersz of data) {
        // `path` z odpowiedzi bywa null przy błędzie pozycji — wtedy pomijamy tę pozycję.
        if (wiersz?.path && wiersz?.signedUrl) wynik.set(wiersz.path, wiersz.signedUrl);
    }
    return wynik;
}

/**
 * Kanoniczny adres publiczny obiektu — **stabilny, bez tokenu**.
 *
 * 🔑 PO CO. Do BAZY wolno zapisać tylko taki adres. Klient odsyła nam z powrotem to,
 * co dostał w odczycie (apka: `nowe.tsx` → `image_urls`), więc od chwili, w której
 * odczyt zaczyna oddawać podpisy, każdy zapis niósłby token. Token w kolumnie znaczy
 * dwie awarie naraz: wiersz z adresem, który umiera po 15 minutach, oraz `task_history`
 * notujące „zmianę zdjęcia" przy KAŻDYM zapisie, bo diff porównuje stringi.
 *
 * Adres liczy `getPublicUrl`, które jest czystym sklejeniem URL-a i **nie pyta serwera** —
 * działa tak samo na buckecie prywatnym. Po zamknięciu bucketa ten adres przestaje
 * cokolwiek otwierać i to jest w porządku: nikt go już nie czyta, czytelnicy dostają
 * podpis wyliczony z kolumny `*_path`. Zostaje jako czytelna wartość zapasowa i ślad.
 */
export function publicUrlFor(bucket: StorageBucket, path: string): string {
    const czysta = (path || '').trim().replace(/^\/+/, '');
    return supabase.storage.from(bucket).getPublicUrl(czysta).data.publicUrl;
}

/**
 * Bajty obiektu, czytane kluczem serwisowym.
 *
 * 🔑 Do wszystkiego, co dziś robi `fetch(publicznyAdres)` po stronie serwera —
 * przede wszystkim do eksportu RODO. Ten ostatni przy błędzie robi dziś
 * `console.warn` + `continue`, więc po zamknięciu bucketa oddałby pacjentowi
 * PUSTY ZIP ze statusem 200 i bez żadnego sygnału. Wołający MUSI rozróżnić
 * `null` od pustego pliku i przerwać, a nie iść dalej.
 */
export async function readObjectBytes(bucket: StorageBucket, path: string): Promise<Buffer | null> {
    const czysta = (path || '').trim().replace(/^\/+/, '');
    if (!czysta) return null;

    const { data, error } = await supabase.storage.from(bucket).download(czysta);
    if (error || !data) {
        console.error('[privateStorage] odczyt nieudany:', bucket, error?.message);
        return null;
    }
    return Buffer.from(await data.arrayBuffer());
}

/**
 * Wgranie obiektu. Zwraca KLUCZ (to on idzie do bazy), nie adres.
 *
 * 🪤 `upsert` domyślnie `true`, bo e-Karta bywa generowana ponownie dla tego samego
 * pacjenta i tej samej daty — tak działa dzisiejszy `intake/generate-pdf`. Przy
 * ścieżkach losowych (zdjęcia zadań) wołający powinien podać `upsert: false`,
 * żeby kolizja krzyczała, zamiast po cichu nadpisać cudzy plik.
 */
export async function putObject(
    bucket: StorageBucket,
    path: string,
    body: Buffer | Uint8Array,
    opts: { contentType: string; upsert?: boolean },
): Promise<string | null> {
    const czysta = (path || '').trim().replace(/^\/+/, '');
    if (!czysta) return null;

    const { error } = await supabase.storage.from(bucket).upload(czysta, body, {
        contentType: opts.contentType,
        upsert: opts.upsert ?? true,
        cacheControl: 'no-store',
    });

    if (error) {
        console.error('[privateStorage] upload nieudany:', bucket, error.message);
        return null;
    }
    return czysta;
}

export async function removeObjects(bucket: StorageBucket, paths: string[]): Promise<void> {
    const czyste = paths.map(p => (p || '').trim().replace(/^\/+/, '')).filter(Boolean);
    if (!czyste.length) return;
    const { error } = await supabase.storage.from(bucket).remove(czyste);
    if (error) console.error('[privateStorage] kasowanie nieudane:', bucket, error.message);
}

let kolumnyGotowe = false;

/**
 * Czy migracja 192 jest już wgrana (kolumny `*_path` + funkcje pomocnicze).
 *
 * 🔴 PO CO. Dopisanie `file_path`/`pdf_path` do INSERT-a na bazie BEZ tej kolumny
 * kończy się błędem 42703 i **cały zapis pada**. Dla tras podpisu zgody i generowania
 * e-Karty znaczyłoby to zatrzymanie przyjęć: pacjent siedzi w fotelu i nie ma czego
 * podpisać. Kolejność „migracja, potem deploy" jest słuszna, ale nie wolno na niej
 * OPRZEĆ bezpieczeństwa operacji — push na `main` to auto-deploy i wystarczy jedna
 * pomyłka w kolejności. Dlatego pisarze pytają, zanim dopiszą kolumnę.
 *
 * Wynik pozytywny zapamiętujemy na cały proces; negatywnego NIE — dzięki temu
 * po wgraniu migracji klucze zaczynają się zapisywać same, bez redeployu.
 */
export async function storagePathsReady(): Promise<boolean> {
    if (kolumnyGotowe) return true;
    const { error } = await supabase.rpc('resolve_object_paths', {
        p_urls: [] as string[],
        p_bucket: PATIENT_DOC_BUCKET,
    });
    if (error) return false;
    kolumnyGotowe = true;
    return true;
}

/**
 * Klucze obiektów wyliczone z adresów — **przez bazę, nie przez parser w TS**.
 *
 * 🔑 Trasy zapisu zadań dostają od klienta gotowe adresy (apka 1.2.0 ze sklepu inaczej
 * nie umie), więc klucz musi wyliczyć serwer. Reguła żyje w JEDNYM miejscu —
 * `resolve_object_paths` z migracji 192 — bo dwie kopie tej samej logiki rozjeżdżają się
 * przy pierwszej korekcie. Element nierozpoznany wraca jako `null` na swojej pozycji.
 *
 * Zwraca `null` (całość), gdy RPC nie odpowie — wołający ma wtedy ZAPISAĆ SAM ADRES
 * i nie udawać, że zna klucz. Backfill dobierze taki wiersz przy kolejnym przebiegu.
 */
export async function resolveObjectPaths(
    urls: Array<string | null | undefined>,
    bucket: StorageBucket,
): Promise<Array<string | null> | null> {
    const wejscie = urls.map(u => (u || '').trim()).filter(Boolean);
    if (!wejscie.length) return [];

    const { data, error } = await supabase.rpc('resolve_object_paths', {
        p_urls: wejscie,
        p_bucket: bucket,
    });

    if (error || !Array.isArray(data)) {
        // Najczęstszy powód przed wgraniem migracji 192: funkcji jeszcze nie ma (PGRST202).
        console.error('[privateStorage] resolve_object_paths nieudane:', error?.code, error?.message);
        return null;
    }
    return data as Array<string | null>;
}

/**
 * Okres przejściowy: klucz obiektu z wiersza, który może go jeszcze nie mieć.
 *
 * Kolumny `*_path` wypełnia backfill z migracji 192, a nowi pisarze zapisują je
 * od razu. Zostaje wąskie okno: wiersze zapisane starym kodem po backfillu.
 * Dla nich mamy legacy adres — i to jest JEDYNE miejsce w kodzie TypeScript,
 * które w ogóle patrzy na stary adres.
 *
 * 🪤 ŚWIADOMIE NIE parsujemy tu adresu na klucz. Parsowanie żyje w SQL
 * (`resolve_object_path`, migracja 192) i ma być JEDNĄ implementacją — dwie
 * kopie tej samej logiki rozjeżdżają się przy pierwszej korekcie (fork planisty
 * CareFlow kosztował już tę lekcję). Wiersz bez `path` idzie starym adresem
 * dopóki buckety są publiczne; po ich zamknięciu poprawnym lekiem jest
 * PONOWNE uruchomienie `storage_backfill_apply()`, nie parser w TS.
 */
export function documentSource(
    path: string | null | undefined,
    legacyUrl: string | null | undefined,
): { kind: 'path'; path: string } | { kind: 'legacy'; url: string } | null {
    const p = (path || '').trim();
    if (p) return { kind: 'path', path: p.replace(/^\/+/, '') };
    const u = (legacyUrl || '').trim();
    if (u) return { kind: 'legacy', url: u };
    return null;
}

/**
 * Adres do POKAZANIA klientowi dla wiersza w okresie przejściowym.
 *
 * 🔑 KONTRAKT ZE SKLEPEM. Apka 1.2.0 jest już w App Store i Google Play i robi
 * m.in. `if (up.url) setImageUrls(...)` oraz otwiera `doc.fileUrl` wprost.
 * Pole `url` MUSI dalej być adresem, który da się otworzyć — zmiana na sam klucz
 * wygasza zdjęcia i dokumenty w zainstalowanych binarkach. Klucz dokładamy
 * jako pole DODATKOWE.
 */
export async function displayUrlFor(
    bucket: StorageBucket,
    path: string | null | undefined,
    legacyUrl: string | null | undefined,
    opts?: { downloadAs?: string; ttlSeconds?: number },
): Promise<string | null> {
    const src = documentSource(path, legacyUrl);
    if (!src) return null;
    if (src.kind === 'legacy') return src.url;
    return signObject(bucket, src.path, opts);
}
