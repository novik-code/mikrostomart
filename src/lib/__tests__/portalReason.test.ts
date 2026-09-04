import { describe, it, expect } from 'vitest';
import { powodPortalu } from '../portalReason';

/**
 * Format uzgodniony z dostawcą PMS: prefiks maszynowy — opis dla człowieka.
 * PMS filtruje po prefiksie; recepcja czyta opis w Prodentisie przy skreślonej wizycie.
 * DOWÓD COFKI: wysyłanie samego polskiego opisu (jak przed 2026-09-04) wywala trzy pierwsze
 * asercje — bo znika jedyny maszynowy znacznik pochodzenia, jaki mamy.
 */
describe('powodPortalu', () => {
    it('odwołanie bez powodu pacjenta', () => {
        expect(powodPortalu('cancel')).toBe('portal:cancel — pacjent odwołał przez portal');
    });

    it('przełożenie bez powodu pacjenta', () => {
        expect(powodPortalu('reschedule')).toBe('portal:reschedule — pacjent przełożył przez portal');
    });

    it('🔑 prefiks jest ZAWSZE, także gdy pacjent nic nie napisał', () => {
        for (const pusty of ['', '   ', null, undefined]) {
            expect(powodPortalu('cancel', pusty as string | null | undefined)).toMatch(/^portal:cancel — /);
        }
    });

    it('powód pacjenta dopisany po dwukropku, prefiks nietknięty', () => {
        expect(powodPortalu('cancel', 'Wyjazd służbowy'))
            .toBe('portal:cancel — pacjent odwołał przez portal: Wyjazd służbowy');
    });

    it('🪤 łamania linii i nadmiar spacji spłaszczone — notatka jest jednoliniowa', () => {
        expect(powodPortalu('reschedule', '  Muszę\n\nprzełożyć   wizytę  '))
            .toBe('portal:reschedule — pacjent przełożył przez portal: Muszę przełożyć wizytę');
    });

    it('bardzo długi powód przycięty, prefiks przetrwa', () => {
        const wynik = powodPortalu('cancel', 'x'.repeat(500));
        expect(wynik.startsWith('portal:cancel — pacjent odwołał przez portal: ')).toBe(true);
        expect(wynik.endsWith('…')).toBe(true);
        expect(wynik.length).toBeLessThan(220);
    });

    it('prefiks da się odciąć maszynowo po półpauzie', () => {
        const [prefiks] = powodPortalu('cancel', 'cokolwiek').split(' — ');
        expect(prefiks).toBe('portal:cancel');
    });
});
