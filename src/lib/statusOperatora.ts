/**
 * Zamiana statusu operatora z `meta=1` na komunikat dla pacjenta (punkt 3e uzgodnień z PMS).
 *
 * 🔑 Po co to istnieje. Do dziś **sześć różnych prawd o świecie** miało u nas jeden piksel:
 * „Brak wolnych terminów w wybranym dniu". Lekarz z kompletem zapisów, lekarz na urlopie,
 * dzień bez grafiku, awaria PMS-u, wyczerpany limit zapytań i realnie wolny dzień bez okien —
 * wszystko wyglądało tak samo. Punkt 3f rozdzielił awarie; ten plik rozdziela resztę.
 *
 * 🪤 Reguła, której nie wolno złamać: **przy `unknown` NIE WOLNO twierdzić, że terminów nie ma.**
 * Dostawca PMS wprowadził ten status świadomie, żeby API mogło przyznać się do niewiedzy —
 * a nasz asystent AI powtarza takie zdania pacjentowi w mailu. „Nie wiem" jest uczciwe,
 * „nie ma" bywa nieprawdą, która kosztuje wizytę.
 *
 * ⚪ Świadomie NIE pokazujemy powodu nieobecności (`reason: 'absence'`) — to dana kadrowa,
 * a pacjentowi i tak nie pomaga. Rozróżnienie zostaje w logach.
 */

export type StatusOperatora =
    | 'available'
    | 'fully_booked'
    | 'not_bookable_online'
    | 'not_working'
    | 'unknown';

export interface KomunikatDnia {
    /** Zdanie główne dla pacjenta. */
    tresc: string;
    /** Czy dołożyć numery telefonu — tylko tam, gdzie telefon realnie coś zmienia. */
    telefon: boolean;
    /** Data najbliższego wolnego terminu, gdy PMS ją zna (do przycisku „skocz do"). */
    skokDo?: string;
    /** Ton komunikatu — steruje kolorem, nie treścią. */
    ton: 'neutralny' | 'ostrzegawczy';
}

function dopelniacz(dzien?: string): string {
    return dzien ? ` (${dzien})` : '';
}

export function komunikatStatusu(
    status: string | undefined,
    opcje: { imie: string; nextAvailable?: string | null; dzienOpisowo?: string } = { imie: 'Specjalista' },
): KomunikatDnia {
    const { imie, nextAvailable, dzienOpisowo } = opcje;
    const kiedy = dopelniacz(dzienOpisowo);

    switch (status) {
        case 'fully_booked':
            return {
                tresc: `${imie} przyjmuje tego dnia${kiedy}, ale wszystkie terminy online są już zajęte.`
                    + (nextAvailable ? '' : ' Zadzwoń — czasem zwalniają się miejsca.'),
                telefon: !nextAvailable,
                skokDo: nextAvailable ?? undefined,
                ton: 'neutralny',
            };

        case 'not_bookable_online':
            // ~20 % wizyt recepcja dopisuje poza wzorcem godzin. Dla pacjenta jedyną uczciwą
            // kontynuacją jest telefon — i to jest komunikat, który dotąd brzmiał „brak terminów”,
            // choć lekarz siedział w gabinecie.
            return {
                tresc: `${imie} przyjmuje tego dnia${kiedy}, ale terminów na ten dzień nie umówimy online.`
                    + ' Zadzwoń do rejestracji — dopiszemy Cię.',
                telefon: true,
                ton: 'neutralny',
            };

        case 'not_working':
            return {
                tresc: `${imie} nie przyjmuje tego dnia${kiedy}.`
                    + (nextAvailable ? '' : ' Wybierz inny dzień albo zadzwoń — dobierzemy termin.'),
                telefon: !nextAvailable,
                skokDo: nextAvailable ?? undefined,
                ton: 'neutralny',
            };

        case 'unknown':
            return {
                tresc: `Nie potrafimy w tej chwili potwierdzić wolnych terminów${kiedy}.`
                    + ' To nie znaczy, że ich nie ma — zadzwoń albo spróbuj za chwilę.',
                telefon: true,
                ton: 'ostrzegawczy',
            };

        case 'available':
            // Status mówi „są okna", ale po NASZYCH filtrach (siatka :00/:30, minimalne
            // wyprzedzenie) lista bywa pusta. Wtedy uczciwie: tego dnia nie mamy czego pokazać.
            return {
                tresc: `Brak wolnych terminów w tym dniu${kiedy}. Sprawdź inny dzień.`,
                telefon: false,
                ton: 'neutralny',
            };

        default:
            // Nieznany status z przyszłej wersji API — zachowujemy się jak przy `unknown`,
            // czyli NIE twierdzimy, że terminów nie ma.
            return {
                tresc: `Nie potrafimy w tej chwili potwierdzić wolnych terminów${kiedy}.`
                    + ' Zadzwoń — sprawdzimy od ręki.',
                telefon: true,
                ton: 'ostrzegawczy',
            };
    }
}
