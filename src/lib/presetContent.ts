// =====================================================================
// presetContent.ts — Unique demo content per theme preset
// Each preset represents a different fictional dental clinic
// =====================================================================

export interface PresetContent {
    clinicName: string;
    tagline: string;
    hero: {
        label: string;
        title1: string;
        title2: string;
        description: string;
    };
    stats: { number: string; label: string }[];
    services: { icon: string; title: string; desc: string }[];
    team: { name: string; role: string; initials: string; emoji: string }[];
    philosophy: { title: string; desc: string; number: string }[];
    testimonials: { quote: string; name: string; treatment: string }[];
    faqs: { q: string; a: string }[];
    contact: { address: string; phone: string; email: string; hours: string };
    about: {
        tagline: string;
        title: string;
        titleItalic: string;
        intro: string;
        mission: string;
        values: { title: string; desc: string }[];
    };
    blogPosts: { title: string; excerpt: string; date: string; category: string }[];
    metamorphosesIntro: string;
    gallery: { emoji: string; label: string }[];
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT (fallback — used when no preset-specific content)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONTENT: PresetContent = {
    clinicName: 'Klinika Demo',
    tagline: 'Nowoczesna Stomatologia',
    hero: {
        label: 'System zarządzania gabinetem',
        title1: 'Nowoczesna',
        title2: 'stomatologia',
        description: 'Odkryj DensFlow — kompleksowy system do zarządzania gabinetem stomatologicznym. Rezerwacje online, panel pacjenta, zarządzanie zespołem i automatyzacja.',
    },
    stats: [
        { number: '500+', label: 'Zadowolonych pacjentów' },
        { number: '10', label: 'Lat doświadczenia' },
        { number: '95%', label: 'Pozytywnych opinii' },
        { number: '8', label: 'Specjalistów' },
    ],
    services: [
        { icon: '🦷', title: 'Stomatologia zachowawcza', desc: 'Leczenie próchnicy, wypełnienia, endodoncja' },
        { icon: '✨', title: 'Stomatologia estetyczna', desc: 'Licówki, bonding, wybielanie zębów' },
        { icon: '🔧', title: 'Implantologia', desc: 'Implanty zębowe, odbudowa uzębienia' },
        { icon: '😁', title: 'Ortodoncja', desc: 'Invisalign, aparaty stałe i ruchome' },
        { icon: '🏥', title: 'Chirurgia stomatologiczna', desc: 'Ekstrakcje, zabiegi chirurgiczne' },
        { icon: '🛡️', title: 'Profilaktyka', desc: 'Higiena, scaling, fluoryzacja' },
    ],
    team: [
        { name: 'Dr Anna Kowalska', role: 'Stomatologia estetyczna', initials: 'AK', emoji: '👩‍⚕️' },
        { name: 'Dr Jan Nowak', role: 'Implantologia', initials: 'JN', emoji: '👨‍⚕️' },
        { name: 'Dr Maria Wiśniewska', role: 'Ortodoncja', initials: 'MW', emoji: '👩‍⚕️' },
        { name: 'Dr Piotr Zieliński', role: 'Chirurgia', initials: 'PZ', emoji: '👨‍⚕️' },
    ],
    philosophy: [
        { title: 'Bezbolesne leczenie', desc: 'Stosujemy najnowocześniejsze metody znieczulenia i sedacji. Komfort pacjenta jest naszym priorytetem.', number: '01' },
        { title: 'Indywidualne podejście', desc: 'Każdy pacjent jest wyjątkowy. Plan leczenia dopasowany do Twoich potrzeb i oczekiwań.', number: '02' },
        { title: 'Nowoczesna technologia', desc: 'Skaner 3D, mikroskop, nawigacja chirurgiczna — pracujemy z najlepszą technologią.', number: '03' },
    ],
    testimonials: [
        { quote: 'Pierwszy raz w życiu nie bałam się wizyty u dentysty. Atmosfera i efekty na najwyższym poziomie.', name: 'Katarzyna M.', treatment: 'Licówki porcelanowe' },
        { quote: 'Po latach kompleksów w końcu mogę się uśmiechać. Metamorfoza zmieniła moje życie.', name: 'Marcin W.', treatment: 'Metamorfoza uśmiechu' },
        { quote: 'Profesjonalizm i cierpliwość na każdym etapie. Efekty przerosły moje oczekiwania.', name: 'Agnieszka K.', treatment: 'Invisalign' },
    ],
    faqs: [
        { q: 'Jak umówić się na wizytę?', a: 'Możesz zarezerwować wizytę online przez formularz, zadzwonić lub napisać.' },
        { q: 'Czy przyjmujecie pilne przypadki?', a: 'Tak, staramy się przyjmować pacjentów z ostrym bólem w dniu zgłoszenia.' },
        { q: 'Jakie metody płatności?', a: 'Akceptujemy gotówkę, karty, BLIK oraz oferujemy płatności ratalne.' },
        { q: 'Czy oferujecie znieczulenie?', a: 'Tak, wszystkie zabiegi mogą być wykonane w znieczuleniu. Oferujemy też sedację.' },
        { q: 'Ile kosztuje pierwsza wizyta?', a: 'Pierwsza konsultacja jest wyceniana indywidualnie. Skontaktuj się po szczegóły.' },
    ],
    contact: {
        address: 'ul. Przykładowa 12, 00-000 Miasto',
        phone: '+48 123 456 789',
        email: 'kontakt@gabinet.pl',
        hours: 'Pon-Pt: 8:00-20:00, Sob: 9:00-14:00',
    },
    about: {
        tagline: 'O nas',
        title: 'Twój gabinet',
        titleItalic: 'stomatologiczny',
        intro: 'Nowoczesny gabinet stomatologiczny oferujący kompleksową opiekę nad zdrowiem jamy ustnej.',
        mission: 'Naszą misją jest zapewnienie najwyższej jakości usług stomatologicznych w komfortowej atmosferze.',
        values: [
            { title: 'Precyzja', desc: 'Każdy zabieg wykonujemy z najwyższą dbałością o detale.' },
            { title: 'Komfort', desc: 'Tworzymy atmosferę, w której czujesz się bezpiecznie i komfortowo.' },
            { title: 'Innowacja', desc: 'Korzystamy z najnowszych technologii i metod leczenia.' },
        ],
    },
    blogPosts: [
        { title: 'Jak dbać o zęby na co dzień?', excerpt: 'Praktyczne porady dotyczące codziennej higieny jamy ustnej.', date: '2025-01-15', category: 'Profilaktyka' },
        { title: 'Czym są licówki porcelanowe?', excerpt: 'Wszystko co musisz wiedzieć o licówkach — rodzaje, procedura, efekty.', date: '2025-02-10', category: 'Estetyka' },
        { title: 'Implanty zębowe — FAQ', excerpt: 'Odpowiadamy na najczęstsze pytania dotyczące implantów.', date: '2025-03-05', category: 'Implantologia' },
    ],
    metamorphosesIntro: 'Zobacz spektakularne przemiany uśmiechów naszych pacjentów. Każda metamorfoza to historia odzyskanej pewności siebie.',
    gallery: [
        { emoji: '🏥', label: 'Recepcja' },
        { emoji: '💺', label: 'Gabinet' },
        { emoji: '🔬', label: 'Laboratorium' },
        { emoji: '🛋️', label: 'Poczekalnia' },
        { emoji: '🪥', label: 'Sterylizacja' },
        { emoji: '🌿', label: 'Relaks' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// DENSFLOW LIGHT — "Studio Perla" (LePerle-inspired boutique)
// ═══════════════════════════════════════════════════════════════

const DENSFLOW_LIGHT_CONTENT: PresetContent = {
    clinicName: 'Studio Perla',
    tagline: 'Stomatologia estetyczna',
    hero: {
        label: 'Stomatologia estetyczna',
        title1: 'Twoja droga do',
        title2: 'pięknego uśmiechu',
        description: 'Łączymy precyzję stomatologii z indywidualnym podejściem. Każdy uśmiech projektujemy z dbałością o naturalne piękno.',
    },
    stats: [
        { number: '527+', label: 'Metamorfoz uśmiechu' },
        { number: '15', label: 'Lat doświadczenia' },
        { number: '98%', label: 'Zadowolonych pacjentów' },
        { number: '12', label: 'Specjalistów w zespole' },
    ],
    services: [
        { icon: '✨', title: 'Metamorfozy uśmiechu', desc: 'Kompleksowe planowanie i realizacja nowego uśmiechu — od projektu cyfrowego po efekt końcowy.' },
        { icon: '💎', title: 'Licówki porcelanowe', desc: 'Ultra-cienkie licówki odtwarzające naturalną strukturę zęba. Trwałość i estetyka.' },
        { icon: '😁', title: 'Invisalign', desc: 'Niewidoczne nakładki prostujące zęby. Komfort i doskonałe efekty.' },
        { icon: '🔧', title: 'Implanty zębowe', desc: 'Najnowocześniejsze systemy implantologiczne z nawigacją 3D.' },
        { icon: '🌟', title: 'Wybielanie zębów', desc: 'Profesjonalne wybielanie z ochroną szkliwa. Natychmiastowy efekt.' },
        { icon: '👑', title: 'Protetyka cyfrowa', desc: 'Korony i mosty projektowane cyfrowo — idealnie dopasowane odbudowy.' },
    ],
    team: [
        { name: 'Dr Aleksandra Perłowska', role: 'Stomatologia estetyczna', initials: 'AP', emoji: '👩‍⚕️' },
        { name: 'Dr Tomasz Białecki', role: 'Implantologia i chirurgia', initials: 'TB', emoji: '👨‍⚕️' },
        { name: 'Dr Natalia Złotkowska', role: 'Ortodoncja i Invisalign', initials: 'NZ', emoji: '👩‍⚕️' },
        { name: 'Dr Kacper Jaśkiewicz', role: 'Endodoncja mikroskopowa', initials: 'KJ', emoji: '👨‍⚕️' },
    ],
    philosophy: [
        { title: 'Bezbolesne leczenie', desc: 'Stosujemy najnowocześniejsze metody znieczulenia i sedacji. Komfort pacjenta jest naszym priorytetem podczas każdego zabiegu.', number: '01' },
        { title: 'Indywidualne podejście', desc: 'Każdy pacjent jest wyjątkowy. Projektujemy plan leczenia dopasowany do Twoich potrzeb, oczekiwań i naturalnej anatomii uśmiechu.', number: '02' },
        { title: 'Nowoczesna technologia', desc: 'Skaner 3D, mikroskop endodontyczny, nawigacja chirurgiczna. Pracujemy z najlepszą technologią.', number: '03' },
    ],
    testimonials: [
        { quote: 'Pierwszy raz w życiu nie bałam się wizyty u dentysty. Atmosfera, podejście i efekty — wszystko na najwyższym poziomie.', name: 'Katarzyna M.', treatment: 'Licówki porcelanowe' },
        { quote: 'Po latach kompleksów w końcu mogę się uśmiechać bez skrępowania. Metamorfoza zmieniła moje życie.', name: 'Marcin W.', treatment: 'Metamorfoza uśmiechu' },
        { quote: 'Profesjonalizm i cierpliwość na każdym etapie leczenia. Efekty Invisalign przerosły moje oczekiwania.', name: 'Agnieszka K.', treatment: 'Invisalign' },
    ],
    faqs: [
        { q: 'Jak wygląda pierwsza konsultacja?', a: 'Podczas pierwszej wizyty przeprowadzamy diagnostykę, skan 3D i omawiamy plan leczenia.' },
        { q: 'Ile trwa metamorfoza uśmiechu?', a: 'Standardowa metamorfoza trwa 2-4 tygodnie, zależnie od zakresu prac.' },
        { q: 'Czy licówki wyglądają naturalnie?', a: 'Nasze licówki są indywidualnie projektowane, aby odwzorowywać naturalny kolor i kształt zębów.' },
        { q: 'Czy oferujecie finansowanie?', a: 'Tak, współpracujemy z instytucjami finansowymi, oferując dogodne raty 0%.' },
        { q: 'Jak długo utrzymują się efekty wybielania?', a: 'Profesjonalne wybielanie utrzymuje efekt przez 1-3 lata, zależnie od diety i higieny.' },
    ],
    contact: {
        address: 'ul. Elegancka 8, 60-100 Poznań',
        phone: '+48 512 345 678',
        email: 'recepcja@studioperla.pl',
        hours: 'Pon-Pt: 9:00-19:00, Sob: 10:00-14:00',
    },
    about: {
        tagline: 'O nas',
        title: 'Studio Perla',
        titleItalic: 'piękno w każdym detalu',
        intro: 'Studio Perla to butikowy gabinet stomatologiczny specjalizujący się w estetyce uśmiechu. Łączymy artyzm z precyzją nowoczesnej stomatologii.',
        mission: 'Wierzymy, że piękny uśmiech to nie luksus — to inwestycja w pewność siebie, która zmienia życie.',
        values: [
            { title: 'Artyzm', desc: 'Każdy uśmiech projektujemy jak dzieło sztuki, łącząc estetykę z funkcjonalnością.' },
            { title: 'Dyskrecja', desc: 'Butikowa atmosfera i pełna prywatność na każdym etapie leczenia.' },
            { title: 'Doskonałość', desc: 'Używamy wyłącznie najwyższej klasy materiałów i technologii.' },
        ],
    },
    blogPosts: [
        { title: 'Licówki porcelanowe vs. kompozytowe — co wybrać?', excerpt: 'Porównanie dwóch popularnych metod odbudowy estetycznej zębów.', date: '2025-02-20', category: 'Estetyka' },
        { title: 'Metamorfoza uśmiechu — jak to działa?', excerpt: 'Krok po kroku: od konsultacji po finałowy efekt Twojej przemiany.', date: '2025-01-15', category: 'Metamorfozy' },
        { title: 'Trend: Natural Look w stomatologii estetycznej', excerpt: 'Dlaczego naturalny wygląd to nowy standard pięknego uśmiechu.', date: '2025-03-10', category: 'Trendy' },
    ],
    metamorphosesIntro: 'Każda metamorfoza w Studio Perla to historia odzyskanej pewności siebie. Poznaj przemiany naszych pacjentów — od pierwszej konsultacji po finałowy uśmiech.',
    gallery: [
        { emoji: '🪞', label: 'Salon konsultacyjny' },
        { emoji: '💺', label: 'Gabinet zabiegowy' },
        { emoji: '☕', label: 'Strefa relaksu' },
        { emoji: '🖥️', label: 'Pracownia cyfrowa' },
        { emoji: '🌸', label: 'Lobby' },
        { emoji: '🎨', label: 'Studio DSD' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// DENTAL LUXE — "Prestige Dental Clinic" (NawrockiClinic-inspired)
// ═══════════════════════════════════════════════════════════════

const DENTAL_LUXE_CONTENT: PresetContent = {
    clinicName: 'Prestige Dental Clinic',
    tagline: 'Klinika Stomatologiczna Klasy Premium',
    hero: {
        label: 'Najpiękniejsza klinika w mieście',
        title1: 'Precyzja.',
        title2: 'Perfekcja.',
        description: 'Wielokrotnie nagradzana klinika stomatologiczna. Łączymy architekturę z medycyną, tworząc przestrzeń, w której sztuka spotyka naukę.',
    },
    stats: [
        { number: '2 500+', label: 'Wykonanych implantów' },
        { number: '20', label: 'Lat tradycji' },
        { number: '99.2%', label: 'Skuteczność zabiegów' },
        { number: '18', label: 'Lekarzy specjalistów' },
    ],
    services: [
        { icon: '🔬', title: 'Implantologia 3D', desc: 'Zabiegi implantologiczne z nawigacją chirurgiczną i planowaniem cyfrowym.' },
        { icon: '💎', title: 'All-on-4 / All-on-6', desc: 'Pełna odbudowa uzębienia na implantach w jeden dzień.' },
        { icon: '🎭', title: 'Stomatologia estetyczna', desc: 'Licówki, korony pełnoceramiczne, metamorfozy uśmiechu.' },
        { icon: '🔧', title: 'Mikrochirurgia', desc: 'Zabiegi chirurgiczne pod mikroskopem z maksymalną precyzją.' },
        { icon: '👑', title: 'Protetyka CAD/CAM', desc: 'Odbudowy protetyczne projektowane i frezowane cyfrowo w klinice.' },
        { icon: '🩺', title: 'Sedacja dożylna', desc: 'Leczenie w pełnym komforcie — zabiegi w sedacji dla wymagających pacjentów.' },
    ],
    team: [
        { name: 'Prof. dr hab. Michał Krakowski', role: 'Implantologia i chirurgia', initials: 'MK', emoji: '👨‍⚕️' },
        { name: 'Dr Izabela Szymczak', role: 'Stomatologia estetyczna', initials: 'IS', emoji: '👩‍⚕️' },
        { name: 'Dr Bartosz Weiss', role: 'Protetyka na implantach', initials: 'BW', emoji: '👨‍⚕️' },
        { name: 'Dr Karolina Majewska', role: 'Periodontologia', initials: 'KM', emoji: '👩‍⚕️' },
    ],
    philosophy: [
        { title: 'Architektura i medycyna', desc: 'Nasza klinika to przestrzeń zaprojektowana z myślą o komforcie i estetyce. Nagradzana architektura wnętrz tworzy atmosferę spokoju.', number: '01' },
        { title: 'Cyfrowa precyzja', desc: 'Tomografia CBCT, skaner wewnątrzustny, drukarka 3D, nawigacja chirurgiczna — każdy zabieg planujemy cyfrowo z dokładnością do 0.1mm.', number: '02' },
        { title: 'Multidyscyplinarność', desc: '18 specjalistów pod jednym dachem: implantolodzy, protetyki, periodontolodzy, ortodonci. Kompleksowa opieka bez kompromisów.', number: '03' },
    ],
    testimonials: [
        { quote: 'Klinika na światowym poziomie. Architektura wnętrz robi wrażenie, ale to profesjonalizm zespołu jest najważniejszy. All-on-4 zmienił moje życie.', name: 'Andrzej K.', treatment: 'All-on-4' },
        { quote: 'Szukałem najlepszego implantologa w Polsce. Znalazłem. Perfekcyjna precyzja i zero bólu dzięki sedacji.', name: 'Robert M.', treatment: 'Implanty zygomatyczne' },
        { quote: 'Po 20 latach wstydu za swój uśmiech, dziś z dumą pokazuję zęby. Metamorfoza totalnie zmieniła moje podejście do życia.', name: 'Magdalena S.', treatment: 'Metamorfoza uśmiechu' },
    ],
    faqs: [
        { q: 'Czy wykonujecie zabiegi w sedacji?', a: 'Tak, oferujemy sedację dożylną prowadzoną przez anestezjologa. Idealne dla pacjentów z dentofobią.' },
        { q: 'Ile kosztują implanty?', a: 'Cena implantu z koroną zaczyna się od 5 500 PLN. Dokładną wycenę otrzymasz po konsultacji z tomografią 3D.' },
        { q: 'Czy można odbudować cały łuk na implantach?', a: 'Tak, metoda All-on-4 pozwala odbudować pełne uzębienie na 4-6 implantach w jeden dzień.' },
        { q: 'Jakie gwarancje oferujecie?', a: 'Dajemy 10-letnią gwarancję na implanty i 5-letnią na prace protetyczne.' },
        { q: 'Czy przyjmujecie pacjentów z zagranicy?', a: 'Tak, mamy doświadczenie w obsłudze pacjentów z UK, Niemiec i Skandynawii. Zapewniamy tłumacza.' },
    ],
    contact: {
        address: 'al. Wielkopolska 42, 80-200 Gdańsk',
        phone: '+48 58 620 4000',
        email: 'recepcja@prestigedental.pl',
        hours: 'Pon-Pt: 8:00-20:00, Sob: 9:00-16:00',
    },
    about: {
        tagline: 'O klinice',
        title: 'Prestige Dental',
        titleItalic: 'gdzie sztuka spotyka naukę',
        intro: 'Prestige Dental Clinic to wielokrotnie nagradzana klinika stomatologiczna w sercu Gdańska. Nasze wnętrza zostały zaprojektowane przez renomowane studio architektoniczne, tworząc przestrzeń, która redefiniuje doświadczenie pacjenta.',
        mission: 'Dążymy do perfekcji w każdym aspekcie — od architektury po precyzję zabiegów. Każdy pacjent zasługuje na leczenie na najwyższym światowym poziomie.',
        values: [
            { title: 'Perfekcja', desc: 'Nie akceptujemy kompromisów. Każdy zabieg wykonujemy z chirurgiczną precyzją.' },
            { title: 'Innowacja', desc: 'Inwestujemy w najnowsze technologie: CBCT, skanery 3D, nawigację chirurgiczną.' },
            { title: 'Prestiż', desc: 'Tworzymy doświadczenie na poziomie premium — od pierwszego kontaktu po follow-up.' },
        ],
    },
    blogPosts: [
        { title: 'All-on-4 — nowe zęby w jeden dzień', excerpt: 'Innowacyjna metoda odbudowy pełnego uzębienia na czterech implantach.', date: '2025-03-01', category: 'Implantologia' },
        { title: 'Nasza klinika w rankingu TOP 10', excerpt: 'Prestige Dental Clinic wyróżniona w ogólnopolskim rankingu klinik stomatologicznych.', date: '2025-02-15', category: 'Aktualności' },
        { title: 'Sedacja dożylna — leczenie bez stresu', excerpt: 'Jak nowoczesna sedacja zmienia podejście pacjentów do wizyt u dentysty.', date: '2025-01-20', category: 'Komfort' },
    ],
    metamorphosesIntro: 'Nasze metamorfozy to efekt pracy multidyscyplinarnego zespołu 18 specjalistów. Każdy przypadek planujemy cyfrowo z precyzją do 0.1mm.',
    gallery: [
        { emoji: '🏛️', label: 'Hol główny' },
        { emoji: '💺', label: 'Sala zabiegowa' },
        { emoji: '🖥️', label: 'Centrum diagnostyczne' },
        { emoji: '☕', label: 'Lounge VIP' },
        { emoji: '🔬', label: 'Laboratorium' },
        { emoji: '🏆', label: 'Sala konferencyjna' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// FRESH SMILE — "Centrum Uśmiechu" (AmbasadaUsmiechu-inspired)
// ═══════════════════════════════════════════════════════════════

const FRESH_SMILE_CONTENT: PresetContent = {
    clinicName: 'Centrum Uśmiechu',
    tagline: 'Twój przyjazny dentysta',
    hero: {
        label: 'Stomatologia rodzinna i estetyczna',
        title1: 'Zdrowy uśmiech',
        title2: 'dla całej rodziny',
        description: 'Nowoczesna klinika stomatologiczna, w której każdy pacjent — od najmłodszego po najstarszego — czuje się jak w domu. Bez bólu, bez stresu.',
    },
    stats: [
        { number: '3 200+', label: 'Stałych pacjentów' },
        { number: '12', label: 'Lat w Opolu' },
        { number: '4.9/5', label: 'Ocena na Google' },
        { number: '6', label: 'Gabinetów zabiegowych' },
    ],
    services: [
        { icon: '👶', title: 'Stomatologia dziecięca', desc: 'Cierpliwe podejście do najmłodszych pacjentów. Wizyta adaptacyjna gratis.' },
        { icon: '🛡️', title: 'Profilaktyka i higiena', desc: 'Profesjonalne czyszczenie, scaling, lakowanie, fluoryzacja.' },
        { icon: '🦷', title: 'Leczenie zachowawcze', desc: 'Bezbolesne leczenie próchnicy, nowoczesne wypełnienia estetyczne.' },
        { icon: '✨', title: 'Estetyka uśmiechu', desc: 'Wybielanie, bonding kompozytowy, korekta kształtu zębów.' },
        { icon: '🔧', title: 'Implanty zębowe', desc: 'Sprawdzone systemy implantologiczne z gwarancją.' },
        { icon: '😁', title: 'Ortodoncja', desc: 'Aparaty stałe, ruchome i nakładki Invisalign dla dzieci i dorosłych.' },
    ],
    team: [
        { name: 'Dr Joanna Wiśniak', role: 'Stomatologia rodzinna', initials: 'JW', emoji: '👩‍⚕️' },
        { name: 'Dr Marek Olszewski', role: 'Implantologia', initials: 'MO', emoji: '👨‍⚕️' },
        { name: 'Dr Ewa Stankiewicz', role: 'Stomatologia dziecięca', initials: 'ES', emoji: '👩‍⚕️' },
        { name: 'Dr Filip Grabowski', role: 'Ortodoncja', initials: 'FG', emoji: '👨‍⚕️' },
    ],
    philosophy: [
        { title: 'Bez bólu', desc: 'Stosujemy znieczulenie komputerowe The Wand® — pacjenci nie czują ukłucia igły. Idealnie dla osób z dentofobią.', number: '01' },
        { title: 'Edukacja pacjenta', desc: 'Wierzymy, że świadomy pacjent to zdrowy pacjent. Prowadzimy blog ekspercki i warsztaty profilaktyczne.', number: '02' },
        { title: 'Dostępność', desc: 'Otwieramy o 7:00, przyjmujemy w soboty, oferujemy wizyty pilne tego samego dnia. Być blisko pacjenta.', number: '03' },
    ],
    testimonials: [
        { quote: 'Moja córka bała się dentysty, a teraz prosi, żeby znów tam iść! Pani doktor Ewa to czarodziejka.', name: 'Anna R.', treatment: 'Stomatologia dziecięca' },
        { quote: 'Wreszcie gabinet, który traktuje pacjenta po ludzku. Bez pośpiechu, z cierpliwością i uśmiechem.', name: 'Paweł D.', treatment: 'Leczenie kanałowe' },
        { quote: 'Korzystam od 8 lat całą rodziną. Nigdzie indziej nie chcemy chodzić.', name: 'Monika i Tomek', treatment: 'Profilaktyka rodzinna' },
    ],
    faqs: [
        { q: 'Od jakiego wieku przyjmujecie dzieci?', a: 'Pierwsza wizyta adaptacyjna może odbyć się już od 1. roku życia. Regularne wizyty od 3. roku.' },
        { q: 'Czy macie wizyty pilne?', a: 'Tak, każdego dnia rezerwujemy godziny na pilne przypadki. Zadzwoń rano — przyjmiemy tego samego dnia.' },
        { q: 'Czy mogę umówić całą rodzinę na jeden dzień?', a: 'Oczywiście! Chętnie umawiamy wizyty rodzinne — jedno po drugim, żeby zaoszczędzić Twój czas.' },
        { q: 'Czy oferujecie program lojalnościowy?', a: 'Tak, nasi stali pacjenci korzystają z pakietów profilaktycznych i rabatów na zabiegi estetyczne.' },
        { q: 'Jak dojechać do kliniki?', a: 'Jesteśmy w centrum Opola z parkingiem na 20 miejsc. Dojedziesz też tramwajem (przystanek Centrum).' },
    ],
    contact: {
        address: 'ul. Krakowska 15, 45-080 Opole',
        phone: '+48 77 454 3210',
        email: 'rejestracja@centrumusmiechu.pl',
        hours: 'Pon-Pt: 7:00-20:00, Sob: 8:00-14:00',
    },
    about: {
        tagline: 'O nas',
        title: 'Centrum Uśmiechu',
        titleItalic: 'gabinet z duszą',
        intro: 'Centrum Uśmiechu to przyjazna klinika stomatologiczna w sercu Opola, w której od 12 lat opiekujemy się całymi rodzinami. U nas nie ma pośpiechu — jest za to cierpliwość, empatia i profesjonalizm.',
        mission: 'Zdrowy uśmiech to nie tylko piękne zęby — to pewność siebie, lepsze samopoczucie i radość z życia. Dlatego stawiamy na profilaktykę i edukację.',
        values: [
            { title: 'Empatia', desc: 'Słuchamy, rozumiemy i dopasowujemy leczenie do Twoich potrzeb i obaw.' },
            { title: 'Dostępność', desc: 'Otwieramy wcześnie, przyjmujemy pilne przypadki, nie każemy czekać.' },
            { title: 'Rodzinność', desc: 'Opiekujemy się pacjentami od 1 roku życia do sędziwej starości.' },
        ],
    },
    blogPosts: [
        { title: '10 rzeczy, które warto wiedzieć przed wizytą u dentysty', excerpt: 'Bezpłatny poradnik dla naszych pacjentów — jak przygotować się do wizyty.', date: '2025-03-15', category: 'Poradnik' },
        { title: 'Jak nauczyć dziecko mycia zębów?', excerpt: 'Praktyczne wskazówki od naszej specjalistki od stomatologii dziecięcej.', date: '2025-02-28', category: 'Dzieci' },
        { title: 'Fluoryzacja — kiedy, jak i dlaczego?', excerpt: 'Wszystko o fluoryzacji zębów u dzieci i dorosłych.', date: '2025-01-10', category: 'Profilaktyka' },
    ],
    metamorphosesIntro: 'Nasze metamorfozy to dowód, że piękny uśmiech zmienia życie. Każdy przypadek to historia pacjenta, który odzyskał pewność siebie.',
    gallery: [
        { emoji: '🌈', label: 'Poczekalnia dziecięca' },
        { emoji: '💺', label: 'Gabinet zabiegowy' },
        { emoji: '🧸', label: 'Kącik zabaw' },
        { emoji: '🏥', label: 'Recepcja' },
        { emoji: '🖥️', label: 'RTG cyfrowe' },
        { emoji: '🌿', label: 'Patio' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// NORDIC DENTAL — "Atelier Dent" (OneandonlyClinic-inspired)
// ═══════════════════════════════════════════════════════════════

const NORDIC_DENTAL_CONTENT: PresetContent = {
    clinicName: 'Atelier Dent',
    tagline: 'Z troską o każdy detal',
    hero: {
        label: 'Butikowa klinika stomatologiczna',
        title1: 'Z troską',
        title2: 'o każdy detal',
        description: 'Kameralny gabinet, w którym czas płynie wolniej. Łączymy spokój z precyzją, tworząc przestrzeń, w której dbamy o Twój uśmiech z pełną uwagą.',
    },
    stats: [
        { number: '340+', label: 'Metamorfoz' },
        { number: '8', label: 'Lat praktyki' },
        { number: '100%', label: 'Uwagi poświęconej Tobie' },
        { number: '4', label: 'Specjalistów' },
    ],
    services: [
        { icon: '✨', title: 'Estetyka uśmiechu', desc: 'Licówki, bonding, korekta uśmiechu — naturalne piękno w harmonii z Twoją twarzą.' },
        { icon: '🔬', title: 'Endodoncja mikroskopowa', desc: 'Leczenie kanałowe pod mikroskopem — ratujemy zęby, które inni chcą usunąć.' },
        { icon: '🦷', title: 'Stomatologia holistyczna', desc: 'Podejście całościowe — zdrowie jamy ustnej w kontekście całego organizmu.' },
        { icon: '🔧', title: 'Implanty ceramiczne', desc: 'Biokompatybilne implanty z cyrkonu — metal-free dla wymagających.' },
        { icon: '🌿', title: 'Profilaktyka świadoma', desc: 'Nauka prawidłowej higieny, diagnostyka mikrobiologiczna, programy indywidualne.' },
        { icon: '🧘', title: 'Leczenie w relaksacji', desc: 'Aromaterapia, muzyka relaksacyjna, poduszki grzewcze — zabieg w komforcie spa.' },
    ],
    team: [
        { name: 'Dr Marta Sosnowska', role: 'Stomatologia estetyczna i holistyczna', initials: 'MS', emoji: '👩‍⚕️' },
        { name: 'Dr Jakub Leśniewski', role: 'Endodoncja mikroskopowa', initials: 'JL', emoji: '👨‍⚕️' },
        { name: 'Dr Oliwia Kamińska', role: 'Implantologia ceramiczna', initials: 'OK', emoji: '👩‍⚕️' },
        { name: 'Mgr Zuza Kwiatkowska', role: 'Higienistka stomatologiczna', initials: 'ZK', emoji: '👩‍⚕️' },
    ],
    philosophy: [
        { title: 'Slow dentistry', desc: 'Nie spieszmy się. Każdemu pacjentowi poświęcamy minimum 60 minut — bez pośpiechu, z pełną uwagą.', number: '01' },
        { title: 'Biokompatybilność', desc: 'Preferujemy materiały bezmetalowe: cyrkon, ceramika, kompozyty bio. Twoje zdrowie jest priorytetem.', number: '02' },
        { title: 'Harmonia', desc: 'Nasz gabinet to przestrzeń spokoju — naturalne materiały, stonowane kolory, aromaterapia i cisza.', number: '03' },
    ],
    testimonials: [
        { quote: 'Jak wizyta w spa, a nie u dentysty. Pierwszy raz wyszłam z gabinetu naprawdę zrelaksowana.', name: 'Klaudia B.', treatment: 'Profilaktyka holistyczna' },
        { quote: 'Dr Leśniewski uratował ząb, który dwóch innych dentystów chciało wyrwać. Mikroskop robi różnicę.', name: 'Tomasz R.', treatment: 'Endodoncja mikroskopowa' },
        { quote: 'Wybrałam implanty ceramiczne ze względu na uczulenie na metale. Efekt jest piękny i naturalny.', name: 'Beata L.', treatment: 'Implanty ceramiczne' },
    ],
    faqs: [
        { q: 'Czym jest stomatologia holistyczna?', a: 'To podejście łączące zdrowie jamy ustnej z ogólnym zdrowiem organizmu. Analizujemy nawyki żywieniowe, stres i jego wpływ na zęby.' },
        { q: 'Czy implanty ceramiczne są trwałe?', a: 'Tak, implanty z cyrkonu mają porównywalną trwałość do tytanowych, z dodatkową zaletą pełnej biokompatybilności.' },
        { q: 'Dlaczego wizyty trwają tak długo?', a: 'Wierzymy w slow dentistry — poświęcamy czas na diagnostykę, edukację i precyzyjne wykonanie zabiegu.' },
        { q: 'Czy stosujecie amalgamat?', a: 'Nie. Pracujemy wyłącznie z materiałami bezrtęciowymi i biokompatybilnymi.' },
        { q: 'Czy mogę przyjść z dzieckiem?', a: 'Oczywiście. Mamy dedykowany kącik dla dzieci i cierpliwe podejście do najmłodszych.' },
    ],
    contact: {
        address: 'ul. Ogrodowa 22/3, 50-100 Wrocław',
        phone: '+48 71 380 2200',
        email: 'hello@atelierdent.pl',
        hours: 'Pon-Pt: 9:00-18:00 (tylko na umówienie)',
    },
    about: {
        tagline: 'O nas',
        title: 'Atelier Dent',
        titleItalic: 'stomatologia w rytmie slow',
        intro: 'Atelier Dent to kameralny gabinet stomatologiczny we Wrocławiu, w którym czas biegnie wolniej. Przyjmujemy niewielką liczbę pacjentów dziennie, poświęcając każdemu pełną uwagę.',
        mission: 'Wierzymy, że zdrowy uśmiech zaczyna się od harmonii — ciała, umysłu i otoczenia. Dlatego nasze wnętrza to naturalne drewno, stonowane kolory i cisza.',
        values: [
            { title: 'Uważność', desc: 'Każdemu pacjentowi poświęcamy minimum godzinę. Słuchamy, diagnozujemy, planujemy.' },
            { title: 'Naturalność', desc: 'Preferujemy materiały bio i metody zachowawcze. Chronimy naturalną strukturę zęba.' },
            { title: 'Spokój', desc: 'Nasz gabinet to azyl — aromaterapia, muzyka, naturalne światło.' },
        ],
    },
    blogPosts: [
        { title: 'Czym jest slow dentistry?', excerpt: 'Filozofia leczenia bez pośpiechu — jak zmienia doświadczenie pacjenta.', date: '2025-03-20', category: 'Filozofia' },
        { title: 'Implanty ceramiczne vs. tytanowe', excerpt: 'Porównanie dwóch systemów implantologicznych dla świadomych pacjentów.', date: '2025-02-05', category: 'Implantologia' },
        { title: 'Stres a stan zębów — co mówi nauka?', excerpt: 'Jak codzienny stres wpływa na zgryz, dziąsła i bruksizm.', date: '2025-01-25', category: 'Holistyka' },
    ],
    metamorphosesIntro: 'Każda metamorfoza w Atelier Dent to praca z uwagą i szacunkiem dla naturalnej anatomii uśmiechu. Nie zmieniamy — podkreślamy to, co piękne.',
    gallery: [
        { emoji: '🌿', label: 'Hol z ogródkiem' },
        { emoji: '🪵', label: 'Gabinet z drewna' },
        { emoji: '🕯️', label: 'Strefa relaksu' },
        { emoji: '🔬', label: 'Sala mikroskopowa' },
        { emoji: '☕', label: 'Herbaciarnia' },
        { emoji: '🎋', label: 'Patio zen' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// WARM CARE — "Rodzinny Gabinet Stomatologiczny" (MalottkiClinic-inspired)
// ═══════════════════════════════════════════════════════════════

const WARM_CARE_CONTENT: PresetContent = {
    clinicName: 'Gabinet Uśmiech i Zdrowie',
    tagline: 'Ciepło. Troska. Profesjonalizm.',
    hero: {
        label: 'Gabinet stomatologiczny z sercem',
        title1: 'Twój uśmiech,',
        title2: 'nasza pasja',
        description: 'Rodzinny gabinet stomatologiczny, w którym od ponad dekady dbamy o zdrowie i piękno uśmiechów. Ciepła atmosfera, doświadczony zespół.',
    },
    stats: [
        { number: '4 800+', label: 'Pacjentów pod opieką' },
        { number: '14', label: 'Lat doświadczenia' },
        { number: '4.8/5', label: 'Ocena na ZnanyLekarz' },
        { number: '10', label: 'Osób w zespole' },
    ],
    services: [
        { icon: '🦷', title: 'Stomatologia zachowawcza', desc: 'Leczenie próchnicy, nowoczesne wypełnienia, odbudowa zębów.' },
        { icon: '🔧', title: 'Implantologia', desc: 'Sprawdzone systemy implantologiczne Straumann i MIS.' },
        { icon: '✨', title: 'Stomatologia estetyczna', desc: 'Wybielanie, licówki, bonding — piękny uśmiech bez inwazyjnych zabiegów.' },
        { icon: '👶', title: 'Stomatologia dziecięca', desc: 'Łagodne podejście do małych pacjentów. Leczenie w znieczuleniu komputerowym.' },
        { icon: '🏥', title: 'Chirurgia stomatologiczna', desc: 'Ekstrakcje, zabiegi na dziąsłach, resekcje wierzchołków.' },
        { icon: '😁', title: 'Ortodoncja', desc: 'Aparaty dla dzieci i dorosłych, Invisalign, retencja.' },
    ],
    team: [
        { name: 'Dr Agnieszka Michalak', role: 'Stomatologia zachowawcza i estetyczna', initials: 'AM', emoji: '👩‍⚕️' },
        { name: 'Dr Krzysztof Borkowski', role: 'Implantologia i chirurgia', initials: 'KB', emoji: '👨‍⚕️' },
        { name: 'Dr Paulina Wójcik', role: 'Stomatologia dziecięca', initials: 'PW', emoji: '👩‍⚕️' },
        { name: 'Dr Adam Rutkowski', role: 'Protetyka i endodoncja', initials: 'AR', emoji: '👨‍⚕️' },
    ],
    philosophy: [
        { title: 'Jak u siebie', desc: 'Tworzymy atmosferę, w której czujesz się jak gość, nie jak pacjent. Ciepłe wnętrza, kawa na przywitanie, zero pośpiechu.', number: '01' },
        { title: 'Uczciwa komunikacja', desc: 'Zawsze wyjaśniamy dokładnie co robimy i dlaczego. Żadnych ukrytych kosztów, żadnych niespodzianek.', number: '02' },
        { title: 'Wielopokoleniowa opieka', desc: 'Opiekujemy się całymi rodzinami — od maluszków po dziadków. Znamy Wasze historie i potrzeby.', number: '03' },
    ],
    testimonials: [
        { quote: 'Chodzę tu od 10 lat z całą rodziną. To nie jest gabinet — to nasz drugi dom. Pani doktor zna nas po imieniu.', name: 'Rodzina Kowalczyków', treatment: 'Opieka wielopokoleniowa' },
        { quote: 'Syn bał się dentysty po złych doświadczeniach. Tutaj pani Paulina zaprosiła go do zabawy i nie zauważył zabiegu.', name: 'Ewa M.', treatment: 'Stomatologia dziecięca' },
        { quote: 'Uczciwy cennik, bez niespodzianek. Doktor Borkowski wyjaśnił mi wszystko krok po kroku przed implantami.', name: 'Zbigniew T.', treatment: 'Implanty zębowe' },
    ],
    faqs: [
        { q: 'Czy przyjmujecie nowych pacjentów?', a: 'Tak! Zawsze mamy miejsce dla nowych pacjentów. Rejestracja jest prosta — online, telefonicznie lub osobiście.' },
        { q: 'Od jakiego wieku przyjmujecie dzieci?', a: 'Od 2. roku życia. Pierwsza wizyta to wizyta zapoznawcza — bezpłatna i bez zabiegu.' },
        { q: 'Czy jest parking?', a: 'Tak, mamy bezpłatny parking na 12 miejsc bezpośrednio przy gabinecie.' },
        { q: 'Jakie formy płatności akceptujecie?', a: 'Gotówka, karta, BLIK, przelew. Oferujemy też płatności ratalne na zabiegi powyżej 2000 PLN.' },
        { q: 'Jak szybko mogę umówić wizytę?', a: 'Standardowe terminy: 1-3 dni robocze. Pilne przypadki w dniu zgłoszenia.' },
    ],
    contact: {
        address: 'ul. Lipowa 28, 40-200 Katowice',
        phone: '+48 32 205 1100',
        email: 'rejestracja@usmiechizdrowie.pl',
        hours: 'Pon-Pt: 7:30-19:30, Sob: 8:00-13:00',
    },
    about: {
        tagline: 'O nas',
        title: 'Uśmiech i Zdrowie',
        titleItalic: 'gabinet z historią',
        intro: 'Gabinet Uśmiech i Zdrowie to rodzinna praktyka stomatologiczna w Katowicach, założona w 2011 roku. Od 14 lat opiekujemy się zdrowiem jamy ustnej tysięcy pacjentów — od niemowląt po seniorów.',
        mission: 'Wierzymy, że najlepsza stomatologia to ta, która łączy profesjonalizm z ludzkim podejściem. Dlatego tratujemy każdego pacjenta jak rodzinę.',
        values: [
            { title: 'Ciepło', desc: 'Tworzymy atmosferę, w której czujesz się bezpiecznie i komfortowo.' },
            { title: 'Uczciwość', desc: 'Przejrzyste ceny, jasna komunikacja, brak ukrytych kosztów.' },
            { title: 'Troska', desc: 'Pamiętamy o Tobie między wizytami — przypomnienia SMS, follow-up po zabiegach.' },
        ],
    },
    blogPosts: [
        { title: 'Kiedy zabrać dziecko do dentysty?', excerpt: 'Przewodnik dla rodziców — od pierwszego ząbka do ortodonty.', date: '2025-03-08', category: 'Rodzina' },
        { title: 'Bezbolesne znieczulenie — mit czy rzeczywistość?', excerpt: 'Jak komputerowe znieczulenie The Wand® zmienia wizytę u dentysty.', date: '2025-02-22', category: 'Komfort' },
        { title: 'Implanty — inwestycja na lata', excerpt: 'Dlaczego implant to lepsze rozwiązanie niż most i co warto wiedzieć przed zabiegiem.', date: '2025-01-30', category: 'Implantologia' },
    ],
    metamorphosesIntro: 'Każda metamorfoza w naszym gabinecie to historia konkretnego pacjenta — z jego obawami, marzeniami i radością, gdy widzi nowy uśmiech.',
    gallery: [
        { emoji: '🏠', label: 'Wejście' },
        { emoji: '☕', label: 'Poczekalnia z kawą' },
        { emoji: '💺', label: 'Gabinet' },
        { emoji: '🧸', label: 'Kącik dla dzieci' },
        { emoji: '🖥️', label: 'Panorama 3D' },
        { emoji: '🌻', label: 'Ogródek' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// CONTENT MAP + ACCESSOR
// ═══════════════════════════════════════════════════════════════

const PRESET_CONTENT_MAP: Record<string, PresetContent> = {
    'default-gold': DEFAULT_CONTENT,
    'densflow-light': DENSFLOW_LIGHT_CONTENT,
    'dental-luxe': DENTAL_LUXE_CONTENT,
    'fresh-smile': FRESH_SMILE_CONTENT,
    'nordic-dental': NORDIC_DENTAL_CONTENT,
    'warm-care': WARM_CARE_CONTENT,
};

/**
 * Get preset-specific content by preset ID.
 * Falls back to DEFAULT_CONTENT if preset not found.
 */
export function getPresetContent(presetId: string): PresetContent {
    return PRESET_CONTENT_MAP[presetId] || DEFAULT_CONTENT;
}

export { DEFAULT_CONTENT };
