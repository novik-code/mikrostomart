import { describe, it, expect, vi } from 'vitest';
import { czasWizyty, DOMYSLNY_CZAS_MIN } from '../bookingDuration';

/**
 * Strażnik defektu, który dostawca PMS wykrył u siebie, a my potwierdziliśmy u siebie:
 * wszystkie 50 rezerwacji online stało w grafiku na 30 minut, łącznie z higienizacjami,
 * które trwają 60. Przyczyna: `booking.duration || 30` przy kolumnie, której NIE MA.
 */

/** Atrapa `employees` — zwraca to, co ustawimy, w kształcie supabase-js. */
const baza = (odp: { data?: unknown; error?: { message: string } | null }) =>
    ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    eq: () => ({ maybeSingle: async () => ({ data: odp.data ?? null, error: odp.error ?? null }) }),
                }),
            }),
        }),
    }) as never;

describe('czasWizyty', () => {
    it('🔴 higienistka dostaje 60 minut, nie 30', async () => {
        const r = await czasWizyty(baza({ data: { booking_duration_minutes: 60 } }), {
            doctor_prodentis_id: '0100000003', // Elżbieta Nowosielska
        });
        expect(r.minuty).toBe(60);
        expect(r.zrodlo).toBe('employees');
    });

    it('lekarz dostaje swoje 30 minut — z bazy, nie z domyślnej wartości', async () => {
        const r = await czasWizyty(baza({ data: { booking_duration_minutes: 30 } }), {
            doctor_prodentis_id: '0100000001',
        });
        expect(r.minuty).toBe(30);
        expect(r.zrodlo).toBe('employees'); // 🔑 ta sama liczba, ale INNE źródło niż fallback
    });

    it('czas zapamiętany przy rezerwacji ma pierwszeństwo przed ustawieniem specjalisty', async () => {
        const r = await czasWizyty(baza({ data: { booking_duration_minutes: 30 } }), {
            doctor_prodentis_id: '0100000003',
            duration_minutes: 90,
        });
        expect(r.minuty).toBe(90);
        expect(r.zrodlo).toBe('rezerwacja');
    });

    it('🪤 BŁĄD zapytania nie może udawać „brak ustawienia"', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const r = await czasWizyty(baza({ error: { message: 'column does not exist' } }), {
            doctor_prodentis_id: '0100000003',
        });
        // Wynik jest domyślny, ale awaria ZOSTAJE ZAPISANA — inaczej ten defekt wróciłby po cichu.
        expect(r.zrodlo).toBe('domyslny');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('brak specjalisty → domyślne 30, ale głośno', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const r = await czasWizyty(baza({ data: null }), {});
        expect(r.minuty).toBe(DOMYSLNY_CZAS_MIN);
        expect(r.zrodlo).toBe('domyslny');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('DOWÓD COFKI: stary wzorzec dawał 30 minut na higienizację', async () => {
        // Dokładnie to, co stało w `scheduleWithIds` do 2026-09-04.
        const booking: { duration?: number | null } = {}; // kolumny `duration` NIE MA → undefined
        const staryWynik = booking.duration || 30;

        const nowyWynik = (
            await czasWizyty(baza({ data: { booking_duration_minutes: 60 } }), {
                doctor_prodentis_id: '0100000003',
            })
        ).minuty;

        expect(staryWynik).toBe(30); // ← okno o połowę za krótkie na zabieg
        expect(nowyWynik).toBe(60);
    });
});
