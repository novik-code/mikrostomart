/**
 * Regresja: TRANSPORT identyfikatorów w `broadcastPush` + treść czatu poza Telegramem.
 *
 * Dlaczego ten test istnieje (decyzje właściciela 2026-08-11, punkty 2 i 3):
 *
 * 1. `broadcastPush` przez cały czas budował payload jako `{ title, body, url }`, a kanał
 *    Expo dostawał ZASZYTE `data: url ? { url } : {}`. Nie było czym przenieść szczegółu
 *    pod odblokowanie ekranu. To jest bramka przed neutralizacją treści: neutralizacja
 *    bez transportu nie „chowa" informacji, tylko ją KASUJE. Stąd kolejność
 *    transport → deep-link → neutralizacja i stąd ten strażnik — pilnuje pierwszego
 *    kroku, żeby trzeci nie wszedł na pustym miejscu.
 *
 * 2. Wiadomość pacjenta szła na Telegram razem z 200 znakami treści i nazwiskiem, czyli
 *    dane o zdrowiu powiązane z tożsamością trafiały do pośrednika bez umowy powierzenia
 *    (art. 28 RODO). Właściciel wybrał wariant B: sam sygnał + link.
 *
 * 🔑 Kontrola treści idzie SKANEM ŹRÓDŁA, nie wywołaniem: obie trasy czatu mają własne
 *    kopie tego samego wzorca, a trzecia kopia w przyszłości ma paść tutaj, a nie na
 *    produkcji. (Lekcja: strażnik przypięty do jednego pliku powiela błąd, któremu
 *    ma zapobiegać.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const sendExpoPushToStaffManyMock = vi.fn();
const sendExpoPushToPatientMock = vi.fn();

let tables: Record<string, unknown[]>;

function makeQuery(rows: unknown[]) {
    const q: Record<string, unknown> = {};
    // ⚠️ Lista musi nadążać za realnym API supabase-js — brakujący modyfikator daje
    // `TypeError: q.X is not a function`, czyli pada ATRAPA, nie kod produkcyjny.
    for (const m of ['select', 'eq', 'in', 'neq', 'insert', 'delete', 'update', 'order', 'limit', 'contains', 'range']) {
        q[m] = () => q;
    }
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (table: string) => makeQuery(tables[table] ?? []) }),
}));
vi.mock('@/lib/firebase', () => ({ getMessaging: () => { throw new Error('FCM bez tokenów nie powinien być wołany'); } }));
vi.mock('../firebase', () => ({ getMessaging: () => { throw new Error('FCM bez tokenów nie powinien być wołany'); } }));
vi.mock('../expoPush', () => ({
    sendExpoPushToStaffMany: (...a: unknown[]) => sendExpoPushToStaffManyMock(...a),
    sendExpoPushToPatient: (...a: unknown[]) => sendExpoPushToPatientMock(...a),
}));
vi.mock('../taskAssignees', () => ({ assigneeUserIds: () => [] }));

const ADMIN = '11111111-1111-4111-8111-111111111111';
const CONVERSATION = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
    vi.clearAllMocks();
    // Wysyłka jest fire-and-forget (`void ...().catch()`), więc mock MUSI zwrócić obietnicę.
    sendExpoPushToStaffManyMock.mockResolvedValue({ sent: 1, failed: 0 });
    sendExpoPushToPatientMock.mockResolvedValue({ sent: 0, failed: 0 });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    tables = {
        user_roles: [{ user_id: ADMIN, email: 'a@example.com' }],
        employees: [{ user_id: ADMIN, email: 'a@example.com', is_active: true }],
        push_notifications_log: [],
        employee_notification_preferences: [],
        fcm_tokens: [], // pusto celowo — mierzymy wyłącznie kanał Expo
    };
});

describe('broadcastPush — transport identyfikatorów na kanał aplikacji', () => {
    it('przenosi opts.data do payloadu Expo (obok url, dla wstecznej zgodności)', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('admin', 'chat_patient_to_admin', { name: 'X', message: 'Y' }, '/pracownik?tab=czat', {
            alsoApp: true,
            data: { type: 'staff_patient_chat', conversationId: CONVERSATION },
        });

        expect(sendExpoPushToStaffManyMock).toHaveBeenCalledTimes(1);
        const payload = sendExpoPushToStaffManyMock.mock.calls[0][1] as { data: Record<string, unknown> };
        // Identyfikatory MUSZĄ dojechać — bez nich apka otwiera listę zamiast rozmowy.
        expect(payload.data).toMatchObject({
            type: 'staff_patient_chat',
            conversationId: CONVERSATION,
        });
        // `url` zostaje: binarka 1.2.0 ze sklepów rozpoznaje część powiadomień po nim.
        expect(payload.data.url).toBe('/pracownik?tab=czat');
    });

    it('mapuje opts.tag na collapseId (pole Expo nazywa się inaczej niż w web-pushu)', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('admin', 'chat_patient_to_admin', {}, '/pracownik?tab=czat', {
            alsoApp: true,
            tag: `patient-chat-${CONVERSATION}`,
        });

        const payload = sendExpoPushToStaffManyMock.mock.calls[0][1] as Record<string, unknown>;
        expect(payload.collapseId).toBe(`patient-chat-${CONVERSATION}`);
        // Gdyby ktoś przekazał `tag`, Expo zignorowałoby je po cichu — nic by się nie zwijało.
        expect(payload.tag).toBeUndefined();
    });

    it('bez opts.data zachowuje się dokładnie jak przed zmianą', async () => {
        const { broadcastPush } = await import('../pushService');
        await broadcastPush('admin', 'chat_patient_to_admin', {}, '/pracownik?tab=czat', { alsoApp: true });

        const payload = sendExpoPushToStaffManyMock.mock.calls[0][1] as { data: Record<string, unknown> };
        expect(payload.data).toEqual({ url: '/pracownik?tab=czat' });
    });
});

/** Trasy czatu, które powiadamiają recepcję o wiadomości od pacjenta lub gościa. */
const API_ROOT = join(process.cwd(), 'src', 'app', 'api');

function allRouteFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...allRouteFiles(full));
        else if (entry === 'route.ts') out.push(full);
    }
    return out;
}

describe('Telegram — treść wiadomości pacjenta nie opuszcza systemu', () => {
    it('żadna trasa czatu nie wkleja treści ani nadawcy do powiadomienia Telegrama', () => {
        const offenders: string[] = [];

        for (const file of allRouteFiles(API_ROOT)) {
            const src = readFileSync(file, 'utf8');
            // Interesują nas wyłącznie trasy, które NAPRAWDĘ wysyłają czat na Telegram.
            if (!src.includes('sendTelegramNotification')) continue;
            if (!/NOWA WIADOMOŚĆ CZAT|NOWA ROZMOWA CZAT/.test(src)) continue;

            // Wyciągamy treść przypisania `const telegramMsg = ...;` (szablon bywa wielolinijkowy).
            const m = src.match(/const\s+telegramMsg\s*=\s*([\s\S]*?);\n/);
            if (!m) {
                offenders.push(`${file}: nie znaleziono telegramMsg — wzorzec się rozjechał, sprawdź ręcznie`);
                continue;
            }
            const msg = m[1];
            // Zakazane podstawienia: treść wiadomości i tożsamość nadawcy.
            for (const banned of ['content', 'patientName', 'senderName', 'guestName']) {
                if (new RegExp(`\\$\\{[^}]*\\b${banned}\\b`).test(msg)) {
                    offenders.push(`${file}: telegramMsg podstawia \`${banned}\``);
                }
            }
        }

        expect(offenders, `Telegram nie ma umowy powierzenia z art. 28 — do wiadomości idzie sam sygnał i link:\n${offenders.join('\n')}`)
            .toEqual([]);
    });

    it('obie trasy czatu przekazują conversationId do pusha (inaczej apka otworzy listę)', () => {
        const routes = [
            join(API_ROOT, 'patients', 'chat', 'route.ts'),
            join(API_ROOT, 'chat', 'guest', 'route.ts'),
        ];
        for (const file of routes) {
            const src = readFileSync(file, 'utf8');
            expect(src, `${file} musi nieść conversationId w data pusha`).toMatch(/conversationId:/);
            expect(src, `${file} musi oznaczać typ, po którym apka rozpozna cel`).toContain('staff_patient_chat');
        }
    });
});
