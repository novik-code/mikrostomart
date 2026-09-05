/**
 * Strażnik: identyfikator WIZYTY w `appointment_actions` musi być świeży i musi być
 * identyfikatorem WIZYTY — nigdy pacjenta.
 *
 * 🔑 Po co to istnieje (04.09.2026). Dostawca PMS potwierdził, że ich `PUT /reschedule`
 * NIE zmienia `id_schedule`, ale przesunięcie wizyty RĘCZNIE na pulpicie Prodentisa
 * soft-deletuje wiersz i tworzy nowy, z NOWYM identyfikatorem. To jedyne źródło rozjazdu
 * — i mechanizm otwartej od maja sprawy „ICON 404" oraz obserwacji „14 z 50 rezerwacji
 * stoi u innego lekarza, niż wysłaliśmy".
 *
 * 🪤 Trasa `appointments/create` znajduje nasz wiersz DWIEMA strategiami: po identyfikatorze
 * (Strategia 1) i po DACIE (Strategia 2). Gdy identyfikator się zmienił, trafia Strategia 2 —
 * i dotąd zwracała wiersz `as-is`, wyrzucając świeże id, które klient dopiero co dostał z PMS-u.
 * Każde późniejsze odwołanie, przełożenie i potwierdzenie leciało wtedy na adres, którego nie ma.
 *
 * 🪤 Druga pułapka, ta sama kolumna: fallback na `patient.prodentis_id`. Identyfikator pacjenta
 * ma ten sam kształt co identyfikator wizyty (10 cyfr), a wartość idzie WPROST do adresu
 * `/api/schedule/appointment/<id>` — w najgorszym razie skasowałaby CUDZĄ wizytę o zbieżnym
 * numerze. Zmierzone przed naprawą: 2 takie wiersze na 1000.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const TRASA = join(process.cwd(), 'src/app/api/patients/appointments/create/route.ts');
const zrodlo = readFileSync(TRASA, 'utf8');

/** Wycina całe linie komentarza — asercje mają dotyczyć KODU, nie opisu problemu. */
const bezKomentarzy = (txt: string) =>
    txt
        .split('\n')
        .filter(l => {
            const t = l.trim();
            return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
        })
        .join('\n');

const kod = bezKomentarzy(zrodlo);

describe('świeżość identyfikatora wizyty', () => {
    it('🔴 znaleziony wiersz NIE wraca bez porównania identyfikatora', () => {
        // Warunek odświeżenia musi w ogóle istnieć.
        expect(kod).toMatch(/existing\.prodentis_id\s*!==\s*schedule_appointment_id/);
    });

    it('🔴 rozjazd identyfikatora kończy się ZAPISEM, nie samym logiem', () => {
        // Fragment od warunku do końca gałęzi musi zawierać update tej kolumny.
        const i = kod.indexOf('existing.prodentis_id !== schedule_appointment_id');
        expect(i).toBeGreaterThan(-1);
        const galaz = kod.slice(i, i + 900);
        expect(galaz).toContain('.update(');
        // 🔑 Od P-001 (05.09) zapisujemy identyfikator ZWERYFIKOWANY wobec listy wizyt
        // pacjenta (`pozycjaZPMS?.id ?? schedule_appointment_id`), a nie surowy z ciała
        // żądania. Intencja tej asercji jest bez zmian — gałąź odświeżenia musi kończyć się
        // ZAPISEM tej kolumny — więc wzorzec dopuszcza obie formy, ale nadal WYMAGA, żeby
        // wartość pochodziła od `schedule_appointment_id`, a nie skądinąd.
        expect(galaz).toMatch(/prodentis_id:\s*(?:pozycjaZPMS\?\.id\s*\?\?\s*)?schedule_appointment_id/);
    });

    it('🔴 przy okazji odświeżamy lekarza — dryfuje razem z terminem', () => {
        const i = kod.indexOf('existing.prodentis_id !== schedule_appointment_id');
        const galaz = kod.slice(i, i + 900);
        expect(galaz).toContain('doctor_id');
        expect(galaz).toContain('doctor_name');
    });

    it('🪤 nieudane odświeżenie NIE MOŻE być ciche', () => {
        const i = kod.indexOf('existing.prodentis_id !== schedule_appointment_id');
        const galaz = kod.slice(i, i + 1200);
        expect(galaz).toMatch(/console\.(error|warn)/);
    });

    it('🔴 kolumna identyfikatora WIZYTY nigdy nie dostaje identyfikatora PACJENTA', () => {
        // `patient.prodentis_id` to kartoteka, nie wizyta. Ta wartość idzie do adresu URL.
        expect(kod).not.toMatch(/prodentis_id:\s*[^\n]*patient\.prodentis_id/);
    });

    it('DOWÓD COFKI: obie asercje łapią dokładnie te wzorce, które były w kodzie', () => {
        // Stan sprzed naprawy, dosłownie — obie linie żyły w tym pliku do 04.09.2026.
        const przedNaprawa = [
            'return NextResponse.json({ id: existing.id, status: existing.status });',
            'prodentis_id: schedule_appointment_id || prodentis_id || patient.prodentis_id,',
        ].join('\n');

        expect(/existing\.prodentis_id\s*!==\s*schedule_appointment_id/.test(przedNaprawa)).toBe(false);
        expect(/prodentis_id:\s*[^\n]*patient\.prodentis_id/.test(przedNaprawa)).toBe(true);

        // A dzisiejszy plik zachowuje się odwrotnie na obu.
        expect(/existing\.prodentis_id\s*!==\s*schedule_appointment_id/.test(kod)).toBe(true);
        expect(/prodentis_id:\s*[^\n]*patient\.prodentis_id/.test(kod)).toBe(false);
    });
});
