/**
 * Która wizyta z grafiku Prodentisa dostaje przypomnienie — JEDNA reguła dla wszystkich cronów.
 *
 * ══ PO CO TO POWSTAŁO (2026-09-14) ═════════════════════════════════════════
 * Reguła żyła wyłącznie w `cron/appointment-reminders`. `cron/push-appointment-1h` jej nie
 * miał i brał KAŻDY wpis z grafiku, także wpisy informacyjne recepcji z godzinami 01:00–07:59
 * (decyzja właściciela: to notatki, nie wizyty). Skutek zmierzony 14.09: push „Wizyta za
 * godzinę!” do pacjentów o 4:30 i 5:30 rano. To klasyczne „naprawa objęła jedną trasę z pary”,
 * dlatego reguła wychodzi do wspólnego modułu, a oba crony ją wołają.
 *
 * 🔑 Logika jest przeniesiona BEZ ZMIAN (kolejność filtrów, wyjątek dr Nowosielskiej,
 * dopasowanie nazwisk). Równoważność z kodem sprzed wyciągnięcia pilnuje test
 * `wizytaDoPrzypomnienia.test.ts` na pełnej siatce przypadków.
 *
 * Moduł jest czysty (bez bazy i sieci).
 */

/** Lekarze, których pacjenci dostają przypomnienia. `REMINDER_DOCTORS` (po przecinku) nadpisuje listę. */
export const LEKARZE_PRZYPOMNIEN = process.env.REMINDER_DOCTORS?.split(',').map((d) => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz',
    'Elżbieta Nowosielska',
];

/** Okno godzin gabinetu (czas ścienny Warszawy): [8:00, 20:00). */
export const MIN_GODZINA_GABINETU = 8;
export const MAX_GODZINA_GABINETU = 20;

/**
 * Fuzzy doctor name matching — normalizes and compares name parts.
 * Handles variations like "Maćków-Huras" vs "Maćków Huras", with/without "(I)" suffix.
 */
export function czyLekarzNaLiscie(apiDoctorName: string, doctorList: string[]): boolean {
    const normalize = (name: string) =>
        name.replace(/\s*\(I\)\s*/g, ' ')
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    const normalizedApi = normalize(apiDoctorName);

    return doctorList.some((listName) => {
        const normalizedList = normalize(listName);
        const apiParts = normalizedApi.split(' ');
        const listParts = normalizedList.split(' ');
        return listParts.every((part) => apiParts.some((ap) => ap.includes(part) || part.includes(ap)))
            || apiParts.every((part) => listParts.some((lp) => lp.includes(part) || part.includes(lp)));
    });
}

export interface WizytaZGrafiku {
    /** Czas ścienny Warszawy zapisany jako ISO z `Z` — tak oddaje go Prodentis. */
    date: string;
    isWorkingHour?: boolean | null;
    patientPhone?: string | null;
    doctor?: { id?: string | null; name?: string | null } | null;
}

export type PowodPominieciaWizyty =
    | 'nowosielska_poza_godzinami'
    | 'pole_nie_robocze'
    | 'poza_godzinami_gabinetu'
    | 'brak_telefonu'
    | 'lekarz_spoza_listy'
    | 'brak_lekarza';

export type OcenaWizyty =
    | { ok: true; godzina: string; lekarz: string; nowosielska: boolean }
    | { ok: false; powod: PowodPominieciaWizyty; godzina: string; lekarz: string; nowosielska: boolean };

/**
 * @param wymagajTelefonu SMS-owe przypomnienie potrzebuje numeru; push go nie potrzebuje.
 */
export function ocenWizyteDoPrzypomnienia(
    apt: WizytaZGrafiku,
    opcje: { lekarze: string[]; wymagajTelefonu?: boolean },
): OcenaWizyty {
    // Prodentis oddaje czas ścienny Warszawy jako ISO z `Z`, więc godziny UTC = godziny polskie.
    const data = new Date(apt.date);
    const hh = data.getUTCHours();
    const mm = data.getUTCMinutes();
    const godzina = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

    // 🪤 Bez POLA nazwiska stary kod rzucał wyjątek (`appointment.doctor.name.replace`) i wizyta
    // wypadała — to odtwarzamy jako `brak_lekarza`. PUSTY napis wyjątku nie rzucał i przechodził
    // przez listę lekarzy (`''.includes` jest zawsze prawdą), więc zostaje przepuszczony tak jak
    // dotąd: wyciągnięcie reguły nie może zmienić ani jednej decyzji (test równoważności).
    const surowaNazwa = apt.doctor?.name;
    if (surowaNazwa === undefined || surowaNazwa === null) {
        return { ok: false, powod: 'brak_lekarza', godzina, lekarz: '', nowosielska: false };
    }
    const lekarz = surowaNazwa.replace(/\s*\(I\)\s*/g, ' ').trim();

    // Wyjątek: dr Elżbieta Nowosielska zapisuje pacjentów na dowolnym polu (białym, szarym,
    // czerwonym) — nie obowiązuje jej `isWorkingHour`, tylko własne godziny 8:30–16:00.
    const nowosielska = lekarz.toLowerCase().includes('nowosielska')
        && (lekarz.toLowerCase().includes('elżbieta') || lekarz.toLowerCase().includes('elzbieta'));

    if (nowosielska) {
        const minuty = hh * 60 + mm;
        if (minuty < 8 * 60 + 30 || minuty >= 16 * 60) {
            return { ok: false, powod: 'nowosielska_poza_godzinami', godzina, lekarz, nowosielska };
        }
    } else {
        // Pole białe vs szare/czerwone w kalendarzu Prodentisa.
        if (apt.isWorkingHour !== true) {
            return { ok: false, powod: 'pole_nie_robocze', godzina, lekarz, nowosielska };
        }
        // Łapie wpisy informacyjne recepcji (5:45, 6:45, 7:15…), które mają `isWorkingHour = true`.
        if (hh < MIN_GODZINA_GABINETU || hh >= MAX_GODZINA_GABINETU) {
            return { ok: false, powod: 'poza_godzinami_gabinetu', godzina, lekarz, nowosielska };
        }
    }

    if ((opcje.wymagajTelefonu ?? true) && !apt.patientPhone) {
        return { ok: false, powod: 'brak_telefonu', godzina, lekarz, nowosielska };
    }

    if (!nowosielska && !czyLekarzNaLiscie(lekarz, opcje.lekarze)) {
        return { ok: false, powod: 'lekarz_spoza_listy', godzina, lekarz, nowosielska };
    }

    return { ok: true, godzina, lekarz, nowosielska };
}

/**
 * Chwila jako CZAS ŚCIENNY Warszawy zapisany w polach UTC — ten sam format co daty z Prodentisa.
 *
 * 🔴 PO CO. `push-appointment-1h` porównywał datę wizyty (czas polski z `Z`) z `new Date()`
 * (prawdziwy UTC). Latem to 2 h różnicy: okno „45–75 min przed wizytą” łapało wizyty, które
 * ZACZĘŁY SIĘ 45–75 min wcześniej. Zmierzone: 24 z 24 pushy od 07.09 przyszło po starcie wizyty.
 */
export function czasSciennyWarszawy(chwila: Date = new Date()): Date {
    const czesci = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Warsaw', hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).formatToParts(chwila).map((p) => [p.type, p.value]),
    );
    return new Date(Date.UTC(
        Number(czesci.year), Number(czesci.month) - 1, Number(czesci.day),
        Number(czesci.hour), Number(czesci.minute), Number(czesci.second), chwila.getUTCMilliseconds(),
    ));
}
