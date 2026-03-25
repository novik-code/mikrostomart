import { demoSanitize } from '@/lib/brandConfig';
export interface Article {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string; // Markdown or HTML allowed
    date: string;
    image: string;
}

export const articles: Article[] = [
    {
        id: '320',
        title: 'ORTODONCJA NAKŁADKOWA w MIKROSTOMART',
        slug: 'ortodoncja-nakladkowa-w-mikrostomart',
        date: '2024-06-15',
        excerpt: 'Nowoczesne leczenie wad zgryzu za pomocą przezroczystych nakładek. Dyskrecja, wygoda i skuteczność w jednym.',
        content: `
### Nowoczesna Ortodoncja Nakładkowa

W MIKROSTOMART stawiamy na innowacyjne rozwiązania. Ortodoncja nakładkowa to nowoczesna metoda korygowania wad zgryzu, która stanowi doskonałą alternatywę dla tradycyjnych aparatów stałych.

#### Dlaczego warto wybrać nakładki?

*   **Dyskrecja**: Nakładki są niemal niewidoczne na zębach.
*   **Wygoda**: Możesz je zdejmować do jedzenia i mycia zębów.
*   **Higiena**: Łatwiejsze utrzymanie higieny jamy ustnej w porównaniu do aparatów stałych.
*   **Komfort**: Brak metalowych elementów, które mogą drażnić błonę śluzową.

Leczenie planowane jest cyfrowo, co pozwala na precyzyjne przewidzenie efektów końcowych jeszcze przed rozpoczęciem terapii. Zapraszamy na konsultację, aby sprawdzić, czy ta metoda jest odpowiednia dla Ciebie!
    `,
        image: '/images/articles/ortodoncja-nakladkowa.png'
    },
    {
        id: '319',
        title: 'Wybielanie na jednej wizycie?!',
        slug: '319-wybielanie-na-jednej-wizycie',
        date: '2024-05-20',
        excerpt: 'Marzysz o białym uśmiechu w godzinę? Sprawdź nasze metody bezpiecznego i skutecznego wybielania zębów.',
        content: `
### Wybielanie Zębów w Mikrostomart

Czy wiesz, że możesz odmienić swój uśmiech podczas jednej wizyty? Oferujemy profesjonalne wybielanie zębów, które jest bezpieczne dla szkliwa i daje natychmiastowe efekty.

Nasz gabinet korzysta z najnowocześniejszych systemów wybielających, które minimalizują nadwrażliwość i gwarantują długotrwały efekt.

Zapraszamy do kontaktu i umówienia się na wizytę higienizacyjną połączoną z konsultacją w sprawie wybielania!
`,
        image: '/images/articles/wybielanie-zebow.png'
    },
    {
        id: '314',
        title: 'METAMORFOZA - Nowy Uśmiech',
        slug: '314-metamorfoza-3',
        date: '2024-04-10',
        excerpt: 'Po prostu nowy, piękny uśmiech = +10 do wizerunku. W Mikrostomart nie ma trudnych przypadków.',
        content: `
### +10 do Wizerunku

Po prostu nowy, piękny uśmiech! W Mikrostomart nie ma trudnych przypadków. A może inaczej... Każdy trudny przypadek, który nas odwiedza, najpóźniej o 16.00 pięknie uśmiechnięty wraca do domu.

![Zdjęcie z zabiegu](/images/articles/real_cases/314-metamorfoza-3_0_1f642.png)

![Zdjęcie z zabiegu](/images/articles/real_cases/314-metamorfoza-3_1_11akowal.jpg)

W razie pytań - zapraszamy do kontaktu: +48 570 270 470
`,
        image: '/images/articles/metamorfoza-closeup.png'
    },
    {
        id: '313',
        title: 'METAMORFOZA - Kompleksowe Leczenie',
        slug: '313-metamorfoza-2',
        date: '2024-03-25',
        excerpt: 'Kolejny przypadek kompleksowego leczenia poprawiającego estetykę uśmiechu oraz funkcję narządu żucia.',
        content: `
### Metamorfoza Uśmiechu

Jeden z kolejnych przypadków metamorfoz i kompleksowego leczenia poprawiającego estetykę uśmiechu oraz funkcję narządu żucia wykonana przez zespół Mikrostomart.

![Zdjęcie z zabiegu](/images/articles/real_cases/313-metamorfoza-2_0_AmE.jpg)

**Czas leczenia:** 9 miesięcy.

Zakres prac obejmował:
*   Leczenie zachowawcze
*   Leczenie endodontyczne
*   Odbudowę kości
*   Implantologię
*   Przeszczepy dziąseł
*   Protetykę tymczasową i właściwą

Efekty mówią same za siebie!
`,
        image: '/images/articles/metamorfoza-profile.png'
    },
    {
        id: '312',
        title: 'Higienizacja u NAJMŁODSZYCH',
        slug: '312-higienizacja-u-najmlodszych',
        date: '2024-03-15',
        excerpt: 'Dlaczego profesjonalna higienizacja dzieci jest tak ważna? Dowiedz się, jak dbamy o zdrowie zębów naszych najmłodszych pacjentów.',
        content: `
### Higienizacja u Dzieci

Dlaczego jest potrzebna profesjonalna higienizacja dzieciom? Niedostateczna higiena od momentu pojawienia się zębów u dziecka wywołuje gromadzenie się miękkiej bakteryjnej płytki nazębnej i powstawanie kamienia nazębnego.

Prowadzi to do:
*   Próchnicy
*   Zapalenia dziąseł
*   Zapalenia jamy ustnej

Profesjonalna higienizacja jest potrzebna dla profilaktyki tych schorzeń oraz bardziej efektywnego leczenia chorób, jeżeli już są obecne.

#### Kiedy zacząć?

Rozpocząć domową higienę jamy ustnej należy jeszcze przed pojawieniem się pierwszego ząbka, a profesjonalną higienizację – po wyrżnięciu się pierwszych zębów. Nasza higienistka stomatologiczna nauczy prawidłowo szczotkować pierwsze ząbki dziecka, pomoże dobrać pastę i szczoteczkę.
`,
        image: '/images/articles/higienizacja-dzieci.png'
    },
    {
        id: '262',
        title: 'Skaner wewnątrzustny w naszym gabinecie',
        slug: '262-skaner-wewnatrzustny-w-naszym-gabinecie',
        date: '2023-11-20',
        excerpt: 'Zapomnij o nieprzyjemnych wyciskach. W Mikrostomart korzystamy z nowoczesnych skanerów wewnątrzustnych 3D.',
        content: `
### Komfort i Precyzja

W Mikrostomart chcemy aby wizyta była zarówno dobrze przeprowadzona pod kątem medycznym oraz możliwie jak najbardziej komfortowa dla pacjenta.

### Koniec z wyciskami!

Z tego też powodu od dawna korzystamy już ze skanera wewnątrzustnego. Także kochani, nie będziemy Was już więcej męczyć wyciskami (chyba, że będą wskazania medyczne ku temu).

Skaner wewnątrzustny jest to taka specjalna kamera, która przesyła od razu obraz do komputera, a my możemy zobaczyć jamę ustną pacjenta w technologii 3D. 

**Zalety:**
*   Szybkość
*   Komfort (brak mas wyciskowych)
*   Precyzja (dokładniejsze niż tradycyjne wyciski)
*   Wizualizacja efektu końcowego na ekranie

Stawiamy na precyzję i nowoczesność.
`,
        image: '/images/articles/skaner-wewnatrzustny.png'
    },
    {
        id: '311',
        title: 'METAMORFOZA - Rok po leczeniu',
        slug: '311-metamorfoza',
        date: '2024-02-10',
        excerpt: 'Sytuacja u naszego Pacjenta rok po zakończeniu leczenia kompleksowego daje wszystkim wiele powodów do uśmiechu.',
        content: `
### Trwałe Efekty

Sytuacja u naszego Pacjenta rok po zakończeniu leczenia kompleksowego daje wszystkim wiele powodów do uśmiechu 🙂

![Zdjęcie z zabiegu](/images/articles/real_cases/311-metamorfoza_1_metamorfoza11.jpg)

Regularne wizyty kontrolne i utrzymywanie higieny to klucz do długotrwałego sukcesu leczenia stomatologicznego.
`,
        image: '/images/articles/metamorphosis_radiant.png' // Unique generated image
    },
    {
        id: '308',
        title: 'Icon - leczenie próchnicy bez wiercenia!',
        slug: '308-icon-leczenie-prochnicy-wczesnej-bez-wiercenia-2',
        date: '2024-01-28',
        excerpt: 'Białe plamki na zębach? Poznaj metodę ICON - infiltrację próchnicy, która zatrzymuje zmiany bez użycia wiertła.',
        content: `
### Co na białe plamki?

Białe plamki na zębach mogą stanowić nie tylko problem estetyczny, ale bywają również przyczyną nadwrażliwości zębów i zwiększają ryzyko próchnicy.

**Przyczyny powstawania:**
*   Demineralizacja szkliwa (próchnica początkowa)
*   Długotrwałe leczenie ortodontyczne
*   Fluoroza

**Korzyści zabiegu ICON:**
*   Bardzo estetyczne rezultaty widoczne od razu
*   Zatrzymanie próchnicy we wczesnym etapie rozwoju
*   Przedłużenie życia zęba
*   Leczenie to tylko jedna wizyta
*   **Bez wiercenia i bez bólu!**
`,
        image: '/images/articles/icon-infiltration.png'
    },
    {
        id: '288',
        title: 'Regularna higienizacja to inwestycja!',
        slug: '288-regularna-higienizacja-to-inwestycja',
        date: '2023-10-15',
        excerpt: 'Dlaczego warto odwiedzać higienistkę co pół roku? To tańsze i przyjemniejsze niż leczenie zaawansowanej próchnicy.',
        content: `
### Inwestycja w Zdrowie

Optymalna częstotliwość poddawania się zabiegowi profesjonalnej higienizacji w gabinecie stomatologicznym to raz na pół roku.

Kamień nazębny, który zostaje usunięty podczas takiej procedury to zmineralizowana płytka nazębna. Nieusuwany kamień może prowadzić do stanów zapalnych dziąseł, recesji, a nawet paradontozy.

**Co obejmuje higienizacja?**
*   **Skaling**: usuwanie kamienia
*   **Piaskowanie**: usuwanie osadów i przebarwień
*   **Fluoryzacja**: wzmocnienie szkliwa
*   **Instruktaż**: nauka prawidłowego mycia zębów

Zapraszamy na wizytę do naszych dyplomowanych higienistek!
`,
        image: '/images/articles/dental-hygiene-tools.png'
    },
    {
        id: '266',
        title: 'Bruksizm - zgrzytanie zębami',
        slug: '266-bruksizm',
        date: '2023-09-05',
        excerpt: 'Bóle głowy, starte zęby, napięcie mięśni? To może być bruksizm. Dowiedz się, jak możemy Ci pomóc.',
        content: `
### Bruksizm: Więcej niż zgrzytanie

Termin określający patologiczne zaciskanie lub tarcie zębami żuchwy o zęby szczęki.

**Objawy:**
*   Bóle głowy
*   Ból w obrębie twarzy
*   Nadwrażliwość zębów
*   Uszkodzenie szkliwa

Jednym ze sposobów rozwiązania tego problemu jest **szyna relaksacyjna**, czyli przezroczysta nakładka wykonywana indywidualnie dla pacjenta. Pomaga ona rozluźnić mięśnie i chroni zęby przed ścieraniem.
`,
        image: '/images/articles/bruxism-guard.png'
    },
    {
        id: '303',
        title: 'Wypełnienia estetyczne',
        slug: '303-zawsze-sie-znajdzie-ktos-kto-zrobi-taniej',
        date: '2023-11-10',
        excerpt: 'Nowoczesne materiały kompozytowe pozwalają na idealne odwzorowanie naturalnego wyglądu zęba.',
        content: `
### Niewidoczne Wypełnienia

Przedstawiamy Wam jeden z efektów naszej pracy - wypełnienie kompozytowe wysoko estetyczne z podbarwionymi bruzdami dla uzyskania naturalnego efektu.

![Zdjęcie z zabiegu](/images/articles/real_cases/303-zawsze-sie-znajdzie-ktos-kto-zrobi-taniej_0_estetyczne.jpg)

Kompozyt stomatologiczny to materiał, który w rękach doświadczonego lekarza staje się niewidoczny. Kolorystyką, kształtem i fakturą nie różni się od naturalnego szkliwa zdrowej korony. Dzięki temu nikt nie zauważy, że ząb był leczony!
`,
        image: '/images/articles/composite-texture.png'
    },
    {
        id: '263',
        title: 'Zapomniany przyrząd: Czyścik do języka',
        slug: '263-higiena-jamy-ustnej',
        date: '2023-08-20',
        excerpt: 'Szczotkujesz zęby, nitkujesz... a co z językiem? To tam gromadzi się większość bakterii odpowiedzialnych za nieświeży oddech.',
        content: `
### Czyścik do Języka

Większość z nas zapomina o czyszczeniu języka! A to na nim gromadzi się większość bakterii.

Aby skutecznie oczyścić język, warto używać specjalnej skrobaczki lub czyścika.
*   Usuwa nalot bakteryjny
*   Zzapobiega halitozie (nieprzyjemnemu zapachowi)
*   Poprawia odczuwanie smaku

Czyszczenie języka powinno odbywać się tak często, jak szczotkowanie zębów – rano i wieczorem.
         `,
        image: '/images/articles/tongue-scraper.png'
    },
    {
        id: '267',
        title: 'Higiena przy implantach',
        slug: '267-higiena-jamy-ustnej-przy-implantach-zebowych',
        date: '2023-07-15',
        excerpt: 'Masz implanty? Dowiedz się, jak o nie dbać, aby służyły Ci przez całe życie. Specjalne nity, szczoteczki i irygatory.',
        content: `
### Jak dbać o implanty?

Jeśli masz implanty, musisz o nie dbać tak samo dobrze, jak o naturalne zęby, a nawet bardziej!

**Zasady higieny:**
*   Szczotkowanie min. dwa razy dziennie (szczoteczka soft)
*   Używanie nici dentystycznych (superfloss)
*   Stosowanie irygatora
*   Regularne wizyty kontrolne

Brak higieny może prowadzić do **periimplantitis** – stanu zapalnego wokół implantu, który może skutkować jego utratą.
        `,
        image: '/images/articles/implant-care.png'
    },
    {
        id: '284',
        title: 'Profilaktyka w ciąży',
        slug: '284-zacznij-profilaktyke-prochnicy-juz-w-okresie-ciazy',
        date: '2023-09-28',
        excerpt: 'Obalamy mity! Leczenie zębów w ciąży jest bezpieczne i konieczne dla zdrowia mamy i dziecka.',
        content: `
### Zdrowe Zęby, Zdrowe Dziecko

Okres ciąży to czas szczególny. W Polsce niestety wciąż pokutuje mit, że w ciąży nie leczy się zębów. To błąd!

Nieleczone stany zapalne w jamie ustnej mogą wpływać negatywnie na przebieg ciąży. Co więcej, próchnica jest chorobą zakaźną – matka może przekazać bakterie dziecku.

**Zalecenia dla przyszłych mam:**
*   Regularne wizyty kontrolne
*   Profesjonalna higienizacja (bezpieczna w ciąży)
*   Leczenie próchnicy (bezpieczne znieczulenia)
*   Dieta bogata w wapń i witaminy

Zapraszamy przyszłe mamy do Mikrostomart!
        `,
        image: '/images/articles/pregnancy-smile.png'
    }
];
