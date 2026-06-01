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
            title: 'Естетична стоматологія Ополе, Польща | Вініри, відбілювання',
            description: 'Естетична стоматологія в Ополе, Польща: порцелянові вініри, бондинг, відбілювання зубів, дизайн посмішки DSD. Подивіться метаморфози пацієнтів.',
            keywords: 'естетична стоматологія Ополе, вініри Ополе Польща, відбілювання зубів Ополе, бондинг Ополе, дизайн посмішки Ополе, естетична стоматологія Польща',
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
            title: 'Ортодонтія Ополе, Польща | Елайнери Clear Correct - Mikrostomart',
            description: 'Ортодонтія елайнерами в Ополе, Польща. Clear Correct з 3D-симуляцією, вирівнювання зубів для дорослих і дітей. Перевірте ціни.',
            keywords: 'ортодонтія Ополе, clear correct Ополе, елайнери Ополе Польща, вирівнювання зубів Ополе, ортодонт Ополе, ортодонтія Польща',
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
            title: 'Стоматологічна хірургія Ополе, Польща | Видалення зубів',
            description: 'Стоматологічна хірургія в Ополе, Польща: видалення зубів, вісімки, технологія PRF, регенерація кістки. Досвідчені хірурги.',
            keywords: 'стоматологічна хірургія Ополе, видалення зуба Ополе Польща, вісімки Ополе, prf Ополе, хірург стоматолог Польща',
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
            title: 'Протезування Ополе, Польща | Коронки, мости, протези',
            description: 'Протезування в Ополе, Польща: коронки E.max і цирконієві, мости, протези. Цифровий внутрішньоротовий скан замість зліпків. Сучасні технології.',
            keywords: 'протезування Ополе, коронки Ополе Польща, зубні мости Ополе, протези Ополе, цирконієві коронки Польща',
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
            title: 'Ціни стоматологія Ополе, Польща | Mikrostomart',
            description: 'Актуальні ціни Mikrostomart в Ополе, Польща: консультації, імпланти, лікування каналів, вініри, відбілювання. Прозорі ціни в злотих.',
            keywords: 'ціни стоматолог Ополе, ціна імплантів Ополе Польща, стоматологія Ополе ціни, mikrostomart ціни, стоматологічні ціни Польща',
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
            title: 'Dental Shop Opole, Poland | Oral Hygiene - Mikrostomart',
            description: 'Mikrostomart shop in Opole, Poland: oral hygiene products, toothbrushes, pastes and accessories recommended by our dental clinic team.',
            keywords: 'dental shop Opole, oral hygiene products Poland, dentist recommended toothbrushes, recommended pastes Opole, dental shop Poland',
        },
        de: {
            title: 'Zahnshop | Mundhygiene-Produkte - Mikrostomart',
            description: 'Mikrostomart Shop: Mundhygiene-Produkte, Zahnbürsten, Pasten und Zubehör, empfohlen von Zahnärzten unserer Klinik in Opole.',
            keywords: 'Zahnshop, Mundhygiene Produkte, empfohlene Zahnbürsten, Zahnpasta empfohlen',
        },
        ua: {
            title: 'Стоматологічний магазин Ополе, Польща | Mikrostomart',
            description: 'Магазин Mikrostomart: засоби гігієни порожнини рота, зубні щітки, пасти та аксесуари, рекомендовані стоматологами клініки в Ополе, Польща.',
            keywords: 'стоматологічний магазин Ополе, засоби гігієни Польща, рекомендовані зубні щітки, аксесуари стоматологічні Ополе',
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
            title: 'FAQ — поширені питання | Mikrostomart Ополе, Польща',
            description: 'Відповіді на поширені питання про стоматологічне лікування в Ополе: імпланти, ендодонтія, вініри, ортодонтія, відбілювання та більше.',
            keywords: 'стоматолог faq Ополе, стоматологічні питання Польща, імпланти питання Ополе, ендодонтія faq Польща',
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
            title: 'База знань зі стоматології | Mikrostomart Ополе, Польща',
            description: 'Статті про стоматологію: імпланти, ендодонтія, гігієна, профілактика, ортодонтія. Експертні знання клініки Mikrostomart в Ополе, Польща.',
            keywords: 'база знань стоматологія Польща, статті стоматолог Ополе, імпланти знання, гігієна зубів поради Польща',
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
            title: 'Новини | Стоматологічна клініка Mikrostomart Ополе, Польща',
            description: 'Останні новини Mikrostomart в Ополе, Польща. Стоматологічні поради, новини в послугах, події та акції нашої клініки в Польщі.',
            keywords: 'новини стоматолог Ополе, новини клініки Польща, mikrostomart блог, стоматологічні поради Польща',
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

    // ───────── /zespol/marcin-nowosielski (Batch SEO-2, dedykowane bio Marcina) ─────────
    '/zespol/marcin-nowosielski': {
        pl: {
            title: 'lek. dent. Marcin Nowosielski M.Sc. RWTH | Mikrostomart Opole',
            description: 'Stomatolog Opole — lek. dent. Marcin Nowosielski, M.Sc. RWTH Aachen (2021, drugi w Polsce). Implantologia, endodoncja mikroskopowa, stomatologia laserowa.',
            keywords: 'marcin nowosielski stomatolog opole, marcin nowosielski rwth aachen, implantolog opole, endodonta mikroskopowy opole, marcin nowosielski książka czelej, marcin nowosielski m.sc., stomatologia laserowa opole',
        },
        en: {
            title: 'Marcin Nowosielski DDS, M.Sc. RWTH Aachen | Mikrostomart Opole, Poland',
            description: 'Dentist in Opole, Poland — Marcin Nowosielski, M.Sc. RWTH Aachen (2021, 2nd in Poland). Implantology, microscopic endodontics, laser dentistry.',
            keywords: 'marcin nowosielski dentist, marcin nowosielski rwth aachen, implantologist opole poland, microscopic endodontist opole, marcin nowosielski book, marcin nowosielski m.sc.',
        },
        de: {
            title: 'Marcin Nowosielski M.Sc. RWTH Aachen | Zahnarzt Opole, Polen',
            description: 'Zahnarzt Opole — Marcin Nowosielski, M.Sc. RWTH Aachen (2021, 2. in Polen). Implantologie, mikroskopische Endodontie, Laserzahnmedizin.',
            keywords: 'Marcin Nowosielski Zahnarzt, Marcin Nowosielski RWTH Aachen, Implantologe Opole Polen, mikroskopische Endodontie Opole, Marcin Nowosielski Buch, Marcin Nowosielski M.Sc.',
        },
        ua: {
            title: 'Марцін Новосельський M.Sc. RWTH Aachen | Mikrostomart Ополе, Польща',
            description: 'Стоматолог Ополе — Марцін Новосельський, M.Sc. RWTH Aachen (2021, другий у Польщі). Імплантологія, мікроскопічна ендодонтія, лазерна стоматологія.',
            keywords: 'марцін новосельський стоматолог, марцін новосельський rwth aachen, імплантолог ополе польща, мікроскопічна ендодонтія ополе, марцін новосельський книга',
        },
    },

    // ───────── /zespol/elzbieta-nowosielska (Batch SEO-2, dedykowane bio Eli) ─────────
    '/zespol/elzbieta-nowosielska': {
        pl: {
            title: 'hig. stom. Elżbieta Nowosielska | Mikrostomart Opole',
            description: 'hig. stom. Elżbieta Nowosielska — współwłaścicielka kliniki Mikrostomart w Opolu. Specjalizuje się w profesjonalnej higienizacji, profilaktyce stomatologicznej i edukacji pacjentów.',
            keywords: 'elżbieta nowosielska higienistka, higienistka stomatologiczna opole, higienizacja zębów opole, profilaktyka stomatologiczna opole, mikrostomart elżbieta',
        },
        en: {
            title: 'Elżbieta Nowosielska — Dental Hygienist | Mikrostomart Opole, Poland',
            description: 'Elżbieta Nowosielska — dental hygienist, co-owner of Mikrostomart dental clinic in Opole, Poland. Specialises in professional hygiene, prevention, and patient education.',
            keywords: 'elżbieta nowosielska hygienist, dental hygienist opole poland, professional teeth cleaning opole, dental prevention opole',
        },
        de: {
            title: 'Elżbieta Nowosielska — Dentalhygienikerin | Mikrostomart Opole, Polen',
            description: 'Elżbieta Nowosielska — Dentalhygienikerin, Mitinhaberin der Zahnklinik Mikrostomart in Opole, Polen. Schwerpunkte: professionelle Mundhygiene, Prävention und Patientenedukation.',
            keywords: 'Elżbieta Nowosielska Dentalhygienikerin, Dentalhygienikerin Opole, professionelle Zahnreinigung Opole, Zahnprävention Opole',
        },
        ua: {
            title: 'Ельжбета Новосельська — стоматологічний гігієніст | Mikrostomart Ополе',
            description: 'Ельжбета Новосельська — стоматологічний гігієніст, співвласниця клініки Mikrostomart в Ополе, Польща. Спеціалізується на професійній гігієні, профілактиці та едукації пацієнтів.',
            keywords: 'ельжбета новосельська гігієніст, стоматологічний гігієніст ополе, професійна гігієна ополе, стоматологічна профілактика ополе',
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

    // ───────── /dla-pacjentow-przyjezdnych (H7 international landing) ─────────
    '/dla-pacjentow-przyjezdnych': {
        pl: {
            title: 'Dla pacjentów spoza Opola — Mikrostomart Stomatolog Opole',
            description: 'Klinika Mikrostomart obsługuje pacjentów z całej Polski oraz z Niemiec, Czech, Austrii i Ukrainy. Parking, hotele, języki, niemieckie kasy chorych.',
            keywords: 'dentysta dla pacjentów spoza opola, leczenie stomatologiczne dla przyjezdnych, dentysta z parkingiem opole, klinika z hotelami opole',
        },
        en: {
            title: 'Dentist in Opole, Poland — For International Patients | Mikrostomart',
            description: 'Mikrostomart welcomes patients from across Poland and from Germany, Czech, Austria and Ukraine. Parking, hotels, languages, German insurance reimbursement.',
            keywords: 'dentist Opole Poland for international patients, dental tourism Poland, English speaking dentist Opole, German speaking dentist Poland',
        },
        de: {
            title: 'Zahnarzt in Opole, Polen — für deutsche Patienten | Mikrostomart',
            description: 'Mikrostomart betreut Patienten aus ganz Polen sowie aus Deutschland, Tschechien, Österreich und der Ukraine. Parkplätze, Hotels, Sprachen, Krankenkassen-Erstattung.',
            keywords: 'Zahnarzt Opole für deutsche Patienten, Zahnarzt Polen Krankenkasse, deutschsprachiger Zahnarzt Polen, Zahnbehandlung Polen Erstattung',
        },
        ua: {
            title: 'Стоматолог в Ополе, Польща — для українських пацієнтів | Mikrostomart',
            description: 'Mikrostomart приймає пацієнтів з усієї Польщі, а також з Німеччини, Чехії, Австрії та України. Паркінг, готелі, мови обслуговування.',
            keywords: 'стоматолог Ополе для українців, україномовний стоматолог Польща, стоматологія Польща для іноземців, стоматолог Польща переклад',
        },
    },

    // ───────── /aplikacja (PWA install landing page) ─────────
    '/aplikacja': {
        pl: {
            title: 'Aplikacja Mikrostomart — PWA pacjenta na telefon | Opole',
            description: 'Zainstaluj aplikację Mikrostomart na telefonie: terminy wizyt, czat z recepcją, dokumentacja, push notyfikacje, szybki dostęp do zadatków.',
            keywords: 'aplikacja stomatolog opole, mikrostomart pwa, aplikacja dentysta, panel pacjenta opole, mobilna aplikacja stomatologiczna',
        },
        en: {
            title: 'Mikrostomart App — Patient PWA for Mobile | Opole, Poland',
            description: 'Install the Mikrostomart app on your phone: appointment times, chat with reception, documents, push notifications, fast access to deposits.',
            keywords: 'dental app Opole, Mikrostomart PWA, dentist app Poland, patient portal Opole, mobile dental app',
        },
        de: {
            title: 'Mikrostomart App — Patienten-PWA für Mobil | Opole, Polen',
            description: 'Installieren Sie die Mikrostomart App auf Ihrem Handy: Termine, Chat mit der Rezeption, Dokumente, Push-Benachrichtigungen, Anzahlungen.',
            keywords: 'Zahnarzt App Opole, Mikrostomart PWA, Zahnarzt App Polen, Patientenportal Opole, mobile Zahnarzt App',
        },
        ua: {
            title: 'Додаток Mikrostomart — PWA для пацієнтів | Ополе, Польща',
            description: 'Встановіть додаток Mikrostomart на телефон: візити, чат з реєстратурою, документи, push-сповіщення, швидкий доступ до завдатків.',
            keywords: 'стоматологічний додаток Ополе, Mikrostomart PWA, стоматолог додаток Польща, портал пацієнта Ополе',
        },
    },

    // ───────── /selfie (selfie booth — fun feature) ─────────
    '/selfie': {
        pl: {
            title: 'Selfie Booth | Zrób piękne selfie - Mikrostomart Opole',
            description: 'Selfie Booth Mikrostomart: zrób piękne selfie w naszej klinice w Opolu. 5 stylizowanych poz, MediaPipe face detection, gotowe zdjęcie do zapisania.',
            keywords: 'selfie booth opole, mikrostomart selfie, klinika stomatologiczna selfie, foto opole gabinet',
        },
        en: {
            title: 'Selfie Booth | Take Beautiful Selfies - Mikrostomart Opole',
            description: 'Mikrostomart Selfie Booth: take beautiful selfies at our clinic in Opole, Poland. 5 styled poses, MediaPipe face detection, ready-to-save photo.',
            keywords: 'selfie booth Opole, dental clinic selfie, Mikrostomart selfie, photo booth Opole Poland',
        },
        de: {
            title: 'Selfie Booth | Schöne Selfies - Mikrostomart Opole',
            description: 'Mikrostomart Selfie Booth: machen Sie schöne Selfies in unserer Klinik in Opole, Polen. 5 stilvolle Posen, MediaPipe Gesichtserkennung.',
            keywords: 'Selfie Booth Opole, Zahnklinik Selfie, Mikrostomart Selfie, Fotokabine Opole Polen',
        },
        ua: {
            title: 'Selfie Booth | Гарні селфі - Mikrostomart Ополе, Польща',
            description: 'Selfie Booth Mikrostomart: робіть гарні селфі в нашій клініці в Ополе, Польща. 5 стилізованих поз, MediaPipe детектор обличчя, готове фото.',
            keywords: 'selfie booth Ополе, стоматологічна клініка селфі, Mikrostomart селфі, фотокабіна Ополе Польща',
        },
    },

    // ───────── /symulator (smile simulator — AI Flux Fill Dev) ─────────
    '/symulator': {
        pl: {
            title: 'Symulator uśmiechu AI | Zobacz nowy uśmiech - Mikrostomart',
            description: 'Symulator uśmiechu AI Mikrostomart: prześlij selfie i zobacz jak będzie wyglądał Twój uśmiech po licówkach lub wybielaniu. 4 style: Hollywood, Natural, Soft, Strong.',
            keywords: 'symulator uśmiechu opole, ai uśmiech, podgląd licówek, podgląd wybielania, projektowanie uśmiechu opole',
        },
        en: {
            title: 'AI Smile Simulator | Preview Your New Smile - Mikrostomart',
            description: 'Mikrostomart AI Smile Simulator: upload a selfie and see your smile after veneers or whitening. 4 styles: Hollywood, Natural, Soft, Strong.',
            keywords: 'AI smile simulator Opole, smile preview, veneers preview Poland, whitening preview, smile design Opole',
        },
        de: {
            title: 'KI-Lächeln-Simulator | Neues Lächeln Vorschau - Mikrostomart',
            description: 'Mikrostomart KI-Lächeln-Simulator: Selfie hochladen und Ihr Lächeln nach Veneers oder Bleaching sehen. 4 Stile: Hollywood, Natural, Soft, Strong.',
            keywords: 'KI Lächeln Simulator Opole, Lächeln Vorschau, Veneers Vorschau Polen, Bleaching Vorschau, Smile Design Opole',
        },
        ua: {
            title: 'AI симулятор посмішки | Нова посмішка - Mikrostomart',
            description: 'AI симулятор посмішки Mikrostomart: завантажте селфі і подивіться як виглядатиме посмішка після вінірів або відбілювання. 4 стилі.',
            keywords: 'AI симулятор посмішки Ополе, передперегляд вінірів, передперегляд відбілювання, дизайн посмішки Ополе Польща',
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

    // ───────── /implanty-opole — L-1 local geo page (PL-only, foreign noindex) ─────────
    // Faza L-1 (2026-05-21 NIGHT+1): dedykowany landing dla zapytań geo-targeted
    // ("implant Opole", "implanty zębów Opole cena", "implantolog Opole").
    // Foreign locale URL (/en/implanty-opole etc.) dostają noindex w layout.tsx
    // bo polski slug nie ma intencji organicznej w EN/DE/UA — alternative geo
    // pages dla foreign markets pojawią się w L-2/L-3 (np. /zahnarzt-opole).
    '/implanty-opole': {
        pl: {
            title: 'Implanty zębów Opole — implantolog M.Sc. RWTH Aachen | Mikrostomart',
            description: 'Implanty zębów w Opolu 6000-8000 zł (chirurgia + korona). Implantologia cyfrowa pod kontrolą szablonu chirurgicznego, M.Sc. RWTH Aachen, PRF. Mikrostomart — gabinet w centrum Opola od 2016.',
            keywords: 'implanty opole, implanty zębów opole, implantolog opole, implant zębowy opole cena, implantologia opole, all-on-4 opole, mikrostomart implanty',
        },
        en: {
            title: 'Dental Implants Opole, Poland | Mikrostomart',
            description: 'Dental implants in Opole, Poland 6000-8000 PLN (surgery + crown). Digital implantology with surgical guides, M.Sc. RWTH Aachen specialist.',
            keywords: 'dental implants Opole, implantologist Opole Poland, all-on-4 Opole, Mikrostomart implants',
        },
        de: {
            title: 'Zahnimplantate Opole, Polen | Mikrostomart',
            description: 'Zahnimplantate in Opole, Polen 6000-8000 PLN (Chirurgie + Krone). Digitale Implantologie mit Schablonen, M.Sc. RWTH Aachen Spezialist.',
            keywords: 'Zahnimplantate Opole, Implantologe Opole Polen, All-on-4 Opole, Mikrostomart Implantate',
        },
        ua: {
            title: 'Імпланти зубів Ополе, Польща | Mikrostomart',
            description: 'Імпланти зубів в Ополе, Польща 6000-8000 PLN (хірургія + коронка). Цифрова імплантологія з хірургічними шаблонами, M.Sc. RWTH Aachen.',
            keywords: 'імпланти Ополе, імплантолог Ополе Польща, All-on-4 Ополе, Mikrostomart імпланти',
        },
    },

    // ───────── /leczenie-kanalowe-opole-mikroskop — L-2a (PL-only, foreign noindex) ─────────
    // Specjalistyczna geo page dla endodoncji mikroskopowej — dyscyplina nr 1 Marcina
    // (Curriculum Endodontyczne PTE + ESE + 4 publikacje Magazyn Stomat + LA&HA wykłady).
    '/leczenie-kanalowe-opole-mikroskop': {
        pl: {
            title: 'Leczenie kanałowe Opole mikroskop ZEISS | Endodonta Mikrostomart',
            description: 'Endodoncja mikroskopowa w Opolu pod mikroskopem ZEISS Extaro od 800 zł. Lasery PIPS/SWEEPS, re-endodoncja trudnych przypadków, Curriculum PTE + ESE. Specjalność dr Nowosielskiego.',
            keywords: 'leczenie kanałowe opole, leczenie kanałowe pod mikroskopem opole, endodoncja opole, endodonta opole, leczenie kanałowe opole cena, mikroskop zeiss opole',
        },
        en: {
            title: 'Microscopic Root Canal Treatment Opole | Mikrostomart',
            description: 'Microscopic endodontics in Opole, Poland from 800 PLN. ZEISS Extaro microscope, PIPS/SWEEPS lasers, re-treatment specialist. PTE + ESE curriculum.',
            keywords: 'root canal Opole, microscopic endodontics Opole, endodontist Opole Poland, ZEISS microscope dentist Poland',
        },
        de: {
            title: 'Mikroskopische Wurzelkanalbehandlung Opole | Mikrostomart',
            description: 'Mikroskopische Endodontie in Opole, Polen ab 800 zł. ZEISS Extaro Mikroskop, PIPS/SWEEPS Laser, Re-Endodontie Spezialist.',
            keywords: 'Wurzelkanalbehandlung Opole, mikroskopische Endodontie Opole, Endodontist Polen, ZEISS Mikroskop Zahnarzt',
        },
        ua: {
            title: 'Лікування каналів під мікроскопом Ополе | Mikrostomart',
            description: 'Мікроскопічна ендодонтія в Ополе, Польща від 800 зл. Мікроскоп ZEISS Extaro, лазери PIPS/SWEEPS, повторне лікування.',
            keywords: 'лікування каналів Ополе, ендодонтія Ополе, ендодонтист Ополе Польща, мікроскоп ZEISS стоматолог',
        },
    },

    // ───────── /dentysta-opole-centrum — L-2b (PL-only, foreign noindex) ─────────
    // Broad-scope local landing dla generic queries "dentysta Opole" / "dentysta Opole centrum".
    // Komplementarne do /implanty-opole + /leczenie-kanalowe-opole-mikroskop (specific specialties).
    '/dentysta-opole-centrum': {
        pl: {
            title: 'Dentysta Opole centrum — Mikrostomart | Stomatolog ul. Centralna 33a',
            description: 'Dentysta w centrum Opola od 2016 roku. Pełen zakres usług: konsultacje (od 250 zł), endodoncja, implanty, ortodoncja, higienizacja. Parking pod gabinetem, PKP 15 min.',
            keywords: 'dentysta opole, dentysta opole centrum, stomatolog opole, dentysta centralna opole, mikrostomart opole, gabinet stomatologiczny opole',
        },
        en: {
            title: 'Dentist Opole City Centre | Mikrostomart Dental Clinic',
            description: 'Dentist in Opole city centre since 2016. Full range of services: consultations, endodontics, implants, orthodontics, hygiene. Parking on-site.',
            keywords: 'dentist Opole, dental clinic Opole city centre, Mikrostomart Opole, English-speaking dentist Opole',
        },
        de: {
            title: 'Zahnarzt Opole Stadtzentrum | Mikrostomart Zahnklinik',
            description: 'Zahnarzt im Stadtzentrum von Opole seit 2016. Volles Leistungsspektrum: Beratung, Endodontie, Implantate, Kieferorthopädie, Hygiene. Parkplatz vor Ort.',
            keywords: 'Zahnarzt Opole, Zahnklinik Opole Zentrum, Mikrostomart Opole, deutschsprachiger Zahnarzt Opole',
        },
        ua: {
            title: 'Стоматолог Ополе центр | Стоматологічна клініка Mikrostomart',
            description: 'Стоматолог в центрі Ополе з 2016 року. Повний спектр послуг: консультації, ендодонтія, імпланти, ортодонтія, гігієна. Паркінг на місці.',
            keywords: 'стоматолог Ополе, стоматологічна клініка Ополе центр, Mikrostomart Ополе, україномовний стоматолог Ополе',
        },
    },

    // ───────── /zahnarzt-opole — C (DE-indexed; PL/EN/UA noindex) ─────────
    // Dedykowany geo-landing pod niemiecki rynek (DACH dental tourism). Indeksowany
    // tylko w DE; pozostałe locale noindex (robots w layout.tsx). areaServed DACH.
    '/zahnarzt-opole': {
        pl: {
            title: 'Zahnarzt Opole — Mikrostomart | Dentysta dla pacjentów z Niemiec',
            description: 'Klinika stomatologiczna w Opolu dla niemieckojęzycznych pacjentów. Implanty, endodoncja pod mikroskopem, estetyka. Obsługa po niemiecku, parking, rachunki do refundacji.',
            keywords: 'zahnarzt opole, dentysta dla niemców opole, mikrostomart',
        },
        en: {
            title: 'Zahnarzt Opole — Mikrostomart | Dental Clinic for German Patients',
            description: 'Dental clinic in Opole, Poland for German-speaking patients. Implants, microscope endodontics, aesthetics. German-speaking service, parking, invoices for reimbursement.',
            keywords: 'Zahnarzt Opole, German dentist Opole, Mikrostomart',
        },
        de: {
            title: 'Zahnarzt Opole, Polen — Mikrostomart | Implantate, Wurzelkanal, Ästhetik',
            description: 'Zahnarzt in Opole für deutschsprachige Patienten: Zahnimplantate, mikroskopische Wurzelkanalbehandlung, Ästhetik. Service auf Deutsch, nahe Sachsen.',
            keywords: 'Zahnarzt Opole, Zahnarzt Polen, Zahnimplantate Opole, Wurzelkanalbehandlung Polen, Zahnbehandlung Polen, deutschsprachiger Zahnarzt Opole, Zahnarzt Opole Deutsch',
        },
        ua: {
            title: 'Zahnarzt Opole — Mikrostomart | Стоматолог для пацієнтів з Німеччини',
            description: 'Стоматологічна клініка в Ополе для німецькомовних пацієнтів. Імпланти, ендодонтія під мікроскопом, естетика. Обслуговування німецькою, паркінг.',
            keywords: 'Zahnarzt Opole, стоматолог Ополе, Mikrostomart',
        },
    },

    // ───────── /dentist-opole — C (EN-indexed; PL/DE/UA noindex) ─────────
    // Dedykowany geo-landing pod anglojęzyczny rynek (international dental tourism).
    // Indeksowany tylko w EN; pozostałe locale noindex. areaServed Opole/Poland/EU.
    '/dentist-opole': {
        pl: {
            title: 'Dentist Opole — Mikrostomart | Dentysta dla pacjentów zagranicznych',
            description: 'Klinika stomatologiczna w Opolu dla pacjentów anglojęzycznych. Implanty, endodoncja pod mikroskopem, estetyka. Obsługa po angielsku, parking, rachunki do refundacji.',
            keywords: 'dentist opole, english dentist opole, mikrostomart',
        },
        en: {
            title: 'Dentist in Opole, Poland — Mikrostomart | English-Speaking Dental Clinic',
            description: 'English-speaking dentist in Opole, Poland: dental implants, microscope root canal treatment, cosmetic dentistry. Parking, near Wrocław airport.',
            keywords: 'dentist Opole, English-speaking dentist Opole, dentist Poland, dental implants Poland, root canal Poland, dental clinic Opole, dental tourism Poland',
        },
        de: {
            title: 'Dentist Opole — Mikrostomart | Englischsprachige Zahnklinik',
            description: 'Englischsprachiger Zahnarzt in Opole, Polen. Implantate, mikroskopische Wurzelkanalbehandlung, Ästhetik. Parkplatz, Rechnungen zur Kostenerstattung.',
            keywords: 'dentist Opole, English dentist Opole, Mikrostomart',
        },
        ua: {
            title: 'Dentist Opole — Mikrostomart | Англомовна стоматологічна клініка',
            description: 'Англомовний стоматолог в Ополе, Польща. Імпланти, ендодонтія під мікроскопом, естетика. Паркінг, рахунки для відшкодування.',
            keywords: 'dentist Opole, english dentist Opole, стоматолог Ополе, Mikrostomart',
        },
    },

    // ───────── /gwarancje — L-4 multi-locale warranty hub ─────────
    // Wszystkie locale indexable (unlike L-1/L-2 PL-only geo pages). Warranty
    // terms to trust signal dla foreign dental tourism — DE/EN szukają gwarancji
    // przed wyborem zagranicznego dentysty. DE locale ma rozszerzoną sekcję
    // Kostenerstattung (UE 2011/24).
    '/gwarancje': {
        pl: {
            title: 'Gwarancje na leczenie stomatologiczne | Mikrostomart Opole',
            description: '5 lat gwarancji na implant, 2 lata na koronę E.max, 1 rok re-endodoncji. Akceptujemy ubezpieczenia prywatne PL + zagraniczne. Rachunki w PL/EN/DE.',
            keywords: 'gwarancja stomatolog opole, gwarancja implant opole, gwarancja korona opole, mikrostomart gwarancje, warunki leczenia opole',
        },
        en: {
            title: 'Dental Treatment Warranties | Mikrostomart Opole, Poland',
            description: '5-year warranty on implants, 2-year on E.max crowns, 1-year free re-treatment. Accept private insurance + international policies. PL/EN/DE invoices.',
            keywords: 'dental warranty Poland, implant warranty Opole, dental insurance Poland, GDPR compliant dentist Opole, Mikrostomart warranty terms',
        },
        de: {
            title: 'Garantien Zahnbehandlung | Mikrostomart Opole, Polen',
            description: '5 Jahre Garantie auf Implantate, 2 Jahre auf E.max Kronen, 1 Jahr kostenlose Wiederbehandlung. Kostenerstattung gesetzliche/private Krankenversicherung.',
            keywords: 'Zahnbehandlung Garantie Polen, Implantat Garantie Opole, Kostenerstattung Zahnarzt Polen, Mikrostomart Garantien',
        },
        ua: {
            title: 'Гарантії стоматологічного лікування | Mikrostomart Ополе',
            description: '5 років гарантії на імплант, 2 роки на коронку E.max, 1 рік повторного лікування. Приймаємо приватне страхування + закордонні поліси.',
            keywords: 'гарантія стоматолог Ополе, гарантія імплант Ополе, страхування стоматолог Польща, Mikrostomart гарантії',
        },
    },
};
