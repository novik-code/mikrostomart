/**
 * DOSTĘP DO ZADANIA PERSONELU — jedna reguła w jednym miejscu (P-040).
 *
 * 🔴 CO BYŁO ZEPSUTE. Filtr prywatności żył wyłącznie w LIŚCIE (`GET /api/employee/tasks`).
 * Wszystkie trasy per-id — historia, `PATCH`, `DELETE`, komentarze i ręczny push —
 * sprawdzały tylko rolę `employee|admin`, nigdy `is_private`. Każdy pracownik znający
 * UUID czytał, edytował, kasował i komentował cudze zadanie prywatne (`PATCH` z pustym
 * ciałem oddaje pełny wiersz razem z podpisanymi adresami zdjęć).
 *
 * 🪤 A UUID NIE JEST TAJNY. Zmiana statusu, odhaczenie checklisty i komentarz na zadaniu
 * PRYWATNYM wysyłały push do całej grupy — z tytułem zadania i `taskId` w adresie —
 * i lądowały w `push_notifications_log`. Pominięcie pushu dla prywatnych istniało tylko
 * przy TWORZENIU zadania. Czyli droga wycieku i droga nadużycia były tą samą drogą.
 *
 * 🔑 REGUŁA JEST KOPIĄ TEJ, KTÓRA JUŻ DZIAŁA. Asystent AI ma tę bramkę od commitu
 * `4742c39` (`lib/assistantActions.ts`: `existing.created_by === userId ||
 * existing.owner_user_id === userId`). Ten moduł istnieje po to, żeby nie powstała
 * TRZECIA kopia tej samej reguły — trasy REST i asystent mają odpowiadać tak samo.
 *
 * 🔑 POMIAR PRODUKCYJNY (06.09, przed kodem): `employee_tasks` — 342 wiersze, z tego
 * `is_private = true` **jeden**, `is_private IS NULL` **zero**, zadań prywatnych bez
 * `owner_user_id` i bez `created_by` **zero**. Ostrzeżenie z karty audytu („osierocone
 * zadanie prywatne stanie się niedostępne dla wszystkich") nie materializuje się —
 * ale reguła i tak traktuje takie wiersze jak prywatne bez właściciela, czyli niedostępne
 * per-id. Lista też ich nie pokazuje, więc nic nie ubywa.
 */

import { NextResponse } from 'next/server';

/** Kolumny, które musi mieć wiersz, żeby dało się o nim orzec. */
export type TaskAccessRow = {
    id?: string;
    is_private?: boolean | null;
    owner_user_id?: string | null;
    created_by?: string | null;
    [key: string]: unknown;
};

/** Kolumny wczytywane wyłącznie na potrzeby bramki — bez treści zadania. */
export const TASK_ACCESS_COLUMNS = 'id, is_private, owner_user_id, created_by';

/**
 * Czy `userId` może dotknąć tego zadania?
 *
 * Zadania zespołowe są wspólne — tak jak tablica zadań w interfejsie. Prywatne należą
 * do właściciela ALBO twórcy (dwie kolumny, bo `owner_user_id` doszedł później niż
 * `created_by` i starsze wiersze mają wypełnioną tylko jedną).
 *
 * 🔴 PRZYPISANIE NIE DAJE DOSTĘPU — celowo. Lista (`GET /api/employee/tasks`) filtruje
 * po właścicielu, więc gdyby szczegół wpuszczał przypisanych, powstałby rozjazd
 * lista↔szczegół; w tym projekcie taki rozjazd był już źródłem błędów. Jeśli właściciel
 * zdecyduje inaczej, zmiana musi objąć OBA miejsca naraz.
 *
 * 🔴 ADMIN NIE MA OBEJŚCIA. „Prywatne" ma znaczyć prywatne — inaczej nazwa kłamie.
 */
export function canAccessTask(task: TaskAccessRow | null | undefined, userId: string): boolean {
    if (!task) return false;
    if (!task.is_private) return true;
    return task.owner_user_id === userId || task.created_by === userId;
}

/**
 * Czy o tym zadaniu wolno ogłosić CAŁEJ grupie (push zespołowy, raport na Telegramie)?
 *
 * Push imienny do osoby przypisanej to inna sprawa — ona już wie, że zadanie istnieje,
 * bo ktoś ją do niego przypisał. Ogłoszenie zespołowe niesie tytuł nieznajomym.
 */
export function teamMayHear(task: TaskAccessRow | null | undefined): boolean {
    return !!task && !task.is_private;
}

/**
 * Jedna odpowiedź na „nie ma takiego zadania" i na „jest, ale nie twoje".
 *
 * 🔑 CELOWO NIEROZRÓŻNIALNE. Osobny kod dla „istnieje, ale cudze" zamienia trasę
 * w wyrocznię: pozwala potwierdzić istnienie zadania, którego nie wolno zobaczyć.
 * Kształt ciała jest ten sam, co dotychczasowe 404 w `PATCH`, więc klienci go znają.
 */
export const taskNotFound = () =>
    NextResponse.json({ error: 'Task not found' }, { status: 404 });

/**
 * Wynik próby wczytania wiersza pod bramkę. Trzy stany, nie dwa.
 *
 * 🔴 „NIE WIEM" TO NIE JEST „NIE MA". Pierwsza wersja tego pomocnika odrzucała pole
 * `error` z PostgREST i zwracała `null` przy każdej awarii — timeout, 5xx, niepoprawny
 * UUID. Bramka zamieniała to na 404 „Task not found" dla osoby w pełni uprawnionej,
 * a panel weba przy odhaczaniu checklisty nie sprawdza `res.ok`, więc zapis znikałby
 * po cichu przy następnym odświeżeniu. Awaria ma krzyczeć, brak rekordu milczeć.
 */
export type WynikDostepu =
    | { stan: 'ok'; task: TaskAccessRow }
    | { stan: 'brak' }
    | { stan: 'awaria' };

/**
 * Wczytuje wyłącznie kolumny potrzebne bramce. Osobne, lekkie zapytanie zamiast
 * doklejania warunku do istniejących selectów — dzięki temu bramka stoi na samym
 * początku handlera, przed jakąkolwiek pracą na cudzym zadaniu (normalizacja zdjęć
 * w `PATCH` sięga do storage), a nie tuż przed zapisem.
 *
 * 🪤 `maybeSingle`, nie `single`: PostgREST przy zerze wierszy zwraca BŁĄD (PGRST116),
 * przez co brak zadania szedł dotąd jako 500 „Failed to update task". Tu brak wiersza
 * ma być stanem `brak`, a realna awaria — stanem `awaria`.
 */
/**
 * Klient Supabase, jakiego potrzebuje bramka.
 *
 * 🪤 `any` JEST TU ŚWIADOME I ZMIERZONE. Próba zawężenia do minimalnego kształtu
 * (`from().select().eq().maybeSingle()`) wywala kompilację na `TS2589: Type instantiation
 * is excessively deep` — generyki `SupabaseClient` rozwijają się rekurencyjnie przy
 * dopasowaniu do własnego interfejsu. Konwencja repo dla tej klasy przypadków to jawne
 * wyłączenie reguły z powodem (19 plików w `src/`), nie ciche `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlientZadan = { from: (tabela: string) => any };

export async function loadTaskForAccess(
    supabase: KlientZadan,
    id: string,
): Promise<WynikDostepu> {
    const { data, error } = await supabase
        .from('employee_tasks')
        .select(TASK_ACCESS_COLUMNS)
        .eq('id', id)
        .maybeSingle();

    if (error) return { stan: 'awaria' };
    if (!data) return { stan: 'brak' };
    return { stan: 'ok', task: data as TaskAccessRow };
}

/**
 * Kompletna bramka jednego handlera: wczytaj → orzeknij → zwróć odpowiedź albo `null`.
 *
 * Zwraca `null`, gdy wolno przepuścić. W przeciwnym razie gotową odpowiedź:
 * 404 dla „nie ma / nie twoje" (nierozróżnialne celowo) i 503 dla awarii odczytu,
 * żeby klient odróżnił „tego zadania nie ma" od „nie udało się sprawdzić".
 */
export async function bramkaZadania(
    supabase: KlientZadan,
    id: string,
    userId: string,
): Promise<{ odmowa: NextResponse | null; task: TaskAccessRow | null }> {
    const wynik = await loadTaskForAccess(supabase, id);

    if (wynik.stan === 'awaria') {
        console.error('[TaskAccess] Nie udało się sprawdzić dostępu do zadania', id);
        return {
            odmowa: NextResponse.json(
                { error: 'Nie udało się sprawdzić dostępu do zadania. Spróbuj ponownie.' },
                { status: 503 },
            ),
            task: null,
        };
    }

    if (wynik.stan === 'brak' || !canAccessTask(wynik.task, userId)) {
        return { odmowa: taskNotFound(), task: null };
    }

    return { odmowa: null, task: wynik.task };
}
