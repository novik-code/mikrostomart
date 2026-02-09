import type { GatingRule } from "./comparatorTypes";

export const GATING_RULES_ALL: GatingRule[] = [
    // ═══ ESTETYKA ═══
    {
        id: "smile_brux", comparatorId: "smile_upgrade", answers: { bruxism: "yes" }, effects: [
            { methodId: "bonding_smile", scoreDelta: -15, badge: "Bruksizm skraca żywotność bondingu — szyna nocna obowiązkowa." },
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
            { methodId: "whitening", scoreDelta: -20, badge: "Wybielanie nie zmienia kształtu zęba." },
        ]
    },
    {
        id: "veneer_brux", comparatorId: "veneer_type", answers: { bruxism_v: "yes" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -15, badge: "Bruksizm skraca żywotność licówek kompozytowych." },
        ]
    },
    {
        id: "bonding_many", comparatorId: "bonding_scope", answers: { scope_b: "many" }, effects: [
            { methodId: "bonding_spot", scoreDelta: -20, badge: "Bonding punktowy nie nadaje się do 4+ zębów." },
            { methodId: "bonding_full", scoreDelta: 10 },
        ]
    },
    {
        id: "bonding_brux_scope", comparatorId: "bonding_scope", answers: { bruxism_b: "yes" }, effects: [
            { methodId: "bonding_full", scoreDelta: -10, badge: "Bruksizm — rozważ szynę nocną." },
        ]
    },
    {
        id: "align_fast", comparatorId: "straighten_vs_mask", answers: { patience: "fast" }, effects: [
            { methodId: "aligners", scoreDelta: -15, badge: "Ortodoncja wymaga min. 6 miesięcy." },
            { methodId: "bonding_mask", scoreDelta: 10 },
        ]
    },
    {
        id: "dia_large", comparatorId: "diastema", answers: { gap_size: "large" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -15, badge: "Duża diastema: bonding może wyglądać nienaturalnie." },
            { methodId: "ortho_dia", scoreDelta: 8 },
        ]
    },
    {
        id: "wear_severe", comparatorId: "bruxism_wear", answers: { wear_level: "severe" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Zaawansowane starcia mogą wymagać pełnego pokrycia." },
            { methodId: "crown_brux", scoreDelta: 10 },
        ]
    },
    {
        id: "wear_no_splint", comparatorId: "bruxism_wear", answers: { splint_ok: "no" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Bez szyny efekt odbudowy będzie krótkotrwały." },
            { methodId: "veneer_brux", scoreDelta: -8, badge: "Licówki bez szyny mają większe ryzyko pęknięcia." },
        ]
    },

    // ═══ BRAKI ZĘBOWE ═══
    {
        id: "missing_healthy", comparatorId: "missing_tooth", answers: { neighbors: "healthy" }, effects: [
            { methodId: "bridge", scoreDelta: -12, badge: "Szkoda szlifować zdrowe sąsiednie zęby pod most." },
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
            { methodId: "implant_immediate", scoreDelta: -20, badge: "Infekcja wyklucza implant natychmiastowy." },
            { methodId: "implant_delayed", scoreDelta: 10 },
        ]
    },
    {
        id: "implant_bone_bad", comparatorId: "implant_timing", answers: { bone: "deficient" }, effects: [
            { methodId: "implant_immediate", scoreDelta: -15, badge: "Brak kości — implant odroczony z augmentacją." },
        ]
    },
    {
        id: "bridge_healthy_abut", comparatorId: "bridge_types", answers: { abutment: "healthy" }, effects: [
            { methodId: "bridge_on_teeth", scoreDelta: -12, badge: "Zdrowe filary — szkoda szlifować pod most." },
        ]
    },
    {
        id: "bridge_no_bone", comparatorId: "bridge_types", answers: { bone_b: "no" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Brak kości ogranicza opcje implantologiczne." },
            { methodId: "bridge_on_implants", scoreDelta: -15 },
        ]
    },
    {
        id: "denture_temp", comparatorId: "denture_types", answers: { duration_d: "temp" }, effects: [
            { methodId: "denture_acrylic", scoreDelta: 12, badge: "Akrylowa: idealna jako tymczasowa." },
            { methodId: "denture_skeletal", scoreDelta: -5 },
        ]
    },
    {
        id: "denture_aesthetics", comparatorId: "denture_types", answers: { aesthetics_d: "critical" }, effects: [
            { methodId: "denture_flexible", scoreDelta: 10 },
            { methodId: "denture_acrylic", scoreDelta: -5, badge: "Akrylowa: metalowe klamry widoczne." },
        ]
    },
    {
        id: "full_loose", comparatorId: "full_denture", answers: { stability: "loose" }, effects: [
            { methodId: "overdenture", scoreDelta: 15 },
            { methodId: "full_denture", scoreDelta: -10, badge: "Luźna proteza — implanty drastycznie poprawią komfort." },
        ]
    },
    {
        id: "full_no_surgery", comparatorId: "full_denture", answers: { surgery_ok: "no" }, effects: [
            { methodId: "overdenture", scoreDelta: -20, badge: "Overdenture wymaga zabiegu chirurgicznego." },
        ]
    },
    {
        id: "onlay_endo", comparatorId: "onlay_vs_crown", answers: { endo_done: "yes" }, effects: [
            { methodId: "crown_rebuild", scoreDelta: 10 },
            { methodId: "onlay", scoreDelta: -8, badge: "Ząb po endo — korona daje lepszą ochronę." },
        ]
    },
    {
        id: "onlay_brux", comparatorId: "onlay_vs_crown", answers: { bruxism_o: "yes" }, effects: [
            { methodId: "onlay", scoreDelta: -8, badge: "Bruksizm: korona bezpieczniejsza." },
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
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "Ząb boczny po endo — korona chroni przed pęknięciem." },
        ]
    },

    // ═══ KANAŁOWE ═══
    {
        id: "endo_hopeless", comparatorId: "endo_vs_extract", answers: { tooth_state: "hopeless" }, effects: [
            { methodId: "endo", scoreDelta: -25, badge: "Ząb nie nadaje się do leczenia — ekstrakcja wskazana." },
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
            { methodId: "re_endo", scoreDelta: -15, badge: "Wkład w kanale uniemożliwia rewizję od góry." },
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
            { methodId: "endo_1visit", scoreDelta: -15, badge: "Ropień — dezynfekcja wymaga wkładki (2 wizyty)." },
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
            { methodId: "filling_post_endo", scoreDelta: -8, badge: "Ząb boczny po endo — korona zalecana." },
        ]
    },
    {
        id: "post_endo_brux", comparatorId: "post_endo_rebuild", answers: { bruxism_pe: "yes" }, effects: [
            { methodId: "post_crown", scoreDelta: 8 },
            { methodId: "filling_post_endo", scoreDelta: -10, badge: "Bruksizm: wypełnienie na zębie po endo to ryzyko pęknięcia." },
        ]
    },

    // ═══ PERIODONTOLOGIA ═══
    {
        id: "hyg_deep", comparatorId: "hygiene_methods", answers: { pockets: "deep" }, effects: [
            { methodId: "scaling", scoreDelta: -10, badge: "Głębokie kieszonki wymagają kiretażu." },
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
            { methodId: "airflow", scoreDelta: 10, badge: "AIRFLOW bezpieczny dla implantów." },
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
            { methodId: "hygiene_instruct", scoreDelta: -10, badge: "Kieszonki >6 mm wymagają interwencji chirurgicznej." },
        ]
    },
    {
        id: "sens_severe", comparatorId: "sensitivity", answers: { intensity: "severe" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Silna nadwrażliwość — pasta nie wystarczy." },
            { methodId: "laser_sensitivity", scoreDelta: 10 },
        ]
    },
    {
        id: "sens_tried_paste", comparatorId: "sensitivity", answers: { tried_paste: "yes_not" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Pasta nie pomogła — potrzebna interwencja gabinetowa." },
            { methodId: "varnish_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: 8 },
        ]
    },

    // ═══ CHIRURGIA ═══
    {
        id: "extract_impacted", comparatorId: "extraction_type", answers: { tooth_visible: "no" }, effects: [
            { methodId: "extract_simple", scoreDelta: -25, badge: "Ząb zatrzymany — konieczna ekstrakcja chirurgiczna." },
            { methodId: "extract_surgical", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_frequent", comparatorId: "wisdom_teeth", answers: { symptoms_w: "frequent" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -20, badge: "Częste problemy — wskazanie do ekstrakcji." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_tilted", comparatorId: "wisdom_teeth", answers: { position_w: "tilted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Ukośna ósemka — napiera na sąsiedni ząb." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_caries", comparatorId: "wisdom_teeth", answers: { caries_w: "yes" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -15, badge: "Próchnica ósemki lub sąsiada — ekstrakcja wskazana." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_little_bone", comparatorId: "sinus_lift", answers: { bone_height: "little" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -15, badge: "Zbyt mało kości na zamknięty — potrzebny otwarty." },
            { methodId: "sinus_open", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_issues", comparatorId: "sinus_lift", answers: { sinus_health: "issues" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -10, badge: "Patologia zatoki — konsultacja laryngologiczna." },
            { methodId: "sinus_open", scoreDelta: -10, badge: "Patologia zatoki — leczenie zatoki przed augmentacją." },
        ]
    },

    // ═══ PROFILAKTYKA ═══
    {
        id: "brush_sensitive", comparatorId: "toothbrush", answers: { gums: "sensitive" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "Wrażliwe dziąsła — soniczna delikatniejsza." },
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
            { methodId: "interdental_brush", scoreDelta: -8, badge: "Ciasne kontakty — szczoteczka może nie wejść." },
        ]
    },
    {
        id: "inter_wide", comparatorId: "interdental", answers: { spaces: "wide" }, effects: [
            { methodId: "interdental_brush", scoreDelta: 12 },
            { methodId: "floss", scoreDelta: -8, badge: "Szerokie przestrzenie — nić za cienka." },
        ]
    },
    {
        id: "inter_prosth", comparatorId: "interdental", answers: { prosthetics_i: "yes" }, effects: [
            { methodId: "irrigator", scoreDelta: 10, badge: "Irygator: idealny do mostów i implantów." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "brux_severe", comparatorId: "bruxism_guard", answers: { symptoms_br: "severe" }, effects: [
            { methodId: "no_guard", scoreDelta: -25, badge: "Silny bruksizm bez szyny prowadzi do pęknięć i utraty zębów." },
            { methodId: "splint_guard", scoreDelta: 10 },
        ]
    },
    {
        id: "brux_wear_visible", comparatorId: "bruxism_guard", answers: { wear_visible: "yes" }, effects: [
            { methodId: "no_guard", scoreDelta: -15, badge: "Widoczne starcia — szyna konieczna." },
        ]
    },

    // ═══ DZIECI ═══
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
            { methodId: "baby_filling", scoreDelta: -20, badge: "Ropień — wypełnienie nie wystarczy." },
            { methodId: "baby_extraction", scoreDelta: 12 },
        ]
    },
    {
        id: "baby_soon", comparatorId: "baby_tooth_caries", answers: { exchange: "soon" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -10, badge: "Wymiana blisko — leczenie kanałowe niekonieczne." },
            { methodId: "baby_extraction", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_difficult", comparatorId: "baby_tooth_caries", answers: { cooperation: "difficult" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -8, badge: "Trudna współpraca: pulpotomia wymaga spokojnego dziecka." },
        ]
    },
];
