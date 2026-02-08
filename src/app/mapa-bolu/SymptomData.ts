
// ─────────────────────────────────────────────────────────────
// SYMPTOM DATA — Multi-severity system
// Each zone has 3 severity levels: low, medium, high
// User can toggle between them in the detail modal
// ─────────────────────────────────────────────────────────────

export interface SeverityLevel {
    label: string;
    description: string;
    symptoms: string[];
    causes: string[];
    advice: string;
    urgency: 'low' | 'medium' | 'high';
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

// ─── TOOTH TYPE TEMPLATES ───

const INCISOR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort lub zmiana estetyczna, bez silnego bólu.',
            symptoms: [
                'Krótkotrwała nadwrażliwość na zimno lub słodycze',
                'Niewielkie przebarwienie lub zmiana koloru',
                'Lekki dyskomfort przy odgryzaniu twardych pokarmów',
                'Szorstka powierzchnia brzegu zęba',
            ],
            causes: [
                'Początkowa demineralizacja szkliwa (białe plamy)',
                'Płytka próchnica (na powierzchni)',
                'Cofanie się dziąsła odsłaniające szyjkę',
                'Uszkodzenia erozyjne (kwaśna dieta)',
            ],
            advice: 'Stosuj pastę z fluorem (min. 1450 ppm) i płukankę. Jeśli nadwrażliwość utrzymuje się ponad 2 tygodnie — umów wizytę kontrolną. Wczesna interwencja może uratować ząb bez rozległego leczenia.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból powtarzający się, wymagający diagnostyki.',
            symptoms: [
                'Ból spontaniczny, nasilający się wieczorem',
                'Przedłużona reakcja na ciepło/zimno (>30 sekund)',
                'Widoczny ubytek lub szczelina na powierzchni zęba',
                'Niewielki obrzęk lub zaczerwienienie dziąsła wokół zęba',
                'Kruszenie się brzegu zęba',
            ],
            causes: [
                'Próchnica średnio zaawansowana (sięgająca zębiny)',
                'Pęknięcie szkliwa (cracked enamel syndrome)',
                'Zapalenie miazgi odwracalne',
                'Uraz mechaniczny (np. po uderzeniu)',
            ],
            advice: 'Wymagana wizyta w ciągu 1–2 tygodni. Lekarz oceni głębokość ubytku i czy konieczne jest wypełnienie lub leczenie kanałowe. Nie czekaj — ten stan może się pogorszyć.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból wymagający pilnej interwencji.',
            symptoms: [
                'Silny, pulsujący ból trudny do zlokalizowania',
                'Ból budzący w nocy',
                'Obrzęk twarzy lub dziąsła',
                'Ząb zmienił kolor (szary/ciemny)',
                'Ropień lub przetoka (ropny pęcherzyk na dziąśle)',
                'Gorączka towarzysząca bólowi zęba',
            ],
            causes: [
                'Zapalenie miazgi nieodwracalne',
                'Martwica miazgi z infekcją',
                'Ropień okołowierzchołkowy',
                'Złamanie korzenia po urazie',
            ],
            advice: 'Pilna wizyta — najlepiej dziś lub jutro! Nieleczone zapalenie może doprowadzić do rozlanego zakażenia tkanek miękkich (ropowica). Do wizyty: leki przeciwbólowe (ibuprofen 400mg co 6h), zimny kompres na policzek.',
            urgency: 'high',
        },
    },
};

const CANINE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort, często związany z nawykowym zaciskaniem.',
            symptoms: [
                'Nadwrażliwość przy szyjce zęba (od strony dziąsła)',
                'Ścieranie wierzchołka kła',
                'Cofnięte dziąsło po jednej stronie',
                'Lekki dyskomfort przy gryzieniu',
            ],
            causes: [
                'Ubytki klinowe (nadmierne szczotkowanie)',
                'Bruksizm (zgrzytanie zębami) — ścieranie',
                'Recesja dziąsła odsłaniająca cement korzeniowy',
                'Początkowa próchnica szyjkowa',
            ],
            advice: 'Kły mają najdłuższe korzenie i są kluczowe dla prowadzenia zgryzu. Ścieranie sugeruje bruksizm — zapytaj o szynę relaksacyjną. Używaj szczoteczki o miękkim włosiu.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból promieniujący do oka lub nosa — wymaga diagnostyki.',
            symptoms: [
                'Ból promieniujący w stronę oka lub skrzydełka nosa',
                'Przedłużona nadwrażliwość na temperaturę',
                'Widoczny głęboki ubytek przy szyjce',
                'Ból przy nagryzaniu od boku',
                'Powiększony węzeł chłonny pod żuchwą',
            ],
            causes: [
                'Próchnica szyjkowa zaawansowana',
                'Zapalenie miazgi (odwracalne)',
                'Pęknięcie podłużne korzenia',
                'Zapalenie ozębnej (periodontitis apicalis)',
            ],
            advice: 'Ból promieniujący z kła jest charakterystyczny ze względu na jego anatomię (długi korzeń blisko zatoki). Umów wizytę — potrzebny RTG do oceny stanu korzenia.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub obrzęk — pilna interwencja.',
            symptoms: [
                'Intensywny ból pulsujący, trudny do kontrolowania lekami',
                'Obrzęk w okolicy podpoliczkowej',
                'Ropień na dziąśle w okolicy kła',
                'Ruchomość zęba',
                'Trudności z otwieraniem ust (szczękościsk)',
            ],
            causes: [
                'Ropień okołowierzchołkowy',
                'Martwica miazgi z rozległą infekcją',
                'Złamanie korzenia w wyniku urazu',
                'Zapalenie tkanek przyzębia (parodontoza zaawansowana)',
            ],
            advice: 'Pilna wizyta! Infekcja z kła górnego może się rozprzestrzeniać do oczodołu przez przestrzenie powięziowe. Do wizyty: ibuprofen 400mg + paracetamol 500mg, zimny kompres. Nie stosuj gorących okładów!',
            urgency: 'high',
        },
    },
};

const PREMOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Sporadyczny dyskomfort, najczęściej przy żuciu.',
            symptoms: [
                'Lekki ból przy gryzieniu twardego jedzenia',
                'Ubytek klinowy widoczny przy linii dziąsła',
                'Krótkotrwała nadwrażliwość na zimno',
                'Uczucie „coś się ciśnie" przy żuciu',
            ],
            causes: [
                'Nieszczelne wypełnienie (stare amalgamaty)',
                'Ubytki klinowe od nawykowego zaciskania',
                'Płytka próchnica na powierzchni stycznej (między zębami)',
                'Przeładowanie zgryzowe (przedwczesny kontakt)',
            ],
            advice: 'Przedtrzonowce często pękają od zaciskania zębów — zwłaszcza jednoguzkowe z dużymi plombami. Rozważ wymianę starych wypełnień na nakłady ceramiczne. Wizyta kontrolna w ciągu miesiąca.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból nasilający się przy żuciu — ryzyko pęknięcia.',
            symptoms: [
                'Ostry ból przy gryzieniu na konkretnym guzku',
                'Ból przy zwalnianiu uścisku (characteristic cracked tooth)',
                'Nadwrażliwość na ciepło trwająca >minutę',
                'Jedzenie utyka między zębami (nowe zjawisko)',
                'Pobolewanie po spożyciu gorących napojów',
            ],
            causes: [
                'Zespół pękniętego zęba (cracked tooth syndrome)',
                'Próchnica pod starym wypełnieniem (próchnica wtórna)',
                'Zapalenie miazgi odwracalne',
                'Utrata punktu kontaktowego (jedzenie wpada między zęby)',
            ],
            advice: 'Ból przy „puszczaniu" gryzu = klasyczny objaw pękniętego zęba. Wymaga pilnej diagnostyki pod mikroskopem. Umów wizytę w ciągu tygodnia — pęknięcie może się pogłębić.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub pęknięcie krytyczne.',
            symptoms: [
                'Ciągły, silny ból pulsujący',
                'Ząb ruchomy lub „unosi się" na dziąśle',
                'Obrzęk dziąsła z ropną wydzieliną',
                'Odłamanie ściany zęba przy gryzieniu',
                'Ból przy jakimkolwiek kontakcie z jedzeniem',
            ],
            causes: [
                'Pęknięcie pionowe sięgające korzenia (nieodwracalne)',
                'Ropień okołowierzchołkowy',
                'Martwica miazgi',
                'Złamanie zęba pod wypełnieniem',
            ],
            advice: 'Pilna wizyta! Jeśli pęknięcie sięga poniżej linii dziąsła — ząb może wymagać ekstrakcji i uzupełnienia implantem. Jeśli powyżej — korona protetyczna może go uratować. Im szybciej działamy, tym więcej opcji.',
            urgency: 'high',
        },
    },
};

const MOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort, najczęściej problem z higieną.',
            symptoms: [
                'Jedzenie wchodzi między zęby (food impaction)',
                'Lekki ból przy gryzieniu twardego jedzenia',
                'Nadwrażliwość na zimno w okolicy zęba',
                'Krwawienie dziąsła przy myciu/nitkowaniu',
            ],
            causes: [
                'Nieszczelne wypełnienie — utrata punktu kontaktowego',
                'Początkowa próchnica na powierzchni żującej (bruzdy)',
                'Zapalenie dziąsła (gingivitis) z powodu słabej higieny',
                'Starcie wypełnienia wymagające wymiany',
            ],
            advice: 'Trzonowce mają głębokie bruzdy, gdzie łatwo gromadzi się płytka. Używaj nici lub szczoteczek międzyzębowych codziennie. Wizyta kontrolna z przeglądem wypełnień co 6 miesięcy.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Ból nasilający się, możliwe zapalenie miazgi.',
            symptoms: [
                'Głęboki ból pulsujący, nasilający się wieczorem',
                'Przedłużona reakcja na ciepło (>1 minuty)',
                'Ból promieniujący do ucha lub skroni',
                'Trudność z żuciem po jednej stronie',
                'Ciemne przebarwienie na powierzchni żującej',
            ],
            causes: [
                'Próchnica głęboka sięgająca zębiny lub blisko miazgi',
                'Zapalenie miazgi odwracalne (reversible pulpitis)',
                'Próchnica wtórna pod koroną lub dużym wypełnieniem',
                'Pęknięcie guzka (cusp fracture)',
            ],
            advice: 'Ból reagujący na ciepło to sygnał ostrzegawczy — miazga może być w stanie zapalnym. Umów wizytę w ciągu tygodnia. Lekarz oceni czy wystarczy głębokie wypełnienie czy potrzebne leczenie kanałowe.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Silny ból lub ropień — konieczna pilna interwencja.',
            symptoms: [
                'Silny, nieustający ból pulsujący',
                'Ból budzący w nocy, nie reagujący na leki',
                'Obrzęk policzka lub pod żuchwą',
                'Gorączka, złe samopoczucie',
                'Ropna wydzielina z dziąsła lub przetoka',
                'Ząb „wyrósł" — ból przy zamykaniu ust',
            ],
            causes: [
                'Zapalenie miazgi nieodwracalne (irreversible pulpitis)',
                'Ropień okołowierzchołkowy lub przyzębny',
                'Martwica miazgi z infekcją okołowierzchołkową',
                'Zaostrzenie przewlekłego stanu zapalnego',
            ],
            advice: 'Pilna wizyta — ten sam lub następny dzień! Trzonowce mają 3-4 kanały, więc leczenie kanałowe jest złożone, ale ratuje ząb. Do wizyty: ibuprofen 400mg + paracetamol 500mg naprzemiennie co 3h. Nie gryź na tę stronę.',
            urgency: 'high',
        },
    },
};

const WISDOM_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Niewielki dyskomfort, typowy dla wyrzynającego się zęba.',
            symptoms: [
                'Nacisk lub uczucie „pchania" w tylnej części łuku',
                'Lekki obrzęk dziąsła za ostatnim zębem',
                'Dyskomfort przy szeroko otwieraniu ust',
                'Lekki ból nasilający się przy jedzeniu',
            ],
            causes: [
                'Aktywne wyrzynanie ósemki (pericoronitis lekki)',
                'Zaczynająca się próchnica na niedostępnej powierzchni',
                'Ucisk na sąsiedni ząb (siódemkę)',
                'Kapturek dziąsłowy gromadzący resztki jedzenia',
            ],
            advice: 'Płucz roztworem soli (łyżeczka na szklankę ciepłej wody) 3x dziennie. Jeśli ósemka jest krzywa na RTG — rozważ profilaktyczną ekstrakcję. Łatwiej usuwać zanim zacznie boleć.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Zapalenie dziąsła wokół ósemki — wymaga leczenia.',
            symptoms: [
                'Ból pulsujący w tylnej części szczęki',
                'Obrzęk i zaczerwienienie dziąsła nad ósemką',
                'Trudności z otwieraniem ust (szczękościsk częściowy)',
                'Ból promieniujący do ucha',
                'Nieprzyjemny smak lub zapach z okolicy zęba',
            ],
            causes: [
                'Zapalenie okołokoronowe (pericoronitis)',
                'Próchnica na powierzchni stycznej z siódemką',
                'Częściowo wyrżnięta ósemka — retencja pokarmów',
                'Torbiel zawiązkowa (dentigerous cyst)',
            ],
            advice: 'Zapalenie wokół ósemki (pericoronitis) to częsty problem. Umów wizytę w ciągu tygodnia — lekarz oceni na RTG panoramicznym czy ząb ma szansę prawidłowo wyrżnąć czy wymaga ekstrakcji.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Ropień lub silne zapalenie — wymaga ekstrakcji.',
            symptoms: [
                'Silny ból uniemożliwiający jedzenie',
                'Znaczny obrzęk policzka lub pod żuchwą',
                'Szczękościsk (ledwo otwierasz usta)',
                'Gorączka >38°C',
                'Trudności z przełykaniem',
                'Ropna wydzielina z dziąsła za ostatnim zębem',
            ],
            causes: [
                'Ropień okołokoronowy (pericoronitis z ropniem)',
                'Infekcja rozprzestrzeniająca się na przestrzenie powięziowe',
                'Resorpcja korzenia siódemki przez naciskającą ósemkę',
                'Złamanie żuchwy w linii ósemki (rzadko)',
            ],
            advice: 'Pilna wizyta chirurga stomatologa! Infekcja od dolnych ósemek może zejść do przestrzeni podżuchwowej i szyjnej — to zagrożenie życia (angina Ludwiga). Antybiotyk + ekstrakcja w trybie pilnym.',
            urgency: 'high',
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
                'Lekkie pieczenie końca języka',
                'Biały lub żółtawy nalot na grzbiecie języka',
                'Powiększone brodawki niciowate',
                'Wrażliwość na ostre przyprawy',
            ],
            causes: [
                'Język geograficzny (glossitis migrans) — łagodny stan',
                'Suchość jamy ustnej (oddychanie przez usta)',
                'Niedobór witamin z grupy B',
                'Reakcja na pastę do zębów (SLS — laurylosiarczan sodu)',
            ],
            advice: 'Stosuj płukankę bez alkoholu, pij dużo wody, unikaj bardzo gorących napojów. Język geograficzny jest stanem łagodnym — nie wymaga leczenia. Jeśli nalot utrzymuje się >2 tygodnie, pokaż lekarzowi.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się zmiany wymagające diagnostyki.',
            symptoms: [
                'Uporczywe pieczenie całego języka (burning mouth)',
                'Białe lub czerwone plamy, które nie schodzą przy pocieraniu',
                'Bolesne owrzodzenie trwające >10 dni',
                'Uczucie „falistego" brzegu języka (odciski zębów)',
                'Utrata smaku lub metaliczny posmak',
            ],
            causes: [
                'Leukoplakia (zmiana przedrakowa — biała plama)',
                'Liszaj płaski (lichen planus)',
                'Kandydoza jamy ustnej (grzybica — Candida)',
                'Zespół pieczenia jamy ustnej (BMS)',
                'Podrażnienie ostrą krawędzią zęba lub protezy',
            ],
            advice: 'Biała lub czerwona plama na języku, która nie znika po 2 tygodniach, wymaga wizyty i ewentualnej biopsji. To ważne dla wczesnego wykluczenia zmian przednowotworowych.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Zmiana budząca poważne obawy — pilna diagnostyka.',
            symptoms: [
                'Niebolesne owrzodzenie na boku języka trwające >3 tygodnie',
                'Stwardnienie lub guzek wyczuwalny w języku',
                'Krwawienie z niewielkiej zmiany na języku',
                'Powiększone węzły chłonne szyjne',
                'Trudności z mową lub ruchomością języka',
                'Znaczna utrata masy ciała',
            ],
            causes: [
                'Rak płaskonabłonkowy jamy ustnej (SCC)',
                'Zmiana przednowotworowa zaawansowana',
                'Ropień dna jamy ustnej',
                'Ranula (torbiel śluzowa) — duży rozmiar',
            ],
            advice: 'PILNE! Niebolesne owrzodzenie na boku języka trwające >3 tygodnie to klasyczny objaw wymagający pilnej biopsji. Skontaktuj się z lekarzem niezwłocznie — wczesne wykrycie = pełne wyleczenie.',
            urgency: 'high',
        },
    },
};

const PALATE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Podrażnienie lub drobne uszkodzenie podniebienia.',
            symptoms: [
                'Pieczenie po gorącym jedzeniu lub piciu',
                'Drobne otarcie lub skaleczenie',
                'Szorstka/pomarszczona powierzchnia',
                'Lekki dyskomfort przy jedzeniu',
            ],
            causes: [
                'Oparzenie termiczne (gorąca pizza, kawa)',
                'Podrażnienie ostrym jedzeniem (chipsy, grzanki)',
                'Torus palatinus (kostny zgrubienie — wariant normy)',
                'Podrażnienie od protezy górnej',
            ],
            advice: 'Oparzenie podniebienia to najczęstsza przyczyna — goi się w 7-10 dni. Unikaj gorących pokarmów. Torus palatinus (twarde zgrubienie na środku) to wariant normy i nie wymaga leczenia.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się zmiany na podniebieniu — do oceny.',
            symptoms: [
                'Guzek lub obrzęk na podniebieniu trwający >2 tygodnie',
                'Bolesne owrzodzenie utrudniające jedzenie',
                'Zmiana barwy śluzówki (biała, czerwona, fioletowa)',
                'Krwawienie przy dotyku',
                'Uczucie ciała obcego na podniebieniu',
            ],
            causes: [
                'Ropień podniebienny (z zęba górnego)',
                'Pleomorficzny gruczolak (guz ślinianki mniejszej)',
                'Liszaj płaski podniebienia',
                'Martwicze zapalenie jamy ustnej',
                'Naczyniak (hemangioma)',
            ],
            advice: 'Guzek na podniebieniu, który nie ustępuje po 2-3 tygodniach, powinien być zbadany przez stomatologa. Podniebienie jest częstym miejscem guzów gruczołów ślinowych (większość jest łagodna, ale wymaga potwierdzenia).',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Narastający guzek lub rozległy ropień — pilna wizyta.',
            symptoms: [
                'Szybko rosnący guzek na podniebieniu',
                'Silny ból uniemożliwiający jedzenie i picie',
                'Obrzęk podniebienia z asymetrią',
                'Owrzodzenie z drążącą martwicą',
                'Krwotok z podniebienia',
                'Uczucie „pełności" w jednym nozdrzu',
            ],
            causes: [
                'Nowotwór złośliwy gruczołów ślinowych mniejszych',
                'Rak płaskonabłonkowy podniebienia',
                'Ropień podniebienny z penetracją do zatoki',
                'Martwicze zapalenie podniebienia (nekrotyzujące)',
            ],
            advice: 'PILNE! Szybko rosnący guz na podniebieniu wymaga natychmiastowej biopsji. Podniebienie jest trzecim co do częstości miejscem nowotworów jamy ustnej. Skontaktuj się z kliniką chirurgii szczękowo-twarzowej.',
            urgency: 'high',
        },
    },
};

const THROAT_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Łagodne',
            description: 'Drapanie lub dyskomfort w gardle.',
            symptoms: [
                'Drapanie lub suchość w gardle',
                'Lekki ból przy przełykaniu',
                'Uczucie ciała obcego',
                'Chrząkanie lub konieczność odchrząkiwania',
            ],
            causes: [
                'Przeziębienie lub infekcja wirusowa',
                'Refluks żołądkowy (GERD) podrażniający gardło',
                'Suchość jamy ustnej (oddychanie przez usta podczas snu)',
                'Ściekanie wydzieliny po tylnej ścianie gardła',
            ],
            advice: 'Pieczenie i suchość gardła najczęściej ma przyczynę wirusową lub wynika z refluksu. Płucz gardło słoną wodą. Jeśli trwa >2 tygodnie — warto wykluczyć refluks i skonsultować się z lekarzem.',
            urgency: 'low',
        },
        medium: {
            label: 'Umiarkowane',
            description: 'Utrzymujące się objawy gardłowe — mogą mieć związek z zębami.',
            symptoms: [
                'Ból gardła trwający >2 tygodnie bez poprawy',
                'Powiększone migdałki z kamicami (tonsilloliths)',
                'Ból promieniujący do ucha (jednostronny)',
                'Trudności z przełykaniem pokarmów stałych',
                'Przewlekły nieświeży oddech (halitoza)',
            ],
            causes: [
                'Kamienie migdałkowe (tonsilloliths — biały kamyczek w migdałku)',
                'Powikłanie od zainfekowanej ósemki (pericoronitis → gardło)',
                'Zapalenie tkanki łącznej przestrzeni przygardłowej',
                'Przewlekłe zapalenie migdałków',
            ],
            advice: 'Ból gardła promieniujący do ucha może pochodzić od zainfekowanych ósemek dolnych. Warto zrobić RTG panoramiczne zębów. Kamienie migdałkowe powodują halitosis — można je usunąć u laryngologa.',
            urgency: 'medium',
        },
        high: {
            label: 'Zaawansowane',
            description: 'Poważne objawy wymagające pilnej diagnostyki.',
            symptoms: [
                'Silny ból gardła z gorączką >38°C',
                'Znaczny obrzęk szyi lub pod żuchwą',
                'Szczękościsk (trudności z otwarciem ust)',
                'Trudności z oddychaniem lub przełykaniem śliny',
                'Chrypiący głos trwający >3 tygodnie',
                'Jednostronny drętwienie języka lub podniebienia',
            ],
            causes: [
                'Ropień okołomigdałkowy (peritonsillar abscess)',
                'Ropień dna jamy ustnej z rozprzestrzenieniem na gardło',
                'Angina Ludwiga (zagrożenie życia!)',
                'Nowotwór gardła lub migdałków',
            ],
            advice: 'PILNE — SOR lub pogotowie! Trudności z oddychaniem lub przełykaniem śliny + obrzęk szyi wymagają natychmiastowej interwencji. Angina Ludwiga to zagrożenie życia. Nie czekaj do rana!',
            urgency: 'high',
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
