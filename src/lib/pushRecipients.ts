/**
 * Reguły doboru odbiorców powiadomień — BEZ efektów ubocznych.
 *
 * 🔑 Osobny plik, bo `pushService.ts` tworzy klienta Supabase przy imporcie i nie da się
 * go wciągnąć do testu bez zmiennych środowiskowych. Reguła, której nie da się wykonać
 * w teście, jest chroniona wyłącznie asercją na treści pliku — a te w tym repo już raz
 * przepuściły cztery regresje z rzędu.
 */

/**
 * Zbiór odbiorców do POMINIĘCIA w wysyłce grupowej.
 *
 * Po co: ogłoszenie zespołowe i powiadomienie imienne to dwa różne pushe z różnymi
 * `tag`, więc na telefonie osoby przypisanej NIE zwijają się w jeden — dostawała dwa
 * banery o tym samym zadaniu. Zamiast kombinować z tagami (kolejność dostarczenia nie
 * jest gwarantowana) po prostu nie wysyłamy jej ogłoszenia grupowego.
 *
 * 🪤 `undefined` i pusta tablica znaczą „nie pomijaj NIKOGO" — nie wolno ich pomylić
 * z „pomiń wszystkich", bo cisza w powiadomieniach nie rzuca się w oczy.
 * 🪤 Puste identyfikatory odsiewamy: `assigneeUserIds` potrafi oddać wpis bez konta.
 */
export function zbiorWykluczonych(exclude?: string | string[] | null): Set<string> {
    if (exclude === undefined || exclude === null) return new Set();
    const lista = Array.isArray(exclude) ? exclude : [exclude];
    return new Set(lista.filter(u => typeof u === 'string' && u.trim() !== ''));
}
