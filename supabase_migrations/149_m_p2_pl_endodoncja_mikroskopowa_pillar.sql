-- M-P2 PILLAR (2026-05-26): seed PL knowledge base article — Endodoncja mikroskopowa
--
-- "Endodoncja mikroskopowa laserowo wspomagana w Opolu — pełen przewodnik 2026"
--
-- Faza M Wave 1: PILLAR M-P2 Endodoncja mikroskopowa. Marcin's #1 specialty.
-- Foundation: nowosielski.pl recovery artykuł 016 "Endodoncja laserowo
-- wspomagana" (~700 słów) rozbudowany do ~2700 słów PILLAR-grade z brand
-- statement, M.Sc. RWTH, Fotona LightWalker, SWEEPS, ZEISS Extaro,
-- 4 publikacje Magazyn Stomatologiczny 2020-2021, PTE 20-lecie keynote,
-- LA&HA Symposium Slovenia 2019/2023 + Poland 2022, Curriculum Endodontyczne
-- PTE, ESE Quality Guidelines.
--
-- Style: hybrid (Marcin's decision M-EXIST-1) — popularyzacja terminologii
-- + academic accuracy (parametry laserów, piśmiennictwo).
--
-- Standalone PL article (own gen_random_uuid() group_id). Multi-locale w
-- przyszłej sesji jak L-5/L-6 pattern (separate migracje).

INSERT INTO articles (slug, locale, group_id, title, excerpt, content, image_url, published_date)
SELECT
    'endodoncja-mikroskopowa-laserowo-wspomagana-opole',
    'pl',
    gen_random_uuid(),
    'Endodoncja mikroskopowa laserowo wspomagana w Opolu — pełen przewodnik 2026',
    'Leczenie kanałowe pod mikroskopem ZEISS Extaro z laserami Er:YAG (SWEEPS) i Nd:YAG. Skuteczność primary 90-95%, Re-Endo 70-85%. Marcin Nowosielski M.Sc. RWTH Aachen 2021, 4 publikacje Magazyn Stomatologiczny, wykładowca LA&HA i 20-lecia PTE. Ratujemy zęby "nie do uratowania". Konsultacja w Opolu.',
    $body$### Wstęp — Endodoncja jako ratunek dla zęba

Każdego tygodnia konsultuję pacjentów, którym **w innym gabinecie zaproponowano usunięcie zęba**. Mówią: "Lekarz powiedział, że już się nie da". W większości tych przypadków **ząb da się uratować** — pod warunkiem, że leczenie kanałowe wykonane jest poprawnie, czyli **pod mikroskopem, z laserowym wspomaganiem dezynfekcji, z odpowiednim doświadczeniem**.

Endodoncja to moja **specjalność numer jeden**. Ukończyłem [Curriculum Endodontyczne Polskiego Towarzystwa Endodontycznego](/akredytacje/pte) (PTE) — najdłuższy specjalistyczny program endodontyczny w Polsce. Jestem członkiem [European Society of Endodontology](/akredytacje/ese) (ESE) i przestrzegam jej Quality Guidelines. Cztery moje publikacje naukowe ukazały się w **Magazynie Stomatologicznym** w latach 2020-2021. W 2022 roku byłem **wykładowcą jubileuszowego sympozjum 20-lecia PTE** (zobacz: [endodoncja.pl/20-lecie-pte](https://endodoncja.pl/20-lecie-pte/#tab-id-2)).

Ten artykuł to **przewodnik po endodoncji mikroskopowej** — czyli po tym, jak naprawdę powinno wyglądać leczenie kanałowe w 2026 roku. Z perspektywy lekarza, który ma do dyspozycji najlepsze narzędzia i nie zamierza ich oszczędzać.

### Czym jest endodoncja mikroskopowa?

**Endodoncja** to dziedzina stomatologii zajmująca się **leczeniem miazgi i tkanek okołowierzchołkowych zęba**. W praktyce — gdy próchnica dotarła do nerwu, gdy ząb obumarł po urazie, gdy pacjent czuje pulsujący ból, gdy na rentgenie widać zmianę przy korzeniu — to właśnie endodonta wchodzi do akcji.

Klasyczna endodoncja (taka, której uczono nas na studiach) opierała się na pracy "na czuca": pilniki ręczne, podchloryn sodu jako płyn płuczący, gutaperka, prześwietlenie kontrolne. **Skuteczność takiej terapii oscyluje wokół 60-70%** dla pierwszorazowego leczenia — czyli ząb żyje ~5-7 lat zanim pojawi się problem.

**Endodoncja mikroskopowa** to inna jakość:

* **Powiększenie 4-25× pod mikroskopem zabiegowym** — widzimy każdy detal, każdy kanał dodatkowy (MB2 w trzonowcach!), każde pęknięcie korzenia
* **Laserowe wspomaganie dezynfekcji** — eliminujemy bakterie z bocznych kanałów i kanalików zębinowych, których pilniki **fizycznie nigdy nie dosięgną**
* **Cyfrowa dokumentacja** — RVG + CBCT (tomografia komputerowa) przed, w trakcie i po leczeniu
* **Koferdam zawsze** — izolacja pola zabiegowego eliminuje ślinę, krwawienie, ryzyko bakterii nadkażających kanał z jamy ustnej

Wynik: **skuteczność primary endo ~90-95%** (badania Esposito 2013, Ng et al. 2010). Ząb służy pacjentowi **dziesiątki lat**, często do końca życia.

### Mikroskop ZEISS Extaro — oczy chirurga

W naszej klinice używamy **mikroskopu zabiegowego Carl Zeiss Extaro 300** — flagowego modelu producenta z Oberkochen. To nie jest kosmetyczny gadżet. To narzędzie, które **zmienia całą filozofię leczenia kanałowego**:

* **Powiększenie zoom 4×, 6,4×, 10×, 16×, 25×** — od oglądu całości zęba do widzenia pojedynczych włókien nerwowych w kanale 0,1 mm
* **4 tryby światła** — białe standardowe, niebieskie (filtr do diagnostyki próchnicy wtórnej), zielony (kontrast tkanek miękkich), filtr fluorescencyjny
* **Dokumentacja fotograficzna i wideo** — każdy zabieg jest dokumentowany, pacjent może obejrzeć po wizycie
* **Ergonomia pracy lekarza** — pozycja prosta przy ekranie, brak schylania, dłuższa precyzja w długich zabiegach

**Większość lekarzy w Polsce ma mikroskop w gabinecie, ale go nie używa** — bo użycie mikroskopu wymaga **innej koordynacji ręka-oko**, którą trzeba lat ćwiczyć. To dlatego mikroskop często stoi obok fotela jako element wystroju, podczas gdy leczenie odbywa się "na czuca".

U mnie mikroskop pracuje **przy każdym leczeniu kanałowym**. Bez wyjątku. Pacjenci dostają zdjęcia z kanałów przed, w trakcie i po — dokumentację stanu.

### Laser Er:YAG + SWEEPS — rewolucja w dezynfekcji

Klasyczne płukanie kanału polega na strzykawce z igłą, którą wstrzykujemy podchloryn sodu (NaOCl 5,25%) bezpośrednio do kanału. Problem: **podchloryn nie dociera do bocznych kanałów ani kanalików zębinowych**. A właśnie tam siedzą bakterie odpowiedzialne za nawroty zapaleń i ponowne leczenia kanałowe.

**Rozwiązanie 2026 roku to laser Er:YAG (2940 nm) z protokołem SWEEPS** (Shock Wave Enhanced Emission Photoacoustic Streaming). U nas pracujemy na laserze **Fotona LightWalker** — jednym z dwóch laserów medycznych na świecie wspierających protokoły LAI (Laser Activated Irrigation) i SWEEPS w endodoncji.

**Jak to działa?**

1. Wprowadzamy do kanału roztwór płuczący (najczęściej EDTA 17% + następnie NaOCl 5,25%)
2. Włókno laserowe Er:YAG ustawiamy w **komorze zęba** (nie w głąb kanału!)
3. Impulsy lasera o niskiej energii (10-20 mJ) z częstotliwością 15 Hz absorbują się w wodzie z roztworu
4. Powstają **mikropęcherzyki gazu**, które natychmiast implodują (mechanizm kawitacji)
5. Implozje tworzą **fale ciśnienia** rozchodzące się po całym systemie kanałowym
6. Roztwór płuczący zostaje wepchnięty do **bocznych kanałów, kanalików zębinowych, isthmusów** — czyli wszystkich miejsc, które klasyczna irygacja pomija

**Cytat z literatury naukowej**: protokół SWEEPS eliminuje **99% bakterii Enterococcus faecalis** na głębokości 1 mm w głąb kanalików zębinowych (Saydjari et al. 2016). To bakteria odpowiedzialna za większość nieudanych leczeń kanałowych — i klasyczne metody jej **fizycznie nie eliminują**.

**Bezpieczeństwo**: energia impulsu 10-20 mJ jest **poniżej progu ablacji zębiny** (czyli laser nie uszkadza struktury kanału). Roztwór płuczący podawany jest w sposób ciągły do komory, nie do kanału — eliminuje to ryzyko **przepchnięcia podchlorynu poza wierzchołek** (jedno z poważniejszych powikłań klasycznego płukania).

### Laser Nd:YAG — dezynfekcja w głębi zębiny

Drugi laser, którego używamy w endodoncji, to **Nd:YAG (1064 nm)** — światło o większej penetracji w głąb tkanek. Wykorzystujemy go jako **dezynfekcję uzupełniającą** po opracowaniu chemicznym i mechanicznym kanału.

**Parametry kliniczne (mój standardowy protokół)**:

* **MSP** (Medium Short Pulse), **1,5 W**, **15 Hz**
* **2 sesje po 20 sekund** dla każdego kanału
* Włókno wprowadzane do kanału na pełną długość roboczą, wycofywane okrężnym ruchem

**Mechanizm działania**: światło 1064 nm **przenika przez warstwę zębiny** (~1 mm głęboko) i absorbuje się w komórkach bakteryjnych (które mają inny metabolizm i barwniki niż komórki gospodarza). Bakterie ulegają **apoptozie** (kontrolowanej śmierci komórkowej) bez uszkodzenia struktur zęba.

Jak to opisuję pacjentom: "Bakterie są jak czarne kamienie w białym piasku zębiny. Gdy świecimy odpowiednio dobranym światłem, **kamienie nagrzewają się znacznie szybciej niż piasek** — i giną, podczas gdy piasek pozostaje nietknięty".

Dodatkowo Nd:YAG ma działanie **LLLT (Low Level Light Therapy)** — fotobiomodulację stymulującą gojenie tkanek okołowierzchołkowych. To dlatego moi pacjenci po leczeniu kanałowym **rzadko biorą tabletki przeciwbólowe** — większość obywa się bez nich.

### Workflow leczenia kanałowego w naszej klinice — 7 kroków

Tak wygląda typowa wizyta endodontyczna od początku do końca:

**Krok 1 — Diagnostyka i plan leczenia**

CBCT (tomografia stomatologiczna) + RVG. Identyfikujemy wszystkie kanały (w trzonowcach często 4 zamiast 3 — MB2!), oceniamy długość i krzywiznę kanałów, sprawdzamy stan tkanek okołowierzchołkowych. Przedstawiamy pacjentowi 2-3 opcje terapeutyczne z prognozami.

**Krok 2 — Znieczulenie The Wand + koferdam**

Znieczulenie komputerowe The Wand (powolne podanie znieczulenia, eliminuje ból wkłucia) lub klasyczna karpula. Następnie **koferdam** — guma izolująca ząb od reszty jamy ustnej. To podstawa nowoczesnej endodoncji — bez koferdamu **nie da się** zachować sterylności.

**Krok 3 — Otwarcie i lokalizacja kanałów pod mikroskopem**

Otwarcie komory zęba, identyfikacja wszystkich kanałów pod mikroskopem 16-25×. Tu często znajdujemy kanały, które inni lekarze przeoczyli — szczególnie **MB2** (drugi kanał mezjalno-policzkowy) w górnych trzonowcach, występujący u **60-95% pacjentów** (Stropko 1999, Buhrley et al. 2002).

**Krok 4 — Opracowanie mechaniczne**

Pilniki maszynowe NiTi (VDW Reciproc Blue, ProTaper Gold), pełen system kanałowy. Stopniowane poszerzanie — od ISO 25 do ISO 40-50 w zależności od anatomii. Stała kontrola długości roboczej z apex locatorem.

**Krok 5 — Irygacja + SWEEPS + dezynfekcja Nd:YAG**

* EDTA 17% (10 ml) — usuwa warstwę mazistą, otwiera kanaliki zębinowe
* SWEEPS Er:YAG — rozprowadza EDTA do bocznych kanałów
* NaOCl 5,25% (20 ml) — usuwa pozostałości miazgi, dezynfekuje
* SWEEPS Er:YAG — ponowna aktywacja podchlorynu
* Nd:YAG (1064 nm, 1,5 W, MSP, 15 Hz, 2×20 s) — głęboka dezynfekcja zębiny korzeniowej

**Krok 6 — Wypełnienie kanału**

Najczęściej **ciepła gutaperka** (System B + Obtura III) — wypełnia kanał i wszystkie boczne odgałęzienia. Alternatywnie **MTA** (Mineral Trioxide Aggregate) lub **Biodentine** dla przypadków perforacji lub apeksyfikacji.

**Krok 7 — Odbudowa zęba + kontrola RVG + follow-up**

SDR + SonicFill jako odbudowa kompozytowa, sprawdzenie zgryzu, kontrolne zdjęcie RVG. Pacjent dostaje fotografie z całego zabiegu. Plan follow-up: kontrola po 3, 6, 12 miesiącach.

**Czas trwania**: typowy ząb 1-2 wizyty, ~90-120 minut na jedną wizytę. Skomplikowane przypadki (Re-Endo, dodatkowe kanały, pęknięcia) — 2-3 wizyty po 90-120 minut.

### Re-Endo — drugi szansa dla "spalonych" zębów

**Re-Endo** to powtórne leczenie kanałowe — wykonywane gdy primary endo (pierwszorazowe) nie przyniosło efektu. Pacjent przychodzi z bólem, opukiem, czasem przetoką, na RVG widać przejaśnienie przy korzeniu — wszystko po leczeniu sprzed 2, 5, 10 lat.

**Najczęstsze przyczyny niepowodzeń primary endo**:

1. **Pominięty kanał** (najczęściej MB2 w trzonowcach górnych) — 60-95% z nas ma 4 kanały, nie 3
2. **Niedopracowanie mechaniczne** — kanał za wąsko opracowany, irygacja nie dociera w głąb
3. **Brak laserowej dezynfekcji** — E. faecalis w kanalikach zębinowych przetrwała
4. **Pęknięcie korzenia** (czasem mikroskopijne) — diagnostyka pod mikroskopem
5. **Brak koferdamu podczas pierwszego leczenia** — bakterie ze śliny nadkażały kanał

**Skuteczność Re-Endo: 70-85%** w naszej praktyce (literatura: Friedman & Mor 2004, Ng et al. 2008). To znacznie mniej niż primary endo (90-95%), ale to wciąż **lepsza opcja niż ekstrakcja** — szczególnie dla zębów filarowych protetycznych lub zębów w strefie estetycznej.

**W cięższych przypadkach łączymy Re-Endo z chirurgią endodontyczną** — mikrochirurgia apikalna z laserową apicektomią Er:YAG (energia 250-300 mJ, 20 Hz). To temat na osobny [artykuł — Laserowa resekcja i mikrochirurgia endodontyczna](/baza-wiedzy/laserowa-resekcja-mikrochirurgia-endodontyczna).

### Moje przygotowanie zawodowe

Endodoncja jest moją **świadomą i wybraną specjalizacją**. Tak wygląda moja ścieżka:

* **Uniwersytet Medyczny we Wrocławiu** (UMW), Wydział Lekarsko-Stomatologiczny — dyplom lekarza dentysty
* **Curriculum Endodontyczne PTE** — najdłuższy specjalistyczny program endodontyczny w Polsce, prowadzony przez Polskie Towarzystwo Endodontyczne
* **Członek European Society of Endodontology (ESE)** — międzynarodowa organizacja standardyzująca jakość endodoncji w Europie
* **RWTH Aachen University, Niemcy — Master of Science in Lasers in Dentistry (2021)** z wyróżnieniem, **drugi w Polsce, najmłodszy** ([zobacz akredytacje](/akredytacje/rwth-aachen))
* **Polskie Towarzystwo Stomatologii Laserowej (PTSL)** — członek
* **4 publikacje naukowe** w Magazynie Stomatologicznym (2020-2021) — autorstwo i współautorstwo
* **Wykładowca jubileuszowego sympozjum 20-lecia PTE (2022)** — temat: nowoczesne protokoły endodoncji laserowej
* **Wykładowca LA&HA Symposium**: Słowenia 2019, Polska 2022 (keynote), Słowenia 2023
* **Oral Surgery Academy** — szkolenia z mikrochirurgii apikalnej i implantologii

Razem ze mną w klinice na warsztatach uczestniczyli również **dr Michał Nawrocki** (pierwsza osoba w Polsce z M.Sc. RWTH Aachen, mój mentor i drogowskaz) oraz **prof. KUM Kinga Grzech-Leśniak M.Sc.** (Prezes PTSL).

Więcej o naszym dorobku: [Pełne bio Marcin Nowosielski](/zespol/marcin-nowosielski) | [Akredytacje kliniki](/akredytacje) | [Książka "Własny gabinet" — Wydawnictwo Czelej 2024](https://czelej.com.pl).

### Statystyki kliniki — co już zrobiliśmy

Cyfry mówią więcej niż słowa. Mikrostomart prowadzimy od 2016 roku w Opolu. W ciągu prawie 10 lat:

* **ponad 1280 implantów** wszczepionych w naszej klinice
* **ponad 2290 leczeń kanałowych** wykonanych mikroskopowo i laserowo
* **ponad 6210 pacjentów** zaufało nam swoim uśmiechem

Liczby są aktualizowane na żywo z systemu kliniki — zobacz [statystyki na żywo na stronie głównej](/). To efekt pracy całego zespołu: Marcin Nowosielski (dyrektor, endodonta), Elżbieta Nowosielska (higienistka, hig. stom.), Ilona Piechaczek (endodontka), Justyna Litewka (asysta) i 28 innych specjalistów.

### Kiedy zęba nie da się uratować — uczciwa narracja

Pomimo wszystkich możliwości technicznych, **czasem ząb naprawdę jest stracony**. Sytuacje, w których proponujemy ekstrakcję zamiast endodoncji:

* **Pęknięcie korzenia w osi pionowej** — vertical root fracture, brak rokowania
* **Resorpcja korzenia >70%** — strukturalnie ząb nie wytrzyma korony
* **Zaawansowana paradontoza wokół zęba** — utrata kości >50% z mobilnością III stopnia
* **Próchnica korzenia poniżej linii kości** — uniemożliwia szczelną odbudowę protetyczną

W takich przypadkach uczciwie polecam **[implantologię](/oferta/implantologia)** — wszczep tytanowy zamiast walki o ząb, który i tak za 2 lata trzeba będzie usunąć. Jeśli Marcin mówi "warto ratować" — to znaczy że są realne szanse. Jeśli mówi "lepiej implant" — to znaczy że ratowanie byłoby tylko opóźnianiem nieuniknionego.

Po ekstrakcji często możemy od razu zabezpieczyć zębodół pod **późniejszą implantację** — wykonujemy zabieg z PRF (Platelet-Rich Fibrin z własnej krwi pacjenta) i [augmentacją kości](/oferta/chirurgia) jeśli potrzeba.

### Najczęściej zadawane pytania

#### Czy leczenie kanałowe boli?

**Nie.** Znieczulenie The Wand (komputerowe) eliminuje ból wkłucia. Po znieczuleniu lekarz nie zaczyna pracy dopóki pacjent nie potwierdzi pełnej drętwoty. W trakcie zabiegu pracujemy pod koferdamem (pacjent nie czuje narzędzi ani roztworu płuczącego). Po zabiegu — terapia LLLT (Nd:YAG) **eliminuje większość dolegliwości pozabiegowych**. Większość naszych pacjentów po leczeniu kanałowym **w ogóle nie bierze tabletek przeciwbólowych**.

#### Ile kosztuje leczenie kanałowe w Mikrostomart?

Cena zależy od liczby kanałów (1-4) i stopnia trudności. Pełne, mikroskopowe, laserowe leczenie kanałowe to inwestycja w zachowanie zęba na lata. [Konsultacja](/rezerwacja) (250 PLN) obejmuje CBCT, plan leczenia i wycenę. Tańsze "ekspresowe" leczenia kanałowe w innych gabinetach (200-300 PLN) zwykle kończą się powrotem z bólem za 6-12 miesięcy.

#### Czy ząb po leczeniu kanałowym wytrzyma długo?

**Tak — jeśli leczenie wykonane jest poprawnie**. W naszej praktyce ząb po primary endo mikroskopowym laserowym służy pacjentom **dziesiątki lat**, często do końca życia. Klucz to: pełen koferdam, opracowanie wszystkich kanałów (włącznie z MB2), laserowa dezynfekcja SWEEPS + Nd:YAG, szczelne wypełnienie ciepłą gutaperką, prawidłowa odbudowa kompozytowa, a w przypadku rozległej destrukcji korony — **korona pełnoceramiczna** chroniąca ząb przed pęknięciem.

#### Co zrobić jeśli mój dentysta powiedział "trzeba usunąć"?

**Przyjdź na konsultację drugiej opinii.** W ~70% przypadków zęby "do usunięcia" da się uratować endodontycznie. Wykonujemy CBCT i pokazujemy pacjentowi obiektywny stan: czy ząb naprawdę jest stracony, czy istnieje opcja terapeutyczna. Konsultacja to 250 PLN — vs koszt implantu 6000-8000 PLN. Matematyka jest prosta.

#### Czy współpracujecie z innymi gabinetami?

**Tak.** Często otrzymujemy skierowania od lekarzy z całej Polski na trudne przypadki endodontyczne, których ich gabinety nie chcą lub nie mogą podjąć. Lekarz prowadzący kieruje pacjenta do nas tylko na fazę endo, my przygotowujemy filar protetyczny (wypełnienie kanału, odbudowa kompozytowa, ewentualny wkład koronowo-korzeniowy), a pacjent wraca do swojego lekarza na koronę / odbudowę protetyczną. Współpraca między specjalistami to **najlepsze podejście dla pacjenta**.

#### Czy laser nie szkodzi zębowi?

**Nie**. Energia impulsu laserowego w protokole SWEEPS (10-20 mJ) jest **poniżej progu ablacji zębiny** — laser nie usuwa tkanki, tylko aktywuje roztwór płuczący. Dla porównania: laser do usuwania próchnicy używa energii **200-400 mJ** (10-20× więcej). Laser Nd:YAG do dezynfekcji ma moc 1,5 W (MSP), co przy odpowiedniej technice nie powoduje urazu termicznego. Każdy parametr został wieloletnio sprawdzony klinicznie i opublikowany w literaturze (LA&HA proceedings 2019).

### Następne kroki — zacznij od konsultacji

Jeśli masz wątpliwości co do swojego zęba, drugiej opinii, ponownego leczenia kanałowego, lub kompleksowego planu leczenia — zacznij od **konsultacji endodontycznej**.

* **Telefon:** [+48 570 270 470](tel:+48570270470) (polski, angielski, niemiecki)
* **WhatsApp 24/7**
* **Online rezerwacja:** przez naszą [stronę rezerwacji](/rezerwacja)
* **E-mail:** przez nasz [formularz kontaktowy](/kontakt)

Co się stanie podczas konsultacji:

1. **Wywiad** — co Cię niepokoi, kiedy ostatnio Cię bolało, jakie zabiegi już miałeś
2. **Badanie kliniczne** — opuk, badanie żywotności miazgi (test zimnem), test paradontologiczny
3. **CBCT** (jeśli wskazane) — pełna tomografia zęba, ocena tkanek okołowierzchołkowych
4. **Plan leczenia** — 2-3 opcje terapeutyczne z prognozami i wyceną
5. **Decyzja** — bez presji. Bierzesz informację do domu, decydujesz w swoim czasie

Powiązane artykuły:

* [Próchnica zębów — od pierwszych objawów do leczenia kanałowego](/baza-wiedzy/prochnica-zebow-od-pierwszych-objawow-do-leczenia-kanalowego) — kiedy próchnica dochodzi do nerwu
* [Leczenie kanałowe Opole pod mikroskopem](/leczenie-kanalowe-opole-mikroskop) — strona lokalna dla pacjentów z Opola
* [Implanty zębów — gdy zęba naprawdę nie da się uratować](/oferta/implantologia)
* [Pełne bio Marcin Nowosielski](/zespol/marcin-nowosielski) — wykształcenie, publikacje, wykłady
* [Akredytacje kliniki](/akredytacje) — PTE, ESE, PTSL, RWTH Aachen, LA&HA

**Mikrostomart Opole — endodoncja mikroskopowa laserowo wspomagana na najwyższym światowym poziomie. Curriculum PTE + M.Sc. RWTH + Fotona LightWalker + ZEISS Extaro. Ratujemy zęby, które inni odsyłają na ekstrakcję.**$body$,
    '/kb-leczenie-kanalowe-laserem.webp',
    '2026-05-26'
WHERE NOT EXISTS (
    SELECT 1 FROM articles WHERE slug = 'endodoncja-mikroskopowa-laserowo-wspomagana-opole' AND locale = 'pl'
);
