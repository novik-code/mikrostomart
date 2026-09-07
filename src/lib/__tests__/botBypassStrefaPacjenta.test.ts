/**
 * Szybka ścieżka botów NIE MOŻE omijać bramki strefy pacjenta.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * `middleware.ts` kończy żądanie z nagłówkiem `User-Agent` bota, zanim dojdzie
 * do bramki `patient_token`. `S10-3` zamknęło to dla `/admin` i `/pracownik`,
 * bo te siedzą w `NON_LOCALE_PATHS` — ale strefa pacjenta przeniosła się pod
 * `[locale]`, więc dla niej warunek nie zachodził. Siódmy raz w tym projekcie
 * ta sama klasa: „naprawiliśmy jedną trasę z pary".
 *
 * ZMIERZONE NA PRODUKCJI 2026-09-07 (z kontrolą negatywną):
 *   curl                   /strefa-pacjenta/dashboard → 307 na login
 *   curl -A Googlebot/2.1  /strefa-pacjenta/dashboard → 200   ← obejście
 *   curl -A Googlebot/2.1  /pracownik                 → 307   ← S10-3 działa
 *
 * ⚠️ Zakres skutku, zmierzony osobno: oddawana treść to szkielet kliencki
 * (`self.__next_f`); dane pacjenta dociąga dopiero przeglądarka z tokenem,
 * więc WYCIEKU DANYCH NIE BYŁO. Obeszła się sama bramka i strona chroniona
 * stawała się indeksowalna — to defekt warstwy, nie incydent danych.
 */
import { describe, it, expect } from 'vitest';
import { botMozeOminacAutoryzacje, bezPrefiksuJezyka } from '../middlewareSurface';

describe('bot nie omija bramki stref chronionych', () => {
    it.each([
        '/strefa-pacjenta/dashboard',
        '/strefa-pacjenta/profil',
        '/strefa-pacjenta/wizyty',
        '/en/strefa-pacjenta/dashboard',
        '/de/strefa-pacjenta/profil',
        '/ua/strefa-pacjenta/dashboard',
        '/mapa-bolu/editor',
        '/en/mapa-bolu/editor',
    ])('%s idzie pełną ścieżką autoryzacji', (sciezka) => {
        expect(botMozeOminacAutoryzacje(sciezka)).toBe(false);
    });

    it.each([
        '/admin',
        '/pracownik',
        '/api/patients/me',
    ])('%s dalej idzie pełną ścieżką (regresja S10-3)', (sciezka) => {
        expect(botMozeOminacAutoryzacje(sciezka)).toBe(false);
    });
});

describe('KONTROLA NEGATYWNA: strony publiczne dalej mają szybką ścieżkę', () => {
    // Gdyby naprawa zwracała wszędzie `false`, bot straciłby szybką ścieżkę na
    // CAŁEJ stronie publicznej — czyli naprawa bezpieczeństwa zabrałaby wydajność
    // indeksowania, dla której ta gałąź w ogóle powstała.
    it.each([
        '/',
        '/o-nas',
        '/cennik',
        '/nowosielski/jak-nitkowac-zeby',
        '/en/o-nas',
        '/de/preise',
        '/uslugi/implanty',
        // Nazwa zaczynająca się tak samo, ale to INNA strona — nie wolno jej złapać.
        '/strefa-pacjenta-informacje',
    ])('%s korzysta z szybkiej ścieżki', (sciezka) => {
        expect(botMozeOminacAutoryzacje(sciezka)).toBe(true);
    });

    it('sama „/strefa-pacjenta" (landing) też jest chroniona przez tę bramkę', () => {
        // Landing jest publiczny w samej bramce pacjenta, ale przez szybką ścieżkę
        // nie może przechodzić — inaczej wracamy do stanu sprzed naprawy dla
        // wszystkiego, co pod nim leży.
        expect(botMozeOminacAutoryzacje('/strefa-pacjenta')).toBe(false);
    });
});

describe('zdejmowanie prefiksu języka', () => {
    it.each([
        ['/en/strefa-pacjenta/dashboard', '/strefa-pacjenta/dashboard'],
        ['/de/o-nas', '/o-nas'],
        ['/strefa-pacjenta', '/strefa-pacjenta'],
        ['/en', '/'],
        // 🪤 „/endoskopia" zaczyna się od „/en", ale to NIE jest prefiks języka.
        ['/endodoncja', '/endodoncja'],
    ])('%s → %s', (wejscie, oczekiwane) => {
        expect(bezPrefiksuJezyka(wejscie)).toBe(oczekiwane);
    });
});
