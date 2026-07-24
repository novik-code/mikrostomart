import type { GatingRule } from "./comparatorTypes";

export const GATING_RULES_ALL: GatingRule[] = [
    // ═══ ESTETYKA ═══
    {
        id: "smile_brux", comparatorId: "smile_upgrade", answers: { bruxism: "yes" }, effects: [
            { methodId: "bonding_smile", scoreDelta: -15, badge: "Przy bruksizmie żywotność bondingu jest zwykle krótsza; w praktyce łączy się go z szyną nocną." },
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
            { methodId: "bonding_full", scoreDelta: -10, badge: "Przy bruksizmie często stosuje się dodatkowo szynę nocną." },
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
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Przy zaawansowanych starciach często stosuje się odbudowy pełnego pokrycia." },
            { methodId: "crown_brux", scoreDelta: 10 },
        ]
    },
    {
        id: "wear_no_splint", comparatorId: "bruxism_wear", answers: { splint_ok: "no" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Bez szyny trwałość odbudowy przy bruksizmie jest zwykle wyraźnie krótsza." },
            { methodId: "veneer_brux", scoreDelta: -8, badge: "Bez szyny trwałość licówek przy bruksizmie jest zwykle wyraźnie krótsza." },
        ]
    },

    // ═══ BRAKI ZĘBOWE ═══
    {
        id: "missing_healthy", comparatorId: "missing_tooth", answers: { neighbors: "healthy" }, effects: [
            { methodId: "bridge", scoreDelta: -12, badge: "Most wymaga oszlifowania zębów sąsiednich — przy zdrowych filarach to istotny kompromis." },
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
            { methodId: "implant_immediate", scoreDelta: -20, badge: "Przy aktywnej infekcji implantacji natychmiastowej zwykle się nie wykonuje." },
            { methodId: "implant_delayed", scoreDelta: 10 },
        ]
    },
    {
        id: "implant_bone_bad", comparatorId: "implant_timing", answers: { bone: "deficient" }, effects: [
            { methodId: "implant_delayed", scoreDelta: 8 },
            { methodId: "implant_immediate", scoreDelta: -15, badge: "Przy niedoborze kości typowo wykonuje się implantację odroczoną z augmentacją." },
        ]
    },
    {
        id: "bridge_healthy_abut", comparatorId: "bridge_types", answers: { abutment: "healthy" }, effects: [
            { methodId: "bridge_on_teeth", scoreDelta: -12, badge: "Most wymaga oszlifowania zębów sąsiednich — przy zdrowych filarach to istotny kompromis." },
        ]
    },
    {
        id: "bridge_no_bone", comparatorId: "bridge_types", answers: { bone_b: "no" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Brak kości ogranicza opcje implantologiczne." },
            { methodId: "bridge_on_implants", scoreDelta: -15, badge: "Brak kości ogranicza opcje implantologiczne." },
        ]
    },
    {
        id: "denture_temp", comparatorId: "denture_types", answers: { duration_d: "temp" }, effects: [
            { methodId: "denture_acrylic", scoreDelta: 12, badge: "Proteza akrylowa często pełni rolę rozwiązania tymczasowego." },
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
            { methodId: "full_denture", scoreDelta: -10, badge: "Przy luźnej protezie zaopatrzenie na implantach zwykle znacząco poprawia stabilność." },
        ]
    },
    {
        id: "full_no_surgery", comparatorId: "full_denture", answers: { surgery_ok: "no" }, effects: [
            { methodId: "overdenture", scoreDelta: -20, badge: "Overdenture wiąże się z zabiegiem chirurgicznym." },
        ]
    },
    {
        id: "onlay_endo", comparatorId: "onlay_vs_crown", answers: { endo_done: "yes" }, effects: [
            { methodId: "crown_rebuild", scoreDelta: 10 },
            { methodId: "onlay", scoreDelta: -8, badge: "Po leczeniu kanałowym korona zapewnia pełniejsze pokrycie i ochronę tkanek zęba." },
        ]
    },
    {
        id: "onlay_brux", comparatorId: "onlay_vs_crown", answers: { bruxism_o: "yes" }, effects: [
            { methodId: "onlay", scoreDelta: -8, badge: "Przy bruksizmie korona wiąże się z mniejszym ryzykiem uszkodzenia niż onlay." },
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
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "W zębach bocznych po leczeniu kanałowym korona zmniejsza ryzyko pęknięcia." },
        ]
    },

    // ═══ KANAŁOWE ═══
    {
        id: "endo_hopeless", comparatorId: "endo_vs_extract", answers: { tooth_state: "hopeless" }, effects: [
            { methodId: "endo", scoreDelta: -25, badge: "Przy tak rozległym zniszczeniu leczenie kanałowe zwykle nie jest już możliwe." },
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
            { methodId: "endo_1visit", scoreDelta: -15, badge: "Przy ropniu dezynfekcję zwykle prowadzi się przez wkładkę leczniczą (2 wizyty)." },
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
            { methodId: "filling_post_endo", scoreDelta: -8, badge: "W zębach bocznych po leczeniu kanałowym zamiast wypełnienia zwykle stosuje się koronę." },
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
            { methodId: "scaling", scoreDelta: -10, badge: "Głębokie kieszonki zwykle przekraczają zasięg samego skalingu." },
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
            { methodId: "hygiene_instruct", scoreDelta: -10, badge: "Kieszonki powyżej 6 mm zwykle przekraczają zasięg metod zamkniętych." },
        ]
    },
    {
        id: "sens_severe", comparatorId: "sensitivity", answers: { intensity: "severe" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Przy silnej nadwrażliwości sama pasta zwykle nie daje wystarczającego efektu." },
            { methodId: "laser_sensitivity", scoreDelta: 10 },
        ]
    },
    {
        id: "sens_tried_paste", comparatorId: "sensitivity", answers: { tried_paste: "yes_not" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Skoro pasta nie przyniosła efektu, zwykle sięga się po metody gabinetowe." },
            { methodId: "varnish_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: 8 },
        ]
    },

    // ═══ CHIRURGIA ═══
    {
        id: "extract_impacted", comparatorId: "extraction_type", answers: { tooth_visible: "no" }, effects: [
            { methodId: "extract_simple", scoreDelta: -25, badge: "Ząb zatrzymany usuwa się metodą chirurgiczną, nie prostą." },
            { methodId: "extract_surgical", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_frequent", comparatorId: "wisdom_teeth", answers: { symptoms_w: "frequent" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -20, badge: "Częste dolegliwości to typowa sytuacja, w której rozważa się usunięcie ósemki." },
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
            { methodId: "wisdom_keep", scoreDelta: -15, badge: "Próchnica ósemki lub zęba sąsiedniego to częsty powód decyzji o usunięciu." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_little_bone", comparatorId: "sinus_lift", answers: { bone_height: "little" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -15, badge: "Przy tej wysokości kości zwykle wykonuje się podniesienie metodą otwartą." },
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
            { methodId: "irrigator", scoreDelta: 10, badge: "Irygator dobrze sprawdza się przy mostach i implantach." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "brux_severe", comparatorId: "bruxism_guard", answers: { symptoms_br: "severe" }, effects: [
            { methodId: "no_guard", scoreDelta: -25, badge: "Nieleczony nasilony bruksizm wiąże się z ryzykiem pęknięć i uszkodzeń zębów." },
            { methodId: "splint_guard", scoreDelta: 10 },
        ]
    },
    {
        id: "brux_wear_visible", comparatorId: "bruxism_guard", answers: { wear_visible: "yes" }, effects: [
            { methodId: "no_guard", scoreDelta: -15, badge: "Widoczne starcia wskazują na aktywny bruksizm; typowym postępowaniem jest szyna." },
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
            { methodId: "baby_filling", scoreDelta: -20, badge: "Przy ropniu samo wypełnienie zwykle nie rozwiązuje problemu." },
            { methodId: "baby_extraction", scoreDelta: 12 },
        ]
    },
    {
        id: "baby_soon", comparatorId: "baby_tooth_caries", answers: { exchange: "soon" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -10, badge: "Przy bliskiej wymianie zęba leczenie miazgi często nie przynosi już korzyści." },
            { methodId: "baby_extraction", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_difficult", comparatorId: "baby_tooth_caries", answers: { cooperation: "difficult" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -8, badge: "Pulpotomię zwykle wykonuje się u spokojnie współpracującego dziecka." },
        ]
    },

    // ═══ NOWE REGUŁY (tabela decyzji klinicznych 2026-07-24) ═══
    {
        id: "smile_scope_few", comparatorId: "smile_upgrade", answers: { scope: "few" }, effects: [
            { methodId: "veneer_porc_smile", scoreDelta: -10, badge: "Przy zmianie 1–2 zębów pełny protokół licówek zwykle nie jest konieczny — często rozważa się bonding." },
            { methodId: "bonding_smile", scoreDelta: 8 },
        ]
    },
    {
        id: "smile_scope_full", comparatorId: "smile_upgrade", answers: { scope: "full" }, effects: [
            { methodId: "crown_smile", scoreDelta: -10, badge: "Korony na całym łuku oznaczają rozległe szlifowanie; zwykle rozważa się mniej inwazyjne opcje." },
            { methodId: "veneer_porc_smile", scoreDelta: 10 },
        ]
    },
    {
        id: "veneer_scope_many", comparatorId: "veneer_type", answers: { scope_v: "many" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -10, badge: "Przy metamorfozie wielu zębów kompozyt wymaga częstszego serwisu; zwykle rozważa się porcelanę." },
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
            { methodId: "bonding_mask", scoreDelta: -12, badge: "Przy stłoczeniach często brakuje miejsca na materiał — możliwości maskowania są ograniczone." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_both", comparatorId: "straighten_vs_mask", answers: { problem_s: "both" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -10, badge: "Przy współistniejących stłoczeniach możliwości maskowania bywają ograniczone." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_cause", comparatorId: "straighten_vs_mask", answers: { cause: "cause" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -8, badge: "Bonding i licówki poprawiają wygląd, ale nie zmieniają pozycji zębów." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "diastema_other", comparatorId: "diastema", answers: { other_issues: "yes" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -8, badge: "Samo zamknięcie diastemy nie koryguje ustawienia pozostałych zębów." },
            { methodId: "ortho_dia", scoreDelta: 10 },
        ]
    },
    {
        id: "bruxism_wear_many", comparatorId: "bruxism_wear", answers: { tooth_count_w: "many" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: 8 },
            { methodId: "crown_brux", scoreDelta: -8, badge: "Korony na 8+ zębach to rozległe szlifowanie; często rozważa się najpierw odbudowy addytywne." },
        ]
    },
    {
        id: "missing_front", comparatorId: "missing_tooth", answers: { location: "front" }, effects: [
            { methodId: "partial_denture", scoreDelta: -10, badge: "W strefie uśmiechu klamry protezy częściowej są zwykle widoczne przy mówieniu i uśmiechu." },
            { methodId: "implant", scoreDelta: 8 },
        ]
    },
    {
        id: "implant_zone_aesthetic", comparatorId: "implant_timing", answers: { zone: "aesthetic" }, effects: [
            { methodId: "implant_immediate", scoreDelta: 6 },
            { methodId: "implant_delayed", scoreDelta: -4, badge: "W strefie uśmiechu implant odroczony oznacza zwykle dłuższy czas z zębem tymczasowym." },
        ]
    },
    {
        id: "bridge_gap_one", comparatorId: "bridge_types", answers: { gap_count: "one" }, effects: [
            { methodId: "bridge_on_implants", scoreDelta: -12, badge: "Przy braku jednego zęba zwykle wystarcza pojedynczy implant zamiast mostu." },
            { methodId: "implant", scoreDelta: 10 },
        ]
    },
    {
        id: "bridge_gap_more", comparatorId: "bridge_types", answers: { gap_count: "more" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Przy braku 4+ zębów pojedynczy implant z koroną zwykle nie uzupełni całej przerwy." },
            { methodId: "bridge_on_teeth", scoreDelta: -5, badge: "Przy długiej przerwie most na zębach ma duży rozstaw filarów, co zwykle mocniej je obciąża." },
            { methodId: "bridge_on_implants", scoreDelta: 10 },
        ]
    },
    {
        id: "denture_many", comparatorId: "denture_types", answers: { missing_count_d: "many" }, effects: [
            { methodId: "denture_flexible", scoreDelta: -12, badge: "Przy braku 4+ zębów proteza elastyczna daje zwykle za małą stabilność i podparcie." },
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
            { methodId: "full_denture", scoreDelta: -10, badge: "Dolna proteza całkowita trzyma się zwykle słabiej — w żuchwie nie działa efekt przyssania." },
            { methodId: "overdenture", scoreDelta: 10 },
        ]
    },
    {
        id: "onlay_walls_few", comparatorId: "onlay_vs_crown", answers: { walls: "two_less" }, effects: [
            { methodId: "onlay", scoreDelta: -15, badge: "Przy 1–2 zachowanych ścianach cienkie ściany pod onlayem są zwykle narażone na pęknięcie." },
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
            { methodId: "re_endo", scoreDelta: -12, badge: "Przy trudnej anatomii lub złamanym instrumencie powtórne endo bywa mniej przewidywalne." },
            { methodId: "resection", scoreDelta: 10 },
        ]
    },
    {
        id: "post_endo_little", comparatorId: "post_endo_rebuild", answers: { tissue_loss: "little" }, effects: [
            { methodId: "filling_post_endo", scoreDelta: -15, badge: "Przy 1–2 ścianach ząb po endo jest kruchy — samo wypełnienie zwykle nie wystarcza." },
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
            { methodId: "hygiene_instruct", scoreDelta: -15, badge: "Przy zaawansowanej utracie kości sama higienizacja zwykle nie wystarcza." },
            { methodId: "curettage_open", scoreDelta: 10 },
        ]
    },
    {
        id: "gum_bone_none", comparatorId: "gum_treatment", answers: { bone_loss_g: "none" }, effects: [
            { methodId: "curettage_open", scoreDelta: -10, badge: "Bez utraty kości na RTG kiretażu otwartego zwykle się nie wykonuje." },
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
            { methodId: "curettage_open", scoreDelta: -5, badge: "Po kiretażu otwartym efekt w dużej mierze zależy od codziennej higieny domowej." },
        ]
    },
    {
        id: "sens_post_scaling", comparatorId: "sensitivity", answers: { cause_s: "post_scaling" }, effects: [
            { methodId: "varnish_sensitivity", scoreDelta: 10, badge: "Po skalingu lub wybielaniu nadwrażliwość jest zwykle przejściowa — lakier daje szybką ulgę." },
            { methodId: "paste_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: -5, badge: "Nadwrażliwość po skalingu lub wybielaniu często ustępuje po prostszych metodach." },
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
            { methodId: "extract_simple", scoreDelta: -10, badge: "Przy zagiętych lub kruchych korzeniach ekstrakcja prosta często przechodzi śródzabiegowo w chirurgiczną." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "extract_inflammation", comparatorId: "extraction_type", answers: { inflammation: "yes" }, effects: [
            { methodId: "extract_simple", scoreDelta: -5, badge: "Przy ostrym stanie zapalnym znieczulenie działa zwykle słabiej; termin zabiegu ustala się indywidualnie." },
            { methodId: "extract_surgical", scoreDelta: -5, badge: "Ostry stan zapalny zwiększa zwykle ryzyko powikłań gojenia; zabieg bywa poprzedzany leczeniem farmakologicznym." },
        ]
    },
    {
        id: "sinus_with_enough", comparatorId: "sinus_lift", answers: { implant_plan: "with", bone_height: "enough" }, effects: [
            { methodId: "sinus_closed", scoreDelta: 10 },
            { methodId: "sinus_open", scoreDelta: -8, badge: "Sinus otwarty to zwykle osobny zabieg — implant osadza się typowo po ok. 6 miesiącach gojenia." },
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
            { methodId: "brush_manual", scoreDelta: -8, badge: "Przy niepewnej technice manualna zwykle czyści mniej dokładnie niż elektryczna czy soniczna." },
        ]
    },
    {
        id: "brush_technique_good", comparatorId: "toothbrush", answers: { technique: "good" }, effects: [
            { methodId: "brush_manual", scoreDelta: 8 },
        ]
    },
    {
        id: "inter_limited_dex", comparatorId: "interdental", answers: { dexterity: "limited" }, effects: [
            { methodId: "floss", scoreDelta: -10, badge: "Przy ograniczonej zręczności nić bywa trudna — szczoteczki międzyzębowe są zwykle łatwiejsze." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "sealant_under6", comparatorId: "sealant_vs_fluoride", answers: { age_child: "under_6" }, effects: [
            { methodId: "sealant", scoreDelta: -12, badge: "Poniżej 6 lat stałe trzonowce zwykle jeszcze się nie wyrzynęły; lakowanie typowo się odracza." },
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
            { methodId: "fluoride_home", scoreDelta: -10, badge: "Poniżej 3 lat dzieci często połykają pastę — w domu zaleca się śladową ilość, a dawkę dodatkowego fluoru łatwiej kontrolować w gabinecie." },
            { methodId: "fluoride_office", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_impacted", comparatorId: "wisdom_teeth", answers: { position_w: "impacted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Ósemka zatrzymana w kości wymaga okresowej kontroli RTG; przy objawach lub zmianach zwykle rozważa się usunięcie." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_deep", comparatorId: "baby_tooth_caries", answers: { depth: "deep" }, effects: [
            { methodId: "baby_filling", scoreDelta: -12, badge: "Przy próchnicy sięgającej miazgi zwykle rozważa się leczenie miazgi, nie samo wypełnienie." },
            { methodId: "baby_pulpotomy", scoreDelta: 10 },
        ]
    },
    {
        id: "crown_comp_severe", comparatorId: "crown_vs_composite", answers: { destruction: "severe" }, effects: [
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "Przy utracie ponad połowy korony zęba kompozyt częściej pęka; typowo rozważa się koronę." },
            { methodId: "crown_rebuild", scoreDelta: 8 },
        ]
    },
    {
        id: "sens_paste_helped", comparatorId: "sensitivity", answers: { tried_paste: "yes_helped" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: 10, badge: "Jeśli pasta przynosi efekt, często kontynuuje się ją jako pierwszą linię postępowania." },
        ]
    },
    {
        id: "extract_partial", comparatorId: "extraction_type", answers: { tooth_visible: "partial" }, effects: [
            { methodId: "extract_simple", scoreDelta: -10, badge: "Przy zębie częściowo wyrżniętym często potrzebny jest dostęp chirurgiczny." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "brush_receding", comparatorId: "toothbrush", answers: { gums: "receding" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "Przy recesjach dziąseł zbyt mocne szczotkowanie manualne może pogłębiać ubytki przy szyjkach." },
        ]
    },
    {
        id: "brux_unwilling", comparatorId: "bruxism_guard", answers: { willing_br: "no" }, effects: [
            { methodId: "splint_guard", scoreDelta: -10, badge: "Szyna chroni tylko wtedy, gdy jest noszona; bez tego jej skuteczność jest ograniczona." },
        ]
    },
];
