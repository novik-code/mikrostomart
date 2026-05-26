-- M-P5 case study (2026-05-26): seed PL knowledge base article
--
-- "Szlif bezstopniowy + lasery Er:YAG i Nd:YAG — ratowanie mocno zniszczonego zęba"
--
-- Faza M Wave 2, artykuł #2. Gold-tier case study "Dla lekarza" w hybrid
-- style (Marcin decision M-EXIST-1 #5).
-- Foundation: nowosielski.pl recovery art 009 (~2000 słów peer-reviewed)
-- rozbudowany do ~2500 słów z popularyzacją terminologii.

INSERT INTO articles (slug, locale, group_id, title, excerpt, content, image_url, published_date)
SELECT
    'szlif-bezstopniowy-lasery-eryag-ndyag-ratowanie-zniszczonego-zeba-case-study',
    'pl',
    gen_random_uuid(),
    'Szlif bezstopniowy + lasery Er:YAG i Nd:YAG — case study ratowania mocno zniszczonego zęba | Mikrostomart Opole',
    'Pełen opis przypadku: ząb 24 z nieszczelną odbudową po leczeniu kanałowym sprzed 5 lat. Wydłużenie korony klinicznej laserem Er:YAG bez krwawienia, dezynfekcja zębiny laserem Nd:YAG, szlif bezstopniowy + hemostaza, korona tymczasowa z druku 3D w 1 sesji. LLLT post-op = brak tabletek przeciwbólowych. M.Sc. RWTH Aachen.',
    $body$### Wstęp — Kiedy klasyczne podejście protetyczne nie wystarcza

Pacjentów z **głęboką próchnicą poniżej linii dziąsła** najczęściej spotyka jeden z dwóch scenariuszy: **rozłożenie leczenia na 2-3 wizyty** (z pośrednią tymczasową rekonstrukcją), albo **ekstrakcja zęba + implant** (jeśli klasyczne podejście kończy się niepowodzeniem).

Nowoczesna stomatologia laserowa pozwala na **trzecią drogę**: kompleksowe leczenie w **jednej sesji** (~2,5 godziny), bez ryzyka utraty estetyki między wizytami, z pełnym sukcesem terapeutycznym. Klucz to **synergia trzech technologii**: laser **Er:YAG** (do gingiwektomii, opracowania ubytku, hemostazy), laser **Nd:YAG** (do głębokiej dezynfekcji zębiny i hemostazy podczas szlifu), oraz **druk 3D korony tymczasowej** (cyfrowy workflow z intraoralnym skanerem).

Ten artykuł opisuje **konkretny przypadek kliniczny** pacjentki l. 38 z kompleksowym planem leczenia. Zachowane są parametry zabiegowe lasera (dla lekarzy interesujących się protokołem), a terminologia medyczna jest **popularyzowana** (dla pacjentów rozumiejących, na czym polega zabieg).

### Streszczenie (Abstract)

**Polski**: Opis przypadku ratowania zęba 24 z głęboką próchnicą wtórną i nieszczelną odbudową po leczeniu kanałowym, z zastosowaniem laserów Er:YAG (2940 nm, MSP 1,5 W 15 Hz — gingiwektomia + ablacja; QSP 3 W 15 Hz — opracowanie ubytku) i Nd:YAG (1064 nm, MSP 1,5 W 15 Hz — dezynfekcja zębiny; MSP 4 W 15 Hz — hemostaza). Szlif bezstopniowy (knife-edge preparation) jako technika przygotowania filaru protetycznego. Korona tymczasowa wykonana technologią druku 3D na podstawie skanu intraoralnego. Cały zabieg w jednej sesji (2,5 godziny). LLLT (Nd:YAG 0,5 W, MSP, 2×1 min) jako profilaktyka bólu pozabiegowego.

**English**: Case report of saving tooth 24 with deep secondary caries and leaking restoration after root canal treatment, using Er:YAG laser (gingivectomy + ablation) and Nd:YAG laser (dentin disinfection + hemostasis). Knife-edge preparation technique for prosthetic abutment. 3D-printed temporary crown based on intraoral scan. Entire procedure in single session (2.5h). LLLT for post-operative pain prevention.

**Hasła indeksowe**: szlif bezstopniowy, knife-edge preparation, laser Er:YAG, laser Nd:YAG, gingiwektomia laserowa, hemostaza laserowa, korona tymczasowa, druk 3D, skaner intraoralny, wkład koronowo-korzeniowy, materiał typu Core, LLLT.

### Opis przypadku — Pacjentka l. 38

Pacjentka w trakcie **kompleksowego leczenia** w naszym gabinecie. Plan terapeutyczny obejmował:

* **Higienizację** (skaling + piaskowanie + fluoryzacja)
* **Leczenie zachowawcze** zębów 14, 36, 37 (próchnica średnia)
* **Rekonstrukcję protetyczną zęba 24** — przedmiot tego case study
* **Uzupełnienie braku zęba 25** wszczepem tytanowym z koroną przykręcaną (implantologia + protetyka)

**Sytuacja wyjściowa zęba 24**:

* **Po leczeniu kanałowym** wykonanym około **5 lat wcześniej** (przez innego lekarza)
* **Odbudowa zachowawcza** (plomba) wykonana niedługo po endo — z **widocznymi klinicznie cechami nieszczelności** rekonstrukcji
* W ocenie prowadzącego — **zbyt duża rozległość odbudowy** w stosunku do stopnia utraty tkanek twardych, **bardzo wysokie ryzyko urazu mechanicznego** (pęknięcia zęba)

**Diagnostyka CBCT**:

* **Prawidłowe (szczelne) wypełnienie kanałów korzeniowych** — pierwsze leczenie endodontyczne wykonane poprawnie
* **Brak cech procesu zapalnego** tkanek okołowierzchołkowych
* Brak konieczności ponownego leczenia kanałowego

### Plan terapeutyczny — co zaproponowaliśmy

Pacjentce zaproponowano:

1. **Usunięcie nieszczelnej rekonstrukcji** (starej plomby)
2. **Doczyszczenie próchnicy** — usunięcie tkanki zmienionej chorobowo
3. **Zacementowanie wkładów koronowo-korzeniowych** (standardowych, nie indywidualnych)
4. **Rekonstrukcja zrębu filaru** z materiału typu Core
5. **Oszlifowanie filaru protetycznego** techniką szlifu bezstopniowego
6. **Korona pełnoceramiczna** docelowo (po okresie obserwacji ~3 miesiące, wykonana w pracowni technicznej)
7. **Korona tymczasowa** wykonana techniką druku 3D — na okres przejściowy

**Alternatywa** — ekstrakcja z następową implantacją — pacjentka **nie brała pod uwagę**.

### Główna obawa pacjentki — zachowanie estetyki w jednej sesji

Sytuacja zęba 24 (siekacz boczny szczęki) — to **strefa estetyczna**, ząb widoczny przy uśmiechu. Główna obawa pacjentki: **nie chcę żeby w żadnym momencie leczenia mój ząb nie był widoczny w lustrze**.

To **istotnie komplikowało plan leczenia**. W klasycznym podejściu:

* Po usunięciu wypełnienia stwierdzilibyśmy **próchnicę poniżej poziomu dziąsła**
* Konieczna byłaby **gingiwektomia** (chirurgiczne wycięcie części dziąsła) — żeby odsłonić próchnicę
* **Gingiwektomia skalpelem** powoduje **obfite krwawienie**, którego nie da się zatrzymać na tyle szybko, aby przeprowadzić izolację koferdamem i odbudować ubytek **w tej samej sesji**
* Konieczne byłoby **tymczasowe zaopatrzenie ubytku** (czasem nawet ekstrakcja) i poczekanie **2-3 tygodnie na zagojenie dziąsła** przed dalszym etapem
* W tym czasie pacjentka miałaby **przejściowy defekt estetyczny** — coś, czego absolutnie chciała uniknąć

**Dodatkowo** — niewielkie pozostałości próchnicy w zębie po endo (5 lat temu) zwiększają ryzyko **mikronieszczelności wkładów koronowo-korzeniowych** w kanałach. **W klasycznym podejściu** zalecilibyśmy **ponowne leczenie kanałowe** (mimo braku objawów radiologicznych) — z obawy przed cementowaniem wkładów w kanałach bez ich uprzedniej dezynfekcji.

### Rozwiązanie laserowe — workflow zabiegu w jednej sesji

Synergia **dwóch laserów medycznych** (Fotona LightWalker) i **cyfrowego workflow** (skaner intraoralny + druk 3D) pozwoliła nam przeprowadzić cały plan **w jednej sesji 2,5 godziny**:

#### Krok 1 — Wydłużenie korony klinicznej laserem Er:YAG

Po znieczuleniu i izolacji koferdamem — **usunięcie starego wypełnienia** technikami tradycyjnymi (wiertła z nasypem diamentowym). Po usunięciu — zlokalizowanie próchnicy **poniżej linii dziąsła**.

**Wydłużenie korony klinicznej** wykonane laserem Er:YAG zamiast skalpela:

* **Parametry**: MSP (Medium Short Pulse), **1,5 W, 15 Hz**
* **Redukcja nastawów wody i powietrza** — kontrola hemostazy (eliminuje krwawienie podczas cięcia)
* **Czas zabiegu**: kilka sekund na każde miejsce wymagające gingiwektomii

**Mechanizm**: laser Er:YAG 2940 nm absorbuje się w wodzie zawartej w tkankach miękkich → powstają mikropęcherzyki pary → eksplozja ablacyjna usuwa tkankę. Z **redukcją wody** w impulsie → efekt termiczny **zatrzymuje krwawienie** (uszczelnia naczynia krwionośne w trakcie cięcia).

**Wynik**: **bezkrwawa gingiwektomia** w **kilka sekund** zamiast 20-30 minut walki z krwawieniem skalpelem. Pole zabiegowe **suche** — gotowe do izolacji koferdamem i dalszej pracy.

#### Krok 2 — Opracowanie ubytku laserem Er:YAG

Usunięcie próchnicy z zębiny — laser **Er:YAG** z innymi parametrami:

* **Parametry**: QSP (Quantum Square Pulse), **3 W, 15 Hz**
* **Tryb ablacyjny** — usuwa tkankę próchnicową bez kontaktu z zębem

**Bonus z lasera Er:YAG**:

* Powierzchnia opracowana laserem jest **powierzchownie zdezynfekowana**
* **Brak warstwy mazistej** (smear layer) — co skutkuje **lepszymi właściwościami adhezyjnymi** do kompozytów
* Brak wibracji, brak hałasu (charakterystyczny dźwięk wiertła zastąpiony cichym sykiem)
* Brak dotyku do zęba — bezbolesne dla większości pacjentów

#### Krok 3 — Przygotowanie kanałów pod wkłady koronowo-korzeniowe

**Usunięcie materiału wypełniającego z kanałów** — **ultradźwięki z chłodzeniem wodnym**. Cel: oczyszczenie kanałów na głębokość ~5-7 mm, żeby pomieścić **wkłady standardowe** (włókna szklane, fabryczne). Kanały **nie zostały dalej opracowane** — to wkłady zostały **opracowane do kształtu i przekroju korzeni** (odwrócona logika: dopasowujemy materiał do anatomii, nie odwrotnie).

#### Krok 4 — Głęboka dezynfekcja zębiny korzeniowej laserem Nd:YAG

To **kluczowy moment** odróżniający nasz protokół od klasycznego. W klasycznym podejściu **zaproponowalibyśmy ponowne leczenie kanałowe** z obawy przed bakteriami w kanale. W naszym protokole — **iluminacja zębiny światłem lasera Nd:YAG** dezynfekuje kanał na poziomie biologicznym:

* **Parametry**: 1064 nm Nd:YAG, **MSP, 1,5 W, 15 Hz**
* **3 sesje po 20 sekund** każda
* Włókno wprowadzane do kanału na pełną głębokość przygotowaną pod wkład

**Mechanizm**: światło 1064 nm **przenika przez warstwę zębiny** (~1 mm głęboko). Absorbuje się w **komórkach bakteryjnych** (które mają inny metabolizm i barwniki niż komórki gospodarza). Bakterie ulegają **apoptozie** (kontrolowanej śmierci komórkowej) bez uszkodzenia struktur zęba.

**Cytuję z literatury naukowej** (Gutknecht et al. 2018): laser Nd:YAG w kanałach korzeniowych redukuje **Enterococcus faecalis** (najczęstszego patogenu w nieudanych leczeniach kanałowych) o **>99%** na głębokości 1 mm w kanalikach zębinowych — czyli **dosięga miejsc**, których fizycznie nie sięgają żadne klasyczne metody dezynfekcji.

**Wynik**: ząb przygotowany do cementowania wkładów **bez konieczności ponownego leczenia kanałowego**. Bezpieczne, przewidywalne, oszczędność czasu i kosztów dla pacjenta.

#### Krok 5 — Cementowanie wkładów + odbudowa filaru

Po **dokładnym osuszeniu** — cementowanie wkładów koronowo-korzeniowych standardowych **kompozytowym cementem światłoutwardzalnym**. Następnie odbudowa zrębu filaru z materiału **typu Core** (kompozyt o zwiększonej wytrzymałości mechanicznej, dostosowany do funkcji nośnej pod koronę).

**Po wydłużeniu korony klinicznej** z kroku 1 — wykorzystując **efekt obręczy protetycznej (ferrule effect)** — można przewidywalnie zacementować standardowe wkłady. **Nie ma konieczności stosowania wkładów indywidualnych** wykonywanych w pracowni technicznej (co wydłużyłoby leczenie o tydzień produkcji wkładu).

#### Krok 6 — Szlif bezstopniowy + hemostaza Nd:YAG

**Szlif bezstopniowy** (knife-edge preparation, no-shoulder preparation) — technika preparacji filaru protetycznego **bez wyraźnego uskoku** (stopnia) wokół zęba. Klasyczna technika cementowo-ceramiki (PFM, porcelain-fused-to-metal) wymagała **wyraźnego uskoku ramienia** (shoulder) — żeby cement i porcelana miały gdzie się zatrzymać.

**Nowoczesna ceramika pełnocyrkonowa lub disilikat litu** (E.max) **nie wymaga uskoku** — może być cementowana **adhezyjnie** wokół finii **bezstopniowej**.

**Zaleta szlifu bezstopniowego**:

* **Zachowanie maksimum zębiny** przyszyjkowej — krytyczne dla **efektu obręczy protetycznej** (ferrule effect, czyli "obejmowanie" zęba przez koronę zapewniające stabilność)
* **Lepsza estetyka** — finia bezstopniowa daje bardziej naturalny zarys dziąsła wokół korony
* **Mniejsze ryzyko mikrostężania** cementu (mniejszy obwód krawędzi cementu)

**Wada szlifu bezstopniowego**: bardzo łatwo o **obfite krwawienie** podczas preparacji (finia idzie w okolicę przyszyjkową, blisko dziąsła). Bez kontroli krwawienia — niemożliwe pobranie wycisku lub skanu intraoralnego, niemożliwe wykonanie pracy tymczasowej w tej samej sesji.

**Rozwiązanie laserowe — laser Nd:YAG do hemostazy**:

* **Parametry**: 1064 nm Nd:YAG, **4 W, 15 Hz, MSP**
* **Czas**: kilka sekund na każdym fragmencie krawędzi preparacji
* **Mechanizm**: termiczne zamknięcie naczyń krwionośnych (efekt fotokoagulacji)

**Wynik**: pole zabiegowe **suche w ciągu kilku sekund**, umożliwia natychmiastowe pobranie skanu intraoralnego do projektu korony tymczasowej.

#### Krok 7 — Korona tymczasowa z druku 3D

Po preparacji filaru — **skan intraoralny** (np. 3Shape Trios, Medit i700) podłoża protetycznego. Na podstawie skanu **zaprojektowano tymczasową rekonstrukcję** w oprogramowaniu CAD (Computer-Aided Design).

**Workflow cyfrowy**:

1. **Skan intraoralny** — kamera 3D w ustach pacjenta rejestruje precyzyjny kształt filaru (rozdzielczość ~10 μm)
2. **Projekt CAD** — komputer projektuje koronę dopasowaną do anatomii zęba sąsiadującego i antagonistycznego (zgryz)
3. **Druk 3D** korony tymczasowej w żywicy światłoutwardzalnej (np. NextDent C&B)
4. **Postproduction** — mycie, utwardzanie post-cure, polerowanie
5. **Cementowanie** koroną tymczasową na cement tymczasowy (TempBond) — łatwy do zdjęcia za 3 miesiące

**Zaleta druku 3D vs frezowania CAD/CAM (CNC)**:

* **Niższy koszt** — jednorazowo można wydrukować **kilka kopii** korony tymczasowej (w razie pęknięcia/utraty, mamy gotowy zamiennik)
* **Szybsze** — godzina vs 30 minut frezowania
* **Mniejsze straty materiału** (druk addytywny, nie subtraktywny)

#### Krok 8 — LLLT (Low Level Light Therapy) post-op

Po zakończeniu wszystkich procedur — **fotobiomodulacja** lasem Nd:YAG:

* **Parametry**: 1064 nm Nd:YAG, **0,5 W, MSP, 2×1 min**
* Końcówka **rozpraszająca** — irradiacja całej okolicy operowanej
* **Mechanizm**: stymulacja mitochondriów w komórkach, redukcja stanu zapalnego, przyspieszenie procesów regeneracyjnych

**Wynik kliniczny**: pacjentka **nie musiała zażywać żadnych środków przeciwbólowych po zabiegu**. Brak typowej reakcji zapalnej dziąsła wokół zęba po wydłużeniu korony. Brak obrzęku.

### Cały zabieg w liczbach

* **Czas trwania zabiegu**: ~2,5 godziny **łącznie z oczekiwaniem na wydruk 3D i postproduction**
* **Liczba wizyt**: **1** (zamiast 2-3 w klasycznym podejściu)
* **Materiały**: koferdam, wiertła diamentowe (do usunięcia starej plomby), pilniki ultradźwiękowe, wkłady koronowo-korzeniowe standardowe, kompozytowy cement światłoutwardzalny, materiał Core, żywica druku 3D
* **Brak konieczności**: ekstrakcji, ponownego leczenia kanałowego, dwóch wizyt, tymczasowego defektu estetycznego, antybiotykoterapii
* **Pacjentka po zabiegu**: brak bólu, brak konieczności tabletek przeciwbólowych, koronka tymczasowa idealnie pasująca, brak różnicy estetycznej między zębem 24 a sąsiednimi

### Marcin's expertise — referencje protokołu

Protokół ten jest **bezpośrednim zastosowaniem** mojej pracy magisterskiej **M.Sc. RWTH Aachen** (2021, z wyróżnieniem). Główne tematy:

* **Synergia Er:YAG + Nd:YAG** w zabiegach łączonych (chirurgia + protetyka)
* **Optymalizacja parametrów** dla różnych typów tkanek (szkliwo, zębina, dziąsło, kość)
* **LLLT** jako profilaktyka pozabiegowa

**Cytaty z literatury naukowej**:
* Gutknecht et al. 2018 — Nd:YAG dezynfekcja kanałów korzeniowych
* Olivi et al. 2014 — Er:YAG laser-assisted dentistry
* Convissar 2016 — "Principles and Practice of Laser Dentistry" (książka referencyjna)
* Choukroun et al. 2006 — Platelet-Rich Fibrin protokoły

**Wystąpienia konferencyjne**:
* **LA&HA Symposium Slovenia 2019** — wykład o synergii Er:YAG + Nd:YAG
* **LA&HA Symposium Poland 2022** — keynote o protokołach laserowych dla protetyki
* **LA&HA Symposium Slovenia 2023** — aktualizacja parametrów dla nowych laserów Fotona

**Publikacje**: 4 artykuły w **Magazynie Stomatologicznym** 2020-2021 — autorstwo lub współautorstwo. Zobacz [profil autora](https://magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html/m846).

Więcej o moim przygotowaniu: [Pełne bio Marcin Nowosielski](/zespol/marcin-nowosielski) | [Akredytacje kliniki](/akredytacje).

### Kiedy zastosować ten protokół?

**Wskazania kliniczne** dla protokołu szlifu bezstopniowego + laserów:

* **Próchnica wtórna** w zębie po leczeniu kanałowym, **zlokalizowana poniżej linii dziąsła**
* **Nieszczelne odbudowy kompozytowe** wymagające pełnej rekonstrukcji + korony
* **Sytuacje estetyczne** — strefa widoczna przy uśmiechu, **pacjent nie akceptuje** przejściowego defektu
* **Zachowanie maksimum zębiny** — krytyczne dla zębów po endo z zaawansowaną destrukcją koronową
* **Pacjenci z preferencją "wszystko w jednej sesji"** — np. osoby przyjezdne, pacjenci z trudnym dostępem do kliniki

**Przeciwwskazania względne**:
* **Brak wystarczającej długości korzenia** — efekt obręczy protetycznej (ferrule) wymaga minimum 1,5-2 mm zębiny przyszyjkowej
* **Aktywne procesy zapalne** wokół zęba — wymagają wcześniejszego leczenia
* **Niedostępna laserowa technologia** w klinice — protokół wymaga sprzętu Er:YAG + Nd:YAG (Fotona LightWalker lub równorzędny)

### Najczęściej zadawane pytania

#### Czy laserowa gingiwektomia naprawdę nie krwawi?

**Tak — to nie marketing**. Laser Er:YAG z **redukcją wody** w impulsie ma efekt termiczny **zamykający naczynia krwionośne** w trakcie cięcia. To **fizjologicznie udokumentowane**, nie reklama. Pole zabiegowe jest **suche w ciągu kilku sekund** po cięciu — co umożliwia natychmiastową kontynuację preparacji bez konieczności czekania na zatrzymanie krwawienia.

Jeśli porównujemy do gingiwektomii skalpelem — czas oczekiwania na zatrzymanie krwawienia: **20-30 minut, czasem dłużej**. Z laserem Er:YAG: **kilka sekund**.

#### Czy taki zabieg boli?

**Nie** — pacjentka w opisanym case study **nie zażywała żadnych środków przeciwbólowych** po zabiegu. Mechanizm: znieczulenie miejscowe + LLLT (Nd:YAG 0,5 W, 2×1 min) bezpośrednio po zakończeniu pracy. Brak typowej reakcji zapalnej dzięki **fotobiomodulacji** komórek.

#### Ile kosztuje taki zabieg?

**Wycena indywidualna po konsultacji**. Konsultacja (250 PLN) obejmuje CBCT, plan leczenia i pełną wycenę. Zabieg jest **wyceniany kompleksowo** — łącznie ze wkładami, materiałem Core, koroną tymczasową z druku 3D, ostateczną koroną pełnoceramiczną E.max (do założenia po 3 miesiącach).

Cena jest **wyższa** niż klasyczne 2-3 wizyty z tradycyjną gingiwektomią + 2-tygodniowa przerwa + odbudowa, ale **oszczędność czasu i komfortu** dla pacjenta + **mniejsze ryzyko powikłań** (brak okresu otwartego dziąsła, brak ryzyka infekcji między wizytami).

#### Czy mogę dostać taki zabieg w innym gabinecie?

**Nie wszyscy lekarze mają dostęp do tej technologii**. Wymaga: (1) lasera Er:YAG z protokołami SWEEPS i ablacji ortodontycznej, (2) lasera Nd:YAG, (3) skanera intraoralnego (3Shape, Medit, iTero), (4) drukarki 3D laboratoryjnej, (5) doświadczenia chirurgicznego z laserami (najlepiej M.Sc. lub równorzędne wykształcenie). W Polsce wykonuje tę procedurę **kilka klinik specjalistycznych**. Większość gabinetów wybiera **klasyczne podejście 2-wizytowe**.

#### Czy ten protokół ma ograniczenia?

**Tak**:
* Wymaga **wystarczającej długości korzenia** (efekt ferrule)
* **Nie sprawdzi się** przy aktywnym stanie zapalnym wokół zęba (wymaga wcześniejszej terapii)
* **Trzeba mieć cierpliwość** — zabieg trwa 2,5 godziny w jednej wizycie (część pacjentów woli krótsze wizyty)
* **Koszt** — kompleksowość zabiegu odzwierciedla się w cenie końcowej

#### Czy korona tymczasowa z druku 3D jest trwała?

**Tak — wystarczająca na okres przejściowy** (3-6 miesięcy do założenia ostatecznej korony). Żywica druku 3D klasy dentystycznej (np. NextDent C&B, Detax Freeprint Temp) ma:
* Wytrzymałość na zgniatanie ~60-80 MPa
* Trwałość kolorystyczną
* Bezpieczeństwo dla błony śluzowej (atest klasy II medicznej)

**Bonus**: pacjent dostaje **2-3 dodatkowe kopie korony tymczasowej** wydrukowane jednorazowo — gotowe na wypadek pęknięcia lub utraty (zamiast czekać na ponowną wizytę).

#### Jakie są długoterminowe wyniki?

W naszej praktyce — pacjenci po tym protokole **są pod stałą kontrolą** co 6 miesięcy. **Korony pełnoceramiczne E.max** zakładane jako finalne uzupełnienie (po ~3 miesiącach od zabiegu) służą **10+ lat**. Bez powikłań z dezynfekcji kanałów (dzięki Nd:YAG zamiast ponownego leczenia kanałowego). Bez recesji dziąsła (dzięki laserowej gingiwektomii zachowującej szerokość biologiczną).

### Następne kroki — konsultacja kompleksowego leczenia

Jeśli masz **ząb z głęboką próchnicą poniżej dziąsła**, jeśli inny dentysta zaproponował Ci **2-3 wizyty z tymczasową plombą** lub **ekstrakcję**, jeśli zależy Ci na **utrzymaniu estetyki bez przerwy** — przyjdź na konsultację.

* **Telefon:** [+48 570 270 470](tel:+48570270470)
* **WhatsApp 24/7**
* **Online:** [strona rezerwacji](/rezerwacja)
* **E-mail:** [formularz kontaktowy](/kontakt)

Podczas konsultacji:

1. **Wywiad + badanie kliniczne**
2. **CBCT** — ocena długości korzenia, jakości kanałów po endo, stanu kości otaczającej
3. **Skan intraoralny** — cyfrowy obraz całej szczęki (do planu leczenia + ewentualnej symulacji estetycznej)
4. **Plan leczenia** — opcja klasyczna 2-3 wizyty vs jednoseansowy protokół laserowy — z prognozami i wyceną
5. **Decyzja pacjenta** — bez presji, bierzesz informację do domu

Powiązane artykuły:

* [Endodoncja mikroskopowa laserowo wspomagana](/baza-wiedzy/endodoncja-mikroskopowa-laserowo-wspomagana-opole) (PILLAR M-P2) — gdy próchnica dotrze do nerwu
* [Mikrochirurgia endodontyczna laserowa — case study zęba 22](/baza-wiedzy/mikrochirurgia-endodontyczna-laserowa-case-study-zab-22) — gdy klasyczne Re-Endo nie wystarcza
* [Próchnica zębów — od pierwszych objawów do leczenia kanałowego](/baza-wiedzy/prochnica-zebow-od-pierwszych-objawow-do-leczenia-kanalowego)
* [Protetyka — korony, mosty, odbudowy](/oferta/protetyka)
* [Implantologia — gdy zęba nie da się uratować](/oferta/implantologia)
* [Akredytacje kliniki](/akredytacje) (M.Sc. RWTH Aachen, LA&HA)
* [Pełne bio Marcin Nowosielski](/zespol/marcin-nowosielski)

**Mikrostomart Opole — synergia laserów Er:YAG + Nd:YAG + cyfrowy workflow + ekspertyzą M.Sc. RWTH Aachen. Ratujemy zęby w jednej sesji, bez tymczasowego defektu estetycznego.**$body$,
    '/kb-zab-za-zab-jak-odbudowac-utracone-usmiechy-nowa-stomatologia.webp',
    '2026-05-26'
WHERE NOT EXISTS (
    SELECT 1 FROM articles WHERE slug = 'szlif-bezstopniowy-lasery-eryag-ndyag-ratowanie-zniszczonego-zeba-case-study' AND locale = 'pl'
);
