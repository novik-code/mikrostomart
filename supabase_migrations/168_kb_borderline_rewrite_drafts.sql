-- KB cleanup (2026-06-15, GEO audyt 5.3) — BORDERLINE: przepisanie 3 artykułów do Klasy A
--
-- Decyzja Marcina: "przepisz wszystkie" 3 borderline (dobry temat, ujęcie domowe →
-- przepisać pro-wizyta z CTA do gabinetu, nie usuwać).
--   1. wybielanie-zebow-w-domu-fakty-i-mity
--   2. usmiech-ze-sny-...-leku-przed-dentysta
--   3. zeby-wrazliwe-na-zimno-5-sposobow
--
-- Mechanika: UPDATE wiersza PL (nowa treść Klasy A) + status='draft' → artykuł
-- znika z indeksu i listingu (publiczne odczyty filtrują status='published'),
-- czeka na zatwierdzenie w adminie → Artykuły (MEDICAL REVIEW GATE Marcina).
-- DELETE starych wierszy EN/DE/UA (przestarzałe tłumaczenia clickbaitu) — przy
-- publikacji silnik wygeneruje świeże tłumaczenia. Slug i obraz PL zostają.
--
-- Format treści = parser KB: ### (h3), #### (h4), * (lista), **bold**, [tekst](url).
-- Parser NIE obsługuje ## ani #. Akapit = jedna linia. Linki POZA **bold**.
--
-- ⚠️ Uruchomić na OBU Supabase. Po wgraniu: admin → Artykuły → 3 drafty do recenzji.

-- ── 1. Wybielanie zębów w domu — fakty i mity ──
UPDATE articles SET
    status = 'draft',
    title = 'Wybielanie zębów w domu — fakty i mity (i kiedy lepszy jest gabinet) | Mikrostomart Opole',
    excerpt = 'Które domowe metody wybielania zębów naprawdę działają, a które niszczą szkliwo? Fakty i mity o sodzie, węglu aktywnym, cytrynie i pastach wybielających — oraz dlaczego nakładki pod nadzorem i wybielanie gabinetowe są skuteczniejsze i bezpieczniejsze. Opole, lek. dent. Marcin Nowosielski.',
    content = $body$### Czy domowe wybielanie zębów działa?

Krótka odpowiedź: **domowe pasty i „triki" usuwają jedynie powierzchniowe naloty (od kawy, herbaty, wina, papierosów) — nie rozjaśniają zęba od środka.** Realne, trwałe wybielenie o kilka odcieni daje tylko nadtlenek (nadtlenek wodoru lub karbamidu) w odpowiednim stężeniu — a ten powinien być stosowany pod kontrolą stomatologa. Większość „naturalnych sposobów z kuchni" w najlepszym razie nie działa, a w najgorszym **trwale uszkadza szkliwo**, którego organizm nie odbuduje.

W tym artykule oddzielamy fakty od mitów: co naprawdę usuwa przebarwienia, dlaczego popularne domowe metody bywają szkodliwe i jak bezpiecznie rozjaśnić uśmiech pod okiem specjalisty.

### Skąd biorą się przebarwienia zębów?

Żeby dobrać skuteczną metodę, trzeba najpierw wiedzieć, **co** przebarwia ząb:

* **Przebarwienia zewnętrzne** — naloty na powierzchni szkliwa od kawy, herbaty, czerwonego wina, curry, papierosów. To je usuwa higienizacja i (częściowo) pasty wybielające.
* **Przebarwienia wewnętrzne** — przyczyna tkwi w głębi zęba: ząb po leczeniu kanałowym (martwy), przebarwienia po tetracyklinach, fluoroza, naturalne ciemnienie z wiekiem. Tu pasty nic nie dadzą — potrzebne jest wybielanie nadtlenkiem (czasem od wewnątrz zęba) lub leczenie protetyczne (np. [licówki](/oferta/stomatologia-estetyczna)).

Dlatego pierwszym krokiem nie jest „kupić wybielającą pastę", tylko **ustalić przyczynę** — inaczej można miesiącami szorować ząb, który ciemnieje od środka.

### Mity o domowym wybielaniu — czego NIE robić

#### Soda oczyszczona i „pasty DIY"

Soda jest ścierniwem. Doraźnie zetrze naloty, ale przy regularnym stosowaniu **ściera też szkliwo** (abrazja) i odsłania ciemniejszą zębinę — paradoksalnie ząb staje się bardziej żółty i nadwrażliwy. Szkliwo nie regeneruje się.

#### Węgiel aktywny

Modny, ale to również silne ścierniwo o nieprzewidywalnej granulacji. Brak dowodów na realne wybielanie, za to udokumentowane ryzyko abrazji szkliwa i osadzania się czarnych drobin w szczelinach i przy dziąśle.

#### Cytryna, ocet, soda + cytryna

To najgorszy pomysł. Kwas (cytrynowy, octowy) **rozpuszcza szkliwo** (erozja). Ząb przez chwilę wygląda jaśniej, bo kwas matuje i odwapnia powierzchnię — to nie wybielanie, to uszkodzenie. Efekt: nadwrażliwość, większa podatność na próchnicę, z czasem ciemniejszy odcień.

#### Truskawki, kurkuma, olej kokosowy

Niegroźne, ale i nieskuteczne. Olejowanie (oil pulling) nie wybiela. Kurkuma potrafi wręcz przebarwić. Truskawki zawierają kwas — w nadmiarze szkodzą.

#### „Naturalne = bezpieczne"

Najczęstszy mit. Kwas i ścierniwo są „naturalne", a niszczą szkliwo nieodwracalnie. Bezpieczeństwo zależy od **mechanizmu i stężenia**, nie od tego, czy coś pochodzi z kuchni.

### Co naprawdę działa (i jest bezpieczne)

#### Pasty wybielające — tylko powierzchniowo

Dobra pasta z łagodnym systemem polerującym i związkami rozjaśniającymi pomaga **utrzymać** efekt i usuwać świeże naloty. Nie zmieni jednak naturalnego odcienia zęba o kilka tonów. Wybieraj pasty o niskim współczynniku ścieralności (RDA) i nie używaj ich „na siłę".

#### Wybielanie nakładkowe w domu — ale pod nadzorem

To metoda domowa, którą **prowadzi stomatolog**: pobieramy wycisk/skan, robimy nakładki na wymiar i dobieramy stężenie żelu (nadtlenek karbamidu zwykle 10-22%). Pacjent nosi nakładki w domu zgodnie z zaleceniem. Indywidualne nakładki chronią dziąsła, a kontrolowane stężenie ogranicza nadwrażliwość. To bezpieczna, skuteczna alternatywa dla „zestawów z internetu" o nieznanym składzie.

#### Wybielanie gabinetowe — najszybszy efekt

W gabinecie stosujemy wyższe stężenia nadtlenku z zabezpieczeniem dziąseł — efekt widoczny zwykle po jednej wizycie. Przed wybielaniem oceniamy stan szkliwa, dziąseł i ewentualną próchnicę, a po zabiegu kontrolujemy nadwrażliwość. To wybielanie zewnątrzpochodne; przy przebarwieniach wewnętrznych dobieramy inną ścieżkę.

### Zanim wybielisz — o czym pamiętać

* Wybielanie ma sens na **zdrowych** zębach — najpierw leczymy próchnicę i stan dziąseł.
* Wypełnienia, korony i [licówki](/oferta/stomatologia-estetyczna) **nie wybielają się** — po wybielaniu mogą odstawać kolorem i wymagać wymiany.
* Przejściowa nadwrażliwość jest częsta i mija; kontrolowane stężenie i preparaty z fluorem ją ograniczają.
* Trwałość zależy od diety i nawyków (kawa, papierosy skracają efekt).

### Podsumowanie

Domowe „naturalne" metody wybielania to najczęściej mit — albo nie działają, albo niszczą szkliwo. Realne i bezpieczne rozjaśnienie daje wybielanie nadtlenkiem: **nakładkowe pod nadzorem** lub **gabinetowe** — zawsze po ocenie przyczyny przebarwień. Jeśli zależy Ci na trwałym, bezpiecznym efekcie, [umów konsultację wybielania](/rezerwacja) — dobierzemy metodę do Twoich zębów i oczekiwań. Więcej o stomatologii estetycznej znajdziesz na stronie [stomatologia estetyczna](/oferta/stomatologia-estetyczna).$body$
WHERE group_id = '1fa34fb0-ecdd-494e-8920-e6aa6ef7d25c' AND locale = 'pl';

DELETE FROM articles WHERE group_id = '1fa34fb0-ecdd-494e-8920-e6aa6ef7d25c' AND locale <> 'pl';


-- ── 2. Lęk przed dentystą — jak go pokonać ──
UPDATE articles SET
    status = 'draft',
    title = 'Lęk przed dentystą — jak go pokonać i bezboleśnie wrócić do zdrowych zębów | Mikrostomart Opole',
    excerpt = 'Boisz się dentysty? Nie jesteś sam — i da się to oswoić. Jak wygląda wizyta dla osób z lękiem: bezbolesne znieczulenie komputerowe The Wand, sedacja wziewna (gaz rozweselający), spokojne tempo i sygnał „stop". Praktyczne wskazówki przed wizytą. Opole, Mikrostomart.',
    content = $body$### Boję się dentysty — czy to normalne?

Tak — **lęk przed dentystą (dentofobia) jest bardzo częsty i całkowicie zrozumiały.** Dotyczy nawet co drugiej osoby w różnym nasileniu. Problem w tym, że unikanie wizyt zamienia mały, tani i bezbolesny problem (np. próchnicę początkową) w duży, kosztowny i bolesny (leczenie kanałowe, utrata zęba). Dobra wiadomość: lęk da się oswoić, a nowoczesna stomatologia potrafi przeprowadzić leczenie **bez bólu** i we własnym tempie pacjenta.

W tym artykule wyjaśniamy, skąd bierze się strach, jak realnie pomagamy osobom z lękiem w naszym gabinecie i co możesz zrobić sam, żeby pierwsza wizyta po latach była łatwiejsza.

### Skąd bierze się lęk przed dentystą?

* **Złe doświadczenie z przeszłości** — najczęściej z dzieciństwa, gdy leczenie bywało bolesne i mało empatyczne.
* **Strach przed bólem** — dziś w dużej mierze nieaktualny dzięki nowoczesnemu znieczuleniu.
* **Poczucie braku kontroli** — leżenie z otwartymi ustami, brak możliwości „zatrzymania" zabiegu.
* **Wstyd** — obawa przed oceną stanu zębów. W gabinecie nikt nie ocenia; jesteśmy od tego, żeby pomóc.
* **Lęk przed kosztami i nieznanym** — który znika, gdy pacjent dostaje jasny plan i wycenę.

Świadomość przyczyny pomaga: większość obaw odnosi się do stomatologii sprzed lat, a nie do tego, jak leczenie wygląda dziś.

### Jak pomagamy osobom z lękiem

#### Bezbolesne znieczulenie komputerowe (The Wand)

Dla wielu osób najgorszy jest „ten zastrzyk". Używamy systemu **The Wand** — komputerowo sterowanego, bardzo powolnego podawania znieczulenia przez cienką końcówkę przypominającą długopis. Tempo dobiera urządzenie, dzięki czemu znieczulenie jest niemal niewyczuwalne, bez nieprzyjemnego ucisku i bez „drętwego" pół-twarzy.

#### Sedacja wziewna — gaz rozweselający

Przy większym lęku stosujemy **sedację wziewną podtlenkiem azotu** („gaz rozweselający"). Pacjent jest cały czas przytomny i współpracuje, ale rozluźniony, spokojny, a poczucie czasu i lęk znacząco maleją. Działanie ustępuje w kilka minut po zabiegu — można normalnie wrócić do dnia.

#### Spokojne tempo i sygnał „stop"

Ustalamy prosty znak (np. podniesienie ręki), na który **przerywamy zabieg w każdej chwili**. To przywraca poczucie kontroli — jeden z kluczowych elementów oswajania lęku. Pierwsze wizyty mogą być krótkie i „oswajające": rozmowa, przegląd, plan — bez presji leczenia od razu.

#### Mniej inwazyjne technologie

Mikroskop, lasery i precyzyjna diagnostyka pozwalają leczyć oszczędniej i delikatniej, a często szybciej — krótszy zabieg to mniej stresu.

### Co możesz zrobić przed wizytą

* **Powiedz nam o swoim lęku** — przy umawianiu lub na początku wizyty. To nie wstyd, to ważna informacja, która zmienia sposób, w jaki Cię prowadzimy.
* **Przyjdź na konsultację bez leczenia** — żeby poznać gabinet, zespół i plan, zanim cokolwiek się wydarzy.
* **Umów wizytę rano** — mniej czasu na narastający stres w ciągu dnia.
* **Weź ze sobą słuchawki** — muzyka lub podcast skutecznie odwracają uwagę.
* **Zadbaj o jedzenie i sen** — głodny i niewyspany organizm reaguje silniejszym lękiem; unikaj nadmiaru kawy przed wizytą.
* **Zabierz kogoś bliskiego** — obecność osoby towarzyszącej uspokaja.

### Nie odkładaj — to działa na Twoją korzyść

Im wcześniej, tym łatwiej: zdrowy ząb wymaga przeglądu, mały ubytek — krótkiej wizyty bez bólu. Każdy odłożony rok to ryzyko, że leczenie będzie większe. Jeśli od dawna unikasz dentysty, [umów spokojną konsultację](/rezerwacja) — zaczniemy od rozmowy i planu, w Twoim tempie. Masz pytania przed wizytą? [Skontaktuj się z nami](/kontakt) — chętnie wszystko wyjaśnimy.$body$
WHERE group_id = '638dbda0-2e26-4a16-ae8e-22db4fef3b26' AND locale = 'pl';

DELETE FROM articles WHERE group_id = '638dbda0-2e26-4a16-ae8e-22db4fef3b26' AND locale <> 'pl';


-- ── 3. Nadwrażliwość zębów na zimno ──
UPDATE articles SET
    status = 'draft',
    title = 'Nadwrażliwość zębów na zimno — przyczyny i skuteczne leczenie | Mikrostomart Opole',
    excerpt = 'Ból zęba od zimnego napoju czy powietrza? Nadwrażliwość to objaw, nie choroba — i ma konkretne przyczyny: odsłonięte szyjki, starte szkliwo, erozja, próchnica. Co pomaga w domu, a kiedy potrzebne jest leczenie w gabinecie (fluoryzacja, odbudowa szyjek, laser). Opole, Mikrostomart.',
    content = $body$### Dlaczego zęby bolą od zimna?

Nadwrażliwość zębów to **krótki, ostry ból w reakcji na zimno (czasem ciepło, słodycz lub dotyk), który mija po ustąpieniu bodźca.** Mechanizm jest prosty: gdy odsłoni się zębina (warstwa pod szkliwem), bodziec dociera przez tysiące mikroskopijnych kanalików wprost do nerwu zęba. Kluczowe jest jednak to, że **nadwrażliwość to objaw, a nie choroba** — zawsze ma konkretną przyczynę, którą warto ustalić, bo czasem to sygnał poważniejszego problemu (próchnicy, nieszczelnego wypełnienia, pęknięcia).

Poniżej wyjaśniamy najczęstsze przyczyny, co możesz zrobić w domu i kiedy potrzebna jest pomoc w gabinecie.

### Najczęstsze przyczyny nadwrażliwości

* **Odsłonięte szyjki zębowe / recesje dziąseł** — dziąsło się obniża, odsłaniając zębinę przy szyjce zęba.
* **Abrazja od szczotkowania** — zbyt mocne szczotkowanie twardą szczoteczką „na boki" ściera szkliwo i odsłania szyjki.
* **Erozja kwasowa** — częste kwaśne napoje (cola, soki, energetyki, wino), refluks lub kwaśne pokarmy rozpuszczają szkliwo.
* **Starte szkliwo i bruksizm** — zgrzytanie i zaciskanie zębów ściera powierzchnie i powoduje mikropęknięcia.
* **Próchnica i nieszczelne wypełnienia** — bodziec dociera do wnętrza zęba; tu nadwrażliwość bywa pierwszym ostrzeżeniem.
* **Po wybielaniu lub higienizacji** — przejściowa, zwykle mija po kilku dniach.

Jeśli ból jest **jednostronny, silny, długo nie mija lub pojawia się samoistnie** — to nie „zwykła nadwrażliwość", tylko sygnał, że ząb wymaga pilnej oceny.

### Co możesz zrobić w domu

* **Pasta na nadwrażliwość** — z azotanem potasu (uspokaja nerw) lub związkami fluoru/cyny (zamykają kanaliki). Efekt narasta po 2-4 tygodniach regularnego stosowania; można nią delikatnie wcierać w szyjki na noc.
* **Miękka szczoteczka + prawidłowa technika** — ruchy wymiatające od dziąsła do brzegu zęba, bez „piłowania" na boki. Szczoteczka soniczna z czujnikiem nacisku pomaga nie przeciążać szkliwa.
* **Ogranicz kwasy** — kwaśne napoje pij przez słomkę, a po nich **nie szczotkuj zębów od razu** (rozmiękczone szkliwo łatwo zetrzeć) — odczekaj ok. 30 minut lub przepłucz usta wodą.
* **Fluor** — płukanki lub żele z fluorem wzmacniają szkliwo i zmniejszają przewodzenie bodźców.

Domowe sposoby łagodzą objaw, ale **nie usuwają przyczyny** — jeśli to recesja, abrazja czy próchnica, problem będzie wracał.

### Leczenie w gabinecie — usuwamy przyczynę

* **Diagnoza** — najpierw ustalamy, skąd bierze się nadwrażliwość (recesja, ubytek, erozja, pęknięcie), bo od tego zależy leczenie.
* **Fluoryzacja lakierem** — profesjonalny lakier o wysokim stężeniu fluoru wzmacnia i „uszczelnia" odsłonięte powierzchnie; szybka, bezbolesna procedura.
* **Odbudowa odsłoniętych szyjek** — ubytki przyszyjkowe i starte szyjki odbudowujemy materiałem kompozytowym, co zamyka zębinę.
* **Leczenie recesji dziąseł** — przy znacznym obniżeniu dziąsła rozważamy zabieg śluzówkowo-dziąsłowy ([periodontologia](/oferta/periodontologia)).
* **Laser** — lasery Er:YAG/Nd:YAG pozwalają zamykać kanaliki zębinowe i działać przeciwbólowo bezpośrednio na nadwrażliwą powierzchnię.
* **Leczenie próchnicy / wymiana wypełnień** — gdy przyczyną jest ubytek lub nieszczelne wypełnienie ([stomatologia zachowawcza](/oferta/stomatologia-zachowawcza)).
* **Szyna relaksacyjna** — przy bruksizmie chroni zęby przed dalszym ścieraniem.

### Kiedy zgłosić się do dentysty

Umów wizytę, jeśli ból utrzymuje się mimo pasty na nadwrażliwość, jest silny lub punktowy, pojawia się samoistnie albo budzi w nocy — to może oznaczać próchnicę, pęknięcie lub problem z miazgą, których nie rozwiąże żadna domowa metoda. [Umów konsultację](/rezerwacja) — ustalimy przyczynę i dobierzemy leczenie, które realnie usunie nadwrażliwość, a nie tylko ją maskuje.$body$
WHERE group_id = '4134620d-f995-4cc8-8ce0-b76826a14df7' AND locale = 'pl';

DELETE FROM articles WHERE group_id = '4134620d-f995-4cc8-8ce0-b76826a14df7' AND locale <> 'pl';
