import { describe, it, expect } from 'vitest';
import {
    cleanArticleTitle,
    articleSeoTitle,
    articleSeoDescription,
    SERP_TITLE_MAX,
    SERP_DESCRIPTION_MAX,
} from '@/lib/articleSeo';

const BRAND = 'Mikrostomart';

describe('cleanArticleTitle', () => {
    it('zdejmuje ogon z marka doklejony w bazie', () => {
        const t = 'Ile kanałów mają zęby — anatomia | Mikrostomart Opole';
        expect(cleanArticleTitle(t, BRAND)).toBe('Ile kanałów mają zęby — anatomia');
    });

    it('zdejmuje kilka ogonow z marka', () => {
        const t = 'Urazy zębów | Mikrostomart Opole | Baza Wiedzy Mikrostomart';
        expect(cleanArticleTitle(t, BRAND)).toBe('Urazy zębów');
    });

    it('NIE rusza pionowej kreski, ktora jest czescia tytulu', () => {
        const t = 'Implanty | koszt, przebieg i trwałość';
        expect(cleanArticleTitle(t, BRAND)).toBe(t);
    });

    it('nie zwraca pustego stringa gdy tytul to sama marka', () => {
        expect(cleanArticleTitle('Mikrostomart Opole', BRAND)).toBe('Mikrostomart Opole');
    });

    it('radzi sobie z pustym wejsciem', () => {
        expect(cleanArticleTitle('', BRAND)).toBe('');
    });
});

describe('articleSeoTitle', () => {
    it('dokleja marke gdy tytul jest krotki', () => {
        const out = articleSeoTitle('Licówki krok po kroku', BRAND);
        expect(out).toBe('Licówki krok po kroku | Mikrostomart');
        expect(out.length).toBeLessThanOrEqual(SERP_TITLE_MAX);
    });

    it('NIE dokleja marki gdy tytul jest dlugi — sufiks i tak bylby niewidoczny', () => {
        const long = 'Ile kanałów mają zęby i dlaczego pomijają je nieumiejętni dentyści';
        const out = articleSeoTitle(long, BRAND);
        expect(out).toBe(long);
        expect(out).not.toContain('| Mikrostomart');
    });

    it('nie powiela marki, gdy jest juz w tytule z bazy', () => {
        const out = articleSeoTitle('Krótki tytuł | Mikrostomart Opole', BRAND);
        expect(out.match(/Mikrostomart/g)).toHaveLength(1);
    });
});

describe('articleSeoDescription', () => {
    it('zostawia krotki opis bez zmian', () => {
        expect(articleSeoDescription('Krótki opis.')).toBe('Krótki opis.');
    });

    it('przycina dlugi opis do limitu', () => {
        const long = 'Anatomia kanałów korzeniowych. '.repeat(20);
        const out = articleSeoDescription(long)!;
        expect(out.length).toBeLessThanOrEqual(SERP_DESCRIPTION_MAX);
    });

    it('przycina na granicy slowa, nie w polowie wyrazu', () => {
        const long = 'Anatomia kanałów korzeniowych siekaczy oraz trzonowców i przedtrzonowców w codziennej praktyce endodontycznej prowadzonej pod mikroskopem operacyjnym ZEISS Extaro w naszym gabinecie w Opolu przy ulicy Centralnej';
        const out = articleSeoDescription(long)!;
        expect(out.endsWith('…')).toBe(true);
        // ostatni "wyraz" przed wielokropkiem musi byc pelnym slowem z oryginalu
        const lastWord = out.slice(0, -1).trim().split(' ').pop()!;
        expect(long.split(' ')).toContain(lastWord);
    });

    it('zwraca undefined dla pustego wejscia', () => {
        expect(articleSeoDescription(null)).toBeUndefined();
        expect(articleSeoDescription(undefined)).toBeUndefined();
        expect(articleSeoDescription('')).toBeUndefined();
    });
});
