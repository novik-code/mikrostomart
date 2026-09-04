import { describe, it, expect, vi, afterEach } from 'vitest';
import { odswiezWizyte, rozjazdWizyty, type WizytaPMS } from '../prodentisAppointment';
import { prodentisFetch } from '../prodentisFetch';

/**
 * 🪤 Mock stoi na `prodentisFetch`, NIE na globalnym `fetch`. Od migracji 2026-09-04 klucz API
 * wstrzykuje wyłącznie ten helper, więc mockowanie `fetch` omijałoby `getPMSConfig()` i test
 * pytałby realnej bazy o klucz — a przy jego braku KAŻDY przypadek wracał jako `unavailable`
 * i trzy asercje padały z powodu, który nie miał nic wspólnego z badaną logiką.
 */
vi.mock('../prodentisFetch', () => ({ prodentisFetch: vi.fn() }));
const mockFetch = vi.mocked(prodentisFetch);

const WIZYTA: WizytaPMS = {
    id: '0100234418', patientId: '0100001110', doctorId: '0100000001',
    doctorName: 'Marcin Nowosielski', date: '2026-09-11', startTime: '16:30',
    endTime: '17:00', duration: 30, status: 'scheduled', cancelDate: null,
};

const odp = (status: number, body?: unknown) => ({
    status, ok: status >= 200 && status < 300, json: async () => body,
}) as unknown as Response;

afterEach(() => { vi.restoreAllMocks(); mockFetch.mockReset(); });

/**
 * Strażnik punktu 3h. Najważniejsza asercja to ta o AWARII: `unavailable` nie może być
 * mylone z „wizyty nie ma" — inaczej pacjent usłyszy, że jego wizyta zniknęła, tylko dlatego,
 * że PMS akurat nie odpowiedział. Ta sama rodzina błędu co w kalendarzu.
 */
describe('odswiezWizyte', () => {
    it('wizyta istnieje → zwraca ŚWIEŻY stan z PMS', async () => {
        mockFetch.mockResolvedValue(odp(200, WIZYTA));
        const r = await odswiezWizyte('0100234418', 'klucz');
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.wizyta.startTime).toBe('16:30');
    });

    it('404 → identyfikator nieaktualny (wizytę przełożono, powstał nowy rekord)', async () => {
        mockFetch.mockResolvedValue(odp(404, { error: 'Appointment not found' }));
        expect(await odswiezWizyte('0100234418', 'klucz')).toEqual({ ok: false, powod: 'not_found' });
    });

    it('🔑 wizyta SKREŚLONA wraca ze statusem 200 — samo res.ok nie wystarcza', async () => {
        mockFetch.mockResolvedValue(odp(200, { ...WIZYTA, status: 'cancelled', cancelDate: '2026-05-04' }));
        const r = await odswiezWizyte('0100216357', 'klucz');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.powod).toBe('cancelled');
    });

    it('🔴 AWARIA PMS to „nie wiemy", NIE „wizyty nie ma"', async () => {
        mockFetch.mockResolvedValue(odp(502, {}));
        expect(await odswiezWizyte('0100234418', 'klucz')).toEqual({ ok: false, powod: 'unavailable' });
    });

    it('🔴 timeout / zerwana sieć też są „nie wiemy"', async () => {
        mockFetch.mockImplementation(async () => { throw new Error('The operation was aborted'); });
        expect(await odswiezWizyte('0100234418', 'klucz')).toEqual({ ok: false, powod: 'unavailable' });
    });

    it('brak identyfikatora → „nie wiemy", bez wołania sieci', async () => {
        expect(await odswiezWizyte(null)).toEqual({ ok: false, powod: 'unavailable' });
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('🔑 brak KLUCZA to też „nie wiemy" — ale sprawdza go już helper, nie ta funkcja', async () => {
        // Kontrakt zmieniony świadomie w migracji 2026-09-04: klucz przestał być parametrem
        // tej funkcji i wstrzykuje go wyłącznie `prodentisFetch`. Wynik dla wołającego jest
        // IDENTYCZNY („nie wiemy"), zmieniło się tylko to, KTO wykrywa brak.
        mockFetch.mockRejectedValue(
            Object.assign(new Error('brak klucza'), { name: 'BrakKluczaPMS' }),
        );
        expect(await odswiezWizyte('0100234418')).toEqual({ ok: false, powod: 'unavailable' });
    });

    it('odpowiedź bez `id` traktujemy jak awarię, nie jak wizytę', async () => {
        mockFetch.mockResolvedValue(odp(200, { cos: 'innego' }));
        expect(await odswiezWizyte('0100234418', 'klucz')).toEqual({ ok: false, powod: 'unavailable' });
    });
});

describe('rozjazdWizyty', () => {
    it('🪤 realny przypadek z produkcji: u nas 14:30, w PMS 16:30', () => {
        expect(rozjazdWizyty(WIZYTA, { date: '2026-09-11', time: '14:30:00' }))
            .toEqual(['godzina: u nas 14:30, w PMS 16:30']);
    });

    it('wykrywa zmianę lekarza — 28% rezerwacji wg pomiaru dostawcy PMS', () => {
        expect(rozjazdWizyty(WIZYTA, { doctorProdentisId: '0100000024' }))
            .toEqual(['lekarz: u nas 0100000024, w PMS 0100000001']);
    });

    it('zgodny stan → brak rozjazdu', () => {
        expect(rozjazdWizyty(WIZYTA, { date: '2026-09-11', time: '16:30', doctorProdentisId: '0100000001' }))
            .toEqual([]);
    });

    it('brakujące pola po naszej stronie nie generują fałszywego rozjazdu', () => {
        expect(rozjazdWizyty(WIZYTA, { date: null, time: null, doctorProdentisId: null })).toEqual([]);
    });
});
