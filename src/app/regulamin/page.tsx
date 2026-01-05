"use client";

import { Download } from "lucide-react";

export default function RegulaminPage() {
    return (
        <main className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-4xl mx-auto text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl md:text-4xl font-serif text-[#dcb14a]">
                    Regulamin Organizacyjny
                </h1>
                <a
                    href="/regulamin.pdf"
                    download="Regulamin-Mikrostomart.pdf"
                    className="flex items-center gap-2 bg-[#dcb14a] text-black px-6 py-3 rounded-full font-medium hover:bg-[#c59d3e] transition-colors"
                >
                    <Download size={20} />
                    Pobierz PDF
                </a>
            </div>

            <div className="prose prose-invert prose-gold max-w-none bg-[#1a1d21] p-8 rounded-2xl border border-white/10">
                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                    {`REGULAMIN ORGANIZACYJNY

§ 1
Postanowienia wstępne
1. Niniejszy Regulamin określa zasady korzystania z usług medycznych świadczonych przez ELMAR SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ z siedzibą w Opolu, w szczególności cele i zadania Usługodawcy, strukturę organizacyjną Usługodawcy, zakres, organizacja i przebieg udzielania świadczeń zdrowotnych przez Usługodawcę, podstawowy zakres obowiązków personelu zatrudnionego przez Usługodawcę w Gabinecie, prawa oraz obowiązki Pacjentów Usługodawcy, zasady odpłatności za udzielane przez Usługodawcę świadczenia zdrowotne w Gabinecie, a także reguluje tryb składania skarg i wniosków przez Pacjentów Usługodawcy.
2. Pacjenci Gabinetu mają obowiązek zapoznania się z niniejszym Regulaminem przed przystąpieniem do rezerwacji wizyty na dowolną Usługę. Przystąpienie przez Pacjenta do rezerwacji wizyty w Gabinecie jest równoznaczne z akceptacją przez Pacjenta niniejszego Regulaminu.
3. Miejscem udzielania świadczeń zdrowotnych, zgodnie z niniejszym Regulaminem, jest siedziba Usługodawcy: ul. Centralna 33a, 45-940 Opole/Chmielowice, woj. opolskie, Polska
4. Na terenie całego Gabinetu, obowiązuje całkowity zakaz palenia i używania tytoniu oraz wyrobów tytoniowych i nikotynowych, w tym papierosów elektronicznych, jak również obowiązuje całkowity zakaz spożywania napojów alkoholowych oraz innego rodzaju używek i środków odurzających.

§ 2
Definicje
Użyte w niniejszym Regulaminie pojęcia i definicje będą miały następujące znaczenie:
a) Pacjent – oznacza każdą osobę pełnoletnią, osobę niepełnoletnią powyżej 16. roku życia posiadającą pisemną zgodę swojego prawnego opiekuna lub osobę niepełnoletnią poniżej 16. roku życia przebywającą w Gabinecie pod opieką swojego prawnego opiekuna lub osoby przez niego wyznaczonej, która akceptuje niniejszym Regulamin i korzysta z Usługi;
b) Regulamin – oznacza niniejszy Regulamin organizacyjny, ustalony i stosowany przez Usługodawcę;
c) Gabinet – oznacza miejsce udzielania przez Usługodawcę świadczeń zdrowotnych tj. lokal, w którym Usługodawca wykonuje Usługę/Zabieg w rozumieniu niniejszego Regulaminu (Gabinet MIKROSTOMART - Mikroskopowa Stomatologia Artystyczna ul. Centralna 33a 45-940 Opole/Chmielowice, zarządzany przez Usługodawcę, tel: 570 270 470, e-mail: gabinet@mikrostomart.pl);
d) Personel – oznacza każdego pracownika Usługodawcy wykonującego na rzecz Pacjentów Usługi/Zabiegi w Gabinecie. Personel składa się z personelu medycznego i niemedycznego. Zakres obowiązków Personelu został określony w Regulaminie: § 5 ust. 2 dla personelu medycznego i § 5 ust. 3 dla personelu niemedycznego.
e) Usługa/Zabieg – oznacza usługę świadczoną przez Usługodawcę na rzecz Pacjenta, określoną w § 5 ust. 1 niniejszego Regulaminu;
f) Usługodawca – oznacza Podmiot leczniczy tj. Spółkę ELMAR SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ z siedzibą w Opolu, ul. Centralna nr 33A, 45-940 Opole, NIP:7543251709.

§ 3
Cele i zadania Usługodawcy
1. Podstawowym celem Usługodawcy jest udzielanie świadczeń zdrowotnych przez osoby do tego uprawnione na podstawie przepisów prawa. Personel zatrudniony przez Usługodawcę dzieli się na personel medyczny i niemedyczny.
2. Do podstawowych zadań Usługodawcy należy świadczenie Usług stomatologicznych opisanych w § 5 ust. 1 poniżej. Należy wśród nich wyszczególnić:
- udzielanie Pacjentom indywidualnych porad i konsultacji stomatologicznych,
- diagnostyka oraz leczenie schorzeń uzębienia Pacjentów, w tym diagnostyka RTG,
- wykonywanie zabiegów chirurgicznych uzębienia Pacjentów,
- współdziałanie z innymi podmiotami wykonującymi działalność leczniczą na podstawie odrębnych umów,
- działania edukacyjne, promocja zdrowia i działania mające na celu profilaktykę zdrowia,
- prowadzenie spraw administracyjnych, ekonomicznych i obsługi technicznej Gabinetu.

§ 4
Struktura organizacyjna Usługodawcy
1. Usługodawca jako Podmiot leczniczy prowadzi swoją działalność w ramach Gabinetu.
2. Usługodawcą jest Spółka ELMAR SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ z siedzibą w Opolu, ul. Centralna nr 33A, 45-940 Opole, NIP:7543251709, KRS: 0000815074 reprezentowana przez Zarząd w składzie Marcin Nowosielski i Elżbieta Nowosielska. Każdy z członków Zarządu jest uprawniony jednoosobowego reprezentowania podmiotu oraz składania za podmiot oświadczeń woli w zakresie praw i obowiązków majątkowych spółki Usługodawcy.
3. Komórki organizacyjne Usługodawcy w ramach Gabinetu:
a) recepcja, obsługiwana przez personel niemedyczny;
b) pracownia implantologii, protetyki, endodoncji, pedodoncji, anestezji, periodontologii, ortodoncji, chirurgii,
h) pracownia RTG.
4. Zadaniem recepcji jest realizacja obowiązków personelu niemedycznego zgodnie z postanowieniami niniejszego Regulaminu.
5. Zadaniem pracowni implantologii, protetyki, endodoncji, pedodoncji, anestezji, periodontologii, ortodoncji, chirurgii jest: udzielanie świadczeń zdrowotnych specjalistycznych z zakresu stomatologii, prowadzenie dokumentacji medycznej, informowanie o zakresie i zasadach udzielania świadczeń zdrowotnych przez Usługodawcę.
6. Zadaniem pracowni RTG jest: prowadzenie wyspecjalizowanej diagnostyski przy wykorzystaniu promieniowania rentgenowskiego.

§ 5
Zakres udzielanych świadczeń zdrowotnych
1. Usługodawca świadczy usługi stomatologiczne w zakresie:
a) implantologii,
b) protetyki,
c) endodoncji,
d) pedodoncji,
e) anestezji,
f) periodontologii,
g) chirurgii,
h) ortodoncji
i) diagnostyki RTG
2. Do podstawowego zakresu obowiązków personelu medycznego zatrudnionego przez Usługodawcę w Gabinecie należy:
a) przeprowadzanie z Pacjentem wywiadu lekarskiego i wywiadu stomatologicznego,
b) rzetelne oraz zgodne z najnowszą wiedzą medyczną udzielanie świadczeń zdrowotnych na najwyższym poziomie,
c) przestrzeganie praw Pacjenta,
d) stałe podnoszenie kwalifikacji zawodowych,
e) rzetelne oraz systematyczne prowadzenie kompleksowej dokumentacji medycznej,
f) zachowanie w tajemnicy wszystkich informacji związanych z udzielaniem świadczeń zdrowotnych,
g) nadzorowanie pracy asystentki,
h) zapewnienie Pacjentowi intymności podczas Zabiegu,
i) sterylizacja narzędzi,
j) utrzymywanie porządku i sterylności Gabinetu,
k) zaopatrywanie Gabinetu w materiały stomatologiczne,
l) dbanie o dobry wizerunek Usługodawcy, także w kontaktach zewnętrznych,
m) przestrzeganie obowiązujących przepisów prawa, zasad BHP i ppoż,
n) przestrzeganie postanowień niniejszego Regulaminu.
3. Do podstawowego zakresu obowiązków personelu niemedycznego zatrudnionego przez Usługodawcę w Gabinecie należy:
a) umawianie Pacjentów i prowadzenie rezerwacji wizyt w Gabinecie,
b) archiwizacja dokumentów, w tym dokumentacji medycznej Pacjentów,
c) rozliczanie Pacjentów za wykonane Usługi,
d) zachowanie w tajemnicy wszystkich informacji związanych ze świadczeniem Pacjentom Usług, w szczególności informacji dotyczących stanu zdrowia Pacjentów, przebytych przez Pacjentów Zabiegów oraz innych informacji zawartych w dokumentacji medycznej Pacjentów. Powyższe nie dotyczy oferty Usługodawcy, która jest informacją jawną i opublikowaną na stronie internetowej Usługodawcy, profilach Usługodawcy na portalach społecznościowych, w ulotkach reklamujących Usługi Usługodawcy lub w innej formie w środkach masowego przekazu,
o) przestrzeganie obowiązujących przepisów prawa, zasad BHP i ppoż,
p) przestrzeganie postanowień niniejszego Regulaminu.

§ 6
Organizacja i przebieg udzielania świadczeń zdrowotnych
1. Usługodawca oferuje w ramach poradni usługi stomatologiczne na na zasadzie pełnej odpłatności za spełniane świadczenia zdrowotne. Usługodawca w Gabinecie Stomatologicznym Mikrostomart prowadzi praktyką prywatną i nie udziela świadczeń w ramach świadczeń z Narodowego Funduszu Zdrowia.
2. Realizacja świadczeń zdrowotnych następuje na zasadzie dobrowolności wyboru leczenia odpłatnego przez Pacjenta i za jego pisemną zgodą.
3. Przyjęcie Pacjenta do Gabinetu wymaga prowadzenia jego dokumentacji medycznej, oraz dokumentacji statystycznej. Dokumentacja jest prowadzona również w systemie elektronicznym.
4. Każdemu Pacjentowi przez pierwszą wizytą w Gabinecie zakłada się kartę rejestracyjną. Każda wizyta Pacjenta w Gabinecie musi być zapisana w dokumentacji medycznej.
5. Przy pierwszej wizycie Personel przeprowadza z Pacjentem Wywiad Lekarski Podstawowy (Internistyczny) oraz Wywiad Stomatologiczny. Wywiad wymaga uaktualniania przy kolejnych wizytach w Gabinecie. W przypadku niepodania przez Pacjenta do wywiadu pełnych danych Usługodawca nie ponosi odpowiedzialności za jakiekolwiek następstwa wynikające z takowego zatajenia.
6. Pacjent posiadający pełną zdolność do czynności prawnych, przedstawiciel ustawowy bądź opiekun prawny wyraża pisemna zgodę na realizację świadczeń zdrowotnych przez Usługodawcę (dotyczy zabiegów chirurgicznych, wszystkich innych zabiegów o charakterze inwazyjnym oraz podania Pacjentowi środka znieczulającego).
7. Dopuszcza się wyrażenie przez Pacjenta zgody na leczenie w formie pisemnej jedynie w sytuacjach wymagających nagłego podjęcia czynności medycznych w ramach leczenia podstawowego lub zachowawczego. Za dowód wyrażenia zgody w takich przypadkach uznaje się poddanie przez Pacjenta proponowanemu leczeniu.
8. Odmowa Pacjenta poddania się leczeniu, w razie stwierdzenia niezwłocznej potrzeby leczenia przez Personel, podlega wpisowi do karty Pacjenta i powinna być przez niego potwierdzona.
9. Dokumentacja medyczna prowadzona jest na zasadach określonych w przepisach odbrębnych.
10. Usługodawca w Gabinecie utrwala audiowizualnie przebieg każdej wizyty, na co Pacjent wyraża zgodę. Niewyrażenie zgody Pacjenta w tym zakresie jest równoznaczne z odmową poddania się wykonania Zabiegowi. Nagranie takie chronione jest zgodnie z zasadami przetwarzania danych osobowych i nie może być wykorzystywane bez zgody Pacjenta poza sytuacjami wynikającymi z przepisów powszechnie obowiązujących.
11. Pacjent przyjmuje do wiadomości, że z przyczyn losowych niezależnych od Usługodawcy, godzina umówionej w Gabinecie wizyty może ulec zmianie (opóźnieniu). W takiej sytuacji Pacjentowi nie przesługuje żadna rekompensata od Usługodawcy.
12. W sytuacji, że planowana Usługa nie może być zrealizowana przez członka personelu medycznego, do którego Pacjent został umówiony, możliwe jest jej wykonanie przez innego członka personelu medycznego zatrudnionego przez Usługodawcęw Gabinecie, za uprzednią zgodą pacjenta.
13. Zgoda Pacjenta na zmianę członka personelu medycznego nie jest wymagana w razie zaistnienia przypadku wymagającego nagłego podjęcia czynności medycznych w ramach leczenia podstawowego lub zachowawczego, o których mowa w ust. 7 powyżej. Wówczas Pacjent wyraża jedynie zgodę na samo wykonanie takiej czynności medycznej na zasadach określowych w ww. § 4 ust. 7 Regulaminu.

§ 7
Standardy Higieniczne
1. Personel zatrudniony przez Usługodawcę ściśle przestrzega wymogów sanitarnych w zakresie utrzymania porządku i obowiązku dezynfekcji powierzchni w Gabinecie.
2. Pracownicy Usługodawcy podczas wykonywania zabiegów używają rękawiczek jednorazowych, a jeżeli zabieg tego wymaga również maseczek jednorazowych.
3. Narzędzia używane podczas Zabiegów są jednorazowe. W przypadku konieczności użycia narzędzi wielorazowych, są ona każdorazowo po użyciu poddawane sterylizacji w autoklawie, który Usługodawca posiada na wyposażeniu Gabinetu.
4. Do sterylizacji, dezynfekcji i czyszczenia używane są wyłącznie środki dopuszczone do stosowania w gabinetach dentystycznych.

§ 8
Prawa i obowiązki Pacjentów
1. Każdy Pacjent ma prawo:
a) uzyskania przystępnej informacji o swoim stanie zdrowia pod względem stomatologicznym, proponowanym leczeniu (plan leczenia) oraz rokowaniu,
b) do świadczeń zdrowotnych odpowiadającym najnowszym wymaganiom wiedzy medycznej udzielanych przez wyspecjalizowany i kompetentny personel medyczny posiadający odpowiednie kwalifikacje zawodowe,
c) wyrażenia zgody, lub jej odmowy na świadczenie określonego Zabiegu po uzyskaniu odpowiedniej informacji na temat świadczenia,
d) wglądu w dokumentację medyczną dotyczącą jego leczenia, oraz uzyskania kopii dokumentacji medycznej osobiście, lub przez upoważnioną do tego na piśmie osobę,
e) poszanowania godności oraz uprzejmego traktowania przez Personel,
f) możliwości rejestracji telefonicznej oraz internetowej,
g) decydowania jakim osobom lekarz prowadzący może udzielić informacji o stanie zdrowia Pacjenta oraz udostępnienia dokumentacji, chyba że z przepisów prawa powszechnie obowiązującego wynika inaczej,
h) wskazania osoby lub instytucji, którą Personel obowiązany jest powiadomić o wystąpieniu stanu zdrowia zagrażającego życiu Pacjenta lub w razie śmierci Pacjenta.
2. Uprawnienia Pacjentów wymienione w ust. 1 powyżej mogą być ograniczone wyłącznie w zakresie i sytuacjach wynikających z przepisów prawa powszechnie obowiązującego.
3. Każdy Pacjent jest zobowiązany do:
a) przestrzegania zaleceń lekarzy lub innego personelu medycznego zatrudnionego przez Usługodawcę w Gabinecie. W przypadku nieprzestrzegania zaleceń i wskazań lekarskich, w szczególności dotyczących postępowania przed- i pozabiegowego, Pacjent ponosi wszelkie ryzyko z tym związane,
b) przestrzegania zasad BHP oraz ppoż na terenie Gabinetu Usługodawcy i w bezpośrednim jego sąsiedztwie,
c) w przypadku konieczności odwołania umówionej wizyty u Usługodawcy w Gabinecie - poinformowania o tym fakcie Personelu z co najmniej jednodniowym wyprzedzeniem.
4. Urządzenia i sprzęt znajdujący się na wyposażeniu Gabinetu Usługodawcy mogą być obsługiwane wyłącznie przez Personel. W przypadku nieuprawnionego użycia, urządzeń lub sprzętu znajdującego się na wyposażeniu Gabinetu Usługodawcy, w tym zmiany ich ustawień, przez Pacjenta, Usługodawca może dochodzić od takiego Pacjenta naprawienia szkody z tego wynikłej na zasadach ogólnych.
5. Zabrania się Pacjentom wchodzenia do pomieszczeń przeznaczonych wyłącznie dla Personelu.
6. Pacjenci zobowiązani są do zachowania czystości na terenie Gabinetu Usługodawcy i w jego bezpośrednim sąsiedztwie. Nie wolno Pacjentom oraz osobom im towarzyszącym zanieczyszczać oraz zaśmiecać terenu Gabinetu oraz terenu przyległego.

§ 9
Zasady odpłatności za świadczenia medyczne
1. Wszystkie Zabiegi wykonywane w Gabinecie podlegają opłacie zgodnie z Cennikiem obowiązującym u Usługodawcy. Cennik dostępny jest do wglądu w Gabinecie oraz na stronie internetowej Gabinetu Usługodawcy.
2. Pacjent ma możliwość płatności za Usługi w salonie gotówką, przelewem, kartą, Blikiem lub specjalnym bonem zakupionym w Gabinecie Usługodawcy.
3. W przypadku rejestracji Pacjenta wizytę, Personel pobiera od Pacjenta zadatek w wysokości ustalonej zgodnie z cennikiem, którym mowa w ust. 1 powyżej. Zadatek podlega zaliczeniu na poczet wykonanej Usługi.
4. Jeżeli Pacjent nie stawi się na umówioną wizytę w Gabinecie Usługodawcy i w związku z tym nie dojdzie do wykonania zaplanowanej Usługi, Usługodawca zatrzymuje wpłacony przez Pacjenta zadatek. Jeżeli Pacjent, odwołując wizytę zgodnie z § 6 ust. 3 lit. c) Regulaminu, przełoży jednocześnie wizytę na inny dzień następujący w okresie do 3 miesięcy od daty ostatniej wizyty w Gabinecie lub odbytej w Gabinecie konsultacji i diagnostyki, Usługodawca nie zatrzymuje zadatku, tylko zalicza go na poczet wizyty w nowym terminie. Do nowego terminu wizyty, zdanie pierwsze i drugie niniejszego ustępu stosuje się odpowiednio.
5. W przypadku braku zapłaty przez Pacjenta zadatku, o którym mowa ust. 3 powyżej, jeżeli taki Pacjent nie stawi się na umówioną wizytę, ani nie dokona zmiany terminu tej wizyty zgodnie z postanowieniami niniejszego Regulaminu, zadatek ten zostanie doliczony Pacjentowi do najbliższego rachunku.
6. W przypadku, gdy z przyczyn leżących po stronie Usługodawcy, Pacjent nie może zostać przyjęty w dniu umówionej wizyty Personel informuje go o tym fakcie drogą telefoniczną lub poprzez wiadomość tekstową „SMS” najpóźniej w dniu zaplanowanej wizyty, proponując Pacjentowi jednocześnie przeniesienie wizyty na inny, najbliższy w czasie termin.

§ 10
Skargi i wnioski
1. Pacjentowi przysługuje prawo do reklamacji Usługi.
2. Reklamację należy złożyć na piśmie drogą mailową, osobiście w Gabinecie lub listem poleconym, maksymalnie 3 dni od jej wykonania lub wystąpienia powikłań wywołanych Zabiegiem.
3. Usługodawca ma 14 dni kalendarzowych na rozpatrzenie reklamacji. W przypadku pozytywnego rozpatrzenia reklamacji, Usługodawca spełni żądania klienta.
4. Pacjent ma prawo żądać zwrotu całości lub części kosztów Usługi albo wykonania nieodpłatnych poprawek, jeżeli reklamacja zostanie uznana za zasadną.
5. W przypadku odpowiedzi odmownej, Pacjent ma prawo odwołać się od tej decyzji w ciągu 14 dni kalendarzowych. Na rozpatrzenie odwołania Usługodawca ma 14 dni kalendarzowych.
6. Pacjent nie ma prawa odmówić zapłaty za wykonaną Usługę.
7. Usługodawca ani Personel nie ponoszą odpowiedzialności za powikłania, które wystąpią po poprawnie przeprowadzonej Usłudze, poprzedzonym poprawnie przeprowadzonym wywiadem, w którym nie stwierdzono przeciwwskazań do jej wykonania. Ponadto Usługodawca ani Personel nie ponoszą odpowiedzialności za powikłania powstałe w wyniku nieprzestrzegania przez Pacjenta zaleceń przed- i pozabiegowych.

§ 11
Dane osobowe
Dane osobowe Pacjenta przetwarzane są zgodnie z treścią i w celach wskazanych w klauzuli informacyjnej, z którą Pacjent zapoznaje się podczas pierwszej wizyty w Gabinecie Usługodawcy.

§ 12
Postanowienia Końcowe
1. W celu zapewnienia prawidłowości leczenia Pacjentów oraz ciągłości przebiegu procesu udzielania świadczeń zdrowotnych, Usługodawca współdziała z innymi podmiotami wykonującymi działalność leczniczą lub udzielającymi świadczeń zdrowotnych na rzecz tych pacjentów, w szczególności Personel może żądać zaświadczenia o braku przeciwwskazań lekarskich do wskazanej Usługi/Zabiegu. Współdziałanie Usługodawcy z innymi podmiotami wykonującymi działalność leczniczą odbywa się z poszanowaniem obowiązujących przepisów prawa oraz z poszanowaniem praw Pacjenta.
2. Każdy Pacjent ma prawo wglądu do Regulaminu, cennika i certyfikatów, na które powołuje się Usługodawca.
3. Za wszelkie uszkodzenia wyposażenia Usługodawcy w Gabinecie Pacjenci odpowiadają bez ograniczeń zgodnie z art. 415 kodeksu cywilnego. Za uszkodzenia spowodowane przez osoby niepełnoletnie odpowiedzialni są ich ustawowi przedstawiciele.
4. Usługodawca zastrzega sobie prawo do zmian w niniejszym Regulaminie i poinformowania o nich Pacjenta przed zapisem na wizytę, z ważnych przyczyn to jest np.: zmiany przepisów prawa, zmiany sposobów płatności, zmiany w świadczeniu usług – w zakresie, w jakim te zmiany wpływają na realizację postanowień niniejszego Regulaminu. Nowy regulamin wchodzi w życie z dniem wywieszenia go w Gabinecie.
5. Informacja o zmianach Regulaminy zostanie opublikowana na stronie internetowej Gabinetu oraz na profilach Gabinetu w mediach społecznościowych, jeżeli takie są prowadzone, co najmniej 14 dni kalendarzowych przed terminem, w którym zmiany zaczną obowiązywać.
6. Do Usług/Zabiegów zleconych przed dniem wejścia w życie zmian Regulaminu, obowiązują jego postanowienia obowiązujące w chwili umawiania terminu wykonania Usługi/Zabiegu.
7. Wszelkie spory wynikające ze świadczonych Usług winny być w pierwszej kolejności rozwiązywane polubownie. W przypadku niedojścia do porozumienia spory będą rozstrzygane przez sąd właściwy wg przepisów polskiego prawa.
8. Jeżeli którekolwiek z postanowień niniejszego Regulaminu zostałoby uznane za nieważne, niezgodne z przepisami prawa lub niewykonalne, zostanie ono wyłączone z postanowień niniejszego Regulaminu, które to w dalszym ciągu będą obowiązywać w najszerszym, dopuszczalnym przez polskie prawo zakresie.
9. W zakresie nieuregulowanym niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego.
10. Niniejszy Regulamin obowiązuje od 01.01.2025 r.
`}
                </p>
            </div>
        </main>
    );
}
