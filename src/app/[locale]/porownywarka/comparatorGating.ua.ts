import type { GatingRule } from "./comparatorTypes";

export const GATING_RULES_ALL_UA: GatingRule[] = [
    // ═══ ЕСТЕТИКА ═══
    {
        id: "smile_brux", comparatorId: "smile_upgrade", answers: { bruxism: "yes" }, effects: [
            { methodId: "bonding_smile", scoreDelta: -15, badge: "При бруксизмі бондинг зазвичай служить коротше; на практиці його поєднують із нічною шиною." },
            { methodId: "whitening", scoreDelta: -5 },
        ]
    },
    {
        id: "smile_color_only", comparatorId: "smile_upgrade", answers: { goal: "color" }, effects: [
            { methodId: "whitening", scoreDelta: 15 },
            { methodId: "crown_smile", scoreDelta: -10 },
        ]
    },
    {
        id: "smile_shape", comparatorId: "smile_upgrade", answers: { goal: "shape" }, effects: [
            { methodId: "whitening", scoreDelta: -20, badge: "Відбілювання не змінює форму зуба." },
        ]
    },
    {
        id: "veneer_brux", comparatorId: "veneer_type", answers: { bruxism_v: "yes" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -15, badge: "Бруксизм скорочує термін служби композитних вінірів." },
        ]
    },
    {
        id: "bonding_many", comparatorId: "bonding_scope", answers: { scope_b: "many" }, effects: [
            { methodId: "bonding_spot", scoreDelta: -20, badge: "Точковий бондинг не підходить для 4+ зубів." },
            { methodId: "bonding_full", scoreDelta: 10 },
        ]
    },
    {
        id: "bonding_brux_scope", comparatorId: "bonding_scope", answers: { bruxism_b: "yes" }, effects: [
            { methodId: "bonding_full", scoreDelta: -10, badge: "При бруксизмі часто додатково застосовують нічну шину." },
        ]
    },
    {
        id: "align_fast", comparatorId: "straighten_vs_mask", answers: { patience: "fast" }, effects: [
            { methodId: "aligners", scoreDelta: -15, badge: "Ортодонтія потребує мінімум 6 місяців." },
            { methodId: "bonding_mask", scoreDelta: 10 },
        ]
    },
    {
        id: "dia_large", comparatorId: "diastema", answers: { gap_size: "large" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -15, badge: "Велика діастема: бондинг може виглядати неприродно." },
            { methodId: "ortho_dia", scoreDelta: 8 },
        ]
    },
    {
        id: "wear_severe", comparatorId: "bruxism_wear", answers: { wear_level: "severe" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "При вираженому стиранні часто застосовують відновлення з повним покриттям." },
            { methodId: "crown_brux", scoreDelta: 10 },
        ]
    },
    {
        id: "wear_no_splint", comparatorId: "bruxism_wear", answers: { splint_ok: "no" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Без шини довговічність відновлення при бруксизмі зазвичай помітно коротша." },
            { methodId: "veneer_brux", scoreDelta: -8, badge: "Без шини довговічність вінірів при бруксизмі зазвичай помітно коротша." },
        ]
    },

    // ═══ ВІДСУТНІ ЗУБИ ═══
    {
        id: "missing_healthy", comparatorId: "missing_tooth", answers: { neighbors: "healthy" }, effects: [
            { methodId: "bridge", scoreDelta: -12, badge: "Міст потребує обточування сусідніх зубів — при здорових зубах це суттєвий компроміс." },
            { methodId: "implant", scoreDelta: 8 },
        ]
    },
    {
        id: "missing_many", comparatorId: "missing_tooth", answers: { count: "many" }, effects: [
            { methodId: "implant", scoreDelta: -8 },
            { methodId: "partial_denture", scoreDelta: 10 },
        ]
    },
    {
        id: "implant_infection", comparatorId: "implant_timing", answers: { infection: "yes" }, effects: [
            { methodId: "implant_immediate", scoreDelta: -20, badge: "При активній інфекції негайну імплантацію зазвичай не виконують." },
            { methodId: "implant_delayed", scoreDelta: 10 },
        ]
    },
    {
        id: "implant_bone_bad", comparatorId: "implant_timing", answers: { bone: "deficient" }, effects: [
            { methodId: "implant_delayed", scoreDelta: 8 },
            { methodId: "implant_immediate", scoreDelta: -15, badge: "При дефіциті кістки типово виконують відстрочену імплантацію з аугментацією." },
        ]
    },
    {
        id: "bridge_healthy_abut", comparatorId: "bridge_types", answers: { abutment: "healthy" }, effects: [
            { methodId: "bridge_on_teeth", scoreDelta: -12, badge: "Міст потребує обточування сусідніх зубів — при здорових зубах це суттєвий компроміс." },
        ]
    },
    {
        id: "bridge_no_bone", comparatorId: "bridge_types", answers: { bone_b: "no" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Дефіцит кістки обмежує можливості імплантації." },
            { methodId: "bridge_on_implants", scoreDelta: -15, badge: "Дефіцит кістки обмежує імплантологічні опції." },
        ]
    },
    {
        id: "denture_temp", comparatorId: "denture_types", answers: { duration_d: "temp" }, effects: [
            { methodId: "denture_acrylic", scoreDelta: 12, badge: "Акриловий протез часто виконує роль тимчасового рішення." },
            { methodId: "denture_skeletal", scoreDelta: -5 },
        ]
    },
    {
        id: "denture_aesthetics", comparatorId: "denture_types", answers: { aesthetics_d: "critical" }, effects: [
            { methodId: "denture_flexible", scoreDelta: 10 },
            { methodId: "denture_acrylic", scoreDelta: -5, badge: "Акриловий: металеві кламери видимі." },
        ]
    },
    {
        id: "full_loose", comparatorId: "full_denture", answers: { stability: "loose" }, effects: [
            { methodId: "overdenture", scoreDelta: 15 },
            { methodId: "full_denture", scoreDelta: -10, badge: "При нестабільному протезі опора на імплантах зазвичай значно покращує стабільність." },
        ]
    },
    {
        id: "full_no_surgery", comparatorId: "full_denture", answers: { surgery_ok: "no" }, effects: [
            { methodId: "overdenture", scoreDelta: -20, badge: "Овердентура пов'язана з хірургічним втручанням." },
        ]
    },
    {
        id: "onlay_endo", comparatorId: "onlay_vs_crown", answers: { endo_done: "yes" }, effects: [
            { methodId: "crown_rebuild", scoreDelta: 10 },
            { methodId: "onlay", scoreDelta: -8, badge: "Після лікування каналів коронка забезпечує повніше покриття та захист тканин зуба." },
        ]
    },
    {
        id: "onlay_brux", comparatorId: "onlay_vs_crown", answers: { bruxism_o: "yes" }, effects: [
            { methodId: "onlay", scoreDelta: -8, badge: "При бруксизмі коронка пов'язана з меншим ризиком пошкодження, ніж онлей." },
        ]
    },
    {
        id: "crown_moderate", comparatorId: "crown_vs_composite", answers: { destruction: "moderate" }, effects: [
            { methodId: "composite_rebuild", scoreDelta: 10 },
            { methodId: "crown_rebuild", scoreDelta: -5 },
        ]
    },
    {
        id: "crown_endo_back", comparatorId: "crown_vs_composite", answers: { endo_cr: "yes", position_cr: "back" }, effects: [
            { methodId: "crown_rebuild", scoreDelta: 12 },
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "У бічних зубах після лікування каналів коронка зменшує ризик перелому." },
        ]
    },

    // ═══ КАНАЛИ ═══
    {
        id: "endo_hopeless", comparatorId: "endo_vs_extract", answers: { tooth_state: "hopeless" }, effects: [
            { methodId: "endo", scoreDelta: -25, badge: "При такому обсязі руйнування лікування каналів зазвичай уже неможливе." },
            { methodId: "extract_implant", scoreDelta: 10 },
        ]
    },
    {
        id: "endo_strategic", comparatorId: "endo_vs_extract", answers: { strategic: "yes" }, effects: [
            { methodId: "endo", scoreDelta: 12 },
        ]
    },
    {
        id: "retreat_post", comparatorId: "retreatment", answers: { post_present: "yes" }, effects: [
            { methodId: "re_endo", scoreDelta: -15, badge: "Штифт у каналі унеможливлює ревізію зверху." },
            { methodId: "resection", scoreDelta: 10 },
        ]
    },
    {
        id: "retreat_acute", comparatorId: "retreatment", answers: { symptoms_r: "acute" }, effects: [
            { methodId: "extraction_after", scoreDelta: 8 },
        ]
    },
    {
        id: "endo_abscess", comparatorId: "endo_sessions", answers: { diagnosis_e: "abscess" }, effects: [
            { methodId: "endo_1visit", scoreDelta: -15, badge: "При абсцесі дезінфекцію зазвичай проводять через лікувальну вкладку (2 візити)." },
            { methodId: "endo_2visit", scoreDelta: 10 },
        ]
    },
    {
        id: "endo_simple_pulp", comparatorId: "endo_sessions", answers: { diagnosis_e: "pulpitis", anatomy_e: "simple" }, effects: [
            { methodId: "endo_1visit", scoreDelta: 10 },
        ]
    },
    {
        id: "post_endo_back", comparatorId: "post_endo_rebuild", answers: { tooth_type_pe: "back" }, effects: [
            { methodId: "post_crown", scoreDelta: 10 },
            { methodId: "filling_post_endo", scoreDelta: -8, badge: "У бічних зубах після лікування каналів замість пломби зазвичай застосовують коронку." },
        ]
    },
    {
        id: "post_endo_brux", comparatorId: "post_endo_rebuild", answers: { bruxism_pe: "yes" }, effects: [
            { methodId: "post_crown", scoreDelta: 8 },
            { methodId: "filling_post_endo", scoreDelta: -10, badge: "Бруксизм: пломба на зубі після ендо — ризик перелому." },
        ]
    },

    // ═══ ПАРОДОНТОЛОГІЯ ═══
    {
        id: "hyg_deep", comparatorId: "hygiene_methods", answers: { pockets: "deep" }, effects: [
            { methodId: "scaling", scoreDelta: -10, badge: "Глибокі кишені зазвичай виходять за межі можливостей самого скейлінгу." },
            { methodId: "airflow", scoreDelta: -10 },
            { methodId: "curettage", scoreDelta: 15 },
        ]
    },
    {
        id: "hyg_sensitive", comparatorId: "hygiene_methods", answers: { sensitivity_h: "sensitive" }, effects: [
            { methodId: "airflow", scoreDelta: 10 },
            { methodId: "scaling", scoreDelta: -5 },
        ]
    },
    {
        id: "hyg_implants", comparatorId: "hygiene_methods", answers: { implants_h: "yes" }, effects: [
            { methodId: "airflow", scoreDelta: 10, badge: "AIRFLOW безпечний для імплантів." },
        ]
    },
    {
        id: "gum_shallow", comparatorId: "gum_treatment", answers: { pockets_g: "up_to_4" }, effects: [
            { methodId: "hygiene_instruct", scoreDelta: 10 },
            { methodId: "curettage_open", scoreDelta: -15 },
        ]
    },
    {
        id: "gum_deep", comparatorId: "gum_treatment", answers: { pockets_g: "over_6" }, effects: [
            { methodId: "curettage_open", scoreDelta: 12 },
            { methodId: "hygiene_instruct", scoreDelta: -10, badge: "Кишені понад 6 мм зазвичай виходять за межі закритих методів." },
        ]
    },
    {
        id: "sens_severe", comparatorId: "sensitivity", answers: { intensity: "severe" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "При сильній чутливості сама паста зазвичай не дає достатнього ефекту." },
            { methodId: "laser_sensitivity", scoreDelta: 10 },
        ]
    },
    {
        id: "sens_tried_paste", comparatorId: "sensitivity", answers: { tried_paste: "yes_not" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Якщо паста не допомогла, зазвичай переходять до кабінетних методів." },
            { methodId: "varnish_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: 8 },
        ]
    },

    // ═══ ХІРУРГІЯ ═══
    {
        id: "extract_impacted", comparatorId: "extraction_type", answers: { tooth_visible: "no" }, effects: [
            { methodId: "extract_simple", scoreDelta: -25, badge: "Ретинований зуб видаляють хірургічним методом, а не простим." },
            { methodId: "extract_surgical", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_frequent", comparatorId: "wisdom_teeth", answers: { symptoms_w: "frequent" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -20, badge: "Повторювані скарги — типова ситуація, коли розглядають видалення зуба мудрості." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_tilted", comparatorId: "wisdom_teeth", answers: { position_w: "tilted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Похилений зуб мудрості — тисне на сусіда." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_caries", comparatorId: "wisdom_teeth", answers: { caries_w: "yes" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -15, badge: "Карієс зуба мудрості або сусіднього зуба — часта причина рішення про видалення." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_little_bone", comparatorId: "sinus_lift", answers: { bone_height: "little" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -15, badge: "При такій висоті кістки зазвичай виконують відкритий синус-ліфтинг." },
            { methodId: "sinus_open", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_issues", comparatorId: "sinus_lift", answers: { sinus_health: "issues" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -10, badge: "Патологія пазухи — консультація ЛОР." },
            { methodId: "sinus_open", scoreDelta: -10, badge: "Патологія пазухи — лікування пазухи перед аугментацією." },
        ]
    },

    // ═══ ПРОФІЛАКТИКА ═══
    {
        id: "brush_sensitive", comparatorId: "toothbrush", answers: { gums: "sensitive" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "Чутливі ясна — звукова щітка делікатніша." },
        ]
    },
    {
        id: "brush_prosthetics", comparatorId: "toothbrush", answers: { prosthetics: "yes" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 8 },
        ]
    },
    {
        id: "inter_tight", comparatorId: "interdental", answers: { spaces: "tight" }, effects: [
            { methodId: "floss", scoreDelta: 10 },
            { methodId: "interdental_brush", scoreDelta: -8, badge: "Тісні контакти — щіточка може не влізти." },
        ]
    },
    {
        id: "inter_wide", comparatorId: "interdental", answers: { spaces: "wide" }, effects: [
            { methodId: "interdental_brush", scoreDelta: 12 },
            { methodId: "floss", scoreDelta: -8, badge: "Широкі проміжки — нитка занадто тонка." },
        ]
    },
    {
        id: "inter_prosth", comparatorId: "interdental", answers: { prosthetics_i: "yes" }, effects: [
            { methodId: "irrigator", scoreDelta: 10, badge: "Іригатор добре підходить при мостах та імплантах." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "brux_severe", comparatorId: "bruxism_guard", answers: { symptoms_br: "severe" }, effects: [
            { methodId: "no_guard", scoreDelta: -25, badge: "Нелікований виражений бруксизм пов'язаний із ризиком тріщин і пошкоджень зубів." },
            { methodId: "splint_guard", scoreDelta: 10 },
        ]
    },
    {
        id: "brux_wear_visible", comparatorId: "bruxism_guard", answers: { wear_visible: "yes" }, effects: [
            { methodId: "no_guard", scoreDelta: -15, badge: "Видиме стирання вказує на активний бруксизм; типовим підходом є шина." },
        ]
    },

    // ═══ ДІТИ ═══
    {
        id: "child_ws", comparatorId: "sealant_vs_fluoride", answers: { tooth_status: "white_spot" }, effects: [
            { methodId: "icon_infiltration", scoreDelta: 12 },
            { methodId: "sealant", scoreDelta: -5 },
        ]
    },
    {
        id: "child_high_risk", comparatorId: "sealant_vs_fluoride", answers: { risk_caries: "high" }, effects: [
            { methodId: "sealant", scoreDelta: 8 },
            { methodId: "fluoride_varnish", scoreDelta: 5 },
        ]
    },
    {
        id: "fluoride_high", comparatorId: "fluoride_method", answers: { caries_risk_f: "high" }, effects: [
            { methodId: "fluoride_office", scoreDelta: 10 },
        ]
    },
    {
        id: "fluoride_rare", comparatorId: "fluoride_method", answers: { visits_freq: "rare" }, effects: [
            { methodId: "fluoride_home", scoreDelta: 10 },
            { methodId: "fluoride_office", scoreDelta: -5 },
        ]
    },
    {
        id: "baby_abscess", comparatorId: "baby_tooth_caries", answers: { depth: "abscess" }, effects: [
            { methodId: "baby_filling", scoreDelta: -20, badge: "При абсцесі сама пломба зазвичай не вирішує проблеми." },
            { methodId: "baby_extraction", scoreDelta: 12 },
        ]
    },
    {
        id: "baby_soon", comparatorId: "baby_tooth_caries", answers: { exchange: "soon" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -10, badge: "Коли зуб скоро зміниться природно, лікування пульпи часто вже не приносить користі." },
            { methodId: "baby_extraction", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_difficult", comparatorId: "baby_tooth_caries", answers: { cooperation: "difficult" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -8, badge: "Пульпотомію зазвичай виконують у спокійної, готової до співпраці дитини." },
        ]
    },

    // ═══ NOWE REGUŁY (tabela decyzji klinicznych 2026-07-24) ═══
    {
        id: "smile_scope_few", comparatorId: "smile_upgrade", answers: { scope: "few" }, effects: [
            { methodId: "veneer_porc_smile", scoreDelta: -10, badge: "При зміні 1–2 зубів повний протокол вінірів зазвичай не потрібен — часто розглядають бондинг." },
            { methodId: "bonding_smile", scoreDelta: 8 },
        ]
    },
    {
        id: "smile_scope_full", comparatorId: "smile_upgrade", answers: { scope: "full" }, effects: [
            { methodId: "crown_smile", scoreDelta: -10, badge: "Коронки на всій дузі означають значне обточування; зазвичай розглядають менш інвазивні варіанти." },
            { methodId: "veneer_porc_smile", scoreDelta: 10 },
        ]
    },
    {
        id: "veneer_scope_many", comparatorId: "veneer_type", answers: { scope_v: "many" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -10, badge: "При перетворенні багатьох зубів композит потребує частішого обслуговування; зазвичай розглядають порцеляну." },
            { methodId: "veneer_porc_type", scoreDelta: 8 },
        ]
    },
    {
        id: "veneer_scope_few", comparatorId: "veneer_type", answers: { scope_v: "few" }, effects: [
            { methodId: "veneer_porc_type", scoreDelta: -5 },
        ]
    },
    {
        id: "bonding_chip", comparatorId: "bonding_scope", answers: { problem_b: "chip" }, effects: [
            { methodId: "bonding_spot", scoreDelta: 8 },
        ]
    },
    {
        id: "bonding_shape", comparatorId: "bonding_scope", answers: { problem_b: "shape" }, effects: [
            { methodId: "bonding_full", scoreDelta: 5 },
        ]
    },
    {
        id: "straighten_crowding", comparatorId: "straighten_vs_mask", answers: { problem_s: "crowding" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -12, badge: "При скупченості часто бракує місця для матеріалу — можливості маскування обмежені." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_both", comparatorId: "straighten_vs_mask", answers: { problem_s: "both" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -10, badge: "При супутній скупченості можливості маскування бувають обмеженими." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_cause", comparatorId: "straighten_vs_mask", answers: { cause: "cause" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -8, badge: "Бондинг і вініри покращують вигляд, але не змінюють положення зубів." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "diastema_other", comparatorId: "diastema", answers: { other_issues: "yes" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -8, badge: "Саме лише закриття діастеми не виправляє положення інших зубів." },
            { methodId: "ortho_dia", scoreDelta: 10 },
        ]
    },
    {
        id: "bruxism_wear_many", comparatorId: "bruxism_wear", answers: { tooth_count_w: "many" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: 8 },
            { methodId: "crown_brux", scoreDelta: -8, badge: "Коронки на 8+ зубах — це значне обточування; часто спочатку розглядають адитивні відновлення." },
        ]
    },
    {
        id: "missing_front", comparatorId: "missing_tooth", answers: { location: "front" }, effects: [
            { methodId: "partial_denture", scoreDelta: -10, badge: "У зоні усмішки кламери часткового протеза зазвичай помітні під час розмови та усмішки." },
            { methodId: "implant", scoreDelta: 8 },
        ]
    },
    {
        id: "implant_zone_aesthetic", comparatorId: "implant_timing", answers: { zone: "aesthetic" }, effects: [
            { methodId: "implant_immediate", scoreDelta: 6 },
            { methodId: "implant_delayed", scoreDelta: -4, badge: "У зоні усмішки відстрочений імплант зазвичай означає довший час із тимчасовим зубом." },
        ]
    },
    {
        id: "bridge_gap_one", comparatorId: "bridge_types", answers: { gap_count: "one" }, effects: [
            { methodId: "bridge_on_implants", scoreDelta: -12, badge: "При відсутності одного зуба зазвичай достатньо одного імпланта замість мосту." },
            { methodId: "implant", scoreDelta: 10 },
        ]
    },
    {
        id: "bridge_gap_more", comparatorId: "bridge_types", answers: { gap_count: "more" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "При відсутності 4+ зубів один імплант з коронкою зазвичай не заповнить весь проміжок." },
            { methodId: "bridge_on_teeth", scoreDelta: -5, badge: "При довгому проміжку міст на зубах має великий розмах опор, що зазвичай сильніше їх навантажує." },
            { methodId: "bridge_on_implants", scoreDelta: 10 },
        ]
    },
    {
        id: "denture_many", comparatorId: "denture_types", answers: { missing_count_d: "many" }, effects: [
            { methodId: "denture_flexible", scoreDelta: -12, badge: "При відсутності 4+ зубів гнучкий протез зазвичай дає замало стабільності та опори." },
            { methodId: "denture_skeletal", scoreDelta: 10 },
        ]
    },
    {
        id: "denture_few", comparatorId: "denture_types", answers: { missing_count_d: "few" }, effects: [
            { methodId: "denture_flexible", scoreDelta: 8 },
        ]
    },
    {
        id: "full_denture_lower", comparatorId: "full_denture", answers: { jaw: "lower" }, effects: [
            { methodId: "full_denture", scoreDelta: -10, badge: "Нижній повний протез зазвичай тримається гірше — на нижній щелепі не працює ефект присмоктування." },
            { methodId: "overdenture", scoreDelta: 10 },
        ]
    },
    {
        id: "onlay_walls_few", comparatorId: "onlay_vs_crown", answers: { walls: "two_less" }, effects: [
            { methodId: "onlay", scoreDelta: -15, badge: "При 1–2 збережених стінках тонкі стінки під онлеєм зазвичай схильні до тріщин." },
            { methodId: "crown_rebuild", scoreDelta: 10 },
        ]
    },
    {
        id: "onlay_walls_many", comparatorId: "onlay_vs_crown", answers: { walls: "three_plus" }, effects: [
            { methodId: "onlay", scoreDelta: 8 },
        ]
    },
    {
        id: "retreat_short", comparatorId: "retreatment", answers: { previous: "short" }, effects: [
            { methodId: "re_endo", scoreDelta: 10 },
        ]
    },
    {
        id: "retreat_leakage", comparatorId: "retreatment", answers: { previous: "leakage" }, effects: [
            { methodId: "re_endo", scoreDelta: 10 },
        ]
    },
    {
        id: "retreat_anatomy", comparatorId: "retreatment", answers: { previous: "anatomy" }, effects: [
            { methodId: "re_endo", scoreDelta: -12, badge: "При складній анатомії або зламаному інструменті повторне ендодонтичне лікування буває менш передбачуваним." },
            { methodId: "resection", scoreDelta: 10 },
        ]
    },
    {
        id: "post_endo_little", comparatorId: "post_endo_rebuild", answers: { tissue_loss: "little" }, effects: [
            { methodId: "filling_post_endo", scoreDelta: -15, badge: "При 1–2 стінках зуб після ендодонтичного лікування крихкий — самої пломби зазвичай недостатньо." },
            { methodId: "post_crown", scoreDelta: 10 },
        ]
    },
    {
        id: "post_endo_plenty", comparatorId: "post_endo_rebuild", answers: { tissue_loss: "plenty" }, effects: [
            { methodId: "filling_post_endo", scoreDelta: 10 },
        ]
    },
    {
        id: "gum_bone_advanced", comparatorId: "gum_treatment", answers: { bone_loss_g: "advanced" }, effects: [
            { methodId: "hygiene_instruct", scoreDelta: -15, badge: "При вираженій втраті кістки самої професійної гігієни зазвичай недостатньо." },
            { methodId: "curettage_open", scoreDelta: 10 },
        ]
    },
    {
        id: "gum_bone_none", comparatorId: "gum_treatment", answers: { bone_loss_g: "none" }, effects: [
            { methodId: "curettage_open", scoreDelta: -10, badge: "Без втрати кістки на рентгені відкритий кюретаж зазвичай не виконують." },
            { methodId: "hygiene_instruct", scoreDelta: 8 },
        ]
    },
    {
        id: "gum_bone_moderate", comparatorId: "gum_treatment", answers: { bone_loss_g: "moderate" }, effects: [
            { methodId: "curettage_closed", scoreDelta: 8 },
        ]
    },
    {
        id: "gum_compliance_avg", comparatorId: "gum_treatment", answers: { compliance: "average" }, effects: [
            { methodId: "hygiene_instruct", scoreDelta: 8 },
            { methodId: "curettage_open", scoreDelta: -5, badge: "Після відкритого кюретажу результат значною мірою залежить від щоденної домашньої гігієни." },
        ]
    },
    {
        id: "sens_post_scaling", comparatorId: "sensitivity", answers: { cause_s: "post_scaling" }, effects: [
            { methodId: "varnish_sensitivity", scoreDelta: 10, badge: "Після скейлінгу чи відбілювання чутливість зазвичай тимчасова — фторлак дає швидке полегшення." },
            { methodId: "paste_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: -5, badge: "Чутливість після скейлінгу чи відбілювання часто минає після простіших методів." },
        ]
    },
    {
        id: "sens_recession", comparatorId: "sensitivity", answers: { cause_s: "recession" }, effects: [
            { methodId: "varnish_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: 8 },
        ]
    },
    {
        id: "extract_complex_roots", comparatorId: "extraction_type", answers: { roots_ex: "complex" }, effects: [
            { methodId: "extract_simple", scoreDelta: -10, badge: "При зігнутих чи крихких коренях просте видалення часто переходить у хірургічне під час втручання." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "extract_inflammation", comparatorId: "extraction_type", answers: { inflammation: "yes" }, effects: [
            { methodId: "extract_simple", scoreDelta: -5, badge: "При гострому запаленні анестезія зазвичай діє слабше; час втручання визначають індивідуально." },
            { methodId: "extract_surgical", scoreDelta: -5, badge: "Гостре запалення зазвичай підвищує ризик ускладнень загоєння; втручанню іноді передує медикаментозне лікування." },
        ]
    },
    {
        id: "sinus_with_enough", comparatorId: "sinus_lift", answers: { implant_plan: "with", bone_height: "enough" }, effects: [
            { methodId: "sinus_closed", scoreDelta: 10 },
            { methodId: "sinus_open", scoreDelta: -8, badge: "Відкритий синус-ліфтинг — зазвичай окреме втручання; імплант встановлюють типово після приблизно 6 місяців загоєння." },
        ]
    },
    {
        id: "sinus_staged", comparatorId: "sinus_lift", answers: { implant_plan: "staged" }, effects: [
            { methodId: "sinus_open", scoreDelta: 8 },
        ]
    },
    {
        id: "brush_technique_avg", comparatorId: "toothbrush", answers: { technique: "average" }, effects: [
            { methodId: "brush_electric", scoreDelta: 8 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "При невпевненій техніці мануальна щітка зазвичай чистить менш ретельно, ніж електрична чи сонічна." },
        ]
    },
    {
        id: "brush_technique_good", comparatorId: "toothbrush", answers: { technique: "good" }, effects: [
            { methodId: "brush_manual", scoreDelta: 8 },
        ]
    },
    {
        id: "inter_limited_dex", comparatorId: "interdental", answers: { dexterity: "limited" }, effects: [
            { methodId: "floss", scoreDelta: -10, badge: "При обмеженій вправності нитка буває складною — міжзубні щіточки зазвичай простіші." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "sealant_under6", comparatorId: "sealant_vs_fluoride", answers: { age_child: "under_6" }, effects: [
            { methodId: "sealant", scoreDelta: -12, badge: "До 6 років постійні моляри зазвичай ще не прорізалися; герметизацію типово відкладають." },
            { methodId: "fluoride_varnish", scoreDelta: 8 },
        ]
    },
    {
        id: "sealant_6_12", comparatorId: "sealant_vs_fluoride", answers: { age_child: "6_12" }, effects: [
            { methodId: "sealant", scoreDelta: 8 },
        ]
    },
    {
        id: "fluoride_under3", comparatorId: "fluoride_method", answers: { age_f: "under_3" }, effects: [
            { methodId: "fluoride_home", scoreDelta: -10, badge: "До 3 років діти часто ковтають пасту — вдома рекомендують слідову кількість, а дозу додаткового фтору легше контролювати в кабінеті." },
            { methodId: "fluoride_office", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_impacted", comparatorId: "wisdom_teeth", answers: { position_w: "impacted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Зуб мудрості, ретинований у кістці, потребує періодичного рентген-контролю; при симптомах або змінах зазвичай розглядають видалення." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_deep", comparatorId: "baby_tooth_caries", answers: { depth: "deep" }, effects: [
            { methodId: "baby_filling", scoreDelta: -12, badge: "Коли карієс сягає пульпи, зазвичай розглядають лікування пульпи, а не саму лише пломбу." },
            { methodId: "baby_pulpotomy", scoreDelta: 10 },
        ]
    },
    {
        id: "crown_comp_severe", comparatorId: "crown_vs_composite", answers: { destruction: "severe" }, effects: [
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "При втраті понад половини коронки зуба композит частіше тріскається; типово розглядають коронку." },
            { methodId: "crown_rebuild", scoreDelta: 8 },
        ]
    },
    {
        id: "sens_paste_helped", comparatorId: "sensitivity", answers: { tried_paste: "yes_helped" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: 10, badge: "Якщо паста дає ефект, її часто продовжують як першу лінію дій." },
        ]
    },
    {
        id: "extract_partial", comparatorId: "extraction_type", answers: { tooth_visible: "partial" }, effects: [
            { methodId: "extract_simple", scoreDelta: -10, badge: "При частково прорізаному зубі часто потрібен хірургічний доступ." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "brush_receding", comparatorId: "toothbrush", answers: { gums: "receding" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "При рецесіях ясен надто сильне мануальне чищення може поглиблювати дефекти біля шийок зубів." },
        ]
    },
    {
        id: "brux_unwilling", comparatorId: "bruxism_guard", answers: { willing_br: "no" }, effects: [
            { methodId: "splint_guard", scoreDelta: -10, badge: "Шина захищає лише тоді, коли її носять; без цього її ефективність обмежена." },
        ]
    },
];
