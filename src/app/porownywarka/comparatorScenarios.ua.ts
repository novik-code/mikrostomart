import type { Comparator } from "./comparatorTypes";

export const COMPARATORS_UA: Comparator[] = [
    // ═══ ЕСТЕТИКА ═══
    {
        id: "smile_upgrade", categoryId: "estetyka",
        title: "Перетворення посмішки", subtitle: "Відбілювання vs бондинг vs вініри vs коронки",
        icon: "😁", color: "#a855f7", methodIds: ["whitening", "bonding_smile", "veneer_porc_smile", "crown_smile"],
        questions: [
            {
                id: "goal", label: "Що ви хочете змінити?", options: [
                    { value: "color", label: "Тільки колір (світліший)", emoji: "🎨" },
                    { value: "shape", label: "Форму та пропорції", emoji: "📐" },
                    { value: "both", label: "Колір і форму", emoji: "✨" },
                ]
            },
            {
                id: "scope", label: "Скільки зубів стосується зміна?", options: [
                    { value: "few", label: "1–2 зуби", emoji: "1️⃣" },
                    { value: "medium", label: "4–6 зубів", emoji: "🔢" },
                    { value: "full", label: "8–10 (вся дуга)", emoji: "😁" },
                ]
            },
            {
                id: "bruxism", label: "Ви стискаєте/скрипите зубами?", options: [
                    { value: "no", label: "Ні / не знаю", emoji: "😊" },
                    { value: "yes", label: "Так, маю бруксизм", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "veneer_type", categoryId: "estetyka",
        title: "Вініри: композит vs порцеляна", subtitle: "Швидкість vs довговічність",
        icon: "💎", color: "#a855f7", methodIds: ["veneer_comp_type", "veneer_porc_type"],
        questions: [
            {
                id: "scope_v", label: "Скільки зубів плануєте?", options: [
                    { value: "few", label: "1–3 зуби", emoji: "1️⃣" },
                    { value: "many", label: "4–10 зубів", emoji: "🔢" },
                ]
            },
            {
                id: "priority_v", label: "Що важливіше?", options: [
                    { value: "speed", label: "Швидкість виконання", emoji: "⚡" },
                    { value: "longevity", label: "Довговічність", emoji: "🏰" },
                ]
            },
            {
                id: "bruxism_v", label: "Бруксизм?", options: [
                    { value: "no", label: "Ні", emoji: "😊" },
                    { value: "yes", label: "Так", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "bonding_scope", categoryId: "estetyka",
        title: "Бондинг: точковий vs full arch", subtitle: "1–2 зуби vs 6–10 зубів",
        icon: "🖌️", color: "#10b981", methodIds: ["bonding_spot", "bonding_full"],
        questions: [
            {
                id: "problem_b", label: "Яку проблему хочете вирішити?", options: [
                    { value: "chip", label: "Відкол / злам", emoji: "💔" },
                    { value: "gap", label: "Діастема / проміжки", emoji: "↔️" },
                    { value: "shape", label: "Форма / пропорції", emoji: "📐" },
                ]
            },
            {
                id: "scope_b", label: "Скільки зубів потребують корекції?", options: [
                    { value: "few", label: "1–2 зуби", emoji: "1️⃣" },
                    { value: "many", label: "4–10 зубів", emoji: "🔢" },
                ]
            },
            {
                id: "bruxism_b", label: "Бруксизм?", options: [
                    { value: "no", label: "Ні", emoji: "😊" },
                    { value: "yes", label: "Так", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "straighten_vs_mask", categoryId: "estetyka",
        title: "Вирівнювання vs маскування", subtitle: "Ортодонтія (елайнери) vs бондинг/вініри",
        icon: "🔄", color: "#06b6d4", methodIds: ["aligners", "bonding_mask"],
        questions: [
            {
                id: "problem_s", label: "Що вас турбує?", options: [
                    { value: "crowding", label: "Скупченість / ротації", emoji: "🔀" },
                    { value: "gaps", label: "Проміжки / діастеми", emoji: "↔️" },
                    { value: "both", label: "І те, і інше", emoji: "🔄" },
                ]
            },
            {
                id: "patience", label: "Скільки часу готові витратити?", options: [
                    { value: "fast", label: "Хочу результат за дні/тижні", emoji: "⚡" },
                    { value: "wait", label: "Можу чекати місяці", emoji: "⏳" },
                ]
            },
            {
                id: "cause", label: "Лікувати причину чи наслідок?", options: [
                    { value: "cause", label: "Причину — рух зубів", emoji: "🎯" },
                    { value: "effect", label: "Наслідок — швидка зміна вигляду", emoji: "🎭" },
                ]
            },
        ],
    },
    {
        id: "diastema", categoryId: "estetyka",
        title: "Діастема — як закрити?", subtitle: "Бондинг vs ортодонтія vs вініри",
        icon: "↔️", color: "#f59e0b", methodIds: ["bonding_dia", "ortho_dia", "veneer_dia"],
        questions: [
            {
                id: "gap_size", label: "Наскільки велика щілина?", options: [
                    { value: "small", label: "Мала (<2 мм)", emoji: "📏" },
                    { value: "medium", label: "Середня (2–3 мм)", emoji: "📐" },
                    { value: "large", label: "Велика (>3 мм)", emoji: "↔️" },
                ]
            },
            {
                id: "other_issues", label: "Є інші нерівності?", options: [
                    { value: "no", label: "Ні, тільки діастема", emoji: "✅" },
                    { value: "yes", label: "Так, інші нерівності теж", emoji: "🔀" },
                ]
            },
            {
                id: "speed_d", label: "Як швидко хочете результат?", options: [
                    { value: "asap", label: "Якнайшвидше", emoji: "⚡" },
                    { value: "can_wait", label: "Можу почекати", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "bruxism_wear", categoryId: "estetyka",
        title: "Стирання / бруксизм", subtitle: "Шина + відбудови vs вініри vs коронки",
        icon: "😬", color: "#ef4444", methodIds: ["splint_rebuild", "veneer_brux", "crown_brux"],
        questions: [
            {
                id: "wear_level", label: "Ступінь стирання?", options: [
                    { value: "mild", label: "Раннє (легке вкорочення країв)", emoji: "🟡" },
                    { value: "moderate", label: "Помірне (помітна втрата тканин)", emoji: "🟠" },
                    { value: "severe", label: "Виражене (зуби короткі, плоскі)", emoji: "🔴" },
                ]
            },
            {
                id: "tooth_count_w", label: "Скільки зубів потребують відбудови?", options: [
                    { value: "few", label: "1–4 зуби", emoji: "1️⃣" },
                    { value: "many", label: "8+ зубів", emoji: "🔢" },
                ]
            },
            {
                id: "splint_ok", label: "Чи погодитеся на нічну шину?", options: [
                    { value: "yes", label: "Так, без проблем", emoji: "✅" },
                    { value: "no", label: "Краще б без неї", emoji: "❌" },
                ]
            },
        ],
    },

    // ═══ ВІДСУТНІ ЗУБИ ═══
    {
        id: "missing_tooth", categoryId: "braki",
        title: "Відсутній зуб", subtitle: "Імплант vs міст vs протез",
        icon: "🦷", color: "#38bdf8", methodIds: ["implant", "bridge", "partial_denture"],
        questions: [
            {
                id: "location", label: "Де відсутній зуб?", options: [
                    { value: "front", label: "Зона посмішки (1–5)", emoji: "😁" },
                    { value: "back", label: "Бічні зуби (6–8)", emoji: "🔨" },
                ]
            },
            {
                id: "count", label: "Скільки зубів відсутні?", options: [
                    { value: "one", label: "1 зуб", emoji: "1️⃣" },
                    { value: "few", label: "2–3 зуби", emoji: "🔢" },
                    { value: "many", label: "4+ зубів", emoji: "📊" },
                ]
            },
            {
                id: "neighbors", label: "Стан сусідніх зубів?", options: [
                    { value: "healthy", label: "Здорові, без пломб", emoji: "✅" },
                    { value: "restored", label: "З пломбами або коронками", emoji: "🔧" },
                ]
            },
        ],
    },
    {
        id: "implant_timing", categoryId: "braki",
        title: "Імплант: негайний vs відтермінований", subtitle: "Відразу після видалення vs після загоєння",
        icon: "⏱️", color: "#38bdf8", methodIds: ["implant_immediate", "implant_delayed"],
        questions: [
            {
                id: "infection", label: "Чи є запалення / абсцес?", options: [
                    { value: "no", label: "Ні, зуб спокійний", emoji: "✅" },
                    { value: "yes", label: "Так, є інфекція", emoji: "🔴" },
                ]
            },
            {
                id: "zone", label: "Де знаходиться зуб?", options: [
                    { value: "aesthetic", label: "Зона посмішки", emoji: "😁" },
                    { value: "posterior", label: "Бічні зуби", emoji: "🔨" },
                ]
            },
            {
                id: "bone", label: "Що каже лікар про кістку?", options: [
                    { value: "good", label: "Достатня кістка", emoji: "💪" },
                    { value: "deficient", label: "Дефіцит кістки / аугментація", emoji: "📉" },
                ]
            },
        ],
    },
    {
        id: "bridge_types", categoryId: "braki",
        title: "Фіксоване заміщення", subtitle: "Імплант+коронка vs міст на зубах vs міст на імплантах",
        icon: "🌉", color: "#f59e0b", methodIds: ["implant", "bridge_on_teeth", "bridge_on_implants"],
        questions: [
            {
                id: "gap_count", label: "Скільки зубів поряд відсутні?", options: [
                    { value: "one", label: "1 зуб", emoji: "1️⃣" },
                    { value: "two_three", label: "2–3 зуби", emoji: "🔢" },
                    { value: "more", label: "4+ зубів", emoji: "📊" },
                ]
            },
            {
                id: "abutment", label: "Стан опорних зубів?", options: [
                    { value: "healthy", label: "Здорові", emoji: "✅" },
                    { value: "restored", label: "З коронками/великими пломбами", emoji: "🔧" },
                ]
            },
            {
                id: "bone_b", label: "Достатня кістка для імплантів?", options: [
                    { value: "yes", label: "Так", emoji: "💪" },
                    { value: "no", label: "Ні / не знаю", emoji: "❓" },
                ]
            },
        ],
    },
    {
        id: "denture_types", categoryId: "braki",
        title: "Частковий протез — який тип?", subtitle: "Акриловий vs бюгельний vs гнучкий",
        icon: "⚙️", color: "#10b981", methodIds: ["denture_acrylic", "denture_skeletal", "denture_flexible"],
        questions: [
            {
                id: "missing_count_d", label: "Скільки зубів відсутні?", options: [
                    { value: "few", label: "1–3 зуби", emoji: "1️⃣" },
                    { value: "many", label: "4+ зубів", emoji: "📊" },
                ]
            },
            {
                id: "aesthetics_d", label: "Наскільки важлива естетика?", options: [
                    { value: "critical", label: "Дуже важлива — невидимі кламери", emoji: "💎" },
                    { value: "ok", label: "Приймаю видимі кламери", emoji: "👍" },
                ]
            },
            {
                id: "duration_d", label: "На який термін плануєте протез?", options: [
                    { value: "temp", label: "Тимчасово (перед імплантами)", emoji: "⏳" },
                    { value: "long", label: "Надовго / постійно", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "full_denture", categoryId: "braki",
        title: "Беззубість: протез vs overdenture", subtitle: "Повний протез vs протез на імплантах",
        icon: "🔩", color: "#38bdf8", methodIds: ["full_denture", "overdenture"],
        questions: [
            {
                id: "jaw", label: "Яка щелепа?", options: [
                    { value: "upper", label: "Верхня", emoji: "⬆️" },
                    { value: "lower", label: "Нижня", emoji: "⬇️" },
                ]
            },
            {
                id: "stability", label: "Протез «скаче»?", options: [
                    { value: "stable", label: "Тримається добре", emoji: "✅" },
                    { value: "loose", label: "Вільний, спадає під час їжі", emoji: "😫" },
                ]
            },
            {
                id: "surgery_ok", label: "Чи погоджуєтесь на хірургічну процедуру?", options: [
                    { value: "yes", label: "Так", emoji: "✅" },
                    { value: "no", label: "Ні / боюся", emoji: "❌" },
                ]
            },
        ],
    },
    {
        id: "onlay_vs_crown", categoryId: "braki",
        title: "Онлей vs коронка", subtitle: "Збереження тканин vs повний захист",
        icon: "🧩", color: "#10b981", methodIds: ["onlay", "crown_rebuild"],
        questions: [
            {
                id: "endo_done", label: "Чи був зуб лікований ендодонтично?", options: [
                    { value: "no", label: "Ні — зуб живий", emoji: "💚" },
                    { value: "yes", label: "Так — після ендо", emoji: "🔬" },
                ]
            },
            {
                id: "walls", label: "Скільки стінок коронки збережено?", options: [
                    { value: "three_plus", label: "3–4 стінки", emoji: "🏰" },
                    { value: "two_less", label: "1–2 стінки", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_o", label: "Бруксизм?", options: [
                    { value: "no", label: "Ні", emoji: "😊" },
                    { value: "yes", label: "Так", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "crown_vs_composite", categoryId: "braki",
        title: "Коронка vs композитна відбудова", subtitle: "Сильно зруйнований зуб — що обрати?",
        icon: "👑", color: "#38bdf8", methodIds: ["crown_rebuild", "composite_rebuild"],
        questions: [
            {
                id: "destruction", label: "Наскільки зруйнований зуб?", options: [
                    { value: "moderate", label: "30–50% коронки", emoji: "🟡" },
                    { value: "severe", label: ">50% коронки", emoji: "🔴" },
                ]
            },
            {
                id: "endo_cr", label: "Чи був лікований ендодонтично?", options: [
                    { value: "no", label: "Ні", emoji: "💚" },
                    { value: "yes", label: "Так", emoji: "🔬" },
                ]
            },
            {
                id: "position_cr", label: "Який зуб?", options: [
                    { value: "front", label: "Передній", emoji: "😁" },
                    { value: "back", label: "Бічний (моляр/премоляр)", emoji: "🔨" },
                ]
            },
        ],
    },

    // ═══ КАНАЛИ ═══
    {
        id: "endo_vs_extract", categoryId: "kanalowe",
        title: "Ендо vs видалення + імплант", subtitle: "Рятувати зуб чи замінити?",
        icon: "⚔️", color: "#f59e0b", methodIds: ["endo", "extract_implant"],
        questions: [
            {
                id: "tooth_state", label: "Стан зуба?", options: [
                    { value: "restorable", label: "Можна відновити", emoji: "🔧" },
                    { value: "questionable", label: "Сумнівний прогноз", emoji: "❓" },
                    { value: "hopeless", label: "Не підлягає збереженню", emoji: "⚠️" },
                ]
            },
            {
                id: "strategic", label: "Зуб стратегічно важливий?", options: [
                    { value: "yes", label: "Так (опора, різець, ключова позиція)", emoji: "⭐" },
                    { value: "no", label: "Не заважає плану лікування", emoji: "👍" },
                ]
            },
            {
                id: "time_pref", label: "Швидкість vs довговічність?", options: [
                    { value: "save_time", label: "Хочу швидше — 1–3 візити", emoji: "⚡" },
                    { value: "invest", label: "Інвестую в довговічність — можу чекати", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "retreatment", categoryId: "kanalowe",
        title: "Повторне ендо vs резекція vs видалення", subtitle: "Що коли перше ендо не допомогло?",
        icon: "🔁", color: "#f59e0b", methodIds: ["re_endo", "resection", "extraction_after"],
        questions: [
            {
                id: "previous", label: "Чому перше ендо не допомогло?", options: [
                    { value: "short", label: "Коротке пломбування / пропущений канал", emoji: "📏" },
                    { value: "leakage", label: "Нещільна реставрація, вторинна інфекція", emoji: "💧" },
                    { value: "anatomy", label: "Складна анатомія / зламаний інструмент", emoji: "🔧" },
                ]
            },
            {
                id: "post_present", label: "Чи є штифт у каналі?", options: [
                    { value: "no", label: "Ні — доступ зверху можливий", emoji: "✅" },
                    { value: "yes", label: "Так — не можна видалити", emoji: "🔒" },
                ]
            },
            {
                id: "symptoms_r", label: "Симптоми?", options: [
                    { value: "none", label: "Немає — зміна тільки на рентгені", emoji: "📷" },
                    { value: "mild", label: "Легкий біль, дискомфорт", emoji: "🟡" },
                    { value: "acute", label: "Сильний біль / набряк / абсцес", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "endo_sessions", categoryId: "kanalowe",
        title: "Ендо: 1 візит vs 2 візити", subtitle: "Комфорт vs безпека",
        icon: "📅", color: "#38bdf8", methodIds: ["endo_1visit", "endo_2visit"],
        questions: [
            {
                id: "diagnosis_e", label: "Який діагноз?", options: [
                    { value: "pulpitis", label: "Пульпіт (біль від гарячого/холодного)", emoji: "🔥" },
                    { value: "necrosis", label: "Некроз / зміна на рентгені", emoji: "📷" },
                    { value: "abscess", label: "Абсцес / набряк", emoji: "🔴" },
                ]
            },
            {
                id: "anatomy_e", label: "Анатомія каналів?", options: [
                    { value: "simple", label: "Проста (1–2 канали)", emoji: "📏" },
                    { value: "complex", label: "Складна (3+ каналів, вигини)", emoji: "🔀" },
                ]
            },
            {
                id: "preference_e", label: "Ваша перевага?", options: [
                    { value: "one_done", label: "Одне засідання — і все", emoji: "⚡" },
                    { value: "safe", label: "Краще два коротших візити", emoji: "🛡️" },
                ]
            },
        ],
    },
    {
        id: "post_endo_rebuild", categoryId: "kanalowe",
        title: "Відбудова після ендо", subtitle: "Пломба vs штифт + коронка",
        icon: "🏗️", color: "#10b981", methodIds: ["filling_post_endo", "post_crown"],
        questions: [
            {
                id: "tooth_type_pe", label: "Який зуб?", options: [
                    { value: "front", label: "Передній (різець, ікло)", emoji: "😁" },
                    { value: "back", label: "Бічний (премоляр, моляр)", emoji: "🔨" },
                ]
            },
            {
                id: "tissue_loss", label: "Скільки тканин залишилось?", options: [
                    { value: "plenty", label: "Багато — 3–4 стінки", emoji: "🏰" },
                    { value: "little", label: "Мало — 1–2 стінки", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_pe", label: "Бруксизм?", options: [
                    { value: "no", label: "Ні", emoji: "😊" },
                    { value: "yes", label: "Так", emoji: "😬" },
                ]
            },
        ],
    },

    // ═══ ПАРОДОНТОЛОГІЯ ═══
    {
        id: "hygiene_methods", categoryId: "periodontologia",
        title: "Скейлінг vs AIRFLOW vs кюретаж", subtitle: "Що обрати для каменю та нальоту?",
        icon: "💨", color: "#10b981", methodIds: ["scaling", "airflow", "curettage"],
        questions: [
            {
                id: "pockets", label: "Глибина кишень?", options: [
                    { value: "none", label: "Немає кишень / не знаю", emoji: "❓" },
                    { value: "shallow", label: "До 4 мм", emoji: "🟡" },
                    { value: "deep", label: ">4 мм", emoji: "🔴" },
                ]
            },
            {
                id: "sensitivity_h", label: "Чутливість ясен?", options: [
                    { value: "normal", label: "Нормальна", emoji: "👍" },
                    { value: "sensitive", label: "Дуже чутливі, кровоточать", emoji: "🩸" },
                ]
            },
            {
                id: "implants_h", label: "Маєте імпланти або протезні конструкції?", options: [
                    { value: "no", label: "Ні", emoji: "❌" },
                    { value: "yes", label: "Так", emoji: "✅" },
                ]
            },
        ],
    },
    {
        id: "gum_treatment", categoryId: "periodontologia",
        title: "Лікування ясен — який рівень?", subtitle: "Гігієнізація vs закритий кюретаж vs відкритий",
        icon: "🩺", color: "#10b981", methodIds: ["hygiene_instruct", "curettage_closed", "curettage_open"],
        questions: [
            {
                id: "pockets_g", label: "Глибина кишень?", options: [
                    { value: "up_to_4", label: "До 4 мм", emoji: "🟡" },
                    { value: "4_to_6", label: "4–6 мм", emoji: "🟠" },
                    { value: "over_6", label: ">6 мм", emoji: "🔴" },
                ]
            },
            {
                id: "bone_loss_g", label: "Втрата кістки на рентгені?", options: [
                    { value: "none", label: "Немає / мінімальна", emoji: "✅" },
                    { value: "moderate", label: "Помірна", emoji: "🟠" },
                    { value: "advanced", label: "Виражена", emoji: "🔴" },
                ]
            },
            {
                id: "compliance", label: "Домашня гігієна?", options: [
                    { value: "good", label: "Добра — чищу 2×, користуюсь ниткою", emoji: "⭐" },
                    { value: "average", label: "Середня — чищу, але без нитки", emoji: "👍" },
                ]
            },
        ],
    },
    {
        id: "sensitivity", categoryId: "periodontologia",
        title: "Чутливість зубів", subtitle: "Лак vs лазер vs паста",
        icon: "❄️", color: "#06b6d4", methodIds: ["varnish_sensitivity", "laser_sensitivity", "paste_sensitivity"],
        questions: [
            {
                id: "intensity", label: "Наскільки сильна чутливість?", options: [
                    { value: "mild", label: "Легка — іноді поколює", emoji: "🟡" },
                    { value: "moderate", label: "Помірна — болить від холодного/гарячого", emoji: "🟠" },
                    { value: "severe", label: "Сильна — болить спонтанно", emoji: "🔴" },
                ]
            },
            {
                id: "cause_s", label: "Ймовірна причина?", options: [
                    { value: "recession", label: "Оголені шийки зубів", emoji: "🦷" },
                    { value: "post_scaling", label: "Після скейлінгу / відбілювання", emoji: "🪥" },
                    { value: "unknown", label: "Не знаю", emoji: "❓" },
                ]
            },
            {
                id: "tried_paste", label: "Пробували пасту для чутливих зубів?", options: [
                    { value: "no", label: "Ні", emoji: "❌" },
                    { value: "yes_helped", label: "Так, допомогла", emoji: "✅" },
                    { value: "yes_not", label: "Так, не допомогла", emoji: "😕" },
                ]
            },
        ],
    },

    // ═══ ХІРУРГІЯ ═══
    {
        id: "extraction_type", categoryId: "chirurgia",
        title: "Видалення: просте vs хірургічне", subtitle: "Час загоєння, ризик, підготовка",
        icon: "🦷", color: "#ef4444", methodIds: ["extract_simple", "extract_surgical"],
        questions: [
            {
                id: "tooth_visible", label: "Чи видно зуб?", options: [
                    { value: "yes", label: "Так, повністю прорізаний", emoji: "✅" },
                    { value: "partial", label: "Частково прорізаний", emoji: "🟡" },
                    { value: "no", label: "Ні — ретинований у кістці", emoji: "🔴" },
                ]
            },
            {
                id: "roots_ex", label: "Стан коренів?", options: [
                    { value: "normal", label: "Прямі, один корінь", emoji: "📏" },
                    { value: "complex", label: "Вигнуті, крихкі, кілька коренів", emoji: "🔀" },
                ]
            },
            {
                id: "inflammation", label: "Запалення?", options: [
                    { value: "no", label: "Немає", emoji: "✅" },
                    { value: "yes", label: "Так — набряк / абсцес", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "wisdom_teeth", categoryId: "chirurgia",
        title: "Зуби мудрості: залишити vs видалити", subtitle: "Чекліст показань та протипоказань",
        icon: "🦷", color: "#ef4444", methodIds: ["wisdom_keep", "wisdom_remove"],
        questions: [
            {
                id: "symptoms_w", label: "Чи дає зуб мудрості симптоми?", options: [
                    { value: "none", label: "Ні — сидить спокійно", emoji: "✅" },
                    { value: "occasional", label: "Іноді болить / набрякає", emoji: "🟡" },
                    { value: "frequent", label: "Часті проблеми", emoji: "🔴" },
                ]
            },
            {
                id: "position_w", label: "Позиція зуба мудрості на рентгені?", options: [
                    { value: "erupted", label: "Прорізаний, в оклюзії", emoji: "✅" },
                    { value: "tilted", label: "Похилений, тисне на сусіда", emoji: "↗️" },
                    { value: "impacted", label: "Ретинований у кістці", emoji: "🔒" },
                ]
            },
            {
                id: "caries_w", label: "Карієс зуба мудрості чи сусіда?", options: [
                    { value: "no", label: "Немає", emoji: "✅" },
                    { value: "yes", label: "Так", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "sinus_lift", categoryId: "chirurgia",
        title: "Синус-ліфт: закритий vs відкритий", subtitle: "Підняття дна пазухи перед імплантом",
        icon: "🔼", color: "#38bdf8", methodIds: ["sinus_closed", "sinus_open"],
        questions: [
            {
                id: "bone_height", label: "Скільки залишкової кістки?", options: [
                    { value: "enough", label: "5–7 мм (бракує 1–3 мм)", emoji: "🟡" },
                    { value: "little", label: "<5 мм (великий дефіцит)", emoji: "🔴" },
                ]
            },
            {
                id: "implant_plan", label: "Імплант одночасно?", options: [
                    { value: "with", label: "Так — імплант + синус в одну сесію", emoji: "⚡" },
                    { value: "staged", label: "Ні — спочатку кістка, потім імплант", emoji: "📅" },
                ]
            },
            {
                id: "sinus_health", label: "Стан пазухи?", options: [
                    { value: "healthy", label: "Здорова", emoji: "✅" },
                    { value: "issues", label: "Поліп / хронічне запалення", emoji: "⚠️" },
                ]
            },
        ],
    },

    // ═══ ПРОФІЛАКТИКА ═══
    {
        id: "toothbrush", categoryId: "profilaktyka",
        title: "Щітка: мануальна vs електрична vs звукова", subtitle: "Що чистить найкраще?",
        icon: "🪥", color: "#06b6d4", methodIds: ["brush_manual", "brush_electric", "brush_sonic"],
        questions: [
            {
                id: "gums", label: "Стан ясен?", options: [
                    { value: "healthy", label: "Здорові", emoji: "✅" },
                    { value: "sensitive", label: "Чутливі / кровоточать", emoji: "🩸" },
                    { value: "receding", label: "Рецесії", emoji: "📉" },
                ]
            },
            {
                id: "prosthetics", label: "Маєте імпланти/мости/вініри?", options: [
                    { value: "no", label: "Ні", emoji: "❌" },
                    { value: "yes", label: "Так", emoji: "✅" },
                ]
            },
            {
                id: "technique", label: "Техніка чищення?", options: [
                    { value: "good", label: "Опанована (метод Басса)", emoji: "⭐" },
                    { value: "average", label: "Середня / не знаю", emoji: "🤷" },
                ]
            },
        ],
    },
    {
        id: "interdental", categoryId: "profilaktyka",
        title: "Нитка vs щіточки vs іригатор", subtitle: "Міжзубне чищення — що обрати?",
        icon: "🧵", color: "#06b6d4", methodIds: ["floss", "interdental_brush", "irrigator"],
        questions: [
            {
                id: "spaces", label: "Проміжки між зубами?", options: [
                    { value: "tight", label: "Тісні", emoji: "📏" },
                    { value: "normal", label: "Нормальні", emoji: "👍" },
                    { value: "wide", label: "Широкі (після періо, мости)", emoji: "↔️" },
                ]
            },
            {
                id: "prosthetics_i", label: "Мости, імпланти, брекети?", options: [
                    { value: "no", label: "Ні", emoji: "❌" },
                    { value: "yes", label: "Так", emoji: "✅" },
                ]
            },
            {
                id: "dexterity", label: "Мануальна спритність?", options: [
                    { value: "good", label: "Добра — вмію нитковати", emoji: "👍" },
                    { value: "limited", label: "Обмежена — нитка складна", emoji: "😅" },
                ]
            },
        ],
    },
    {
        id: "bruxism_guard", categoryId: "profilaktyka",
        title: "Бруксизм: шина vs нічого", subtitle: "Ризик стирання та переломів зубів",
        icon: "🛡️", color: "#ef4444", methodIds: ["splint_guard", "no_guard"],
        questions: [
            {
                id: "symptoms_br", label: "Симптоми бруксизму?", options: [
                    { value: "mild", label: "Легка напруженість щелепи вранці", emoji: "🟡" },
                    { value: "moderate", label: "Видиме стирання, головний біль", emoji: "🟠" },
                    { value: "severe", label: "Переломи, виражене стирання, біль СНЩС", emoji: "🔴" },
                ]
            },
            {
                id: "wear_visible", label: "Стирання зубів?", options: [
                    { value: "no", label: "Непомітне", emoji: "✅" },
                    { value: "yes", label: "Так", emoji: "⚠️" },
                ]
            },
            {
                id: "willing_br", label: "Чи будете носити шину на ніч?", options: [
                    { value: "yes", label: "Так, без проблем", emoji: "✅" },
                    { value: "maybe", label: "Спробую", emoji: "🤔" },
                ]
            },
        ],
    },

    // ═══ ДІТИ ═══
    {
        id: "sealant_vs_fluoride", categoryId: "dzieci",
        title: "Герметизація vs фторування vs інфільтрація", subtitle: "Профілактика карієсу у дітей",
        icon: "🛡️", color: "#ec4899", methodIds: ["sealant", "fluoride_varnish", "icon_infiltration"],
        questions: [
            {
                id: "tooth_status", label: "Стан зуба?", options: [
                    { value: "healthy", label: "Здоровий, глибокі фісури", emoji: "✅" },
                    { value: "white_spot", label: "White spot — початок демінералізації", emoji: "⚪" },
                    { value: "general", label: "Загальна профілактика", emoji: "🛡️" },
                ]
            },
            {
                id: "age_child", label: "Вік дитини?", options: [
                    { value: "under_6", label: "До 6 років", emoji: "👶" },
                    { value: "6_12", label: "6–12 років", emoji: "🧒" },
                    { value: "teen", label: "Підліток", emoji: "🧑" },
                ]
            },
            {
                id: "risk_caries", label: "Ризик карієсу?", options: [
                    { value: "low", label: "Низький", emoji: "🟢" },
                    { value: "high", label: "Високий", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "fluoride_method", categoryId: "dzieci",
        title: "Фторування: кабінетне vs домашнє", subtitle: "Догляд, частота, ефективність",
        icon: "💧", color: "#ec4899", methodIds: ["fluoride_office", "fluoride_home"],
        questions: [
            {
                id: "caries_risk_f", label: "Ризик карієсу?", options: [
                    { value: "low", label: "Низький", emoji: "🟢" },
                    { value: "high", label: "Високий (карієс у сім'ї, солодощі)", emoji: "🔴" },
                ]
            },
            {
                id: "age_f", label: "Вік дитини?", options: [
                    { value: "under_3", label: "До 3 років", emoji: "👶" },
                    { value: "over_3", label: "3+ років", emoji: "🧒" },
                ]
            },
            {
                id: "visits_freq", label: "Як часто можете приходити?", options: [
                    { value: "regular", label: "Кожні 3–6 міс.", emoji: "📅" },
                    { value: "rare", label: "Рідко", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "baby_tooth_caries", categoryId: "dzieci",
        title: "Карієс молочного зуба", subtitle: "Пломба vs лікування пульпи vs видалення",
        icon: "🧒", color: "#ec4899", methodIds: ["baby_filling", "baby_pulpotomy", "baby_extraction"],
        questions: [
            {
                id: "depth", label: "Глибина карієсу?", options: [
                    { value: "shallow", label: "Неглибокий/середній — без пульпи", emoji: "🟡" },
                    { value: "deep", label: "Глибокий — близько або у пульпі", emoji: "🟠" },
                    { value: "abscess", label: "Абсцес / нориця", emoji: "🔴" },
                ]
            },
            {
                id: "exchange", label: "Коли зміна на постійний?", options: [
                    { value: "far", label: ">2 роки", emoji: "⏳" },
                    { value: "soon", label: "<1 рік", emoji: "⚡" },
                ]
            },
            {
                id: "cooperation", label: "Співпраця дитини?", options: [
                    { value: "good", label: "Добра — сидить спокійно", emoji: "😊" },
                    { value: "difficult", label: "Складна — плаче, не відкриває рот", emoji: "😢" },
                ]
            },
        ],
    },
];
