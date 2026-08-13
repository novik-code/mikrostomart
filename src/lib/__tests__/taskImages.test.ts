/**
 * Zdjęcia zadań — test ZACHOWANIA, warunek wejścia migracji 194.
 *
 * 🔴 STAWKA. Bucket `task-images` ma zostać zamknięty. Zmierzone w migracji 192:
 * 299 wierszy, 202 elementy w `image_urls`, 252 obiekty w buckecie. Jeśli odczyt
 * odda adres publiczny, po zamknięciu gasną WSZYSTKIE zdjęcia zadań — w apce 1.2.0
 * ze sklepu (`lib/tasks.ts:187`) i w panelu webowym (`TasksTab.tsx:1921`).
 *
 * Testujemy wykonaniem na atrapach, nie treścią pliku: strażnik tekstowy przepuścił
 * w tym repo cztery regresje w bliźniaczej ścieżce (`if (false && …)` zostawia
 * szukane słowa na miejscu).
 */
import { describe, it, expect } from 'vitest';
import { withSignedTaskImages, normalizedTaskImageFields, type PortyZdjec } from '@/lib/taskImages';

const PUB = 'https://x.supabase.co/storage/v1/object/public/task-images/';
const SIGN = 'https://x.supabase.co/storage/v1/object/sign/task-images/';

/** Atrapa Storage: podpis = klucz + token, tak jak robi to Supabase. */
const porty = (over: PortyZdjec = {}): PortyZdjec => ({
    podpisz: async paths => new Map(paths.map(p => [p, `${SIGN}${p}?token=T-${p}`])),
    rozwiazKlucze: async urls =>
        urls.map(u => {
            // Ta sama reguła co `resolve_object_path` w SQL: tnij po znaczniku, potem po '?'.
            for (const znacznik of [PUB, SIGN]) {
                const i = u.indexOf(znacznik);
                if (i >= 0) return u.slice(i + znacznik.length).split('?')[0];
            }
            return null;
        }),
    adresPubliczny: p => `${PUB}${p}`,
    ...over,
});

describe('withSignedTaskImages — odczyt', () => {
    it('🔴 oddaje adresy PODPISANE, nie publiczne (bez tego mig. 194 gasi zdjęcia)', async () => {
        const [t] = await withSignedTaskImages(
            [{ image_urls: [`${PUB}tasks/a.jpg`], image_paths: ['tasks/a.jpg'] }],
            porty(),
        );
        expect(t.image_urls).toEqual([`${SIGN}tasks/a.jpg?token=T-tasks/a.jpg`]);
        expect(t.image_urls!.every(u => !u.includes('/object/public/'))).toBe(true);
    });

    it('🪤 kolejność bierze z image_paths, nie z image_urls po indeksie', async () => {
        // Backfill zapisał klucze BEZ pustych wpisów — indeksy obu tablic się rozjeżdżają.
        // Mapowanie 1:1 po pozycji podstawiłoby pod zdjęcie A adres zdjęcia B.
        const [t] = await withSignedTaskImages(
            [{ image_urls: ['', `${PUB}tasks/a.jpg`, `${PUB}tasks/b.jpg`], image_paths: ['tasks/a.jpg', 'tasks/b.jpg'] }],
            porty(),
        );
        expect(t.image_urls).toEqual([
            `${SIGN}tasks/a.jpg?token=T-tasks/a.jpg`,
            `${SIGN}tasks/b.jpg?token=T-tasks/b.jpg`,
        ]);
    });

    it('legacy image_url też podpisany, gdy wiersz ma image_path', async () => {
        const [t] = await withSignedTaskImages(
            [{ image_url: `${PUB}tasks/a.jpg`, image_path: 'tasks/a.jpg' }],
            porty(),
        );
        expect(t.image_url).toBe(`${SIGN}tasks/a.jpg?token=T-tasks/a.jpg`);
    });

    it('wiersz BEZ kluczy → stary adres bez zmian (okres przejściowy)', async () => {
        const [t] = await withSignedTaskImages(
            [{ image_urls: [`${PUB}tasks/stare.jpg`], image_paths: null }],
            porty(),
        );
        expect(t.image_urls).toEqual([`${PUB}tasks/stare.jpg`]);
    });

    it('awaria Storage → stare adresy, a NIE pusta galeria', async () => {
        // Pusta lista wygląda jak skasowane zdjęcia. Dopóki bucket jest publiczny,
        // stary adres ratuje sytuację; po zamknięciu awaria będzie widoczna na pliku.
        const [t] = await withSignedTaskImages(
            [{ image_urls: [`${PUB}tasks/a.jpg`], image_paths: ['tasks/a.jpg'] }],
            porty({ podpisz: async () => new Map() }),
        );
        expect(t.image_urls).toEqual([`${PUB}tasks/a.jpg`]);
    });

    it('nie mutuje wiersza wejściowego', async () => {
        const wejscie = { image_urls: [`${PUB}tasks/a.jpg`], image_paths: ['tasks/a.jpg'] };
        await withSignedTaskImages([wejscie], porty());
        expect(wejscie.image_urls).toEqual([`${PUB}tasks/a.jpg`]);
    });
});

describe('normalizedTaskImageFields — zapis', () => {
    it('🔴 PODPISANY adres od klienta NIE trafia do bazy (token wygasa + fałszywa historia)', async () => {
        const out = await normalizedTaskImageFields(
            { image_urls: [`${SIGN}tasks/a.jpg?token=T-tasks/a.jpg`] },
            porty(),
        );
        expect(out.image_paths).toEqual(['tasks/a.jpg']);
        expect(out.image_urls).toEqual([`${PUB}tasks/a.jpg`]);
        expect(out.image_urls!.some(u => u.includes('token='))).toBe(false);
    });

    it('🔴 dwa zapisy pod rząd dają IDENTYCZNĄ wartość — diff historii nie kłamie', async () => {
        // Bez normalizacji każdy PATCH niósłby inny token i `task_history` notowałaby
        // „zmianę zdjęcia" przy każdym zapisie (`tasks/[id]/route.ts` diff po JSON.stringify).
        const a = await normalizedTaskImageFields({ image_urls: [`${SIGN}tasks/a.jpg?token=PIERWSZY`] }, porty());
        const b = await normalizedTaskImageFields({ image_urls: [`${SIGN}tasks/a.jpg?token=DRUGI`] }, porty());
        expect(JSON.stringify(a.image_urls)).toBe(JSON.stringify(b.image_urls));
    });

    it('adres publiczny od starej binarki przechodzi bez zmian', async () => {
        const out = await normalizedTaskImageFields({ image_urls: [`${PUB}tasks/a.jpg`] }, porty());
        expect(out.image_urls).toEqual([`${PUB}tasks/a.jpg`]);
        expect(out.image_paths).toEqual(['tasks/a.jpg']);
    });

    it('usunięcie zdjęcia → krótsza lista kluczy', async () => {
        const out = await normalizedTaskImageFields({ image_urls: [`${PUB}tasks/b.jpg`] }, porty());
        expect(out.image_paths).toEqual(['tasks/b.jpg']);
    });

    it('puste image_url → null w obu kolumnach', async () => {
        const out = await normalizedTaskImageFields({ image_url: '' }, porty());
        expect(out.image_url).toBeNull();
        expect(out.image_path).toBeNull();
    });

    it('RPC padło → ZERO pól, zapis zachowuje się jak przed zmianą', async () => {
        const out = await normalizedTaskImageFields(
            { image_urls: [`${SIGN}tasks/a.jpg?token=T`] },
            porty({ rozwiazKlucze: async () => null }),
        );
        expect(out).toEqual({});
    });

    it('pole nieobecne w body → nieobecne w wyniku (PATCH nie kasuje zdjęć przy zmianie statusu)', async () => {
        const out = await normalizedTaskImageFields({}, porty());
        expect('image_urls' in out).toBe(false);
        expect('image_url' in out).toBe(false);
        expect('image_paths' in out).toBe(false);
    });
});
