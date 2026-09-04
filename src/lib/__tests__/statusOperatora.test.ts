import { describe, it, expect } from 'vitest';
import { komunikatStatusu } from '../statusOperatora';

const o = (nextAvailable?: string | null) => ({ imie: 'dr Marcin Nowosielski', nextAvailable });

/**
 * Strażnik punktu 3e. Sedno: przy `unknown` i przy nieznanym statusie NIE WOLNO powiedzieć,
 * że terminów nie ma — dostawca PMS wprowadził `unknown` właśnie po to, żeby API mogło
 * przyznać się do niewiedzy, a nasz asystent AI powtarza takie zdania pacjentowi w mailu.
 * DOWÓD COFKI: sprowadzenie wszystkich statusów do jednego napisu „Brak wolnych terminów"
 * (stan sprzed 3e) wywala pięć asercji.
 */
describe('komunikatStatusu', () => {
    it('fully_booked — mówi, że lekarz PRZYJMUJE, i podaje najbliższy termin', () => {
        const k = komunikatStatusu('fully_booked', o('2026-09-14'));
        expect(k.tresc).toContain('przyjmuje tego dnia');
        expect(k.tresc).toContain('wszystkie terminy online są już zajęte');
        expect(k.skokDo).toBe('2026-09-14');
        expect(k.telefon).toBe(false); // jest dokąd skoczyć — telefon nie jest potrzebny
    });

    it('fully_booked BEZ najbliższego terminu → proponujemy telefon', () => {
        const k = komunikatStatusu('fully_booked', o(null));
        expect(k.telefon).toBe(true);
        expect(k.skokDo).toBeUndefined();
    });

    it('🔴 not_bookable_online — lekarz JEST w gabinecie, tylko nie online', () => {
        const k = komunikatStatusu('not_bookable_online', o());
        expect(k.tresc).toContain('przyjmuje tego dnia');
        expect(k.tresc).toContain('nie umówimy online');
        expect(k.telefon).toBe(true);
        // dotąd ten dzień pokazywał „brak wolnych terminów" — komunikat FAŁSZYWY
        expect(k.tresc).not.toContain('Brak wolnych terminów');
    });

    it('not_working — nie przyjmuje, ale bez powodu nieobecności', () => {
        const k = komunikatStatusu('not_working', o('2026-10-05'));
        expect(k.tresc).toContain('nie przyjmuje tego dnia');
        expect(k.skokDo).toBe('2026-10-05');
        // ⚪ powód (urlop) to dana kadrowa — nie pokazujemy jej pacjentowi
        expect(k.tresc.toLowerCase()).not.toContain('urlop');
        expect(k.tresc.toLowerCase()).not.toContain('absence');
    });

    it('🔴 unknown NIE TWIERDZI, że terminów nie ma', () => {
        const k = komunikatStatusu('unknown', o());
        expect(k.tresc).toContain('Nie potrafimy');
        expect(k.tresc).toContain('To nie znaczy, że ich nie ma');
        expect(k.telefon).toBe(true);
        expect(k.ton).toBe('ostrzegawczy');
    });

    it('🔴 NIEZNANY status z przyszłej wersji API zachowuje się jak unknown', () => {
        const k = komunikatStatusu('cos_nowego_w_v12', o());
        expect(k.tresc).toContain('Nie potrafimy');
        expect(k.ton).toBe('ostrzegawczy');
        expect(k.telefon).toBe(true);
    });

    it('brak statusu (starsze API bez meta) też nie kłamie', () => {
        expect(komunikatStatusu(undefined, o()).tresc).toContain('Nie potrafimy');
    });

    it('available — dopiero TU wolno powiedzieć „brak terminów w tym dniu"', () => {
        // status mówi „są okna", ale po naszych filtrach (:00/:30, wyprzedzenie) lista bywa pusta
        const k = komunikatStatusu('available', o());
        expect(k.tresc).toContain('Brak wolnych terminów');
        expect(k.telefon).toBe(false);
    });

    it('opis dnia wplatany, gdy podany', () => {
        expect(komunikatStatusu('not_working', { imie: 'X', dzienOpisowo: 'czwartek, 10 września' }).tresc)
            .toContain('(czwartek, 10 września)');
    });
});

import { podsumujDzienOperatorow } from '../statusOperatora';

/** Okno „Przełóż wizytę" nie pozwala wybrać lekarza — streszczamy cały dzień. */
describe('podsumujDzienOperatorow', () => {
    it('ktoś ma komplet → mówimy, że przyjmują, i podajemy najwcześniejszy wolny termin', () => {
        const k = podsumujDzienOperatorow([
            { status: 'fully_booked', nextAvailable: '2026-09-18' },
            { status: 'not_working', nextAvailable: '2026-09-14' },
        ]);
        expect(k?.tresc).toContain('przyjmują, ale wszystkie terminy są już zajęte');
        expect(k?.skokDo).toBe('2026-09-14'); // najwcześniejszy z całego dnia
    });

    it('wszyscy nie pracują → „gabinet nie przyjmuje"', () => {
        const k = podsumujDzienOperatorow([{ status: 'not_working' }, { status: 'not_working' }]);
        expect(k?.tresc).toContain('gabinet nie przyjmuje');
    });

    it('🔴 jeden unknown BIJE wszystko — nie ogłaszamy braku terminów', () => {
        const k = podsumujDzienOperatorow([
            { status: 'not_working' }, { status: 'unknown' }, { status: 'fully_booked' },
        ]);
        expect(k?.tresc).toContain('Nie potrafimy');
        expect(k?.ton).toBe('ostrzegawczy');
    });

    it('🔴 nieznany status z przyszłej wersji API też bije wszystko', () => {
        expect(podsumujDzienOperatorow([{ status: 'cos_z_v12' }])?.ton).toBe('ostrzegawczy');
    });

    it('pusta lista operatorów → „nie wiemy", nie „nie ma"', () => {
        expect(podsumujDzienOperatorow([])?.tresc).toContain('Nie potrafimy');
    });

    it('tylko not_bookable_online → kierujemy na telefon', () => {
        const k = podsumujDzienOperatorow([{ status: 'not_bookable_online' }]);
        expect(k?.telefon).toBe(true);
        expect(k?.tresc).toContain('nie przełożymy online');
    });
});

describe('górna granica okna PMS (window.maxDate)', () => {
    // 🪤 PMS szuka `nextAvailable` w horyzoncie 60 dni NIEZALEŻNIE od okna dat, więc potrafi
    // zwrócić datę, na którą to samo API odpowie DATE_OUT_OF_RANGE. Przycisk „skocz do
    // najbliższego terminu" prowadziłby wtedy donikąd.

    it('data POZA oknem nie jest obiecywana', () => {
        const k = komunikatStatusu('fully_booked', {
            imie: 'Marcin', nextAvailable: '2027-10-05', maxDate: '2027-09-04',
        });
        expect(k.skokDo).toBeUndefined();
    });

    it('🔑 odcięcie daty NIE zmienia komunikatu — zmienia się tylko obietnica', () => {
        const k = komunikatStatusu('fully_booked', {
            imie: 'Marcin', nextAvailable: '2027-10-05', maxDate: '2027-09-04',
        });
        expect(k.tresc).toContain('zajęte');
        // Bez osiągalnej daty wracamy do zachęty telefonicznej — pacjent nie zostaje bez wyjścia.
        expect(k.telefon).toBe(true);
    });

    it('data W oknie przechodzi normalnie', () => {
        const k = komunikatStatusu('fully_booked', {
            imie: 'Marcin', nextAvailable: '2026-09-11', maxDate: '2027-09-04',
        });
        expect(k.skokDo).toBe('2026-09-11');
        expect(k.telefon).toBe(false);
    });

    it('granica jest DOMKNIĘTA — dzień równy maxDate jeszcze przechodzi', () => {
        const k = komunikatStatusu('not_working', {
            imie: 'Elżbieta', nextAvailable: '2027-09-04', maxDate: '2027-09-04',
        });
        expect(k.skokDo).toBe('2027-09-04');
    });

    it('bez znanej granicy zachowujemy się jak dotąd', () => {
        const k = komunikatStatusu('fully_booked', { imie: 'Marcin', nextAvailable: '2027-10-05' });
        expect(k.skokDo).toBe('2027-10-05');
    });

    it('podsumowanie dnia bierze najwcześniejszą SPOŚRÓD OSIĄGALNYCH', () => {
        const k = podsumujDzienOperatorow(
            [{ status: 'fully_booked', nextAvailable: '2027-10-05' },
             { status: 'fully_booked', nextAvailable: '2026-09-11' }],
            '2027-09-04',
        );
        expect(k?.skokDo).toBe('2026-09-11');
    });

    it('DOWÓD COFKI: bez filtra okna obiecalibyśmy datę, na którą API odpowie 400', () => {
        const bezFiltra = ['2027-10-05'].filter(Boolean).sort()[0];
        const zFiltrem = komunikatStatusu('fully_booked', {
            imie: 'Marcin', nextAvailable: '2027-10-05', maxDate: '2027-09-04',
        }).skokDo;
        expect(bezFiltra).toBe('2027-10-05');
        expect(zFiltrem).toBeUndefined();
    });

    // ── `available` w podsumowaniu dnia ────────────────────────────────────────────
    // Dzień, w którym specjalista PRZYJMUJE, spadał dotąd na fallback i ogłaszał
    // „gabinet nie przyjmuje". To jest ten sam defekt, przeciw któremu powstały statusy.

    it('dzień z pracującym specjalistą NIE mówi, że gabinet nie przyjmuje', () => {
        const k = podsumujDzienOperatorow([{ status: 'available' }]);
        expect(k?.tresc).not.toContain('gabinet nie przyjmuje');
        expect(k?.tresc).toContain('online');
        expect(k?.telefon).toBe(true);
    });

    it('mieszanka available + not_working to nadal dzień pracujący', () => {
        const k = podsumujDzienOperatorow([
            { status: 'not_working' },
            { status: 'available', nextAvailable: '2026-09-11' },
        ]);
        expect(k?.tresc).not.toContain('gabinet nie przyjmuje');
        expect(k?.skokDo).toBe('2026-09-11');
    });

    it('komplet zapisów WYGRYWA z available — to inna, mocniejsza informacja', () => {
        const k = podsumujDzienOperatorow([{ status: 'available' }, { status: 'fully_booked' }]);
        expect(k?.tresc).toContain('zajęte');
    });

    it('„gabinet nie przyjmuje" zostaje TYLKO dla kompletu not_working', () => {
        const k = podsumujDzienOperatorow([{ status: 'not_working' }, { status: 'not_working' }]);
        expect(k?.tresc).toContain('gabinet nie przyjmuje');
    });

    it('DOWÓD COFKI: bez gałęzi `available` dzień pracujący ogłasza zamknięty gabinet', () => {
        // Odtworzenie kolejności sprzed poprawki: fully_booked → not_bookable_online → fallback.
        const naiwny = (ops: Array<{ status: string }>) =>
            ops.some(o => o.status === 'fully_booked') ? 'zajęte'
                : ops.some(o => o.status === 'not_bookable_online') ? 'telefon'
                    : 'Tego dnia gabinet nie przyjmuje.';
        expect(naiwny([{ status: 'available' }])).toContain('gabinet nie przyjmuje');
        expect(podsumujDzienOperatorow([{ status: 'available' }])?.tresc)
            .not.toContain('gabinet nie przyjmuje');
    });

    // ── `reason: same_day_not_bookable` (PMS v11.11, 04.09.2026) ──────────────────
    // Gabinet nie przyjmuje rezerwacji online na dzień bieżący. PMS raportuje wtedy
    // `fully_booked`, ale to NIE jest komplet zapisów — lekarz może mieć wolne okna.

    it('powód „na dziś nie online" BIJE status fully_booked', () => {
        const k = komunikatStatusu('fully_booked', {
            imie: 'Marcin', powod: 'same_day_not_bookable', nextAvailable: '2026-09-11',
        });
        expect(k.tresc).not.toContain('zajęte');
        expect(k.tresc).toContain('nie prowadzimy rezerwacji online');
        expect(k.telefon).toBe(true);
        expect(k.skokDo).toBe('2026-09-11');
    });

    it('bez powodu fully_booked mówi dalej to samo co dotąd', () => {
        const k = komunikatStatusu('fully_booked', { imie: 'Marcin' });
        expect(k.tresc).toContain('zajęte');
    });

    it('inny powód nie rusza komunikatu (np. no_pattern przy not_working)', () => {
        const k = komunikatStatusu('not_working', { imie: 'Elżbieta', powod: 'no_pattern' });
        expect(k.tresc).toContain('nie przyjmuje tego dnia');
    });

    it('podsumowanie dnia: jeden operator z powodem przesądza o całym dniu', () => {
        const k = podsumujDzienOperatorow([
            { status: 'not_working', reason: 'no_pattern', nextAvailable: '2026-09-07' },
            { status: 'fully_booked', reason: 'same_day_not_bookable', nextAvailable: '2026-09-11' },
        ]);
        expect(k?.tresc).toContain('nie prowadzimy rezerwacji online');
        expect(k?.telefon).toBe(true);
        expect(k?.skokDo).toBe('2026-09-07');
    });

    it('niewiedza nadal bije wszystko — także powód', () => {
        const k = podsumujDzienOperatorow([
            { status: 'unknown', reason: 'same_day_not_bookable' },
            { status: 'fully_booked', reason: 'same_day_not_bookable' },
        ]);
        expect(k?.ton).toBe('ostrzegawczy');
        expect(k?.tresc).toContain('Nie potrafimy');
    });

    it('DOWÓD COFKI: bez gałęzi powodu dzisiejszy dzień ogłasza komplet zapisów', () => {
        // Realna koperta z produkcji, 2026-09-04 (zmierzona, nie wymyślona).
        const dzis = { status: 'fully_booked', reason: 'same_day_not_bookable', nextAvailable: '2026-09-11' };
        const naiwny = komunikatStatusu(dzis.status, { imie: 'Marcin', nextAvailable: dzis.nextAvailable });
        expect(naiwny.tresc).toContain('zajęte');            // to szło do pacjenta
        const teraz = komunikatStatusu(dzis.status, {
            imie: 'Marcin', nextAvailable: dzis.nextAvailable, powod: dzis.reason,
        });
        expect(teraz.tresc).not.toContain('zajęte');
    });

    it('powód „za krótka wizyta" NIE jest brakiem terminów — to nasze złe zapytanie', () => {
        const k = komunikatStatusu('fully_booked', { imie: 'Marcin', powod: 'duration_below_minimum' });
        expect(k.tresc).not.toContain('zajęte');
        expect(k.ton).toBe('ostrzegawczy');
        expect(k.telefon).toBe(true);
    });

    it('podsumowanie dnia też nie ogłasza wtedy pustki', () => {
        const k = podsumujDzienOperatorow([{ status: 'fully_booked', reason: 'duration_below_minimum' }]);
        expect(k?.tresc).toContain('To nie znaczy');
        expect(k?.ton).toBe('ostrzegawczy');
    });
});
