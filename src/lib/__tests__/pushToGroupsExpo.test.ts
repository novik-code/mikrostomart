/**
 * Regresja: `pushToGroups` musi umieć dostarczyć powiadomienie na kanał APLIKACJI.
 *
 * Dlaczego ten test istnieje:
 * Funkcja historycznie czytała WYŁĄCZNIE `fcm_tokens` (web-push przeglądarki) i nigdy
 * nie wołała Expo. Tokeny aplikacji żyją w `staff_push_tokens` (mig 179), więc push
 * „🏖 Nowy wniosek urlopowy" nie miał ŻADNEJ drogi na telefon admina. Objaw był mylący,
 * bo `logPush` wykonuje się niezależnie od dostarczenia — powiadomienie pojawiało się
 * w historii Alertów i wyglądało na wysłane. Ta sama klasa błędu co w `broadcastPush`.
 *
 * Test pilnuje czterech rzeczy naraz:
 *  1. z `alsoApp` kanał Expo DOSTAJE odbiorców,
 *  2. bez flagi NIE dostaje (opt-in jest świadomy — funkcję woła kilkanaście miejsc,
 *     a włączenie wszystkich naraz zalałoby zespół banerami),
 *  3. odbiorcy są DEDUPLIKOWANI ponad grupami (jedna osoba w `admin` i `reception`
 *     dostawałaby dwa identyczne banery),
 *  4. pacjenci NIE trafiają na kanał personelu (mają własną tabelę tokenów).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendExpoPushToStaffManyMock = vi.fn();
const sendExpoPushToPatientMock = vi.fn();

/** Wiersze zwracane per tabela — ustawiane w każdym teście. */
let tables: Record<string, unknown[]>;

function makeQuery(rows: unknown[]) {
    const q: Record<string, unknown> = {};
    // ⚠️ Ta lista musi nadążać za realnym API supabase-js. Brakujący modyfikator nie
    // daje „pustego wyniku", tylko `TypeError: q.X is not a function` — czyli test pada
    // z powodu ATRAPY, nie z powodu kodu. Tak weszło `range`: stronicowanie odbiorców
    // (limit 1000 wierszy PostgREST) wywróciło pięć testów, choć produkcyjny kod był poprawny.
    for (const m of ['select', 'eq', 'in', 'neq', 'insert', 'delete', 'update', 'order', 'limit', 'contains', 'range']) {
        q[m] = () => q;
    }
    // Thenable — `await supabase.from(x).select().eq()` rozwiązuje się tutaj.
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (table: string) => makeQuery(tables[table] ?? []),
    }),
}));

vi.mock('@/lib/firebase', () => ({ getMessaging: () => { throw new Error('FCM nie powinien być wołany bez tokenów'); } }));
vi.mock('../firebase', () => ({ getMessaging: () => { throw new Error('FCM nie powinien być wołany bez tokenów'); } }));

vi.mock('../expoPush', () => ({
    sendExpoPushToStaffMany: (...a: unknown[]) => sendExpoPushToStaffManyMock(...a),
    sendExpoPushToPatient: (...a: unknown[]) => sendExpoPushToPatientMock(...a),
}));

vi.mock('../taskAssignees', () => ({ assigneeUserIds: () => [] }));

const ADMIN_A = '11111111-1111-4111-8111-111111111111';
const ADMIN_B = '22222222-2222-4222-8222-222222222222';
const PATIENT = '33333333-3333-4333-8333-333333333333';

const PAYLOAD = {
    title: '🏖 Nowy wniosek urlopowy',
    body: 'Jan Kowalski: Urlop wypoczynkowy, 2026-08-03 – 2026-08-07',
    url: '/admin?tab=leaves',
    tag: 'leave-new',
    data: { type: 'leave_request' },
};

beforeEach(() => {
    vi.clearAllMocks();
    // Wysyłka jest fire-and-forget (`void ...().catch(...)`), więc mock MUSI zwracać
    // obietnicę — inaczej `.catch` leci na `undefined` i wywraca całą trasę.
    sendExpoPushToStaffManyMock.mockResolvedValue({ sent: 1, failed: 0 });
    sendExpoPushToPatientMock.mockResolvedValue({ sent: 0, failed: 0 });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    tables = {
        user_roles: [
            { user_id: ADMIN_A, email: 'a@example.com' },
            { user_id: ADMIN_B, email: 'b@example.com' },
        ],
        // loadStaffActivity — obaj aktywni, żeby nie odsiać ich przed wysyłką.
        employees: [
            { user_id: ADMIN_A, email: 'a@example.com', is_active: true },
            { user_id: ADMIN_B, email: 'b@example.com', is_active: true },
        ],
        push_notifications_log: [],
        // Pusto CELOWO: bez tokenów FCM `sendToTokens` kończy się od razu, więc test
        // mierzy wyłącznie kanał Expo i nie potrzebuje Firebase.
        fcm_tokens: [],
    };
});

describe('pushToGroups — kanał aplikacji mobilnej', () => {
    it('z alsoApp wysyła na Expo do wszystkich odbiorców grupy', async () => {
        const { pushToGroups } = await import('../pushService');
        await pushToGroups(['admin'], PAYLOAD, { alsoApp: true });

        expect(sendExpoPushToStaffManyMock).toHaveBeenCalledTimes(1);
        const [userIds, payload] = sendExpoPushToStaffManyMock.mock.calls[0];
        expect([...(userIds as string[])].sort()).toEqual([ADMIN_A, ADMIN_B].sort());
        expect((payload as { title: string }).title).toBe(PAYLOAD.title);
        // `url` i `data` muszą dojechać — po nich apka rozpoznaje, który ekran otworzyć.
        expect((payload as { data: Record<string, unknown> }).data).toMatchObject({
            type: 'leave_request',
            url: '/admin?tab=leaves',
        });
    });

    it('BEZ flagi nie dotyka kanału Expo (opt-in jest świadomy)', async () => {
        const { pushToGroups } = await import('../pushService');
        await pushToGroups(['admin'], PAYLOAD);
        expect(sendExpoPushToStaffManyMock).not.toHaveBeenCalled();
    });

    it('deduplikuje odbiorcę należącego do dwóch grup', async () => {
        const { pushToGroups } = await import('../pushService');
        // `reception` rozwiązuje się przez `employees`, gdzie leży ten sam ADMIN_A.
        await pushToGroups(['admin', 'reception'], PAYLOAD, { alsoApp: true });

        expect(sendExpoPushToStaffManyMock).toHaveBeenCalledTimes(1);
        const [userIds] = sendExpoPushToStaffManyMock.mock.calls[0];
        const ids = userIds as string[];
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('nie wysyła pacjentów na kanał personelu', async () => {
        tables.user_roles = [{ user_id: PATIENT, email: null }];
        const { pushToGroups } = await import('../pushService');
        await pushToGroups(['patients'], PAYLOAD, { alsoApp: true });

        // Pacjenci mają własną tabelę tokenów (`patient_push_tokens`) i własny prymityw.
        expect(sendExpoPushToStaffManyMock).not.toHaveBeenCalled();
    });

    it('nie woła Expo, gdy grupa jest pusta', async () => {
        tables.user_roles = [];
        tables.employees = [];
        const { pushToGroups } = await import('../pushService');
        await pushToGroups(['admin'], PAYLOAD, { alsoApp: true });
        expect(sendExpoPushToStaffManyMock).not.toHaveBeenCalled();
    });
});

/**
 * Potwierdzenie obecności pacjenta: zgłoszone z produkcji jako „Telegram przychodzi,
 * push nie". Przyczyna: `broadcastPush` bez `alsoApp` wysyła wyłącznie web-push FCM,
 * a token przeglądarki zgłaszającego był sprzed 3,5 miesiąca. Kanał aplikacji nie
 * istniał na tej ścieżce w ogóle.
 */
describe('broadcastPush — kanał aplikacji i wyciszenia', () => {
    beforeEach(() => {
        tables.employees = [
            { user_id: ADMIN_A, email: 'a@example.com', is_active: true },
            { user_id: ADMIN_B, email: 'b@example.com', is_active: true },
        ];
        tables.employee_notification_preferences = [];
    });

    it('z alsoApp wysyła na Expo do personelu', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('employee', 'appointment_confirmed', {}, '/admin', { alsoApp: true });

        expect(sendExpoPushToStaffManyMock).toHaveBeenCalledTimes(1);
        const [ids] = sendExpoPushToStaffManyMock.mock.calls[0];
        expect([...(ids as string[])].sort()).toEqual([ADMIN_A, ADMIN_B].sort());
    });

    it('BEZ flagi nie dotyka kanału Expo', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('employee', 'appointment_confirmed', {}, '/admin');
        expect(sendExpoPushToStaffManyMock).not.toHaveBeenCalled();
    });

    it('pomija osoby, które wyciszyły ten typ powiadomienia', async () => {
        // 🔑 Klucz konfiguracji ma MYŚLNIKI (`appointment-confirmed`), a `notificationType`
        // PODKREŚLENIA (`appointment_confirmed`) — bez konwersji filtr nigdy by nie trafił.
        tables.employee_notification_preferences = [{ user_id: ADMIN_B }];
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('employee', 'appointment_confirmed', {}, '/admin', { alsoApp: true });

        expect(sendExpoPushToStaffManyMock).toHaveBeenCalledTimes(1);
        const [ids] = sendExpoPushToStaffManyMock.mock.calls[0];
        expect(ids).toEqual([ADMIN_A]);
    });

    it('nie wysyła nic, gdy WSZYSCY wyciszyli', async () => {
        tables.employee_notification_preferences = [{ user_id: ADMIN_A }, { user_id: ADMIN_B }];
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('employee', 'appointment_confirmed', {}, '/admin', { alsoApp: true });
        expect(sendExpoPushToStaffManyMock).not.toHaveBeenCalled();
    });

    it('pacjentów nie rusza kanałem personelu', async () => {
        tables.user_roles = [{ user_id: PATIENT, email: null }];
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('patient', 'appointment_confirmed', {}, '/x', { alsoApp: true });
        expect(sendExpoPushToStaffManyMock).not.toHaveBeenCalled();
    });
});
