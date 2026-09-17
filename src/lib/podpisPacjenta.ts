/**
 * PODPIS PACJENTA NA TABLECIE — podgląd i potwierdzenie przed wysyłką (e-Karta i zgody).
 *
 * 🔴 PO CO. Do 17.09.2026 przycisk pod polem podpisu wysyłał dokument OD RAZU. Pacjent, który
 * po dwóch kreskach dotknął „Wyślij", nie miał odwrotu: link e-Karty jest jednorazowy, a zgoda
 * szła do Prodentisa razem z PDF-em i trajektorią podpisu. Zmierzone na produkcji 17.09:
 * 51 z 399 e-Kart BEZ podpisu (we wrześniu 8 z 42), 13 z pustym obrazem, 16 z „kropką";
 * 14 z 2976 zgód podpisanych na ≤30 punktach albo w ≤0,7 s.
 *
 * 🔑 JEDYNA DROGA DO WYSYŁKI prowadzi przez `potwierdzPodpis`, które oddaje `PotwierdzonyPodpis`
 * — typ, którego nie da się zbudować poza tym modułem (znak `unique symbol`). Funkcje wysyłające
 * na obu stronach przyjmują WYŁĄCZNIE ten typ, więc `tsc` w CI nie przepuści wysyłki, która
 * ominęła podgląd.
 *
 * 🔑 OBRAZ I BIOMETRIA Z JEDNEJ MIGAWKI. Podgląd zapamiętuje dokładnie to, co pokazał pacjentowi,
 * a wysyłka bierze właśnie to — nie czyta płótna drugi raz (w chwili potwierdzenia płótna
 * nie ma już w drzewie).
 *
 * 🪤 BLOKADA PO POKAZANIU PODGLĄDU. Drugi dotyk podwójnego tapnięcia w „Dalej" trafiłby w przycisk
 * podglądu, który właśnie wyrósł pod palcem. Przez `BLOKADA_PODGLADU_MS` OBA przyciski podglądu
 * nie reagują — także „Podpisz ponownie", żeby przypadkowy dotyk nie kasował dobrego podpisu.
 *
 * 🪤 WSZYSTKO, CO CZYŚCI PŁÓTNO, MUSI CZYŚCIĆ ZAPIS. Przeskalowanie płótna kasuje rysunek; do 17.09
 * kreski zostawały wtedy w pamięci i jechały do formularza albo do biometrii, choć pacjent
 * ich nie widział. Strony wykonują tę regułę, `trzebaPrzeskalowac` mówi, kiedy.
 */

/** Ile ms po pokazaniu podglądu jego przyciski ignorują dotyk. */
export const BLOKADA_PODGLADU_MS = 800;

export interface PunktRysunku {
    readonly x: number;
    readonly y: number;
}

/** O ile px punkt musi odejść od początku kreski, żeby to był RUCH, a nie drganie dotyku. */
export const MIN_RUCH_PX = 1;

/**
 * Czy rysunek zostawił ślad: co najmniej jedna kreska z RUCHEM. Samo dotknięcie płótna
 * (punkt bez przesunięcia) nie rysuje niczego, więc nie jest podpisem.
 *
 * 🪤 Ruch liczymy ODLEGŁOŚCIĄ, nie nierównością współrzędnych: nieruchomy rysik wysyła
 * `pointermove` przy zmianie nacisku, a zapis zaokrągla punkty — `120.3 !== 120.337` udawało
 * ruch (wyłapane przeglądem 17.09).
 *
 * ⚪ Świadomie BEZ oceny „za krótki" — decyzja właściciela 17.09: pacjent sam ocenia podpis
 * na podglądzie (starsze osoby podpisują się krótko).
 */
export function maTusz(kreski: ReadonlyArray<ReadonlyArray<PunktRysunku>>): boolean {
    return kreski.some(
        (k) => k.length >= 2 && k.some((p) => Math.hypot(p.x - k[0].x, p.y - k[0].y) >= MIN_RUCH_PX),
    );
}

/**
 * Stan przepływu. `rysowanie.od` = chwila powrotu z podglądu („Podpisz ponownie"): przez blokadę
 * widok rysowania NIE przyjmuje dotyku — drugie tapnięcie w „Podpisz ponownie" trafiłoby w wiersz
 * zgody, który wyrósł pod palcem (na e-Karcie: po cichu zaznaczona zgoda marketingowa).
 */
export type StanPodpisu<T = undefined> =
    | { readonly etap: 'rysowanie'; readonly od?: number }
    | { readonly etap: 'podglad'; readonly obraz: string; readonly dane: T; readonly pokazanoOd: number }
    | { readonly etap: 'wysylanie'; readonly obraz: string; readonly dane: T };

export const RYSOWANIE: StanPodpisu<never> = { etap: 'rysowanie' };

declare const znakPotwierdzenia: unique symbol;

/** Podpis, który pacjent OBEJRZAŁ i zatwierdził. Powstaje wyłącznie w `potwierdzPodpis`. */
export interface PotwierdzonyPodpis<T = undefined> {
    readonly obraz: string;
    readonly dane: T;
    readonly [znakPotwierdzenia]: true;
}

const PREFIKS_OBRAZU = 'data:image/png;base64,';

/**
 * Czy wartość jest obrazem podpisu w formacie, który tworzy płótno (PNG jako data URL).
 * Używane także PO STRONIE SERWERA: e-Karta bez podpisu nie jest przyjmowana (decyzja
 * właściciela 17.09) — również ze starej, zbuforowanej wersji strony na tablecie.
 */
export function czyObrazPodpisuPng(wartosc: unknown): wartosc is string {
    return (
        typeof wartosc === 'string' &&
        wartosc.startsWith(PREFIKS_OBRAZU) &&
        wartosc.length > PREFIKS_OBRAZU.length
    );
}

/** Przejście „Dalej": tylko z rysowania, tylko z realnym śladem i poprawnym obrazem PNG. */
export function pokazPodglad<T>(
    stan: StanPodpisu<T>,
    obraz: string,
    dane: T,
    tusz: boolean,
    teraz: number,
): StanPodpisu<T> {
    if (!rysowanieAktywne(stan, teraz)) return stan;
    if (!tusz || !czyObrazPodpisuPng(obraz)) return stan;
    return { etap: 'podglad', obraz, dane, pokazanoOd: teraz };
}

/** Czy widok rysowania przyjmuje dotyk (poza blokadą po powrocie z podglądu). */
export function rysowanieAktywne<T>(stan: StanPodpisu<T>, teraz: number): boolean {
    return stan.etap === 'rysowanie' && (stan.od === undefined || teraz - stan.od >= BLOKADA_PODGLADU_MS);
}

/**
 * Czy przycisk podglądu wolno uznać: blokada minęła w chwili kliknięcia ORAZ w chwili, gdy palec
 * DOTKNĄŁ ekranu. 🪤 `click` przychodzi przy PUSZCZENIU palca — dotyk zaczęty w trakcie blokady
 * i puszczony po niej przechodziłby, gdyby liczyć sam `click` (wyłapane przeglądem 17.09).
 * `poczatekDotyku` nieznany (klawiatura) = liczy się tylko chwila kliknięcia.
 */
export function przyciskiPodgladuAktywne<T>(stan: StanPodpisu<T>, teraz: number, poczatekDotyku?: number | null): boolean {
    if (stan.etap !== 'podglad') return false;
    if (teraz - stan.pokazanoOd < BLOKADA_PODGLADU_MS) return false;
    return poczatekDotyku == null || poczatekDotyku - stan.pokazanoOd >= BLOKADA_PODGLADU_MS;
}

/** „Podpisz ponownie": z podglądu (po blokadzie) z powrotem do pustego płótna — z własną blokadą. */
export function podpiszPonownie<T>(stan: StanPodpisu<T>, teraz: number, poczatekDotyku?: number | null): StanPodpisu<T> {
    return przyciskiPodgladuAktywne(stan, teraz, poczatekDotyku) ? { etap: 'rysowanie', od: teraz } : stan;
}

/**
 * „Podpis prawidłowy": JEDYNE miejsce, w którym powstaje `PotwierdzonyPodpis`.
 * `null`, gdy podglądu nie ma, blokada trwa (w chwili kliknięcia albo dotknięcia)
 * albo wysyłka już ruszyła (drugi dotyk).
 */
export function potwierdzPodpis<T>(
    stan: StanPodpisu<T>,
    teraz: number,
    poczatekDotyku?: number | null,
): { stan: StanPodpisu<T>; podpis: PotwierdzonyPodpis<T> } | null {
    if (stan.etap !== 'podglad' || !przyciskiPodgladuAktywne(stan, teraz, poczatekDotyku)) return null;
    return {
        stan: { etap: 'wysylanie', obraz: stan.obraz, dane: stan.dane },
        podpis: { obraz: stan.obraz, dane: stan.dane } as PotwierdzonyPodpis<T>,
    };
}

/** Wysyłka padła: wracamy do TEGO SAMEGO podglądu (pacjent nie podpisuje się od nowa), z nową blokadą. */
export function wysylkaNieudana<T>(stan: StanPodpisu<T>, teraz: number): StanPodpisu<T> {
    if (stan.etap !== 'wysylanie') return stan;
    return { etap: 'podglad', obraz: stan.obraz, dane: stan.dane, pokazanoOd: teraz };
}

/**
 * Czy płótno trzeba przeskalować — a tym samym wyczyścić rysunek i zapis.
 *
 * 🪤 iOS Safari zgłasza `resize` przy chowaniu i pokazywaniu paska adresu. Do 17.09 każde takie
 * zdarzenie ustawiało `canvas.width` od nowa, co KASUJE rysunek w połowie podpisu. Sama zmiana
 * wysokości okna nie może więc ruszać płótna — tylko zmiana jego SZEROKOŚCI (obrót tabletu).
 */
export function trzebaPrzeskalowac(poprzedniaSzerokosc: number | null, nowaSzerokosc: number): boolean {
    return poprzedniaSzerokosc === null || Math.round(poprzedniaSzerokosc) !== Math.round(nowaSzerokosc);
}
