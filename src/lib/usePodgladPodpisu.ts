'use client';

/**
 * Hook podglądu podpisu — cienka warstwa Reacta nad `podpisPacjenta.ts` (tam reguły i powody).
 *
 * 🪤 Stan trzymamy RÓWNIEŻ w refie: dwa dotknięcia w jednej klatce widziałyby w domknięciu ten sam,
 * nieaktualny stan i oba przeszłyby przez `potwierdzPodpis`. Przejścia liczymy zawsze od refa.
 *
 * 🪤 Przyciski podglądu NIE dostają atrybutu `disabled` w czasie blokady. Wyłączony przycisk nie
 * przekazuje `pointerdown`, więc nie dałoby się rozpoznać dotyku zaczętego w trakcie blokady
 * i puszczonego po niej. Strona podpina `dotyk` pod `onPointerDownCapture` kontenera podglądu
 * i przekazuje zdarzenie kliknięcia do `ponownie`/`potwierdz`; decyzję podejmuje logika.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    BLOKADA_PODGLADU_MS,
    RYSOWANIE,
    podpiszPonownie,
    pokazPodglad,
    potwierdzPodpis,
    wysylkaNieudana,
    type PotwierdzonyPodpis,
    type StanPodpisu,
} from '@/lib/podpisPacjenta';

/**
 * Czas dotyku dla TEGO kliknięcia, zużywany jednorazowo.
 * 🪤 Kliknięcie z klawiatury / czytnika ekranu (`detail === 0`) nie ma dotyku — dostaje `null`.
 * Bez zużywania dotyk odrzucony w blokadzie zostawał w refie i blokował każde późniejsze
 * kliknięcie bez `pointerdown` (wyłapane drugą rundą przeglądu 17.09).
 */
function zuzyjDotyk(dotykRef: { current: number | null }, zdarzenie?: { detail?: number }): number | null {
    const t = zdarzenie?.detail === 0 ? null : dotykRef.current;
    dotykRef.current = null;
    return t;
}

export function usePodgladPodpisu<T = undefined>() {
    const [stan, ustawStan] = useState<StanPodpisu<T>>(RYSOWANIE as StanPodpisu<T>);
    const stanRef = useRef<StanPodpisu<T>>(stan);
    const dotykRef = useRef<number | null>(null);
    const [odblokowane, ustawOdblokowane] = useState(false);

    const zmien = useCallback((nowy: StanPodpisu<T>) => {
        stanRef.current = nowy;
        dotykRef.current = null;
        ustawStan(nowy);
        ustawOdblokowane(false);
    }, []);

    // Koniec blokady — dla podglądu (od pokazania) i dla rysowania po „Podpisz ponownie".
    // `odblokowane` to tylko wygląd i `pointer-events`; o przejściu decyduje logika z bieżącym czasem.
    const blokadaOd = stan.etap === 'podglad' ? stan.pokazanoOd : stan.etap === 'rysowanie' ? (stan.od ?? null) : null;
    useEffect(() => {
        if (blokadaOd === null) return;
        const zostalo = Math.max(0, BLOKADA_PODGLADU_MS - (Date.now() - blokadaOd));
        const t = setTimeout(() => ustawOdblokowane(true), zostalo + 20);
        return () => clearTimeout(t);
    }, [blokadaOd]);

    const aktywne = stan.etap === 'podglad' && odblokowane;
    const rysowanieAktywne = stan.etap === 'rysowanie' && (stan.od === undefined || odblokowane);

    /**
     * Podpiąć pod `onPointerDownCapture` KONTENERA podglądu — zapamiętuje chwilę DOTKNIĘCIA.
     * Kontener, nie przycisk: przeglądarka potrafi przenieść kliknięcie z odstępu między
     * przyciskami na najbliższy przycisk, a `pointerdown` zostaje wtedy na tle karty.
     */
    const dotyk = useCallback(() => {
        dotykRef.current = Date.now();
    }, []);

    const pokaz = useCallback((obraz: string, dane: T, tusz: boolean): boolean => {
        const nowy = pokazPodglad(stanRef.current, obraz, dane, tusz, Date.now());
        if (nowy === stanRef.current) return false;
        zmien(nowy);
        return true;
    }, [zmien]);

    const ponownie = useCallback((zdarzenie?: { detail?: number }): boolean => {
        const nowy = podpiszPonownie(stanRef.current, Date.now(), zuzyjDotyk(dotykRef, zdarzenie));
        if (nowy === stanRef.current) return false;
        zmien(nowy);
        return true;
    }, [zmien]);

    const potwierdz = useCallback((zdarzenie?: { detail?: number }): PotwierdzonyPodpis<T> | null => {
        const wynik = potwierdzPodpis(stanRef.current, Date.now(), zuzyjDotyk(dotykRef, zdarzenie));
        if (!wynik) return null;
        zmien(wynik.stan);
        return wynik.podpis;
    }, [zmien]);

    const nieudana = useCallback(() => {
        zmien(wysylkaNieudana(stanRef.current, Date.now()));
    }, [zmien]);

    /** Nowy podpis (inny dokument, nowe płótno): zawsze od pustej kartki, bez blokady. */
    const resetuj = useCallback(() => {
        zmien(RYSOWANIE as StanPodpisu<T>);
    }, [zmien]);

    return { stan, aktywne, rysowanieAktywne, dotyk, pokaz, ponownie, potwierdz, nieudana, resetuj };
}
