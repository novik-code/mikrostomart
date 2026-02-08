
// ─────────────────────────────────────────────────────────────
// SYMPTOM DATA — Multi-severity with tooltips & doctor recs
// ─────────────────────────────────────────────────────────────

export interface TipItem {
    text: string;
    tip: string;  // expanded tooltip shown on hover
}

export interface SeverityLevel {
    label: string;
    description: string;
    symptoms: TipItem[];
    causes: TipItem[];
    advice: string;
    urgency: 'low' | 'medium' | 'high';
    doctors: string[];  // recommended specialist IDs
}

export interface ZoneInfo {
    title: string;
    subtitle: string;
    levels: {
        low: SeverityLevel;
        medium: SeverityLevel;
        high: SeverityLevel;
    };
}

// Doctor competencies for recommendations
export const DOCTORS: Record<string, { name: string; specialties: string }> = {
    marcin: { name: 'lek. dent. Marcin Nowosielski', specialties: 'Chirurgia, zaawansowana endodoncja, protetyka na implantach' },
    ilona: { name: 'lek. dent. Ilona Piechaczek', specialties: 'Endodoncja, protetyka' },
    katarzyna: { name: 'lek. dent. Katarzyna Halupczok', specialties: 'Stomatologia zachowawcza, stomatologia dziecięca' },
    dominika: { name: 'lek. dent. Dominika Milicz', specialties: 'Stomatologia zachowawcza, stomatologia dziecięca' },
};

// ─── TOOTH TYPE TEMPLATES ───

const INCISOR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort lub zmiana estetyczna, bez silnego bólu.',
            symptoms: [
                { text: 'Krótkotrwała nadwrażliwość na zimno lub słodycze', tip: 'Trwa kilka sekund po kontakcie z bodźcem. Typowa dla początkowej utraty szkliwa lub odsłoniętej zębiny.' },
                { text: 'Niewielkie przebarwienie lub zmiana koloru', tip: 'Białe lub brązowe plamy na szkliwie mogą oznaczać wczesne stadia demineralizacji lub płytkiej próchnicy.' },
                { text: 'Lekki dyskomfort przy odgryzaniu twardych pokarmów', tip: 'Mikropęknięcia szkliwa lub niewielkie ubytki mogą powodować krótkotrwały ból przy gryzieniu.' },
                { text: 'Szorstka powierzchnia brzegu zęba', tip: 'Może wskazywać na erozję szkliwa spowodowaną kwaśną dietą lub bruksizmem.' },
            ],
            causes: [
                { text: 'Początkowa demineralizacja szkliwa (białe plamy)', tip: 'Pierwszy etap próchnicy — szkliwo traci minerały. Odwracalne przy odpowiedniej remineralizacji fluorem.' },
                { text: 'Płytka próchnica (na powierzchni)', tip: 'Ubytek ograniczony do szkliwa. Wymaga niewielkiego wypełnienia kompozytowego.' },
                { text: 'Cofanie się dziąsła odsłaniające szyjkę', tip: 'Recesja dziąsła odsłania wrażliwą zębinę korzeniową. Może wymagać pokrycia chirurgicznego.' },
                { text: 'Uszkodzenia erozyjne (kwaśna dieta)', tip: 'Napoje gazowane, cytrusy i reflux żołądkowy rozpuszczają szkliwo. Zmiana diety hamuje postęp.' },
            ],
            advice: 'Stosuj pastę z fluorem (min. 1450 ppm) i płukankę. Jeśli nadwrażliwość utrzymuje się ponad 2 tygodnie — umów wizytę kontrolną. Wczesna interwencja może uratować ząb bez rozległego leczenia.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból powtarzający się, wymagający diagnostyki.',
            symptoms: [
                { text: 'Ból spontaniczny, nasilający się wieczorem', tip: 'Ból bez widocznej przyczyny, gorszy w pozycji leżącej — sugeruje zapalenie miazgi (nerwu).' },
                { text: 'Przedłużona reakcja na ciepło/zimno (>30 sekund)', tip: 'Reakcja trwająca powyżej 30 sekund wskazuje na odwracalne zapalenie miazgi wymagające leczenia.' },
                { text: 'Widoczny ubytek lub szczelina na powierzchni zęba', tip: 'Ubytek widoczny gołym okiem oznacza próchnicę sięgającą co najmniej zębiny.' },
                { text: 'Niewielki obrzęk lub zaczerwienienie dziąsła wokół zęba', tip: 'Może oznaczać lokalne zapalenie dziąsła lub początek infekcji wokół zęba.' },
                { text: 'Kruszenie się brzegu zęba', tip: 'Osłabiona struktura szkliwa odłamuje się fragmentami — wymaga odbudowy protetycznej.' },
            ],
            causes: [
                { text: 'Próchnica średnio zaawansowana (sięgająca zębiny)', tip: 'Bakterie przeniknęły przez szkliwo do zębiny. Wymaga usunięcia próchnicowo zmienionej tkanki i wypełnienia.' },
                { text: 'Pęknięcie szkliwa (cracked enamel syndrome)', tip: 'Niewidoczna linia pęknięcia powoduje ból przy gryzieniu konkretnych pokarmów. Trudna do zdiagnozowania bez mikroskopu.' },
                { text: 'Zapalenie miazgi odwracalne', tip: 'Miazga (nerw) jest podrażniona ale żywa. Właściwe leczenie zachowawcze może uratować żywotność zęba.' },
                { text: 'Uraz mechaniczny (np. po uderzeniu)', tip: 'Uraz może powodować pęknięcia lub uszkodzenie miazgi nawet bez widocznych zmian. Wymaga RTG kontrolnego.' },
            ],
            advice: 'Wymagana wizyta w ciągu 1–2 tygodni. Lekarz oceni głębokość ubytku i czy konieczne jest wypełnienie lub leczenie kanałowe. Nie czekaj — ten stan może się pogorszyć.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból wymagający pilnej interwencji.',
            symptoms: [
                { text: 'Silny, pulsujący ból trudny do zlokalizowania', tip: 'Ból promieniuje do ucha, skroni czy oka. Typowy dla zapalenia miazgi — wymaga pilnej interwencji.' },
                { text: 'Ból budzący w nocy', tip: 'Ból wybudzający ze snu jest poważnym sygnałem nieleczonego zapalenia lub martwicy miazgi.' },
                { text: 'Obrzęk twarzy lub dziąsła', tip: 'Obrzęk wskazuje na rozprzestrzenianie się infekcji poza ząb. Może wymagać antybiotykoterapii.' },
                { text: 'Ząb zmienił kolor (szary/ciemny)', tip: 'Ciemnienie zęba oznacza martwicę miazgi — ząb jest martwy i wymaga leczenia kanałowego.' },
                { text: 'Ropień lub przetoka (ropny pęcherzyk na dziąśle)', tip: 'Gromadzenie się ropy wokół korzenia tworzy ropień. Przetoka to naturalny drenaż. Wymaga natychmiastowego leczenia.' },
                { text: 'Gorączka towarzysząca bólowi zęba', tip: 'Gorączka oznacza uogólnioną reakcję organizmu na infekcję. Pilna konsultacja lekarska!' },
            ],
            causes: [
                { text: 'Zapalenie miazgi nieodwracalne', tip: 'Nerw zęba jest nieodwracalnie uszkodzony. Jedynym ratunkiem jest leczenie kanałowe pod mikroskopem.' },
                { text: 'Martwica miazgi z infekcją', tip: 'Obumarły nerw stał się źródłem infekcji bakteryjnej. Wymaga leczenia endodontycznego i ewentualnie antybiotyku.' },
                { text: 'Ropień okołowierzchołkowy', tip: 'Zbiornik ropy przy korzeniu zęba. Może prowadzić do ropowicy — rozlanego zakażenia zagrażającego życiu.' },
                { text: 'Złamanie korzenia po urazie', tip: 'Korzeń jest pęknięty pod linią dziąsła. W zależności od poziomu złamania — leczenie lub ekstrakcja.' },
            ],
            advice: 'Pilna wizyta — najlepiej dziś lub jutro! Nieleczone zapalenie może doprowadzić do rozlanego zakażenia tkanek miękkich (ropowica). Do wizyty: leki przeciwbólowe (ibuprofen 400mg co 6h), zimny kompres na policzek.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const CANINE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort, często związany z nawykowym zaciskaniem.',
            symptoms: [
                { text: 'Nadwrażliwość przy szyjce zęba (od strony dziąsła)', tip: 'Odsłonięta szyjka kła jest szczególnie wrażliwa z powodu cienkiej warstwy cementu korzeniowego.' },
                { text: 'Ścieranie wierzchołka kła', tip: 'Kły prowadzą zgryz boczny — ich ścieranie może oznaczać bruksizm lub parafunkcje.' },
                { text: 'Cofnięte dziąsło po jednej stronie', tip: 'Jednostronna recesja sugeruje zbyt agresywne szczotkowanie lub nieprawidłowy zgryz.' },
                { text: 'Lekki dyskomfort przy gryzieniu', tip: 'Kły przenoszą duże siły żucia — nawet drobny ubytek może powodować dyskomfort.' },
            ],
            causes: [
                { text: 'Ubytki klinowe (nadmierne szczotkowanie)', tip: 'V-kształtne wcięcie przy szyjce zęba. Powstaje od zbyt mocnego szczotkowania ruchem poziomym.' },
                { text: 'Bruksizm (zgrzytanie zębami) — ścieranie', tip: 'Nawykowe zaciskanie lub zgrzytanie powoduje ścieranie zębów. Szyna relaksacyjna chroni przed dalszym uszkodzeniem.' },
                { text: 'Recesja dziąsła odsłaniająca cement korzeniowy', tip: 'Cofający się brzeg dziąsła odsłania wrażliwą powierzchnię korzenia poniżej szkliwa.' },
                { text: 'Początkowa próchnica szyjkowa', tip: 'Próchnica w miejscu styku zęba z dziąsłem — trudna do zauważenia we wczesnym stadium.' },
            ],
            advice: 'Kły mają najdłuższe korzenie i są kluczowe dla prowadzenia zgryzu. Ścieranie sugeruje bruksizm — zapytaj o szynę relaksacyjną. Używaj szczoteczki o miękkim włosiu.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból promieniujący do oka lub nosa — wymaga diagnostyki.',
            symptoms: [
                { text: 'Ból promieniujący w stronę oka lub skrzydełka nosa', tip: 'Kły mają najdłuższe korzenie — ból może promieniować wzdłuż nerwu do oka.' },
                { text: 'Przedłużona nadwrażliwość na temperaturę', tip: 'Reakcja trwająca ponad 30 sekund — sygnał podrażnienia miazgi.' },
                { text: 'Widoczny głęboki ubytek przy szyjce', tip: 'Ubytek klinowy sięgający zębiny — wymaga wypełnienia.' },
                { text: 'Ból przy nagryzaniu od boku', tip: 'Kły prowadzą zgryz boczny — ból sugeruje pęknięcie lub próchnicę.' },
                { text: 'Powiększony węzeł chłonny pod żuchwą', tip: 'Węzeł chłonny reaguje na infekcję zęba — sygnał zapalenia.' },
            ],
            causes: [
                { text: 'Próchnica szyjkowa zaawansowana', tip: 'Próchnica na szyjce dotarła do zębiny — ryzyko zapalenia miazgi.' },
                { text: 'Zapalenie miazgi (odwracalne)', tip: 'Nerw podrażniony ale żywy — leczenie zachowawcze może go uratować.' },
                { text: 'Pęknięcie podłużne korzenia', tip: 'Pęknięcie wzdłuż korzenia — prognoza często niekorzystna.' },
                { text: 'Zapalenie ozębnej (periodontitis apicalis)', tip: 'Zapalenie tkanek wokół wierzchołka korzenia — ból przy dotyku.' },
            ],
            advice: 'Ból promieniujący z kła jest charakterystyczny ze względu na jego anatomię (długi korzeń blisko zatoki). Umów wizytę — potrzebny RTG do oceny stanu korzenia.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub obrzęk — pilna interwencja.',
            symptoms: [
                { text: 'Intensywny ból pulsujący, trudny do kontrolowania lekami', tip: 'Ból oporny na ibuprofen — zapalenie miazgi lub ropień.' },
                { text: 'Obrzęk w okolicy podpoliczkowej', tip: 'Obrzęk w okolicy podpoliczkowej' },
                { text: 'Ropień na dziąśle w okolicy kła', tip: 'Ropień na dziąśle w okolicy kła' },
                { text: 'Ruchomość zęba', tip: 'Zaawansowana utrata kości lub infekcja powoduje ruchomość — zagrożenie utratą zęba.' },
                { text: 'Trudności z otwieraniem ust (szczękościsk)', tip: 'Trudności z otwieraniem ust (szczękościsk)' },
            ],
            causes: [
                { text: 'Ropień okołowierzchołkowy', tip: 'Zbiornik ropy przy korzeniu zęba. Może prowadzić do ropowicy — rozlanego zakażenia zagrażającego życiu.' },
                { text: 'Martwica miazgi z rozległą infekcją', tip: 'Martwica miazgi z rozległą infekcją' },
                { text: 'Złamanie korzenia w wyniku urazu', tip: 'Złamanie korzenia w wyniku urazu' },
                { text: 'Zapalenie tkanek przyzębia (parodontoza zaawansowana)', tip: 'Zapalenie tkanek przyzębia (parodontoza zaawansowana)' },
            ],
            advice: 'Pilna wizyta! Infekcja z kła górnego może się rozprzestrzeniać do oczodołu przez przestrzenie powięziowe. Do wizyty: ibuprofen 400mg + paracetamol 500mg, zimny kompres. Nie stosuj gorących okładów!',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const PREMOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Sporadyczny dyskomfort, najczęściej przy żuciu.',
            symptoms: [
                { text: 'Lekki ból przy gryzieniu twardego jedzenia', tip: 'Lekki ból przy gryzieniu twardego jedzenia' },
                { text: 'Ubytek klinowy widoczny przy linii dziąsła', tip: 'Ubytek klinowy widoczny przy linii dziąsła' },
                { text: 'Krótkotrwała nadwrażliwość na zimno', tip: 'Krótkotrwała nadwrażliwość na zimno' },
                { text: 'Uczucie „coś się ciśnie" przy żuciu', tip: 'Uczucie „coś się ciśnie" przy żuciu' },
            ],
            causes: [
                { text: 'Nieszczelne wypełnienie (stare amalgamaty)', tip: 'Nieszczelne wypełnienie (stare amalgamaty)' },
                { text: 'Ubytki klinowe od nawykowego zaciskania', tip: 'Ubytki klinowe od nawykowego zaciskania' },
                { text: 'Płytka próchnica na powierzchni stycznej (między zębami)', tip: 'Płytka próchnica na powierzchni stycznej (między zębami)' },
                { text: 'Przeładowanie zgryzowe (przedwczesny kontakt)', tip: 'Przeładowanie zgryzowe (przedwczesny kontakt)' },
            ],
            advice: 'Przedtrzonowce często pękają od zaciskania zębów — zwłaszcza jednoguzkowe z dużymi plombami. Rozważ wymianę starych wypełnień na nakłady ceramiczne. Wizyta kontrolna w ciągu miesiąca.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból nasilający się przy żuciu — ryzyko pęknięcia.',
            symptoms: [
                { text: 'Ostry ból przy gryzieniu na konkretnym guzku', tip: 'Ostry ból przy gryzieniu na konkretnym guzku' },
                { text: 'Ból przy zwalnianiu uścisku (characteristic cracked tooth)', tip: 'Ból przy zwalnianiu uścisku (characteristic cracked tooth)' },
                { text: 'Nadwrażliwość na ciepło trwająca >minutę', tip: 'Nadwrażliwość na ciepło trwająca >minutę' },
                { text: 'Jedzenie utyka między zębami (nowe zjawisko)', tip: 'Jedzenie utyka między zębami (nowe zjawisko)' },
                { text: 'Pobolewanie po spożyciu gorących napojów', tip: 'Pobolewanie po spożyciu gorących napojów' },
            ],
            causes: [
                { text: 'Zespół pękniętego zęba (cracked tooth syndrome)', tip: 'Niewidoczne pęknięcie przebiegające przez ząb — podstępne, trudne do zdiagnozowania bez mikroskopu.' },
                { text: 'Próchnica pod starym wypełnieniem (próchnica wtórna)', tip: 'Próchnica pod starym wypełnieniem (próchnica wtórna)' },
                { text: 'Zapalenie miazgi odwracalne', tip: 'Miazga (nerw) jest podrażniona ale żywa. Właściwe leczenie zachowawcze może uratować żywotność zęba.' },
                { text: 'Utrata punktu kontaktowego (jedzenie wpada między zęby)', tip: 'Utrata punktu kontaktowego (jedzenie wpada między zęby)' },
            ],
            advice: 'Ból przy „puszczaniu" gryzu = klasyczny objaw pękniętego zęba. Wymaga pilnej diagnostyki pod mikroskopem. Umów wizytę w ciągu tygodnia — pęknięcie może się pogłębić.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub pęknięcie krytyczne.',
            symptoms: [
                { text: 'Ciągły, silny ból pulsujący', tip: 'Ciągły, silny ból pulsujący' },
                { text: 'Ząb ruchomy lub „unosi się" na dziąśle', tip: 'Ząb ruchomy lub „unosi się" na dziąśle' },
                { text: 'Obrzęk dziąsła z ropną wydzieliną', tip: 'Obrzęk dziąsła z ropną wydzieliną' },
                { text: 'Odłamanie ściany zęba przy gryzieniu', tip: 'Odłamanie ściany zęba przy gryzieniu' },
                { text: 'Ból przy jakimkolwiek kontakcie z jedzeniem', tip: 'Ból przy jakimkolwiek kontakcie z jedzeniem' },
            ],
            causes: [
                { text: 'Pęknięcie pionowe sięgające korzenia (nieodwracalne)', tip: 'Pęknięcie pionowe sięgające korzenia (nieodwracalne)' },
                { text: 'Ropień okołowierzchołkowy', tip: 'Zbiornik ropy przy korzeniu zęba. Może prowadzić do ropowicy — rozlanego zakażenia zagrażającego życiu.' },
                { text: 'Martwica miazgi', tip: 'Nerw zęba obumarł — wymaga leczenia endodontycznego.' },
                { text: 'Złamanie zęba pod wypełnieniem', tip: 'Złamanie zęba pod wypełnieniem' },
            ],
            advice: 'Pilna wizyta! Jeśli pęknięcie sięga poniżej linii dziąsła — ząb może wymagać ekstrakcji i uzupełnienia implantem. Jeśli powyżej — korona protetyczna może go uratować. Im szybciej działamy, tym więcej opcji.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const MOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort, najczęściej problem z higieną.',
            symptoms: [
                { text: 'Jedzenie wchodzi między zęby (food impaction)', tip: 'Jedzenie wchodzi między zęby (food impaction)' },
                { text: 'Lekki ból przy gryzieniu twardego jedzenia', tip: 'Lekki ból przy gryzieniu twardego jedzenia' },
                { text: 'Nadwrażliwość na zimno w okolicy zęba', tip: 'Nadwrażliwość na zimno w okolicy zęba' },
                { text: 'Krwawienie dziąsła przy myciu/nitkowaniu', tip: 'Krwawienie dziąsła przy myciu/nitkowaniu' },
            ],
            causes: [
                { text: 'Nieszczelne wypełnienie — utrata punktu kontaktowego', tip: 'Nieszczelne wypełnienie — utrata punktu kontaktowego' },
                { text: 'Początkowa próchnica na powierzchni żującej (bruzdy)', tip: 'Początkowa próchnica na powierzchni żującej (bruzdy)' },
                { text: 'Zapalenie dziąsła (gingivitis) z powodu słabej higieny', tip: 'Zapalenie dziąsła (gingivitis) z powodu słabej higieny' },
                { text: 'Starcie wypełnienia wymagające wymiany', tip: 'Starcie wypełnienia wymagające wymiany' },
            ],
            advice: 'Trzonowce mają głębokie bruzdy, gdzie łatwo gromadzi się płytka. Używaj nici lub szczoteczek międzyzębowych codziennie. Wizyta kontrolna z przeglądem wypełnień co 6 miesięcy.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból nasilający się, możliwe zapalenie miazgi.',
            symptoms: [
                { text: 'Głęboki ból pulsujący, nasilający się wieczorem', tip: 'Głęboki ból pulsujący, nasilający się wieczorem' },
                { text: 'Przedłużona reakcja na ciepło (>1 minuty)', tip: 'Przedłużona reakcja na ciepło (>1 minuty)' },
                { text: 'Ból promieniujący do ucha lub skroni', tip: 'Ból promieniujący do ucha lub skroni' },
                { text: 'Trudność z żuciem po jednej stronie', tip: 'Trudność z żuciem po jednej stronie' },
                { text: 'Ciemne przebarwienie na powierzchni żującej', tip: 'Ciemne przebarwienie na powierzchni żującej' },
            ],
            causes: [
                { text: 'Próchnica głęboka sięgająca zębiny lub blisko miazgi', tip: 'Próchnica głęboka sięgająca zębiny lub blisko miazgi' },
                { text: 'Zapalenie miazgi odwracalne (reversible pulpitis)', tip: 'Zapalenie miazgi odwracalne (reversible pulpitis)' },
                { text: 'Próchnica wtórna pod koroną lub dużym wypełnieniem', tip: 'Próchnica wtórna pod koroną lub dużym wypełnieniem' },
                { text: 'Pęknięcie guzka (cusp fracture)', tip: 'Pęknięcie guzka (cusp fracture)' },
            ],
            advice: 'Ból reagujący na ciepło to sygnał ostrzegawczy — miazga może być w stanie zapalnym. Umów wizytę w ciągu tygodnia. Lekarz oceni czy wystarczy głębokie wypełnienie czy potrzebne leczenie kanałowe.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub ropień — konieczna pilna interwencja.',
            symptoms: [
                { text: 'Silny, nieustający ból pulsujący', tip: 'Silny, nieustający ból pulsujący' },
                { text: 'Ból budzący w nocy, nie reagujący na leki', tip: 'Ból budzący w nocy, nie reagujący na leki' },
                { text: 'Obrzęk policzka lub pod żuchwą', tip: 'Obrzęk policzka lub pod żuchwą' },
                { text: 'Gorączka, złe samopoczucie', tip: 'Ogólne objawy infekcji — organizm walczy z zakażeniem. Wymaga pilnej pomocy.' },
                { text: 'Ropna wydzielina z dziąsła lub przetoka', tip: 'Ropna wydzielina z dziąsła lub przetoka' },
                { text: 'Ząb „wyrósł" — ból przy zamykaniu ust', tip: 'Ząb „wyrósł" — ból przy zamykaniu ust' },
            ],
            causes: [
                { text: 'Zapalenie miazgi nieodwracalne (irreversible pulpitis)', tip: 'Zapalenie miazgi nieodwracalne (irreversible pulpitis)' },
                { text: 'Ropień okołowierzchołkowy lub przyzębny', tip: 'Ropień okołowierzchołkowy lub przyzębny' },
                { text: 'Martwica miazgi z infekcją okołowierzchołkową', tip: 'Martwica miazgi z infekcją okołowierzchołkową' },
                { text: 'Zaostrzenie przewlekłego stanu zapalnego', tip: 'Zaostrzenie przewlekłego stanu zapalnego' },
            ],
            advice: 'Pilna wizyta — ten sam lub następny dzień! Trzonowce mają 3-4 kanały, więc leczenie kanałowe jest złożone, ale ratuje ząb. Do wizyty: ibuprofen 400mg + paracetamol 500mg naprzemiennie co 3h. Nie gryź na tę stronę.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const WISDOM_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort, typowy dla wyrzynającego się zęba.',
            symptoms: [
                { text: 'Nacisk lub uczucie „pchania" w tylnej części łuku', tip: 'Nacisk lub uczucie „pchania" w tylnej części łuku' },
                { text: 'Lekki obrzęk dziąsła za ostatnim zębem', tip: 'Lekki obrzęk dziąsła za ostatnim zębem' },
                { text: 'Dyskomfort przy szeroko otwieraniu ust', tip: 'Dyskomfort przy szeroko otwieraniu ust' },
                { text: 'Lekki ból nasilający się przy jedzeniu', tip: 'Lekki ból nasilający się przy jedzeniu' },
            ],
            causes: [
                { text: 'Aktywne wyrzynanie ósemki (pericoronitis lekki)', tip: 'Aktywne wyrzynanie ósemki (pericoronitis lekki)' },
                { text: 'Zaczynająca się próchnica na niedostępnej powierzchni', tip: 'Zaczynająca się próchnica na niedostępnej powierzchni' },
                { text: 'Ucisk na sąsiedni ząb (siódemkę)', tip: 'Ucisk na sąsiedni ząb (siódemkę)' },
                { text: 'Kapturek dziąsłowy gromadzący resztki jedzenia', tip: 'Kapturek dziąsłowy gromadzący resztki jedzenia' },
            ],
            advice: 'Płucz roztworem soli (łyżeczka na szklankę ciepłej wody) 3x dziennie. Jeśli ósemka jest krzywa na RTG — rozważ profilaktyczną ekstrakcję. Łatwiej usuwać zanim zacznie boleć.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Zapalenie dziąsła wokół ósemki — wymaga leczenia.',
            symptoms: [
                { text: 'Ból pulsujący w tylnej części szczęki', tip: 'Ból pulsujący w tylnej części szczęki' },
                { text: 'Obrzęk i zaczerwienienie dziąsła nad ósemką', tip: 'Obrzęk i zaczerwienienie dziąsła nad ósemką' },
                { text: 'Trudności z otwieraniem ust (szczękościsk częściowy)', tip: 'Trudności z otwieraniem ust (szczękościsk częściowy)' },
                { text: 'Ból promieniujący do ucha', tip: 'Ból języka promieniujący do ucha może wskazywać na zaawansowaną zmianę nowotworową.' },
                { text: 'Nieprzyjemny smak lub zapach z okolicy zęba', tip: 'Nieprzyjemny smak lub zapach z okolicy zęba' },
            ],
            causes: [
                { text: 'Zapalenie okołokoronowe (pericoronitis)', tip: 'Zapalenie okołokoronowe (pericoronitis)' },
                { text: 'Próchnica na powierzchni stycznej z siódemką', tip: 'Próchnica na powierzchni stycznej z siódemką' },
                { text: 'Częściowo wyrżnięta ósemka — retencja pokarmów', tip: 'Częściowo wyrżnięta ósemka — retencja pokarmów' },
                { text: 'Torbiel zawiązkowa (dentigerous cyst)', tip: 'Torbiel rozwijająca się wokół korony zatrzymanego zęba mądrości — wykrywana na zdjęciu RTG.' },
            ],
            advice: 'Zapalenie wokół ósemki (pericoronitis) to częsty problem. Umów wizytę w ciągu tygodnia — lekarz oceni na RTG panoramicznym czy ząb ma szansę prawidłowo wyrżnąć czy wymaga ekstrakcji.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Ropień lub silne zapalenie — wymaga ekstrakcji.',
            symptoms: [
                { text: 'Silny ból uniemożliwiający jedzenie', tip: 'Silny ból uniemożliwiający jedzenie' },
                { text: 'Znaczny obrzęk policzka lub pod żuchwą', tip: 'Znaczny obrzęk policzka lub pod żuchwą' },
                { text: 'Szczękościsk (ledwo otwierasz usta)', tip: 'Szczękościsk (ledwo otwierasz usta)' },
                { text: 'Gorączka >38°C', tip: 'Gorączka >38°C' },
                { text: 'Trudności z przełykaniem', tip: 'Trudności z przełykaniem' },
                { text: 'Ropna wydzielina z dziąsła za ostatnim zębem', tip: 'Ropna wydzielina z dziąsła za ostatnim zębem' },
            ],
            causes: [
                { text: 'Ropień okołokoronowy (pericoronitis z ropniem)', tip: 'Ropień okołokoronowy (pericoronitis z ropniem)' },
                { text: 'Infekcja rozprzestrzeniająca się na przestrzenie powięziowe', tip: 'Infekcja rozprzestrzeniająca się na przestrzenie powięziowe' },
                { text: 'Resorpcja korzenia siódemki przez naciskającą ósemkę', tip: 'Resorpcja korzenia siódemki przez naciskającą ósemkę' },
                { text: 'Złamanie żuchwy w linii ósemki (rzadko)', tip: 'Złamanie żuchwy w linii ósemki (rzadko)' },
            ],
            advice: 'Pilna wizyta chirurga stomatologa! Infekcja od dolnych ósemek może zejść do przestrzeni podżuchwowej i szyjnej — to zagrożenie życia (angina Ludwiga). Antybiotyk + ekstrakcja w trybie pilnym.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

// ─── SOFT TISSUE TEMPLATES ───

const TONGUE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielkie zmiany lub podrażnienia języka.',
            symptoms: [
                { text: 'Lekkie pieczenie końca języka', tip: 'Lekkie pieczenie końca języka' },
                { text: 'Biały lub żółtawy nalot na grzbiecie języka', tip: 'Biały lub żółtawy nalot na grzbiecie języka' },
                { text: 'Powiększone brodawki niciowate', tip: 'Powiększone brodawki niciowate' },
                { text: 'Wrażliwość na ostre przyprawy', tip: 'Wrażliwość na ostre przyprawy' },
            ],
            causes: [
                { text: 'Język geograficzny (glossitis migrans) — łagodny stan', tip: 'Język geograficzny (glossitis migrans) — łagodny stan' },
                { text: 'Suchość jamy ustnej (oddychanie przez usta)', tip: 'Suchość jamy ustnej (oddychanie przez usta)' },
                { text: 'Niedobór witamin z grupy B', tip: 'Niedobór witamin z grupy B' },
                { text: 'Reakcja na pastę do zębów (SLS — laurylosiarczan sodu)', tip: 'Reakcja na pastę do zębów (SLS — laurylosiarczan sodu)' },
            ],
            advice: 'Stosuj płukankę bez alkoholu, pij dużo wody, unikaj bardzo gorących napojów. Język geograficzny jest stanem łagodnym — nie wymaga leczenia. Jeśli nalot utrzymuje się >2 tygodnie, pokaż lekarzowi.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się zmiany wymagające diagnostyki.',
            symptoms: [
                { text: 'Uporczywe pieczenie całego języka (burning mouth)', tip: 'Uporczywe pieczenie całego języka (burning mouth)' },
                { text: 'Białe lub czerwone plamy, które nie schodzą przy pocieraniu', tip: 'Białe lub czerwone plamy, które nie schodzą przy pocieraniu' },
                { text: 'Bolesne owrzodzenie trwające >10 dni', tip: 'Bolesne owrzodzenie trwające >10 dni' },
                { text: 'Uczucie „falistego" brzegu języka (odciski zębów)', tip: 'Uczucie „falistego" brzegu języka (odciski zębów)' },
                { text: 'Utrata smaku lub metaliczny posmak', tip: 'Utrata smaku lub metaliczny posmak' },
            ],
            causes: [
                { text: 'Leukoplakia (zmiana przedrakowa — biała plama)', tip: 'Leukoplakia (zmiana przedrakowa — biała plama)' },
                { text: 'Liszaj płaski (lichen planus)', tip: 'Liszaj płaski (lichen planus)' },
                { text: 'Kandydoza jamy ustnej (grzybica — Candida)', tip: 'Kandydoza jamy ustnej (grzybica — Candida)' },
                { text: 'Zespół pieczenia jamy ustnej (BMS)', tip: 'Zespół pieczenia jamy ustnej (BMS)' },
                { text: 'Podrażnienie ostrą krawędzią zęba lub protezy', tip: 'Podrażnienie ostrą krawędzią zęba lub protezy' },
            ],
            advice: 'Biała lub czerwona plama na języku, która nie znika po 2 tygodniach, wymaga wizyty i ewentualnej biopsji. To ważne dla wczesnego wykluczenia zmian przednowotworowych.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Zmiana budząca poważne obawy — pilna diagnostyka.',
            symptoms: [
                { text: 'Niebolesne owrzodzenie na boku języka trwające >3 tygodnie', tip: 'Niebolesne owrzodzenie na boku języka trwające >3 tygodnie' },
                { text: 'Stwardnienie lub guzek wyczuwalny w języku', tip: 'Stwardnienie lub guzek wyczuwalny w języku' },
                { text: 'Krwawienie z niewielkiej zmiany na języku', tip: 'Krwawienie z niewielkiej zmiany na języku' },
                { text: 'Powiększone węzły chłonne szyjne', tip: 'Powiększone węzły chłonne szyjne' },
                { text: 'Trudności z mową lub ruchomością języka', tip: 'Trudności z mową lub ruchomością języka' },
                { text: 'Znaczna utrata masy ciała', tip: 'Znaczna utrata masy ciała' },
            ],
            causes: [
                { text: 'Rak płaskonabłonkowy jamy ustnej (SCC)', tip: 'Rak płaskonabłonkowy jamy ustnej (SCC)' },
                { text: 'Zmiana przednowotworowa zaawansowana', tip: 'Zmiana przednowotworowa zaawansowana' },
                { text: 'Ropień dna jamy ustnej', tip: 'Ropień w dnie jamy ustnej może zagrażać życiu — może rozprzestrzenić się do szyi.' },
                { text: 'Ranula (torbiel śluzowa) — duży rozmiar', tip: 'Ranula (torbiel śluzowa) — duży rozmiar' },
            ],
            advice: 'PILNE! Niebolesne owrzodzenie na boku języka trwające >3 tygodnie to klasyczny objaw wymagający pilnej biopsji. Skontaktuj się z lekarzem niezwłocznie — wczesne wykrycie = pełne wyleczenie.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const PALATE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Podrażnienie lub drobne uszkodzenie podniebienia.',
            symptoms: [
                { text: 'Pieczenie po gorącym jedzeniu lub piciu', tip: 'Pieczenie po gorącym jedzeniu lub piciu' },
                { text: 'Drobne otarcie lub skaleczenie', tip: 'Drobne otarcie lub skaleczenie' },
                { text: 'Szorstka/pomarszczona powierzchnia', tip: 'Szorstka/pomarszczona powierzchnia' },
                { text: 'Lekki dyskomfort przy jedzeniu', tip: 'Lekki dyskomfort przy jedzeniu' },
            ],
            causes: [
                { text: 'Oparzenie termiczne (gorąca pizza, kawa)', tip: 'Oparzenie termiczne (gorąca pizza, kawa)' },
                { text: 'Podrażnienie ostrym jedzeniem (chipsy, grzanki)', tip: 'Podrażnienie ostrym jedzeniem (chipsy, grzanki)' },
                { text: 'Torus palatinus (kostny zgrubienie — wariant normy)', tip: 'Torus palatinus (kostny zgrubienie — wariant normy)' },
                { text: 'Podrażnienie od protezy górnej', tip: 'Podrażnienie od protezy górnej' },
            ],
            advice: 'Oparzenie podniebienia to najczęstsza przyczyna — goi się w 7-10 dni. Unikaj gorących pokarmów. Torus palatinus (twarde zgrubienie na środku) to wariant normy i nie wymaga leczenia.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się zmiany na podniebieniu — do oceny.',
            symptoms: [
                { text: 'Guzek lub obrzęk na podniebieniu trwający >2 tygodnie', tip: 'Guzek lub obrzęk na podniebieniu trwający >2 tygodnie' },
                { text: 'Bolesne owrzodzenie utrudniające jedzenie', tip: 'Bolesne owrzodzenie utrudniające jedzenie' },
                { text: 'Zmiana barwy śluzówki (biała, czerwona, fioletowa)', tip: 'Zmiana barwy śluzówki (biała, czerwona, fioletowa)' },
                { text: 'Krwawienie przy dotyku', tip: 'Krwawienie przy dotyku' },
                { text: 'Uczucie ciała obcego na podniebieniu', tip: 'Uczucie ciała obcego na podniebieniu' },
            ],
            causes: [
                { text: 'Ropień podniebienny (z zęba górnego)', tip: 'Ropień podniebienny (z zęba górnego)' },
                { text: 'Pleomorficzny gruczolak (guz ślinianki mniejszej)', tip: 'Pleomorficzny gruczolak (guz ślinianki mniejszej)' },
                { text: 'Liszaj płaski podniebienia', tip: 'Liszaj płaski podniebienia' },
                { text: 'Martwicze zapalenie jamy ustnej', tip: 'Martwicze zapalenie jamy ustnej' },
                { text: 'Naczyniak (hemangioma)', tip: 'Naczyniak (hemangioma)' },
            ],
            advice: 'Guzek na podniebieniu, który nie ustępuje po 2-3 tygodniach, powinien być zbadany przez stomatologa. Podniebienie jest częstym miejscem guzów gruczołów ślinowych (większość jest łagodna, ale wymaga potwierdzenia).',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Narastający guzek lub rozległy ropień — pilna wizyta.',
            symptoms: [
                { text: 'Szybko rosnący guzek na podniebieniu', tip: 'Szybko rosnący guzek na podniebieniu' },
                { text: 'Silny ból uniemożliwiający jedzenie i picie', tip: 'Silny ból uniemożliwiający jedzenie i picie' },
                { text: 'Obrzęk podniebienia z asymetrią', tip: 'Obrzęk podniebienia z asymetrią' },
                { text: 'Owrzodzenie z drążącą martwicą', tip: 'Owrzodzenie z drążącą martwicą' },
                { text: 'Krwotok z podniebienia', tip: 'Krwotok z podniebienia' },
                { text: 'Uczucie „pełności" w jednym nozdrzu', tip: 'Uczucie „pełności" w jednym nozdrzu' },
            ],
            causes: [
                { text: 'Nowotwór złośliwy gruczołów ślinowych mniejszych', tip: 'Nowotwór złośliwy gruczołów ślinowych mniejszych' },
                { text: 'Rak płaskonabłonkowy podniebienia', tip: 'Rak płaskonabłonkowy podniebienia' },
                { text: 'Ropień podniebienny z penetracją do zatoki', tip: 'Ropień podniebienny z penetracją do zatoki' },
                { text: 'Martwicze zapalenie podniebienia (nekrotyzujące)', tip: 'Martwicze zapalenie podniebienia (nekrotyzujące)' },
            ],
            advice: 'PILNE! Szybko rosnący guz na podniebieniu wymaga natychmiastowej biopsji. Podniebienie jest trzecim co do częstości miejscem nowotworów jamy ustnej. Skontaktuj się z kliniką chirurgii szczękowo-twarzowej.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const THROAT_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Drapanie lub dyskomfort w gardle.',
            symptoms: [
                { text: 'Drapanie lub suchość w gardle', tip: 'Drapanie lub suchość w gardle' },
                { text: 'Lekki ból przy przełykaniu', tip: 'Lekki ból przy przełykaniu' },
                { text: 'Uczucie ciała obcego', tip: 'Uczucie ciała obcego' },
                { text: 'Chrząkanie lub konieczność odchrząkiwania', tip: 'Chrząkanie lub konieczność odchrząkiwania' },
            ],
            causes: [
                { text: 'Przeziębienie lub infekcja wirusowa', tip: 'Przeziębienie lub infekcja wirusowa' },
                { text: 'Refluks żołądkowy (GERD) podrażniający gardło', tip: 'Refluks żołądkowy (GERD) podrażniający gardło' },
                { text: 'Suchość jamy ustnej (oddychanie przez usta podczas snu)', tip: 'Suchość jamy ustnej (oddychanie przez usta podczas snu)' },
                { text: 'Ściekanie wydzieliny po tylnej ścianie gardła', tip: 'Ściekanie wydzieliny po tylnej ścianie gardła' },
            ],
            advice: 'Pieczenie i suchość gardła najczęściej ma przyczynę wirusową lub wynika z refluksu. Płucz gardło słoną wodą. Jeśli trwa >2 tygodnie — warto wykluczyć refluks i skonsultować się z lekarzem.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się objawy gardłowe — mogą mieć związek z zębami.',
            symptoms: [
                { text: 'Ból gardła trwający >2 tygodnie bez poprawy', tip: 'Ból gardła trwający >2 tygodnie bez poprawy' },
                { text: 'Powiększone migdałki z kamicami (tonsilloliths)', tip: 'Powiększone migdałki z kamicami (tonsilloliths)' },
                { text: 'Ból promieniujący do ucha (jednostronny)', tip: 'Ból promieniujący do ucha (jednostronny)' },
                { text: 'Trudności z przełykaniem pokarmów stałych', tip: 'Trudności z przełykaniem pokarmów stałych' },
                { text: 'Przewlekły nieświeży oddech (halitoza)', tip: 'Przewlekły nieświeży oddech (halitoza)' },
            ],
            causes: [
                { text: 'Kamienie migdałkowe (tonsilloliths — biały kamyczek w migdałku)', tip: 'Kamienie migdałkowe (tonsilloliths — biały kamyczek w migdałku)' },
                { text: 'Powikłanie od zainfekowanej ósemki (pericoronitis → gardło)', tip: 'Powikłanie od zainfekowanej ósemki (pericoronitis → gardło)' },
                { text: 'Zapalenie tkanki łącznej przestrzeni przygardłowej', tip: 'Zapalenie tkanki łącznej przestrzeni przygardłowej' },
                { text: 'Przewlekłe zapalenie migdałków', tip: 'Przewlekłe zapalenie migdałków' },
            ],
            advice: 'Ból gardła promieniujący do ucha może pochodzić od zainfekowanych ósemek dolnych. Warto zrobić RTG panoramiczne zębów. Kamienie migdałkowe powodują halitosis — można je usunąć u laryngologa.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Poważne objawy wymagające pilnej diagnostyki.',
            symptoms: [
                { text: 'Silny ból gardła z gorączką >38°C', tip: 'Silny ból gardła z gorączką >38°C' },
                { text: 'Znaczny obrzęk szyi lub pod żuchwą', tip: 'Znaczny obrzęk szyi lub pod żuchwą' },
                { text: 'Szczękościsk (trudności z otwarciem ust)', tip: 'Szczękościsk (trudności z otwarciem ust)' },
                { text: 'Trudności z oddychaniem lub przełykaniem śliny', tip: 'Trudności z oddychaniem lub przełykaniem śliny' },
                { text: 'Chrypiący głos trwający >3 tygodnie', tip: 'Chrypiący głos trwający >3 tygodnie' },
                { text: 'Jednostronny drętwienie języka lub podniebienia', tip: 'Jednostronny drętwienie języka lub podniebienia' },
            ],
            causes: [
                { text: 'Ropień okołomigdałkowy (peritonsillar abscess)', tip: 'Zbiornik ropy obok migdałka — wymaga nacięcia i drenażu chirurgicznego.' },
                { text: 'Ropień dna jamy ustnej z rozprzestrzenieniem na gardło', tip: 'Ropień dna jamy ustnej z rozprzestrzenieniem na gardło' },
                { text: 'Angina Ludwiga (zagrożenie życia!)', tip: 'Angina Ludwiga (zagrożenie życia!)' },
                { text: 'Nowotwór gardła lub migdałków', tip: 'Nowotwór gardła lub migdałków' },
            ],
            advice: 'PILNE — SOR lub pogotowie! Trudności z oddychaniem lub przełykaniem śliny + obrzęk szyi wymagają natychmiastowej interwencji. Angina Ludwiga to zagrożenie życia. Nie czekaj do rana!',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

// ─── BUILD FINAL DATA ───

function makeToothZone(id: string, title: string, subtitle: string, data: Omit<ZoneInfo, 'title' | 'subtitle'>): ZoneInfo {
    return { title, subtitle, ...data };
}

export const SYMPTOM_DATA: Record<string, ZoneInfo> = {
    // UPPER RIGHT (Q1)
    "11": makeToothZone("11", "Górna Prawa Jedynka", "Siekacz centralny · Ząb 11", INCISOR_DATA),
    "12": makeToothZone("12", "Górna Prawa Dwójka", "Siekacz boczny · Ząb 12", INCISOR_DATA),
    "13": makeToothZone("13", "Górny Prawy Kieł", "Kieł · Ząb 13", CANINE_DATA),
    "14": makeToothZone("14", "Górna Prawa Czwórka", "1. przedtrzonowiec · Ząb 14", PREMOLAR_DATA),
    "15": makeToothZone("15", "Górna Prawa Piątka", "2. przedtrzonowiec · Ząb 15", PREMOLAR_DATA),
    "16": makeToothZone("16", "Górna Prawa Szóstka", "1. trzonowiec · Ząb 16", MOLAR_DATA),
    "17": makeToothZone("17", "Górna Prawa Siódemka", "2. trzonowiec · Ząb 17", MOLAR_DATA),
    "18": makeToothZone("18", "Górna Prawa Ósemka", "Ząb mądrości · Ząb 18", WISDOM_DATA),

    // UPPER LEFT (Q2)
    "21": makeToothZone("21", "Górna Lewa Jedynka", "Siekacz centralny · Ząb 21", INCISOR_DATA),
    "22": makeToothZone("22", "Górna Lewa Dwójka", "Siekacz boczny · Ząb 22", INCISOR_DATA),
    "23": makeToothZone("23", "Górny Lewy Kieł", "Kieł · Ząb 23", CANINE_DATA),
    "24": makeToothZone("24", "Górna Lewa Czwórka", "1. przedtrzonowiec · Ząb 24", PREMOLAR_DATA),
    "25": makeToothZone("25", "Górna Lewa Piątka", "2. przedtrzonowiec · Ząb 25", PREMOLAR_DATA),
    "26": makeToothZone("26", "Górna Lewa Szóstka", "1. trzonowiec · Ząb 26", MOLAR_DATA),
    "27": makeToothZone("27", "Górna Lewa Siódemka", "2. trzonowiec · Ząb 27", MOLAR_DATA),
    "28": makeToothZone("28", "Górna Lewa Ósemka", "Ząb mądrości · Ząb 28", WISDOM_DATA),

    // LOWER LEFT (Q3)
    "31": makeToothZone("31", "Dolna Lewa Jedynka", "Siekacz centralny · Ząb 31", INCISOR_DATA),
    "32": makeToothZone("32", "Dolna Lewa Dwójka", "Siekacz boczny · Ząb 32", INCISOR_DATA),
    "33": makeToothZone("33", "Dolny Lewy Kieł", "Kieł · Ząb 33", CANINE_DATA),
    "34": makeToothZone("34", "Dolna Lewa Czwórka", "1. przedtrzonowiec · Ząb 34", PREMOLAR_DATA),
    "35": makeToothZone("35", "Dolna Lewa Piątka", "2. przedtrzonowiec · Ząb 35", PREMOLAR_DATA),
    "36": makeToothZone("36", "Dolna Lewa Szóstka", "1. trzonowiec · Ząb 36", MOLAR_DATA),
    "37": makeToothZone("37", "Dolna Lewa Siódemka", "2. trzonowiec · Ząb 37", MOLAR_DATA),
    "38": makeToothZone("38", "Dolna Lewa Ósemka", "Ząb mądrości · Ząb 38", WISDOM_DATA),

    // LOWER RIGHT (Q4)
    "41": makeToothZone("41", "Dolna Prawa Jedynka", "Siekacz centralny · Ząb 41", INCISOR_DATA),
    "42": makeToothZone("42", "Dolna Prawa Dwójka", "Siekacz boczny · Ząb 42", INCISOR_DATA),
    "43": makeToothZone("43", "Dolny Prawy Kieł", "Kieł · Ząb 43", CANINE_DATA),
    "44": makeToothZone("44", "Dolna Prawa Czwórka", "1. przedtrzonowiec · Ząb 44", PREMOLAR_DATA),
    "45": makeToothZone("45", "Dolna Prawa Piątka", "2. przedtrzonowiec · Ząb 45", PREMOLAR_DATA),
    "46": makeToothZone("46", "Dolna Prawa Szóstka", "1. trzonowiec · Ząb 46", MOLAR_DATA),
    "47": makeToothZone("47", "Dolna Prawa Siódemka", "2. trzonowiec · Ząb 47", MOLAR_DATA),
    "48": makeToothZone("48", "Dolna Prawa Ósemka", "Ząb mądrości · Ząb 48", WISDOM_DATA),

    // SOFT TISSUES
    "tongue": { title: "Język", subtitle: "Dno jamy ustnej", ...TONGUE_DATA },
    "palate": { title: "Podniebienie", subtitle: "Górna ściana jamy ustnej", ...PALATE_DATA },
    "throat": { title: "Gardło / Tylna ściana", subtitle: "Migdałki i zev", ...THROAT_DATA },
};

export type SymptomKey = keyof typeof SYMPTOM_DATA;
