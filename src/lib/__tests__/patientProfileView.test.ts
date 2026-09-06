/**
 * STRAŻNIK ALLOW-LISTY PROFILU PACJENTA (P-023) — warstwa czystej funkcji.
 *
 * Test okablowania (`patientProfileWiring.test.ts`) pilnuje, że OBIE trasy profilu
 * realnie przez tę funkcję przechodzą. Ten plik pilnuje samej funkcji: że lista jest
 * ALLOW-listą (nieznane pole nie przechodzi) i że nie skurczyła się o pole, z którego
 * żyje web albo apka.
 *
 * DOWÓD, ŻE GRYZIE (cofka): dopisz w `patientProfileView.ts` jedną linię
 * `...(surowy as Record<string, unknown>)` na początku zwracanego obiektu → padają
 * dwa pierwsze testy. Usuń `id` z listy → pada trzeci.
 *
 * Uruchomienie: `npx vitest run patientProfileView`
 */

import { describe, it, expect } from 'vitest';
import { widokProfiluPacjenta } from '@/lib/patientProfileView';

/** Komplet kluczy zmierzony na produkcji 06.09 (konto DEMO, klucz pacjencki). */
const KARTOTEKA_PMS = {
    id: '0100001110',
    firstName: 'Jan',
    lastName: 'Demo',
    middleName: 'Maria',
    maidenName: 'Kowalski',
    pesel: '90010123671',
    birthDate: '1990-01-01',
    gender: 'M',
    phone: '570810800',
    email: 'kartoteka@example.test',
    address: {
        street: 'Testowa',
        houseNumber: '1',
        apartmentNumber: '2',
        postalCode: '45-000',
        city: 'Opole',
        country: 'PL',
    },
    notes: 'Ankieta E-Karty: nosicielstwo, nalogi, leki stale.',
    warnings: [{ text: 'Uwaga dla lekarza', date: '2026-01-01', author: 'Recepcja' }],
    przyszlePoleDostawcy: 'pole, ktorego nikt jeszcze nie widzial',
};

const ALLOW = ['address', 'email', 'firstName', 'id', 'lastName', 'phone'];

describe('P-023 · widokProfiluPacjenta — allow-lista, nie deny-lista', () => {
    it('🔴 SEDNO: wychodzi DOKŁADNIE sześć kluczy, ani jednego więcej', () => {
        const wynik = widokProfiluPacjenta(KARTOTEKA_PMS);
        expect(Object.keys(wynik).sort()).toEqual(ALLOW);
    });

    it('🔴 siedem udokumentowanych pól wrażliwych + pole nieznane nie przechodzi', () => {
        const wynik = widokProfiluPacjenta(KARTOTEKA_PMS) as Record<string, unknown>;
        for (const pole of ['pesel', 'birthDate', 'gender', 'middleName', 'maidenName', 'notes', 'warnings', 'przyszlePoleDostawcy']) {
            // Kontrola pozytywna miernika: pole MUSI być w źródle, inaczej asercja jest pusta.
            expect(KARTOTEKA_PMS, `fixture nie zawiera "${pole}"`).toHaveProperty(pole);
            expect(wynik, `pole "${pole}" przeszło przez allow-listę`).not.toHaveProperty(pole);
        }
    });

    it('pola, z których żyją web i apka, przechodzą z wartościami', () => {
        const wynik = widokProfiluPacjenta(KARTOTEKA_PMS);
        expect(wynik.id).toBe('0100001110');
        expect(wynik.firstName).toBe('Jan');
        expect(wynik.lastName).toBe('Demo');
        expect(wynik.phone).toBe('570810800');
        expect(wynik.email).toBe('kartoteka@example.test');
    });

    it('adres: pięć podpól, które renderuje profil i uzupełnia checkout', () => {
        const wynik = widokProfiluPacjenta(KARTOTEKA_PMS);
        expect(wynik.address).toEqual({
            street: 'Testowa',
            houseNumber: '1',
            apartmentNumber: '2',
            postalCode: '45-000',
            city: 'Opole',
        });
    });

    it('🪤 adres jako zwykły napis (starsze kartoteki) przechodzi bez zmian', () => {
        const wynik = widokProfiluPacjenta({ id: '1', address: 'Testowa 1/2, 45-000 Opole' });
        expect(wynik.address).toBe('Testowa 1/2, 45-000 Opole');
    });

    it('🪤 brak adresu nie tworzy pustego obiektu — kształt odpowiedzi zostaje jak przed naprawą', () => {
        const wynik = widokProfiluPacjenta({ id: '1', firstName: 'Jan' });
        expect(wynik.address).toBeUndefined();
        // Klucz istnieje, ale JSON.stringify go pominie — dokładnie jak przy spreadzie
        // rekordu, który tego pola nie miał.
        expect(JSON.parse(JSON.stringify(wynik))).not.toHaveProperty('address');
    });

    it('🪤 śmieciowe wejście nie wywraca trasy (PMS oddał null/tablicę/napis)', () => {
        for (const smiec of [null, undefined, 'napis', 42, []]) {
            const wynik = widokProfiluPacjenta(smiec);
            expect(Object.keys(wynik).sort()).toEqual(ALLOW);
            expect(wynik.id).toBeUndefined();
        }
    });

    it('🪤 pole `address` podstawione tablicą nie przemyca indeksów', () => {
        const wynik = widokProfiluPacjenta({ id: '1', address: ['pesel', '90010123671'] });
        expect(wynik.address).toBeUndefined();
    });
});
