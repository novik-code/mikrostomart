/**
 * Pseudonimizacja korespondencji mailowej idącej do OpenAI.
 *
 * Sprawdzamy dwie rzeczy naraz: że tożsamość NIE WYCHODZI do modelu i że
 * odpowiedź modelu wraca do człowieka z PRAWDZIWYMI danymi. Jedno bez drugiego
 * jest bezwartościowe — szczelny scrubber bez odtwarzania daje pacjentowi
 * wiadomość „Dzień dobry PACJENT_1".
 */
import { describe, it, expect } from 'vitest';
import { prepareEmailForModel, residualIdentifiers, restoreForHuman } from '../emailAiPrivacy';

const MAIL = {
    fromName: 'Michał Ogonowski',
    fromAddress: 'm.ogonowski1990@gmail.com',
    subject: 'Zapytanie dotyczące leczenia',
    body: [
        'Dzień dobry,',
        'nazywam się Michał Ogonowski, PESEL 90010123671.',
        'Proszę o kontakt pod numer 570 810 800 lub m.ogonowski1990@gmail.com.',
        'Chodzi o uszkodzoną górną szóstkę — czy możliwy jest implant?',
        'Rozmawiałem wcześniej z panią Kasią z recepcji.',
    ].join('\n'),
    date: '2026-07-29T18:47:00.000Z',
};

describe('pseudonimizacja maili do modelu', () => {
    it('nie wypuszcza nazwiska nadawcy — ani z nagłówka, ani ze środka treści', () => {
        const { safe } = prepareEmailForModel(MAIL);
        const wszystko = `${safe.fromName}\n${safe.fromAddress}\n${safe.subject}\n${safe.body}`;
        expect(wszystko.toLowerCase()).not.toContain('ogonowski');
        expect(wszystko.toLowerCase()).not.toContain('michał');
    });

    it('wycina e-mail, PESEL i telefon', () => {
        const { safe } = prepareEmailForModel(MAIL);
        const wszystko = `${safe.fromName}\n${safe.fromAddress}\n${safe.subject}\n${safe.body}`;
        expect(wszystko).not.toContain('m.ogonowski1990@gmail.com');
        expect(wszystko).not.toContain('90010123671');
        expect(wszystko).not.toContain('570 810 800');
        // Czujka nie widzi już żadnego jednoznacznego identyfikatora.
        expect(residualIdentifiers(wszystko)).toEqual([]);
    });

    it('łapie imię z wolnego tekstu bez tytułu w kartotece („pani Kasią")', () => {
        const { safe } = prepareEmailForModel(MAIL);
        expect(safe.body.toLowerCase()).not.toContain('kasi');
    });

    it('ZOSTAWIA opis kliniczny — bez niego model nie ma na czym pracować', () => {
        const { safe } = prepareEmailForModel(MAIL);
        expect(safe.body).toContain('szóstkę');
        expect(safe.body).toContain('implant');
    });

    it('odtwarza prawdziwe dane w odpowiedzi modelu', () => {
        const { scrubber, safe } = prepareEmailForModel(MAIL);
        // Model odpowiada, używając żetonów, które zobaczył.
        const tokenNadawcy = safe.fromName;
        const odpowiedz = {
            draft_html: `<p>Dzień dobry ${tokenNadawcy},</p><p>zapraszamy na konsultację.</p>`,
            reasoning: `Pacjent ${tokenNadawcy} pyta o implant.`,
        };
        const dlaCzlowieka = restoreForHuman(scrubber, odpowiedz);
        expect(dlaCzlowieka.draft_html).toContain('Michał Ogonowski');
        expect(dlaCzlowieka.draft_html).not.toContain('PACJENT_');
        expect(dlaCzlowieka.reasoning).toContain('Michał Ogonowski');
    });

    it('czyści historię poprawek — to zapis wcześniejszej korespondencji', () => {
        const historia = [
            {
                ai_analysis: 'Odpowiedź dla Michała Ogonowskiego była za formalna.',
                corrected_draft_html: '<p>Dzień dobry Panie Michale, tel. 570 810 800</p>',
                feedback_note: 'skrócić',
                original_draft_html: '<p>Szanowny Panie Ogonowski</p>',
            },
        ];
        const { safeFeedback } = prepareEmailForModel(MAIL, historia);
        const tekst = JSON.stringify(safeFeedback).toLowerCase();
        expect(tekst).not.toContain('ogonowski');
        expect(tekst).not.toContain('570 810 800');
        // Sama informacja zwrotna („za formalna", „skrócić") musi przetrwać.
        expect(tekst).toContain('formalna');
        expect(tekst).toContain('skrócić');
    });

    /**
     * 🪤 Klasa błędu złapana kiedyś pomiarem w asystencie: `JSON.stringify`
     * zamienia znak nowej linii na DWA znaki, więc „…leczenie\n\nEla" daje w tekście
     * ciąg liter `nEla` i rdzeń „ela" przestaje pasować. Dlatego czyścimy STRUKTURĘ
     * przed serializacją — ten test pilnuje, że tak zostało.
     */
    it('imię tuż po znaku nowej linii nie prześlizguje się (pułapka \\n + imię)', () => {
        const { safe } = prepareEmailForModel({
            ...MAIL,
            body: 'Prosze o wycene leczenie natychmiastowe\r\n\r\nEla',
        });
        expect(safe.body).not.toMatch(/\bEla\b/);
    });

    it('mapa żetonów nie przecieka między wiadomościami', () => {
        const a = prepareEmailForModel(MAIL);
        const b = prepareEmailForModel({ ...MAIL, fromName: 'Anna Nowak', fromAddress: 'anna@wp.pl' });
        // Osobne żądanie = osobny scrubber; odtworzenie żetonu z A nie może
        // podstawić danych z B (mapa żyje w pamięci jednego żądania).
        expect(restoreForHuman(b.scrubber, a.safe.fromName)).not.toContain('Michał');
    });

    it('pusty i brakujący wsad nie wywraca przygotowania', () => {
        const { safe, hidden } = prepareEmailForModel({});
        expect(safe.fromName).toBe('Nieznany nadawca');
        expect(safe.body).toBe('');
        expect(hidden).toBe(0);
    });
});
