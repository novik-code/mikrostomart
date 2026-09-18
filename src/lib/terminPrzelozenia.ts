/**
 * Czy nowy termin przełożenia jest WOLNY U LEKARZA TEJ WIZYTY.
 *
 * 🔴 PO CO (zgłoszenie właściciela 18.09.2026). Pacjentka przełożyła wizytę u Ilony Piechaczek
 * na 12.10, 16:30 — a Ilona 12.10 przyjmuje 09:00–15:00; 16:30 było wolne WYŁĄCZNIE u innej
 * lekarki. Ekran przełożenia (apka `przeloz.tsx` z `SlotPicker specialist={null}` i webowy
 * `RescheduleAppointmentModal`) pokazywał SUMĘ wolnych godzin wszystkich lekarzy, a trasa
 * przełożenia przesuwała wizytę TEGO lekarza na wybraną godzinę bez żadnego sprawdzenia.
 * Prodentis (`PUT /reschedule`) odrzuca tylko kolizję (409), nie godziny pracy — więc wizyta
 * wylądowała poza grafikiem przyjęć.
 *
 * 🔑 Bramka stoi na SERWERZE, bo klient może być dowolny (apka 1.3.x bez OTA, strona, żądanie
 * wprost). Źródło prawdy = ta sama lista wolnych terminów PMS, z której korzysta kalendarz
 * (`/api/slots/free`), zawężona do lekarza wizyty i JEJ czasu trwania.
 * 🪤 „Nie wiemy” (PMS nie odpowiada) ≠ „termin wolny”: wynik `nieznany` — wołający odmawia
 * (fail-closed). Przełożenie bez sprawdzenia to dokładnie ten błąd.
 */

import { prodentisFetch } from '@/lib/prodentisFetch';
import { zbudujZapytanieSlotow } from '@/lib/slotsQuery';

export type WynikTerminu = 'wolny' | 'niedostepny' | 'nieznany';

/** Najkrótszy czas, o który PMS odpowiada terminami (polityka `strict`). */
export const MIN_DLUGOSC_MIN = 30;

/** `0100000024` i `100000024` to ten sam lekarz — PMS i nasze wiersze różnie zapisują zera. */
function tenSamId(a: unknown, b: unknown): boolean {
    const n = (v: unknown) => String(v ?? '').trim().replace(/^0+/, '');
    return n(a) !== '' && n(a) === n(b);
}

export async function sprawdzTerminULekarza(opts: {
    doctorId: string | null | undefined;
    date: string;
    time: string;
    duration: number;
}): Promise<WynikTerminu> {
    const { doctorId, date, time } = opts;
    if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return 'nieznany';
    // 🪤 Minimum 30 min: PMS (polityka `strict`, domyślna od v11.13) na `duration` < 30 oddaje PUSTĄ
    // listę (`duration_below_minimum`) — zmierzone 18.09: 15 min → 0 terminów, 30 min → 6. Bez
    // podłogi każda wizyta 15-minutowa dostawałaby „termin niedostępny”. Okno 30 min mieści krótszą.
    const duration = Math.max(MIN_DLUGOSC_MIN, Number.isFinite(opts.duration) && opts.duration > 0 ? Math.round(opts.duration) : 30);

    const zapytanie = zbudujZapytanieSlotow(new URLSearchParams({
        date,
        duration: String(duration),
        doctor: String(doctorId).trim().padStart(10, '0'),
    }));
    if (!zapytanie.ok) return 'nieznany';

    try {
        const res = await prodentisFetch(`/api/slots/free?${zapytanie.query}`, { timeoutMs: 8000 });
        if (!res.ok) {
            console.warn(`[TERMIN-PRZELOZENIA] PMS ${res.status} dla ${date} ${time} (lekarz ${doctorId}) — nie wiemy`);
            return 'nieznany';
        }
        const dane = await res.json();
        const sloty: Array<{ doctor?: unknown; start?: unknown }> = Array.isArray(dane)
            ? dane
            : Array.isArray(dane?.slots) ? dane.slots : [];
        if (!Array.isArray(dane) && !Array.isArray(dane?.slots)) return 'nieznany';
        // 🔑 Czas ścienny gabinetu z NAPISU (jak kalendarz w apce): PMS bywa bez offsetu albo z „Z”.
        const wolny = sloty.some((s) =>
            tenSamId(s.doctor, doctorId)
            && typeof s.start === 'string'
            && s.start.slice(0, 10) === date
            && s.start.slice(11, 16) === time);
        return wolny ? 'wolny' : 'niedostepny';
    } catch (e) {
        console.warn(`[TERMIN-PRZELOZENIA] Błąd zapytania PMS dla ${date} ${time}:`, e);
        return 'nieznany';
    }
}
