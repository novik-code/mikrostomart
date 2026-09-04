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

/**
 * 🪤 `maxDate` (z `window.maxDate` koperty `meta=1`): PMS szuka `nextAvailable` w horyzoncie
 * 60 dni NIEZALEŻNIE od okna dat, więc potrafi zwrócić datę, na którą to samo API odpowie
 * `DATE_OUT_OF_RANGE`. Przycisk „skocz do najbliższego terminu" prowadziłby wtedy donikąd.
 * Datę spoza okna POMIJAMY — komunikat zostaje, znika sama obietnica.
 */
export function komunikatStatusu(
    status: string | undefined,
    opcje: {
        imie: string;
        nextAvailable?: string | null;
        dzienOpisowo?: string;
        maxDate?: string | null;
        /** `reason` z koperty `meta=1` — bywa WAŻNIEJSZY niż sam `status`, patrz niżej. */
        powod?: string | null;
    } = {
        imie: 'Specjalista',
    },
): KomunikatDnia {
    const { imie, dzienOpisowo, maxDate, powod } = opcje;
    const nextAvailable =
        opcje.nextAvailable && (!maxDate || opcje.nextAvailable <= maxDate) ? opcje.nextAvailable : null;
    const kiedy = dopelniacz(dzienOpisowo);

    // 🔴 `reason` BIJE `status`. Od v11.11 gabinet nie przyjmuje rezerwacji online na dzień
    // bieżący (decyzja właściciela: „na dziś" zakłada rejestracja, bo tylko ona wie, co da się
    // upchnąć). PMS raportuje wtedy `fully_booked`, ale to NIE jest komplet zapisów — lekarz
    // może mieć wolne okna, po prostu nie tą drogą. Zdanie „wszystkie terminy zajęte" byłoby
    // tu nieprawdą, a dostawca prosi wprost, żeby pacjent go nie zobaczył.
    if (powod === 'same_day_not_bookable') {
        return {
            tresc: `Na ten dzień${kiedy} nie prowadzimy rezerwacji online.`
                + ' Zadzwoń do rejestracji — sprawdzimy, co da się jeszcze dopisać.',
            telefon: true,
            skokDo: nextAvailable ?? undefined,
            ton: 'neutralny',
        };
    }

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

export interface OperatorDnia {
    doctorName?: string;
    status?: string;
    nextAvailable?: string | null;
    /** `reason` z koperty `meta=1`. `same_day_not_bookable` unieważnia `status` — patrz `komunikatStatusu`. */
    reason?: string | null;
}

/**
 * Streszczenie CAŁEGO dnia, gdy pacjent nie wybiera lekarza (okno „Przełóż wizytę").
 * Zwraca `null`, gdy są wolne terminy — wołający pokazuje wtedy godziny, nie komunikat.
 *
 * 🔑 Kolejność ma znaczenie: „ktoś przyjmuje, ale ma komplet" to inna wiadomość niż
 * „gabinet tego dnia nie pracuje", a `unknown` bije wszystko — bo skoro czegoś nie wiemy,
 * nie wolno nam ogłaszać, że terminów nie ma.
 * 🔑 „Gabinet nie przyjmuje" wolno napisać WYŁĄCZNIE wtedy, gdy każdy operator ma `not_working`.
 * Każdy inny status ma własną gałąź WYŻEJ — fallback nie jest workiem na resztę.
 */
export function podsumujDzienOperatorow(operatorzy: OperatorDnia[], maxDate?: string | null): KomunikatDnia | null {
    if (operatorzy.length === 0) {
        return {
            tresc: 'Nie potrafimy w tej chwili potwierdzić wolnych terminów na ten dzień.'
                + ' Zadzwoń — sprawdzimy od ręki.',
            telefon: true,
            ton: 'ostrzegawczy',
        };
    }

    const znane = ['available', 'fully_booked', 'not_bookable_online', 'not_working'];
    // Nieznany status z przyszłej wersji API traktujemy jak `unknown` — patrz `komunikatStatusu`.
    if (operatorzy.some(o => o.status === 'unknown' || !znane.includes(o.status ?? ''))) {
        return {
            tresc: 'Nie potrafimy w tej chwili potwierdzić wszystkich wolnych terminów na ten dzień.'
                + ' Wybierz inny dzień albo zadzwoń.',
            telefon: true,
            ton: 'ostrzegawczy',
        };
    }

    // 🔴 Zaraz po `unknown`, bo „na dziś dzwoń" jest prawdziwe niezależnie od tego, co dalej
    // raportują poszczególni lekarze — patrz `komunikatStatusu`.
    if (operatorzy.some(o => o.reason === 'same_day_not_bookable')) {
        const najblizszyDzis = operatorzy
            .map(o => o.nextAvailable)
            .filter((d): d is string => !!d)
            .filter(d => !maxDate || d <= maxDate)
            .sort()[0];
        return {
            tresc: 'Na dziś nie prowadzimy rezerwacji online.'
                + ' Zadzwoń do rejestracji — sprawdzimy, co da się jeszcze dopisać.',
            telefon: true,
            skokDo: najblizszyDzis,
            ton: 'neutralny',
        };
    }

    const najblizszy = operatorzy
        .map(o => o.nextAvailable)
        .filter((d): d is string => !!d)
        // Data poza oknem PMS jest nieosiągalna dla kalendarza — patrz `komunikatStatusu`.
        .filter(d => !maxDate || d <= maxDate)
        .sort()[0];

    if (operatorzy.some(o => o.status === 'fully_booked')) {
        return {
            tresc: 'Tego dnia specjaliści przyjmują, ale wszystkie terminy są już zajęte.',
            telefon: !najblizszy,
            skokDo: najblizszy,
            ton: 'neutralny',
        };
    }

    if (operatorzy.some(o => o.status === 'not_bookable_online')) {
        return {
            tresc: 'Tego dnia terminów nie przełożymy online. Zadzwoń do rejestracji — ustalimy termin od ręki.',
            telefon: true,
            ton: 'neutralny',
        };
    }

    // 🔴 `available` MUSI mieć własną gałąź. PMS mówi wtedy, że specjalista przyjmuje, a pustka
    // bierze się z NASZYCH filtrów (pokazujemy wyłącznie :00/:30) albo z minimalnego wyprzedzenia.
    // Bez tej gałęzi dzień pracujący spadał na fallback i ogłaszał „gabinet nie przyjmuje" —
    // czyli dokładnie to kłamstwo, które statusy operatora miały wyplenić.
    if (operatorzy.some(o => o.status === 'available')) {
        return {
            tresc: 'Tego dnia nie mamy wolnych godzin do wyboru online.'
                + ' Zadzwoń do rejestracji — możemy dopasować termin.',
            telefon: true,
            skokDo: najblizszy,
            ton: 'neutralny',
        };
    }

    // Tu docierają już wyłącznie dni, w których KAŻDY operator ma `not_working`.
    return {
        tresc: 'Tego dnia gabinet nie przyjmuje.' + (najblizszy ? '' : ' Wybierz inny dzień.'),
        telefon: false,
        skokDo: najblizszy,
        ton: 'neutralny',
    };
}
