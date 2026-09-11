/**
 * ZABEZPIECZENIE: e-Karta wypełniona, a zgody niepodpisane.
 *
 * ══ PO CO TO POWSTAŁO (2026-09-11) ═════════════════════════════════════════
 * Właściciel zgłosił, że u nowych pacjentów w Prodentisie „pojawia się tylko
 * e-Karta, bez biometrii podpisu". Diagnoza na danych z produkcji: kod działał,
 * a biometria podpisu powstaje WYŁĄCZNIE przy podpisywaniu ZGÓD na tablecie —
 * e-Karta nigdy jej nie wysyłała. U tych pacjentów nikt nie wystawił linku do
 * zgód; w trzech z czterech przypadków rejestracja nawet nie otworzyła okna zgód.
 *
 * I to nie było nowe: od lipca do 07.09 aż 42% e-Kart nowych pacjentów nie miało
 * tego samego dnia wystawionego linku do zgód. Status e-Karty był widoczny dopiero
 * wewnątrz okna zgód — czyli tam, gdzie nikt nie zaglądał, gdy o zgodach zapomniał.
 *
 * Ten moduł liczy regułę, którą panel pokazuje w miejscu pracy rejestracji:
 * „ten pacjent wypełnił dziś e-Kartę, a zgód dziś nie podpisał".
 *
 * Moduł jest CZYSTY: zero wejścia/wyjścia, zero zależności, nigdy nie rzuca.
 */

export type FlagiZgod = { ekartaDzis: boolean; zgodyDzis: boolean };

type WierszEkarty = { prodentis_patient_id: string | null; submitted_at: string | null };
/**
 * `signed_at`, nie `created_at`. Obie kolumny mają dziś `DEFAULT now()` i trasa
 * podpisu nie ustawia żadnej z nich, ale „kiedy podpisano" znaczy tylko `signed_at`
 * (i tylko ona ma indeks — migracja 058).
 */
type WierszZgody = { prodentis_patient_id: string | null; signed_at: string | null };

const FORMAT_DNIA = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/**
 * Dzień KALENDARZOWY GABINETU (Europe/Warsaw) dla znacznika czasu z bazy.
 *
 * 🪤 Baza trzyma UTC, a serwer Vercela chodzi w UTC. Zgoda podpisana o 00:30
 * czasu polskiego ma w UTC datę DNIA POPRZEDNIEGO — licząc dzień z samego
 * ISO, przypisalibyśmy ją do złej wizyty. W godzinach pracy gabinetu to się
 * nie zdarza, ale reguła ma być poprawna, a nie „zwykle poprawna".
 */
export function dzienWarszawa(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return FORMAT_DNIA.format(d);
}

export function kluczDniaPacjenta(dzien: string, patientId: string): string {
    return `${dzien}|${patientId}`;
}

/** Zbiory „dzień|pacjent", w których była e-Karta i w których były zgody. */
export function zbudujZbioryZgod(
    ekarty: ReadonlyArray<WierszEkarty>,
    zgody: ReadonlyArray<WierszZgody>,
): { ekarty: Set<string>; zgody: Set<string> } {
    const zbiorEkart = new Set<string>();
    const zbiorZgod = new Set<string>();
    for (const e of ekarty) {
        const dzien = dzienWarszawa(e.submitted_at);
        if (dzien && e.prodentis_patient_id) zbiorEkart.add(kluczDniaPacjenta(dzien, String(e.prodentis_patient_id)));
    }
    for (const z of zgody) {
        const dzien = dzienWarszawa(z.signed_at);
        if (dzien && z.prodentis_patient_id) zbiorZgod.add(kluczDniaPacjenta(dzien, String(z.prodentis_patient_id)));
    }
    return { ekarty: zbiorEkart, zgody: zbiorZgod };
}

/** Flagi dla jednej wizyty: `dzien` to data z grafiku (YYYY-MM-DD, dzień gabinetu). */
export function flagiDlaWizyty(
    dzien: string,
    patientId: string | null | undefined,
    zbiory: { ekarty: Set<string>; zgody: Set<string> },
): FlagiZgod {
    if (!patientId) return { ekartaDzis: false, zgodyDzis: false };
    const k = kluczDniaPacjenta(dzien, String(patientId));
    return { ekartaDzis: zbiory.ekarty.has(k), zgodyDzis: zbiory.zgody.has(k) };
}

/**
 * Czy grafik każe ostrzec rejestrację.
 *
 * 🔑 BRAK FLAG = BRAK OSTRZEŻENIA. Trasa grafiku nie dokłada flag, gdy któreś
 * z zapytań padło — wtedy nie wiemy nic, a fałszywe „brak zgód" u wszystkich
 * pacjentów z e-Kartą szybko nauczyłoby rejestrację ignorować to ostrzeżenie.
 */
export function wymagaZgod(apt: { ekartaDzis?: boolean; zgodyDzis?: boolean } | null | undefined): boolean {
    return apt?.ekartaDzis === true && apt?.zgodyDzis !== true;
}

/**
 * Czy panel ma POKAZAĆ ostrzeżenie: reguła z grafiku minus to, co panel sam
 * zobaczył później.
 *
 * 🪤 Flagi przychodzą z grafiku, a grafik nie odświeża się sam. Pacjent podpisuje
 * zgody na tablecie kilka minut po wystawieniu linku — bez tej poprawki baner
 * „zgody niepodpisane" wisiałby nad kimś, kto już podpisał, i rejestracja
 * wystawiłaby link drugi raz. `podpisaneLokalnie` to klucze dzień|pacjent ze zgód
 * pobranych przy otwarciu okna zgód.
 */
export function pokazOstrzezenieZgod(
    apt: { patientId?: string | null; ekartaDzis?: boolean; zgodyDzis?: boolean } | null | undefined,
    dzien: string | null | undefined,
    podpisaneLokalnie: ReadonlySet<string>,
): boolean {
    if (!wymagaZgod(apt)) return false;
    if (dzien && apt?.patientId && podpisaneLokalnie.has(kluczDniaPacjenta(dzien, String(apt.patientId)))) {
        return false;
    }
    return true;
}
