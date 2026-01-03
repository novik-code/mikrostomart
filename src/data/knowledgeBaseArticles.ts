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
        id: 'kb-1',
        title: 'Implanty Zębowe: Kompendium Wiedzy dla Pacjenta',
        slug: 'implanty-zebowe-kompendium',
        date: '2024-06-20',
        excerpt: 'Czym dokładnie jest implant? Czy tytan jest bezpieczny? Poznaj budowę i mechanikę działania nowoczesnych implantów stomatologicznych.',
        content: `
### Co to jest implant stomatologiczny?

Implant stomatologiczny to niewielka, precyzyjna śruba wykonana z **tytanu** lub cyrkonu, która zastępuje korzeń utraconego zęba. Jest on wszczepiany bezpośrednio w kość szczęki lub żuchwy, gdzie z czasem ulega procesowi **osteointegracji**, czyli trwałego zrośnięcia się z tkanką kostną.

#### Budowa Implanta

Cały system implantologiczny składa się z trzech głównych elementów:
*   **Śruba (Implant właściwy)**: Część niewidoczna, tkwiąca w kości. Zastępuje korzeń.
*   **Łącznik (Abutment)**: Element łączący implant z koroną.
*   **Korona protetyczna**: Widoczna część zęba (to, co widzimy w uśmiechu).

### Dlaczego Tytan?

Tytan jest metalem całkowicie **biokompatybilnym**. Oznacza to, że organizm ludzki nie traktuje go jako ciała obcego i nie odrzuca go. Co więcej, tytan posiada unikalną zdolność do tworzenia chemicznego wiązania z kością, co gwarantuje niezwykłą stabilność.

#### Zalety Implantów:

*   **Ochrona kości**: Zapobiegają zanikowi kości, który następuje po utracie zęba (brak obciążenia powoduje resorpcję).
*   **Ochrona sąsiednich zębów**: Nie ma potrzeby szlifowania zdrowych zębów sąsiednich (jak w przypadku mostów).
*   **Estetyka i Funkcja**: Implanty wyglądają i funkcjonują identycznie jak naturalne zęby. Siła żucia jest przywrócona w 100%.

Decyzja o wszczepieniu implantu to inwestycja w zdrowie całej jamy ustnej na lata.
`,
        image: '/kb-implant-structure.png'
    },
    {
        id: 'kb-2',
        title: 'Przebieg Zabiegu Implantacji: Krok po Kroku',
        slug: 'przebieg-zabiegu-implantacji',
        date: '2024-06-18',
        excerpt: 'Od konsultacji, przez zabieg chirurgiczny, aż po odsłonięcie implantu. Przeprowadzimy Cię przez każdy etap leczenia.',
        content: `
### Etap 1: Diagnostyka i Planowanie

Kluczem do sukcesu jest precyzyjna diagnostyka. W Mikrostomart zawsze zaczynamy od wykonania **Tomografii Komputerowej (CBCT)**. Pozwala ona nam ocenić ilość i jakość kości w trójwymiarze. Planujemy pozycję implantu z dokładnością do ułamka milimetra.

### Etap 2: Zabieg Chirurgiczny

Sam zabieg wszczepienia implantu jest całkowicie **bezbolesny**, wykonywany w znieczuleniu miejscowym (takim samym jak do leczenia próchnicy). Procedura trwa zazwyczaj od 20 do 40 minut.
*   Lekarz przygotowuje łoże pod implant w kości.
*   Wprowadza implant.
*   Zaszywa dziąsło.

Pacjent otrzymuje zalecenia pozabiegowe, antybiotyk oraz środki przeciwbólowe.

### Etap 3: Osteointegracja

To czas gojenia. Trwa on zazwyczaj:
*   **3-4 miesiące** w żuchwie (kość dolna).
*   **5-6 miesięcy** w szczęce (kość górna).

W tym czasie komórki kostne "obrastają" implant, stabilizując go na stałe.

### Etap 4: Odsłonięcie i Protetyka

Po zagojeniu, implant jest odsłaniany i zakłada się na niego tzw. śrubę gojącą, która kształtuje dziąsło. Po ok. 2 tygodniach pobierany jest wycisk (lub skan cyfrowy) i laboratorium wykonuje ostateczną koronę ceramiczną.
Pacjent wychodzi z nowym, pięknym zębem.
`,
        image: '/kb-implant-procedure.png'
    },
    {
        id: 'kb-3',
        title: 'Regeneracja Kości i Sterowana Regeneracja Tkanek',
        slug: 'regeneracja-kosci-implanty',
        date: '2024-06-15',
        excerpt: 'Masz "za mało kości" na implant? To nie wyrok. Wyjaśniamy, na czym polegają zabiegi augmentacji i Sinus Lift.',
        content: `
### Kiedy kości jest za mało?

Po utracie zęba kość, która go otaczała, zaczyna zanikać (atrofia). Jeśli od ekstrakcji minęło dużo czasu, może okazać się, że ilość kości jest niewystarczająca do stabilnego utrzymania implantu. Wtedy z pomocą przychodzi **Sterowana Regeneracja Kości (GBR)**.

#### Na czym to polega?

Zabieg polega na uzupełnieniu brakującej tkanki specjalnym **biomateriałem** (substytutem kości). Jest to granulat, który miesza się często z własną kością pacjenta lub osoczem bogatopłytkowym.
Całość pokrywa się specjalną membraną zaporową, która chroni regenerowaną okolicę.

### Podniesienie Dna Zatoki (Sinus Lift)

W bocznych odcinkach szczęki (górne trzonowce) często brakuje miejsca na implant z powodu nisko schodzącej zatoki szczękowej.
Zabieg **Sinus Lift** polega na delikatnym uniesieniu błony wyściełającej zatokę i wprowadzeniu pod nią materiału kościozastępczego.

*   **Metoda otwarta**: Dostęp z boku szczęki (przy dużych brakach).
*   **Metoda zamknięta**: Dostęp przez otwór na implant (przy mniejszych brakach).

Dzięki tym zabiegom, leczenie implantologiczne jest możliwe niemal u każdego pacjenta, nawet w trudnych warunkach anatomicznych.
`,
        image: '/kb-bone-regeneration.png'
    }
];
