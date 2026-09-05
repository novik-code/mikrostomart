/**
 * Rodzaj usługi wybrany przez pacjenta → wartość pola `type` w `POST /api/schedule/appointment`.
 * Punkt 3d uzgodnień z dostawcą PMS, wartości otrzymane 2026-09-05.
 *
 * 🔑 Dlaczego mapujemy z ETYKIETY, a nie z identyfikatora. Formularz rezerwacji wysyła do nas
 * przetłumaczoną etykietę (`<option value={svc.label}>`), a `online_bookings.service_type`
 * jest kolumną tekstową pełną takich napisów — 98 wierszy historycznych. Identyfikatora tam
 * nigdy nie było i nie da się go dorobić wstecz.
 *
 * 🪤 Etykieta zależy od JĘZYKA pacjenta. Niemiec rezerwujący konsultację zapisuje
 * „Erstberatung", nie „Konsultacja Wstępna". Mapa musi znać wszystkie cztery wersje —
 * inaczej `type` leciałby tylko dla polskich rezerwacji, po cichu i nierówno.
 *
 * 🔴 ZASADA NADRZĘDNA: przy najmniejszej wątpliwości NIE WYSYŁAMY NICZEGO. Dostawca prosił
 * o to wprost, my odpisaliśmy to samo: „wolimy puste pole niż wartość, która wygląda sensownie".
 * Wizyta powstaje wtedy z typem domyślnym gabinetu — to jest zachowanie sprzed 3d, czyli
 * najgorszy możliwy skutek pomyłki w tej mapie to brak poprawy, nie szkoda.
 *
 * ⚪ `bol` i `wybielanie` dostały pozycje w słowniku 05.09 — wartości `Ból` i `Wybielanie`,
 *    zweryfikowane przez dostawcę pięcioma zapisami testowymi na dniu bez realnych wizyt
 *    (potem usuniętymi). Wielkość liter nie ma znaczenia.
 * ⚪ `implanty`, `ortodoncja`, `licowki` zniknęły z formularza (decyzja gabinetu 05.09:
 *    wymagają rozmowy i wyceny przed terminem), więc nie ma czego mapować. Ich historyczne
 *    etykiety zostawiamy w mapie jako JAWNIE nieprzypisane — żeby następny czytelnik wiedział,
 *    że to decyzja, a nie przeoczenie.
 */

/** Wartości `type` przyjmowane przez PMS. Wielkość liter bez znaczenia (potwierdzone). */
const TYP_PMS: Record<string, string | null> = {
    konsultacja: 'konsultacja',
    higienizacja: 'higienizacja',
    // 🔑 Dołożone przez gabinet 05.09 jako NOWE pozycje słownika (id 0000000034 i 0000000035),
    // a nie przez przywrócenie wycofanego typu „Pacjenci Bólowi" — do tamtego odwołuje się
    // piętnaście historycznych wizyt. Mapujemy po NAZWIE, bo jest odporniejsza na zmiany
    // identyfikatorów w słowniku, który recepcja edytuje.
    // 🪤 `Ból` niesie polski znak. Dostawca sprawdził to end-to-end i dopasowanie działa,
    // ale ICH pierwszy test padł na uszkodzonym kodowaniu w narzędziu testowym
    // (`Bďż˝l` w dzienniku). Nasze ciało żądania idzie przez `JSON.stringify` + `fetch`,
    // czyli UTF-8 z definicji. Gdyby `type` kiedyś przestał trafiać PRZY BÓLU, a działał przy
    // pozostałych — przyczyną będzie kodowanie, nie ta mapa.
    bol: 'Ból',
    wybielanie: 'Wybielanie',
    // Zdjęte z formularza decyzją gabinetu; historyczne rezerwacje nadal mają te etykiety.
    implanty: null,
    ortodoncja: null,
    licowki: null,
};

/**
 * Etykiety we wszystkich czterech językach + warianty historyczne, które realnie leżą w bazie.
 * 🪤 Klucze są ZNORMALIZOWANE (bez diakrytyków, małe litery) — patrz `znormalizuj`.
 */
const ETYKIETY: Record<string, string> = {};
const dodaj = (id: string, ...etykiety: string[]) => {
    for (const e of etykiety) ETYKIETY[znormalizuj(e)] = id;
};

function znormalizuj(s: string): string {
    return s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')   // diakrytyki
        .replace(/ł/gi, 'l')                // NFD nie rozkłada `ł`
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

dodaj('konsultacja', 'Konsultacja Wstępna', 'Initial Consultation', 'Erstberatung',
    'Первинна консультація', 'Konsultacja');
dodaj('higienizacja', 'Higienizacja (Profilaktyka)', 'Hygiene (Preventive Care)',
    'Prophylaxe (Vorsorge)', 'Гігієна (профілактика)', 'Higienizacja');
dodaj('bol', 'Pomoc doraźna (Ból)', 'Urgent Care (Pain)', 'Notfallhilfe (Schmerzen)',
    'Невідкладна допомога (біль)');
dodaj('wybielanie', 'Wybielanie Zębów', 'Teeth Whitening', 'Zahnaufhellung', 'Відбілювання зубів');
dodaj('implanty', 'Implanty', 'Implants', 'Implantate', 'Імплантати');
dodaj('ortodoncja', 'Ortodoncja (Nakładki)', 'Orthodontics (Aligners)',
    'Kieferorthopädie (Aligner)', 'Ортодонтія (елайнери)');
dodaj('licowki', 'Licówki / Metamorfoza', 'Veneers / Smile Makeover',
    'Veneers / Lächelveränderung', 'Вініри / Перетворення усмішки');

/**
 * @param etykieta wartość z `online_bookings.service_type` (albo `null`, jeśli pacjent nie wybrał)
 * @returns wartość do pola `type`, albo `undefined` gdy nie mamy pewności — wtedy pola NIE wysyłamy
 */
export function typUslugiDlaPms(etykieta: string | null | undefined): string | undefined {
    if (!etykieta) return undefined;
    const id = ETYKIETY[znormalizuj(etykieta)];
    if (!id) return undefined;                 // nieznana etykieta (np. nazwisko lekarza z danych sprzed naprawy)
    return TYP_PMS[id] ?? undefined;           // znana usługa bez odpowiednika w PMS
}
