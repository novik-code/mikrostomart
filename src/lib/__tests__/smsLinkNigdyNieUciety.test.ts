/**
 * STRAŻNIK: SMS może zostać przycięty do jednej części, ale link w nim — nigdy.
 *
 * ══ CO BYŁO ZEPSUTE (zmierzone 2026-09-17) ══════════════════════════════════
 * `toGSM7` ucinał każdy tekst powyżej 160 znaków do 157 + „...”. Link stoi na końcu
 * przypomnienia, więc to on tracił końcówkę. Pacjent Mieczysław Kożuch (wizyta 17.09, 11:00)
 * dostał `…/s/KjYmag` zamiast `…/s/KjYmagIv3P`, bo szkic miał 161 znaków (dwie nowe linie
 * przed linkiem, niewidoczne w panelu). Od 01.06: 244 z 1574 przypomnień z uciętym linkiem.
 *
 * Test WYKONUJE `toGSM7` oraz `sendSMS` aż do treści wysłanej do SMSAPI.
 * DOWÓD, ŻE GRYZIE (cofka): przywrócenie `substring(0, 157) + '...'` → 🔴 trzy testy z linkiem.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toGSM7, sendSMS } from '@/lib/smsService';

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { value: { token: 'tok' } } }) }) }) }),
    }),
}));

/** Szkic z produkcji (sms_reminders d30615b0…), znak w znak. */
const KOZUCH = 'Dzien dobry, Mikrostomart przypomina: wizyta u higienistki Elzbieta Nowosielska jutro o 11:00. Prosimy o potwierdzenie:\n\nhttps://www.mikrostomart.pl/s/KjYmagIv3P';
/** Szkic z produkcji (sms_reminders 56654bc5…) — 178 znaków, zwinięcie nowych linii nie wystarcza. */
const DLUGA_DATA = 'Dzien dobry, Mikrostomart przypomina: wizyta u higienistki Elzbieta Nowosielska w poniedziałek, 3 sierpnia o 11:00. Prosimy o potwierdzenie:\n\nhttps://www.mikrostomart.pl/s/ehssBTab12';

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('SMS · link nigdy nie jest ucinany', () => {
    it('KONTROLA MIERNIKA: szkic pacjenta ma 161 znaków, czyli wchodzi w gałąź przycinania', () => {
        expect(KOZUCH.length).toBe(161);
    });

    it('🔴 161 znaków z nowymi liniami → zwinięte do jednej części, link cały', () => {
        const wynik = toGSM7(KOZUCH);
        expect(wynik).toContain('https://www.mikrostomart.pl/s/KjYmagIv3P');
        expect(wynik.length).toBeLessThanOrEqual(160);
    });

    it('🔴 za długi nawet po zwinięciu → wysyłany w całości (dwie części), link cały', () => {
        const wynik = toGSM7(DLUGA_DATA);
        expect(wynik).toMatch(/https:\/\/www\.mikrostomart\.pl\/s\/ehssBTab12$/);
        expect(wynik.length).toBeGreaterThan(160);
    });

    it('bez linku dalej przycina do 160 znaków (koszt jednej części)', () => {
        const wynik = toGSM7('a'.repeat(100) + ' ' + 'b'.repeat(100));
        expect(wynik).toHaveLength(160);
        expect(wynik.endsWith('...')).toBe(true);
    });

    it('link na początku, długi tekst za nim → przycina, ale link zostaje cały', () => {
        const wynik = toGSM7('https://www.mikrostomart.pl/s/Abc123XyZ9 ' + 'x'.repeat(200));
        expect(wynik).toHaveLength(160);
        expect(wynik.startsWith('https://www.mikrostomart.pl/s/Abc123XyZ9 ')).toBe(true);
    });

    it('🔴 sendSMS wysyła do SMSAPI pełny link', async () => {
        const wyslane: string[] = [];
        vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
            wyslane.push(JSON.parse(init.body).message);
            return { ok: true, json: async () => ({ list: [{ id: 'm1', points: 0.17 }] }) };
        });
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
        await sendSMS({ to: '+48600000000', message: KOZUCH });
        expect(wyslane).toHaveLength(1);
        expect(wyslane[0]).toContain('/s/KjYmagIv3P');
        vi.unstubAllGlobals();
    });
});
