/**
 * DŁUGOŚĆ KODU SKRACAJĄCEGO — jedna stała na cały projekt.
 *
 * 🔴 PO CO. Kod `/s/<code>` był generowany jako `nanoid(6)`, czyli około **36 bitów**,
 * w dwóch niezależnych miejscach. Tymczasem `confirmation_token`, którego broni dławik
 * z P-088, ma `nanoid(16)` — 96 bitów — a przekierowanie oddaje go w nagłówku `Location`.
 * Efektywna obrona potwierdzenia i odwołania wizyty wynosiła więc 36 bitów, nie 96:
 * zamknęliśmy drzwi, obok których stało tańsze wejście.
 *
 * 🔑 DZIESIĘĆ ZNAKÓW TO ~60 BITÓW. Przy alfabecie `nanoid` (64 znaki URL-safe) to wzrost
 * przestrzeni o czynnik ponad 16 milionów, kosztem czterech znaków w SMS-ie.
 *
 * 🪤 STARE KODY DZIAŁAJĄ DALEJ. To jest długość NOWO GENEROWANYCH kodów; resolver
 * `/s/[code]` nie sprawdza długości i nie ma prawa zacząć, bo unieważniłby linki
 * w SMS-ach, które są już w drodze.
 */
export const DLUGOSC_KODU_SKROTU = 10;

/** Klucz kubełka zgadywania — wspólny dla resolvera, żeby nie było dwóch napisów. */
export const KLUCZ_PUDEL_SKROTU = (adres: string) => `shortlink:pudlo:${adres}`;

/** Ile pudeł z jednego adresu tolerujemy w oknie. Uczciwy klik NIE liczy się wcale. */
export const MAX_PUDEL = 15;
export const OKNO_PUDEL_MS = 10 * 60_000;
