/**
 * Neutralizacja treści powiadomień personelu (decyzja właściciela: wariant A).
 *
 * Sedno: **na ekran blokady idzie sam rodzaj zdarzenia, pełna treść zostaje w historii.**
 * Baner widzi każdy, kto stoi obok telefonu — także pacjent w poczekalni. Historia
 * („Alerty") jest za logowaniem i personel ma prawo widzieć w niej nazwiska.
 *
 * 🪤 Ten test powstał, bo przy wdrażaniu popełniłem OBA możliwe błędy naraz:
 *  1. globalna podmiana kanałów trafiła też w `logPushMany` — czyli zneutralizowałaby
 *     HISTORIĘ, dokładnie odwrotnie do zamiaru,
 *  2. `sendExpoPushToStaffMany` było wołane w OŚMIU miejscach, nie w dwóch, które
 *     zmapowałem — pominięte kanały dostarczałyby dalej pełne nazwisko.
 * Oba przeszłyby `tsc` i oba są niewidoczne bez pomiaru.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const sendExpoPushToStaffManyMock = vi.fn();
const sendExpoPushToPatientMock = vi.fn();
/** Wiersze wstawione do `push_notifications_log` — czyli to, co widzi feed „Alerty". */
let historyRows: Record<string, unknown>[] = [];
let tables: Record<string, unknown[]>;

function makeQuery(table: string, rows: unknown[]) {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'neq', 'delete', 'update', 'order', 'limit', 'contains', 'range']) {
        q[m] = () => q;
    }
    q.insert = (payload: unknown) => {
        if (table === 'push_notifications_log') {
            historyRows.push(...(Array.isArray(payload) ? payload : [payload]) as Record<string, unknown>[]);
        }
        return q;
    };
    q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(resolve);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => makeQuery(t, tables[t] ?? []) }),
}));
vi.mock('@/lib/firebase', () => ({ getMessaging: () => { throw new Error('brak tokenów FCM'); } }));
vi.mock('../firebase', () => ({ getMessaging: () => { throw new Error('brak tokenów FCM'); } }));
vi.mock('../expoPush', () => ({
    sendExpoPushToStaffMany: (...a: unknown[]) => sendExpoPushToStaffManyMock(...a),
    sendExpoPushToPatient: (...a: unknown[]) => sendExpoPushToPatientMock(...a),
}));
vi.mock('../taskAssignees', () => ({ assigneeUserIds: () => [] }));

const ADMIN = '11111111-1111-4111-8111-111111111111';
const NAZWISKO = 'Jan Kowalski';
const TRESC = 'od wczoraj ropieje po ekstrakcji, jestem po chemii';

beforeEach(() => {
    vi.clearAllMocks();
    historyRows = [];
    sendExpoPushToStaffManyMock.mockResolvedValue({ sent: 1, failed: 0 });
    sendExpoPushToPatientMock.mockResolvedValue({ sent: 0, failed: 0 });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    tables = {
        user_roles: [{ user_id: ADMIN }],
        employees: [{ user_id: ADMIN, email: 'a@example.com', is_active: true }],
        push_notifications_log: [],
        employee_notification_preferences: [],
        fcm_tokens: [],
    };
});

describe('Powiadomienie personelu: baner neutralny, historia pełna', () => {
    it('🔴 treść wiadomości pacjenta NIE trafia na ekran blokady', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush(
            'admin',
            'chat_patient_to_admin',
            { name: NAZWISKO, message: TRESC },
            '/pracownik?tab=czat',
            { alsoApp: true, data: { type: 'staff_patient_chat' } },
        );

        expect(sendExpoPushToStaffManyMock).toHaveBeenCalledTimes(1);
        const dostarczone = sendExpoPushToStaffManyMock.mock.calls[0][1] as { title: string; body: string };
        expect(dostarczone.body).toBe('Otwórz, aby zobaczyć szczegóły.');
        expect(dostarczone.body).not.toContain('Kowalski');
        expect(dostarczone.body).not.toContain('chemii');
        // 🔑 TYTUŁ ZOSTAJE — wszystkie tytuły personelu są już neutralne („💬 Nowa
        // wiadomość na czacie"), więc recepcja zachowuje wartość segregacyjną baneru.
        expect(dostarczone.title).toContain('Nowa wiadomość');
    });

    it('…a JEDNOCZEŚNIE historia zachowuje pełną treść', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('admin', 'chat_patient_to_admin', { name: NAZWISKO, message: TRESC }, '/x', {
            alsoApp: true,
        });

        expect(historyRows.length).toBeGreaterThan(0);
        const body = String(historyRows[0].body);
        expect(body).toContain(NAZWISKO);
        expect(body).toContain('ropieje');
    });

    it('pacjent dostaje SWOJE dane na SWÓJ telefon — bez neutralizacji', async () => {
        const { broadcastPush } = await import('../pushService');
        // Zabranie pacjentowi treści zamienia powiadomienie w zagadkę — to nie jest
        // ten sam przypadek co ekran blokady całego zespołu.
        await broadcastPush('patient', 'appointment_24h', { time: '10:00', doctor: 'Nowosielski', type: 'kontrola' }, '/x');
        const wiersz = historyRows.find((r) => String(r.body).includes('10:00'));
        expect(wiersz, 'treść dla pacjenta nie powinna być ruszana').toBeTruthy();
    });

    it('typ pacjencki nie ma wariantu neutralnego, personalny ma', async () => {
        const { getNeutralPushBody } = await import('../pushTranslations');
        expect(getNeutralPushBody('appointment_24h', 'pl')).toBeNull();
        expect(getNeutralPushBody('chat_admin_to_patient', 'pl')).toBeNull();
        expect(getNeutralPushBody('chat_patient_to_admin', 'pl')).toBe('Otwórz, aby zobaczyć szczegóły.');
        expect(getNeutralPushBody('appointment_rescheduled', 'pl')).toBeTruthy();
        expect(getNeutralPushBody('task_new', 'de')).toBeTruthy();
    });
});

describe('Strażnik okablowania — żaden kanał nie może ominąć neutralizacji', () => {
    const src = () => readFileSync(join(process.cwd(), 'src/lib/pushService.ts'), 'utf8');

    it('każde wysłanie przez Expo/FCM idzie przez deliveredContent', () => {
        // 🪤 Przy wdrażaniu naliczyłem DWA takie kanały, a jest ich osiem. Pominięty
        // kanał dostarczałby dalej pełne nazwisko przy zielonym `tsc`.
        const s = src();
        const surowe = [...s.matchAll(/^\s*title: payload\.title,\s*$/gm)].length;
        // Dozwolone są dokładnie DWA — oba w zapisie do historii.
        expect(surowe, 'kanał dostarczania czyta surowy payload.title zamiast deliveredContent').toBe(2);
        expect((s.match(/deliveredContent\(payload\)/g) || []).length).toBeGreaterThanOrEqual(8);
    });

    it('historia NIE jest neutralizowana', () => {
        const s = src();
        // Wstawki do `push_notifications_log` muszą brać pełną treść — inaczej feed
        // „Alerty" straciłby informację bez żadnego zysku dla prywatności.
        // Szukamy po MIEJSCU WYWOŁANIA, nie po kształcie tekstu — regex na bloku
        // okazał się kruchy i milczał, zamiast cokolwiek sprawdzić (czyli byłby
        // strażnikiem-atrapą: zielony niezależnie od stanu kodu).
        const linie = s.split('\n');
        const inserty = linie
            .map((l, i) => ({ l, i }))
            .filter((x) => x.l.includes("push_notifications_log').insert("));
        expect(inserty.length, 'nie znaleziono zapisów do historii — wzorzec się rozjechał').toBe(2);
        for (const { i } of inserty) {
            const blok = linie.slice(i, i + 12).join('\n');
            expect(blok, 'zapis historii używa deliveredContent — to neutralizuje feed').not.toContain('deliveredContent');
            expect(blok, 'zapis historii musi brać pełną treść').toContain('title: payload.title');
        }
    });

    it('log konsoli nie wypisuje treści powiadomienia', () => {
        // Logi Vercela żyją poza audytem, retencją i eksportem RODO.
        expect(src()).not.toMatch(/console\.log\([^)]*payload\.body/);
    });
});
