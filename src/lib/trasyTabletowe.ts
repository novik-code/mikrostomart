/**
 * TRASY TABLETOWE — strony, które pacjent obsługuje na tablecie w recepcji (e-Karta, zgody z podpisem).
 *
 * 🔴 PO CO. Do 17.09.2026 te strony dostawały pełny szablon witryny: górne menu, stopkę, przyklejony
 * dolny pasek „Telefon / Wizyta / Ból zęba”, bąbelek czatu, zachętę do instalacji aplikacji i baner
 * ciasteczek. Zmierzone w przeglądarce (768×1024): dolny pasek ZASŁANIAŁ przyklejony przycisk
 * „✍️ Przejdź do podpisania” na zgodach — dotyk trafił w „Wizyta” i przeniósł pacjenta na /rezerwacja,
 * w połowie podpisywania dokumentu. Górne menu i stopka dawały z kolei drogę ucieczki z dokumentu.
 *
 * 🔑 Jedna definicja, wykonywana w teście (`trasyTabletowe.test.ts` renderuje prawdziwy layout).
 * Nowa strona podpisywana na tablecie = dopisać ją tutaj.
 *
 * ⚪ Baner ciasteczek też znika: pyta wyłącznie o pamięć czatu AI (repo nie ma skryptów śledzących),
 * a na trasach tabletowych czatu nie ma — nie ma więc o co pytać.
 */

import { bezPrefiksuJezyka } from '@/lib/middlewareSurface';

export const TRASY_TABLETOWE = ['/ekarta/', '/zgody/'] as const;

export function czyTrasaTabletowa(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    const sciezka = bezPrefiksuJezyka(pathname);
    return TRASY_TABLETOWE.some((p) => sciezka.startsWith(p) && sciezka.length > p.length);
}
