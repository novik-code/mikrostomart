/**
 * BLOKADA ODWOŁANIA I PRZEŁOŻENIA POTWIERDZONEJ WIZYTY — jedna reguła dla wszystkich tras pacjenta.
 *
 * 🔴 PO CO. Potwierdzenie wizyty (link z SMS-a, push, apka, strefa pacjenta) jest deklaracją
 * obecności. Do 18.09.2026 publiczne `POST /api/appointments/cancel` — wołane ze strony z linku
 * i z ekranu pusha w apce („Nie mogę przyjść”) — NIE sprawdzało potwierdzenia wcale; trasy strefy
 * blokowały, ale każda własnym, zaszytym warunkiem. Zmierzone: 48 z 52 odwołań pacjentów w 90 dni
 * szło właśnie tą niechronioną drogą. Teksty: `lib/deklaracjaPotwierdzenia.ts`.
 *
 * 🔑 KRYTERIUM TO FLAGA `attendance_confirmed === true`, NIGDY `status`. Cron przypomnień przy
 * ponownym upsercie nadpisuje `status: 'pending'` (flagi nie rusza), a publiczne odwołanie
 * przepisuje status na `reschedule_requested`. `null`/brak pola = NIE potwierdzona — kolumna jest
 * nullable, a blokowanie przy braku pola zatrzymałoby wszystkich.
 *
 * 🔴 PER WIZYTA, NIE PER WIERSZ (poprawka po przeglądzie 18.09). Pomiar „0 wizyt z >1 wierszem
 * w 90 dni” był prawdziwy, ale nie jest gwarancją: `/api/patients/appointments/create` dawało się
 * zmusić (id bez zera wiodącego + rozjazd formatu daty) do założenia DRUGIEGO, niepotwierdzonego
 * wiersza tej samej wizyty — a na nim odwołanie przechodziło i robiło DELETE w Prodentisie.
 * Dlatego trasy odwołania/przełożenia pytają, czy JAKIKOLWIEK wiersz tej wizyty (`prodentis_id`,
 * wszystkie zapisy tego samego numeru) ma potwierdzenie. Błąd odczytu → wynik samego wiersza
 * (awaria bazy nie może blokować zwykłych odwołań, a potwierdzony wiersz i tak blokuje).
 *
 * 🔑 „ODWOŁANA” = ZGŁOSZENIE, NIE FAKT. Link/push nie rusza Prodentisa — to prośba do recepcji.
 * Od 18.09 publiczne odwołanie zapisuje też trwałą flagę `cancellation_requested` (cron jej nie
 * nadpisuje — w odróżnieniu od `status`), a teksty mówią „zgłoszono odwołanie, zadzwoń”.
 *
 * 🪤 Recepcja NIE jest blokowana: personel odwołuje i przekłada w Prodentisie, a nasze trasy
 * DELETE/PUT do PMS to wyłącznie trasy pacjenta. Odblokowanie w nagłej sytuacji = admin
 * „↩️ Cofnij potwierdzenie” (`/api/admin/appointments/reset-confirmation`).
 */

import { NextResponse } from 'next/server';
import {
    KOD_WIZYTA_ODWOLANA,
    KOD_WIZYTA_POTWIERDZONA,
    tekstBlokadyPoPotwierdzeniu,
    TEKST_WIZYTA_JUZ_ODWOLANA,
} from '@/lib/deklaracjaPotwierdzenia';

export { KOD_WIZYTA_ODWOLANA, KOD_WIZYTA_POTWIERDZONA };

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

interface WierszWizyty {
    attendance_confirmed?: boolean | null;
    status?: string | null;
    cancellation_requested?: boolean | null;
    prodentis_id?: string | number | null;
    confirmation_token?: string | null;
}

/** Minimalny kształt klienta Supabase, którego potrzebuje sprawdzenie per wizyta (atrapy w testach). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- łańcuch PostgREST jest dynamiczny
type KlientBazy = { from: (tabela: string) => any };

/**
 * Wszystkie zapisy tego samego numeru wizyty: surowy, bez zer wiodących i kanoniczny 10-cyfrowy
 * (PMS oddaje `"0100234418"`, a klient potrafi przysłać `100234418` albo liczbę).
 */
export function wariantyIdWizyty(id: unknown): string[] {
    if (id === null || id === undefined) return [];
    const surowy = String(id).trim();
    if (!surowy) return [];
    const bezZer = surowy.replace(/^0+/, '') || '0';
    const warianty = new Set([surowy, bezZer]);
    if (/^\d+$/.test(bezZer) && bezZer.length < 10) warianty.add(bezZer.padStart(10, '0'));
    return [...warianty];
}

export function czyWizytaPotwierdzona(wiersz: WierszWizyty | null | undefined): boolean {
    return wiersz?.attendance_confirmed === true;
}

/**
 * Czy wizyta jest potwierdzona — w TYM wierszu albo w którymkolwiek innym wierszu tej samej
 * wizyty w PMS. Patrz nagłówek: blokada nie może zależeć od tego, który wiersz trafił do trasy.
 */
export async function czyWizytaPotwierdzonaGdziekolwiek(
    supabase: KlientBazy,
    wiersz: WierszWizyty | null | undefined,
): Promise<boolean> {
    if (czyWizytaPotwierdzona(wiersz)) return true;
    const warianty = wariantyIdWizyty(wiersz?.prodentis_id);
    if (warianty.length === 0) return false;
    try {
        const { data, error } = await supabase
            .from('appointment_actions')
            .select('id')
            .in('prodentis_id', warianty)
            .eq('attendance_confirmed', true)
            .limit(1);
        if (error) {
            console.warn('[BLOKADA-WIZYTY] Odczyt bliźniaczych wierszy nie powiódł się:', error.message);
            return false;
        }
        return Array.isArray(data) && data.length > 0;
    } catch (e) {
        console.warn('[BLOKADA-WIZYTY] Odczyt bliźniaczych wierszy rzucił:', e);
        return false;
    }
}

/**
 * Czy pacjent już odwołał tę wizytę (link/push → `reschedule_requested`, strefa → `cancelled`
 * albo flaga `cancellation_requested`). Potwierdzenie takiej wizyty zamroziłoby odwołaną wizytę.
 */
export function czyWizytaOdwolana(wiersz: WierszWizyty | null | undefined): boolean {
    if (!wiersz) return false;
    return wiersz.status === 'reschedule_requested' || wiersz.status === 'cancelled' || wiersz.cancellation_requested === true;
}

/**
 * Czy gabinet poprosił o potwierdzenie tej wizyty — cron przypomnień nadaje wierszowi
 * `confirmation_token` razem z SMS-em/pushem „potwierdź wizytę”. Wiersz założony przez
 * samą strefę pacjenta (`/create`) tokenu nie ma.
 */
export function czyGabinetProsiOPotwierdzenie(wiersz: WierszWizyty | null | undefined): boolean {
    return typeof wiersz?.confirmation_token === 'string' && wiersz.confirmation_token.length > 0;
}

/** Okno potwierdzenia w strefie bez prośby gabinetu (od zawsze). */
export const OKNO_POTWIERDZENIA_H = 24;
/** Okno po prośbie gabinetu — TO SAMO co publiczny `/api/appointments/confirm` (link z SMS-a/pusha). */
export const OKNO_PO_PROSBIE_H = 7 * 24;

/**
 * Ile godzin przed wizytą strefa pacjenta (apka, strona) pozwala potwierdzić obecność.
 *
 * 🔴 PO CO (zgłoszenie właściciela 18.09.2026). Push „potwierdź wizytę” w poniedziałek przychodzi
 * w piątek (~75 h wcześniej), a strefa pokazywała „Potwierdź obecność” dopiero 24 h przed wizytą.
 * Pacjent, który nie tapnął pusha od razu (albo tapnął i wyszedł), nie miał jak wrócić do
 * potwierdzenia — w strefie widział tylko „Przełóż” i „Odwołaj”. Po prośbie gabinetu strefa
 * pozwala więc potwierdzić w tym samym oknie co link; bez prośby zostaje dotychczasowe 24 h.
 */
export function oknoPotwierdzeniaH(wiersz: WierszWizyty | null | undefined): number {
    return czyGabinetProsiOPotwierdzenie(wiersz) ? OKNO_PO_PROSBIE_H : OKNO_POTWIERDZENIA_H;
}

/**
 * Odpowiedź odmowy dla odwołania/przełożenia potwierdzonej wizyty (DOWOLNY wiersz tej wizyty) — albo `null`, gdy wolno.
 *
 * `status`: publiczne odwołanie dostaje 409 (nowa odpowiedź), trasy strefy zostają przy 400,
 * które zwracały dotąd przy potwierdzonej wizycie — kontrakt z binarkami 1.3.x tylko rośnie
 * (dochodzi `code`, `message`, `locked`, a `error` jest pełnym zdaniem, które apka pokazuje wprost).
 */
export async function odmowaDlaPotwierdzonejWizyty(
    supabase: KlientBazy,
    wiersz: WierszWizyty | null | undefined,
    akcja: 'odwolanie' | 'przelozenie',
    status: 400 | 409 = 409,
): Promise<NextResponse | null> {
    if (!(await czyWizytaPotwierdzonaGdziekolwiek(supabase, wiersz))) return null;
    const tekst = tekstBlokadyPoPotwierdzeniu(akcja);
    return NextResponse.json(
        { error: tekst, message: tekst, code: KOD_WIZYTA_POTWIERDZONA, locked: true },
        { status, headers: NO_STORE },
    );
}

export function odmowaPotwierdzeniaOdwolanej(): NextResponse {
    return NextResponse.json(
        { error: TEKST_WIZYTA_JUZ_ODWOLANA, message: TEKST_WIZYTA_JUZ_ODWOLANA, code: KOD_WIZYTA_ODWOLANA },
        { status: 409, headers: NO_STORE },
    );
}
