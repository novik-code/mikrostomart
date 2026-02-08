"use client";

import { Download, FileText } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function RegulaminPage() {
    return (
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero Header */}
            <section style={{
                padding: "calc(var(--spacing-xl) + 2rem) 0 var(--spacing-lg)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center top, rgba(220,177,74,0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <RevealOnScroll>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "50%",
                                background: "rgba(220,177,74,0.1)", border: "1px solid rgba(220,177,74,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <FileText size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            Zasady Funkcjonowania
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                            marginBottom: "1.5rem", lineHeight: 1.2
                        }}>
                            Regulamin Organizacyjny
                        </h1>
                        <a
                            href="/regulamin.pdf" target="_blank" rel="noopener noreferrer"
                            className="btn-primary"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                background: "var(--color-primary)", color: "#000",
                                padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)",
                                fontWeight: 600, fontSize: "0.9rem", textDecoration: "none"
                            }}
                        >
                            <Download size={18} />
                            Pobierz PDF
                        </a>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{
                    background: "var(--color-surface)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius-lg)",
                    padding: "clamp(2rem, 4vw, 3rem)",
                    boxShadow: "0 4px 30px rgba(0,0,0,0.3)"
                }}>
                    {/* Shared styles for legal content */}
                    <style>{`
                            .reg-section { margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
                            .reg-section:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
                            .reg-title {
                                font-family: var(--font-heading); font-size: 1.15rem; color: var(--color-primary);
                                margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem;
                            }
                            .reg-badge {
                                min-width: 32px; height: 28px; border-radius: 14px;
                                background: rgba(220,177,74,0.1); border: 1px solid rgba(220,177,74,0.15);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 0.7rem; font-family: var(--font-sans); font-weight: 700;
                                color: var(--color-primary); padding: 0 8px; flex-shrink: 0;
                            }
                            .reg-body { color: var(--color-text-muted); line-height: 1.8; font-size: 0.92rem; }
                            .reg-body p { margin-bottom: 0.75rem; }
                            .reg-body p:last-child { margin-bottom: 0; }
                            .reg-body strong { color: var(--color-text-main); }
                            .reg-body ul { list-style: none; padding: 0; margin: 0.5rem 0; }
                            .reg-body li { padding: 0.3rem 0 0.3rem 1.25rem; position: relative; }
                            .reg-body li::before {
                                content: ''; position: absolute; left: 0; top: 0.85rem;
                                width: 4px; height: 4px; border-radius: 50%;
                                background: var(--color-primary); opacity: 0.5;
                            }
                        `}</style>

                    {/* § 1 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 1</span> Postanowienia wstępne</h3>
                        <div className="reg-body">
                            <p>1. Niniejszy Regulamin określa zasady korzystania z usług medycznych świadczonych przez <strong>ELMAR SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong> z siedzibą w Opolu, w szczególności cele i zadania Usługodawcy, strukturę organizacyjną Usługodawcy, zakres, organizacja i przebieg udzielania świadczeń zdrowotnych przez Usługodawcę, podstawowy zakres obowiązków personelu zatrudnionego przez Usługodawcę w Gabinecie, prawa oraz obowiązki Pacjentów Usługodawcy, zasady odpłatności za udzielane przez Usługodawcę świadczenia zdrowotne w Gabinecie, a także reguluje tryb składania skarg i wniosków przez Pacjentów Usługodawcy.</p>
                            <p>2. Pacjenci Gabinetu mają obowiązek zapoznania się z niniejszym Regulaminem przed przystąpieniem do rezerwacji wizyty na dowolną Usługę. Przystąpienie przez Pacjenta do rezerwacji wizyty w Gabinecie jest równoznaczne z akceptacją przez Pacjenta niniejszego Regulaminu.</p>
                            <p>3. Miejscem udzielania świadczeń zdrowotnych, zgodnie z niniejszym Regulaminem, jest siedziba Usługodawcy: <strong>ul. Centralna 33a, 45-940 Opole/Chmielowice, woj. opolskie, Polska</strong></p>
                            <p>4. Na terenie całego Gabinetu, obowiązuje całkowity zakaz palenia i używania tytoniu oraz wyrobów tytoniowych i nikotynowych, w tym papierosów elektronicznych, jak również obowiązuje całkowity zakaz spożywania napojów alkoholowych oraz innego rodzaju używek i środków odurzających.</p>
                        </div>
                    </div>

                    {/* § 2 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 2</span> Definicje</h3>
                        <div className="reg-body">
                            <p>Użyte w niniejszym Regulaminie pojęcia i definicje będą miały następujące znaczenie:</p>
                            <ul>
                                <li><strong>Pacjent</strong> – oznacza każdą osobę pełnoletnią, osobę niepełnoletnią powyżej 16. roku życia posiadającą pisemną zgodę swojego prawnego opiekuna lub osobę niepełnoletnią poniżej 16. roku życia przebywającą w Gabinecie pod opieką swojego prawnego opiekuna lub osoby przez niego wyznaczonej, która akceptuje niniejszym Regulamin i korzysta z Usługi;</li>
                                <li><strong>Regulamin</strong> – oznacza niniejszy Regulamin organizacyjny, ustalony i stosowany przez Usługodawcę;</li>
                                <li><strong>Gabinet</strong> – oznacza miejsce udzielania przez Usługodawcę świadczeń zdrowotnych tj. lokal, w którym Usługodawca wykonuje Usługę/Zabieg w rozumieniu niniejszego Regulaminu (Gabinet MIKROSTOMART - Mikroskopowa Stomatologia Artystyczna ul. Centralna 33a 45-940 Opole/Chmielowice, zarządzany przez Usługodawcę, tel: 570 270 470, e-mail: gabinet@mikrostomart.pl);</li>
                                <li><strong>Personel</strong> – oznacza każdego pracownika Usługodawcy wykonującego na rzecz Pacjentów Usługi/Zabiegi w Gabinecie. Personel składa się z personelu medycznego i niemedycznego. Zakres obowiązków Personelu został określony w Regulaminie: § 5 ust. 2 dla personelu medycznego i § 5 ust. 3 dla personelu niemedycznego.</li>
                                <li><strong>Usługa/Zabieg</strong> – oznacza usługę świadczoną przez Usługodawcę na rzecz Pacjenta, określoną w § 5 ust. 1 niniejszego Regulaminu;</li>
                                <li><strong>Usługodawca</strong> – oznacza Podmiot leczniczy tj. Spółkę ELMAR SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ z siedzibą w Opolu, ul. Centralna nr 33A, 45-940 Opole, NIP:7543251709.</li>
                            </ul>
                        </div>
                    </div>

                    {/* § 3 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 3</span> Cele i zadania Usługodawcy</h3>
                        <div className="reg-body">
                            <p>1. Podstawowym celem Usługodawcy jest udzielanie świadczeń zdrowotnych przez osoby do tego uprawnione na podstawie przepisów prawa. Personel zatrudniony przez Usługodawcę dzieli się na personel medyczny i niemedyczny.</p>
                            <p>2. Do podstawowych zadań Usługodawcy należy świadczenie Usług stomatologicznych opisanych w § 5 ust. 1 poniżej. Należy wśród nich wyszczególnić:</p>
                            <ul>
                                <li>udzielanie Pacjentom indywidualnych porad i konsultacji stomatologicznych,</li>
                                <li>diagnostyka oraz leczenie schorzeń uzębienia Pacjentów, w tym diagnostyka RTG,</li>
                                <li>wykonywanie zabiegów chirurgicznych uzębienia Pacjentów,</li>
                                <li>współdziałanie z innymi podmiotami wykonującymi działalność leczniczą na podstawie odrębnych umów,</li>
                                <li>działania edukacyjne, promocja zdrowia i działania mające na celu profilaktykę zdrowia,</li>
                                <li>prowadzenie spraw administracyjnych, ekonomicznych i obsługi technicznej Gabinetu.</li>
                            </ul>
                        </div>
                    </div>

                    {/* § 4 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 4</span> Struktura organizacyjna Usługodawcy</h3>
                        <div className="reg-body">
                            <p>1. Usługodawca jako Podmiot leczniczy prowadzi swoją działalność w ramach Gabinetu.</p>
                            <p>2. Usługodawcą jest Spółka ELMAR SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ z siedzibą w Opolu, ul. Centralna nr 33A, 45-940 Opole, NIP:7543251709, KRS: 0000815074 reprezentowana przez Zarząd w składzie Marcin Nowosielski i Elżbieta Nowosielska. Każdy z członków Zarządu jest uprawniony jednoosobowego reprezentowania podmiotu oraz składania za podmiot oświadczeń woli w zakresie praw i obowiązków majątkowych spółki Usługodawcy.</p>
                            <p>3. Komórki organizacyjne Usługodawcy w ramach Gabinetu:</p>
                            <ul>
                                <li>recepcja, obsługiwana przez personel niemedyczny;</li>
                                <li>pracownia implantologii, protetyki, endodoncji, pedodoncji, anestezji, periodontologii, ortodoncji, chirurgii,</li>
                                <li>pracownia RTG.</li>
                            </ul>
                            <p>4. Zadaniem recepcji jest realizacja obowiązków personelu niemedycznego zgodnie z postanowieniami niniejszego Regulaminu.</p>
                            <p>5. Zadaniem pracowni implantologii, protetyki, endodoncji, pedodoncji, anestezji, periodontologii, ortodoncji, chirurgii jest: udzielanie świadczeń zdrowotnych specjalistycznych z zakresu stomatologii, prowadzenie dokumentacji medycznej, informowanie o zakresie i zasadach udzielania świadczeń zdrowotnych przez Usługodawcę.</p>
                            <p>6. Zadaniem pracowni RTG jest: prowadzenie wyspecjalizowanej diagnostyski przy wykorzystaniu promieniowania rentgenowskiego.</p>
                        </div>
                    </div>

                    {/* § 5 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 5</span> Zakres udzielanych świadczeń zdrowotnych</h3>
                        <div className="reg-body">
                            <p>1. Usługodawca świadczy usługi stomatologiczne w zakresie:</p>
                            <ul>
                                <li>implantologii,</li>
                                <li>protetyki,</li>
                                <li>endodoncji,</li>
                                <li>pedodoncji,</li>
                                <li>anestezji,</li>
                                <li>periodontologii,</li>
                                <li>chirurgii,</li>
                                <li>ortodoncji,</li>
                                <li>diagnostyki RTG.</li>
                            </ul>
                            <p>2. Do podstawowego zakresu obowiązków personelu medycznego zatrudnionego przez Usługodawcę w Gabinecie należy:</p>
                            <ul>
                                <li>przeprowadzanie z Pacjentem wywiadu lekarskiego i wywiadu stomatologicznego,</li>
                                <li>rzetelne oraz zgodne z najnowszą wiedzą medyczną udzielanie świadczeń zdrowotnych na najwyższym poziomie,</li>
                                <li>przestrzeganie praw Pacjenta,</li>
                                <li>stałe podnoszenie kwalifikacji zawodowych,</li>
                                <li>rzetelne oraz systematyczne prowadzenie kompleksowej dokumentacji medycznej,</li>
                                <li>zachowanie w tajemnicy wszystkich informacji związanych z udzielaniem świadczeń zdrowotnych,</li>
                                <li>nadzorowanie pracy asystentki,</li>
                                <li>zapewnienie Pacjentowi intymności podczas Zabiegu,</li>
                                <li>sterylizacja narzędzi,</li>
                                <li>utrzymywanie porządku i sterylności Gabinetu,</li>
                                <li>zaopatrywanie Gabinetu w materiały stomatologiczne,</li>
                                <li>dbanie o dobry wizerunek Usługodawcy, także w kontaktach zewnętrznych,</li>
                                <li>przestrzeganie obowiązujących przepisów prawa, zasad BHP i ppoż,</li>
                                <li>przestrzeganie postanowień niniejszego Regulaminu.</li>
                            </ul>
                            <p>3. Do podstawowego zakresu obowiązków personelu niemedycznego zatrudnionego przez Usługodawcę w Gabinecie należy:</p>
                            <ul>
                                <li>umawianie Pacjentów i prowadzenie rezerwacji wizyt w Gabinecie,</li>
                                <li>archiwizacja dokumentów, w tym dokumentacji medycznej Pacjentów,</li>
                                <li>rozliczanie Pacjentów za wykonane Usługi,</li>
                                <li>zachowanie w tajemnicy wszystkich informacji związanych ze świadczeniem Pacjentom Usług, w szczególności informacji dotyczących stanu zdrowia Pacjentów, przebytych przez Pacjentów Zabiegów oraz innych informacji zawartych w dokumentacji medycznej Pacjentów. Powyższe nie dotyczy oferty Usługodawcy, która jest informacją jawną i opublikowaną na stronie internetowej Usługodawcy, profilach Usługodawcy na portalach społecznościowych, w ulotkach reklamujących Usługi Usługodawcy lub w innej formie w środkach masowego przekazu,</li>
                                <li>przestrzeganie obowiązujących przepisów prawa, zasad BHP i ppoż,</li>
                                <li>przestrzeganie postanowień niniejszego Regulaminu.</li>
                            </ul>
                        </div>
                    </div>

                    {/* § 6 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 6</span> Organizacja i przebieg udzielania świadczeń zdrowotnych</h3>
                        <div className="reg-body">
                            <p>1. Usługodawca oferuje w ramach poradni usługi stomatologiczne na zasadzie pełnej odpłatności za spełniane świadczenia zdrowotne. Usługodawca w Gabinecie Stomatologicznym Mikrostomart prowadzi praktyką prywatną i nie udziela świadczeń w ramach świadczeń z Narodowego Funduszu Zdrowia.</p>
                            <p>2. Realizacja świadczeń zdrowotnych następuje na zasadzie dobrowolności wyboru leczenia odpłatnego przez Pacjenta i za jego pisemną zgodą.</p>
                            <p>3. Przyjęcie Pacjenta do Gabinetu wymaga prowadzenia jego dokumentacji medycznej, oraz dokumentacji statystycznej. Dokumentacja jest prowadzona również w systemie elektronicznym.</p>
                            <p>4. Każdemu Pacjentowi przez pierwszą wizytą w Gabinecie zakłada się kartę rejestracyjną. Każda wizyta Pacjenta w Gabinecie musi być zapisana w dokumentacji medycznej.</p>
                            <p>5. Przy pierwszej wizycie Personel przeprowadza z Pacjentem Wywiad Lekarski Podstawowy (Internistyczny) oraz Wywiad Stomatologiczny. Wywiad wymaga uaktualniania przy kolejnych wizytach w Gabinecie. W przypadku niepodania przez Pacjenta do wywiadu pełnych danych Usługodawca nie ponosi odpowiedzialności za jakiekolwiek następstwa wynikające z takowego zatajenia.</p>
                            <p>6. Pacjent posiadający pełną zdolność do czynności prawnych, przedstawiciel ustawowy bądź opiekun prawny wyraża pisemna zgodę na realizację świadczeń zdrowotnych przez Usługodawcę (dotyczy zabiegów chirurgicznych, wszystkich innych zabiegów o charakterze inwazyjnym oraz podania Pacjentowi środka znieczulającego).</p>
                            <p>7. Dopuszcza się wyrażenie przez Pacjenta zgody na leczenie w formie pisemnej jedynie w sytuacjach wymagających nagłego podjęcia czynności medycznych w ramach leczenia podstawowego lub zachowawczego. Za dowód wyrażenia zgody w takich przypadkach uznaje się poddanie przez Pacjenta proponowanemu leczeniu.</p>
                            <p>8. Odmowa Pacjenta poddania się leczeniu, w razie stwierdzenia niezwłocznej potrzeby leczenia przez Personel, podlega wpisowi do karty Pacjenta i powinna być przez niego potwierdzona.</p>
                            <p>9. Dokumentacja medyczna prowadzona jest na zasadach określonych w przepisach odbrębnych.</p>
                            <p>10. Usługodawca w Gabinecie utrwala audiowizualnie przebieg każdej wizyty, na co Pacjent wyraża zgodę. Niewyrażenie zgody Pacjenta w tym zakresie jest równoznaczne z odmową poddania się wykonania Zabiegowi. Nagranie takie chronione jest zgodnie z zasadami przetwarzania danych osobowych i nie może być wykorzystywane bez zgody Pacjenta poza sytuacjami wynikającymi z przepisów powszechnie obowiązujących.</p>
                            <p>11. Pacjent przyjmuje do wiadomości, że z przyczyn losowych niezależnych od Usługodawcy, godzina umówionej w Gabinecie wizyty może ulec zmianie (opóźnieniu). W takiej sytuacji Pacjentowi nie przesługuje żadna rekompensata od Usługodawcy.</p>
                            <p>12. W sytuacji, że planowana Usługa nie może być zrealizowana przez członka personelu medycznego, do którego Pacjent został umówiony, możliwe jest jej wykonanie przez innego członka personelu medycznego zatrudnionego przez Usługodawcę w Gabinecie, za uprzednią zgodą pacjenta.</p>
                            <p>13. Zgoda Pacjenta na zmianę członka personelu medycznego nie jest wymagana w razie zaistnienia przypadku wymagającego nagłego podjęcia czynności medycznych w ramach leczenia podstawowego lub zachowawczego, o których mowa w ust. 7 powyżej. Wówczas Pacjent wyraża jedynie zgodę na samo wykonanie takiej czynności medycznej na zasadach określowych w ww. § 4 ust. 7 Regulaminu.</p>
                        </div>
                    </div>

                    {/* § 7 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 7</span> Standardy Higieniczne</h3>
                        <div className="reg-body">
                            <p>1. Personel zatrudniony przez Usługodawcę ściśle przestrzega wymogów sanitarnych w zakresie utrzymania porządku i obowiązku dezynfekcji powierzchni w Gabinecie.</p>
                            <p>2. Pracownicy Usługodawcy podczas wykonywania zabiegów używają rękawiczek jednorazowych, a jeżeli zabieg tego wymaga również maseczek jednorazowych.</p>
                            <p>3. Narzędzia używane podczas Zabiegów są jednorazowe. W przypadku konieczności użycia narzędzi wielorazowych, są ona każdorazowo po użyciu poddawane sterylizacji w autoklawie, który Usługodawca posiada na wyposażeniu Gabinetu.</p>
                            <p>4. Do sterylizacji, dezynfekcji i czyszczenia używane są wyłącznie środki dopuszczone do stosowania w gabinetach dentystycznych.</p>
                        </div>
                    </div>

                    {/* § 8 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 8</span> Prawa i obowiązki Pacjentów</h3>
                        <div className="reg-body">
                            <p>1. Każdy Pacjent ma prawo:</p>
                            <ul>
                                <li>uzyskania przystępnej informacji o swoim stanie zdrowia pod względem stomatologicznym, proponowanym leczeniu (plan leczenia) oraz rokowaniu,</li>
                                <li>do świadczeń zdrowotnych odpowiadającym najnowszym wymaganiom wiedzy medycznej udzielanych przez wyspecjalizowany i kompetentny personel medyczny posiadający odpowiednie kwalifikacje zawodowe,</li>
                                <li>wyrażenia zgody, lub jej odmowy na świadczenie określonego Zabiegu po uzyskaniu odpowiedniej informacji na temat świadczenia,</li>
                                <li>wglądu w dokumentację medyczną dotyczącą jego leczenia, oraz uzyskania kopii dokumentacji medycznej osobiście, lub przez upoważnioną do tego na piśmie osobę,</li>
                                <li>poszanowania godności oraz uprzejmego traktowania przez Personel,</li>
                                <li>możliwości rejestracji telefonicznej oraz internetowej,</li>
                                <li>decydowania jakim osobom lekarz prowadzący może udzielić informacji o stanie zdrowia Pacjenta oraz udostępnienia dokumentacji, chyba że z przepisów prawa powszechnie obowiązującego wynika inaczej,</li>
                                <li>wskazania osoby lub instytucji, którą Personel obowiązany jest powiadomić o wystąpieniu stanu zdrowia zagrażającego życiu Pacjenta lub w razie śmierci Pacjenta.</li>
                            </ul>
                            <p>2. Uprawnienia Pacjentów wymienione w ust. 1 powyżej mogą być ograniczone wyłącznie w zakresie i sytuacjach wynikających z przepisów prawa powszechnie obowiązującego.</p>
                            <p>3. Każdy Pacjent jest zobowiązany do:</p>
                            <ul>
                                <li>przestrzegania zaleceń lekarzy lub innego personelu medycznego zatrudnionego przez Usługodawcę w Gabinecie. W przypadku nieprzestrzegania zaleceń i wskazań lekarskich, w szczególności dotyczących postępowania przed- i pozabiegowego, Pacjent ponosi wszelkie ryzyko z tym związane,</li>
                                <li>przestrzegania zasad BHP oraz ppoż na terenie Gabinetu Usługodawcy i w bezpośrednim jego sąsiedztwie,</li>
                                <li>w przypadku konieczności odwołania umówionej wizyty u Usługodawcy w Gabinecie - poinformowania o tym fakcie Personelu z co najmniej jednodniowym wyprzedzeniem.</li>
                            </ul>
                            <p>4. Urządzenia i sprzęt znajdujący się na wyposażeniu Gabinetu Usługodawcy mogą być obsługiwane wyłącznie przez Personel. W przypadku nieuprawnionego użycia, urządzeń lub sprzętu znajdującego się na wyposażeniu Gabinetu Usługodawcy, w tym zmiany ich ustawień, przez Pacjenta, Usługodawca może dochodzić od takiego Pacjenta naprawienia szkody z tego wynikłej na zasadach ogólnych.</p>
                            <p>5. Zabrania się Pacjentom wchodzenia do pomieszczeń przeznaczonych wyłącznie dla Personelu.</p>
                            <p>6. Pacjenci zobowiązani są do zachowania czystości na terenie Gabinetu Usługodawcy i w jego bezpośrednim sąsiedztwie. Nie wolno Pacjentom oraz osobom im towarzyszącym zanieczyszczać oraz zaśmiecać terenu Gabinetu oraz terenu przyległego.</p>
                        </div>
                    </div>

                    {/* § 9 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 9</span> Zasady odpłatności za świadczenia medyczne</h3>
                        <div className="reg-body">
                            <p>1. Wszystkie Zabiegi wykonywane w Gabinecie podlegają opłacie zgodnie z Cennikiem obowiązującym u Usługodawcy. Cennik dostępny jest do wglądu w Gabinecie oraz na stronie internetowej Gabinetu Usługodawcy.</p>
                            <p>2. Pacjent ma możliwość płatności za Usługi w salonie gotówką, przelewem, kartą, Blikiem lub specjalnym bonem zakupionym w Gabinecie Usługodawcy.</p>
                            <p>3. W przypadku rejestracji Pacjenta wizytę, Personel pobiera od Pacjenta zadatek w wysokości ustalonej zgodnie z cennikiem, którym mowa w ust. 1 powyżej. Zadatek podlega zaliczeniu na poczet wykonanej Usługi.</p>
                            <p>4. Jeżeli Pacjent nie stawi się na umówioną wizytę w Gabinecie Usługodawcy i w związku z tym nie dojdzie do wykonania zaplanowanej Usługi, Usługodawca zatrzymuje wpłacony przez Pacjenta zadatek. Jeżeli Pacjent, odwołując wizytę zgodnie z § 6 ust. 3 lit. c) Regulaminu, przełoży jednocześnie wizytę na inny dzień następujący w okresie do 3 miesięcy od daty ostatniej wizyty w Gabinecie lub odbytej w Gabinecie konsultacji i diagnostyki, Usługodawca nie zatrzymuje zadatku, tylko zalicza go na poczet wizyty w nowym terminie. Do nowego terminu wizyty, zdanie pierwsze i drugie niniejszego ustępu stosuje się odpowiednio.</p>
                            <p>5. W przypadku braku zapłaty przez Pacjenta zadatku, o którym mowa ust. 3 powyżej, jeżeli taki Pacjent nie stawi się na umówioną wizytę, ani nie dokona zmiany terminu tej wizyty zgodnie z postanowieniami niniejszego Regulaminu, zadatek ten zostanie doliczony Pacjentowi do najbliższego rachunku.</p>
                            <p>6. W przypadku, gdy z przyczyn leżących po stronie Usługodawcy, Pacjent nie może zostać przyjęty w dniu umówionej wizyty Personel informuje go o tym fakcie drogą telefoniczną lub poprzez wiadomość tekstową „SMS" najpóźniej w dniu zaplanowanej wizyty, proponując Pacjentowi jednocześnie przeniesienie wizyty na inny, najbliższy w czasie termin.</p>
                        </div>
                    </div>

                    {/* § 10 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 10</span> Skargi i wnioski</h3>
                        <div className="reg-body">
                            <p>1. Pacjentowi przysługuje prawo do reklamacji Usługi.</p>
                            <p>2. Reklamację należy złożyć na piśmie drogą mailową, osobiście w Gabinecie lub listem poleconym, maksymalnie 3 dni od jej wykonania lub wystąpienia powikłań wywołanych Zabiegiem.</p>
                            <p>3. Usługodawca ma 14 dni kalendarzowych na rozpatrzenie reklamacji. W przypadku pozytywnego rozpatrzenia reklamacji, Usługodawca spełni żądania klienta.</p>
                            <p>4. Pacjent ma prawo żądać zwrotu całości lub części kosztów Usługi albo wykonania nieodpłatnych poprawek, jeżeli reklamacja zostanie uznana za zasadną.</p>
                            <p>5. W przypadku odpowiedzi odmownej, Pacjent ma prawo odwołać się od tej decyzji w ciągu 14 dni kalendarzowych. Na rozpatrzenie odwołania Usługodawca ma 14 dni kalendarzowych.</p>
                            <p>6. Pacjent nie ma prawa odmówić zapłaty za wykonaną Usługę.</p>
                            <p>7. Usługodawca ani Personel nie ponoszą odpowiedzialności za powikłania, które wystąpią po poprawnie przeprowadzonej Usłudze, poprzedzonym poprawnie przeprowadzonym wywiadem, w którym nie stwierdzono przeciwwskazań do jej wykonania. Ponadto Usługodawca ani Personel nie ponoszą odpowiedzialności za powikłania powstałe w wyniku nieprzestrzegania przez Pacjenta zaleceń przed- i pozabiegowych.</p>
                        </div>
                    </div>

                    {/* § 11 */}
                    <div className="reg-section">
                        <h3 className="reg-title"><span className="reg-badge">§ 11</span> Dane osobowe</h3>
                        <div className="reg-body">
                            <p>Dane osobowe Pacjenta przetwarzane są zgodnie z treścią i w celach wskazanych w klauzuli informacyjnej, z którą Pacjent zapoznaje się podczas pierwszej wizyty w Gabinecie Usługodawcy.</p>
                        </div>
                    </div>

                    {/* § 12 */}
                    <div className="reg-section" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
                        <h3 className="reg-title"><span className="reg-badge">§ 12</span> Postanowienia Końcowe</h3>
                        <div className="reg-body">
                            <p>1. W celu zapewnienia prawidłowości leczenia Pacjentów oraz ciągłości przebiegu procesu udzielania świadczeń zdrowotnych, Usługodawca współdziała z innymi podmiotami wykonującymi działalność leczniczą lub udzielającymi świadczeń zdrowotnych na rzecz tych pacjentów, w szczególności Personel może żądać zaświadczenia o braku przeciwwskazań lekarskich do wskazanej Usługi/Zabiegu. Współdziałanie Usługodawcy z innymi podmiotami wykonującymi działalność leczniczą odbywa się z poszanowaniem obowiązujących przepisów prawa oraz z poszanowaniem praw Pacjenta.</p>
                            <p>2. Każdy Pacjent ma prawo wglądu do Regulaminu, cennika i certyfikatów, na które powołuje się Usługodawca.</p>
                            <p>3. Za wszelkie uszkodzenia wyposażenia Usługodawcy w Gabinecie Pacjenci odpowiadają bez ograniczeń zgodnie z art. 415 kodeksu cywilnego. Za uszkodzenia spowodowane przez osoby niepełnoletnie odpowiedzialni są ich ustawowi przedstawiciele.</p>
                            <p>4. Usługodawca zastrzega sobie prawo do zmian w niniejszym Regulaminie i poinformowania o nich Pacjenta przed zapisem na wizytę, z ważnych przyczyn to jest np.: zmiany przepisów prawa, zmiany sposobów płatności, zmiany w świadczeniu usług – w zakresie, w jakim te zmiany wpływają na realizację postanowień niniejszego Regulaminu. Nowy regulamin wchodzi w życie z dniem wywieszenia go w Gabinecie.</p>
                            <p>5. Informacja o zmianach Regulaminy zostanie opublikowana na stronie internetowej Gabinetu oraz na profilach Gabinetu w mediach społecznościowych, jeżeli takie są prowadzone, co najmniej 14 dni kalendarzowych przed terminem, w którym zmiany zaczną obowiązywać.</p>
                            <p>6. Do Usług/Zabiegów zleconych przed dniem wejścia w życie zmian Regulaminu, obowiązują jego postanowienia obowiązujące w chwili umawiania terminu wykonania Usługi/Zabiegu.</p>
                            <p>7. Wszelkie spory wynikające ze świadczonych Usług winny być w pierwszej kolejności rozwiązywane polubownie. W przypadku niedojścia do porozumienia spory będą rozstrzygane przez sąd właściwy wg przepisów polskiego prawa.</p>
                            <p>8. Jeżeli którekolwiek z postanowień niniejszego Regulaminu zostałoby uznane za nieważne, niezgodne z przepisami prawa lub niewykonalne, zostanie ono wyłączone z postanowień niniejszego Regulaminu, które to w dalszym ciągu będą obowiązywać w najszerszym, dopuszczalnym przez polskie prawo zakresie.</p>
                            <p>9. W zakresie nieuregulowanym niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego.</p>
                            <p>10. Niniejszy Regulamin obowiązuje od 01.01.2025 r.</p>
                        </div>
                    </div>

                </div>
            </section>
        </main>
    );
}
