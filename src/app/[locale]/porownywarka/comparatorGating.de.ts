import type { GatingRule } from "./comparatorTypes";

export const GATING_RULES_ALL_DE: GatingRule[] = [
    // ═══ ÄSTHETIK ═══
    {
        id: "smile_brux", comparatorId: "smile_upgrade", answers: { bruxism: "yes" }, effects: [
            { methodId: "bonding_smile", scoreDelta: -15, badge: "Bei Bruxismus hält Bonding meist kürzer; in der Praxis wird es mit einer Nachtschiene kombiniert." },
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
            { methodId: "whitening", scoreDelta: -20, badge: "Bleaching ändert nicht die Zahnform." },
        ]
    },
    {
        id: "veneer_brux", comparatorId: "veneer_type", answers: { bruxism_v: "yes" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -15, badge: "Bruxismus verkürzt die Haltbarkeit von Kompositveneers." },
        ]
    },
    {
        id: "bonding_many", comparatorId: "bonding_scope", answers: { scope_b: "many" }, effects: [
            { methodId: "bonding_spot", scoreDelta: -20, badge: "Punktuelles Bonding ist für 4+ Zähne nicht geeignet." },
            { methodId: "bonding_full", scoreDelta: 10 },
        ]
    },
    {
        id: "bonding_brux_scope", comparatorId: "bonding_scope", answers: { bruxism_b: "yes" }, effects: [
            { methodId: "bonding_full", scoreDelta: -10, badge: "Bei Bruxismus wird häufig zusätzlich eine Nachtschiene eingesetzt." },
        ]
    },
    {
        id: "align_fast", comparatorId: "straighten_vs_mask", answers: { patience: "fast" }, effects: [
            { methodId: "aligners", scoreDelta: -15, badge: "Kieferorthopädie benötigt mindestens 6 Monate." },
            { methodId: "bonding_mask", scoreDelta: 10 },
        ]
    },
    {
        id: "dia_large", comparatorId: "diastema", answers: { gap_size: "large" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -15, badge: "Großes Diastema: Bonding kann unnatürlich wirken." },
            { methodId: "ortho_dia", scoreDelta: 8 },
        ]
    },
    {
        id: "wear_severe", comparatorId: "bruxism_wear", answers: { wear_level: "severe" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Bei fortgeschrittener Abrasion kommen häufig Vollkronen zum Einsatz." },
            { methodId: "crown_brux", scoreDelta: 10 },
        ]
    },
    {
        id: "wear_no_splint", comparatorId: "bruxism_wear", answers: { splint_ok: "no" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: -10, badge: "Ohne Schiene ist die Haltbarkeit des Aufbaus bei Bruxismus meist deutlich kürzer." },
            { methodId: "veneer_brux", scoreDelta: -8, badge: "Ohne Schiene ist die Haltbarkeit von Veneers bei Bruxismus meist deutlich kürzer." },
        ]
    },

    // ═══ FEHLENDE ZÄHNE ═══
    {
        id: "missing_healthy", comparatorId: "missing_tooth", answers: { neighbors: "healthy" }, effects: [
            { methodId: "bridge", scoreDelta: -12, badge: "Eine Brücke erfordert das Beschleifen der Nachbarzähne — bei gesunden Zähnen ein erheblicher Kompromiss." },
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
            { methodId: "implant_immediate", scoreDelta: -20, badge: "Bei aktiver Infektion wird eine Sofortimplantation in der Regel nicht durchgeführt." },
            { methodId: "implant_delayed", scoreDelta: 10 },
        ]
    },
    {
        id: "implant_bone_bad", comparatorId: "implant_timing", answers: { bone: "deficient" }, effects: [
            { methodId: "implant_delayed", scoreDelta: 8 },
            { methodId: "implant_immediate", scoreDelta: -15, badge: "Bei Knochenmangel wird in der Regel eine verzögerte Implantation mit Augmentation durchgeführt." },
        ]
    },
    {
        id: "bridge_healthy_abut", comparatorId: "bridge_types", answers: { abutment: "healthy" }, effects: [
            { methodId: "bridge_on_teeth", scoreDelta: -12, badge: "Eine Brücke erfordert das Beschleifen der Nachbarzähne — bei gesunden Zähnen ein erheblicher Kompromiss." },
        ]
    },
    {
        id: "bridge_no_bone", comparatorId: "bridge_types", answers: { bone_b: "no" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Knochenmangel schränkt Implantatoptionen ein." },
            { methodId: "bridge_on_implants", scoreDelta: -15, badge: "Knochenmangel schränkt die Implantatoptionen ein." },
        ]
    },
    {
        id: "denture_temp", comparatorId: "denture_types", answers: { duration_d: "temp" }, effects: [
            { methodId: "denture_acrylic", scoreDelta: 12, badge: "Eine Kunststoffprothese dient häufig als Übergangslösung." },
            { methodId: "denture_skeletal", scoreDelta: -5 },
        ]
    },
    {
        id: "denture_aesthetics", comparatorId: "denture_types", answers: { aesthetics_d: "critical" }, effects: [
            { methodId: "denture_flexible", scoreDelta: 10 },
            { methodId: "denture_acrylic", scoreDelta: -5, badge: "Acryl: Metallklammern sind sichtbar." },
        ]
    },
    {
        id: "full_loose", comparatorId: "full_denture", answers: { stability: "loose" }, effects: [
            { methodId: "overdenture", scoreDelta: 15 },
            { methodId: "full_denture", scoreDelta: -10, badge: "Bei lockerer Prothese verbessert eine implantatgetragene Versorgung die Stabilität in der Regel deutlich." },
        ]
    },
    {
        id: "full_no_surgery", comparatorId: "full_denture", answers: { surgery_ok: "no" }, effects: [
            { methodId: "overdenture", scoreDelta: -20, badge: "Eine Overdenture ist mit einem chirurgischen Eingriff verbunden." },
        ]
    },
    {
        id: "onlay_endo", comparatorId: "onlay_vs_crown", answers: { endo_done: "yes" }, effects: [
            { methodId: "crown_rebuild", scoreDelta: 10 },
            { methodId: "onlay", scoreDelta: -8, badge: "Nach einer Wurzelbehandlung bietet eine Krone eine umfassendere Abdeckung und schützt die Zahnsubstanz." },
        ]
    },
    {
        id: "onlay_brux", comparatorId: "onlay_vs_crown", answers: { bruxism_o: "yes" }, effects: [
            { methodId: "onlay", scoreDelta: -8, badge: "Bei Bruxismus ist das Beschädigungsrisiko mit einer Krone geringer als mit einem Onlay." },
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
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "Bei Seitenzähnen nach Wurzelbehandlung senkt eine Krone das Frakturrisiko." },
        ]
    },

    // ═══ WURZELKANAL ═══
    {
        id: "endo_hopeless", comparatorId: "endo_vs_extract", answers: { tooth_state: "hopeless" }, effects: [
            { methodId: "endo", scoreDelta: -25, badge: "Bei so ausgedehnter Zerstörung ist eine Wurzelbehandlung in der Regel nicht mehr möglich." },
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
            { methodId: "re_endo", scoreDelta: -15, badge: "Stift im Kanal verhindert Revision von oben." },
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
            { methodId: "endo_1visit", scoreDelta: -15, badge: "Bei einem Abszess erfolgt die Desinfektion in der Regel über eine medikamentöse Einlage (2 Sitzungen)." },
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
            { methodId: "filling_post_endo", scoreDelta: -8, badge: "Bei Seitenzähnen nach Wurzelbehandlung wird statt einer Füllung in der Regel eine Krone eingesetzt." },
        ]
    },
    {
        id: "post_endo_brux", comparatorId: "post_endo_rebuild", answers: { bruxism_pe: "yes" }, effects: [
            { methodId: "post_crown", scoreDelta: 8 },
            { methodId: "filling_post_endo", scoreDelta: -10, badge: "Bruxismus: Füllung am Endo-Zahn birgt Bruchgefahr." },
        ]
    },

    // ═══ PARODONTOLOGIE ═══
    {
        id: "hyg_deep", comparatorId: "hygiene_methods", answers: { pockets: "deep" }, effects: [
            { methodId: "scaling", scoreDelta: -10, badge: "Tiefe Taschen gehen meist über die Reichweite der reinen Zahnsteinentfernung hinaus." },
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
            { methodId: "airflow", scoreDelta: 10, badge: "AIRFLOW ist sicher für Implantate." },
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
            { methodId: "hygiene_instruct", scoreDelta: -10, badge: "Taschen über 6 mm gehen in der Regel über geschlossene Verfahren hinaus." },
        ]
    },
    {
        id: "sens_severe", comparatorId: "sensitivity", answers: { intensity: "severe" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Bei starker Empfindlichkeit bringt Zahnpasta allein meist keine ausreichende Linderung." },
            { methodId: "laser_sensitivity", scoreDelta: 10 },
        ]
    },
    {
        id: "sens_tried_paste", comparatorId: "sensitivity", answers: { tried_paste: "yes_not" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: -15, badge: "Da die Zahnpasta nicht geholfen hat, sind Praxismethoden in der Regel der nächste Schritt." },
            { methodId: "varnish_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: 8 },
        ]
    },

    // ═══ CHIRURGIE ═══
    {
        id: "extract_impacted", comparatorId: "extraction_type", answers: { tooth_visible: "no" }, effects: [
            { methodId: "extract_simple", scoreDelta: -25, badge: "Ein retinierter Zahn wird chirurgisch entfernt, nicht mit einfacher Extraktion." },
            { methodId: "extract_surgical", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_frequent", comparatorId: "wisdom_teeth", answers: { symptoms_w: "frequent" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -20, badge: "Wiederkehrende Beschwerden sind eine typische Situation, in der die Entfernung des Weisheitszahns erwogen wird." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "wisdom_tilted", comparatorId: "wisdom_teeth", answers: { position_w: "tilted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Schräger Weisheitszahn — drückt auf den Nachbarn." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_caries", comparatorId: "wisdom_teeth", answers: { caries_w: "yes" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -15, badge: "Karies am Weisheitszahn oder Nachbarzahn ist ein häufiger Grund für die Entscheidung zur Entfernung." },
            { methodId: "wisdom_remove", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_little_bone", comparatorId: "sinus_lift", answers: { bone_height: "little" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -15, badge: "Bei dieser Knochenhöhe wird in der Regel der offene Sinuslift durchgeführt." },
            { methodId: "sinus_open", scoreDelta: 10 },
        ]
    },
    {
        id: "sinus_issues", comparatorId: "sinus_lift", answers: { sinus_health: "issues" }, effects: [
            { methodId: "sinus_closed", scoreDelta: -10, badge: "Bei einer Sinuspathologie erfolgt in der Regel zunächst eine HNO-Abklärung." },
            { methodId: "sinus_open", scoreDelta: -10, badge: "Bei einer Sinuspathologie wird die Kieferhöhle in der Regel vor der Augmentation behandelt." },
        ]
    },

    // ═══ PROPHYLAXE ═══
    {
        id: "brush_sensitive", comparatorId: "toothbrush", answers: { gums: "sensitive" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "Empfindliches Zahnfleisch — Schallzahnbürste ist sanfter." },
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
            { methodId: "interdental_brush", scoreDelta: -8, badge: "Enge Kontakte — Bürste passt möglicherweise nicht rein." },
        ]
    },
    {
        id: "inter_wide", comparatorId: "interdental", answers: { spaces: "wide" }, effects: [
            { methodId: "interdental_brush", scoreDelta: 12 },
            { methodId: "floss", scoreDelta: -8, badge: "Weite Zwischenräume — Zahnseide ist zu dünn." },
        ]
    },
    {
        id: "inter_prosth", comparatorId: "interdental", answers: { prosthetics_i: "yes" }, effects: [
            { methodId: "irrigator", scoreDelta: 10, badge: "Eine Munddusche eignet sich gut bei Brücken und Implantaten." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "brux_severe", comparatorId: "bruxism_guard", answers: { symptoms_br: "severe" }, effects: [
            { methodId: "no_guard", scoreDelta: -25, badge: "Unbehandelter starker Bruxismus ist mit einem Risiko für Risse und Zahnschäden verbunden." },
            { methodId: "splint_guard", scoreDelta: 10 },
        ]
    },
    {
        id: "brux_wear_visible", comparatorId: "bruxism_guard", answers: { wear_visible: "yes" }, effects: [
            { methodId: "no_guard", scoreDelta: -15, badge: "Sichtbarer Abrieb weist auf aktiven Bruxismus hin; eine Schiene ist das übliche Vorgehen." },
        ]
    },

    // ═══ KINDER ═══
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
            { methodId: "baby_filling", scoreDelta: -20, badge: "Bei einem Abszess löst eine Füllung allein das Problem in der Regel nicht." },
            { methodId: "baby_extraction", scoreDelta: 12 },
        ]
    },
    {
        id: "baby_soon", comparatorId: "baby_tooth_caries", answers: { exchange: "soon" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -10, badge: "Steht der Zahnwechsel kurz bevor, bringt eine Pulpabehandlung oft keinen Nutzen mehr." },
            { methodId: "baby_extraction", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_difficult", comparatorId: "baby_tooth_caries", answers: { cooperation: "difficult" }, effects: [
            { methodId: "baby_pulpotomy", scoreDelta: -8, badge: "Eine Pulpotomie setzt in der Regel ein ruhiges, kooperatives Kind voraus." },
        ]
    },

    // ═══ NOWE REGUŁY (tabela decyzji klinicznych 2026-07-24) ═══
    {
        id: "smile_scope_few", comparatorId: "smile_upgrade", answers: { scope: "few" }, effects: [
            { methodId: "veneer_porc_smile", scoreDelta: -10, badge: "Bei einer Veränderung an 1–2 Zähnen ist ein vollständiges Veneer-Protokoll meist nicht nötig — häufig wird Bonding erwogen." },
            { methodId: "bonding_smile", scoreDelta: 8 },
        ]
    },
    {
        id: "smile_scope_full", comparatorId: "smile_upgrade", answers: { scope: "full" }, effects: [
            { methodId: "crown_smile", scoreDelta: -10, badge: "Kronen über den gesamten Zahnbogen bedeuten umfangreiches Beschleifen; meist werden weniger invasive Optionen erwogen." },
            { methodId: "veneer_porc_smile", scoreDelta: 10 },
        ]
    },
    {
        id: "veneer_scope_many", comparatorId: "veneer_type", answers: { scope_v: "many" }, effects: [
            { methodId: "veneer_comp_type", scoreDelta: -10, badge: "Bei der Umgestaltung vieler Zähne erfordert Komposit häufigere Wartung; meist wird Porzellan erwogen." },
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
            { methodId: "bonding_mask", scoreDelta: -12, badge: "Bei Engständen fehlt oft der Platz für Material — die Möglichkeiten zur Kaschierung sind begrenzt." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_both", comparatorId: "straighten_vs_mask", answers: { problem_s: "both" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -10, badge: "Bei gleichzeitigem Engstand können die Kaschierungsmöglichkeiten begrenzt sein." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "straighten_cause", comparatorId: "straighten_vs_mask", answers: { cause: "cause" }, effects: [
            { methodId: "bonding_mask", scoreDelta: -8, badge: "Bonding und Veneers verbessern das Aussehen, ändern aber nicht die Zahnstellung." },
            { methodId: "aligners", scoreDelta: 8 },
        ]
    },
    {
        id: "diastema_other", comparatorId: "diastema", answers: { other_issues: "yes" }, effects: [
            { methodId: "bonding_dia", scoreDelta: -8, badge: "Der bloße Verschluss des Diastemas korrigiert nicht die Stellung der übrigen Zähne." },
            { methodId: "ortho_dia", scoreDelta: 10 },
        ]
    },
    {
        id: "bruxism_wear_many", comparatorId: "bruxism_wear", answers: { tooth_count_w: "many" }, effects: [
            { methodId: "splint_rebuild", scoreDelta: 8 },
            { methodId: "crown_brux", scoreDelta: -8, badge: "Kronen an 8+ Zähnen bedeuten umfangreiches Beschleifen; häufig werden zunächst additive Restaurationen erwogen." },
        ]
    },
    {
        id: "missing_front", comparatorId: "missing_tooth", answers: { location: "front" }, effects: [
            { methodId: "partial_denture", scoreDelta: -10, badge: "In der Lächelzone sind die Klammern einer Teilprothese beim Sprechen und Lächeln meist sichtbar." },
            { methodId: "implant", scoreDelta: 8 },
        ]
    },
    {
        id: "implant_zone_aesthetic", comparatorId: "implant_timing", answers: { zone: "aesthetic" }, effects: [
            { methodId: "implant_immediate", scoreDelta: 6 },
            { methodId: "implant_delayed", scoreDelta: -4, badge: "In der Lächelzone bedeutet ein verzögertes Implantat meist eine längere Zeit mit einem Provisorium." },
        ]
    },
    {
        id: "bridge_gap_one", comparatorId: "bridge_types", answers: { gap_count: "one" }, effects: [
            { methodId: "bridge_on_implants", scoreDelta: -12, badge: "Bei einem einzelnen fehlenden Zahn genügt meist ein einzelnes Implantat statt einer Brücke." },
            { methodId: "implant", scoreDelta: 10 },
        ]
    },
    {
        id: "bridge_gap_more", comparatorId: "bridge_types", answers: { gap_count: "more" }, effects: [
            { methodId: "implant", scoreDelta: -15, badge: "Bei 4+ fehlenden Zähnen füllt ein einzelnes Implantat mit Krone meist nicht die gesamte Lücke." },
            { methodId: "bridge_on_teeth", scoreDelta: -5, badge: "Bei einer langen Lücke hat eine zahngetragene Brücke einen großen Pfeilerabstand, was diese meist stärker belastet." },
            { methodId: "bridge_on_implants", scoreDelta: 10 },
        ]
    },
    {
        id: "denture_many", comparatorId: "denture_types", answers: { missing_count_d: "many" }, effects: [
            { methodId: "denture_flexible", scoreDelta: -12, badge: "Bei 4+ fehlenden Zähnen bietet eine flexible Prothese meist zu wenig Stabilität und Halt." },
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
            { methodId: "full_denture", scoreDelta: -10, badge: "Eine untere Totalprothese hält meist schlechter — im Unterkiefer wirkt der Saugeffekt nicht." },
            { methodId: "overdenture", scoreDelta: 10 },
        ]
    },
    {
        id: "onlay_walls_few", comparatorId: "onlay_vs_crown", answers: { walls: "two_less" }, effects: [
            { methodId: "onlay", scoreDelta: -15, badge: "Bei 1–2 erhaltenen Wänden sind die dünnen Wände unter einem Onlay meist bruchgefährdet." },
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
            { methodId: "re_endo", scoreDelta: -12, badge: "Bei schwieriger Anatomie oder einem frakturierten Instrument kann eine Revision weniger vorhersehbar sein." },
            { methodId: "resection", scoreDelta: 10 },
        ]
    },
    {
        id: "post_endo_little", comparatorId: "post_endo_rebuild", answers: { tissue_loss: "little" }, effects: [
            { methodId: "filling_post_endo", scoreDelta: -15, badge: "Bei 1–2 Wänden ist ein wurzelbehandelter Zahn spröde — eine Füllung allein reicht meist nicht." },
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
            { methodId: "hygiene_instruct", scoreDelta: -15, badge: "Bei fortgeschrittenem Knochenabbau reicht eine professionelle Reinigung allein meist nicht." },
            { methodId: "curettage_open", scoreDelta: 10 },
        ]
    },
    {
        id: "gum_bone_none", comparatorId: "gum_treatment", answers: { bone_loss_g: "none" }, effects: [
            { methodId: "curettage_open", scoreDelta: -10, badge: "Ohne Knochenabbau im Röntgenbild wird eine offene Kürettage meist nicht durchgeführt." },
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
            { methodId: "curettage_open", scoreDelta: -5, badge: "Nach einer offenen Kürettage hängt das Ergebnis stark von der täglichen häuslichen Mundhygiene ab." },
        ]
    },
    {
        id: "sens_post_scaling", comparatorId: "sensitivity", answers: { cause_s: "post_scaling" }, effects: [
            { methodId: "varnish_sensitivity", scoreDelta: 10, badge: "Nach Zahnsteinentfernung oder Bleaching ist Empfindlichkeit meist vorübergehend — ein Lack verschafft schnelle Linderung." },
            { methodId: "paste_sensitivity", scoreDelta: 8 },
            { methodId: "laser_sensitivity", scoreDelta: -5, badge: "Empfindlichkeit nach Zahnsteinentfernung oder Bleaching bessert sich oft mit einfacheren Methoden." },
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
            { methodId: "extract_simple", scoreDelta: -10, badge: "Bei gekrümmten oder brüchigen Wurzeln geht eine einfache Extraktion oft intraoperativ in eine chirurgische über." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "extract_inflammation", comparatorId: "extraction_type", answers: { inflammation: "yes" }, effects: [
            { methodId: "extract_simple", scoreDelta: -5, badge: "Bei akuter Entzündung wirkt die Betäubung meist schwächer; der Eingriffstermin wird individuell festgelegt." },
            { methodId: "extract_surgical", scoreDelta: -5, badge: "Eine akute Entzündung erhöht meist das Risiko von Heilungskomplikationen; dem Eingriff geht mitunter eine medikamentöse Behandlung voraus." },
        ]
    },
    {
        id: "sinus_with_enough", comparatorId: "sinus_lift", answers: { implant_plan: "with", bone_height: "enough" }, effects: [
            { methodId: "sinus_closed", scoreDelta: 10 },
            { methodId: "sinus_open", scoreDelta: -8, badge: "Ein offener Sinuslift ist meist ein separater Eingriff — das Implantat wird typischerweise nach etwa 6 Monaten Heilung gesetzt." },
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
            { methodId: "brush_manual", scoreDelta: -8, badge: "Bei unsicherer Technik reinigt eine Handzahnbürste meist weniger gründlich als eine elektrische oder Schallzahnbürste." },
        ]
    },
    {
        id: "brush_technique_good", comparatorId: "toothbrush", answers: { technique: "good" }, effects: [
            { methodId: "brush_manual", scoreDelta: 8 },
        ]
    },
    {
        id: "inter_limited_dex", comparatorId: "interdental", answers: { dexterity: "limited" }, effects: [
            { methodId: "floss", scoreDelta: -10, badge: "Bei eingeschränkter Geschicklichkeit kann Zahnseide schwierig sein — Interdentalbürsten sind meist einfacher." },
            { methodId: "interdental_brush", scoreDelta: 8 },
        ]
    },
    {
        id: "sealant_under6", comparatorId: "sealant_vs_fluoride", answers: { age_child: "under_6" }, effects: [
            { methodId: "sealant", scoreDelta: -12, badge: "Unter 6 Jahren sind die bleibenden Molaren meist noch nicht durchgebrochen; die Versiegelung wird typischerweise aufgeschoben." },
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
            { methodId: "fluoride_home", scoreDelta: -10, badge: "Unter 3 Jahren verschlucken Kinder oft Zahnpasta — zu Hause wird eine reiskorngroße Menge empfohlen, und die Dosis zusätzlichen Fluorids lässt sich in der Praxis leichter kontrollieren." },
            { methodId: "fluoride_office", scoreDelta: 8 },
        ]
    },
    {
        id: "wisdom_impacted", comparatorId: "wisdom_teeth", answers: { position_w: "impacted" }, effects: [
            { methodId: "wisdom_keep", scoreDelta: -12, badge: "Ein im Knochen retinierter Weisheitszahn erfordert regelmäßige Röntgenkontrollen; bei Symptomen oder Veränderungen wird meist eine Entfernung erwogen." },
            { methodId: "wisdom_remove", scoreDelta: 8 },
        ]
    },
    {
        id: "baby_deep", comparatorId: "baby_tooth_caries", answers: { depth: "deep" }, effects: [
            { methodId: "baby_filling", scoreDelta: -12, badge: "Wenn die Karies die Pulpa erreicht, wird meist eine Pulpabehandlung statt einer bloßen Füllung erwogen." },
            { methodId: "baby_pulpotomy", scoreDelta: 10 },
        ]
    },
    {
        id: "crown_comp_severe", comparatorId: "crown_vs_composite", answers: { destruction: "severe" }, effects: [
            { methodId: "composite_rebuild", scoreDelta: -10, badge: "Bei Verlust von mehr als der Hälfte der Zahnkrone bricht Komposit häufiger; typischerweise wird eine Krone erwogen." },
            { methodId: "crown_rebuild", scoreDelta: 8 },
        ]
    },
    {
        id: "sens_paste_helped", comparatorId: "sensitivity", answers: { tried_paste: "yes_helped" }, effects: [
            { methodId: "paste_sensitivity", scoreDelta: 10, badge: "Wenn die Zahnpasta wirkt, wird sie oft als erste Maßnahme fortgeführt." },
        ]
    },
    {
        id: "extract_partial", comparatorId: "extraction_type", answers: { tooth_visible: "partial" }, effects: [
            { methodId: "extract_simple", scoreDelta: -10, badge: "Bei einem teilweise durchgebrochenen Zahn ist oft ein chirurgischer Zugang nötig." },
            { methodId: "extract_surgical", scoreDelta: 8 },
        ]
    },
    {
        id: "brush_receding", comparatorId: "toothbrush", answers: { gums: "receding" }, effects: [
            { methodId: "brush_sonic", scoreDelta: 10 },
            { methodId: "brush_manual", scoreDelta: -8, badge: "Bei Zahnfleischrückgang kann zu kräftiges manuelles Putzen Defekte an den Zahnhälsen vertiefen." },
        ]
    },
    {
        id: "brux_unwilling", comparatorId: "bruxism_guard", answers: { willing_br: "no" }, effects: [
            { methodId: "splint_guard", scoreDelta: -10, badge: "Eine Schiene schützt nur, wenn sie getragen wird; andernfalls ist ihre Wirksamkeit begrenzt." },
        ]
    },
];
