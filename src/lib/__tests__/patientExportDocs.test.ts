/**
 * Kompletowanie dokumentów do paczki RODO — test ZACHOWANIA, nie treści pliku.
 *
 * 🔴 DLACZEGO TEN PLIK ISTNIEJE. Pierwsza wersja ochrony tej ścieżki była strażnikiem
 * tekstowym (asercje na obecność `readObjectBytes`, `brakujace`, `status: 503`).
 * Cofka pokazała, że jest bezwartościowy: **cztery** różne regresje przeszły przez niego
 * na zielono — ciche pominięcie dokumentu, wyłączone przerwanie, wypadnięcie e-Kart
 * z listy i zabity odczyt ze Storage. Wszystkie zostawiały szukane ciągi w pliku.
 *
 * Stawka: pacjent korzystający z art. 15 dostaje ZIP ze statusem 200, bez ani jednego
 * PDF-a i bez żadnego sygnału — ani dla niego, ani dla nas.
 */
import { describe, it, expect } from 'vitest';
import { skompletujDokumenty, type DokumentDoPaczki } from '@/lib/patientExportDocs';

const bajty = (t: string) => Buffer.from(t);

/** Źródła-atrapy: Storage zna wskazane klucze, stary adres zna wskazane URL-e. */
function zrodla(storage: Record<string, string> = {}, legacy: Record<string, string> = {}) {
    const wolania = { storage: [] as string[], legacy: [] as string[] };
    return {
        wolania,
        // 🪤 `p in storage`, NIE `storage[p] ?` — pusty string jest falsy, więc atrapa
        // oddawała `null` zamiast 0-bajtowego pliku i przypadek „pusty plik" nigdy się
        // nie wykonywał. Test przechodził, a cofka to obnażyła.
        czytajZeStorage: async (p: string) => { wolania.storage.push(p); return p in storage ? bajty(storage[p]) : null; },
        pobierzStarymAdresem: async (u: string) => { wolania.legacy.push(u); return u in legacy ? bajty(legacy[u]) : null; },
    };
}

const zgoda: DokumentDoPaczki = { opis: 'zgoda rtg (aaaa1111)', path: '010/zgoda.pdf', legacyUrl: 'https://x/stary.pdf', nazwaWPaczce: 'consent.pdf' };
const ekarta: DokumentDoPaczki = { opis: 'e-Karta (bbbb2222)', path: '010/ekarta.pdf', legacyUrl: null, nazwaWPaczce: 'intake.pdf' };

describe('skompletujDokumenty', () => {
    it('komplet dokumentów → paczka pełna, zero braków', async () => {
        const z = zrodla({ '010/zgoda.pdf': 'PDF-A', '010/ekarta.pdf': 'PDF-B' });
        const w = await skompletujDokumenty([zgoda, ekarta], z);
        expect(w.brakujace).toEqual([]);
        expect(w.pliki.map(p => p.nazwaWPaczce)).toEqual(['consent.pdf', 'intake.pdf']);
        expect(w.pliki[0].bytes.toString()).toBe('PDF-A');
    });

    it('🔴 brak jednego pliku w Storage → zgłoszony jako BRAK, nie pominięty po cichu', async () => {
        // To jest dokładnie stan po zamknięciu bucketa dla wiersza z nieaktualnym kluczem.
        const z = zrodla({ '010/zgoda.pdf': 'PDF-A' }); // e-Karty NIE MA
        const w = await skompletujDokumenty([zgoda, ekarta], z);
        expect(w.brakujace).toEqual(['e-Karta (bbbb2222)']);
        expect(w.pliki).toHaveLength(1);
    });

    it('🔴 Storage milczy na WSZYSTKO → wszystkie dokumenty w brakach (nie pusta, cicha paczka)', async () => {
        const w = await skompletujDokumenty([zgoda, ekarta], zrodla());
        expect(w.pliki).toEqual([]);
        expect(w.brakujace).toHaveLength(2);
    });

    it('pusty plik (0 bajtów) liczy się jako BRAK', async () => {
        // Storage potrafi oddać pusty obiekt po nieudanym uploadzie — 0-bajtowy PDF
        // w paczce RODO wygląda dla pacjenta jak uszkodzony dokument.
        const z = zrodla({ '010/zgoda.pdf': '' });
        const w = await skompletujDokumenty([zgoda], z);
        expect(w.pliki).toEqual([]);
        expect(w.brakujace).toEqual(['zgoda rtg (aaaa1111)']);
    });

    it('wiersz sprzed backfillu (sam stary adres) idzie starą drogą', async () => {
        const bezKlucza: DokumentDoPaczki = { ...zgoda, path: null };
        const z = zrodla({}, { 'https://x/stary.pdf': 'PDF-STARY' });
        const w = await skompletujDokumenty([bezKlucza], z);
        expect(w.brakujace).toEqual([]);
        expect(w.pliki[0].bytes.toString()).toBe('PDF-STARY');
        expect(z.wolania.legacy).toEqual(['https://x/stary.pdf']);
    });

    it('klucz ma PIERWSZEŃSTWO przed starym adresem', async () => {
        // Po zamknięciu bucketa stary adres przestanie działać — nie wolno na nim polegać,
        // gdy wiersz ma już klucz.
        const z = zrodla({ '010/zgoda.pdf': 'ZE-STORAGE' }, { 'https://x/stary.pdf': 'ZE-STAREGO' });
        const w = await skompletujDokumenty([zgoda], z);
        expect(w.pliki[0].bytes.toString()).toBe('ZE-STORAGE');
        expect(z.wolania.legacy, 'stary adres nie powinien być w ogóle wołany').toEqual([]);
    });

    it('wiersz bez pliku (ani klucza, ani adresu) NIE jest brakiem', async () => {
        // Zgoda zarejestrowana bez wygenerowanego PDF-a — nie ma czego dokładać
        // i nie ma o czym alarmować.
        const pusty: DokumentDoPaczki = { opis: 'zgoda bez pliku', path: null, legacyUrl: null, nazwaWPaczce: 'x.pdf' };
        const w = await skompletujDokumenty([pusty], zrodla());
        expect(w.pliki).toEqual([]);
        expect(w.brakujace).toEqual([]);
    });
});
