/**
 * Strażnik okablowania: KAŻDE powiadomienie do personelu musi mieć drogę DO APLIKACJI,
 * a nie tylko do web-pusha w przeglądarce.
 *
 * 🔴 PO CO. `broadcastPush` historycznie czyta wyłącznie `fcm_tokens` (web-push).
 * Kanał aplikacji (Expo) włącza dopiero piąty argument `{ alsoApp: true }`. Wywołanie
 * bez niego wygląda w kodzie identycznie jak poprawne, a `logPush` i tak zapisze
 * powiadomienie w historii „Alerty" — czyli w panelu wygląda na WYSŁANE, choć nigdy
 * nie opuściło serwera w stronę telefonu.
 *
 * 🪤 Zgłoszone z produkcji 2026-08-05: pacjent zarejestrował się w systemie, a admin
 * dostał wyłącznie Telegram. Przyczyną było jedno brakujące `{ alsoApp: true }`
 * w `patients/register/route.ts`. Tego samego dnia okazało się, że `/api/reservations`
 * ma flagę od dawna, a `/api/contact` (ten sam typ zdarzenia, inny formularz) nie —
 * czyli zdarzenie docierało do apki albo nie, zależnie od tego, którędy przyszło.
 *
 * Ten test nie sprawdza, czy push się dostarczył (od tego są receipty). Sprawdza rzecz,
 * której nie widać w przeglądzie kodu: że ktoś nie dołożył KOLEJNEJ wysyłki bez kanału
 * aplikacji — dokładnie tak, jak przy push-first wróciła trzecia trasa wysyłki draftu.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const API_ROOT = path.join(process.cwd(), 'src/app/api');

/**
 * ŚWIADOME WYJĄTKI — wysyłki, które celowo NIE mają kanału aplikacji.
 * Każdy wpis wymaga uzasadnienia. Lista jest zamknięta: nowa pozycja bez decyzji
 * właściciela = czerwony test, a nie cicha zmiana zachowania.
 */
const EXEMPT: { file: string; type: string; why: string }[] = [
    {
        file: 'appointments/confirm/route.ts',
        type: 'appointment_confirmed',
        why: 'Tor `employee`: potwierdzenie leci przy KAŻDYM przypomnieniu (~17 dziennie) i nie wymaga reakcji. '
            + 'Włączenie kanału apki całemu zespołowi wyciszyłoby kanał przez zalanie. Tor `admin` alsoApp MA.',
    },
    {
        file: 'patients/appointments/[id]/confirm-attendance/route.ts',
        type: 'appointment_confirmed',
        why: 'Jak wyżej — ta sama decyzja dla drugiej trasy potwierdzania obecności.',
    },
    {
        file: 'cron/email-ai-drafts/route.ts',
        type: 'task_new',
        why: 'Cron propozycji AI ma ~100 draftów w stanie „czeka" i generuje duplikaty (znany dług). '
            + 'Włączenie kanału apki przed rozstrzygnięciem, czy cron zostaje, zalałoby zespół.',
    },
    {
        file: 'admin/blog/route.ts',
        type: 'new_blog_post',
        why: 'Odbiorcą są WSZYSCY pacjenci, nie personel — to wysyłka marketingowa. '
            + 'Włączenie kanału apki zmienia zasięg komunikacji do pacjentów i wymaga decyzji właściciela, nie poprawki technicznej.',
    },
];

interface Call {
    file: string;
    line: number;
    hasAlsoApp: boolean;
    target: string;
    type: string;
}

/** Zbiera pliki .ts pod wskazanym katalogiem. */
function collectFiles(dir: string): string[] {
    const acc: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) acc.push(...collectFiles(full));
        else if (entry.name.endsWith('.ts')) acc.push(full);
    }
    return acc;
}

/**
 * Wyciąga PEŁNE wywołania `broadcastPush(...)` przez zbilansowanie nawiasów.
 *
 * 🪤 Zwykły grep po linii tu NIE WYSTARCZA i już raz wprowadził w błąd: wywołania
 * bywają wielolinijkowe, a `alsoApp` stoi w ostatniej linii argumentów. Szukanie
 * „linii z broadcastPush bez alsoApp" fałszywie oskarża poprawny kod.
 */
function extractCalls(src: string, file: string): Call[] {
    const calls: Call[] = [];
    const needle = 'broadcastPush(';
    let i = 0;
    while ((i = src.indexOf(needle, i)) !== -1) {
        // Pomiń wywołanie metodą (`mod.broadcastPush(`) i dłuższą nazwę kończącą się
        // tym ciągiem. 🪤 Warunek MUSI patrzeć na znak BEZPOŚREDNIO poprzedzający —
        // wersja tolerująca białe znaki (`/\.\s*$/`) odrzucała poprawne wywołania,
        // nad którymi stał komentarz kończący się kropką.
        const prev = i > 0 ? src[i - 1] : ' ';
        if (prev === '.' || /[A-Za-z0-9_$]/.test(prev)) {
            i += needle.length;
            continue;
        }
        let depth = 0;
        let end = -1;
        for (let j = i + needle.length - 1; j < src.length; j++) {
            if (src[j] === '(') depth++;
            else if (src[j] === ')') {
                depth--;
                if (depth === 0) { end = j; break; }
            }
        }
        if (end === -1) { i += needle.length; continue; }
        const call = src.slice(i, end + 1);
        const args = call.match(/\(\s*['"](patient|employee|admin)['"]\s*,\s*['"]([a-z_]+)['"]/);
        calls.push({
            file,
            line: src.slice(0, i).split('\n').length,
            hasAlsoApp: /alsoApp/.test(call),
            target: args?.[1] ?? '?',
            type: args?.[2] ?? '?',
        });
        i = end;
    }
    return calls;
}

function allCalls(): Call[] {
    return collectFiles(API_ROOT).flatMap(f =>
        extractCalls(fs.readFileSync(f, 'utf8'), path.relative(API_ROOT, f))
    );
}

function isExempt(c: Call): boolean {
    return EXEMPT.some(e => e.file === c.file && e.type === c.type);
}

describe('Strażnik: kanał aplikacji w powiadomieniach', () => {
    it('każde broadcastPush do personelu ma { alsoApp: true } albo stoi na liście świadomych wyjątków', () => {
        const missing = allCalls().filter(c => !c.hasAlsoApp && !isExempt(c));
        const report = missing.map(c => `${c.file}:${c.line} → ${c.target}/${c.type}`).join('\n');
        expect(
            missing,
            missing.length
                ? `Powiadomienia BEZ kanału aplikacji (trafią tylko do przeglądarki, ale w Alertach będą wyglądać na wysłane):\n${report}\n\n`
                  + 'Dodaj { alsoApp: true } jako piąty argument albo dopisz pozycję do EXEMPT wraz z uzasadnieniem.'
                : ''
        ).toEqual([]);
    });

    it('lista wyjątków nie gnije — każdy wpis EXEMPT odpowiada realnemu wywołaniu bez alsoApp', () => {
        const calls = allCalls();
        const stale = EXEMPT.filter(e =>
            !calls.some(c => c.file === e.file && c.type === e.type && !c.hasAlsoApp)
        );
        expect(
            stale.map(e => `${e.file} (${e.type})`),
            'Wpis w EXEMPT nie ma już odpowiednika w kodzie — usuń go, żeby lista nie ukrywała przyszłych błędów.'
        ).toEqual([]);
    });

    it('rejestracja pacjenta powiadamia admina także w aplikacji (regresja z 2026-08-05)', () => {
        const calls = allCalls().filter(c => c.type === 'patient_registered');
        expect(calls.length, 'Zniknęła wysyłka powiadomienia o rejestracji pacjenta').toBeGreaterThan(0);
        expect(calls.every(c => c.hasAlsoApp)).toBe(true);
    });

    /**
     * KAŻDA trasa wysyłająca push do PACJENTA na żądanie człowieka musi liczyć oba kanały.
     *
     * 🔴 Dlaczego lista, a nie pojedynczy plik: 2026-08-05 naprawiono `admin/push-send`
     * i uznano temat za zamknięty, podczas gdy `employee/push/to-patient` — trasa, z której
     * korzysta APKA — dalej wołała `pushToUser`. Pacjent dostawał powiadomienie na telefon
     * i JEDNOCZEŚNIE komunikat „nie włączył powiadomień push". Ta sama klasa błędu co przy
     * push-first: naprawiono jedną trasę z dwóch. Lista wymusza policzenie wszystkich.
     */
    const PATIENT_PUSH_ROUTES = [
        'admin/push-send/route.ts',
        'employee/push/to-patient/route.ts',
    ];

    it.each(PATIENT_PUSH_ROUTES)('%s liczy OBA kanały (pushToPatientAll, nie pushToUser)', (route) => {
        const src = fs.readFileSync(path.join(API_ROOT, route), 'utf8');
        // pushToUser puszcza Expo fire-and-forget i zwraca `sent` liczony tylko z FCM,
        // więc `success: sent > 0` jest fałszem dla pacjenta z samą apką.
        expect(src).toContain('pushToPatientAll');
        expect(src).not.toMatch(/await\s+pushToUser\(/);
    });

    it('żadna trasa wysyłki do pacjenta nie opiera odpowiedzi na pushToUser', () => {
        const offenders = collectFiles(API_ROOT)
            .filter(f => /pushToUser\(\s*\w+\s*,\s*['"]patient['"]/.test(fs.readFileSync(f, 'utf8')))
            .map(f => path.relative(API_ROOT, f));
        expect(
            offenders,
            'pushToUser dla pacjenta zwraca `sent` policzony tylko z fcm_tokens — użyj pushToPatientAll.'
        ).toEqual([]);
    });

    it('ręczna wysyłka nie duplikuje wpisu w historii powiadomień', () => {
        const src = fs.readFileSync(path.join(API_ROOT, 'admin/push-send/route.ts'), 'utf8');
        // Prymitywy wysyłki wołają logPush same — drugi, ręczny insert dawał
        // pacjentowi dwa wiersze w historii dla jednego powiadomienia.
        expect(src).not.toMatch(/from\(['"]push_notifications_log['"]\)\s*\.insert/);
    });

    it('bramka tokenów w panelu pyta o OBA kanały, nie tylko o fcm_tokens', () => {
        const src = fs.readFileSync(path.join(API_ROOT, 'admin/push-send/route.ts'), 'utf8');
        expect(src).toContain('hasPatientAppToken');
        // blokada wolno postawić wyłącznie przy PEWNOŚCI braku tokenów
        expect(src).toMatch(/!hasTokens\s*&&\s*!tokenCheckFailed/);
    });
});

describe('Strażnik: martwy moduł wysyłki', () => {
    const SRC = path.join(process.cwd(), 'src');

    /** Pliki, którym wolno importować `lib/webpush` — docelowo lista ma być pusta. */
    const WOLNO: string[] = [
        'app/api/cron/email-ai-drafts/route.ts', // przepięcie budzi wysyłkę 13×/dobę — decyzja właściciela
    ];

    function zbierz(dir: string): string[] {
        const acc: string[] = [];
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.name === '__tests__' || e.name === 'node_modules') continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) acc.push(...zbierz(full));
            else if (/\.tsx?$/.test(e.name)) acc.push(full);
        }
        return acc;
    }

    it('nikt nowy nie importuje z lib/webpush', () => {
        // `webpush.ts` rozwiązuje odbiorców z `push_subscriptions` — tabeli porzuconej
        // w migracji 104, do której NIC nie pisze. Oba moduły eksportują funkcje o tych
        // samych nazwach (`sendPushToUser`, `broadcastPush`), a podpowiedź importu
        // w edytorze pokazuje jedno i drugie — więc pomyłka jest cicha: typy zielone,
        // testy zielone, powiadomienie nie wychodzi nigdzie.
        const winni = zbierz(SRC)
            .filter(f => !f.endsWith(path.join('lib', 'webpush.ts')))
            .filter(f => /from\s+['"](\.\/webpush|\.\.\/webpush|@\/lib\/webpush)['"]|import\(['"]@\/lib\/webpush['"]\)/.test(fs.readFileSync(f, 'utf8')))
            .map(f => path.relative(SRC, f))
            .filter(rel => !WOLNO.includes(rel));

        expect(
            winni,
            'Te pliki wołają martwy moduł — powiadomienie nie dotrze nigdzie:\n' + winni.join('\n')
        ).toEqual([]);
    });

    it('powiadomienie o zadaniu PRYWATNYM nie trafia do wspólnego feedu', () => {
        const src = fs.readFileSync(path.join(SRC, 'lib/pushService.ts'), 'utf8');
        // Historia „Alerty" jest wspólna dla całego gabinetu (brak warunku na user_id),
        // więc tytuł zadania prywatnego zobaczyłby cały zespół.
        expect(src).toContain('PRIVATE_TASK_TAG_PREFIX');
        expect(src).toMatch(/skipHistory[\s\S]{0,900}PRIVATE_TASK_TAG_PREFIX/);
    });
});
