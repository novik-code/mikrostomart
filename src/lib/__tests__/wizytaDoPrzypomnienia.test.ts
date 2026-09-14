/**
 * Wspólna reguła „która wizyta dostaje przypomnienie” + czas ścienny Warszawy.
 *
 * 🔑 RÓWNOWAŻNOŚĆ. Reguła została wyciągnięta z `cron/appointment-reminders` (2026-09-14),
 * żeby `push-appointment-1h` przestał wysyłać pushe do wpisów informacyjnych recepcji.
 * Wyciąganie kodu z crona, który codziennie decyduje o SMS-ach do ~30 pacjentów, nie może
 * zmienić ani jednej decyzji. Dlatego niżej stoi DOSŁOWNA kopia starej logiki (z commita
 * sprzed zmiany) i obie wersje są porównywane na pełnej siatce: godziny × minuty × pole
 * robocze × lekarze × telefon.
 */
import { describe, it, expect } from 'vitest';
import { ocenWizyteDoPrzypomnienia, czyLekarzNaLiscie, czasSciennyWarszawy, LEKARZE_PRZYPOMNIEN } from '../wizytaDoPrzypomnienia';

// ── DOSŁOWNA kopia logiki z `cron/appointment-reminders` przed wyciągnięciem (e0727af9) ──
function isDoctorInListStare(apiDoctorName: string, doctorList: string[]): boolean {
    const normalize = (name: string) =>
        name.replace(/\s*\(I\)\s*/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedApi = normalize(apiDoctorName);
    return doctorList.some((listName) => {
        const normalizedList = normalize(listName);
        const apiParts = normalizedApi.split(' ');
        const listParts = normalizedList.split(' ');
        return listParts.every((part) => apiParts.some((ap) => ap.includes(part) || part.includes(ap)))
            || apiParts.every((part) => listParts.some((lp) => lp.includes(part) || part.includes(lp)));
    });
}
type Wizyta = { date: string; isWorkingHour?: boolean | null; patientPhone?: string | null; doctor?: { id?: string; name?: string } | null };
/** `true` = stary cron doszedłby do generowania SMS-a; `false` = `continue` albo wyjątek. */
function staryCronPrzepuszcza(appointment: Wizyta, REMINDER_DOCTORS: string[]): boolean {
    try {
        const appointmentDate = new Date(appointment.date);
        const appointmentHour = appointmentDate.getUTCHours();
        const appointmentMinute = appointmentDate.getUTCMinutes();
        const doctorName = (appointment.doctor as { name: string }).name.replace(/\s*\(I\)\s*/g, ' ').trim();
        const isNowosielska = doctorName.toLowerCase().includes('nowosielska')
            && (doctorName.toLowerCase().includes('elżbieta') || doctorName.toLowerCase().includes('elzbieta'));
        if (isNowosielska) {
            const totalMinutes = appointmentHour * 60 + appointmentMinute;
            if (totalMinutes < 8 * 60 + 30 || totalMinutes >= 16 * 60) return false;
        } else {
            if (appointment.isWorkingHour !== true) return false;
            if (appointmentHour < 8 || appointmentHour >= 20) return false;
        }
        if (!appointment.patientPhone) return false;
        if (!isNowosielska && !isDoctorInListStare(doctorName, REMINDER_DOCTORS)) return false;
        return true;
    } catch {
        return false;
    }
}

describe('równoważność z cronem przypomnień sprzed wyciągnięcia', () => {
    const lekarze = [
        { name: 'Elżbieta Nowosielska' }, { name: 'Elzbieta Nowosielska (I)' }, { name: 'Marcin Nowosielski' },
        { name: 'Małgorzata Maćków-Huras' }, { name: 'Katarzyna Halupczok (I)' }, { name: 'KONSULTACYJNY Pokój' },
        { name: 'Dominika Milicz' }, { name: 'Aleksandra Modelska-Kępa' }, { name: '' }, null, undefined,
    ];
    const przypadki: Wizyta[] = [];
    for (let h = 0; h < 24; h++) for (const m of [0, 15, 29, 30, 45]) for (const isWorkingHour of [true, false, null, undefined])
        for (const doctor of lekarze) for (const patientPhone of ['600100200', '', null])
            przypadki.push({ date: `2026-09-15T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`, isWorkingHour, patientPhone, doctor: doctor === undefined ? undefined : doctor });

    it(`🔴 ${przypadki.length} przypadków: każda decyzja identyczna`, () => {
        const rozjazdy = przypadki.filter((w) =>
            staryCronPrzepuszcza(w, LEKARZE_PRZYPOMNIEN) !== ocenWizyteDoPrzypomnienia(w, { lekarze: LEKARZE_PRZYPOMNIEN }).ok);
        expect(rozjazdy.slice(0, 5)).toEqual([]);
        // Kontrola miernika: siatka ma obie decyzje, inaczej porównanie niczego nie dowodzi.
        expect(przypadki.some((w) => staryCronPrzepuszcza(w, LEKARZE_PRZYPOMNIEN))).toBe(true);
        expect(przypadki.some((w) => !staryCronPrzepuszcza(w, LEKARZE_PRZYPOMNIEN))).toBe(true);
    });

    it('dopasowanie nazwisk identyczne z dotychczasowym', () => {
        for (const n of ['Maćków Huras', 'maćków-huras (I)', 'Halupczok', 'Jan Kowalski', 'Ilona']) {
            expect(czyLekarzNaLiscie(n, LEKARZE_PRZYPOMNIEN)).toBe(isDoctorInListStare(n, LEKARZE_PRZYPOMNIEN));
        }
    });
});

describe('push bez wymogu telefonu', () => {
    it('wizyta bez numeru: SMS pomija, push przepuszcza', () => {
        const w = { date: '2026-09-15T10:00:00.000Z', isWorkingHour: true, patientPhone: '', doctor: { name: 'Ilona Piechaczek' } };
        expect(ocenWizyteDoPrzypomnienia(w, { lekarze: LEKARZE_PRZYPOMNIEN })).toMatchObject({ ok: false, powod: 'brak_telefonu' });
        expect(ocenWizyteDoPrzypomnienia(w, { lekarze: LEKARZE_PRZYPOMNIEN, wymagajTelefonu: false }).ok).toBe(true);
    });

    it('🔴 wpis informacyjny recepcji o 03:45 z pełnymi danymi → pominięty także dla pusha', () => {
        const w = { date: '2026-09-14T03:45:00.000Z', isWorkingHour: true, patientPhone: '600100200', doctor: { name: 'Ilona Piechaczek' } };
        expect(ocenWizyteDoPrzypomnienia(w, { lekarze: LEKARZE_PRZYPOMNIEN, wymagajTelefonu: false }))
            .toMatchObject({ ok: false, powod: 'poza_godzinami_gabinetu', godzina: '03:45' });
    });
});

describe('czas ścienny Warszawy', () => {
    it('lato (CEST, UTC+2): 07:30Z → 09:30 w polach UTC', () => {
        expect(czasSciennyWarszawy(new Date('2026-09-14T07:30:00Z')).toISOString()).toBe('2026-09-14T09:30:00.000Z');
    });

    it('zima (CET, UTC+1): 07:30Z → 08:30', () => {
        expect(czasSciennyWarszawy(new Date('2026-01-14T07:30:00Z')).toISOString()).toBe('2026-01-14T08:30:00.000Z');
    });

    it('przejście przez północ: 22:30Z latem to już następny dzień w Warszawie', () => {
        expect(czasSciennyWarszawy(new Date('2026-09-14T22:30:00Z')).toISOString()).toBe('2026-09-15T00:30:00.000Z');
    });
});
