
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
                { text: 'Krótkotrwała nadwrażliwość na zimno lub słodycze', tip: '' },
                { text: 'Niewielkie przebarwienie lub zmiana koloru', tip: '' },
                { text: 'Lekki dyskomfort przy odgryzaniu twardych pokarmów', tip: '' },
                { text: 'Szorstka powierzchnia brzegu zęba', tip: '' },
            ],
            causes: [
                { text: 'Początkowa demineralizacja szkliwa (białe plamy)', tip: '' },
                { text: 'Płytka próchnica (na powierzchni)', tip: '' },
                { text: 'Cofanie się dziąsła odsłaniające szyjkę', tip: '' },
                { text: 'Uszkodzenia erozyjne (kwaśna dieta)', tip: '' },
            ],
            advice: 'Stosuj pastę z fluorem (min. 1450 ppm) i płukankę. Jeśli nadwrażliwość utrzymuje się ponad 2 tygodnie — umów wizytę kontrolną. Wczesna interwencja może uratować ząb bez rozległego leczenia.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból powtarzający się, wymagający diagnostyki.',
            symptoms: [
                { text: 'Ból spontaniczny, nasilający się wieczorem', tip: '' },
                { text: 'Przedłużona reakcja na ciepło/zimno (>30 sekund)', tip: '' },
                { text: 'Widoczny ubytek lub szczelina na powierzchni zęba', tip: '' },
                { text: 'Niewielki obrzęk lub zaczerwienienie dziąsła wokół zęba', tip: '' },
                { text: 'Kruszenie się brzegu zęba', tip: '' },
            ],
            causes: [
                { text: 'Próchnica średnio zaawansowana (sięgająca zębiny)', tip: '' },
                { text: 'Pęknięcie szkliwa (cracked enamel syndrome)', tip: '' },
                { text: 'Zapalenie miazgi odwracalne', tip: '' },
                { text: 'Uraz mechaniczny (np. po uderzeniu)', tip: '' },
            ],
            advice: 'Wymagana wizyta w ciągu 1–2 tygodni. Lekarz oceni głębokość ubytku i czy konieczne jest wypełnienie lub leczenie kanałowe. Nie czekaj — ten stan może się pogorszyć.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból wymagający pilnej interwencji.',
            symptoms: [
                { text: 'Silny, pulsujący ból trudny do zlokalizowania', tip: '' },
                { text: 'Ból budzący w nocy', tip: '' },
                { text: 'Obrzęk twarzy lub dziąsła', tip: '' },
                { text: 'Ząb zmienił kolor (szary/ciemny)', tip: '' },
                { text: 'Ropień lub przetoka (ropny pęcherzyk na dziąśle)', tip: '' },
                { text: 'Gorączka towarzysząca bólowi zęba', tip: '' },
            ],
            causes: [
                { text: 'Zapalenie miazgi nieodwracalne', tip: '' },
                { text: 'Martwica miazgi z infekcją', tip: '' },
                { text: 'Ropień okołowierzchołkowy', tip: '' },
                { text: 'Złamanie korzenia po urazie', tip: '' },
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
                { text: 'Nadwrażliwość przy szyjce zęba (od strony dziąsła)', tip: '' },
                { text: 'Ścieranie wierzchołka kła', tip: '' },
                { text: 'Cofnięte dziąsło po jednej stronie', tip: '' },
                { text: 'Lekki dyskomfort przy gryzieniu', tip: '' },
            ],
            causes: [
                { text: 'Ubytki klinowe (nadmierne szczotkowanie)', tip: '' },
                { text: 'Bruksizm (zgrzytanie zębami) — ścieranie', tip: '' },
                { text: 'Recesja dziąsła odsłaniająca cement korzeniowy', tip: '' },
                { text: 'Początkowa próchnica szyjkowa', tip: '' },
            ],
            advice: 'Kły mają najdłuższe korzenie i są kluczowe dla prowadzenia zgryzu. Ścieranie sugeruje bruksizm — zapytaj o szynę relaksacyjną. Używaj szczoteczki o miękkim włosiu.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból promieniujący do oka lub nosa — wymaga diagnostyki.',
            symptoms: [
                { text: 'Ból promieniujący w stronę oka lub skrzydełka nosa', tip: '' },
                { text: 'Przedłużona nadwrażliwość na temperaturę', tip: '' },
                { text: 'Widoczny głęboki ubytek przy szyjce', tip: '' },
                { text: 'Ból przy nagryzaniu od boku', tip: '' },
                { text: 'Powiększony węzeł chłonny pod żuchwą', tip: '' },
            ],
            causes: [
                { text: 'Próchnica szyjkowa zaawansowana', tip: '' },
                { text: 'Zapalenie miazgi (odwracalne)', tip: '' },
                { text: 'Pęknięcie podłużne korzenia', tip: '' },
                { text: 'Zapalenie ozębnej (periodontitis apicalis)', tip: '' },
            ],
            advice: 'Ból promieniujący z kła jest charakterystyczny ze względu na jego anatomię (długi korzeń blisko zatoki). Umów wizytę — potrzebny RTG do oceny stanu korzenia.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub obrzęk — pilna interwencja.',
            symptoms: [
                { text: 'Intensywny ból pulsujący, trudny do kontrolowania lekami', tip: '' },
                { text: 'Obrzęk w okolicy podpoliczkowej', tip: '' },
                { text: 'Ropień na dziąśle w okolicy kła', tip: '' },
                { text: 'Ruchomość zęba', tip: '' },
                { text: 'Trudności z otwieraniem ust (szczękościsk)', tip: '' },
            ],
            causes: [
                { text: 'Ropień okołowierzchołkowy', tip: '' },
                { text: 'Martwica miazgi z rozległą infekcją', tip: '' },
                { text: 'Złamanie korzenia w wyniku urazu', tip: '' },
                { text: 'Zapalenie tkanek przyzębia (parodontoza zaawansowana)', tip: '' },
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
                { text: 'Lekki ból przy gryzieniu twardego jedzenia', tip: '' },
                { text: 'Ubytek klinowy widoczny przy linii dziąsła', tip: '' },
                { text: 'Krótkotrwała nadwrażliwość na zimno', tip: '' },
                { text: 'Uczucie „coś się ciśnie" przy żuciu', tip: '' },
            ],
            causes: [
                { text: 'Nieszczelne wypełnienie (stare amalgamaty)', tip: '' },
                { text: 'Ubytki klinowe od nawykowego zaciskania', tip: '' },
                { text: 'Płytka próchnica na powierzchni stycznej (między zębami)', tip: '' },
                { text: 'Przeładowanie zgryzowe (przedwczesny kontakt)', tip: '' },
            ],
            advice: 'Przedtrzonowce często pękają od zaciskania zębów — zwłaszcza jednoguzkowe z dużymi plombami. Rozważ wymianę starych wypełnień na nakłady ceramiczne. Wizyta kontrolna w ciągu miesiąca.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból nasilający się przy żuciu — ryzyko pęknięcia.',
            symptoms: [
                { text: 'Ostry ból przy gryzieniu na konkretnym guzku', tip: '' },
                { text: 'Ból przy zwalnianiu uścisku (characteristic cracked tooth)', tip: '' },
                { text: 'Nadwrażliwość na ciepło trwająca >minutę', tip: '' },
                { text: 'Jedzenie utyka między zębami (nowe zjawisko)', tip: '' },
                { text: 'Pobolewanie po spożyciu gorących napojów', tip: '' },
            ],
            causes: [
                { text: 'Zespół pękniętego zęba (cracked tooth syndrome)', tip: '' },
                { text: 'Próchnica pod starym wypełnieniem (próchnica wtórna)', tip: '' },
                { text: 'Zapalenie miazgi odwracalne', tip: '' },
                { text: 'Utrata punktu kontaktowego (jedzenie wpada między zęby)', tip: '' },
            ],
            advice: 'Ból przy „puszczaniu" gryzu = klasyczny objaw pękniętego zęba. Wymaga pilnej diagnostyki pod mikroskopem. Umów wizytę w ciągu tygodnia — pęknięcie może się pogłębić.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub pęknięcie krytyczne.',
            symptoms: [
                { text: 'Ciągły, silny ból pulsujący', tip: '' },
                { text: 'Ząb ruchomy lub „unosi się" na dziąśle', tip: '' },
                { text: 'Obrzęk dziąsła z ropną wydzieliną', tip: '' },
                { text: 'Odłamanie ściany zęba przy gryzieniu', tip: '' },
                { text: 'Ból przy jakimkolwiek kontakcie z jedzeniem', tip: '' },
            ],
            causes: [
                { text: 'Pęknięcie pionowe sięgające korzenia (nieodwracalne)', tip: '' },
                { text: 'Ropień okołowierzchołkowy', tip: '' },
                { text: 'Martwica miazgi', tip: '' },
                { text: 'Złamanie zęba pod wypełnieniem', tip: '' },
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
                { text: 'Jedzenie wchodzi między zęby (food impaction)', tip: '' },
                { text: 'Lekki ból przy gryzieniu twardego jedzenia', tip: '' },
                { text: 'Nadwrażliwość na zimno w okolicy zęba', tip: '' },
                { text: 'Krwawienie dziąsła przy myciu/nitkowaniu', tip: '' },
            ],
            causes: [
                { text: 'Nieszczelne wypełnienie — utrata punktu kontaktowego', tip: '' },
                { text: 'Początkowa próchnica na powierzchni żującej (bruzdy)', tip: '' },
                { text: 'Zapalenie dziąsła (gingivitis) z powodu słabej higieny', tip: '' },
                { text: 'Starcie wypełnienia wymagające wymiany', tip: '' },
            ],
            advice: 'Trzonowce mają głębokie bruzdy, gdzie łatwo gromadzi się płytka. Używaj nici lub szczoteczek międzyzębowych codziennie. Wizyta kontrolna z przeglądem wypełnień co 6 miesięcy.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból nasilający się, możliwe zapalenie miazgi.',
            symptoms: [
                { text: 'Głęboki ból pulsujący, nasilający się wieczorem', tip: '' },
                { text: 'Przedłużona reakcja na ciepło (>1 minuty)', tip: '' },
                { text: 'Ból promieniujący do ucha lub skroni', tip: '' },
                { text: 'Trudność z żuciem po jednej stronie', tip: '' },
                { text: 'Ciemne przebarwienie na powierzchni żującej', tip: '' },
            ],
            causes: [
                { text: 'Próchnica głęboka sięgająca zębiny lub blisko miazgi', tip: '' },
                { text: 'Zapalenie miazgi odwracalne (reversible pulpitis)', tip: '' },
                { text: 'Próchnica wtórna pod koroną lub dużym wypełnieniem', tip: '' },
                { text: 'Pęknięcie guzka (cusp fracture)', tip: '' },
            ],
            advice: 'Ból reagujący na ciepło to sygnał ostrzegawczy — miazga może być w stanie zapalnym. Umów wizytę w ciągu tygodnia. Lekarz oceni czy wystarczy głębokie wypełnienie czy potrzebne leczenie kanałowe.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub ropień — konieczna pilna interwencja.',
            symptoms: [
                { text: 'Silny, nieustający ból pulsujący', tip: '' },
                { text: 'Ból budzący w nocy, nie reagujący na leki', tip: '' },
                { text: 'Obrzęk policzka lub pod żuchwą', tip: '' },
                { text: 'Gorączka, złe samopoczucie', tip: '' },
                { text: 'Ropna wydzielina z dziąsła lub przetoka', tip: '' },
                { text: 'Ząb „wyrósł" — ból przy zamykaniu ust', tip: '' },
            ],
            causes: [
                { text: 'Zapalenie miazgi nieodwracalne (irreversible pulpitis)', tip: '' },
                { text: 'Ropień okołowierzchołkowy lub przyzębny', tip: '' },
                { text: 'Martwica miazgi z infekcją okołowierzchołkową', tip: '' },
                { text: 'Zaostrzenie przewlekłego stanu zapalnego', tip: '' },
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
                { text: 'Nacisk lub uczucie „pchania" w tylnej części łuku', tip: '' },
                { text: 'Lekki obrzęk dziąsła za ostatnim zębem', tip: '' },
                { text: 'Dyskomfort przy szeroko otwieraniu ust', tip: '' },
                { text: 'Lekki ból nasilający się przy jedzeniu', tip: '' },
            ],
            causes: [
                { text: 'Aktywne wyrzynanie ósemki (pericoronitis lekki)', tip: '' },
                { text: 'Zaczynająca się próchnica na niedostępnej powierzchni', tip: '' },
                { text: 'Ucisk na sąsiedni ząb (siódemkę)', tip: '' },
                { text: 'Kapturek dziąsłowy gromadzący resztki jedzenia', tip: '' },
            ],
            advice: 'Płucz roztworem soli (łyżeczka na szklankę ciepłej wody) 3x dziennie. Jeśli ósemka jest krzywa na RTG — rozważ profilaktyczną ekstrakcję. Łatwiej usuwać zanim zacznie boleć.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Zapalenie dziąsła wokół ósemki — wymaga leczenia.',
            symptoms: [
                { text: 'Ból pulsujący w tylnej części szczęki', tip: '' },
                { text: 'Obrzęk i zaczerwienienie dziąsła nad ósemką', tip: '' },
                { text: 'Trudności z otwieraniem ust (szczękościsk częściowy)', tip: '' },
                { text: 'Ból promieniujący do ucha', tip: '' },
                { text: 'Nieprzyjemny smak lub zapach z okolicy zęba', tip: '' },
            ],
            causes: [
                { text: 'Zapalenie okołokoronowe (pericoronitis)', tip: '' },
                { text: 'Próchnica na powierzchni stycznej z siódemką', tip: '' },
                { text: 'Częściowo wyrżnięta ósemka — retencja pokarmów', tip: '' },
                { text: 'Torbiel zawiązkowa (dentigerous cyst)', tip: '' },
            ],
            advice: 'Zapalenie wokół ósemki (pericoronitis) to częsty problem. Umów wizytę w ciągu tygodnia — lekarz oceni na RTG panoramicznym czy ząb ma szansę prawidłowo wyrżnąć czy wymaga ekstrakcji.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Ropień lub silne zapalenie — wymaga ekstrakcji.',
            symptoms: [
                { text: 'Silny ból uniemożliwiający jedzenie', tip: '' },
                { text: 'Znaczny obrzęk policzka lub pod żuchwą', tip: '' },
                { text: 'Szczękościsk (ledwo otwierasz usta)', tip: '' },
                { text: 'Gorączka >38°C', tip: '' },
                { text: 'Trudności z przełykaniem', tip: '' },
                { text: 'Ropna wydzielina z dziąsła za ostatnim zębem', tip: '' },
            ],
            causes: [
                { text: 'Ropień okołokoronowy (pericoronitis z ropniem)', tip: '' },
                { text: 'Infekcja rozprzestrzeniająca się na przestrzenie powięziowe', tip: '' },
                { text: 'Resorpcja korzenia siódemki przez naciskającą ósemkę', tip: '' },
                { text: 'Złamanie żuchwy w linii ósemki (rzadko)', tip: '' },
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
                { text: 'Lekkie pieczenie końca języka', tip: '' },
                { text: 'Biały lub żółtawy nalot na grzbiecie języka', tip: '' },
                { text: 'Powiększone brodawki niciowate', tip: '' },
                { text: 'Wrażliwość na ostre przyprawy', tip: '' },
            ],
            causes: [
                { text: 'Język geograficzny (glossitis migrans) — łagodny stan', tip: '' },
                { text: 'Suchość jamy ustnej (oddychanie przez usta)', tip: '' },
                { text: 'Niedobór witamin z grupy B', tip: '' },
                { text: 'Reakcja na pastę do zębów (SLS — laurylosiarczan sodu)', tip: '' },
            ],
            advice: 'Stosuj płukankę bez alkoholu, pij dużo wody, unikaj bardzo gorących napojów. Język geograficzny jest stanem łagodnym — nie wymaga leczenia. Jeśli nalot utrzymuje się >2 tygodnie, pokaż lekarzowi.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się zmiany wymagające diagnostyki.',
            symptoms: [
                { text: 'Uporczywe pieczenie całego języka (burning mouth)', tip: '' },
                { text: 'Białe lub czerwone plamy, które nie schodzą przy pocieraniu', tip: '' },
                { text: 'Bolesne owrzodzenie trwające >10 dni', tip: '' },
                { text: 'Uczucie „falistego" brzegu języka (odciski zębów)', tip: '' },
                { text: 'Utrata smaku lub metaliczny posmak', tip: '' },
            ],
            causes: [
                { text: 'Leukoplakia (zmiana przedrakowa — biała plama)', tip: '' },
                { text: 'Liszaj płaski (lichen planus)', tip: '' },
                { text: 'Kandydoza jamy ustnej (grzybica — Candida)', tip: '' },
                { text: 'Zespół pieczenia jamy ustnej (BMS)', tip: '' },
                { text: 'Podrażnienie ostrą krawędzią zęba lub protezy', tip: '' },
            ],
            advice: 'Biała lub czerwona plama na języku, która nie znika po 2 tygodniach, wymaga wizyty i ewentualnej biopsji. To ważne dla wczesnego wykluczenia zmian przednowotworowych.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Zmiana budząca poważne obawy — pilna diagnostyka.',
            symptoms: [
                { text: 'Niebolesne owrzodzenie na boku języka trwające >3 tygodnie', tip: '' },
                { text: 'Stwardnienie lub guzek wyczuwalny w języku', tip: '' },
                { text: 'Krwawienie z niewielkiej zmiany na języku', tip: '' },
                { text: 'Powiększone węzły chłonne szyjne', tip: '' },
                { text: 'Trudności z mową lub ruchomością języka', tip: '' },
                { text: 'Znaczna utrata masy ciała', tip: '' },
            ],
            causes: [
                { text: 'Rak płaskonabłonkowy jamy ustnej (SCC)', tip: '' },
                { text: 'Zmiana przednowotworowa zaawansowana', tip: '' },
                { text: 'Ropień dna jamy ustnej', tip: '' },
                { text: 'Ranula (torbiel śluzowa) — duży rozmiar', tip: '' },
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
                { text: 'Pieczenie po gorącym jedzeniu lub piciu', tip: '' },
                { text: 'Drobne otarcie lub skaleczenie', tip: '' },
                { text: 'Szorstka/pomarszczona powierzchnia', tip: '' },
                { text: 'Lekki dyskomfort przy jedzeniu', tip: '' },
            ],
            causes: [
                { text: 'Oparzenie termiczne (gorąca pizza, kawa)', tip: '' },
                { text: 'Podrażnienie ostrym jedzeniem (chipsy, grzanki)', tip: '' },
                { text: 'Torus palatinus (kostny zgrubienie — wariant normy)', tip: '' },
                { text: 'Podrażnienie od protezy górnej', tip: '' },
            ],
            advice: 'Oparzenie podniebienia to najczęstsza przyczyna — goi się w 7-10 dni. Unikaj gorących pokarmów. Torus palatinus (twarde zgrubienie na środku) to wariant normy i nie wymaga leczenia.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się zmiany na podniebieniu — do oceny.',
            symptoms: [
                { text: 'Guzek lub obrzęk na podniebieniu trwający >2 tygodnie', tip: '' },
                { text: 'Bolesne owrzodzenie utrudniające jedzenie', tip: '' },
                { text: 'Zmiana barwy śluzówki (biała, czerwona, fioletowa)', tip: '' },
                { text: 'Krwawienie przy dotyku', tip: '' },
                { text: 'Uczucie ciała obcego na podniebieniu', tip: '' },
            ],
            causes: [
                { text: 'Ropień podniebienny (z zęba górnego)', tip: '' },
                { text: 'Pleomorficzny gruczolak (guz ślinianki mniejszej)', tip: '' },
                { text: 'Liszaj płaski podniebienia', tip: '' },
                { text: 'Martwicze zapalenie jamy ustnej', tip: '' },
                { text: 'Naczyniak (hemangioma)', tip: '' },
            ],
            advice: 'Guzek na podniebieniu, który nie ustępuje po 2-3 tygodniach, powinien być zbadany przez stomatologa. Podniebienie jest częstym miejscem guzów gruczołów ślinowych (większość jest łagodna, ale wymaga potwierdzenia).',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Narastający guzek lub rozległy ropień — pilna wizyta.',
            symptoms: [
                { text: 'Szybko rosnący guzek na podniebieniu', tip: '' },
                { text: 'Silny ból uniemożliwiający jedzenie i picie', tip: '' },
                { text: 'Obrzęk podniebienia z asymetrią', tip: '' },
                { text: 'Owrzodzenie z drążącą martwicą', tip: '' },
                { text: 'Krwotok z podniebienia', tip: '' },
                { text: 'Uczucie „pełności" w jednym nozdrzu', tip: '' },
            ],
            causes: [
                { text: 'Nowotwór złośliwy gruczołów ślinowych mniejszych', tip: '' },
                { text: 'Rak płaskonabłonkowy podniebienia', tip: '' },
                { text: 'Ropień podniebienny z penetracją do zatoki', tip: '' },
                { text: 'Martwicze zapalenie podniebienia (nekrotyzujące)', tip: '' },
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
                { text: 'Drapanie lub suchość w gardle', tip: '' },
                { text: 'Lekki ból przy przełykaniu', tip: '' },
                { text: 'Uczucie ciała obcego', tip: '' },
                { text: 'Chrząkanie lub konieczność odchrząkiwania', tip: '' },
            ],
            causes: [
                { text: 'Przeziębienie lub infekcja wirusowa', tip: '' },
                { text: 'Refluks żołądkowy (GERD) podrażniający gardło', tip: '' },
                { text: 'Suchość jamy ustnej (oddychanie przez usta podczas snu)', tip: '' },
                { text: 'Ściekanie wydzieliny po tylnej ścianie gardła', tip: '' },
            ],
            advice: 'Pieczenie i suchość gardła najczęściej ma przyczynę wirusową lub wynika z refluksu. Płucz gardło słoną wodą. Jeśli trwa >2 tygodnie — warto wykluczyć refluks i skonsultować się z lekarzem.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się objawy gardłowe — mogą mieć związek z zębami.',
            symptoms: [
                { text: 'Ból gardła trwający >2 tygodnie bez poprawy', tip: '' },
                { text: 'Powiększone migdałki z kamicami (tonsilloliths)', tip: '' },
                { text: 'Ból promieniujący do ucha (jednostronny)', tip: '' },
                { text: 'Trudności z przełykaniem pokarmów stałych', tip: '' },
                { text: 'Przewlekły nieświeży oddech (halitoza)', tip: '' },
            ],
            causes: [
                { text: 'Kamienie migdałkowe (tonsilloliths — biały kamyczek w migdałku)', tip: '' },
                { text: 'Powikłanie od zainfekowanej ósemki (pericoronitis → gardło)', tip: '' },
                { text: 'Zapalenie tkanki łącznej przestrzeni przygardłowej', tip: '' },
                { text: 'Przewlekłe zapalenie migdałków', tip: '' },
            ],
            advice: 'Ból gardła promieniujący do ucha może pochodzić od zainfekowanych ósemek dolnych. Warto zrobić RTG panoramiczne zębów. Kamienie migdałkowe powodują halitosis — można je usunąć u laryngologa.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Zaawansowane',
            description: 'Poważne objawy wymagające pilnej diagnostyki.',
            symptoms: [
                { text: 'Silny ból gardła z gorączką >38°C', tip: '' },
                { text: 'Znaczny obrzęk szyi lub pod żuchwą', tip: '' },
                { text: 'Szczękościsk (trudności z otwarciem ust)', tip: '' },
                { text: 'Trudności z oddychaniem lub przełykaniem śliny', tip: '' },
                { text: 'Chrypiący głos trwający >3 tygodnie', tip: '' },
                { text: 'Jednostronny drętwienie języka lub podniebienia', tip: '' },
            ],
            causes: [
                { text: 'Ropień okołomigdałkowy (peritonsillar abscess)', tip: '' },
                { text: 'Ropień dna jamy ustnej z rozprzestrzenieniem na gardło', tip: '' },
                { text: 'Angina Ludwiga (zagrożenie życia!)', tip: '' },
                { text: 'Nowotwór gardła lub migdałków', tip: '' },
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
