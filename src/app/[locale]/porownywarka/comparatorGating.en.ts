import type { GatingRule } from "./comparatorTypes";

export const GATING_RULES_ALL_EN: GatingRule[] = [
    // ═══ AESTHETICS ═══
    {
        id: "smile_brux", comparatorId: "smile_upgrade", answers: { bruxism: "yes" }, effects: [
            { methodId: "bonding_smile", scoreDelta: -15, badge: "With bruxism, bonding tends to wear down sooner; in practice it is combined with a night guard." },
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
            { methodId: "whitening", scoreDelta: -20, badge: "Whitening does not change tooth shape." },
        ]
    },
    {
        id: "veneer_brux", comparatorId: "veneer_type", answers: { bruxism_v: "yes" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -15, badge: "Bruxism shortens the lifespan of composite veneers." },
        ]
    },
    {
        id: "bonding_many", comparatorId: "bonding_scope", answers: { scope_b: "many" }, effects: [
            { methodId: "bonding_spot", scoreDelta: -20, badge: "Spot bonding is not suitable for 4+ teeth." },
            { methodId: "bonding_full", scoreDelta: 10 },
        ]
    },
    {
        id: "bonding_brux_scope", comparatorId: "bonding_scope", answers: { bruxism_b: "yes" }, effects: [
            { methodId: "bonding_full", scoreDelta: -10, badge: "With bruxism, a night guard is often used alongside treatment." },
        ]
    },
    {
        id: "align_fast", comparatorId: "straighten_vs_mask", answers: { patience: "fast" }, effects: [
            { methodId: "aligners", scoreDelta: -15, badge: "Orthodontics requires at least 6 months." },
            { methodId: "bonding_mask", scoreDelta: 10 },
        ]
    },
    {
        id: "dia_large", comparatorId: "diastema", answers: { gap_size: "large" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -15, badge: "Large diastema: bonding may look unnatural." },
            { methodId: "ortho_dia", scoreDelta: 8 },
        ]
    },
    {
        id: "wear_severe", comparatorId: "bruxism_wear", answers: { wear_level: "severe" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "With advanced wear, full-coverage restorations are often used." },
            { methodId: "crown_brux", scoreDelta: 10 },
        ]
    },
    {
        id: "wear_no_splint", comparatorId: "bruxism_wear", answers: { splint_ok: "no" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Without a night guard, rebuilt teeth tend to wear down much sooner with bruxism." },
            { methodId: "veneer_brux", scoreDelta: -8, badge: "Without a night guard, veneers tend to last visibly shorter with bruxism." },
        ]
    },

    // ═══ MISSING TEETH ═══
    {
        id: "missing_healthy", comparatorId: "missing_tooth", answers: { neighbors: "healthy" }, effects: [
            { methodId: "bridge", scoreDelta: -12, badge: "A bridge requires grinding down the neighbouring teeth — a significant trade-off when they are healthy." },
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
            { methodId: "implant_immediate", scoreDelta: -20, badge: "With an active infection, immediate implant placement is usually not performed." },
            { methodId: "implant_delayed", scoreDelta: 10 },
        ]
    },
    {
        id: "implant_bone_bad", comparatorId: "implant_timing", answers: { bone: "deficient" }, effects: [
            { methodId: "implant_delayed", scoreDelta: 8 },
            { methodId: "implant_immediate", scoreDelta: -15, badge: "With bone deficiency, delayed implant placement with augmentation is the typical approach." },
        ]
    },
    {
        id: "bridge_healthy_abut", comparatorId: "bridge_types", answers: { abutment: "healthy" }, effects: [
            { methodId: "bridge_on_teeth", scoreDelta: -12, badge: "A bridge requires grinding down the neighbouring teeth — a significant trade-off when they are healthy." },
        ]
    },
    {
        id: "bridge_no_bone", comparatorId: "bridge_types", answers: { bone_b: "no" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Bone deficiency limits implant options." },
            { methodId: "bridge_on_implants", scoreDelta: -15, badge: "A lack of bone limits the implant options." },
        ]
    },
    {
        id: "denture_temp", comparatorId: "denture_types", answers: { duration_d: "temp" }, effects: [
            { methodId: "denture_acrylic", scoreDelta: 12, badge: "An acrylic denture often serves as a temporary solution." },
            { methodId: "denture_skeletal", scoreDelta: -5 },
        ]
    },
    {
        id: "denture_aesthetics", comparatorId: "denture_types", answers: { aesthetics_d: "critical" }, effects: [
            { methodId: "denture_flexible", scoreDelta: 10 },
            { methodId: "denture_acrylic", scoreDelta: -5, badge: "Acrylic: metal clasps are visible." },
        ]
    },
    {
        id: "full_loose", comparatorId: "full_denture", answers: { stability: "loose" }, effects: [
            { methodId: "overdenture", scoreDelta: 15 },
            { methodId: "full_denture", scoreDelta: -10, badge: "With a loose denture, implant-supported solutions usually improve stability considerably." },
        ]
    },
    {
        id: "full_no_surgery", comparatorId: "full_denture", answers: { surgery_ok: "no" }, effects: [
            { methodId: "overdenture", scoreDelta: -20, badge: "An overdenture involves a surgical procedure." },
        ]
    },
    {
        id: "onlay_endo", comparatorId: "onlay_vs_crown", answers: { endo_done: "yes" }, effects: [
            { methodId: "crown_rebuild", scoreDelta: 10 },
            { methodId: "onlay", scoreDelta: -8, badge: "After root canal treatment, a crown provides fuller coverage and protection of the tooth." },
        ]
    },
    {
        id: "onlay_brux", comparatorId: "onlay_vs_crown", answers: { bruxism_o: "yes" }, effects: [
            { methodId: "onlay", scoreDelta: -8, badge: "With bruxism, a crown carries a lower risk of damage than an onlay." },
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
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "In back teeth after root canal treatment, a crown reduces the risk of fracture." },
        ]
    },

    // ═══ ROOT CANAL ═══
    {
        id: "endo_hopeless", comparatorId: "endo_vs_extract", answers: { tooth_state: "hopeless" }, effects: [
            { methodId: "endo", scoreDelta: -25, badge: "With damage this extensive, root canal treatment is usually no longer possible." },
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
            { methodId: "re_endo", scoreDelta: -15, badge: "Post in canal prevents retreatment from above." },
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
            { methodId: "endo_1visit", scoreDelta: -15, badge: "With an abscess, disinfection is usually done via a medicated dressing (2 visits)." },
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
            { methodId: "filling_post_endo", scoreDelta: -8, badge: "In back teeth after root canal treatment, a crown is usually used instead of a filling." },
        ]
    },
    {
        id: "post_endo_brux", comparatorId: "post_endo_rebuild", answers: { bruxism_pe: "yes" }, effects: [
            { methodId: "post_crown", scoreDelta: 8 },
            { methodId: "filling_post_endo", scoreDelta: -10, badge: "Bruxism: a filling on an endo-treated tooth risks fracture." },
        ]
    },

    // ═══ PERIODONTOLOGY ═══
    {
        id: "hyg_deep", comparatorId: "hygiene_methods", answers: { pockets: "deep" }, effects: [
            { methodId: "scaling", scoreDelta: -10, badge: "Deep pockets usually go beyond what scaling alone can reach." },
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
            { methodId: "airflow", scoreDelta: 10, badge: "AIRFLOW is safe for implants." },
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
            { methodId: "hygiene_instruct", scoreDelta: -10, badge: "Pockets over 6 mm usually go beyond closed (non-surgical) methods." },
        ]
    },
    {
        id: "sens_severe", comparatorId: "sensitivity", answers: { intensity: "severe" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "With severe sensitivity, toothpaste alone usually does not bring sufficient relief." },
            { methodId: "laser_sensitivity", scoreDelta: 10 },
        ]
    },
    {
        id: "sens_tried_paste", comparatorId: "sensitivity", answers: { tried_paste: "yes_not" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Since toothpaste has not helped, in-office methods are usually the next step." },
            { methodId: "varnish_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: 8 },
        ]
    },

    // ═══ SURGERY ═══
    {
        id: "extract_impacted", comparatorId: "extraction_type", answers: { tooth_visible: "no" }, effects: [
            { methodId: "extract_simple", scoreDelta: -25, badge: "An impacted tooth is removed surgically, not with simple extraction." },
            { methodId: "extract_surgical", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_frequent", comparatorId: "wisdom_teeth", answers: { symptoms_w: "frequent" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -20, badge: "Recurring symptoms are a typical situation in which removing the wisdom tooth is considered." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_tilted", comparatorId: "wisdom_teeth", answers: { position_w: "tilted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Tilted wisdom tooth — pressing on the neighbour." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_caries", comparatorId: "wisdom_teeth", answers: { caries_w: "yes" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -15, badge: "Decay in the wisdom tooth or its neighbour is a common reason to decide on removal." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_little_bone", comparatorId: "sinus_lift", answers: { bone_height: "little" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -15, badge: "At this bone height, the open sinus lift technique is usually used." },
            { methodId: "sinus_open", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_issues", comparatorId: "sinus_lift", answers: { sinus_health: "issues" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -10, badge: "With sinus pathology, an ENT evaluation is usually the first step." },
            { methodId: "sinus_open", scoreDelta: -10, badge: "With sinus pathology, the sinus is usually treated before augmentation." },
        ]
    },

    // ═══ PREVENTION ═══
    {
        id: "brush_sensitive", comparatorId: "toothbrush", answers: { gums: "sensitive" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "Sensitive gums — a sonic brush is gentler." },
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
            { methodId: "interdental_brush", scoreDelta: -8, badge: "Tight contacts — the brush may not fit." },
        ]
    },
    {
        id: "inter_wide", comparatorId: "interdental", answers: { spaces: "wide" }, effects: [
            { methodId: "interdental_brush", scoreDelta: 12 },
            { methodId: "floss", scoreDelta: -8, badge: "Wide spaces — floss is too thin." },
        ]
    },
    {
        id: "inter_prosth", comparatorId: "interdental", answers: { prosthetics_i: "yes" }, effects: [
            { methodId: "irrigator", scoreDelta: 10, badge: "A water flosser works well with bridges and implants." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "brux_severe", comparatorId: "bruxism_guard", answers: { symptoms_br: "severe" }, effects: [
            { methodId: "no_guard", scoreDelta: -25, badge: "Untreated severe bruxism is associated with a risk of cracks and tooth damage." },
            { methodId: "splint_guard", scoreDelta: 10 },
        ]
    },
    {
        id: "brux_wear_visible", comparatorId: "bruxism_guard", answers: { wear_visible: "yes" }, effects: [
            { methodId: "no_guard", scoreDelta: -15, badge: "Visible wear points to active bruxism; a night guard is the typical management." },
        ]
    },

    // ═══ CHILDREN ═══
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
            { methodId: "baby_filling", scoreDelta: -20, badge: "With an abscess, a filling alone usually does not solve the problem." },
            { methodId: "baby_extraction", scoreDelta: 12 },
        ]
    },
    {
        id: "baby_soon", comparatorId: "baby_tooth_caries", answers: { exchange: "soon" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -10, badge: "When the tooth is close to falling out naturally, pulp treatment often no longer brings benefit." },
            { methodId: "baby_extraction", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_difficult", comparatorId: "baby_tooth_caries", answers: { cooperation: "difficult" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -8, badge: "A pulpotomy is generally done when the child can stay calm and cooperative." },
        ]
    },

    // ═══ NOWE REGUŁY (tabela decyzji klinicznych 2026-07-24) ═══
    {
        id: "smile_scope_few", comparatorId: "smile_upgrade", answers: { scope: "few" }, effects: [
            { methodId: "veneer_porc_smile", scoreDelta: -10, badge: "For a change involving 1–2 teeth, a full veneer protocol is usually not necessary — bonding is often considered." },
            { methodId: "bonding_smile", scoreDelta: 8 },
        ]
    },
    {
        id: "smile_scope_full", comparatorId: "smile_upgrade", answers: { scope: "full" }, effects: [
            { methodId: "crown_smile", scoreDelta: -10, badge: "Crowns across the whole arch mean extensive grinding; less invasive options are usually considered." },
            { methodId: "veneer_porc_smile", scoreDelta: 10 },
        ]
    },
    {
        id: "veneer_scope_many", comparatorId: "veneer_type", answers: { scope_v: "many" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -10, badge: "For a makeover of many teeth, composite requires more frequent maintenance; porcelain is usually considered." },
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
            { methodId: "bonding_mask", scoreDelta: -12, badge: "With crowding there is often not enough room for material — masking options are limited." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_both", comparatorId: "straighten_vs_mask", answers: { problem_s: "both" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -10, badge: "With co-existing crowding, masking options can be limited." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_cause", comparatorId: "straighten_vs_mask", answers: { cause: "cause" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -8, badge: "Bonding and veneers improve appearance but do not change the position of the teeth." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "diastema_other", comparatorId: "diastema", answers: { other_issues: "yes" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -8, badge: "Closing the diastema alone does not correct the alignment of the remaining teeth." },
            { methodId: "ortho_dia", scoreDelta: 10 },
        ]
    },
    {
        id: "bruxism_wear_many", comparatorId: "bruxism_wear", answers: { tooth_count_w: "many" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: 8 },
            { methodId: "crown_brux", scoreDelta: -8, badge: "Crowns on 8+ teeth mean extensive grinding; additive restorations are often considered first." },
        ]
    },
    {
        id: "missing_front", comparatorId: "missing_tooth", answers: { location: "front" }, effects: [
            { methodId: "partial_denture", scoreDelta: -10, badge: "In the smile zone, the clasps of a partial denture are usually visible when speaking and smiling." },
            { methodId: "implant", scoreDelta: 8 },
        ]
    },
    {
        id: "implant_zone_aesthetic", comparatorId: "implant_timing", answers: { zone: "aesthetic" }, effects: [
            { methodId: "implant_immediate", scoreDelta: 6 },
            { methodId: "implant_delayed", scoreDelta: -4, badge: "In the smile zone, a delayed implant usually means a longer time with a temporary tooth." },
        ]
    },
    {
        id: "bridge_gap_one", comparatorId: "bridge_types", answers: { gap_count: "one" }, effects: [
            { methodId: "bridge_on_implants", scoreDelta: -12, badge: "For a single missing tooth, a single implant usually suffices instead of a bridge." },
            { methodId: "implant", scoreDelta: 10 },
        ]
    },
    {
        id: "bridge_gap_more", comparatorId: "bridge_types", answers: { gap_count: "more" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "With 4+ missing teeth, a single implant with a crown usually will not fill the whole gap." },
            { methodId: "bridge_on_teeth", scoreDelta: -5, badge: "With a long gap, a tooth-supported bridge has a wide span between abutments, which usually loads them more." },
            { methodId: "bridge_on_implants", scoreDelta: 10 },
        ]
    },
    {
        id: "denture_many", comparatorId: "denture_types", answers: { missing_count_d: "many" }, effects: [
            { methodId: "denture_flexible", scoreDelta: -12, badge: "With 4+ missing teeth, a flexible denture usually provides too little stability and support." },
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
            { methodId: "full_denture", scoreDelta: -10, badge: "A lower complete denture usually holds less well — the suction effect does not work in the lower jaw." },
            { methodId: "overdenture", scoreDelta: 10 },
        ]
    },
    {
        id: "onlay_walls_few", comparatorId: "onlay_vs_crown", answers: { walls: "two_less" }, effects: [
            { methodId: "onlay", scoreDelta: -15, badge: "With 1–2 remaining walls, the thin walls under an onlay are usually at risk of fracture." },
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
            { methodId: "re_endo", scoreDelta: -12, badge: "With difficult anatomy or a fractured instrument, root canal re-treatment can be less predictable." },
            { methodId: "resection", scoreDelta: 10 },
        ]
    },
    {
        id: "post_endo_little", comparatorId: "post_endo_rebuild", answers: { tissue_loss: "little" }, effects: [
            { methodId: "filling_post_endo", scoreDelta: -15, badge: "With 1–2 walls, a tooth after root canal treatment is fragile — a filling alone is usually not enough." },
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
            { methodId: "hygiene_instruct", scoreDelta: -15, badge: "With advanced bone loss, professional cleaning alone is usually not enough." },
            { methodId: "curettage_open", scoreDelta: 10 },
        ]
    },
    {
        id: "gum_bone_none", comparatorId: "gum_treatment", answers: { bone_loss_g: "none" }, effects: [
            { methodId: "curettage_open", scoreDelta: -10, badge: "Without bone loss on the X-ray, open curettage is usually not performed." },
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
            { methodId: "curettage_open", scoreDelta: -5, badge: "After open curettage, the outcome largely depends on daily home hygiene." },
        ]
    },
    {
        id: "sens_post_scaling", comparatorId: "sensitivity", answers: { cause_s: "post_scaling" }, effects: [
            { methodId: "varnish_sensitivity", scoreDelta: 10, badge: "After scaling or whitening, sensitivity is usually temporary — a varnish provides quick relief." },
            { methodId: "paste_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: -5, badge: "Sensitivity after scaling or whitening often resolves with simpler methods." },
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
            { methodId: "extract_simple", scoreDelta: -10, badge: "With curved or brittle roots, a simple extraction often turns into a surgical one during the procedure." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "extract_inflammation", comparatorId: "extraction_type", answers: { inflammation: "yes" }, effects: [
            { methodId: "extract_simple", scoreDelta: -5, badge: "With acute inflammation, anaesthesia usually works less well; the timing of the procedure is set individually." },
            { methodId: "extract_surgical", scoreDelta: -5, badge: "Acute inflammation usually increases the risk of healing complications; the procedure is sometimes preceded by pharmacological treatment." },
        ]
    },
    {
        id: "sinus_with_enough", comparatorId: "sinus_lift", answers: { implant_plan: "with", bone_height: "enough" }, effects: [
            { methodId: "sinus_closed", scoreDelta: 10 },
            { methodId: "sinus_open", scoreDelta: -8, badge: "An open sinus lift is usually a separate procedure — the implant is typically placed after about 6 months of healing." },
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
            { methodId: "brush_manual", scoreDelta: -8, badge: "With uncertain technique, a manual brush usually cleans less thoroughly than an electric or sonic one." },
        ]
    },
    {
        id: "brush_technique_good", comparatorId: "toothbrush", answers: { technique: "good" }, effects: [
            { methodId: "brush_manual", scoreDelta: 8 },
        ]
    },
    {
        id: "inter_limited_dex", comparatorId: "interdental", answers: { dexterity: "limited" }, effects: [
            { methodId: "floss", scoreDelta: -10, badge: "With limited dexterity, floss can be difficult — interdental brushes are usually easier." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "sealant_under6", comparatorId: "sealant_vs_fluoride", answers: { age_child: "under_6" }, effects: [
            { methodId: "sealant", scoreDelta: -12, badge: "Under the age of 6, the permanent molars have usually not erupted yet; sealing is typically postponed." },
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
            { methodId: "fluoride_home", scoreDelta: -10, badge: "Under the age of 3, children often swallow toothpaste — at home a smear amount is recommended, and the dose of additional fluoride is easier to control in the office." },
            { methodId: "fluoride_office", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_impacted", comparatorId: "wisdom_teeth", answers: { position_w: "impacted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "A wisdom tooth impacted in the bone requires periodic X-ray monitoring; with symptoms or changes, removal is usually considered." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_deep", comparatorId: "baby_tooth_caries", answers: { depth: "deep" }, effects: [
            { methodId: "baby_filling", scoreDelta: -12, badge: "When decay reaches the pulp, pulp treatment is usually considered rather than a filling alone." },
            { methodId: "baby_pulpotomy", scoreDelta: 10 },
        ]
    },
    {
        id: "crown_comp_severe", comparatorId: "crown_vs_composite", answers: { destruction: "severe" }, effects: [
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "With the loss of more than half the tooth crown, composite fractures more often; a crown is typically considered." },
            { methodId: "crown_rebuild", scoreDelta: 8 },
        ]
    },
    {
        id: "sens_paste_helped", comparatorId: "sensitivity", answers: { tried_paste: "yes_helped" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: 10, badge: "If the toothpaste is effective, it is often continued as the first line of management." },
        ]
    },
    {
        id: "extract_partial", comparatorId: "extraction_type", answers: { tooth_visible: "partial" }, effects: [
            { methodId: "extract_simple", scoreDelta: -10, badge: "For a partially erupted tooth, surgical access is often needed." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "brush_receding", comparatorId: "toothbrush", answers: { gums: "receding" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "With gum recession, brushing too hard by hand can deepen defects at the tooth necks." },
        ]
    },
    {
        id: "brux_unwilling", comparatorId: "bruxism_guard", answers: { willing_br: "no" }, effects: [
            { methodId: "splint_guard", scoreDelta: -10, badge: "A guard only protects when it is worn; without that, its effectiveness is limited." },
        ]
    },
];
