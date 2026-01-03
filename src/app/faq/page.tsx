"use client";

import { useState } from 'react';
import RevealOnScroll from "@/components/RevealOnScroll";
import { ChevronDown } from "lucide-react";

const FAQ_DATA = [
    {
        category: "Profilaktyka",
        items: [
            {
                q: "Dlaczego regularna higienizacja jest ważna?",
                a: "Higienizacja (skaling, piaskowanie) usuwa kamień i osad, których nie da się usunąć domowymi metodami. Zapobiega to chorobom dziąseł (paradontozie), próchnicy oraz nieświeżemu oddechowi. Zalecamy wizytę co 6 miesięcy."
            },
            {
                q: "Czym różni się skaling od piaskowania?",
                a: "Skaling to usuwanie twardego kamienia nazębnego za pomocą ultradźwięków. Piaskowanie to usuwanie miękkich osadów i przebarwień (np. z kawy, herbaty) za pomocą strumienia piasku pod ciśnieniem. Zabiegi te zazwyczaj wykonuje się razem."
            },
            {
                q: "Czy fluor jest bezpieczny?",
                a: "Tak, fluoryzacja przeprowadzana w gabinecie jest całkowicie bezpieczna i stanowi kluczowy element wzmacniania szkliwa. Używamy atestowanych preparatów o odpowiednim stężeniu, które chronią zęby przed próchnicą."
            },
            {
                q: "Jakie szczoteczki polecacie: soniczne czy elektryczne?",
                a: "Zdecydowanie polecamy szczoteczki soniczne. Są delikatniejsze dla dziąseł, a jednocześnie skuteczniej usuwają płytkę nazębną dzięki efektowi kawitacji (mikrobąbelków), który dociera w trudno dostępne miejsca."
            },
            {
                q: "Krwawią mi dziąsła podczas mycia. Co robić?",
                a: "Krwawienie to zazwyczaj pierwszy objaw stanu zapalnego (gingivitis) spowodowanego zaleganiem kamienia. Nie przestawaj szczotkować! Umów się na profesjonalną higienizację – usunięcie przyczyny zazwyczaj natychmiastowo rozwiązuje problem."
            }
        ]
    },
    {
        category: "Endodoncja Mikroskopowa",
        items: [
            {
                q: "Czy leczenie kanałowe boli?",
                a: "Współczesne leczenie kanałowe jest całkowicie bezbolesne. Stosujemy znieczulenie komputerowe (The Wand/SleeperOne), które eliminuje ból już na etapie podawania. Pacjenci często zasypiają w trakcie zabiegu!"
            },
            {
                q: "Dlaczego leczenie pod mikroskopem jest lepsze?",
                a: "Mikroskop (powiększenie do 25x) pozwala lekarzowi znaleźć wszystkie kanały (nawet te dodatkowe), precyzyjnie je oczyścić i wypełnić. Drastycznie zwiększa to szansę na uratowanie zęba, który w metodzie tradycyjnej mógłby zostać usunięty."
            },
            {
                q: "Ile wizyt zajmuje leczenie kanałowe?",
                a: "W Mikrostomart staramy się przeprowadzać leczenie kanałowe na jednej wizycie. Dzięki pracy pod mikroskopem i zaawansowanym narzędziom maszynowym jesteśmy w stanie wykonać cały zabieg precyzyjnie i sprawnie w ciągu 90-120 minut."
            },
            {
                q: "Ząb mnie nie boli, czy muszę go leczyć kanałowo?",
                a: "Ból nie jest jedynym wyznacznikiem. Często proces zapalny toczy się przewlekle w kości (tzw. ziarniniak) i jest widoczny tylko na zdjęciu RTG. Taki stan jest 'bombą zegarową' i ogniskiem infekcji dla całego organizmu, dlatego leczenie jest konieczne."
            },
            {
                q: "Co to jest powtórne leczenie kanałowe (Re-Endo)?",
                a: "To zabieg naprawczy, gdy pierwotne leczenie (często sprzed lat) okazało się nieskuteczne. Polega na usunięciu starego materiału, odnalezieniu pominiętych kanałów i ponownym, sterylnym ich wypełnieniu. Jest to trudniejszy zabieg, w którym specjalizujemy się w naszej klinice."
            }
        ]
    },
    {
        category: "Stomatologia Estetyczna",
        items: [
            {
                q: "Czym są licówki prostujące?",
                a: "Licówki to cieniutkie płatki (porcelanowe lub kompozytowe) naklejane na lico zęba. Korygują kształt, kolor i drobne nierówności. Umożliwiają osiągnięcie efektu 'Hollywood Smile' bez zakładania aparatu, jeśli wada jest niewielka."
            },
            {
                q: "Czy wybielanie zębów niszczy szkliwo?",
                a: "Nie, profesjonalne wybielanie przeprowadzone w gabinecie pod kontrolą higienistki jest bezpieczne. Stosujemy nowoczesne preparaty, które nie demineralizują szkliwa, a jedynie utleniają przebarwienia w jego strukturze."
            },
            {
                q: "Jak długo utrzymuje się efekt wybielania?",
                a: "Efekt zazwyczaj utrzymuje się od roku do 3 lat. Zależy to głównie od Twojej diety (kawa, wino, kurkuma) i nawyków (palenie). Regularna higienizacja pomaga podtrzymać efekt bieli."
            },
            {
                q: "Co to jest Bonding?",
                a: "Bonding to nieinwazyjna metoda poprawy estetyki zęba za pomocą żywicy kompozytowej. Wykonujemy go na jednej wizycie, bez szlifowania zębów. Idealny do zamknięcia diastemy (przerwy między zębami) lub naprawy ukruszonego brzegu."
            },
            {
                q: "Ile trwa zrobienie licówek porcelanowych?",
                a: "Proces zajmuje zazwyczaj 2-3 wizyty. Pierwsza to konsultacja i projektowanie (DSD). Druga to minimalna preparacja i skanowanie (bez wycisków!). Trzecia to cementowanie gotowych, pięknych licówek."
            }
        ]
    },
    {
        category: "Implantologia",
        items: [
            {
                q: "Czy implanty są dla każdego?",
                a: "Większość dorosłych pacjentów może mieć implanty. Przeciwwskazaniem mogą być niektóre nieustabilizowane choroby ogólnoustrojowe. Kluczowa jest ilość kości – jeśli jest jej za mało, wykonujemy zabiegi regeneracyjne."
            },
            {
                q: "Jak długo trwa zabieg i gojenie?",
                a: "Samo wprowadzenie implantu trwa zazwyczaj 30-40 minut i jest bezbolesne. Proces zrastania z kością (osteointegracja) trwa od 3 do 6 miesięcy, po czym montuje się koronę ostateczną."
            },
            {
                q: "Czy implant może się nie przyjąć?",
                a: "Skuteczność implantacji to ok. 98%. Odrzucenie implantu zdarza się niezwykle rzadko. Jeśli jednak do tego dojdzie (np. z powodu infekcji czy palenia papierosów), zazwyczaj po wygojeniu można ponowić zabieg."
            },
            {
                q: "Czy implant piszczy na bramkach na lotnisku?",
                a: "Absolutnie nie! Implanty wykonane są z tytanu lub cyrkonu, które są niemagnetyczne i nie wywołują alarmu w bramkach bezpieczeństwa. Możesz podróżować bez obaw."
            },
            {
                q: "Co to jest 'Implantacja Natychmiastowa'?",
                a: "To zabieg, w którym usuwamy zniszczony ząb i na tej samej wizycie wkręcamy w jego miejsce implant. Pozwala to zaoszczędzić czas (jeden zabieg, jedno znieczulenie) i zachować więcej kości i dziąsła."
            }
        ]
    },
    {
        category: "Protetyka",
        items: [
            {
                q: "Korona czy licówka - co wybrać?",
                a: "Licówka pokrywa tylko przednią część zęba (estetyka). Korona obejmuje cały ząb jak 'kapturek' (odbudowa i wzmocnienie). Decyzję podejmuje lekarz na podstawie stopnia zniszczenia zęba."
            },
            {
                q: "Czym są mosty bez szlifowania?",
                a: "To potoczna nazwa mostów adhezyjnych (na włóknie szklanym). Są rozwiązaniem tymczasowym lub długoczasowym, które pozwala uzupełnić brak zęba bez mocnego szlifowania sąsiadów."
            },
            {
                q: "Z czego robicie korony?",
                a: "Stawiamy na najwyższą estetykę i trwałość, dlatego stosujemy głównie korony pełnoceramiczne (E.max) oraz cyrkonowe. Nie powodują one 'sinienia' dziąsła (jak stare korony na metalu) i są nie do odróżnienia od naturalnego zęba."
            },
            {
                q: "Jak wygląda proces robienia korony?",
                a: "Dzięki cyfrowemu skanerowi nie musimy robić nieprzyjemnych wycisków masą. Skanujemy zęby kamerą 3D, a projekt wysyłamy do laboratorium. Gotową koronę cementujemy zazwyczaj po 5-7 dniach roboczych."
            }
        ]
    },
    {
        category: "Ortodoncja",
        items: [
            {
                q: "Jak działają nakładki Clear Correct?",
                a: "To zestaw przezroczystych szyn, które wymieniasz co 1-2 tygodnie. Każda kolejna nakładka delikatnie przesuwa zęby na właściwą pozycję. Są wyjmowane do jedzenia i mycia, co zapewnia higienę i komfort."
            },
            {
                q: "Czy prostowanie zębów boli?",
                a: "W przypadku nakładek (alignerów) ból jest minimalny – pacjenci opisują go raczej jako 'uczucie ucisku' przez 1-2 dni po założeniu nowej pary nakładek. Jest to nieporównywalnie mniejszy dyskomfort niż przy stałym aparacie metalowym."
            },
            {
                q: "Jak długo trwa leczenie ortodontyczne?",
                a: "Leczenie nakładkowe jest zazwyczaj krótsze niż tradycyjne. Średni czas to 6-18 miesięcy, w zależności od wady. Już na pierwszej wizycie pokażemy Ci symulację 3D i powiemy dokładnie, ile potrwa Twoje leczenie."
            },
            {
                q: "Czy po zdjęciu aparatu zęby nie wrócą na stare miejsce?",
                a: "Stosujemy tzw. retencję (cieniutki drucik od wewnątrz lub nakładka na noc), która 'trzyma' zęby w nowej pozycji. Jest to standardowa procedura gwarantująca trwałość efektu."
            }
        ]
    },
    {
        category: "Chirurgia",
        items: [
            {
                q: "Kiedy trzeba usunąć ósemki?",
                a: "Gdy brakuje na nie miejsca w łuku (stłoczenia), powodują stany zapalne, próchnicę siódemek lub torbiele. Oceniamy to na podstawie zdjęcia pantomograficznego."
            },
            {
                q: "Co to jest PRF?",
                a: "To bogatopłytkowa fibryna uzyskiwana z krwi pacjenta. Działa jak naturalny 'super-plaster', przyspieszając gojenie rany po ekstrakcji nawet kilkukrotnie."
            },
            {
                q: "Zalecenia po usunięciu zęba?",
                a: "Przez 2 godziny nie jeść. W dobie zabiegu unikać gorących posiłków i wysiłku fizycznego. Nie płukać ust energicznie (by nie wypłukać skrzepu). Stosować zimne okłady. W razie wątpliwości dzwonić do kliniki."
            },
            {
                q: "Czy 'suchy zębodół' to częste powikłanie?",
                a: "Zdarza się rzadko (ok. 2-5%), głównie u palaczy lub kobiet stosujących antykoncepcję hormonalną. Aby mu zapobiec, stosujemy PRF oraz ozonoterapię, które drastycznie zmniejszają ryzyko powikłań."
            }
        ]
    },
    {
        category: "Dzieci i Profilaktyka Najmłodszych",
        items: [
            {
                q: "Kiedy pierwsza wizyta z dzieckiem?",
                a: "Zapraszamy na pierwszą wizytę adaptacyjną już w wieku 2-3 lat, lub wcześniej, jeśli coś Cię niepokoi. To wizyta w formie zabawy, bez leczenia, która buduje zaufanie małego pacjenta do dentysty."
            },
            {
                q: "Czy leczycie zęby mleczne?",
                a: "Oczywiście! Zdrowe mleczaki to zdrowe zęby stałe. Nieleczona próchnica u dzieci może prowadzić do wad zgryzu w przyszłości. Stosujemy kolorowe wypełnienia, które dzieci uwielbiają."
            },
            {
                q: "Co to jest lakowanie?",
                a: "Lakowanie to zabezpieczenie bruzd w zębach trzonowych (stałych szóstkach) specjalnym lakiem. Bruzdy są miejscem, gdzie najszybciej rozwija się próchnica, bo szczoteczka tam nie dociera. Zabieg jest krótki i całkowicie bezbolesny."
            },
            {
                q: "Dziecko boi się dentysty. Jak sobie radzicie?",
                a: "Mamy ogromne doświadczenie w pracy z małymi pacjentami. Stosujemy metodę 'powiedz-pokaż-zrób'. Używamy 'magicznego powietrza' (sedacja wziewna), bajek na ekranie sufitowym i nagród. Nie leczymy na siłę – budujemy relację."
            }
        ]
    },
    {
        category: "Organizacja i Finanse",
        items: [
            {
                q: "Jakie są formy płatności?",
                a: "Akceptujemy płatności gotówką, kartą płatniczą oraz BLIK-iem. Istnieje również możliwość rozłożenia płatności na raty w systemie MediRaty (wymagana wcześniejsza weryfikacja)."
            },
            {
                q: "Czy muszę mieć skierowanie?",
                a: "Nie, jesteśmy prywatną kliniką i nie wymagamy żadnych skierowań. Wystarczy umówić się na wizytę konsultacyjną."
            },
            {
                q: "Gdzie zaparkować?",
                a: "Bezpośrednio przed kliniką znajduje się nasz prywatny, bezpłatny parking dla pacjentów. Nigdy nie będziesz musiał szukać miejsca ani płacić za parkomat."
            },
            {
                q: "Jak przygotować się do pierwszej wizyty?",
                a: "Jeśli posiadasz aktualne zdjęcie pantomograficzne (nie starsze niż 6 miesięcy), zabierz je ze sobą. Przygotuj listę przyjmowanych leków. Jeśli boli Cię konkretny ząb, postaraj się określić, na jakie bodźce reaguje (zimno, ciepło, nagryzanie)."
            }
        ]
    },
    {
        category: "Gwarancja i Bezpieczeństwo",
        items: [
            {
                q: "Czy dajecie gwarancję na leczenie?",
                a: "Tak, udzielamy 2-letniej rękojmi na wypełnienia oraz prace protetyczne. Warunkiem jej utrzymania są regularne wizyty kontrolne i higienizacyjne co 6 miesięcy (zgodnie z zaleceniami lekarza)."
            },
            {
                q: "Co jeśli po zabiegu coś mnie boli?",
                a: "Niewielki dyskomfort po niektórych zabiegach jest normalny, ale Twój spokój jest dla nas najważniejszy. W przypadku silnego bólu lub niepokojących objawów prosimy o kontakt - zawsze znajdziemy czas, by sprawdzić, czy proces gojenia przebiega prawidłowo."
            },
            {
                q: "Jak dbacie o sterylność?",
                a: "Sterylizacja to nasz priorytet absolutny. Używamy autoklawu najwyższej klasy medycznej (Klasa B). Wszystkie narzędzia są pakowane w sterylne pakiety otwierane przy pacjencie. Końcówki stomatologiczne są oliwione i sterylizowane po każdym pacjencie."
            }
        ]
    }
];

export default function FAQPage() {
    const [openState, setOpenState] = useState<Record<string, boolean>>({});

    const toggle = (id: string) => {
        setOpenState(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <main>
            {/* Header Section - Matches 'O nas' intro */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0 0 0" }}>
                <div className="container">
                    <RevealOnScroll>
                        <p style={{
                            textAlign: "center",
                            color: "var(--color-primary)",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-md)"
                        }}>
                            Baza Wiedzy
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400,
                            lineHeight: 1.1
                        }}>
                            Pytania i <br />
                            <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>Odpowiedzi</span>
                        </h1>
                    </RevealOnScroll>
                </div>
            </section>

            {/* FAQ Sections */}
            <div className="container" style={{ paddingBottom: "var(--spacing-xl)" }}>
                {FAQ_DATA.map((section, catIndex) => (
                    <section key={catIndex} style={{ marginBottom: "var(--spacing-lg)" }}>
                        <RevealOnScroll>
                            <h2 style={{
                                fontSize: "1.5rem",
                                color: "var(--color-primary)",
                                marginBottom: "var(--spacing-md)",
                                borderLeft: "2px solid var(--color-primary)",
                                paddingLeft: "1rem"
                            }}>
                                {section.category}
                            </h2>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {section.items.map((item, qIndex) => {
                                    const id = `${catIndex}-${qIndex}`;
                                    const isOpen = openState[id];

                                    return (
                                        <div
                                            key={qIndex}
                                            style={{
                                                background: "var(--color-surface)",
                                                border: "1px solid var(--color-surface-hover)",
                                                borderRadius: "var(--radius-sm)",
                                                overflow: 'hidden',
                                                transition: "border-color 0.3s ease"
                                            }}
                                            className={isOpen ? "border-primary" : ""}
                                        >
                                            <button
                                                onClick={() => toggle(id)}
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "1.5rem",
                                                    background: "transparent",
                                                    color: isOpen ? "var(--color-primary)" : "var(--color-text-main)",
                                                    fontSize: "1.2rem",
                                                    textAlign: "left",
                                                    fontFamily: "var(--font-heading)",
                                                    transition: "color 0.3s ease"
                                                }}
                                            >
                                                {item.q}
                                                <ChevronDown
                                                    style={{
                                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                        transition: "transform 0.3s ease",
                                                        color: "var(--color-primary)"
                                                    }}
                                                />
                                            </button>

                                            <div style={{
                                                maxHeight: isOpen ? "500px" : "0",
                                                overflow: "hidden",
                                                transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                                opacity: isOpen ? 1 : 0.5
                                            }}>
                                                <div style={{
                                                    padding: "0 1.5rem 1.5rem 1.5rem",
                                                    color: "var(--color-text-muted)",
                                                    lineHeight: 1.8,
                                                    fontSize: "1rem"
                                                }}>
                                                    {item.a}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </RevealOnScroll>
                    </section>
                ))}
            </div>

            <style jsx>{`
                .border-primary {
                    border-color: var(--color-primary) !important;
                }
            `}</style>
        </main>
    );
}
