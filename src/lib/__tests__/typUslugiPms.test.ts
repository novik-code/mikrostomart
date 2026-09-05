import { describe, it, expect } from 'vitest';
import { typUslugiDlaPms } from '../typUslugiPms';

describe('rodzaj usługi → pole `type` w PMS', () => {
    it('mapuje dwie usługi, które mają odpowiednik w słowniku Prodentisa', () => {
        expect(typUslugiDlaPms('Konsultacja Wstępna')).toBe('konsultacja');
        expect(typUslugiDlaPms('Higienizacja (Profilaktyka)')).toBe('higienizacja');
    });

    it('🪤 etykieta zależy od JĘZYKA pacjenta — wszystkie cztery muszą trafiać', () => {
        for (const e of ['Initial Consultation', 'Erstberatung', 'Первинна консультація']) {
            expect(typUslugiDlaPms(e)).toBe('konsultacja');
        }
        for (const e of ['Hygiene (Preventive Care)', 'Prophylaxe (Vorsorge)', 'Гігієна (профілактика)']) {
            expect(typUslugiDlaPms(e)).toBe('higienizacja');
        }
    });

    it('warianty historyczne z bazy też trafiają', () => {
        // Realne wartości zmierzone w `online_bookings`: 2× i 1×.
        expect(typUslugiDlaPms('Konsultacja')).toBe('konsultacja');
        expect(typUslugiDlaPms('Higienizacja')).toBe('higienizacja');
    });

    it('normalizacja: wielkość liter, spacje i polskie znaki nie mają znaczenia', () => {
        expect(typUslugiDlaPms('  konsultacja wstepna ')).toBe('konsultacja');
        expect(typUslugiDlaPms('KONSULTACJA WSTĘPNA')).toBe('konsultacja');
        expect(typUslugiDlaPms('Higienizacja  (Profilaktyka)')).toBe('higienizacja');
    });

    it('🔴 usługa BEZ odpowiednika w PMS nie wysyła nic — nie zgadujemy', () => {
        expect(typUslugiDlaPms('Pomoc doraźna (Ból)')).toBeUndefined();
        expect(typUslugiDlaPms('Wybielanie Zębów')).toBeUndefined();
    });

    it('🔴 usługi zdjęte z formularza nie mapują się — to decyzja, nie przeoczenie', () => {
        expect(typUslugiDlaPms('Implanty')).toBeUndefined();
        expect(typUslugiDlaPms('Ortodoncja (Nakładki)')).toBeUndefined();
        expect(typUslugiDlaPms('Licówki / Metamorfoza')).toBeUndefined();
    });

    it('🪤 śmieci z danych sprzed naprawy NIE MOGĄ zostać typem wizyty', () => {
        // Cztery takie wiersze realnie leżą w bazie — apka wysyłała nazwisko lekarza.
        expect(typUslugiDlaPms('Ilona Piechaczek')).toBeUndefined();
        expect(typUslugiDlaPms('Dominika Milicz')).toBeUndefined();
    });

    it('brak wyboru zachowuje się jak brak wyboru', () => {
        expect(typUslugiDlaPms(null)).toBeUndefined();
        expect(typUslugiDlaPms(undefined)).toBeUndefined();
        expect(typUslugiDlaPms('')).toBeUndefined();
        expect(typUslugiDlaPms('   ')).toBeUndefined();
    });

    it('DOWÓD COFKI: naiwne „wyślij etykietę jako typ" wysłałoby nazwisko lekarza', () => {
        const naiwne = (e: string) => e.trim().toLowerCase() || undefined;
        expect(naiwne('Ilona Piechaczek')).toBe('ilona piechaczek');   // tak by poszło
        expect(typUslugiDlaPms('Ilona Piechaczek')).toBeUndefined();    // tak idzie
    });
});
