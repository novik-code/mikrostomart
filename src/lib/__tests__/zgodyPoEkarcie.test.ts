/**
 * Reguła ostrzeżenia „e-Karta wypełniona, zgody niepodpisane".
 *
 * Zgłoszenie z 2026-09-11: u nowych pacjentów w Prodentisie brakowało biometrii
 * podpisu. Przyczyną nie był kod, tylko pominięty krok — link do zgód nie został
 * wystawiony, a biometria powstaje WYŁĄCZNIE przy podpisywaniu zgód. Status e-Karty
 * był widoczny dopiero wewnątrz okna zgód, więc nic nie przypominało o zgodach.
 *
 * Identyfikatory pacjentów to atrapy — prawdziwych danych tu nie wpisujemy.
 */
import { describe, it, expect } from 'vitest';
import {
    dzienWarszawa, zbudujZbioryZgod, flagiDlaWizyty, wymagaZgod,
    pokazOstrzezenieZgod, kluczDniaPacjenta,
} from '../zgodyPoEkarcie';

const BEZ_ZGOD = '0100000001';
const ZE_ZGODAMI = '0100000002';
const ZGODY_DZIEN_WCZESNIEJ = '0100000003';
const BEZ_EKARTY = '0100000004';

describe('dzień kalendarzowy gabinetu', () => {
    it('godzina w środku dnia daje ten sam dzień', () => {
        expect(dzienWarszawa('2026-09-11T10:14:24Z')).toBe('2026-09-11');
    });

    it('🪤 22:30 UTC to już NASTĘPNY dzień w Warszawie', () => {
        // Licząc dzień z samego ISO, przypisalibyśmy zdarzenie do złej wizyty.
        expect(dzienWarszawa('2026-09-10T22:30:00Z')).toBe('2026-09-11');
    });

    it('zima: 23:30 UTC to następny dzień (CET, UTC+1)', () => {
        expect(dzienWarszawa('2026-01-14T23:30:00Z')).toBe('2026-01-15');
    });

    it('brak albo śmieci dają null, a nie wyjątek', () => {
        expect(dzienWarszawa(null)).toBeNull();
        expect(dzienWarszawa(undefined)).toBeNull();
        expect(dzienWarszawa('nie-data')).toBeNull();
    });
});

describe('flagi wizyty', () => {
    const ekarty = [
        { prodentis_patient_id: BEZ_ZGOD, submitted_at: '2026-09-11T10:14:24Z' },
        { prodentis_patient_id: ZE_ZGODAMI, submitted_at: '2026-09-11T10:30:00Z' },
        { prodentis_patient_id: ZGODY_DZIEN_WCZESNIEJ, submitted_at: '2026-09-11T11:21:28Z' },
        { prodentis_patient_id: null, submitted_at: '2026-09-11T09:00:00Z' },
    ];
    const zgody = [
        { prodentis_patient_id: ZE_ZGODAMI, signed_at: '2026-09-11T11:41:54Z' },
        { prodentis_patient_id: ZGODY_DZIEN_WCZESNIEJ, signed_at: '2026-09-10T12:00:00Z' },
    ];
    const zbiory = zbudujZbioryZgod(ekarty, zgody);

    it('🔴 e-Karta dziś, zgód brak → ostrzeżenie (przypadek ze zgłoszenia)', () => {
        const f = flagiDlaWizyty('2026-09-11', BEZ_ZGOD, zbiory);
        expect(f).toEqual({ ekartaDzis: true, zgodyDzis: false });
        expect(wymagaZgod(f)).toBe(true);
    });

    it('KONTROLA NEGATYWNA: e-Karta i zgody tego samego dnia → bez ostrzeżenia', () => {
        const f = flagiDlaWizyty('2026-09-11', ZE_ZGODAMI, zbiory);
        expect(f).toEqual({ ekartaDzis: true, zgodyDzis: true });
        expect(wymagaZgod(f)).toBe(false);
    });

    it('zgody z INNEGO dnia nie gaszą ostrzeżenia dla dzisiejszej e-Karty', () => {
        expect(wymagaZgod(flagiDlaWizyty('2026-09-11', ZGODY_DZIEN_WCZESNIEJ, zbiory))).toBe(true);
    });

    it('KONTROLA NEGATYWNA: pacjent bez e-Karty → bez ostrzeżenia', () => {
        // Stały pacjent przychodzący na leczenie nie wypełnia e-Karty — nie wolno
        // zasypywać grafiku ostrzeżeniami u każdego, kto nie podpisał dziś zgód.
        expect(wymagaZgod(flagiDlaWizyty('2026-09-11', BEZ_EKARTY, zbiory))).toBe(false);
    });

    it('wizyta innego dnia → bez ostrzeżenia', () => {
        expect(wymagaZgod(flagiDlaWizyty('2026-09-12', BEZ_ZGOD, zbiory))).toBe(false);
    });

    it('wizyta bez identyfikatora pacjenta → bez flag', () => {
        expect(flagiDlaWizyty('2026-09-11', '', zbiory)).toEqual({ ekartaDzis: false, zgodyDzis: false });
        expect(flagiDlaWizyty('2026-09-11', undefined, zbiory)).toEqual({ ekartaDzis: false, zgodyDzis: false });
    });
});

describe('brak flag = brak ostrzeżenia (awaria zapytań w trasie grafiku)', () => {
    it('wizyta bez żadnych flag nie ostrzega', () => {
        // Trasa nie dokłada flag, gdy któreś zapytanie padło. Fałszywe „brak zgód"
        // u wszystkich z e-Kartą nauczyłoby rejestrację ignorować ostrzeżenie.
        expect(wymagaZgod({})).toBe(false);
        expect(wymagaZgod(undefined)).toBe(false);
        expect(wymagaZgod(null)).toBe(false);
    });
});

describe('baner gaśnie po podpisaniu, bez odświeżania grafiku', () => {
    const apt = { patientId: BEZ_ZGOD, ekartaDzis: true, zgodyDzis: false };

    it('bez wiedzy lokalnej decydują flagi z grafiku → ostrzeżenie', () => {
        expect(pokazOstrzezenieZgod(apt, '2026-09-11', new Set())).toBe(true);
    });

    it('🔴 zgoda pobrana po otwarciu okna zgód, ten sam dzień → baner znika', () => {
        // Pacjent podpisał na tablecie kilka minut po wystawieniu linku; grafik
        // tego nie wie. Bez tej poprawki rejestracja wystawiłaby link drugi raz.
        const { zgody } = zbudujZbioryZgod([], [{ prodentis_patient_id: BEZ_ZGOD, signed_at: '2026-09-11T12:05:00Z' }]);
        expect(pokazOstrzezenieZgod(apt, '2026-09-11', zgody)).toBe(false);
    });

    it('zgoda INNEGO pacjenta nie gasi banera', () => {
        const { zgody } = zbudujZbioryZgod([], [{ prodentis_patient_id: ZE_ZGODAMI, signed_at: '2026-09-11T12:05:00Z' }]);
        expect(pokazOstrzezenieZgod(apt, '2026-09-11', zgody)).toBe(true);
    });

    it('zgoda z INNEGO dnia nie gasi banera', () => {
        const { zgody } = zbudujZbioryZgod([], [{ prodentis_patient_id: BEZ_ZGOD, signed_at: '2026-09-02T12:05:00Z' }]);
        expect(pokazOstrzezenieZgod(apt, '2026-09-11', zgody)).toBe(true);
    });

    it('nieznany dzień wizyty → decydują flagi z grafiku, nie zgaduje', () => {
        const lokalne = new Set([kluczDniaPacjenta('2026-09-11', BEZ_ZGOD)]);
        expect(pokazOstrzezenieZgod(apt, null, lokalne)).toBe(true);
    });

    it('KONTROLA NEGATYWNA: wizyta bez ostrzeżenia z grafiku nie dostaje go lokalnie', () => {
        expect(pokazOstrzezenieZgod({ patientId: BEZ_EKARTY }, '2026-09-11', new Set())).toBe(false);
    });
});
