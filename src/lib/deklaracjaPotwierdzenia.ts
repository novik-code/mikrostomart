/**
 * POTWIERDZENIE WIZYTY = DEKLARACJA OBECNOŚCI — jedno źródło tekstu dla strony z linku SMS/push,
 * strefy pacjenta i odpowiedzi serwera (moduł bez zależności serwerowych, bezpieczny w kliencie).
 *
 * 🔴 PO CO (zgłoszenie właściciela 18.09.2026). Pacjenci potwierdzali wizytę z SMS-a albo pusha,
 * a potem ją odwoływali — w regulaminie odwołanie potwierdzonej wizyty wiąże się z kosztami.
 * Zmierzone na produkcji (90 dni): 52 odwołania/przełożenia przez pacjentów, z czego 48 przez
 * PUBLICZNY link z SMS-a lub ekran pusha w apce — a ta trasa w ogóle nie sprawdzała potwierdzenia.
 *
 * 🔑 Decyzje właściciela: numer 570 270 470 (z `brand.phone1`); o opłacie OGÓLNIE, z odesłaniem do
 * regulaminu — regulamin mówi o zadatku przy niestawieniu się, nie o „opłacie za przestój”, więc
 * tekst nie może obiecywać ani grozić czymś, czego regulamin nie zawiera.
 */

import { brand } from '@/lib/brandConfig';
import { formatPhoneDisplay, formatPhoneForTel } from '@/lib/phoneFormat';

/** Kody odmów — w polu `code` odpowiedzi (pole `error` zawsze jest zdaniem dla człowieka). */
export const KOD_WIZYTA_POTWIERDZONA = 'APPOINTMENT_CONFIRMED_LOCKED';
export const KOD_WIZYTA_ODWOLANA = 'APPOINTMENT_ALREADY_CANCELLED';

/** Numer do tekstów: „570 270 470” (spacje czytelniejsze niż myślniki `formatPhoneDisplay`). */
function numerZeSpacjami(telefon: string): string {
    const cyfry = telefon.replace(/\D/g, '');
    return cyfry.length === 9 ? `${cyfry.slice(0, 3)} ${cyfry.slice(3, 6)} ${cyfry.slice(6)}` : formatPhoneDisplay(telefon);
}

export const TELEFON_GABINETU = numerZeSpacjami(brand.phone1);
export const TELEFON_GABINETU_HREF = `tel:${formatPhoneForTel(brand.phone1)}`;
export const REGULAMIN_HREF = '/regulamin';

/** Punkty deklaracji — pokazywane PRZED kliknięciem „Potwierdzam”. */
export const DEKLARACJA_POTWIERDZENIA: readonly string[] = [
    'Klikając „Potwierdzam”, składasz deklarację obecności na tej wizycie.',
    'Potwierdzonej wizyty nie można już przełożyć ani odwołać — ani w aplikacji, ani przez stronę.',
    'Niestawienie się na potwierdzonej wizycie wiąże się z naliczeniem opłaty zgodnie z Regulaminem gabinetu.',
    `W nagłej sytuacji losowej prosimy o kontakt telefoniczny: ${TELEFON_GABINETU}.`,
];

/** Informacja po potwierdzeniu (i przy każdym ponownym wejściu na potwierdzoną wizytę). */
export const INFORMACJA_PO_POTWIERDZENIU =
    'Wizyta jest potwierdzona — nie można jej już przełożyć ani odwołać. ' +
    'Niestawienie się wiąże się z naliczeniem opłaty zgodnie z Regulaminem gabinetu. ' +
    `W nagłej sytuacji losowej zadzwoń: ${TELEFON_GABINETU}.`;

/**
 * Pełne zdanie odmowy dla odwołania/przełożenia potwierdzonej wizyty.
 * 🪤 MUSI być zdaniem ze spacjami: apka 1.3.x pokazuje pole `error` wprost, a ekran przełożenia
 * (`netState.loadErrorText`) uznaje napis BEZ spacji za techniczny i podmienia na ogólny błąd.
 */
export function tekstBlokadyPoPotwierdzeniu(akcja: 'odwolanie' | 'przelozenie'): string {
    const czasownik = akcja === 'odwolanie' ? 'odwołać' : 'przełożyć';
    return (
        `Tej wizyty nie można już ${czasownik}, ponieważ została potwierdzona — potwierdzenie jest deklaracją obecności. ` +
        'Niestawienie się wiąże się z naliczeniem opłaty zgodnie z Regulaminem gabinetu. ' +
        `W nagłej sytuacji losowej prosimy o kontakt telefoniczny: ${TELEFON_GABINETU}.`
    );
}

/**
 * 🔑 „Zgłoszono”, nie „odwołana”: odwołanie z linku/pusha NIE rusza Prodentisa — to prośba do
 * recepcji, która może jeszcze ustalić z pacjentem, że wizyta zostaje. Mówienie „wizyta odwołana”
 * godzinę przed wizytą, która w grafiku nadal stoi, byłoby nieprawdą (przegląd 18.09).
 */
export const TEKST_WIZYTA_JUZ_ODWOLANA =
    `Odwołanie tej wizyty zostało już zgłoszone, więc nie można jej teraz potwierdzić. Jeśli jednak chcesz przyjść, zadzwoń: ${TELEFON_GABINETU}.`;
