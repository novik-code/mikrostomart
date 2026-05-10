/**
 * Per-page SEO content for all 4 locales.
 *
 * Faza G1 (2026-05-09): centralized title/description/keywords for every public
 * page. Keys are locale-agnostic paths. Each entry has 4 locale variants.
 *
 * Guidelines:
 * - title: 50-65 chars (Google truncates ~60 in SERP)
 * - description: 144-160 chars (Google truncates ~155-160)
 * - keywords: ~5-7 phrases, primary + secondary
 * - Always include brand name + location in EN/DE/UA so foreign searchers find Opole clinic
 */
import type { LocaleSeoMap } from '@/lib/seo';

export const PAGE_SEO: Record<string, LocaleSeoMap> = {
    // ───────── /oferta — main offer landing ─────────
    '/oferta': {
        pl: {
            title: 'Oferta usług | Mikrostomart - Stomatolog Opole',
            description: 'Pełna oferta gabinetu Mikrostomart w Opolu: implanty, mikroskopowe leczenie kanałowe, stomatologia estetyczna, ortodoncja, chirurgia, protetyka.',
            keywords: 'oferta dentysta opole, usługi stomatologiczne opole, implanty opole, leczenie kanałowe opole, stomatologia estetyczna opole',
        },
        en: {
            title: 'Dental Services | Mikrostomart Dental Clinic Opole',
            description: 'Full range of dental services at Mikrostomart Opole, Poland: implants, microscopic root canal, aesthetic dentistry, orthodontics, surgery, prosthetics.',
            keywords: 'dentist Opole Poland, dental services Opole, dental implants Opole, root canal Opole, aesthetic dentistry Opole',
        },
        de: {
            title: 'Zahnärztliche Leistungen | Zahnklinik Mikrostomart Opole',
            description: 'Volles Leistungsspektrum bei Mikrostomart Opole, Polen: Implantate, mikroskopische Wurzelkanalbehandlung, ästhetische Zahnmedizin, Kieferorthopädie, Chirurgie.',
            keywords: 'Zahnarzt Opole Polen, Zahnärztliche Leistungen Opole, Zahnimplantate Opole, Wurzelkanalbehandlung Opole, ästhetische Zahnmedizin Opole',
        },
        ua: {
            title: 'Стоматологічні послуги | Mikrostomart Ополе',
            description: 'Повний спектр послуг в клініці Mikrostomart в Ополе, Польща: імпланти, мікроскопічне ендодонтичне лікування, естетика, ортодонтія, хірургія, протезування.',
            keywords: 'стоматолог Ополе Польща, стоматологічні послуги Ополе, імпланти Ополе, лікування каналів Ополе, естетична стоматологія Ополе',
        },
    },

    // ───────── /oferta/implantologia ─────────
    '/oferta/implantologia': {
        pl: {
            title: 'Implanty zębów Opole | Cennik implantów - Mikrostomart',
            description: 'Profesjonalne implanty zębów w Opolu. Cyfrowe planowanie, szablony implantologiczne, bezbolesny zabieg. Sprawdź cennik i umów wizytę: 570 270 470.',
            keywords: 'implanty opole, implanty zębów opole, cennik implantów opole, implant cena opole, implantacja opole, dentysta implanty opole',
        },
        en: {
            title: 'Dental Implants Opole, Poland | Mikrostomart Clinic',
            description: 'Professional dental implants in Opole, Poland. Digital planning, surgical guides, painless procedure. Check pricing and book: +48 570 270 470.',
            keywords: 'dental implants Opole, dental implants Poland, implant cost Opole, implantology Opole, tooth implant Opole',
        },
        de: {
            title: 'Zahnimplantate Opole, Polen | Mikrostomart Klinik',
            description: 'Zahnimplantate in Opole, Polen. Digitale Planung, chirurgische Schablonen, schmerzfreie Behandlung. Preise prüfen und Termin buchen: +48 570 270 470.',
            keywords: 'Zahnimplantate Opole, Zahnimplantate Polen, Implantat Kosten Opole, Implantologie Opole, Zahnimplantat Polen',
        },
        ua: {
            title: 'Імпланти зубів в Ополе | Mikrostomart',
            description: 'Професійна імплантація зубів в Ополе, Польща. Цифрове планування, хірургічні шаблони, безболісно. Перевірте ціни та запис: +48 570 270 470.',
            keywords: 'імпланти зубів Ополе, імпланти Польща, ціна імплантів Ополе, імплантація Ополе, стоматолог імпланти Ополе',
        },
    },

    // ───────── /oferta/leczenie-kanalowe ─────────
    '/oferta/leczenie-kanalowe': {
        pl: {
            title: 'Leczenie kanałowe pod mikroskopem Opole | Mikrostomart',
            description: 'Mikroskopowe leczenie kanałowe w Opolu. Endodoncja z systemem The Wand, Re-Endo, ratowanie zębów uznanych za stracone. Umów wizytę.',
            keywords: 'leczenie kanałowe opole, mikroskop endodoncja opole, endodoncja mikroskopowa opole, re-endo opole, the wand opole',
        },
        en: {
            title: 'Microscopic Root Canal Opole | Endodontics Mikrostomart',
            description: 'Microscopic root canal treatment in Opole, Poland. Painless endodontics with The Wand anesthesia, Re-Endo retreatment, save compromised teeth.',
            keywords: 'root canal Opole, microscopic endodontics Opole, endodontics Poland, re-endo Opole, painless root canal Opole',
        },
        de: {
            title: 'Wurzelkanalbehandlung unter Mikroskop Opole | Mikrostomart',
            description: 'Mikroskopische Wurzelkanalbehandlung in Opole. Schmerzfreie Endodontie mit The Wand, Re-Endo Wiederbehandlung, Zahnerhalt.',
            keywords: 'Wurzelkanalbehandlung Opole, mikroskopische Endodontie Opole, Endodontie Polen, schmerzfreie Wurzelbehandlung Opole',
        },
        ua: {
            title: 'Лікування каналів під мікроскопом Ополе | Mikrostomart',
            description: 'Мікроскопічне ендодонтичне лікування в Ополе, Польща. Безболісно з The Wand, Re-Endo, збереження зубів.',
            keywords: 'лікування каналів Ополе, мікроскопічна ендодонтія Ополе, ендодонтія Польща, re-endo Ополе',
        },
    },

    // ───────── /oferta/stomatologia-estetyczna ─────────
    '/oferta/stomatologia-estetyczna': {
        pl: {
            title: 'Stomatologia estetyczna Opole | Licówki, wybielanie - Mikrostomart',
            description: 'Stomatologia estetyczna w Opolu: licówki porcelanowe, bonding, wybielanie zębów, projektowanie uśmiechu DSD. Zobacz metamorfozy.',
            keywords: 'stomatologia estetyczna opole, licówki opole, wybielanie zębów opole, bonding opole, projektowanie uśmiechu opole, dsd opole',
        },
        en: {
            title: 'Aesthetic Dentistry Opole | Veneers, Whitening - Mikrostomart',
            description: 'Aesthetic dentistry in Opole, Poland: porcelain veneers, bonding, teeth whitening, Digital Smile Design. View patient metamorphoses.',
            keywords: 'aesthetic dentistry Opole, porcelain veneers Opole, teeth whitening Opole, bonding Opole, smile design Opole',
        },
        de: {
            title: 'Ästhetische Zahnmedizin Opole | Veneers, Bleaching - Mikrostomart',
            description: 'Ästhetische Zahnmedizin in Opole, Polen: Porzellan-Veneers, Bonding, Zahnaufhellung, Digital Smile Design. Sehen Sie Patientenmetamorphosen.',
            keywords: 'ästhetische Zahnmedizin Opole, Veneers Opole, Zahnaufhellung Opole, Bonding Opole, Smile Design Opole',
        },
        ua: {
            title: 'Естетична стоматологія Ополе | Вініри, відбілювання - Mikrostomart',
            description: 'Естетична стоматологія в Ополе, Польща: порцелянові вініри, бондинг, відбілювання, дизайн посмішки DSD.',
            keywords: 'естетична стоматологія Ополе, вініри Ополе, відбілювання зубів Ополе, бондинг Ополе, дизайн посмішки Ополе',
        },
    },

    // ───────── /oferta/ortodoncja ─────────
    '/oferta/ortodoncja': {
        pl: {
            title: 'Ortodoncja Opole | Nakładki Clear Correct - Mikrostomart',
            description: 'Ortodoncja nakładkowa w Opolu. Clear Correct z symulacją 3D, prostowanie zębów u dorosłych i dzieci. Sprawdź cennik i umów konsultację.',
            keywords: 'ortodoncja opole, clear correct opole, nakładki ortodontyczne opole, prostowanie zębów opole, ortodonta opole',
        },
        en: {
            title: 'Orthodontics Opole | Clear Correct Aligners - Mikrostomart',
            description: 'Aligner orthodontics in Opole, Poland. Clear Correct with 3D simulation, teeth straightening for adults and children. Check pricing.',
            keywords: 'orthodontics Opole, clear correct Opole, dental aligners Opole, teeth straightening Opole, orthodontist Opole',
        },
        de: {
            title: 'Kieferorthopädie Opole | Clear Correct Aligner - Mikrostomart',
            description: 'Aligner-Kieferorthopädie in Opole, Polen. Clear Correct mit 3D-Simulation, Zahnausrichtung für Erwachsene und Kinder.',
            keywords: 'Kieferorthopädie Opole, Clear Correct Opole, Aligner Opole, Zahnausrichtung Opole, Kieferorthopäde Opole',
        },
        ua: {
            title: 'Ортодонтія Ополе | Елайнери Clear Correct - Mikrostomart',
            description: 'Ортодонтія елайнерами в Ополе, Польща. Clear Correct з 3D-симуляцією, вирівнювання зубів для дорослих і дітей.',
            keywords: 'ортодонтія Ополе, clear correct Ополе, елайнери Ополе, вирівнювання зубів Ополе, ортодонт Ополе',
        },
    },

    // ───────── /oferta/chirurgia ─────────
    '/oferta/chirurgia': {
        pl: {
            title: 'Chirurgia stomatologiczna Opole | Ekstrakcje, ósemki - Mikrostomart',
            description: 'Chirurgia stomatologiczna w Opolu: ekstrakcje, usuwanie ósemek, technologia PRF, regeneracja kości. Doświadczeni chirurdzy.',
            keywords: 'chirurgia stomatologiczna opole, ekstrakcja zęba opole, usuwanie ósemek opole, prf opole, chirurg stomatolog opole',
        },
        en: {
            title: 'Oral Surgery Opole | Extractions, Wisdom Teeth - Mikrostomart',
            description: 'Oral surgery in Opole, Poland: extractions, wisdom teeth removal, PRF technology, bone regeneration. Experienced surgeons.',
            keywords: 'oral surgery Opole, tooth extraction Opole, wisdom teeth Opole, PRF Opole, dental surgeon Opole',
        },
        de: {
            title: 'Mund-Kiefer-Chirurgie Opole | Extraktion, Weisheitszähne - Mikrostomart',
            description: 'Mund- und Kieferchirurgie in Opole, Polen: Extraktionen, Weisheitszahn-Entfernung, PRF-Technologie, Knochenregeneration.',
            keywords: 'Mundchirurgie Opole, Zahnextraktion Opole, Weisheitszähne Opole, PRF Opole, Kieferchirurg Opole',
        },
        ua: {
            title: 'Стоматологічна хірургія Ополе | Видалення зубів - Mikrostomart',
            description: 'Стоматологічна хірургія в Ополе, Польща: видалення зубів, вісімки, технологія PRF, регенерація кістки.',
            keywords: 'стоматологічна хірургія Ополе, видалення зуба Ополе, вісімки Ополе, prf Ополе, хірург стоматолог Ополе',
        },
    },

    // ───────── /oferta/protetyka ─────────
    '/oferta/protetyka': {
        pl: {
            title: 'Protetyka Opole | Korony, mosty, protezy - Mikrostomart',
            description: 'Protetyka w Opolu: korony E.max i cyrkonowe, mosty, protezy. Cyfrowy skan wewnątrzustny zamiast wycisków. Sprawdź cennik.',
            keywords: 'protetyka opole, korony opole, mosty stomatologiczne opole, protezy opole, korony cyrkonowe opole, e.max opole',
        },
        en: {
            title: 'Prosthodontics Opole | Crowns, Bridges, Dentures - Mikrostomart',
            description: 'Prosthodontics in Opole, Poland: E.max and zirconia crowns, bridges, dentures. Digital intraoral scanning instead of impressions.',
            keywords: 'prosthodontics Opole, dental crowns Opole, dental bridges Opole, dentures Opole, zirconia crowns Opole',
        },
        de: {
            title: 'Zahnprothetik Opole | Kronen, Brücken, Prothesen - Mikrostomart',
            description: 'Zahnprothetik in Opole, Polen: E.max und Zirkonkronen, Brücken, Prothesen. Digitale Intraoralabformung statt Abdrücken.',
            keywords: 'Zahnprothetik Opole, Zahnkronen Opole, Zahnbrücken Opole, Zahnprothesen Opole, Zirkonkronen Opole',
        },
        ua: {
            title: 'Протезування Ополе | Коронки, мости, протези - Mikrostomart',
            description: 'Протезування в Ополе, Польща: коронки E.max і цирконієві, мости, протези. Цифровий внутрішньоротовий скан замість зліпків.',
            keywords: 'протезування Ополе, коронки Ополе, зубні мости Ополе, протези Ополе, цирконієві коронки Ополе',
        },
    },

    // ───────── /cennik ─────────
    '/cennik': {
        pl: {
            title: 'Cennik usług stomatologicznych Opole | Mikrostomart',
            description: 'Aktualny cennik gabinetu Mikrostomart w Opolu: konsultacje, implanty, leczenie kanałowe, licówki, wybielanie. Transparentne ceny.',
            keywords: 'cennik dentysta opole, ceny implantów opole, cennik stomatolog opole, mikrostomart cennik, ceny stomatolog opole',
        },
        en: {
            title: 'Dental Services Pricing Opole, Poland | Mikrostomart',
            description: 'Current pricing at Mikrostomart Opole: consultations, implants, root canal, veneers, whitening. Transparent costs in PLN.',
            keywords: 'dentist prices Opole, dental implant cost Opole, dental clinic prices Poland, dental care cost Opole',
        },
        de: {
            title: 'Preise Zahnarzt Opole, Polen | Mikrostomart',
            description: 'Aktuelle Preise bei Mikrostomart Opole: Beratung, Implantate, Wurzelkanalbehandlung, Veneers, Bleaching. Transparente Kosten.',
            keywords: 'Zahnarzt Preise Opole, Zahnimplantat Kosten Polen, Zahnarztpreise Polen, Zahnbehandlung Kosten Opole',
        },
        ua: {
            title: 'Ціни стоматологія Ополе | Mikrostomart',
            description: 'Актуальні ціни Mikrostomart в Ополе: консультації, імпланти, лікування каналів, вініри, відбілювання. Прозорі ціни.',
            keywords: 'ціни стоматолог Ополе, ціна імплантів Ополе, стоматологія Ополе ціни, mikrostomart ціни',
        },
    },

    // ───────── /kontakt ─────────
    '/kontakt': {
        pl: {
            title: 'Kontakt | Mikrostomart - Stomatolog Opole',
            description: 'Skontaktuj się z gabinetem Mikrostomart w Opolu. Adres: ul. Centralna 33a. Telefon: 570-270-470. Umów wizytę online.',
            keywords: 'kontakt dentysta opole, mikrostomart telefon, umów wizytę opole, gabinet stomatologiczny opole adres',
        },
        en: {
            title: 'Contact | Mikrostomart Dental Clinic Opole, Poland',
            description: 'Contact Mikrostomart in Opole, Poland. Address: ul. Centralna 33a. Phone: +48 570-270-470. Book your appointment online.',
            keywords: 'dentist contact Opole, Mikrostomart phone, book dental appointment Opole, dental clinic Opole address',
        },
        de: {
            title: 'Kontakt | Zahnklinik Mikrostomart Opole, Polen',
            description: 'Kontakt zu Mikrostomart in Opole, Polen. Adresse: ul. Centralna 33a. Telefon: +48 570-270-470. Online-Termin.',
            keywords: 'Zahnarzt Kontakt Opole, Mikrostomart Telefon, Termin Zahnarzt Opole, Zahnklinik Opole Adresse',
        },
        ua: {
            title: 'Контакти | Стоматологічна клініка Mikrostomart Ополе',
            description: 'Зв\'яжіться з Mikrostomart в Ополе, Польща. Адреса: ul. Centralna 33a. Телефон: +48 570-270-470. Онлайн запис.',
            keywords: 'контакт стоматолог Ополе, mikrostomart телефон, запис до стоматолога Ополе, клініка Ополе адреса',
        },
    },

    // ───────── /mapa-bolu ─────────
    '/mapa-bolu': {
        pl: {
            title: 'Mapa bólu zęba — interaktywna diagnostyka | Mikrostomart',
            description: 'Interaktywna mapa bólu zębów. Kliknij na ząb, opisz objawy i sprawdź możliwe przyczyny. Bezpłatne narzędzie diagnostyczne online.',
            keywords: 'mapa bólu zęba, ból zęba przyczyny, diagnostyka stomatologiczna, ból zęba co robić, interaktywna mapa zębów',
        },
        en: {
            title: 'Tooth Pain Map — Interactive Diagnostics | Mikrostomart',
            description: 'Interactive tooth pain map. Click on a tooth, describe symptoms, learn possible causes. Free online dental diagnostic tool.',
            keywords: 'tooth pain map, tooth pain causes, dental diagnostic, dental pain symptoms, interactive tooth map',
        },
        de: {
            title: 'Zahnschmerzkarte — Interaktive Diagnose | Mikrostomart',
            description: 'Interaktive Zahnschmerzkarte. Auf Zahn klicken, Symptome beschreiben, mögliche Ursachen erfahren. Kostenloses Online-Diagnosetool.',
            keywords: 'Zahnschmerzkarte, Zahnschmerzen Ursachen, Zahndiagnose, Zahnschmerzen Symptome, interaktive Zahnkarte',
        },
        ua: {
            title: 'Карта зубного болю — інтерактивна діагностика | Mikrostomart',
            description: 'Інтерактивна карта зубного болю. Натисніть на зуб, опишіть симптоми, дізнайтеся можливі причини. Безкоштовний онлайн інструмент.',
            keywords: 'карта зубного болю, причини зубного болю, стоматологічна діагностика, симптоми болю зуба',
        },
    },

    // ───────── /kalkulator-leczenia ─────────
    '/kalkulator-leczenia': {
        pl: {
            title: 'Kalkulator czasu leczenia stomatologicznego | Mikrostomart',
            description: 'Sprawdź ile wizyt i czasu zajmie Twoje leczenie: implanty, endodoncja, protetyka, bonding, wybielanie. Interaktywny kalkulator z osią czasu.',
            keywords: 'kalkulator leczenia stomatologicznego, czas leczenia kanałowego, czas implantacji, ile trwa leczenie zęba',
        },
        en: {
            title: 'Dental Treatment Time Calculator | Mikrostomart',
            description: 'Check how many visits and time your treatment requires: implants, endodontics, prosthetics, bonding, whitening. Interactive timeline tool.',
            keywords: 'dental treatment calculator, root canal time, implant timeline, how long dental treatment',
        },
        de: {
            title: 'Zahnbehandlungs-Zeitrechner | Mikrostomart',
            description: 'Prüfen Sie, wie viele Termine und Zeit Ihre Behandlung benötigt: Implantate, Endodontie, Prothetik, Bonding, Bleaching. Interaktive Zeitachse.',
            keywords: 'Zahnbehandlung Rechner, Wurzelbehandlung Dauer, Implantat Zeitrahmen, Behandlungsdauer Zahnarzt',
        },
        ua: {
            title: 'Калькулятор тривалості лікування | Mikrostomart',
            description: 'Дізнайтеся скільки візитів і часу займе лікування: імпланти, ендодонтія, протезування, бондинг, відбілювання. Інтерактивний інструмент.',
            keywords: 'калькулятор лікування, тривалість лікування каналу, термін імплантації, тривалість стоматологічного лікування',
        },
    },

    // ───────── /porownywarka ─────────
    '/porownywarka': {
        pl: {
            title: 'Porównywarka rozwiązań stomatologicznych | Mikrostomart',
            description: 'Porównaj metody leczenia: implant vs most vs proteza, bonding vs licówki vs korony. Interaktywne porównanie bez cen, dopasowane do priorytetów.',
            keywords: 'implant czy most, licówki czy korony, bonding czy licówki, porównanie metod leczenia stomatologicznego',
        },
        en: {
            title: 'Dental Treatment Comparator | Mikrostomart',
            description: 'Compare dental treatments: implant vs bridge vs denture, bonding vs veneers vs crowns. Interactive comparison tailored to your priorities.',
            keywords: 'implant vs bridge, veneers vs crowns, bonding vs veneers, dental treatment comparison',
        },
        de: {
            title: 'Zahnbehandlungs-Vergleich | Mikrostomart',
            description: 'Vergleichen Sie Behandlungen: Implantat vs Brücke vs Prothese, Bonding vs Veneers vs Kronen. Interaktiver Vergleich nach Prioritäten.',
            keywords: 'Implantat oder Brücke, Veneers oder Kronen, Bonding oder Veneers, Zahnbehandlung Vergleich',
        },
        ua: {
            title: 'Порівняння стоматологічних рішень | Mikrostomart',
            description: 'Порівняйте методи лікування: імплант проти моста проти протеза, бондинг проти вінірів проти коронок. Інтерактивне порівняння.',
            keywords: 'імплант чи міст, вініри чи коронки, бондинг чи вініри, порівняння методів стоматологічного лікування',
        },
    },

    // ───────── /sklep ─────────
    '/sklep': {
        pl: {
            title: 'Sklep stomatologiczny | Higiena jamy ustnej - Mikrostomart',
            description: 'Sklep Mikrostomart: produkty do higieny jamy ustnej, szczoteczki, pasty i akcesoria rekomendowane przez stomatologów z gabinetu w Opolu.',
            keywords: 'sklep stomatologiczny, produkty higiena jamy ustnej, szczoteczki dentystyczne, pasty rekomendowane',
        },
        en: {
            title: 'Dental Shop | Oral Hygiene Products - Mikrostomart',
            description: 'Mikrostomart shop: oral hygiene products, toothbrushes, pastes and accessories recommended by dentists from our Opole clinic.',
            keywords: 'dental shop, oral hygiene products, recommended toothbrushes, dentist recommended pastes',
        },
        de: {
            title: 'Zahnshop | Mundhygiene-Produkte - Mikrostomart',
            description: 'Mikrostomart Shop: Mundhygiene-Produkte, Zahnbürsten, Pasten und Zubehör, empfohlen von Zahnärzten unserer Klinik in Opole.',
            keywords: 'Zahnshop, Mundhygiene Produkte, empfohlene Zahnbürsten, Zahnpasta empfohlen',
        },
        ua: {
            title: 'Стоматологічний магазин | Mikrostomart',
            description: 'Магазин Mikrostomart: засоби гігієни порожнини рота, зубні щітки, пасти та аксесуари, рекомендовані стоматологами клініки в Ополе.',
            keywords: 'стоматологічний магазин, засоби гігієни порожнини рота, рекомендовані зубні щітки',
        },
    },

    // ───────── /faq ─────────
    '/faq': {
        pl: {
            title: 'FAQ — najczęstsze pytania | Mikrostomart Stomatolog Opole',
            description: 'Odpowiedzi na najczęstsze pytania o leczenie stomatologiczne: implanty, leczenie kanałowe, licówki, ortodoncja, wybielanie i więcej.',
            keywords: 'faq dentysta opole, pytania stomatologia, implanty pytania, leczenie kanałowe faq, ortodoncja faq',
        },
        en: {
            title: 'FAQ — Frequently Asked Questions | Mikrostomart Opole',
            description: 'Answers to common questions about dental treatment: implants, root canal, veneers, orthodontics, whitening and more at Mikrostomart Opole.',
            keywords: 'dentist FAQ Opole, dental questions, implants FAQ, root canal questions, orthodontics FAQ',
        },
        de: {
            title: 'FAQ — Häufige Fragen | Mikrostomart Zahnarzt Opole',
            description: 'Antworten auf häufige Fragen zur Zahnbehandlung: Implantate, Wurzelkanal, Veneers, Kieferorthopädie, Bleaching bei Mikrostomart Opole.',
            keywords: 'Zahnarzt FAQ Opole, Zahnfragen, Implantate FAQ, Wurzelbehandlung Fragen, Kieferorthopädie FAQ',
        },
        ua: {
            title: 'FAQ — поширені питання | Mikrostomart Ополе',
            description: 'Відповіді на поширені питання про стоматологічне лікування: імпланти, ендодонтія, вініри, ортодонтія, відбілювання.',
            keywords: 'стоматолог faq Ополе, стоматологічні питання, імпланти питання, ендодонтія faq',
        },
    },

    // ───────── /baza-wiedzy ─────────
    '/baza-wiedzy': {
        pl: {
            title: 'Baza wiedzy stomatologicznej | Mikrostomart Opole',
            description: 'Artykuły o stomatologii: implanty, leczenie kanałowe, higiena, profilaktyka, ortodoncja. Wiedza ekspercka gabinetu Mikrostomart w Opolu.',
            keywords: 'baza wiedzy stomatologia, artykuły dentysta, implanty wiedza, higiena zębów porady, profilaktyka stomatologiczna',
        },
        en: {
            title: 'Dental Knowledge Base | Mikrostomart Opole',
            description: 'Articles on dentistry: implants, root canal, hygiene, prevention, orthodontics. Expert knowledge from Mikrostomart clinic in Opole, Poland.',
            keywords: 'dental knowledge base, dentistry articles, implants knowledge, oral hygiene tips, dental prevention',
        },
        de: {
            title: 'Zahnmedizin-Wissensdatenbank | Mikrostomart Opole',
            description: 'Artikel zur Zahnmedizin: Implantate, Wurzelkanal, Hygiene, Prävention, Kieferorthopädie. Expertenwissen von Mikrostomart in Opole.',
            keywords: 'Zahnmedizin Wissen, Zahnmedizin Artikel, Implantate Wissen, Mundhygiene Tipps, Zahnvorsorge',
        },
        ua: {
            title: 'База знань зі стоматології | Mikrostomart Ополе',
            description: 'Статті про стоматологію: імпланти, ендодонтія, гігієна, профілактика, ортодонтія. Експертні знання клініки Mikrostomart в Ополе.',
            keywords: 'база знань стоматологія, статті стоматолог, імпланти знання, гігієна зубів поради',
        },
    },

    // ───────── /aktualnosci ─────────
    '/aktualnosci': {
        pl: {
            title: 'Aktualności | Mikrostomart Stomatolog Opole',
            description: 'Najnowsze wiadomości z gabinetu Mikrostomart w Opolu. Porady stomatologiczne, nowości w ofercie, wydarzenia i promocje.',
            keywords: 'aktualności dentysta opole, nowości stomatologia, mikrostomart blog, porady stomatologiczne',
        },
        en: {
            title: 'News | Mikrostomart Dental Clinic Opole',
            description: 'Latest news from Mikrostomart in Opole. Dental tips, new services, events and promotions from our dental clinic in Poland.',
            keywords: 'dentist news Opole, dental clinic news, Mikrostomart blog, dental tips',
        },
        de: {
            title: 'Aktuelles | Zahnklinik Mikrostomart Opole',
            description: 'Neuigkeiten von Mikrostomart in Opole. Zahntipps, neue Leistungen, Veranstaltungen und Aktionen aus unserer Klinik in Polen.',
            keywords: 'Zahnarzt Neuigkeiten Opole, Zahnklinik News, Mikrostomart Blog, Zahntipps',
        },
        ua: {
            title: 'Новини | Стоматологічна клініка Mikrostomart Ополе',
            description: 'Останні новини Mikrostomart в Ополе. Стоматологічні поради, новини в послугах, події та акції нашої клініки в Польщі.',
            keywords: 'новини стоматолог Ополе, новини клініки, mikrostomart блог, стоматологічні поради',
        },
    },

    // ───────── /metamorfozy ─────────
    '/metamorfozy': {
        pl: {
            title: 'Metamorfozy uśmiechów | Przed i po - Mikrostomart Opole',
            description: 'Galeria metamorfoz pacjentów Mikrostomart: zdjęcia uśmiechów przed i po leczeniu. Zobacz efekty licówek, wybielania, ortodoncji, implantów.',
            keywords: 'metamorfozy uśmiechu opole, przed i po stomatologia, efekty licówek, efekty wybielania, transformacje uśmiechów',
        },
        en: {
            title: 'Smile Metamorphoses | Before & After - Mikrostomart Opole',
            description: 'Mikrostomart patient metamorphoses gallery: smiles before and after treatment. See veneer, whitening, orthodontic and implant results.',
            keywords: 'smile makeover Opole, dental before after, veneer results, whitening results, smile transformation Poland',
        },
        de: {
            title: 'Lächeln-Metamorphosen | Vorher & Nachher - Mikrostomart',
            description: 'Mikrostomart Patientengalerie: Lächeln vor und nach der Behandlung. Sehen Sie Veneer-, Bleaching-, Kieferorthopädie- und Implantatergebnisse.',
            keywords: 'Smile Makeover Opole, Zahnarzt Vorher Nachher, Veneer Ergebnisse, Bleaching Ergebnisse, Lächeln Transformation',
        },
        ua: {
            title: 'Метаморфози посмішок | До і після - Mikrostomart Ополе',
            description: 'Галерея метаморфоз пацієнтів Mikrostomart: посмішки до і після лікування. Подивіться результати вінірів, відбілювання, ортодонтії, імплантів.',
            keywords: 'метаморфози посмішки Ополе, до і після стоматологія, результати вінірів, результати відбілювання',
        },
    },

    // ───────── /o-nas ─────────
    '/o-nas': {
        pl: {
            title: 'O nas | Mikrostomart - Stomatolog Opole',
            description: 'Poznaj zespół Mikrostomart w Opolu. Nowoczesna stomatologia mikroskopowa, doświadczeni specjaliści, indywidualne podejście do pacjenta.',
            keywords: 'o nas mikrostomart, dentysta opole, gabinet stomatologiczny opole, stomatologia mikroskopowa opole, zespół stomatologów',
        },
        en: {
            title: 'About Us | Mikrostomart Dental Clinic Opole',
            description: 'Meet the Mikrostomart team in Opole, Poland. Modern microscopic dentistry, experienced specialists, individual approach to each patient.',
            keywords: 'about Mikrostomart, dentist Opole Poland, dental clinic Opole, microscopic dentistry Opole, dental team',
        },
        de: {
            title: 'Über uns | Zahnklinik Mikrostomart Opole, Polen',
            description: 'Lernen Sie das Mikrostomart-Team in Opole, Polen kennen. Moderne mikroskopische Zahnmedizin, erfahrene Spezialisten, individueller Ansatz.',
            keywords: 'Über Mikrostomart, Zahnarzt Opole Polen, Zahnklinik Opole, mikroskopische Zahnmedizin Opole, Zahnärzte Team',
        },
        ua: {
            title: 'Про нас | Стоматологічна клініка Mikrostomart Ополе',
            description: 'Познайомтеся з командою Mikrostomart в Ополе, Польща. Сучасна мікроскопічна стоматологія, досвідчені фахівці, індивідуальний підхід.',
            keywords: 'про mikrostomart, стоматолог Ополе Польща, клініка Ополе, мікроскопічна стоматологія Ополе, команда стоматологів',
        },
    },

    // ───────── /nowosielski (Dr Nowosielski blog) ─────────
    '/nowosielski': {
        pl: {
            title: 'Blog Dr Nowosielski | Mikrostomart Stomatolog Opole',
            description: 'Blog dr Marcina Nowosielskiego — implantolog i mikroskopowy endodonta. Praktyczne porady, opisy przypadków, edukacja stomatologiczna z gabinetu w Opolu.',
            keywords: 'dr nowosielski blog, marcin nowosielski stomatolog, blog dentystyczny opole, opisy przypadków stomatologia',
        },
        en: {
            title: "Dr Nowosielski's Blog | Mikrostomart Opole",
            description: "Dr Marcin Nowosielski's blog — implantologist and microscopic endodontist. Case studies, practical advice, dental education from Opole, Poland.",
            keywords: 'dr nowosielski blog, dental case studies, dental education, microscopic endodontics blog',
        },
        de: {
            title: 'Blog Dr Nowosielski | Mikrostomart Opole',
            description: 'Blog von Dr Marcin Nowosielski — Implantologe und mikroskopischer Endodontologe. Fallstudien, praktische Tipps, Zahnmedizin-Bildung aus Opole.',
            keywords: 'Dr Nowosielski Blog, Zahnmedizin Fallstudien, Implantologie Blog, Endodontie Blog',
        },
        ua: {
            title: 'Блог д-ра Новосельського | Mikrostomart Ополе',
            description: 'Блог д-ра Марціна Новосельського — імплантолог та мікроскопічний ендодонт. Клінічні випадки, поради, освіта зі стоматології з Ополе.',
            keywords: 'блог стоматолога, новосельський, клінічні випадки, мікроскопічна ендодонтія',
        },
    },

    // ───────── /rezerwacja ─────────
    '/rezerwacja': {
        pl: {
            title: 'Rezerwacja online | Umów wizytę u dentysty - Mikrostomart',
            description: 'Umów wizytę u dentysty w Opolu online. Wybierz specjalistę, datę i godzinę. Szybka rezerwacja w gabinecie Mikrostomart.',
            keywords: 'rezerwacja dentysta opole, umów wizytę online opole, wizyta stomatolog opole, mikrostomart rezerwacja',
        },
        en: {
            title: 'Online Booking | Book Dental Appointment - Mikrostomart',
            description: 'Book a dental appointment in Opole, Poland online. Choose specialist, date and time. Quick booking at Mikrostomart clinic.',
            keywords: 'book dentist Opole, online dental booking, dental appointment Poland, Mikrostomart booking',
        },
        de: {
            title: 'Online-Termin | Zahnarzttermin buchen - Mikrostomart',
            description: 'Zahnarzttermin in Opole, Polen online buchen. Spezialist, Datum und Uhrzeit wählen. Schnelle Buchung bei Mikrostomart.',
            keywords: 'Zahnarzt Termin Opole, Online Termin Zahnarzt, Zahnarzttermin Polen, Mikrostomart Termin',
        },
        ua: {
            title: 'Онлайн запис | Запис до стоматолога - Mikrostomart',
            description: 'Запишіться до стоматолога в Ополе, Польща онлайн. Виберіть спеціаліста, дату та час. Швидкий запис в клініку Mikrostomart.',
            keywords: 'запис стоматолог Ополе, онлайн запис, запис до стоматолога Польща, mikrostomart запис',
        },
    },
};
