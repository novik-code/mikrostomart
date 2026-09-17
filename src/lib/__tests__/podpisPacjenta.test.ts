/**
 * STRAŻNIK PODGLĄDU PODPISU PACJENTA (e-Karta i zgody na tablecie).
 *
 * 🔴 CO BYŁO ZEPSUTE. Przycisk pod polem podpisu wysyłał dokument od razu — dwie przypadkowe kreski
 * i dotyk „Wyślij" szły do Prodentisa bez możliwości poprawy (link e-Karty jest jednorazowy).
 * Zmierzone 17.09: 51 z 399 e-Kart bez podpisu, 13 z pustym obrazem; 14 z 2976 zgód z ≤30 punktami.
 *
 * Strażnik WYKONUJE przejścia stanu. Każdy blok mówi, jaka regresja go zapali:
 * — wysyłka bez podglądu (potwierdzenie z rysowania),
 * — podwójne tapnięcie (potwierdzenie w czasie blokady albo drugi raz w trakcie wysyłki),
 * — „podpis" z samego dotknięcia albo z pustego obrazu,
 * — zgubiony podpis po nieudanej wysyłce,
 * — kasowanie płótna przy zmianie samej wysokości okna (pasek adresu iOS).
 */
import { describe, expect, it } from 'vitest';
import {
    BLOKADA_PODGLADU_MS,
    RYSOWANIE,
    maTusz,
    podpiszPonownie,
    pokazPodglad,
    potwierdzPodpis,
    przyciskiPodgladuAktywne,
    rysowanieAktywne,
    trzebaPrzeskalowac,
    wysylkaNieudana,
    type PotwierdzonyPodpis,
    type StanPodpisu,
} from '@/lib/podpisPacjenta';

const OBRAZ = 'data:image/png;base64,iVBORw0KGgo=';
const T0 = 1_000_000;

const kreska = (...pkt: Array<[number, number]>) => pkt.map(([x, y]) => ({ x, y }));

describe('maTusz — co jest podpisem', () => {
    it('samo dotknięcie płótna (punkt bez ruchu) NIE jest podpisem', () => {
        expect(maTusz([])).toBe(false);
        expect(maTusz([kreska([10, 10])])).toBe(false);
        expect(maTusz([kreska([10, 10], [10, 10], [10, 10])])).toBe(false);
    });

    it('kreska z ruchem jest podpisem — także bardzo krótka (decyzja: bez oceny długości)', () => {
        expect(maTusz([kreska([10, 10], [11, 10])])).toBe(true);
        expect(maTusz([kreska([10, 10]), kreska([5, 5], [5, 9])])).toBe(true);
    });

    it('nieruchomy rysik z ułamkowym pierwszym punktem i zaokrąglonymi kolejnymi NIE jest podpisem (przegląd 17.09)', () => {
        // zgody: pierwszy punkt surowy 120.337, kolejne `Math.round(x*10)/10` = 120.3 — to nie ruch
        expect(maTusz([kreska([120.337, 50.0421], [120.3, 50], [120.3, 50])])).toBe(false);
        expect(maTusz([kreska([120.337, 50], [121.9, 50])])).toBe(true);
    });
});

describe('pokazPodglad — przejście „Dalej"', () => {
    it('z realnym śladem i obrazem PNG pokazuje podgląd z migawką obrazu i danych', () => {
        const dane = { strokes: [1, 2] };
        const s = pokazPodglad<typeof dane>(RYSOWANIE as StanPodpisu<typeof dane>, OBRAZ, dane, true, T0);
        expect(s).toEqual({ etap: 'podglad', obraz: OBRAZ, dane, pokazanoOd: T0 });
    });

    it('bez śladu, z pustym albo nie-PNG obrazem zostaje na rysowaniu', () => {
        const r = RYSOWANIE as StanPodpisu;
        expect(pokazPodglad(r, OBRAZ, undefined, false, T0).etap).toBe('rysowanie');
        expect(pokazPodglad(r, '', undefined, true, T0).etap).toBe('rysowanie');
        expect(pokazPodglad(r, 'data:image/png;base64,', undefined, true, T0).etap).toBe('rysowanie');
        expect(pokazPodglad(r, 'data:image/svg+xml;base64,PHN2Zz4=', undefined, true, T0).etap).toBe('rysowanie');
    });

    it('nie nadpisuje trwającego podglądu ani wysyłki (drugi „Dalej")', () => {
        const podglad = pokazPodglad(RYSOWANIE as StanPodpisu, OBRAZ, undefined, true, T0);
        const inny = 'data:image/png;base64,QUFBQQ==';
        expect(pokazPodglad(podglad, inny, undefined, true, T0 + 5)).toBe(podglad);
    });
});

describe('potwierdzPodpis — jedyna droga do wysyłki', () => {
    const podglad = pokazPodglad(RYSOWANIE as StanPodpisu, OBRAZ, undefined, true, T0);

    it('z rysowania NIE da się potwierdzić — wysyłka zawsze wymaga podglądu', () => {
        expect(potwierdzPodpis(RYSOWANIE as StanPodpisu, T0 + 10_000)).toBeNull();
    });

    it('w czasie blokady po pokazaniu podglądu dotyk jest ignorowany (podwójne tapnięcie)', () => {
        expect(przyciskiPodgladuAktywne(podglad, T0)).toBe(false);
        expect(potwierdzPodpis(podglad, T0)).toBeNull();
        expect(potwierdzPodpis(podglad, T0 + BLOKADA_PODGLADU_MS - 1)).toBeNull();
        expect(podpiszPonownie(podglad, T0 + BLOKADA_PODGLADU_MS - 1)).toBe(podglad);
    });

    it('blokada jest odczuwalna dla człowieka, ale krótka', () => {
        expect(BLOKADA_PODGLADU_MS).toBeGreaterThanOrEqual(500);
        expect(BLOKADA_PODGLADU_MS).toBeLessThanOrEqual(1500);
    });

    it('po blokadzie oddaje dokładnie obejrzany obraz i dane, a stan przechodzi w wysyłkę', () => {
        const dane = { pointCount: 42 };
        const p = pokazPodglad<typeof dane>(RYSOWANIE as StanPodpisu<typeof dane>, OBRAZ, dane, true, T0);
        const w = potwierdzPodpis(p, T0 + BLOKADA_PODGLADU_MS);
        expect(w).not.toBeNull();
        expect(w!.podpis.obraz).toBe(OBRAZ);
        expect(w!.podpis.dane).toBe(dane);
        expect(w!.stan.etap).toBe('wysylanie');
    });

    it('dotyk ZACZĘTY w trakcie blokady i puszczony po niej nie zatwierdza (click przychodzi przy puszczeniu palca)', () => {
        const poBlokadzie = T0 + BLOKADA_PODGLADU_MS + 50;
        expect(potwierdzPodpis(podglad, poBlokadzie, T0 + 400)).toBeNull();
        expect(podpiszPonownie(podglad, poBlokadzie, T0 + 400)).toBe(podglad);
        expect(potwierdzPodpis(podglad, poBlokadzie, T0 + BLOKADA_PODGLADU_MS)).not.toBeNull();
        // bez zapisanego dotyku (klawiatura) liczy się sama chwila kliknięcia
        expect(potwierdzPodpis(podglad, poBlokadzie, null)).not.toBeNull();
    });

    it('drugi dotyk w trakcie wysyłki nie wysyła drugi raz', () => {
        const w = potwierdzPodpis(podglad, T0 + BLOKADA_PODGLADU_MS)!;
        expect(potwierdzPodpis(w.stan, T0 + 60_000)).toBeNull();
    });

    it('podpisu potwierdzonego nie da się sfałszować literałem (pilnuje tsc w CI)', () => {
        // @ts-expect-error — PotwierdzonyPodpis powstaje wyłącznie w potwierdzPodpis()
        const podrobka: PotwierdzonyPodpis = { obraz: OBRAZ, dane: undefined };
        expect(podrobka.obraz).toBe(OBRAZ);
    });
});

describe('podpiszPonownie i wysylkaNieudana', () => {
    const podglad = pokazPodglad(RYSOWANIE as StanPodpisu, OBRAZ, undefined, true, T0);

    it('„Podpisz ponownie" po blokadzie wraca do pustego płótna i unieważnia stary podgląd', () => {
        const r = podpiszPonownie(podglad, T0 + BLOKADA_PODGLADU_MS);
        expect(r.etap).toBe('rysowanie');
        expect(potwierdzPodpis(r, T0 + 60_000)).toBeNull();
    });

    it('po „Podpisz ponownie" widok rysowania ma WŁASNĄ blokadę — drugie tapnięcie nie trafia w zgodę pod palcem', () => {
        const teraz = T0 + BLOKADA_PODGLADU_MS;
        const r = podpiszPonownie(podglad, teraz);
        expect(rysowanieAktywne(r, teraz)).toBe(false);
        expect(rysowanieAktywne(r, teraz + BLOKADA_PODGLADU_MS - 1)).toBe(false);
        expect(rysowanieAktywne(r, teraz + BLOKADA_PODGLADU_MS)).toBe(true);
        // i „Dalej" w tym czasie też nie pokaże podglądu
        expect(pokazPodglad(r, OBRAZ, undefined, true, teraz + 10).etap).toBe('rysowanie');
        expect(pokazPodglad(r, OBRAZ, undefined, true, teraz + BLOKADA_PODGLADU_MS).etap).toBe('podglad');
        // pierwsze wejście (i nowy dokument) nie ma blokady
        expect(rysowanieAktywne(RYSOWANIE as StanPodpisu, T0)).toBe(true);
    });

    it('„Podpisz ponownie" w trakcie wysyłki nic nie robi', () => {
        const w = potwierdzPodpis(podglad, T0 + BLOKADA_PODGLADU_MS)!;
        expect(podpiszPonownie(w.stan, T0 + 60_000)).toBe(w.stan);
    });

    it('nieudana wysyłka wraca do TEGO SAMEGO podglądu z nową blokadą — pacjent nie podpisuje się od nowa', () => {
        const w = potwierdzPodpis(podglad, T0 + BLOKADA_PODGLADU_MS)!;
        const po = wysylkaNieudana(w.stan, T0 + 5_000);
        expect(po).toEqual({ etap: 'podglad', obraz: OBRAZ, dane: undefined, pokazanoOd: T0 + 5_000 });
        expect(potwierdzPodpis(po, T0 + 5_000)).toBeNull();
        expect(potwierdzPodpis(po, T0 + 5_000 + BLOKADA_PODGLADU_MS)?.podpis.obraz).toBe(OBRAZ);
    });

    it('wysylkaNieudana poza wysyłką nie zmienia stanu', () => {
        expect(wysylkaNieudana(podglad, T0 + 1)).toBe(podglad);
        expect(wysylkaNieudana(RYSOWANIE as StanPodpisu, T0 + 1).etap).toBe('rysowanie');
    });
});

describe('trzebaPrzeskalowac — kiedy płótno (i podpis) wolno wyczyścić', () => {
    it('pierwsze ustawienie płótna zawsze skaluje', () => {
        expect(trzebaPrzeskalowac(null, 600)).toBe(true);
    });

    it('ta sama szerokość (np. `resize` od paska adresu iOS) NIE kasuje podpisu', () => {
        expect(trzebaPrzeskalowac(600, 600)).toBe(false);
        expect(trzebaPrzeskalowac(600, 600.4)).toBe(false);
    });

    it('zmiana szerokości (obrót tabletu) skaluje — strona musi wtedy wyczyścić też zapis', () => {
        expect(trzebaPrzeskalowac(600, 820)).toBe(true);
    });
});
