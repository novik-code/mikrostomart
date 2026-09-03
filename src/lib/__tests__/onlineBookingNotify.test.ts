import { describe, it, expect } from 'vitest';
import { decideBookingNotification } from '../onlineBookingNotify';

/**
 * Strażnik usterki z 2026-09-03: pacjent dostawał „wizyta POTWIERDZONA" także wtedy,
 * gdy zapis do grafiku Prodentisa padł. Dowód cofki: przywrócenie starego warunku
 * (`action === 'approve' || action === 'reject'` bez wglądu w wynik zapisu) wywala
 * pierwsze trzy przypadki poniżej.
 */
describe('decideBookingNotification', () => {
    it('zatwierdzenie + wizyta W GRAFIKU → potwierdzenie dla pacjenta', () => {
        expect(decideBookingNotification({ action: 'approve', scheduledNow: true, scheduledBefore: false }))
            .toBe('confirmed');
    });

    it('🔴 zatwierdzenie + zapis PADŁ → CISZA (nie obiecujemy wizyty, której nie ma)', () => {
        expect(decideBookingNotification({ action: 'approve', scheduledNow: false, scheduledBefore: false }))
            .toBeNull();
    });

    it('🔴 zatwierdzenie bez klucza API (zapis nawet nie próbowany) → CISZA', () => {
        // MISSING_API_KEY: kod nie woła Prodentisa w ogóle, więc scheduledNow=false
        expect(decideBookingNotification({ action: 'approve', scheduledNow: false, scheduledBefore: false }))
            .toBeNull();
    });

    it('ręczne ponowienie, które SIĘ UDAŁO → potwierdzenie (pacjent go jeszcze nie dostał)', () => {
        expect(decideBookingNotification({ action: 'schedule', scheduledNow: true, scheduledBefore: false }))
            .toBe('confirmed');
    });

    it('ponowienie na wizycie JUŻ w grafiku → cisza (żadnego drugiego SMS-a)', () => {
        expect(decideBookingNotification({ action: 'schedule', scheduledNow: true, scheduledBefore: true }))
            .toBeNull();
    });

    it('ponowienie, które znowu padło → cisza', () => {
        expect(decideBookingNotification({ action: 'schedule', scheduledNow: false, scheduledBefore: false }))
            .toBeNull();
    });

    it('odmowa → informujemy zawsze, niezależnie od grafiku', () => {
        expect(decideBookingNotification({ action: 'reject', scheduledNow: false, scheduledBefore: false }))
            .toBe('rejected');
    });

    it('pozostałe akcje panelu nie powiadamiają pacjenta', () => {
        for (const action of ['fail', 'pick_patient', 'cokolwiek']) {
            expect(decideBookingNotification({ action, scheduledNow: true, scheduledBefore: false }))
                .toBeNull();
        }
    });
});
