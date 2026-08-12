/**
 * Adres szablonu zgody — test ZACHOWANIA.
 *
 * 🔴 STAWKA. To jest ostatnie ogniwo przed zamknięciem bucketa `consent-pdfs`.
 * Zmierzone na produkcji 2026-08-12: **wszystkie 14 AKTYWNYCH typów zgód** ma tam swój
 * szablon. Jeśli ta funkcja odda zły adres, pacjent siedzi w fotelu i nie ma czego
 * podpisać — nie część zgód, tylko 100%.
 *
 * Testujemy wykonaniem, bo strażniki tekstowe w tej samej sesji przepuściły
 * (zmierzone cofką) cztery różne regresje w bliźniaczej ścieżce eksportu RODO.
 */
import { describe, it, expect } from 'vitest';
import { wybierzAdresSzablonu } from '@/lib/consentTypes';

const zeStorage = { consent_key: 'zgoda_rtg', pdf_file: 'https://x.supabase.co/storage/v1/object/public/consent-pdfs/consent-templates/rtg.pdf', pdf_path: 'consent-templates/rtg.pdf' };
const statyk = { consent_key: 'zgoda_stara', pdf_file: 'zgoda_na_rtg.pdf', pdf_path: null };

describe('wybierzAdresSzablonu', () => {
    it('jest klucz → PODPISANY adres (przeżyje zamknięcie bucketa)', async () => {
        const wolane: string[] = [];
        const url = await wybierzAdresSzablonu(zeStorage, async (p) => { wolane.push(p); return 'https://x/sign?token=abc'; });
        expect(url).toBe('https://x/sign?token=abc');
        expect(wolane).toEqual(['consent-templates/rtg.pdf']);
    });

    it('🔴 podpis padł → stary adres, a nie pusty string', async () => {
        // Pusty adres = `fetch('')` na tablecie i biały ekran zamiast zgody.
        // Dopóki bucket jest publiczny, stary adres ratuje sytuację; po zamknięciu
        // będzie to awaria WIDOCZNA (400 na konkretnym pliku), nie cicha.
        const url = await wybierzAdresSzablonu(zeStorage, async () => null);
        expect(url).toBe(zeStorage.pdf_file);
        expect(url).not.toBe('');
    });

    it('brak klucza (statyk z public/zgody) → adres bez zmian, podpis NIE wołany', async () => {
        let wolano = false;
        const url = await wybierzAdresSzablonu(statyk, async () => { wolano = true; return 'nie-powinno'; });
        expect(url).toBe('zgoda_na_rtg.pdf');
        expect(wolano, 'statyku nie ma w buckecie — nie ma czego podpisywać').toBe(false);
    });

    it('pusty/biały klucz traktowany jak brak klucza', async () => {
        const url = await wybierzAdresSzablonu({ ...zeStorage, pdf_path: '   ' }, async () => 'podpis');
        expect(url).toBe(zeStorage.pdf_file);
    });
});
