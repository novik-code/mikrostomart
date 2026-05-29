-- Migration 159: News article — "Pełna metamorfoza uśmiechu" (case-study teaser / zajawka)
--
-- Aktualność (news) zapowiadająca pełne studium przypadku metamorfozy uśmiechu.
-- Pacjentka przyszła jako osoba towarzysząca synowi → przełamała wieloletni strach →
-- wieloetapowa rehabilitacja (stara protetyka → przebudowa podłoża → chirurgia +
-- implantologia → protetyka tymczasowa → ostateczna rekonstrukcja). Leczenie
-- prowadził lek. dent. Marcin Nowosielski M.Sc. Pełne case study (baza wiedzy) wkrótce.
--
-- Treść w formacie MARKDOWN (NIE HTML) — parser strony slug
-- src/app/[locale]/aktualnosci/[slug]/page.tsx obsługuje: ## h2, **bold**,
-- [text](/path) internal links (auto locale-prefix), ![alt](src) images.
-- Linki wewnętrzne pisane bez prefiksu locale — parser dokleja /en, /de, /ua sam.
-- UWAGA: NIE zagnieżdżać [linków] wewnątrz **bold** (regex bolda połyka link).
--
-- Tłumaczenia EN/DE/UA w kolumnach {field}_{locale} → hreflang + sitemap auto-pickup
-- (title_xx obecne → strona /en|/de|/ua/aktualnosci/<slug> indeksowana). NewsArticle
-- schema, BreadcrumbList, meta keywords z `tags` — wszystko auto z page.tsx.
--
-- Hero + OG + listing thumbnail: /images/news/metamorfoza-przypadkowa-wizyta/main.webp
-- (1080×1080 WebP 113 KB, optymalizacja z oryginału grafiki "ewa metamorfoza.png").
--
-- 🚨 WGRAĆ TYLKO NA PRODUKCJI (keucogopujdolzmfajjv). NIE na demo —
-- artykuł zawiera realne zdjęcia pacjentki + branding kliniki (zgoda dotyczy
-- mikrostomart.pl, nie demo SaaS). DB content nie jest objęty deepSanitize.
--
-- Idempotent: INSERT ... WHERE NOT EXISTS (guard po slug).

INSERT INTO news (
    id, title, slug, excerpt, content, date, image, tags,
    title_en, excerpt_en, content_en,
    title_de, excerpt_de, content_de,
    title_ua, excerpt_ua, content_ua
)
SELECT
    'news-metamorfoza-przypadkowa-wizyta',
    $plt$Pełna metamorfoza uśmiechu — przypadkowa wizyta, nieprzypadkowa przemiana$plt$,
    'pelna-metamorfoza-usmiechu-przypadkowa-wizyta',
    $ple$Przyszła jako osoba towarzysząca synowi. Przełamała wieloletni strach przed dentystą i zdecydowała się na własną, wieloetapową metamorfozę uśmiechu w klinice Mikrostomart w Opolu.$ple$,
    $plb$Czasami największe metamorfozy zaczynają się zupełnie… przypadkiem.

Poznajcie naszą niezwykle sympatyczną Pacjentkę. Jej droga do nowego uśmiechu zaczęła się w dniu, w którym przekroczyła próg naszej kliniki wyłącznie jako osoba towarzysząca swojemu synowi. Obserwując z boku nasze podejście, zaangażowanie i realne efekty leczenia, podjęła niezwykle odważną decyzję — postanowiła przełamać swój wielki, wieloletni strach przed fotelem dentystycznym.

## Maraton, nie sprint

Jak to w życiu bywa, u najwspanialszych ludzi nierzadko kryją się najtrudniejsze sytuacje. To leczenie nie było sprintem, lecz długim i bardzo wymagającym maratonem — rozłożonym na wiele etapów, z czasem na gojenie i pełną kontrolą każdego kroku.

Aby osiągnąć efekt, który widzicie na zdjęciach **przed** i **po**, przeszliśmy razem przez kompleksowy, precyzyjnie zaplanowany proces.

## Etapy leczenia — krok po kroku

* **Zdjęcie i usunięcie starej, nieszczelnej protetyki** — punkt wyjścia do pełnej odbudowy.
* **Gruntowna przebudowa i rekonstrukcja podłoża protetycznego** — solidny fundament pod nowy uśmiech.
* **Zaawansowane zabiegi chirurgiczne i implantologiczne** — odtworzenie brakujących zębów w oparciu o cyfrowe planowanie ([chirurgia](/oferta/chirurgia), [implantologia](/oferta/implantologia)).
* **Miesiące funkcjonowania w precyzyjnie dobranej protetyce tymczasowej** — komfort i estetyka już w trakcie leczenia ([protetyka](/oferta/protetyka)).
* **Finał: ostateczna, pełna rekonstrukcja uśmiechu** — trwały, naturalny efekt.

![Pełna metamorfoza uśmiechu — stan przed i po kompleksowym leczeniu w klinice Mikrostomart w Opolu](/images/news/metamorfoza-przypadkowa-wizyta/main.webp)

## Architekt tego sukcesu

Leczenie szczegółowo zaplanował i poprowadził na każdym etapie [lek. dent. Marcin Nowosielski M.Sc.](/zespol/marcin-nowosielski) — Master of Science in Lasers in Dentistry (RWTH Aachen). To właśnie spójny plan, doświadczenie i precyzja na każdym kroku pozwoliły bezpiecznie doprowadzić tak złożony przypadek do końca. Więcej o naszych [akredytacjach i podejściu](/akredytacje).

## To dopiero zwiastun

To, co widzicie dzisiaj, to zaledwie zwiastun. Ten przypadek jest na tyle fascynujący, że przygotowujemy dla Was **pełną prezentację krok po kroku** — szczegółowe studium przypadku z opisem każdego etapu. Już wkrótce opublikujemy je na naszej stronie. Zaglądajcie do [galerii metamorfoz](/metamorfozy), aby tego nie przegapić.

## Boisz się dentysty? Masz za sobą trudne doświadczenia?

Zaufaj nam — jesteśmy tu, aby Ci pomóc. Każdą, nawet najbardziej złożoną sytuację, zaczynamy od spokojnej rozmowy i jasnego planu. [Umów wizytę](/rezerwacja) i przekonaj się, jak wiele dziś można.

**Klinika Mikrostomart** — 45-940 Opole, ul. Centralna 33a — tel. **570 270 470** — gabinet@mikrostomart.pl

*Pacjentka wyraziła pisemną zgodę na publikację zdjęć i swojej historii. Dane osobowe pozostają anonimowe.*$plb$,
    '2026-05-29',
    '/images/news/metamorfoza-przypadkowa-wizyta/main.webp',
    ARRAY[
        'metamorfoza uśmiechu',
        'metamorfoza uśmiechu Opole',
        'implanty Opole',
        'implantologia',
        'protetyka',
        'rekonstrukcja uśmiechu',
        'przełamanie strachu przed dentystą',
        'Marcin Nowosielski',
        'stomatologia Opole',
        'Mikrostomart',
        'metamorfoza przed i po',
        'studium przypadku'
    ],

    -- ─────────── EN ───────────
    $ent$A complete smile transformation — an accidental visit, a deliberate change$ent$,
    $ene$She came only to accompany her son. She overcame years of dental fear and chose her own multi-stage smile transformation at the Mikrostomart clinic in Opole, Poland.$ene$,
    $enb$Sometimes the biggest transformations begin entirely… by accident.

Meet one of our wonderful patients. Her journey to a new smile started on the day she walked through our clinic door only to accompany her son. Watching our approach, dedication and the real results of treatment from the sidelines, she made a remarkably brave decision — she chose to overcome her long-standing, deep-rooted fear of the dental chair.

## A marathon, not a sprint

As life often goes, the kindest people sometimes carry the hardest cases. This treatment was not a sprint, but a long and demanding marathon — spread across many stages, with time for healing and full control at every step.

To achieve the result you can see in the **before** and **after** photos, we went through a comprehensive, carefully planned process together.

## Treatment stages — step by step

* **Removing the old, leaking prosthetic work** — the starting point for a full reconstruction.
* **Thorough rebuilding and reconstruction of the prosthetic foundation** — a solid base for the new smile.
* **Advanced surgical and implant procedures** — restoring the missing teeth based on digital planning ([oral surgery](/oferta/chirurgia), [implantology](/oferta/implantologia)).
* **Months of living with carefully fitted temporary prosthetics** — comfort and aesthetics already during treatment ([prosthetics](/oferta/protetyka)).
* **The finale: the final, complete smile reconstruction** — a durable, natural result.

![A complete smile transformation — before and after comprehensive treatment at the Mikrostomart clinic in Opole, Poland](/images/news/metamorfoza-przypadkowa-wizyta/main.webp)

## The architect of this success

Every stage of the treatment was carefully planned and led by [Marcin Nowosielski DDS, M.Sc.](/zespol/marcin-nowosielski) — Master of Science in Lasers in Dentistry (RWTH Aachen). A coherent plan, experience and precision at every step are exactly what made it possible to bring such a complex case safely to completion. Learn more about our [accreditations and approach](/akredytacje).

## This is only a trailer

What you see today is just a trailer. This case is so fascinating that we are preparing a **full, step-by-step presentation** — a detailed case study describing every stage. We will publish it on our website soon. Visit our [smile gallery](/metamorfozy) so you don't miss it.

## Afraid of the dentist? Carrying difficult experiences?

Trust us — we are here to help. We begin every situation, even the most complex one, with a calm conversation and a clear plan. [Book a visit](/rezerwacja) and see how much is possible today.

**Mikrostomart Clinic** — ul. Centralna 33a, 45-940 Opole, Poland — phone **+48 570 270 470** — gabinet@mikrostomart.pl

*The patient gave written consent for the publication of her photos and story. Personal details remain anonymous.*$enb$,

    -- ─────────── DE ───────────
    $det$Eine vollständige Lächeln-Metamorphose — ein zufälliger Besuch, eine bewusste Veränderung$det$,
    $dee$Sie kam nur als Begleitung ihres Sohnes. Sie überwand jahrelange Zahnarztangst und entschied sich für ihre eigene mehrstufige Lächeln-Metamorphose in der Klinik Mikrostomart in Opole, Polen.$dee$,
    $deb$Manchmal beginnen die größten Verwandlungen ganz… zufällig.

Lernen Sie eine unserer wunderbaren Patientinnen kennen. Ihr Weg zu einem neuen Lächeln begann an dem Tag, an dem sie unsere Klinik nur als Begleitung ihres Sohnes betrat. Als sie unser Vorgehen, unser Engagement und die echten Behandlungsergebnisse aus der Nähe beobachtete, traf sie eine bemerkenswert mutige Entscheidung — sie beschloss, ihre große, jahrelange Angst vor dem Zahnarztstuhl zu überwinden.

## Ein Marathon, kein Sprint

Wie es im Leben oft ist, verbergen sich bei den wunderbarsten Menschen mitunter die schwierigsten Fälle. Diese Behandlung war kein Sprint, sondern ein langer und sehr anspruchsvoller Marathon — verteilt auf viele Etappen, mit Zeit zum Heilen und voller Kontrolle bei jedem Schritt.

Um das Ergebnis zu erreichen, das Sie auf den **Vorher**- und **Nachher**-Fotos sehen, sind wir gemeinsam durch einen umfassenden, präzise geplanten Prozess gegangen.

## Behandlungsschritte — Schritt für Schritt

* **Entfernung des alten, undichten Zahnersatzes** — der Ausgangspunkt für eine vollständige Rekonstruktion.
* **Gründlicher Aufbau und Rekonstruktion des prothetischen Fundaments** — eine solide Basis für das neue Lächeln.
* **Fortgeschrittene chirurgische und implantologische Eingriffe** — Wiederherstellung der fehlenden Zähne auf Basis digitaler Planung ([Oralchirurgie](/oferta/chirurgia), [Implantologie](/oferta/implantologia)).
* **Monate mit präzise angepasstem Provisorium** — Komfort und Ästhetik bereits während der Behandlung ([Prothetik](/oferta/protetyka)).
* **Das Finale: die endgültige, vollständige Rekonstruktion des Lächelns** — ein dauerhaftes, natürliches Ergebnis.

![Eine vollständige Lächeln-Metamorphose — vorher und nachher nach umfassender Behandlung in der Klinik Mikrostomart in Opole, Polen](/images/news/metamorfoza-przypadkowa-wizyta/main.webp)

## Der Architekt dieses Erfolgs

Jede Etappe der Behandlung wurde von [Zahnarzt Marcin Nowosielski M.Sc.](/zespol/marcin-nowosielski) — Master of Science in Lasers in Dentistry (RWTH Aachen) — detailliert geplant und geleitet. Genau ein stimmiger Plan, Erfahrung und Präzision bei jedem Schritt machten es möglich, einen so komplexen Fall sicher zum Abschluss zu bringen. Erfahren Sie mehr über unsere [Akkreditierungen und unseren Ansatz](/akredytacje).

## Das ist erst der Trailer

Was Sie heute sehen, ist nur ein Trailer. Dieser Fall ist so faszinierend, dass wir für Sie eine **vollständige Schritt-für-Schritt-Präsentation** vorbereiten — eine detaillierte Fallstudie mit der Beschreibung jeder Etappe. Wir werden sie bald auf unserer Website veröffentlichen. Schauen Sie in unsere [Lächeln-Galerie](/metamorfozy), um es nicht zu verpassen.

## Haben Sie Angst vor dem Zahnarzt? Schwierige Erfahrungen hinter sich?

Vertrauen Sie uns — wir sind hier, um Ihnen zu helfen. Jede, auch die komplexeste Situation beginnen wir mit einem ruhigen Gespräch und einem klaren Plan. [Vereinbaren Sie einen Termin](/rezerwacja) und überzeugen Sie sich, wie viel heute möglich ist.

**Klinik Mikrostomart** — ul. Centralna 33a, 45-940 Opole, Polen — Tel. **+48 570 270 470** — gabinet@mikrostomart.pl

*Die Patientin hat der Veröffentlichung ihrer Fotos und ihrer Geschichte schriftlich zugestimmt. Die persönlichen Daten bleiben anonym.*$deb$,

    -- ─────────── UA ───────────
    $uat$Повна метаморфоза усмішки — випадковий візит, невипадкова зміна$uat$,
    $uae$Вона прийшла лише як супровід свого сина. Подолала багаторічний страх перед стоматологом і обрала власну багатоетапну метаморфозу усмішки в клініці Mikrostomart в Ополе, Польща.$uae$,
    $uab$Іноді найбільші метаморфози починаються зовсім… випадково.

Знайомтеся з нашою надзвичайно приємною Пацієнткою. Її шлях до нової усмішки розпочався того дня, коли вона переступила поріг нашої клініки лише як супровід свого сина. Спостерігаючи збоку за нашим підходом, відданістю та реальними результатами лікування, вона прийняла надзвичайно сміливе рішення — подолати свій великий, багаторічний страх перед стоматологічним кріслом.

## Марафон, а не спринт

Як це часто буває в житті, у найчудовіших людей нерідко криються найскладніші ситуації. Це лікування було не спринтом, а довгим і дуже вимогливим марафоном — розподіленим на багато етапів, із часом на загоєння та повним контролем кожного кроку.

Щоб досягти результату, який ви бачите на фото **до** та **після**, ми разом пройшли через комплексний, ретельно спланований процес.

## Етапи лікування — крок за кроком

* **Зняття та видалення старої, негерметичної протетики** — відправна точка для повної реконструкції.
* **Ґрунтовна перебудова та реконструкція протезного ложа** — міцний фундамент для нової усмішки.
* **Складні хірургічні та імплантологічні втручання** — відновлення відсутніх зубів на основі цифрового планування ([хірургія](/oferta/chirurgia), [імплантологія](/oferta/implantologia)).
* **Місяці з точно підібраною тимчасовою протетикою** — комфорт та естетика вже під час лікування ([протетика](/oferta/protetyka)).
* **Фінал: остаточна, повна реконструкція усмішки** — стійкий, природний результат.

![Повна метаморфоза усмішки — до та після комплексного лікування в клініці Mikrostomart в Ополе, Польща](/images/news/metamorfoza-przypadkowa-wizyta/main.webp)

## Архітектор цього успіху

Кожен етап лікування детально спланував і провів [лік. стом. Марцін Новосельський M.Sc.](/zespol/marcin-nowosielski) — Master of Science in Lasers in Dentistry (RWTH Aachen). Саме узгоджений план, досвід і точність на кожному кроці дозволили безпечно довести такий складний випадок до кінця. Більше про наші [акредитації та підхід](/akredytacje).

## Це лише трейлер

Те, що ви бачите сьогодні, — це лише трейлер. Цей випадок настільки захопливий, що ми готуємо для вас **повну презентацію крок за кроком** — детальне дослідження випадку з описом кожного етапу. Незабаром ми опублікуємо його на нашому сайті. Зазирайте до [галереї метаморфоз](/metamorfozy), щоб не пропустити.

## Боїтеся стоматолога? Маєте за плечима складний досвід?

Довіртеся нам — ми тут, щоб допомогти. Будь-яку, навіть найскладнішу ситуацію ми починаємо зі спокійної розмови та чіткого плану. [Запишіться на візит](/rezerwacja) і переконайтеся, як багато можливо сьогодні.

**Клініка Mikrostomart** — ul. Centralna 33a, 45-940 Opole, Польща — тел. **+48 570 270 470** — gabinet@mikrostomart.pl

*Пацієнтка надала письмову згоду на публікацію своїх фото та історії. Особисті дані залишаються анонімними.*$uab$
WHERE NOT EXISTS (
    SELECT 1 FROM news WHERE slug = 'pelna-metamorfoza-usmiechu-przypadkowa-wizyta'
);
