/**
 * Pseudonimizacja danych wychodzących do modelu.
 *
 * Wymaganie właściciela (2026-07-29): „żadnych danych wrażliwych do OpenAI,
 * pełna anonimizacja". Te testy pilnują, żeby żaden identyfikator nie wyszedł
 * poza serwer — i żeby użytkownik mimo to widział prawdziwe dane.
 *
 * Przypadki wzięte z REALNYCH notatek z produkcji: numer konta w opisie wizyty,
 * „wycisk do pracowni pani Kasi", nazwiska personelu wplecione w tekst.
 */
import { describe, it, expect } from 'vitest';
import { createScrubber } from '../aiAnonymizer';

describe('createScrubber — co NIE MOŻE wyjść do modelu', () => {
    it('ukrywa nazwisko pacjenta i oddaje je w odpowiedzi', () => {
        const s = createScrubber();
        s.learn('Radosław Kolasa', 'PACJENT');
        const out = s.scrub('09:00 — Radosław Kolasa, chirurgia');
        expect(out).not.toContain('Kolasa');
        expect(out).toContain('PACJENT_1');
        expect(s.restore(out)).toContain('Radosław Kolasa');
    });

    it('ukrywa SAMO NAZWISKO, gdy w tekście pada bez imienia', () => {
        const s = createScrubber();
        s.learn('Małgorzata Maćków-Huras', 'LEKARZ');
        const out = s.scrub('wycisk oddany do Maćków-Huras w czwartek');
        expect(out).not.toMatch(/Maćków/);
    });

    it('ukrywa numer konta z notatki (realny przypadek)', () => {
        const s = createScrubber();
        const out = s.scrub('Prosimy o wpłatę na konto 5910501504100 przed zabiegiem');
        expect(out).not.toContain('5910501504100');
        expect(out).toMatch(/KONTO_1/);
        expect(s.restore(out)).toContain('5910501504100');
    });

    it('ukrywa PESEL, telefon i e-mail', () => {
        const s = createScrubber();
        const out = s.scrub('PESEL 90010123671, tel 570810800, mail jan@example.com');
        expect(out).not.toContain('90010123671');
        expect(out).not.toContain('570810800');
        expect(out).not.toContain('jan@example.com');
        expect(s.restore(out)).toContain('90010123671');
        expect(s.restore(out)).toContain('jan@example.com');
    });

    it('ukrywa imię po tytule grzecznościowym, nawet gdy osoby nie ma w bazie', () => {
        const s = createScrubber();
        const out = s.scrub('wycisk szybko do pracowni pani Kasi');
        expect(out).not.toContain('Kasi');
        expect(out).toMatch(/pani OSOBA_1/);
    });

    it('ZOSTAWIA treść kliniczną — bez identyfikatorów nie jest daną osobową', () => {
        const s = createScrubber();
        s.learn('Radosław Kolasa', 'PACJENT');
        const out = s.scrub('Radosław Kolasa: usunięcie zębów, 6 implantów góra, sinus lift');
        expect(out).toContain('usunięcie zębów');
        expect(out).toContain('6 implantów');
        expect(out).toContain('sinus lift');
        expect(out).not.toContain('Kolasa');
    });

    it('ten sam byt dostaje ten SAM żeton w wielu miejscach', () => {
        const s = createScrubber();
        s.learn('Anna Litewka', 'LEKARZ');
        const a = s.scrub('Anna Litewka ma 3 wizyty');
        const b = s.scrub('przekaż to Annie? nie — Anna Litewka wie');
        const tok = a.match(/LEKARZ_\d+/)![0];
        expect(b).toContain(tok);
    });

    it('nie myli PACJENT_10 z PACJENT_1 przy odtwarzaniu', () => {
        const s = createScrubber();
        for (let i = 1; i <= 11; i++) s.learn(`Pacjent Numer${i}`, 'PACJENT');
        const scrubbed = s.scrub('Pacjent Numer1 oraz Pacjent Numer10 i Pacjent Numer11');
        const back = s.restore(scrubbed);
        expect(back).toContain('Pacjent Numer1 ');
        expect(back).toContain('Pacjent Numer10');
        expect(back).toContain('Pacjent Numer11');
    });

    it('nie tokenizuje nazw zabiegów ani typów wizyt', () => {
        const s = createScrubber();
        const out = s.scrub('chirurgia, ortodoncja, higienizacja, pierwsza wizyta');
        expect(out).toBe('chirurgia, ortodoncja, higienizacja, pierwsza wizyta');
        expect(s.size()).toBe(0);
    });

    it('ukrywa imię MAŁYMI literami po tytule (realna notatka z produkcji)', () => {
        const s = createScrubber();
        const out = s.scrub('wycisk szybo do pracowi pani kasi- protezy natychmiastowe');
        expect(out).not.toMatch(/kasi/i);
        expect(out).toContain('protezy natychmiastowe');
    });

    it('ukrywa zdrobnienie BEZ tytułu — realna notatka „Ela brudna asysta"', () => {
        const s = createScrubber();
        const out = s.scrub('Ela brudna asysta');
        expect(out).not.toMatch(/Ela/);
        expect(out).toContain('asysta');
    });

    it('NIE tokenizuje słownictwa klinicznego podobnego do imion', () => {
        const s = createScrubber();
        const src = 'implant, proteza, korona, most, wycisk, zgryz, ekstrakcja, sinus';
        expect(s.scrub(src)).toBe(src);
    });

    /**
     * 🪤 REGRESJA ZŁAPANA POMIAREM NA PRODUKCJI.
     * Scrubowanie GOTOWEGO JSON-a przepuszczało imiona: `JSON.stringify` zamienia
     * znak nowej linii na dwa znaki (`\` i `n`), więc „…natychmiastowe\n\nEla brudna
     * asysta" daje ciąg liter `nEla` — rdzeń „ela" wtedy nie pasuje. Dlatego
     * czyścimy STRUKTURĘ przed serializacją, nigdy tekst po niej.
     */
    it('scrubDeep łapie imię przyklejone do escape’u nowej linii, scrub na JSON-ie NIE', () => {
        const s = createScrubber();
        const payload = { message: 'protezy natychmiastowe\r\n\r\nEla brudna asysta' };

        const naive = s.scrub(JSON.stringify(payload));
        expect(naive).toContain('Ela'); // dowód, że stara droga przecieka

        const s2 = createScrubber();
        const correct = JSON.stringify(s2.scrubDeep(payload));
        expect(correct).not.toContain('Ela');
        expect(correct).toContain('protezy natychmiastowe');
    });

    it('scrubDeep i restoreDeep chodzą po zagnieżdżonej strukturze', () => {
        const s = createScrubber();
        s.learn('Radosław Kolasa', 'PACJENT');
        const src = { a: { b: ['wizyta: Radosław Kolasa', { c: 'tel 570810800' }] }, n: 7, ok: true };
        const scrubbed = s.scrubDeep(src);
        const flat = JSON.stringify(scrubbed);
        expect(flat).not.toContain('Kolasa');
        expect(flat).not.toContain('570810800');
        expect(scrubbed.n).toBe(7);
        expect(scrubbed.ok).toBe(true);
        expect(JSON.stringify(s.restoreDeep(scrubbed))).toContain('Kolasa');
    });

    it('radzi sobie z pustym i nietekstowym wejściem', () => {
        const s = createScrubber();
        expect(s.scrub(null)).toBe('');
        expect(s.scrub(undefined)).toBe('');
        expect(s.restore(null)).toBe('');
    });
});
