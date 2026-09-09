/**
 * AWARIA 2026-09-09 — pacjenci nie mogli potwierdzić wizyty z powiadomienia.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * Apka rozpoznaje powiadomienie o wizycie WYŁĄCZNIE po
 * `data.type === 'appointment_reminder'` (`NotificationRouter` w repo apki) i dopiero
 * wtedy otwiera ekran `potwierdz-wizyte` z tokenem. Cron `push-appointment-1h`,
 * czyli ten, który realnie dociera do pacjentów godzinę przed wizytą (chodzi co
 * 15 minut, obejmuje wszystkich z żywym tokenem), wysyłał:
 *
 *     { title, body, url: '/strefa-pacjenta/dashboard' }        ← BEZ `data`
 *
 * Tapnięcie wpadało więc w fallback i otwierało ekran główny. Pacjent nie miał jak
 * potwierdzić, odwołać ani przełożyć wizyty.
 *
 * ══ DLACZEGO TO WRÓCIŁO ═════════════════════════════════════════════════════
 * Push o wizycie produkowały TRZY miejsca, każde z własną kopią kodu. Dwa
 * (`sms-auto-send`, `lib/reminderDelivery`) dostały `data.type` i token, trzecie nie.
 * To PIĄTY nawrót tej samej klasy w tym projekcie („naprawa objęła jedną trasę
 * z kilku"), więc strażnik celuje w ŁADUNEK PRZEKAZANY DO WYSYŁKI, a nie w to,
 * czy w pliku stoi jakiś napis.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const wyslaneLadunki: Array<Record<string, unknown>> = [];

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@/lib/cronHeartbeat', () => ({ logCronHeartbeat: async () => {} }));
vi.mock('@/lib/pushHealth', () => ({ recordPushPath: async () => {} }));
vi.mock('@/lib/pushTranslations', () => ({
    getPushTranslation: () => ({ title: 'Przypomnienie o wizycie', body: 'Wizyta o 14:00' }),
}));
vi.mock('@/lib/brandConfig', () => ({ brand: { appUrl: 'https://www.mikrostomart.pl' } }));
vi.mock('@/lib/pushService', () => ({
    pushToPatientAll: async (_id: string, payload: Record<string, unknown>) => {
        wyslaneLadunki.push(payload);
        return { sent: 1, fcm: { sent: 1, failed: 0 }, expo: { sent: 0, failed: 0 } };
    },
}));

/** Wizyta 60 minut w przyszłość — środek okna 45–75 min, którego pilnuje cron. */
const zaGodzine = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const WIZYTA = { id: '0100235682', date: '', patientId: '0100007883', doctor: { name: 'dr Kowalski' } };

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ appointments: [{ ...WIZYTA, date: zaGodzine() }] }),
    }),
}));

/** Czy `appointment_actions` i `short_links` mają wiersz (czyli czy token istnieje). */
let tokenIstnieje = true;

vi.mock('@supabase/supabase-js', () => {
    const wynik = (data: unknown) => ({ data, error: null });
    const budujZapytanie = (tabela: string) => {
        const api: Record<string, unknown> = {
            select: () => api,
            eq: () => api,
            gte: () => api,
            lte: () => api,
            limit: () => api,
            maybeSingle: async () => {
                if (tabela === 'patients') return wynik({ id: 'uuid-konta', notification_preferences: null });
                if (tabela === 'appointment_actions') {
                    return tokenIstnieje
                        ? wynik({ id: 'akcja-1', confirmation_token: 'TOKEN123456ABCD' })
                        : wynik(null);
                }
                if (tabela === 'short_links') {
                    return tokenIstnieje ? wynik({ short_code: 'Q4qJyYJ-AD' }) : wynik(null);
                }
                return wynik(null);
            },
            then: (res: (v: unknown) => void) => {
                // `patient_push_tokens` / `fcm_tokens` — pacjent MA żywy token.
                if (tabela === 'patient_push_tokens') return res(wynik([{ id: 't1' }]));
                if (tabela === 'fcm_tokens') return res(wynik([]));
                // `push_notifications_log` — dedup: nic jeszcze nie wysłano.
                return res(wynik([]));
            },
        };
        return api;
    };
    return { createClient: () => ({ from: (t: string) => budujZapytanie(t) }) };
});

beforeEach(() => {
    wyslaneLadunki.length = 0;
    tokenIstnieje = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'.repeat(40);
});

async function odpalCron() {
    const { GET } = await import('@/app/api/cron/push-appointment-1h/route');
    return GET(new Request('https://x/api/cron/push-appointment-1h'));
}

describe('push godzinę przed wizytą prowadzi do POTWIERDZENIA, nie na ekran główny', () => {
    it('wysyła dokładnie jeden push dla wizyty w oknie', async () => {
        // Kontrola, że strażnik mierzy właściwą rzecz: gdyby cron nic nie wysłał,
        // wszystkie asercje niżej przechodziłyby na pustce.
        await odpalCron();
        expect(wyslaneLadunki).toHaveLength(1);
    });

    it('🔴 ładunek niesie `data.type = appointment_reminder`', async () => {
        // TO JEST SEDNO AWARII. Bez tego pola apka nie rozpoznaje powiadomienia
        // i otwiera ekran główny zamiast ekranu potwierdzenia.
        await odpalCron();
        const data = wyslaneLadunki[0].data as Record<string, unknown>;
        expect(data, 'ładunek MUSI mieć pole `data`').toBeTruthy();
        expect(data.type).toBe('appointment_reminder');
    });

    it('🔴 ładunek niesie `confirmationToken`, gdy token istnieje', async () => {
        await odpalCron();
        const data = wyslaneLadunki[0].data as Record<string, unknown>;
        expect(data.confirmationToken).toBe('TOKEN123456ABCD');
    });

    it('adres prowadzi na ten sam short link, co SMS — nie na pulpit', async () => {
        await odpalCron();
        expect(wyslaneLadunki[0].url).toBe('https://www.mikrostomart.pl/s/Q4qJyYJ-AD');
        expect(wyslaneLadunki[0].url).not.toContain('/dashboard');
    });

    it('BRAK tokenu nie zabiera `data.type` — apka dalej rozpoznaje powiadomienie', async () => {
        // Gorszy wariant ma być DEGRADACJĄ, nie powrotem do awarii: bez tokenu
        // apka otwiera ekran potwierdzenia i poprosi o zalogowanie, zamiast
        // wyrzucać człowieka na ekran główny bez żadnej akcji.
        tokenIstnieje = false;
        await odpalCron();
        const data = wyslaneLadunki[0].data as Record<string, unknown>;
        expect(data.type).toBe('appointment_reminder');
        expect(data.confirmationToken).toBeUndefined();
    });
});
