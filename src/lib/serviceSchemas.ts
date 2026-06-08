/**
 * Per-locale FAQ + MedicalProcedure schemas dla 6 service pages /oferta/*.
 *
 * Faza G5 (2026-05-10): wcześniej schemas były hardcoded w PL w każdym layoucie.
 * Dla /en/oferta/* SERP nie pokazywał rich snippets w angielskim. Po G5: każda
 * service page ma FAQ accordion + MedicalProcedure schema w 4 lokalach.
 *
 * Format: SERVICE_SCHEMAS[path][locale] = { faq: [...], procedure: {...} }
 */
import { brand } from '@/lib/brandConfig';

export interface FAQItem {
    q: string;
    a: string;
}

export interface MedicalProcedureContent {
    name: string;
    /** 'SurgicalProcedure' | 'TherapeuticProcedure' */
    procedureType: 'SurgicalProcedure' | 'TherapeuticProcedure';
    /** schema.org body location, e.g. 'Mouth', 'Tooth', 'Teeth' */
    bodyLocation: string;
    description: string;
    howPerformed: string;
    preparation: string;
    followup: string;
}

export interface ServicePageSchemaContent {
    faq: FAQItem[];
    procedure: MedicalProcedureContent;
}

export type ServiceSchemaMap = Partial<Record<string, ServicePageSchemaContent>>;

export const SERVICE_SCHEMAS: Record<string, ServiceSchemaMap> = {
    // ═════════════════ /oferta/implantologia ═════════════════
    '/oferta/implantologia': {
        pl: {
            faq: [
                { q: 'Czy zabieg implantacji jest bezpieczny?', a: 'Tak, poprzedzamy go szczegółowym wywiadem i badaniami tomograficznymi. Zabieg planowany jest cyfrowo z użyciem szablonu implantologicznego.' },
                { q: 'Czy zabieg implantacji jest bolesny?', a: 'Nie, wykonywany jest w skutecznym znieczuleniu miejscowym. Dyskomfort po zabiegu jest porównywalny do usunięcia zęba.' },
                { q: 'Na jak długo starczają implanty zębowe?', a: 'Prawidłowo wykonane implanty przy dobrej higienie mogą służyć do końca życia. Skuteczność implantacji to ok. 98%.' },
                { q: 'Jakie są przeciwwskazania do implantacji?', a: 'Nieustabilizowana cukrzyca, ciąża, ciężkie choroby ogólnoustrojowe, wiek poniżej 16 lat. Kluczowa jest ilość kości — jeśli jest jej za mało, wykonujemy zabiegi regeneracyjne.' },
                { q: 'Ile kosztuje implant zęba w Opolu?', a: 'Wszczepienie implantu: 3500 zł, korona na implancie: 3500 zł, materiał kościozastępczy: 500-5500 zł, podniesienie dna zatoki (Sinus Lift): 1500-5000 zł. Ceny orientacyjne.' },
            ],
            procedure: {
                name: 'Implantacja zębów Opole',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Tooth',
                description: 'Zabiegi implantacji z zastosowaniem planowania cyfrowego i szablonów implantologicznych. Minimalnie inwazyjne, precyzyjne i bezbolesne.',
                howPerformed: 'Implant wprowadzany jest na podstawie indywidualnego szablonu zaprojektowanego przy użyciu badania tomograficznego (CBCT). Zabieg trwa ok. 30-40 minut.',
                preparation: 'Szczegółowy wywiad lekarski, badanie tomograficzne, cyfrowe planowanie zabiegu z indywidualnym szablonem.',
                followup: 'Okres osteointegracji 3-6 miesięcy, po czym montowana jest korona ostateczna.',
            },
        },
        en: {
            faq: [
                { q: 'Is dental implant surgery safe?', a: 'Yes, we precede it with a detailed medical interview and CBCT imaging. The procedure is digitally planned using a surgical implant template.' },
                { q: 'Is dental implant surgery painful?', a: 'No, it is performed under effective local anesthesia. Post-procedure discomfort is comparable to a routine tooth extraction.' },
                { q: 'How long do dental implants last?', a: 'Properly placed implants with good hygiene can last a lifetime. Implant success rate is approximately 98%.' },
                { q: 'What are contraindications for dental implants?', a: 'Uncontrolled diabetes, pregnancy, severe systemic diseases, age under 16. Bone volume is critical — if insufficient, we perform regenerative procedures (bone grafting).' },
                { q: 'How much does a dental implant cost in Opole, Poland?', a: 'Implant placement: 3500 PLN, crown on implant: 3500 PLN, bone graft material: 500-5500 PLN, sinus lift: 1500-5000 PLN. Indicative prices.' },
            ],
            procedure: {
                name: 'Dental implants in Opole, Poland',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Tooth',
                description: 'Implant procedures with digital planning and surgical templates. Minimally invasive, precise and painless.',
                howPerformed: 'Implant is placed based on an individual surgical guide designed using CBCT imaging. The procedure takes approximately 30-40 minutes.',
                preparation: 'Detailed medical interview, CBCT imaging, digital procedure planning with an individual surgical template.',
                followup: 'Osseointegration period of 3-6 months, after which the final crown is placed.',
            },
        },
        de: {
            faq: [
                { q: 'Ist die Implantation sicher?', a: 'Ja, wir gehen ihr mit einer detaillierten Anamnese und CBCT-Untersuchung voraus. Der Eingriff wird digital mit einer Implantatschablone geplant.' },
                { q: 'Ist die Implantation schmerzhaft?', a: 'Nein, sie wird unter wirksamer Lokalanästhesie durchgeführt. Beschwerden nach dem Eingriff sind mit einer routinemäßigen Zahnextraktion vergleichbar.' },
                { q: 'Wie lange halten Zahnimplantate?', a: 'Korrekt eingesetzte Implantate können bei guter Hygiene ein Leben lang halten. Die Erfolgsquote beträgt etwa 98 %.' },
                { q: 'Welche Gegenanzeigen gibt es für Implantate?', a: 'Unkontrollierter Diabetes, Schwangerschaft, schwere Allgemeinerkrankungen, Alter unter 16. Das Knochenvolumen ist entscheidend — bei Mangel führen wir regenerative Eingriffe durch.' },
                { q: 'Was kostet ein Zahnimplantat in Opole, Polen?', a: 'Implantatsetzung: 3500 PLN, Krone auf Implantat: 3500 PLN, Knochenersatzmaterial: 500-5500 PLN, Sinuslift: 1500-5000 PLN. Richtpreise.' },
            ],
            procedure: {
                name: 'Zahnimplantate in Opole, Polen',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Tooth',
                description: 'Implantatverfahren mit digitaler Planung und chirurgischen Schablonen. Minimalinvasiv, präzise und schmerzfrei.',
                howPerformed: 'Das Implantat wird auf Basis einer individuellen chirurgischen Schablone aus CBCT-Daten gesetzt. Der Eingriff dauert ca. 30-40 Minuten.',
                preparation: 'Detaillierte Anamnese, CBCT-Aufnahme, digitale Planung mit individueller chirurgischer Schablone.',
                followup: 'Einheilzeit von 3-6 Monaten, danach Versorgung mit der endgültigen Krone.',
            },
        },
        ua: {
            faq: [
                { q: 'Чи безпечна імплантація зубів?', a: 'Так, передує їй детальний анамнез та КТ-обстеження. Процедура планується цифрово за допомогою імплантологічного шаблону.' },
                { q: 'Чи болюча імплантація?', a: 'Ні, виконується під ефективною місцевою анестезією. Дискомфорт після процедури порівнянний з рутинним видаленням зуба.' },
                { q: 'Як довго служать імпланти?', a: 'Правильно встановлені імпланти при гарній гігієні можуть служити все життя. Успішність імплантації близько 98%.' },
                { q: 'Які протипоказання до імплантації?', a: 'Неконтрольований діабет, вагітність, важкі системні захворювання, вік до 16 років. Об\'єм кістки критичний — при недоліку виконуємо регенеративні процедури.' },
                { q: 'Скільки коштує імплант зуба в Ополе?', a: 'Встановлення імпланту: 3500 PLN, коронка на імплант: 3500 PLN, кістковозамінний матеріал: 500-5500 PLN, синус-ліфтинг: 1500-5000 PLN. Орієнтовні ціни.' },
            ],
            procedure: {
                name: 'Імпланти зубів в Ополе',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Tooth',
                description: 'Імплантація з цифровим плануванням та хірургічними шаблонами. Мінімально інвазивна, точна, безболісна.',
                howPerformed: 'Імплант встановлюється за індивідуальним хірургічним шаблоном з даних КТ. Процедура триває близько 30-40 хвилин.',
                preparation: 'Детальний анамнез, КТ-обстеження, цифрове планування з індивідуальним хірургічним шаблоном.',
                followup: 'Період остеоінтеграції 3-6 місяців, після чого встановлення фінальної коронки.',
            },
        },
    },

    // ═════════════════ /oferta/chirurgia ═════════════════
    '/oferta/chirurgia': {
        pl: {
            faq: [
                { q: 'Kiedy trzeba usunąć ósemki (zęby mądrości)?', a: 'Gdy brakuje na nie miejsca w łuku (stłoczenia), powodują stany zapalne, próchnicę siódemek lub torbiele. Oceniamy to na podstawie zdjęcia pantomograficznego.' },
                { q: 'Co to jest PRF?', a: 'To bogatopłytkowa fibryna uzyskiwana z krwi pacjenta. Działa jak naturalny super-plaster, przyspieszając gojenie rany po ekstrakcji nawet kilkukrotnie.' },
                { q: 'Jakie są zalecenia po usunięciu zęba?', a: 'Przez 2 godziny nie jeść. W dobie zabiegu unikać gorących posiłków i wysiłku fizycznego. Nie płukać ust energicznie (by nie wypłukać skrzepu). Stosować zimne okłady.' },
                { q: 'Czy suchy zębodół to częste powikłanie?', a: 'Zdarza się rzadko (ok. 2-5%), głównie u palaczy. Aby mu zapobiec, stosujemy PRF oraz ozonoterapię, które drastycznie zmniejszają ryzyko powikłań.' },
            ],
            procedure: {
                name: 'Chirurgia stomatologiczna Opole',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Mouth',
                description: 'Zabiegi chirurgiczne w obrębie jamy ustnej: ekstrakcje zębów (w tym ósemek), resekcje korzenia, hemisekcje, rekonstrukcje kości. Zastosowanie technologii PRF dla przyspieszonego gojenia.',
                howPerformed: 'Zabiegi w znieczuleniu miejscowym z wykorzystaniem mikroskopu zabiegowego oraz PRF (bogatopłytkowa fibryna z krwi pacjenta) dla skróconego czasu gojenia.',
                preparation: 'Szczegółowy wywiad medyczny, badanie radiologiczne (RTG/CBCT), planowanie zabiegu i ewentualne badania dodatkowe.',
                followup: 'Zalecenia poekstrakcyjne (zimne okłady, dieta miękka, unikanie wysiłku 24h). Kontrola po 7 dniach.',
            },
        },
        en: {
            faq: [
                { q: 'When do wisdom teeth need to be removed?', a: 'When there is insufficient space in the arch (crowding), they cause inflammation, decay of adjacent molars, or cysts. We assess this based on a panoramic X-ray.' },
                { q: 'What is PRF?', a: 'Platelet-rich fibrin obtained from the patient\'s own blood. It acts as a natural super-bandage, accelerating wound healing after extraction up to several times faster.' },
                { q: 'What are the post-extraction recommendations?', a: 'Do not eat for 2 hours. On the day of the procedure, avoid hot meals and physical exertion. Do not rinse the mouth vigorously (to prevent dislodging the clot). Apply cold compresses.' },
                { q: 'Is dry socket a common complication?', a: 'It occurs rarely (about 2-5%), mainly in smokers. To prevent it, we use PRF and ozone therapy, which drastically reduce the risk of complications.' },
            ],
            procedure: {
                name: 'Oral surgery in Opole, Poland',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Mouth',
                description: 'Oral surgical procedures: tooth extractions (including wisdom teeth), root resections, hemisections, bone reconstructions. PRF technology for accelerated healing.',
                howPerformed: 'Procedures performed under local anesthesia using a surgical microscope and PRF (platelet-rich fibrin from patient\'s blood) for shorter recovery time.',
                preparation: 'Detailed medical interview, radiological imaging (X-ray/CBCT), procedure planning and any additional examinations.',
                followup: 'Post-extraction recommendations (cold compresses, soft diet, avoiding exertion for 24h). Follow-up after 7 days.',
            },
        },
        de: {
            faq: [
                { q: 'Wann müssen Weisheitszähne entfernt werden?', a: 'Wenn nicht genügend Platz im Kiefer ist (Engstand), Entzündungen verursacht, Karies an benachbarten Zähnen oder Zysten. Wir beurteilen dies anhand einer Panoramaaufnahme.' },
                { q: 'Was ist PRF?', a: 'Plättchenreiches Fibrin aus dem Blut des Patienten. Wirkt wie ein natürliches Super-Pflaster und beschleunigt die Wundheilung nach Extraktion um ein Vielfaches.' },
                { q: 'Welche Empfehlungen nach der Zahnextraktion?', a: 'Für 2 Stunden nicht essen. Am Tag der OP heiße Speisen und körperliche Anstrengung meiden. Nicht kräftig spülen (um das Blutgerinnsel nicht zu lösen). Kalte Kompressen.' },
                { q: 'Ist eine alveoläre Ostitis (dry socket) eine häufige Komplikation?', a: 'Sie tritt selten auf (ca. 2-5%), vor allem bei Rauchern. Zur Vorbeugung verwenden wir PRF und Ozontherapie, was das Risiko drastisch reduziert.' },
            ],
            procedure: {
                name: 'Mund-Kiefer-Chirurgie in Opole, Polen',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Mouth',
                description: 'Chirurgische Eingriffe im Mundbereich: Zahnextraktionen (einschließlich Weisheitszähnen), Wurzelspitzenresektionen, Hemisektionen, Knochenrekonstruktionen. PRF-Technologie für beschleunigte Heilung.',
                howPerformed: 'Eingriffe unter Lokalanästhesie mit chirurgischem Mikroskop und PRF (plättchenreiches Fibrin aus Patientenblut) für kürzere Heilungszeit.',
                preparation: 'Detaillierte Anamnese, Röntgendiagnostik (RTG/CBCT), OP-Planung und ggf. weitere Untersuchungen.',
                followup: 'Empfehlungen nach Extraktion (Kühlung, weiche Kost, Schonung 24h). Kontrolle nach 7 Tagen.',
            },
        },
        ua: {
            faq: [
                { q: 'Коли потрібно видаляти зуби мудрості?', a: 'Коли немає місця в дузі (скупченість), вони викликають запалення, карієс сьомих зубів або кісти. Оцінюємо це за панорамним рентгенівським знімком.' },
                { q: 'Що таке PRF?', a: 'Це збагачений тромбоцитами фібрин з крові пацієнта. Діє як природний супер-пластир, прискорюючи загоєння рани після екстракції кілька разів.' },
                { q: 'Які рекомендації після видалення зуба?', a: 'Протягом 2 годин не їсти. У день процедури уникати гарячої їжі та фізичних навантажень. Не полоскати рот сильно (щоб не вимити згусток). Холодні компреси.' },
                { q: 'Чи часте ускладнення сухої лунки?', a: 'Трапляється рідко (близько 2-5%), переважно у курців. Для запобігання використовуємо PRF та озонотерапію, які різко знижують ризик ускладнень.' },
            ],
            procedure: {
                name: 'Стоматологічна хірургія в Ополе',
                procedureType: 'SurgicalProcedure',
                bodyLocation: 'Mouth',
                description: 'Хірургічні втручання в порожнині рота: видалення зубів (включно з вісімками), резекції коренів, геміусекції, реконструкції кістки. Технологія PRF для прискореного загоєння.',
                howPerformed: 'Процедури під місцевою анестезією з використанням хірургічного мікроскопа та PRF (фібрин з крові пацієнта) для скорочення часу загоєння.',
                preparation: 'Детальний анамнез, рентгенологічна діагностика (РТГ/КТ), планування процедури та можливі додаткові обстеження.',
                followup: 'Рекомендації після екстракції (холодні компреси, м\'яка дієта, уникнення навантажень 24 год). Контроль через 7 днів.',
            },
        },
    },

    // ═════════════════ /oferta/leczenie-kanalowe ═════════════════
    // ═════════════════ /oferta/periodontologia ═════════════════
    '/oferta/periodontologia': {
        pl: {
            faq: [
                { q: 'Czy paradontozę da się wyleczyć?', a: 'Paradontoza to choroba przewlekła — nie znika całkowicie, ale można ją skutecznie zatrzymać i utrzymać pod kontrolą. Kluczowe są wczesne leczenie i regularna faza podtrzymująca.' },
                { q: 'Czy leczenie dziąseł boli?', a: 'Zabiegi wykonujemy w znieczuleniu, a dekontaminacja laserowa (Nd:YAG) jest dodatkowo mało inwazyjna i bezkrwawa. Większość pacjentów dobrze znosi leczenie.' },
                { q: 'Czy krwawiące dziąsła to już paradontoza?', a: 'Krwawienie to najczęstszy wczesny sygnał zapalenia dziąseł — nieleczone może przejść w paradontozę. Warto wykonać badanie sondowania, zanim choroba zaatakuje kość.' },
                { q: 'Czy rozchwiane zęby można uratować?', a: 'Często tak, jeśli zareagujemy odpowiednio wcześnie. Po zatrzymaniu choroby zęby mogą się ustabilizować; w wybranych przypadkach stosujemy szynowanie.' },
                { q: 'Jak często trzeba przychodzić na wizyty kontrolne?', a: 'W fazie podtrzymującej zwykle co 3–4 miesiące. Częstotliwość dobieramy indywidualnie, zależnie od zaawansowania choroby i higieny domowej.' },
            ],
            procedure: {
                name: 'Leczenie paradontozy (periodontologia) Opole',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Gums',
                description: 'Leczenie chorób przyzębia: diagnostyka (sondowanie kieszonek dziąsłowych), skaling poddziąsłowy i root planing, laserowa dekontaminacja kieszonek (Nd:YAG) oraz faza podtrzymująca.',
                howPerformed: 'Po sondowaniu i ocenie poziomu kości usuwamy płytkę i kamień nad- i poddziąsłowy, oczyszczamy powierzchnię korzeni, a chore kieszonki odkażamy laserem Nd:YAG. Zabiegi w znieczuleniu.',
                preparation: 'Badanie periodontologiczne (sondowanie), w razie potrzeby RTG/CBCT, wywiad (palenie, cukrzyca, leki).',
                followup: 'Faza podtrzymująca — wizyty kontrolne i higienizacja zwykle co 3–4 miesiące.',
            },
        },
        en: {
            faq: [
                { q: 'Can gum disease be cured?', a: 'Periodontitis is a chronic disease — it does not disappear completely, but it can be effectively stopped and kept under control. Early treatment and a regular maintenance phase are key.' },
                { q: 'Does gum treatment hurt?', a: 'Procedures are performed under anesthesia, and laser decontamination (Nd:YAG) is additionally minimally invasive and bloodless. Most patients tolerate the treatment well.' },
                { q: 'Are bleeding gums already periodontitis?', a: 'Bleeding is the most common early sign of gum inflammation — left untreated it can progress to periodontitis. It is worth having a probing examination before the disease attacks the bone.' },
                { q: 'Can loose teeth be saved?', a: 'Often yes, if we act early enough. Once the disease is stopped, teeth can stabilise; in selected cases we use splinting.' },
                { q: 'How often are check-up visits needed?', a: 'In the maintenance phase, usually every 3–4 months. We set the frequency individually, depending on the severity of the disease and home hygiene.' },
            ],
            procedure: {
                name: 'Periodontal (gum disease) treatment in Opole, Poland',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Gums',
                description: 'Treatment of periodontal disease: diagnostics (probing of gum pockets), subgingival scaling and root planing, laser decontamination of the pockets (Nd:YAG) and a maintenance phase.',
                howPerformed: 'After probing and bone-level assessment we remove supra- and subgingival plaque and tartar, clean the root surfaces, and disinfect diseased pockets with the Nd:YAG laser. Procedures under anesthesia.',
                preparation: 'Periodontal examination (probing), X-ray/CBCT if needed, medical interview (smoking, diabetes, medications).',
                followup: 'Maintenance phase — check-ups and hygiene visits usually every 3–4 months.',
            },
        },
        de: {
            faq: [
                { q: 'Kann Parodontitis geheilt werden?', a: 'Parodontitis ist eine chronische Erkrankung — sie verschwindet nicht vollständig, lässt sich aber wirksam stoppen und unter Kontrolle halten. Frühzeitige Behandlung und eine regelmäßige Erhaltungsphase sind entscheidend.' },
                { q: 'Tut die Zahnfleischbehandlung weh?', a: 'Die Eingriffe erfolgen unter Betäubung, und die Laser-Dekontamination (Nd:YAG) ist zusätzlich minimalinvasiv und blutarm. Die meisten Patienten vertragen die Behandlung gut.' },
                { q: 'Ist blutendes Zahnfleisch bereits Parodontitis?', a: 'Blutung ist das häufigste frühe Zeichen einer Zahnfleischentzündung — unbehandelt kann sie in eine Parodontitis übergehen. Eine Sondierungsuntersuchung lohnt sich, bevor die Erkrankung den Knochen angreift.' },
                { q: 'Können lockere Zähne gerettet werden?', a: 'Oft ja, wenn wir früh genug handeln. Nach dem Stoppen der Erkrankung können sich Zähne stabilisieren; in ausgewählten Fällen verwenden wir eine Schienung.' },
                { q: 'Wie oft sind Kontrolltermine nötig?', a: 'In der Erhaltungsphase meist alle 3–4 Monate. Die Häufigkeit legen wir individuell fest, je nach Schweregrad der Erkrankung und häuslicher Hygiene.' },
            ],
            procedure: {
                name: 'Parodontitis-Behandlung (Parodontologie) in Opole, Polen',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Gums',
                description: 'Behandlung von Parodontalerkrankungen: Diagnostik (Sondierung der Zahnfleischtaschen), subgingivales Scaling und Root Planing, Laser-Dekontamination der Taschen (Nd:YAG) sowie eine Erhaltungsphase.',
                howPerformed: 'Nach Sondierung und Beurteilung des Knochenniveaus entfernen wir supra- und subgingivale Plaque und Zahnstein, reinigen die Wurzeloberflächen und desinfizieren erkrankte Taschen mit dem Nd:YAG-Laser. Eingriffe unter Betäubung.',
                preparation: 'Parodontale Untersuchung (Sondierung), bei Bedarf Röntgen/DVT, Anamnese (Rauchen, Diabetes, Medikamente).',
                followup: 'Erhaltungsphase — Kontrolltermine und Hygienebehandlungen meist alle 3–4 Monate.',
            },
        },
        ua: {
            faq: [
                { q: 'Чи можна вилікувати пародонтоз?', a: 'Пародонтоз — хронічна хвороба, він не зникає повністю, але його можна ефективно зупинити та тримати під контролем. Ключові — раннє лікування та регулярна підтримуюча фаза.' },
                { q: 'Чи боляче лікувати ясна?', a: 'Процедури виконуємо під знеболенням, а лазерна деконтамінація (Nd:YAG) додатково малоінвазивна та безкровна. Більшість пацієнтів добре переносять лікування.' },
                { q: 'Чи кровоточивість ясен — це вже пародонтоз?', a: 'Кровоточивість — найчастіший ранній сигнал запалення ясен; без лікування може перейти в пародонтоз. Варто пройти зондування, перш ніж хвороба атакує кістку.' },
                { q: 'Чи можна врятувати рухливі зуби?', a: 'Часто так, якщо відреагувати достатньо рано. Після зупинки хвороби зуби можуть стабілізуватися; в окремих випадках застосовуємо шинування.' },
                { q: 'Як часто потрібні контрольні візити?', a: 'У підтримуючій фазі зазвичай кожні 3–4 місяці. Частоту підбираємо індивідуально, залежно від тяжкості хвороби та домашньої гігієни.' },
            ],
            procedure: {
                name: 'Лікування пародонтозу (пародонтологія) Ополе',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Gums',
                description: 'Лікування захворювань пародонту: діагностика (зондування ясенних кишень), піддесенний скейлінг і root planing, лазерна деконтамінація кишень (Nd:YAG) та підтримуюча фаза.',
                howPerformed: 'Після зондування та оцінки рівня кістки видаляємо над- і піддесенний наліт та камінь, очищаємо поверхні коренів і знезаражуємо уражені кишені лазером Nd:YAG. Процедури під знеболенням.',
                preparation: 'Пародонтологічне обстеження (зондування), за потреби РТГ/КТ, анамнез (куріння, діабет, ліки).',
                followup: 'Підтримуюча фаза — контрольні візити та гігієна зазвичай кожні 3–4 місяці.',
            },
        },
    },

    // ═════════════════ /oferta/stomatologia-dziecieca ═════════════════
    "/oferta/stomatologia-dziecieca": {
        "pl": {
            "faq": [
                {
                    "q": "W jakim wieku przyprowadzić dziecko na pierwszą wizytę?",
                    "a": "Najlepiej już około 1. roku życia lub po pojawieniu się pierwszych zębów — na wizytę adaptacyjną. Im wcześniej, tym łatwiej zbudować pozytywne skojarzenia i wcześnie wychwycić ewentualne problemy."
                },
                {
                    "q": "Czy trzeba leczyć zęby mleczne, skoro i tak wypadną?",
                    "a": "Tak. Zęby mleczne utrzymują miejsce dla stałych, umożliwiają żucie i rozwój mowy, a nieleczona próchnica może uszkodzić zawiązki zębów stałych i powodować ból."
                },
                {
                    "q": "Czy leczenie laserem jest bezpieczne dla dziecka?",
                    "a": "Tak — laser dentystyczny to sprawdzona technologia, a u dzieci szczególnie ceniona, bo pozwala leczyć wiele ubytków bez wiertła, wibracji i często bez znieczulenia."
                },
                {
                    "q": "Co to jest lakowanie bruzd?",
                    "a": "To bezbolesne uszczelnienie zagłębień (bruzd) na powierzchni żującej zębów trzonowych specjalnym lakierem. Tworzy barierę chroniącą przed próchnicą w najbardziej narażonych miejscach."
                },
                {
                    "q": "Moje dziecko bardzo boi się dentysty — co robić?",
                    "a": "Zaczynamy od wizyty adaptacyjnej bez leczenia, w spokojnym tempie. Stosujemy techniki oswajania, leczenie bez wiertła i — w razie potrzeby — sedację wziewną (podtlenek azotu). Lęk da się pokonać."
                }
            ],
            "procedure": {
                "name": "Stomatologia dziecięca Opole",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Mouth",
                "description": "Leczenie stomatologiczne dzieci: wizyty adaptacyjne, profilaktyka (lakowanie bruzd, fluoryzacja) oraz leczenie próchnicy zębów mlecznych — często laserem bez wiertła i w komputerowym znieczuleniu.",
                "howPerformed": "Zaczynamy od wizyty adaptacyjnej i oswojenia dziecka. Stosujemy profilaktykę (lakowanie, fluoryzacja) oraz leczenie próchnicy laserem Er:YAG lub w komputerowym znieczuleniu, w przyjaznej, spokojnej atmosferze.",
                "preparation": "Rozmowa z rodzicem i dzieckiem, ocena stanu uzębienia, w razie potrzeby RTG.",
                "followup": "Regularne wizyty profilaktyczne i kontrolne oraz nauka higieny dostosowana do wieku."
            }
        },
        "en": {
            "faq": [
                {
                    "q": "At what age should I bring my child for the first visit?",
                    "a": "Ideally around the age of one or once the first teeth appear — for an acclimatisation visit. The earlier, the easier it is to build positive associations and catch any problems early."
                },
                {
                    "q": "Do baby teeth need treating if they will fall out anyway?",
                    "a": "Yes. Baby teeth hold space for permanent ones, enable chewing and speech development, and untreated decay can damage the buds of permanent teeth and cause pain."
                },
                {
                    "q": "Is laser treatment safe for a child?",
                    "a": "Yes — the dental laser is proven technology, and it is especially valued in children because it allows many cavities to be treated without a drill, vibration and often without anaesthesia."
                },
                {
                    "q": "What is fissure sealing?",
                    "a": "It is the painless sealing of the grooves (fissures) on the chewing surface of molars with a special resin. It creates a barrier protecting against decay in the most vulnerable spots."
                },
                {
                    "q": "My child is very afraid of the dentist — what should I do?",
                    "a": "We start with an acclimatisation visit without treatment, at a calm pace. We use desensitising techniques, drill-free treatment and, if needed, inhalation sedation (nitrous oxide). Fear can be overcome."
                }
            ],
            "procedure": {
                "name": "Pediatric dentistry in Opole, Poland",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Mouth",
                "description": "Dental treatment for children: acclimatisation visits, prevention (fissure sealing, fluoridation) and treatment of caries in baby teeth — often with a drill-free laser and computer-controlled anaesthesia.",
                "howPerformed": "We start with an acclimatisation visit to put the child at ease. We provide prevention (sealing, fluoridation) and treat caries with the Er:YAG laser or under computer-controlled anaesthesia, in a friendly, calm atmosphere.",
                "preparation": "A talk with the parent and child, assessment of the dentition, X-ray if needed.",
                "followup": "Regular preventive and check-up visits, with age-appropriate hygiene instruction."
            }
        },
        "de": {
            "faq": [
                {
                    "q": "In welchem Alter sollte ich mein Kind zum ersten Besuch bringen?",
                    "a": "Am besten schon um das erste Lebensjahr oder nach dem Durchbruch der ersten Zähne — für einen Eingewöhnungsbesuch. Je früher, desto leichter lassen sich positive Verbindungen aufbauen und mögliche Probleme früh erkennen."
                },
                {
                    "q": "Müssen Milchzähne behandelt werden, wenn sie ohnehin ausfallen?",
                    "a": "Ja. Milchzähne halten den Platz für die bleibenden Zähne, ermöglichen Kauen und Sprachentwicklung, und unbehandelte Karies kann die Anlagen der bleibenden Zähne schädigen und Schmerzen verursachen."
                },
                {
                    "q": "Ist die Laserbehandlung für ein Kind sicher?",
                    "a": "Ja — der Dentallaser ist eine bewährte Technologie und wird bei Kindern besonders geschätzt, weil sich damit viele Kariesstellen ohne Bohrer, Vibration und oft ohne Betäubung behandeln lassen."
                },
                {
                    "q": "Was ist eine Fissurenversiegelung?",
                    "a": "Es ist die schmerzlose Versiegelung der Vertiefungen (Fissuren) auf der Kaufläche der Backenzähne mit einem speziellen Lack. Sie bildet eine Barriere, die an den anfälligsten Stellen vor Karies schützt."
                },
                {
                    "q": "Mein Kind hat große Angst vorm Zahnarzt — was tun?",
                    "a": "Wir beginnen mit einem Eingewöhnungsbesuch ohne Behandlung, in ruhigem Tempo. Wir setzen Desensibilisierungstechniken, bohrerfreie Behandlung und bei Bedarf eine Inhalationssedierung (Lachgas) ein. Angst lässt sich überwinden."
                }
            ],
            "procedure": {
                "name": "Kinderzahnheilkunde in Opole, Polen",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Mouth",
                "description": "Zahnärztliche Behandlung von Kindern: Eingewöhnungsbesuche, Prophylaxe (Fissurenversiegelung, Fluoridierung) und Behandlung von Karies an Milchzähnen — oft mit bohrerfreiem Laser und computergesteuerter Betäubung.",
                "howPerformed": "Wir beginnen mit einem Eingewöhnungsbesuch, um das Kind zu beruhigen. Wir bieten Prophylaxe (Versiegelung, Fluoridierung) und behandeln Karies mit dem Er:YAG-Laser oder unter computergesteuerter Betäubung, in freundlicher, ruhiger Atmosphäre.",
                "preparation": "Gespräch mit Elternteil und Kind, Beurteilung des Gebisses, bei Bedarf Röntgen.",
                "followup": "Regelmäßige Vorsorge- und Kontrolltermine sowie altersgerechte Hygieneanleitung."
            }
        },
        "ua": {
            "faq": [
                {
                    "q": "У якому віці привести дитину на перший візит?",
                    "a": "Найкраще вже близько 1 року або після появи перших зубів — на адаптаційний візит. Чим раніше, тим легше сформувати позитивні асоціації та рано виявити можливі проблеми."
                },
                {
                    "q": "Чи потрібно лікувати молочні зуби, якщо вони все одно випадуть?",
                    "a": "Так. Молочні зуби утримують місце для постійних, забезпечують жування та розвиток мовлення, а нелікований карієс може пошкодити зачатки постійних зубів і спричинити біль."
                },
                {
                    "q": "Чи безпечне лазерне лікування для дитини?",
                    "a": "Так — стоматологічний лазер є перевіреною технологією, а в дітей особливо цінується, бо дозволяє лікувати багато порожнин без бормашини, вібрації та часто без анестезії."
                },
                {
                    "q": "Що таке герметизація фісур?",
                    "a": "Це безболісне запечатування заглиблень (фісур) на жувальній поверхні зубів спеціальним лаком. Воно створює бар'єр, що захищає від карієсу в найбільш вразливих місцях."
                },
                {
                    "q": "Моя дитина дуже боїться стоматолога — що робити?",
                    "a": "Ми починаємо з адаптаційного візиту без лікування, у спокійному темпі. Застосовуємо техніки призвичаювання, лікування без бормашини та — за потреби — інгаляційну седацію (закис азоту). Страх можна подолати."
                }
            ],
            "procedure": {
                "name": "Дитяча стоматологія Ополе",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Mouth",
                "description": "Стоматологічне лікування дітей: адаптаційні візити, профілактика (герметизація фісур, фторування) та лікування карієсу молочних зубів — часто лазером без бормашини та з комп'ютерною анестезією.",
                "howPerformed": "Починаємо з адаптаційного візиту, щоб заспокоїти дитину. Проводимо профілактику (герметизація, фторування) та лікуємо карієс лазером Er:YAG або під комп'ютерною анестезією, у приємній, спокійній атмосфері.",
                "preparation": "Розмова з батьками та дитиною, оцінка стану зубів, за потреби РТГ.",
                "followup": "Регулярні профілактичні та контрольні візити, навчання гігієні за віком."
            }
        }
    },

    // ═════════════════ /oferta/stomatologia-zachowawcza ═════════════════
    "/oferta/stomatologia-zachowawcza": {
        "pl": {
            "faq": [
                {
                    "q": "Czy leczenie próchnicy boli?",
                    "a": "Współczesne leczenie jest komfortowe. Stosujemy znieczulenie (m.in. komputerowe The Wand), a wiele wczesnych ubytków leczymy laserem — bez wiertła i często bez znieczulenia."
                },
                {
                    "q": "Czy wypełnienie będzie widoczne?",
                    "a": "Nie. Wypełnienia kompozytowe dobieramy kolorem i przezroczystością do Twojego zęba — są praktycznie niewidoczne, także w zębach przednich."
                },
                {
                    "q": "Czy warto wymieniać stare amalgamatowe plomby?",
                    "a": "Jeśli są nieszczelne, przebarwiają ząb lub pojawia się pod nimi wtórna próchnica — tak. Wymieniamy je na estetyczne kompozyty, bezpiecznie i z dobrą izolacją pola zabiegowego."
                },
                {
                    "q": "Mam ubytki przy dziąsłach, choć dbam o zęby — co to jest?",
                    "a": "To często ubytki niepróchnicowe (abfrakcja / abrazja / erozja) — od przeciążeń zgryzowych, zbyt mocnego szczotkowania lub kwasów. Wymagają innego leczenia niż próchnica; najpierw ustalamy przyczynę."
                },
                {
                    "q": "Czy każdy ubytek trzeba wiercić?",
                    "a": "Nie. Próchnicę początkową można zatrzymać metodą ICON (bez wiercenia), a wiele ubytków opracowujemy laserem. O metodzie decydujemy po ocenie konkretnego przypadku."
                }
            ],
            "procedure": {
                "name": "Stomatologia zachowawcza Opole",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Tooth",
                "description": "Leczenie próchnicy i odbudowa zębów estetycznymi wypełnieniami kompozytowymi, wymiana starych wypełnień amalgamatowych oraz leczenie ubytków niepróchnicowych — z użyciem powiększenia i lasera.",
                "howPerformed": "Usuwamy wyłącznie chorą tkankę (laser Er:YAG lub minimalnie inwazyjne opracowanie), a ubytek odbudowujemy adhezyjnym kompozytem dobranym kolorem do zęba. Próchnicę początkową można zatrzymać metodą ICON bez wiercenia.",
                "preparation": "Przegląd i diagnostyka próchnicy, w razie potrzeby RTG skrzydłowo-zgryzowe.",
                "followup": "Regularne przeglądy kontrolne i profesjonalna higienizacja."
            }
        },
        "en": {
            "faq": [
                {
                    "q": "Does caries treatment hurt?",
                    "a": "Modern treatment is comfortable. We use anaesthesia (including the computer-controlled The Wand), and many early cavities are treated with a laser — without a drill and often without anaesthesia."
                },
                {
                    "q": "Will the filling be visible?",
                    "a": "No. We match composite fillings to the colour and translucency of your tooth — they are practically invisible, including in the front teeth."
                },
                {
                    "q": "Is it worth replacing old amalgam fillings?",
                    "a": "If they have lost their seal, discolour the tooth or secondary caries appears beneath them — yes. We replace them with aesthetic composites, safely and with good isolation of the working field."
                },
                {
                    "q": "I have defects near the gums even though I care for my teeth — what is this?",
                    "a": "These are often non-carious lesions (abfraction / abrasion / erosion) — from occlusal overload, over-vigorous brushing or acids. They require different treatment than caries; first we establish the cause."
                },
                {
                    "q": "Does every cavity have to be drilled?",
                    "a": "No. Early caries can be stopped with the ICON method (without drilling), and many cavities are prepared with a laser. We decide on the method after assessing the specific case."
                }
            ],
            "procedure": {
                "name": "Conservative dentistry in Opole, Poland",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Tooth",
                "description": "Treatment of caries and restoration of teeth with aesthetic composite fillings, replacement of old amalgam fillings and treatment of non-carious lesions — using magnification and a laser.",
                "howPerformed": "We remove only the diseased tissue (Er:YAG laser or minimally invasive preparation) and restore the cavity with an adhesive composite matched to the tooth colour. Early caries can be stopped with the ICON method without drilling.",
                "preparation": "Examination and caries diagnostics, bitewing X-rays if needed.",
                "followup": "Regular check-ups and professional dental hygiene."
            }
        },
        "de": {
            "faq": [
                {
                    "q": "Tut die Kariesbehandlung weh?",
                    "a": "Die moderne Behandlung ist komfortabel. Wir setzen Betäubung ein (u. a. das computergesteuerte The Wand), und viele frühe Defekte behandeln wir mit dem Laser — ohne Bohrer und oft ohne Betäubung."
                },
                {
                    "q": "Wird die Füllung sichtbar sein?",
                    "a": "Nein. Wir passen Kompositfüllungen an Farbe und Transluzenz Ihres Zahns an — sie sind praktisch unsichtbar, auch bei den Frontzähnen."
                },
                {
                    "q": "Lohnt sich der Austausch alter Amalgamfüllungen?",
                    "a": "Wenn sie undicht sind, den Zahn verfärben oder darunter Sekundärkaries auftritt — ja. Wir ersetzen sie durch ästhetische Komposite, sicher und mit guter Isolierung des Arbeitsfeldes."
                },
                {
                    "q": "Ich habe Defekte am Zahnfleischrand, obwohl ich meine Zähne pflege — was ist das?",
                    "a": "Das sind oft nicht kariöse Defekte (Abfraktion / Abrasion / Erosion) — durch Bissüberlastung, zu kräftiges Putzen oder Säuren. Sie erfordern eine andere Behandlung als Karies; zuerst klären wir die Ursache."
                },
                {
                    "q": "Muss jeder Defekt gebohrt werden?",
                    "a": "Nein. Beginnende Karies lässt sich mit der ICON-Methode (ohne Bohren) stoppen, und viele Defekte bearbeiten wir mit dem Laser. Über die Methode entscheiden wir nach Beurteilung des konkreten Falls."
                }
            ],
            "procedure": {
                "name": "Konservierende Zahnheilkunde in Opole, Polen",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Tooth",
                "description": "Behandlung von Karies und Wiederherstellung der Zähne mit ästhetischen Kompositfüllungen, Austausch alter Amalgamfüllungen und Behandlung nicht kariöser Defekte — mit Vergrößerung und Laser.",
                "howPerformed": "Wir entfernen nur das erkrankte Gewebe (Er:YAG-Laser oder minimalinvasive Präparation) und versorgen den Defekt mit einem adhäsiven, farblich angepassten Komposit. Beginnende Karies lässt sich mit der ICON-Methode ohne Bohren stoppen.",
                "preparation": "Untersuchung und Kariesdiagnostik, bei Bedarf Bissflügel-Röntgen.",
                "followup": "Regelmäßige Kontrollen und professionelle Mundhygiene."
            }
        },
        "ua": {
            "faq": [
                {
                    "q": "Чи боляче лікувати карієс?",
                    "a": "Сучасне лікування є комфортним. Ми застосовуємо анестезію (зокрема комп'ютерну The Wand), а багато ранніх порожнин лікуємо лазером — без бормашини та часто без анестезії."
                },
                {
                    "q": "Чи буде пломба помітною?",
                    "a": "Ні. Композитні пломби ми добираємо за кольором і прозорістю до вашого зуба — вони практично непомітні, зокрема на передніх зубах."
                },
                {
                    "q": "Чи варто замінювати старі амальгамові пломби?",
                    "a": "Якщо вони негерметичні, забарвлюють зуб або під ними з'являється вторинний карієс — так. Ми замінюємо їх на естетичні композити, безпечно та з якісною ізоляцією робочого поля."
                },
                {
                    "q": "У мене дефекти біля ясен, хоча я доглядаю за зубами — що це?",
                    "a": "Це часто некаріозні дефекти (абфракція / абразія / ерозія) — від перевантаження прикусу, надто сильного чищення або кислот. Вони потребують іншого лікування, ніж карієс; спершу ми встановлюємо причину."
                },
                {
                    "q": "Чи потрібно свердлити кожну порожнину?",
                    "a": "Ні. Початковий карієс можна зупинити методом ICON (без свердління), а багато порожнин ми обробляємо лазером. Метод обираємо після оцінки конкретного випадку."
                }
            ],
            "procedure": {
                "name": "Терапевтична стоматологія Ополе",
                "procedureType": "TherapeuticProcedure",
                "bodyLocation": "Tooth",
                "description": "Лікування карієсу та відновлення зубів естетичними композитними пломбами, заміна старих амальгамових пломб і лікування некаріозних дефектів — із застосуванням збільшення та лазера.",
                "howPerformed": "Видаляємо лише уражену тканину (лазер Er:YAG або мінімально інвазивне препарування) та відновлюємо дефект адгезивним композитом, дібраним за кольором зуба. Початковий карієс можна зупинити методом ICON без свердління.",
                "preparation": "Огляд та діагностика карієсу, за потреби прикусні рентгенівські знімки.",
                "followup": "Регулярні контрольні огляди та професійна гігієна."
            }
        }
    },

    // ═════════════════ /oferta/laser ═════════════════
    '/oferta/laser': {
        pl: {
            faq: [
                { q: 'Czy leczenie laserem boli?', a: 'Zazwyczaj jest mniej bolesne niż metody klasyczne. Wiele zabiegów laserowych można wykonać przy minimalnym znieczuleniu lub bez niego, a brak wibracji wiertła zwiększa komfort.' },
                { q: 'Czy laser dentystyczny jest bezpieczny?', a: 'Tak. To sprawdzona, certyfikowana technologia stosowana w stomatologii od lat. Zabiegi prowadzi dyplomowany specjalista laseroterapii (M.Sc. in Lasers in Dentistry, RWTH Aachen).' },
                { q: 'Czy laserem da się leczyć próchnicę bez wiertła?', a: 'W wielu przypadkach tak — laser erbowy Er:YAG opracowuje tkankę próchnicową bezdotykowo, bez wibracji i dźwięku turbiny. To komfortowe zwłaszcza u dzieci i osób z dentofobią.' },
                { q: 'Na czym polega laserowe leczenie kanałowe?', a: 'Płyny płuczące aktywujemy laserem (SWEEPS), wytwarzając falę uderzeniową wypłukującą bakterie z bocznych kanalików, a następnie dezynfekujemy kanały laserem Nd:YAG (eliminacja nawet 99% drobnoustrojów).' },
                { q: 'Czy laser pomaga uratować implant z zapaleniem (periimplantitis)?', a: 'W wielu przypadkach tak — laserowe odkażenie powierzchni implantu to jedna z najskuteczniejszych metod zatrzymania zapalenia okołoimplantowego. Kluczowe jest wczesne zgłoszenie.' },
            ],
            procedure: {
                name: 'Stomatologia laserowa Opole (Fotona LightWalker)',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Mouth',
                description: 'Laseroterapia stomatologiczna laserem Fotona LightWalker (Er:YAG 2940 nm + Nd:YAG 1064 nm): laserowe leczenie kanałowe, opracowanie ubytków bez wiertła, chirurgia dziąseł bez skalpela, leczenie paradontozy, periimplantitis oraz biostymulacja (LLLT).',
                howPerformed: 'Dobór długości fali do zabiegu: Er:YAG do tkanek twardych i aktywacji irygacji (SWEEPS/PIPS), Nd:YAG do głębokiej dezynfekcji, hemostazy i biostymulacji. Zabieg zwykle przy minimalnym znieczuleniu lub bez.',
                preparation: 'Konsultacja, diagnostyka i kwalifikacja do leczenia laserowego.',
                followup: 'Szybsze, bezkrwawe gojenie dzięki biostymulacji; zakres kontroli zależny od rodzaju wykonanego zabiegu.',
            },
        },
        en: {
            faq: [
                { q: 'Does laser treatment hurt?', a: 'It is usually less painful than conventional methods. Many laser procedures can be performed with minimal anesthesia or none at all, and the absence of drill vibration adds to the comfort.' },
                { q: 'Is the dental laser safe?', a: 'Yes. It is a proven, certified technology used in dentistry for years. Procedures are led by a qualified laser therapy specialist (M.Sc. in Lasers in Dentistry, RWTH Aachen).' },
                { q: 'Can the laser treat cavities without the drill?', a: 'In many cases, yes — the Er:YAG erbium laser prepares decayed tissue without contact, without vibration or turbine noise. This is especially comfortable for children and people with dental phobia.' },
                { q: 'How does laser root canal treatment work?', a: 'We activate the irrigating fluids with the laser (SWEEPS), creating a shockwave that flushes bacteria out of the lateral canals, then disinfect the canals with the Nd:YAG laser (eliminating up to 99% of microorganisms).' },
                { q: 'Can the laser help save an implant with inflammation (peri-implantitis)?', a: 'In many cases, yes — laser decontamination of the implant surface is one of the most effective ways to stop peri-implant inflammation. Coming in early is crucial.' },
            ],
            procedure: {
                name: 'Laser dentistry in Opole, Poland (Fotona LightWalker)',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Mouth',
                description: 'Dental laser therapy with the Fotona LightWalker (Er:YAG 2940 nm + Nd:YAG 1064 nm): laser root canal treatment, drill-free cavity preparation, scalpel-free gum surgery, periodontal treatment, peri-implantitis and biostimulation (LLLT).',
                howPerformed: 'The wavelength is matched to the procedure: Er:YAG for hard tissues and irrigation activation (SWEEPS/PIPS), Nd:YAG for deep disinfection, haemostasis and biostimulation. The procedure is usually performed with minimal anesthesia or none.',
                preparation: 'Consultation, diagnostics and qualification for laser treatment.',
                followup: 'Faster, bloodless healing thanks to biostimulation; follow-up depends on the type of procedure performed.',
            },
        },
        de: {
            faq: [
                { q: 'Tut die Laserbehandlung weh?', a: 'Sie ist in der Regel weniger schmerzhaft als klassische Methoden. Viele Lasereingriffe lassen sich mit minimaler oder ganz ohne Betäubung durchführen, und das Fehlen von Bohrervibration erhöht den Komfort.' },
                { q: 'Ist der Dentallaser sicher?', a: 'Ja. Es ist eine bewährte, zertifizierte Technologie, die seit Jahren in der Zahnheilkunde eingesetzt wird. Die Eingriffe leitet ein diplomierter Spezialist für Lasertherapie (M.Sc. in Lasers in Dentistry, RWTH Aachen).' },
                { q: 'Kann man mit dem Laser Karies ohne Bohrer behandeln?', a: 'In vielen Fällen ja — der Er:YAG-Erbium-Laser bearbeitet kariöses Gewebe berührungslos, ohne Vibration und Turbinengeräusch. Besonders komfortabel für Kinder und Menschen mit Zahnarztangst.' },
                { q: 'Wie läuft die laserunterstützte Wurzelkanalbehandlung ab?', a: 'Wir aktivieren die Spülflüssigkeiten mit dem Laser (SWEEPS), wodurch eine Stoßwelle Bakterien aus den Seitenkanälchen ausspült, und desinfizieren anschließend die Kanäle mit dem Nd:YAG-Laser (Eliminierung von bis zu 99 % der Mikroorganismen).' },
                { q: 'Kann der Laser helfen, ein Implantat mit Entzündung (Periimplantitis) zu retten?', a: 'In vielen Fällen ja — die Laser-Dekontamination der Implantatoberfläche ist eine der wirksamsten Methoden, eine periimplantäre Entzündung zu stoppen. Entscheidend ist, sich früh vorzustellen.' },
            ],
            procedure: {
                name: 'Laserzahnheilkunde in Opole, Polen (Fotona LightWalker)',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Mouth',
                description: 'Dentale Lasertherapie mit dem Fotona LightWalker (Er:YAG 2940 nm + Nd:YAG 1064 nm): laserunterstützte Wurzelkanalbehandlung, bohrerfreie Kariesbehandlung, skalpellfreie Zahnfleischchirurgie, Parodontitisbehandlung, Periimplantitis und Biostimulation (LLLT).',
                howPerformed: 'Die Wellenlänge wird an den Eingriff angepasst: Er:YAG für Hartgewebe und Spülaktivierung (SWEEPS/PIPS), Nd:YAG für tiefe Desinfektion, Hämostase und Biostimulation. Der Eingriff erfolgt meist mit minimaler oder ohne Betäubung.',
                preparation: 'Beratung, Diagnostik und Eignungsprüfung für die Laserbehandlung.',
                followup: 'Schnellere, blutarme Heilung dank Biostimulation; die Kontrolle hängt von der Art des Eingriffs ab.',
            },
        },
        ua: {
            faq: [
                { q: 'Чи боляче лікувати лазером?', a: 'Зазвичай це менш болісно, ніж класичні методи. Багато лазерних процедур можна виконати з мінімальним знеболенням або зовсім без нього, а відсутність вібрації бормашини підвищує комфорт.' },
                { q: 'Чи безпечний стоматологічний лазер?', a: 'Так. Це перевірена, сертифікована технологія, яку застосовують у стоматології багато років. Процедури проводить дипломований спеціаліст із лазеротерапії (M.Sc. in Lasers in Dentistry, RWTH Aachen).' },
                { q: 'Чи можна лазером лікувати карієс без бормашини?', a: 'У багатьох випадках так — ербієвий лазер Er:YAG обробляє уражену тканину безконтактно, без вібрації та звуку турбіни. Це комфортно особливо для дітей і людей із дентофобією.' },
                { q: 'Як відбувається лазерне лікування каналів?', a: 'Промивні розчини активуємо лазером (SWEEPS), створюючи ударну хвилю, яка вимиває бактерії з бічних канальців, а потім знезаражуємо канали лазером Nd:YAG (елімінація до 99% мікроорганізмів).' },
                { q: 'Чи допоможе лазер врятувати імплант із запаленням (периімплантит)?', a: 'У багатьох випадках так — лазерне знезараження поверхні імпланта є одним із найефективніших методів зупинити периімплантне запалення. Ключове — звернутися рано.' },
            ],
            procedure: {
                name: 'Лазерна стоматологія Ополе (Fotona LightWalker)',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Mouth',
                description: 'Стоматологічна лазеротерапія лазером Fotona LightWalker (Er:YAG 2940 нм + Nd:YAG 1064 нм): лазерне лікування каналів, обробка карієсу без бормашини, хірургія ясен без скальпеля, лікування пародонтозу, периімплантит та біостимуляція (LLLT).',
                howPerformed: 'Довжину хвилі підбирають до процедури: Er:YAG для твердих тканин та активації іригації (SWEEPS/PIPS), Nd:YAG для глибокої дезінфекції, гемостазу та біостимуляції. Процедура зазвичай при мінімальному знеболенні або без нього.',
                preparation: 'Консультація, діагностика та кваліфікація до лазерного лікування.',
                followup: 'Швидше, безкровне загоєння завдяки біостимуляції; контроль залежить від виду виконаної процедури.',
            },
        },
    },

    '/oferta/leczenie-kanalowe': {
        pl: {
            faq: [
                { q: 'Czy leczenie kanałowe boli?', a: 'Współczesne leczenie kanałowe jest całkowicie bezbolesne. Stosujemy znieczulenie komputerowe (The Wand/SleeperOne), które eliminuje ból już na etapie podawania.' },
                { q: 'Dlaczego leczenie kanałowe pod mikroskopem jest lepsze?', a: 'Mikroskop (powiększenie do 25x) pozwala lekarzowi znaleźć wszystkie kanały (nawet te dodatkowe), precyzyjnie je oczyścić i wypełnić. Drastycznie zwiększa to szansę na uratowanie zęba.' },
                { q: 'Ile wizyt zajmuje leczenie kanałowe?', a: 'W Mikrostomart staramy się przeprowadzać leczenie kanałowe na jednej wizycie. Dzięki pracy pod mikroskopem i zaawansowanym narzędziom maszynowym jesteśmy w stanie wykonać cały zabieg w ciągu 90-120 minut.' },
                { q: 'Co to jest powtórne leczenie kanałowe (Re-Endo)?', a: 'To zabieg naprawczy, gdy pierwotne leczenie okazało się nieskuteczne. Polega na usunięciu starego materiału, odnalezieniu pominiętych kanałów i ponownym, sterylnym ich wypełnieniu.' },
            ],
            procedure: {
                name: 'Leczenie kanałowe pod mikroskopem Opole',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Tooth',
                description: 'Endodoncja mikroskopowa: precyzyjne usunięcie martwej tkanki, dezynfekcja i szczelne wypełnienie kanałów zęba pod kontrolą mikroskopu zabiegowego (powiększenie do 25x).',
                howPerformed: 'Zabieg w komputerowym znieczuleniu (The Wand / SleeperOne), z izolacją koferdamem. Pomiary endometryczne, opracowanie kanałów narzędziami rotacyjnymi, dezynfekcja i wypełnienie gutaperką pod mikroskopem.',
                preparation: 'Diagnostyka radiologiczna (RTG, CBCT w skomplikowanych przypadkach). Wywiad medyczny.',
                followup: 'Kontrola po 7-14 dniach. Odbudowa korony zęba (wypełnienie lub korona protetyczna) w ciągu kolejnej wizyty.',
            },
        },
        en: {
            faq: [
                { q: 'Is root canal treatment painful?', a: 'Modern root canal treatment is completely painless. We use computer-controlled anesthesia (The Wand/SleeperOne), which eliminates pain even at the injection stage.' },
                { q: 'Why is microscopic root canal treatment better?', a: 'A microscope (magnification up to 25x) allows the dentist to find all canals (including additional ones), precisely clean and fill them. This dramatically increases the chance of saving the tooth.' },
                { q: 'How many visits does root canal treatment take?', a: 'At Mikrostomart we try to complete root canal treatment in a single visit. Thanks to microscope work and advanced rotary instruments, we can perform the entire procedure in 90-120 minutes.' },
                { q: 'What is retreatment (Re-Endo)?', a: 'This is a corrective procedure when the original treatment proved ineffective. It involves removing old filling material, finding missed canals, and re-filling them in sterile conditions.' },
            ],
            procedure: {
                name: 'Microscopic root canal treatment in Opole, Poland',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Tooth',
                description: 'Microscopic endodontics: precise removal of dead tissue, disinfection and tight filling of tooth canals under control of a surgical microscope (magnification up to 25x).',
                howPerformed: 'Procedure under computer-controlled anesthesia (The Wand / SleeperOne), with rubber dam isolation. Endometric measurements, canal preparation with rotary instruments, disinfection and gutta-percha filling under microscope.',
                preparation: 'Radiological diagnostics (X-ray, CBCT in complex cases). Medical interview.',
                followup: 'Follow-up after 7-14 days. Tooth crown reconstruction (filling or prosthetic crown) at the next visit.',
            },
        },
        de: {
            faq: [
                { q: 'Tut die Wurzelkanalbehandlung weh?', a: 'Moderne Wurzelkanalbehandlung ist vollständig schmerzfrei. Wir verwenden computergesteuerte Anästhesie (The Wand/SleeperOne), die den Schmerz schon beim Einspritzen eliminiert.' },
                { q: 'Warum ist die mikroskopische Wurzelbehandlung besser?', a: 'Das Mikroskop (Vergrößerung bis 25x) ermöglicht dem Arzt, alle Kanäle zu finden (auch zusätzliche), präzise zu reinigen und zu füllen. Dies erhöht die Chance, den Zahn zu retten, drastisch.' },
                { q: 'Wie viele Sitzungen dauert die Wurzelkanalbehandlung?', a: 'Bei Mikrostomart bemühen wir uns, die Wurzelbehandlung in einer Sitzung abzuschließen. Dank Mikroskoparbeit und fortschrittlicher Rotationsinstrumente können wir den gesamten Eingriff in 90-120 Minuten durchführen.' },
                { q: 'Was ist eine Re-Endo (Revision)?', a: 'Eine korrigierende Behandlung, wenn die ursprüngliche Behandlung erfolglos war. Wir entfernen das alte Material, finden übersehene Kanäle und füllen sie steril neu.' },
            ],
            procedure: {
                name: 'Mikroskopische Wurzelkanalbehandlung in Opole, Polen',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Tooth',
                description: 'Mikroskopische Endodontie: präzise Entfernung abgestorbenen Gewebes, Desinfektion und dichte Füllung der Zahnkanäle unter Kontrolle eines OP-Mikroskops (Vergrößerung bis 25x).',
                howPerformed: 'Eingriff unter computergesteuerter Anästhesie (The Wand / SleeperOne) mit Kofferdam-Isolation. Endometrische Messungen, Kanalaufbereitung mit Rotationsinstrumenten, Desinfektion und Gutta-Percha-Füllung unter Mikroskop.',
                preparation: 'Radiologische Diagnostik (RTG, CBCT bei komplexen Fällen). Medizinische Anamnese.',
                followup: 'Kontrolle nach 7-14 Tagen. Kronenrekonstruktion (Füllung oder prothetische Krone) beim nächsten Termin.',
            },
        },
        ua: {
            faq: [
                { q: 'Чи болить ендодонтичне лікування?', a: 'Сучасне ендодонтичне лікування абсолютно безболісне. Використовуємо комп\'ютерну анестезію (The Wand/SleeperOne), яка усуває біль вже на етапі введення.' },
                { q: 'Чому лікування каналів під мікроскопом краще?', a: 'Мікроскоп (збільшення до 25x) дозволяє знайти всі канали (навіть додаткові), точно їх очистити та заповнити. Це різко збільшує шанси врятувати зуб.' },
                { q: 'Скільки візитів займає лікування каналів?', a: 'У Mikrostomart намагаємося провести лікування каналів за одну візиту. Завдяки роботі під мікроскопом та сучасним інструментам можемо виконати всю процедуру за 90-120 хвилин.' },
                { q: 'Що таке повторне лікування (Re-Endo)?', a: 'Це коригуюча процедура, коли первинне лікування виявилося неефективним. Полягає у видаленні старого матеріалу, знаходженні пропущених каналів та повторному стерильному заповненні.' },
            ],
            procedure: {
                name: 'Лікування каналів під мікроскопом Ополе',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Tooth',
                description: 'Мікроскопічна ендодонтія: точне видалення мертвої тканини, дезінфекція та герметичне заповнення каналів зуба під контролем хірургічного мікроскопа (збільшення до 25x).',
                howPerformed: 'Процедура під комп\'ютерною анестезією (The Wand / SleeperOne), з ізоляцією кофердамом. Ендометричні вимірювання, обробка каналів ротаційними інструментами, дезінфекція та заповнення гутаперчею під мікроскопом.',
                preparation: 'Рентгенологічна діагностика (РТГ, КТ у складних випадках). Медичний анамнез.',
                followup: 'Контроль через 7-14 днів. Реконструкція коронки (пломба або протетична коронка) на наступному візиті.',
            },
        },
    },

    // ═════════════════ /oferta/ortodoncja ═════════════════
    '/oferta/ortodoncja': {
        pl: {
            faq: [
                { q: 'Jak działają nakładki Clear Correct?', a: 'To zestaw przezroczystych szyn, które wymieniasz co 1-2 tygodnie. Każda kolejna nakładka delikatnie przesuwa zęby na właściwą pozycję. Są wyjmowane do jedzenia i mycia.' },
                { q: 'Czy prostowanie zębów nakładkami boli?', a: 'Ból jest minimalny — pacjenci opisują go raczej jako uczucie ucisku przez 1-2 dni po założeniu nowej pary nakładek. Jest to nieporównywalnie mniejszy dyskomfort niż przy aparacie metalowym.' },
                { q: 'Jak długo trwa leczenie ortodontyczne nakładkami?', a: 'Średni czas to 6-18 miesięcy, w zależności od wady. Już na pierwszej wizycie pokażemy Ci symulację 3D i powiemy dokładnie, ile potrwa leczenie.' },
                { q: 'Czy po zdjęciu nakładek zęby nie wrócą na stare miejsce?', a: 'Stosujemy retencję (cieniutki drucik od wewnątrz lub nakładka na noc), która trzyma zęby w nowej pozycji. Jest to standardowa procedura gwarantująca trwałość efektu.' },
            ],
            procedure: {
                name: 'Ortodoncja nakładkowa Clear Correct Opole',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Korekta wad zgryzu i położenia zębów za pomocą przezroczystych nakładek Clear Correct (alignerów). Niewidoczne, wyjmowalne, komfortowe leczenie ortodontyczne.',
                howPerformed: 'Skan wewnątrzustny i symulacja 3D efektu końcowego. Pacjent otrzymuje zestaw nakładek wymienianych co 1-2 tygodnie. Każda nakładka delikatnie przesuwa zęby do docelowej pozycji.',
                preparation: 'Konsultacja ortodontyczna, skan 3D zębów, planowanie cyfrowe i prezentacja symulacji efektu przed rozpoczęciem leczenia.',
                followup: 'Kontrole co 6-8 tygodni. Po zakończeniu leczenia: retencja (drucik retencyjny lub nakładka na noc) zapobiegająca nawrotowi wady.',
            },
        },
        en: {
            faq: [
                { q: 'How do Clear Correct aligners work?', a: 'It\'s a set of transparent trays that you change every 1-2 weeks. Each subsequent aligner gently moves teeth to the correct position. They are removable for eating and brushing.' },
                { q: 'Is straightening teeth with aligners painful?', a: 'Pain is minimal — patients describe it as a feeling of pressure for 1-2 days after putting on a new pair. The discomfort is incomparably smaller than with metal braces.' },
                { q: 'How long does aligner orthodontic treatment last?', a: 'Average duration is 6-18 months, depending on the malocclusion. At the first visit we\'ll show you a 3D simulation and tell you exactly how long treatment will take.' },
                { q: 'Won\'t teeth return to their original position after removing the aligners?', a: 'We use retention (a thin wire from the inside or a nighttime retainer) that holds teeth in the new position. This is a standard procedure ensuring lasting results.' },
            ],
            procedure: {
                name: 'Clear Correct aligner orthodontics in Opole, Poland',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Correction of malocclusion and tooth position using transparent Clear Correct aligners. Invisible, removable, comfortable orthodontic treatment.',
                howPerformed: 'Intraoral scan and 3D simulation of the final result. Patient receives a set of aligners changed every 1-2 weeks. Each aligner gently moves teeth to the target position.',
                preparation: 'Orthodontic consultation, 3D dental scan, digital planning and presentation of simulation before starting treatment.',
                followup: 'Check-ups every 6-8 weeks. After treatment: retention (retention wire or nighttime retainer) preventing relapse.',
            },
        },
        de: {
            faq: [
                { q: 'Wie funktionieren Clear Correct Aligner?', a: 'Ein Satz transparenter Schienen, die alle 1-2 Wochen gewechselt werden. Jeder nachfolgende Aligner bewegt die Zähne sanft in die richtige Position. Sie sind zum Essen und Zähneputzen herausnehmbar.' },
                { q: 'Tut das Zahnausrichten mit Alignern weh?', a: 'Der Schmerz ist minimal — Patienten beschreiben ihn als Druckgefühl für 1-2 Tage nach dem Einsetzen eines neuen Aligners. Es ist unvergleichlich weniger Beschwerden als bei einer Metallspange.' },
                { q: 'Wie lange dauert die Aligner-Behandlung?', a: 'Durchschnittlich 6-18 Monate, abhängig von der Fehlstellung. Beim ersten Termin zeigen wir Ihnen eine 3D-Simulation und sagen genau, wie lange die Behandlung dauern wird.' },
                { q: 'Kehren die Zähne nach Abnahme der Aligner nicht zurück?', a: 'Wir verwenden Retention (dünner Innendraht oder Nacht-Retainer), die die Zähne in der neuen Position hält. Standardprozedur für dauerhafte Ergebnisse.' },
            ],
            procedure: {
                name: 'Clear Correct Aligner-Kieferorthopädie in Opole, Polen',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Korrektur von Fehlstellungen und Zahnpositionen mit transparenten Clear Correct Alignern. Unsichtbare, herausnehmbare, komfortable kieferorthopädische Behandlung.',
                howPerformed: 'Intraoraler Scan und 3D-Simulation des Endergebnisses. Patient erhält einen Satz Aligner, die alle 1-2 Wochen gewechselt werden. Jeder Aligner bewegt die Zähne sanft in die Zielposition.',
                preparation: 'Kieferorthopädische Beratung, 3D-Scan der Zähne, digitale Planung und Präsentation der Simulation vor Behandlungsbeginn.',
                followup: 'Kontrollen alle 6-8 Wochen. Nach Behandlungsende: Retention (Retentionsdraht oder Nacht-Retainer) zur Verhinderung des Rückfalls.',
            },
        },
        ua: {
            faq: [
                { q: 'Як працюють елайнери Clear Correct?', a: 'Це набір прозорих кап, які ви міняєте кожні 1-2 тижні. Кожний наступний елайнер делікатно переміщує зуби в правильну позицію. Знімаються для їжі та чищення.' },
                { q: 'Чи болить вирівнювання зубів елайнерами?', a: 'Біль мінімальний — пацієнти описують це як відчуття тиску протягом 1-2 днів після одягання нової пари. Незрівнянно менший дискомфорт ніж з металевими брекетами.' },
                { q: 'Скільки триває ортодонтичне лікування елайнерами?', a: 'Середній термін 6-18 місяців, залежно від дефекту. Вже на першому візиті покажемо 3D-симуляцію та скажемо точно, скільки триватиме лікування.' },
                { q: 'Чи зуби не повернуться на старе місце після зняття елайнерів?', a: 'Використовуємо ретенцію (тонкий дріт зсередини або ретейнер на ніч), яка тримає зуби в новій позиції. Це стандартна процедура для тривалого ефекту.' },
            ],
            procedure: {
                name: 'Ортодонтія елайнерами Clear Correct Ополе',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Корекція прикусу та положення зубів за допомогою прозорих елайнерів Clear Correct. Невидиме, знімне, комфортне ортодонтичне лікування.',
                howPerformed: 'Внутрішньоротовий скан та 3D-симуляція кінцевого результату. Пацієнт отримує набір елайнерів, які міняє кожні 1-2 тижні. Кожний елайнер делікатно переміщує зуби в цільову позицію.',
                preparation: 'Ортодонтична консультація, 3D-скан зубів, цифрове планування та презентація симуляції перед початком лікування.',
                followup: 'Контролі кожні 6-8 тижнів. Після завершення лікування: ретенція (ретенційний дріт або ретейнер на ніч) для запобігання рецидиву.',
            },
        },
    },

    // ═════════════════ /oferta/protetyka ═════════════════
    '/oferta/protetyka': {
        pl: {
            faq: [
                { q: 'Korona czy licówka — co wybrać?', a: 'Licówka pokrywa tylko przednią część zęba (estetyka). Korona obejmuje cały ząb jak kapturek (odbudowa i wzmocnienie). Decyzję podejmuje lekarz na podstawie stopnia zniszczenia zęba.' },
                { q: 'Z czego robicie korony?', a: 'Stosujemy głównie korony pełnoceramiczne (E.max) oraz cyrkonowe. Nie powodują one sinienia dziąsła (jak stare korony na metalu) i są nie do odróżnienia od naturalnego zęba.' },
                { q: 'Jak wygląda proces robienia korony?', a: 'Dzięki cyfrowemu skanerowi nie musimy robić nieprzyjemnych wycisków masą. Skanujemy zęby kamerą 3D, a projekt wysyłamy do laboratorium. Gotową koronę cementujemy po 5-7 dniach roboczych.' },
                { q: 'Czym są mosty bez szlifowania?', a: 'To mosty adhezyjne na włóknie szklanym. Są rozwiązaniem tymczasowym lub długoczasowym, które pozwala uzupełnić brak zęba bez mocnego szlifowania sąsiadów.' },
            ],
            procedure: {
                name: 'Protetyka stomatologiczna Opole',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Odbudowa zniszczonych lub utraconych zębów: korony pełnoceramiczne (E.max), cyrkonowe, mosty, licówki oraz protezy. Cyfrowe skanowanie 3D zamiast tradycyjnych wycisków.',
                howPerformed: 'Skan wewnątrzustny kamerą 3D, projekt komputerowy, wykonanie pracy w laboratorium technicznym (5-7 dni roboczych). Cementowanie wykonane na drugiej wizycie.',
                preparation: 'Wywiad medyczny, badanie kliniczne i radiologiczne. W razie potrzeby leczenie endodontyczne lub przygotowanie kości pod implant.',
                followup: 'Kontrola po 7-14 dniach. Higiena protetyczna i regularne kontrole co 6 miesięcy.',
            },
        },
        en: {
            faq: [
                { q: 'Crown or veneer — which to choose?', a: 'A veneer covers only the front of the tooth (aesthetics). A crown covers the entire tooth like a cap (restoration and strengthening). The doctor decides based on the degree of tooth damage.' },
                { q: 'What materials do you use for crowns?', a: 'We mainly use full-ceramic crowns (E.max) and zirconia crowns. They don\'t cause gum darkening (like old metal-based crowns) and are indistinguishable from natural teeth.' },
                { q: 'What does the crown-making process look like?', a: 'Thanks to a digital scanner, we don\'t need unpleasant impression material. We scan the teeth with a 3D camera and send the design to the lab. The finished crown is cemented after 5-7 business days.' },
                { q: 'What are bridges without grinding?', a: 'These are adhesive bridges on glass fiber. They are a temporary or long-term solution that allows filling a missing tooth without aggressive grinding of neighboring teeth.' },
            ],
            procedure: {
                name: 'Dental prosthodontics in Opole, Poland',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Reconstruction of damaged or lost teeth: full-ceramic crowns (E.max), zirconia crowns, bridges, veneers and dentures. Digital 3D scanning instead of traditional impressions.',
                howPerformed: 'Intraoral 3D camera scan, computer design, lab fabrication (5-7 business days). Cementation at the second visit.',
                preparation: 'Medical interview, clinical and radiological examination. If needed, endodontic treatment or bone preparation for implant.',
                followup: 'Check-up after 7-14 days. Prosthetic hygiene and regular check-ups every 6 months.',
            },
        },
        de: {
            faq: [
                { q: 'Krone oder Veneer — was wählen?', a: 'Ein Veneer bedeckt nur die Vorderseite des Zahns (Ästhetik). Eine Krone umfasst den gesamten Zahn wie eine Kappe (Rekonstruktion und Verstärkung). Die Entscheidung trifft der Arzt anhand des Grades der Zahnschädigung.' },
                { q: 'Welches Material für Kronen?', a: 'Hauptsächlich Vollkeramik-Kronen (E.max) und Zirkonkronen. Sie verursachen keine Zahnfleischverfärbung (wie alte Metallkronen) und sind von natürlichen Zähnen nicht zu unterscheiden.' },
                { q: 'Wie sieht der Prozess der Kronenherstellung aus?', a: 'Dank des digitalen Scanners benötigen wir keine unangenehmen Abdrücke. Wir scannen die Zähne mit einer 3D-Kamera und senden das Design ans Labor. Die fertige Krone wird nach 5-7 Werktagen zementiert.' },
                { q: 'Was sind Brücken ohne Beschleifen?', a: 'Adhäsive Brücken auf Glasfaserbasis. Sie sind eine vorübergehende oder langfristige Lösung, um einen fehlenden Zahn ohne aggressives Beschleifen der Nachbarzähne zu ersetzen.' },
            ],
            procedure: {
                name: 'Zahnprothetik in Opole, Polen',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Rekonstruktion beschädigter oder verlorener Zähne: Vollkeramik-Kronen (E.max), Zirkonkronen, Brücken, Veneers und Prothesen. Digitales 3D-Scannen statt traditioneller Abdrücke.',
                howPerformed: 'Intraoraler 3D-Kamera-Scan, Computer-Design, Labor-Fertigung (5-7 Werktage). Zementierung beim zweiten Termin.',
                preparation: 'Medizinische Anamnese, klinische und radiologische Untersuchung. Bei Bedarf endodontische Behandlung oder Knochenvorbereitung für Implantat.',
                followup: 'Kontrolle nach 7-14 Tagen. Prothetische Hygiene und regelmäßige Kontrollen alle 6 Monate.',
            },
        },
        ua: {
            faq: [
                { q: 'Коронка чи вінір — що вибрати?', a: 'Вінір покриває лише передню частину зуба (естетика). Коронка обхоплює весь зуб як ковпачок (відновлення та зміцнення). Рішення приймає лікар на основі ступеня пошкодження зуба.' },
                { q: 'З чого робите коронки?', a: 'Використовуємо переважно повнокерамічні коронки (E.max) та цирконієві. Вони не викликають потемніння ясен (як старі металокерамічні) і невідрізнені від природного зуба.' },
                { q: 'Як виглядає процес виготовлення коронки?', a: 'Завдяки цифровому сканеру не потребуємо неприємних зліпків. Скануємо зуби 3D-камерою, а проект надсилаємо в лабораторію. Готову коронку цементуємо через 5-7 робочих днів.' },
                { q: 'Що таке мости без обробки?', a: 'Це адгезивні мости на склопластику. Це тимчасове або довгострокове рішення, що дозволяє заповнити відсутній зуб без агресивної обробки сусідніх зубів.' },
            ],
            procedure: {
                name: 'Стоматологічна протетика Ополе',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Відновлення пошкоджених або втрачених зубів: повнокерамічні коронки (E.max), цирконієві, мости, вініри та протези. Цифрове 3D-сканування замість традиційних зліпків.',
                howPerformed: 'Внутрішньоротовий 3D-скан камерою, комп\'ютерний проект, виготовлення в лабораторії (5-7 робочих днів). Цементування на другому візиті.',
                preparation: 'Медичний анамнез, клінічне та рентгенологічне обстеження. За потреби ендодонтичне лікування або підготовка кістки під імплант.',
                followup: 'Контроль через 7-14 днів. Протетична гігієна та регулярні контролі кожні 6 місяців.',
            },
        },
    },

    // ═════════════════ /oferta/stomatologia-estetyczna ═════════════════
    '/oferta/stomatologia-estetyczna': {
        pl: {
            faq: [
                { q: 'Czym są licówki porcelanowe?', a: 'Licówki to cieniutkie płatki porcelanowe naklejane na lico zęba. Korygują kształt, kolor i drobne nierówności. Umożliwiają osiągnięcie efektu Hollywood Smile bez zakładania aparatu.' },
                { q: 'Czy wybielanie zębów niszczy szkliwo?', a: 'Nie, profesjonalne wybielanie przeprowadzone w gabinecie jest bezpieczne. Stosujemy nowoczesne preparaty, które nie demineralizują szkliwa, a jedynie utleniają przebarwienia.' },
                { q: 'Jak długo utrzymuje się efekt wybielania?', a: 'Efekt zazwyczaj utrzymuje się od roku do 3 lat. Zależy głównie od diety (kawa, wino) i nawyków (palenie). Regularna higienizacja pomaga podtrzymać efekt bieli.' },
                { q: 'Co to jest Bonding?', a: 'Bonding to nieinwazyjna metoda poprawy estetyki zęba za pomocą żywicy kompozytowej. Wykonujemy go na jednej wizycie, bez szlifowania zębów. Idealny do zamknięcia diastemy.' },
            ],
            procedure: {
                name: 'Stomatologia estetyczna Opole',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Zabiegi poprawy estetyki uśmiechu: licówki porcelanowe (E.max), bonding kompozytowy, profesjonalne wybielanie zębów. Cyfrowe planowanie uśmiechu (DSD - Digital Smile Design).',
                howPerformed: 'Konsultacja DSD i symulacja efektu końcowego. Licówki: skanowanie 3D, projekt, wykonanie w laboratorium, cementowanie. Bonding: na jednej wizycie bez szlifowania zęba. Wybielanie: w gabinecie lub nakładkowe (overnight) z indywidualnymi nakładkami.',
                preparation: 'Konsultacja estetyczna, ocena kliniczna i radiologiczna. Ewentualna wcześniejsza higienizacja.',
                followup: 'Kontrola po 7 dniach. Profilaktyka: regularna higienizacja co 6 miesięcy, unikanie barwiących pokarmów po wybielaniu.',
            },
        },
        en: {
            faq: [
                { q: 'What are porcelain veneers?', a: 'Veneers are thin porcelain shells bonded to the front of the tooth. They correct shape, color and minor irregularities. They allow achieving a Hollywood Smile effect without orthodontic braces.' },
                { q: 'Does teeth whitening damage enamel?', a: 'No, professional in-office whitening is safe. We use modern formulas that do not demineralize enamel — they only oxidize discoloration.' },
                { q: 'How long does the whitening effect last?', a: 'The effect typically lasts from one to 3 years. It depends mainly on diet (coffee, wine) and habits (smoking). Regular dental hygiene helps maintain the whiteness.' },
                { q: 'What is Bonding?', a: 'Bonding is a non-invasive method of improving tooth aesthetics with composite resin. We perform it in one visit without grinding teeth. Ideal for closing diastema.' },
            ],
            procedure: {
                name: 'Aesthetic dentistry in Opole, Poland',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Smile aesthetics treatments: porcelain veneers (E.max), composite bonding, professional teeth whitening. Digital Smile Design (DSD) planning.',
                howPerformed: 'DSD consultation and simulation of final result. Veneers: 3D scanning, design, lab fabrication, cementation. Bonding: in one visit without grinding teeth. Whitening: in-office or overnight with custom trays.',
                preparation: 'Aesthetic consultation, clinical and radiological evaluation. Optional prior dental hygiene.',
                followup: 'Check-up after 7 days. Prevention: regular dental hygiene every 6 months, avoiding staining foods after whitening.',
            },
        },
        de: {
            faq: [
                { q: 'Was sind Porzellan-Veneers?', a: 'Veneers sind dünne Porzellanschalen, die auf die Vorderseite der Zähne geklebt werden. Sie korrigieren Form, Farbe und kleine Unregelmäßigkeiten. Ermöglichen einen Hollywood Smile ohne Spangen.' },
                { q: 'Schadet Zahnaufhellung dem Schmelz?', a: 'Nein, professionelle In-Office-Bleaching ist sicher. Wir verwenden moderne Präparate, die den Schmelz nicht demineralisieren — sie oxidieren nur Verfärbungen.' },
                { q: 'Wie lange hält der Bleaching-Effekt?', a: 'Der Effekt hält normalerweise 1-3 Jahre. Hängt hauptsächlich von Ernährung (Kaffee, Wein) und Gewohnheiten (Rauchen) ab. Regelmäßige Zahnhygiene hilft, die Helligkeit zu erhalten.' },
                { q: 'Was ist Bonding?', a: 'Bonding ist eine nicht-invasive Methode zur Verbesserung der Zahnästhetik mit Kompositharz. Wir führen es in einer Sitzung ohne Beschleifen durch. Ideal zum Schließen von Diastema.' },
            ],
            procedure: {
                name: 'Ästhetische Zahnmedizin in Opole, Polen',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Behandlungen zur Verbesserung der Lächelästhetik: Porzellan-Veneers (E.max), Komposit-Bonding, professionelle Zahnaufhellung. Digital Smile Design (DSD) Planung.',
                howPerformed: 'DSD-Beratung und Simulation des Endergebnisses. Veneers: 3D-Scan, Design, Laborfertigung, Zementierung. Bonding: in einer Sitzung ohne Beschleifen. Bleaching: in der Praxis oder über Nacht mit individuellen Schienen.',
                preparation: 'Ästhetische Beratung, klinische und radiologische Bewertung. Eventuell vorherige Zahnhygiene.',
                followup: 'Kontrolle nach 7 Tagen. Prävention: regelmäßige Zahnhygiene alle 6 Monate, Vermeidung färbender Lebensmittel nach Bleaching.',
            },
        },
        ua: {
            faq: [
                { q: 'Що таке порцелянові вініри?', a: 'Вініри це тонкі порцелянові пелюстки, що приклеюються до передньої частини зуба. Коригують форму, колір та незначні нерівності. Дозволяють досягти ефекту Hollywood Smile без брекетів.' },
                { q: 'Чи відбілювання зубів пошкоджує емаль?', a: 'Ні, професійне відбілювання в кабінеті є безпечним. Використовуємо сучасні препарати, які не деминералізують емаль, а лише окислюють пігментацію.' },
                { q: 'Як довго тримається ефект відбілювання?', a: 'Ефект зазвичай тримається від року до 3 років. Залежить переважно від дієти (кава, вино) та звичок (паління). Регулярна гігієна допомагає підтримати білизну.' },
                { q: 'Що таке Бондинг?', a: 'Бондинг це неінвазивний метод покращення естетики зуба за допомогою композитної смоли. Виконуємо за один візит без обробки зубів. Ідеальний для закриття діастеми.' },
            ],
            procedure: {
                name: 'Естетична стоматологія Ополе',
                procedureType: 'TherapeuticProcedure',
                bodyLocation: 'Teeth',
                description: 'Процедури покращення естетики посмішки: порцелянові вініри (E.max), композитний бондинг, професійне відбілювання зубів. Цифрове планування посмішки (DSD - Digital Smile Design).',
                howPerformed: 'DSD-консультація та симуляція кінцевого результату. Вініри: 3D-сканування, проект, виготовлення в лабораторії, цементування. Бондинг: за один візит без обробки зуба. Відбілювання: в кабінеті або нічне з індивідуальними капами.',
                preparation: 'Естетична консультація, клінічна та рентгенологічна оцінка. Можлива попередня гігієнізація.',
                followup: 'Контроль через 7 днів. Профілактика: регулярна гігієна кожні 6 місяців, уникнення барвлячих продуктів після відбілювання.',
            },
        },
    },
};

// H4 (2026-05-10): areaServed for Service schema. Opole + Poland is the primary
// catchment + foreign-patient targets (Germany, Czech Republic — clinic is 80 km
// from the DE border, hence "dental tourism" potential). areaServed is the
// strongest local-pack + foreign-market signal Google has for service entities.
const AREA_SERVED = [
    { '@type': 'City', name: 'Opole' },
    { '@type': 'AdministrativeArea', name: 'województwo opolskie' },
    { '@type': 'Country', name: 'Poland' },
    { '@type': 'Country', name: 'Germany' },
    { '@type': 'Country', name: 'Czech Republic' },
    { '@type': 'Country', name: 'Ukraine' },
];

function localePath(locale: string, path: string): string {
    if (locale === 'pl') return path;
    return `/${locale}${path}`;
}

/**
 * Build FAQ + MedicalProcedure + Service schemas for a service page in the
 * requested locale. Falls back to PL if the requested locale isn't translated yet.
 *
 * Service schema (H4) adds local-pack signal via areaServed (Opole + Poland +
 * neighbouring countries) and links service back to the Dentist entity via @id.
 * No `offers` field — pricing changes too frequently to risk Google flagging
 * stale price data.
 *
 * Returns null if the path isn't a known service page.
 */
export function buildServicePageSchemas(path: string, locale: string) {
    const entry = SERVICE_SCHEMAS[path];
    if (!entry) return null;

    const data = entry[locale] || entry.pl;
    if (!data) return null;

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
            },
        })),
    };

    const procedureSchema = {
        '@context': 'https://schema.org',
        '@type': 'MedicalProcedure',
        name: data.procedure.name,
        procedureType: `https://schema.org/${data.procedure.procedureType}`,
        bodyLocation: data.procedure.bodyLocation,
        description: data.procedure.description,
        howPerformed: data.procedure.howPerformed,
        preparation: data.procedure.preparation,
        followup: data.procedure.followup,
        // Batch SEO-2 (2026-05-21, audyt P2 Issue 4): performer to array
        // [MedicalOrganization (klinika) + Physician (Marcin)]. Wszystkie 6
        // service pages /oferta/* są wykonywane przez Marcina (implantologia,
        // endodoncja, estetyczna, ortodoncja, chirurgia, protetyka). Physician @id
        // linkuje do entity z /zespol/marcin-nowosielski via Knowledge Graph.
        performer: [
            {
                '@type': 'MedicalOrganization',
                name: brand.name,
                url: brand.appUrl,
                '@id': brand.schemaId,
            },
            {
                '@type': 'Physician',
                '@id': `${brand.appUrl}/#marcin-nowosielski`,
                name: 'Marcin Nowosielski',
                url: `${brand.appUrl}${localePath(locale, '/zespol/marcin-nowosielski')}`,
            },
        ],
    };

    const serviceUrl = `${brand.appUrl}${localePath(locale, path)}`;
    const serviceSchema = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: data.procedure.name,
        description: data.procedure.description,
        category: 'Dentistry',
        url: serviceUrl,
        provider: { '@id': brand.schemaId },
        areaServed: AREA_SERVED,
    };

    return { faqSchema, procedureSchema, serviceSchema };
}
