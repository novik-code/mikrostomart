import type { Comparator } from "./comparatorTypes";

export const COMPARATORS_DE: Comparator[] = [
    // ═══ ÄSTHETIK ═══
    {
        id: "smile_upgrade", categoryId: "estetyka",
        title: "Smile-Makeover", subtitle: "Bleaching vs Bonding vs Veneers vs Kronen",
        icon: "😁", color: "#a855f7", methodIds: ["whitening", "bonding_smile", "veneer_porc_smile", "crown_smile"],
        questions: [
            {
                id: "goal", label: "Was möchten Sie verändern?", options: [
                    { value: "color", label: "Nur die Farbe (heller)", emoji: "🎨" },
                    { value: "shape", label: "Form und Proportionen", emoji: "📐" },
                    { value: "both", label: "Farbe und Form", emoji: "✨" },
                ]
            },
            {
                id: "scope", label: "Wie viele Zähne betrifft die Änderung?", options: [
                    { value: "few", label: "1–2 Zähne", emoji: "1️⃣" },
                    { value: "medium", label: "4–6 Zähne", emoji: "🔢" },
                    { value: "full", label: "8–10 (ganzer Bogen)", emoji: "😁" },
                ]
            },
            {
                id: "bruxism", label: "Pressen/knirschen Sie mit den Zähnen?", options: [
                    { value: "no", label: "Nein / weiß ich nicht", emoji: "😊" },
                    { value: "yes", label: "Ja, ich habe Bruxismus", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "veneer_type", categoryId: "estetyka",
        title: "Veneers: Komposit vs Porzellan", subtitle: "Geschwindigkeit vs Haltbarkeit",
        icon: "💎", color: "#a855f7", methodIds: ["veneer_comp_type", "veneer_porc_type"],
        questions: [
            {
                id: "scope_v", label: "Wie viele Zähne planen Sie?", options: [
                    { value: "few", label: "1–3 Zähne", emoji: "1️⃣" },
                    { value: "many", label: "4–10 Zähne", emoji: "🔢" },
                ]
            },
            {
                id: "priority_v", label: "Was ist wichtiger?", options: [
                    { value: "speed", label: "Schnelligkeit der Umsetzung", emoji: "⚡" },
                    { value: "longevity", label: "Langlebigkeit", emoji: "🏰" },
                ]
            },
            {
                id: "bruxism_v", label: "Bruxismus?", options: [
                    { value: "no", label: "Nein", emoji: "😊" },
                    { value: "yes", label: "Ja", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "bonding_scope", categoryId: "estetyka",
        title: "Bonding: punktuell vs Full Arch", subtitle: "1–2 Zähne vs 6–10 Zähne",
        icon: "🖌️", color: "#10b981", methodIds: ["bonding_spot", "bonding_full"],
        questions: [
            {
                id: "problem_b", label: "Welches Problem möchten Sie lösen?", options: [
                    { value: "chip", label: "Absplitterung / Bruch", emoji: "💔" },
                    { value: "gap", label: "Diastema / Lücken", emoji: "↔️" },
                    { value: "shape", label: "Form / Proportionen", emoji: "📐" },
                ]
            },
            {
                id: "scope_b", label: "Wie viele Zähne brauchen Korrektur?", options: [
                    { value: "few", label: "1–2 Zähne", emoji: "1️⃣" },
                    { value: "many", label: "4–10 Zähne", emoji: "🔢" },
                ]
            },
            {
                id: "bruxism_b", label: "Bruxismus?", options: [
                    { value: "no", label: "Nein", emoji: "😊" },
                    { value: "yes", label: "Ja", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "straighten_vs_mask", categoryId: "estetyka",
        title: "Begradigen vs Kaschieren", subtitle: "Kieferorthopädie (Aligner) vs Bonding/Veneers",
        icon: "🔄", color: "#06b6d4", methodIds: ["aligners", "bonding_mask"],
        questions: [
            {
                id: "problem_s", label: "Was stört Sie?", options: [
                    { value: "crowding", label: "Engstand / Rotationen", emoji: "🔀" },
                    { value: "gaps", label: "Lücken / Diastema", emoji: "↔️" },
                    { value: "both", label: "Beides", emoji: "🔄" },
                ]
            },
            {
                id: "patience", label: "Wie viel Zeit können Sie aufwenden?", options: [
                    { value: "fast", label: "Ergebnis in Tagen/Wochen", emoji: "⚡" },
                    { value: "wait", label: "Ich kann Monate warten", emoji: "⏳" },
                ]
            },
            {
                id: "cause", label: "Ursache oder Wirkung behandeln?", options: [
                    { value: "cause", label: "Ursache — Zahnbewegung", emoji: "🎯" },
                    { value: "effect", label: "Wirkung — schnelle Optikänderung", emoji: "🎭" },
                ]
            },
        ],
    },
    {
        id: "diastema", categoryId: "estetyka",
        title: "Diastema — wie schließen?", subtitle: "Bonding vs Kieferorthopädie vs Veneers",
        icon: "↔️", color: "#f59e0b", methodIds: ["bonding_dia", "ortho_dia", "veneer_dia"],
        questions: [
            {
                id: "gap_size", label: "Wie groß ist die Lücke?", options: [
                    { value: "small", label: "Klein (<2 mm)", emoji: "📏" },
                    { value: "medium", label: "Mittel (2–3 mm)", emoji: "📐" },
                    { value: "large", label: "Groß (>3 mm)", emoji: "↔️" },
                ]
            },
            {
                id: "other_issues", label: "Gibt es andere Unregelmäßigkeiten?", options: [
                    { value: "no", label: "Nein, nur das Diastema", emoji: "✅" },
                    { value: "yes", label: "Ja, auch andere Unregelmäßigkeiten", emoji: "🔀" },
                ]
            },
            {
                id: "speed_d", label: "Wie schnell möchten Sie das Ergebnis?", options: [
                    { value: "asap", label: "So schnell wie möglich", emoji: "⚡" },
                    { value: "can_wait", label: "Ich kann warten", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "bruxism_wear", categoryId: "estetyka",
        title: "Abrasion / Bruxismus", subtitle: "Schiene + Aufbauten vs Veneers vs Kronen",
        icon: "😬", color: "#ef4444", methodIds: ["splint_rebuild", "veneer_brux", "crown_brux"],
        questions: [
            {
                id: "wear_level", label: "Grad der Abrasion?", options: [
                    { value: "mild", label: "Früh (leichte Kantenverkürzung)", emoji: "🟡" },
                    { value: "moderate", label: "Mäßig (sichtbarer Substanzverlust)", emoji: "🟠" },
                    { value: "severe", label: "Fortgeschritten (Zähne kurz und flach)", emoji: "🔴" },
                ]
            },
            {
                id: "tooth_count_w", label: "Wie viele Zähne brauchen Aufbau?", options: [
                    { value: "few", label: "1–4 Zähne", emoji: "1️⃣" },
                    { value: "many", label: "8+ Zähne", emoji: "🔢" },
                ]
            },
            {
                id: "splint_ok", label: "Akzeptieren Sie eine Nachtschiene?", options: [
                    { value: "yes", label: "Ja, kein Problem", emoji: "✅" },
                    { value: "no", label: "Lieber nicht", emoji: "❌" },
                ]
            },
        ],
    },

    // ═══ FEHLENDE ZÄHNE ═══
    {
        id: "missing_tooth", categoryId: "braki",
        title: "Fehlender Zahn", subtitle: "Implantat vs Brücke vs Prothese",
        icon: "🦷", color: "#38bdf8", methodIds: ["implant", "bridge", "partial_denture"],
        questions: [
            {
                id: "location", label: "Wo fehlt der Zahn?", options: [
                    { value: "front", label: "Lächelzone (1–5)", emoji: "😁" },
                    { value: "back", label: "Seitenzähne (6–8)", emoji: "🔨" },
                ]
            },
            {
                id: "count", label: "Wie viele Zähne fehlen?", options: [
                    { value: "one", label: "1 Zahn", emoji: "1️⃣" },
                    { value: "few", label: "2–3 Zähne", emoji: "🔢" },
                    { value: "many", label: "4+ Zähne", emoji: "📊" },
                ]
            },
            {
                id: "neighbors", label: "Zustand der Nachbarzähne?", options: [
                    { value: "healthy", label: "Gesund, ohne Füllungen", emoji: "✅" },
                    { value: "restored", label: "Mit Füllungen oder Kronen", emoji: "🔧" },
                ]
            },
        ],
    },
    {
        id: "implant_timing", categoryId: "braki",
        title: "Implantat: sofort vs verzögert", subtitle: "Direkt nach Extraktion vs nach Heilung",
        icon: "⏱️", color: "#38bdf8", methodIds: ["implant_immediate", "implant_delayed"],
        questions: [
            {
                id: "infection", label: "Gibt es eine Entzündung / Abszess?", options: [
                    { value: "no", label: "Nein, der Zahn ist ruhig", emoji: "✅" },
                    { value: "yes", label: "Ja, es gibt eine Infektion", emoji: "🔴" },
                ]
            },
            {
                id: "zone", label: "Wo befindet sich der Zahn?", options: [
                    { value: "aesthetic", label: "Lächelzone", emoji: "😁" },
                    { value: "posterior", label: "Seitenzähne", emoji: "🔨" },
                ]
            },
            {
                id: "bone", label: "Was sagt der Arzt zum Knochen?", options: [
                    { value: "good", label: "Ausreichend Knochen", emoji: "💪" },
                    { value: "deficient", label: "Knochenmangel / Augmentation nötig", emoji: "📉" },
                ]
            },
        ],
    },
    {
        id: "bridge_types", categoryId: "braki",
        title: "Fester Ersatz", subtitle: "Implantat+Krone vs zahngetragene Brücke vs Implantatbrücke",
        icon: "🌉", color: "#f59e0b", methodIds: ["implant", "bridge_on_teeth", "bridge_on_implants"],
        questions: [
            {
                id: "gap_count", label: "Wie viele nebeneinander liegende Zähne fehlen?", options: [
                    { value: "one", label: "1 Zahn", emoji: "1️⃣" },
                    { value: "two_three", label: "2–3 Zähne", emoji: "🔢" },
                    { value: "more", label: "4+ Zähne", emoji: "📊" },
                ]
            },
            {
                id: "abutment", label: "Zustand der Pfeilerzähne?", options: [
                    { value: "healthy", label: "Gesund", emoji: "✅" },
                    { value: "restored", label: "Mit Kronen/großen Füllungen", emoji: "🔧" },
                ]
            },
            {
                id: "bone_b", label: "Ausreichend Knochen für Implantate?", options: [
                    { value: "yes", label: "Ja", emoji: "💪" },
                    { value: "no", label: "Nein / weiß ich nicht", emoji: "❓" },
                ]
            },
        ],
    },
    {
        id: "denture_types", categoryId: "braki",
        title: "Teilprothese — welcher Typ?", subtitle: "Acryl vs Modellguss vs Flexibel",
        icon: "⚙️", color: "#10b981", methodIds: ["denture_acrylic", "denture_skeletal", "denture_flexible"],
        questions: [
            {
                id: "missing_count_d", label: "Wie viele Zähne fehlen?", options: [
                    { value: "few", label: "1–3 Zähne", emoji: "1️⃣" },
                    { value: "many", label: "4+ Zähne", emoji: "📊" },
                ]
            },
            {
                id: "aesthetics_d", label: "Wie wichtig ist Ästhetik?", options: [
                    { value: "critical", label: "Sehr wichtig — unsichtbare Klammern", emoji: "💎" },
                    { value: "ok", label: "Sichtbare Klammern akzeptabel", emoji: "👍" },
                ]
            },
            {
                id: "duration_d", label: "Wie lange planen Sie die Prothese?", options: [
                    { value: "temp", label: "Vorübergehend (vor Implantaten)", emoji: "⏳" },
                    { value: "long", label: "Langfristig / dauerhaft", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "full_denture", categoryId: "braki",
        title: "Zahnlosigkeit: Prothese vs Overdenture", subtitle: "Totalprothese vs implantatgestützte Prothese",
        icon: "🔩", color: "#38bdf8", methodIds: ["full_denture", "overdenture"],
        questions: [
            {
                id: "jaw", label: "Welcher Kiefer?", options: [
                    { value: "upper", label: "Oberkiefer", emoji: "⬆️" },
                    { value: "lower", label: "Unterkiefer", emoji: "⬇️" },
                ]
            },
            {
                id: "stability", label: "\"Springt\" die Prothese?", options: [
                    { value: "stable", label: "Hält gut", emoji: "✅" },
                    { value: "loose", label: "Locker, fällt beim Essen raus", emoji: "😫" },
                ]
            },
            {
                id: "surgery_ok", label: "Akzeptieren Sie einen chirurgischen Eingriff?", options: [
                    { value: "yes", label: "Ja", emoji: "✅" },
                    { value: "no", label: "Nein / habe Angst", emoji: "❌" },
                ]
            },
        ],
    },
    {
        id: "onlay_vs_crown", categoryId: "braki",
        title: "Onlay vs Krone", subtitle: "Substanzerhalt vs Vollschutz",
        icon: "🧩", color: "#10b981", methodIds: ["onlay", "crown_rebuild"],
        questions: [
            {
                id: "endo_done", label: "Wurde der Zahn wurzelbehandelt?", options: [
                    { value: "no", label: "Nein — Zahn ist vital", emoji: "💚" },
                    { value: "yes", label: "Ja — nach Endo", emoji: "🔬" },
                ]
            },
            {
                id: "walls", label: "Wie viele Kronenwände erhalten?", options: [
                    { value: "three_plus", label: "3–4 Wände", emoji: "🏰" },
                    { value: "two_less", label: "1–2 Wände", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_o", label: "Bruxismus?", options: [
                    { value: "no", label: "Nein", emoji: "😊" },
                    { value: "yes", label: "Ja", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "crown_vs_composite", categoryId: "braki",
        title: "Krone vs Kompositaufbau", subtitle: "Stark zerstörter Zahn — was wählen?",
        icon: "👑", color: "#38bdf8", methodIds: ["crown_rebuild", "composite_rebuild"],
        questions: [
            {
                id: "destruction", label: "Wie stark ist der Zahn zerstört?", options: [
                    { value: "moderate", label: "30–50% der Krone", emoji: "🟡" },
                    { value: "severe", label: ">50% der Krone", emoji: "🔴" },
                ]
            },
            {
                id: "endo_cr", label: "Wurde er wurzelbehandelt?", options: [
                    { value: "no", label: "Nein", emoji: "💚" },
                    { value: "yes", label: "Ja", emoji: "🔬" },
                ]
            },
            {
                id: "position_cr", label: "Welcher Zahn?", options: [
                    { value: "front", label: "Frontzahn", emoji: "😁" },
                    { value: "back", label: "Seitenzahn (Molar/Prämolar)", emoji: "🔨" },
                ]
            },
        ],
    },

    // ═══ WURZELKANAL ═══
    {
        id: "endo_vs_extract", categoryId: "kanalowe",
        title: "Endo vs Extraktion + Implantat", subtitle: "Zahn retten oder ersetzen?",
        icon: "⚔️", color: "#f59e0b", methodIds: ["endo", "extract_implant"],
        questions: [
            {
                id: "tooth_state", label: "Zahnzustand?", options: [
                    { value: "restorable", label: "Kann restauriert werden", emoji: "🔧" },
                    { value: "questionable", label: "Fragliche Prognose", emoji: "❓" },
                    { value: "hopeless", label: "Nicht zu retten", emoji: "⚠️" },
                ]
            },
            {
                id: "strategic", label: "Ist der Zahn strategisch wichtig?", options: [
                    { value: "yes", label: "Ja (Pfeilerzahn, Schneidezahn, Schlüsselposition)", emoji: "⭐" },
                    { value: "no", label: "Kollidiert nicht mit dem Behandlungsplan", emoji: "👍" },
                ]
            },
            {
                id: "time_pref", label: "Geschwindigkeit vs Haltbarkeit?", options: [
                    { value: "save_time", label: "Schneller — 1–3 Termine", emoji: "⚡" },
                    { value: "invest", label: "Investiere in Haltbarkeit — kann warten", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "retreatment", categoryId: "kanalowe",
        title: "Re-Endo vs Resektion vs Extraktion", subtitle: "Was wenn die erste Endo nicht gewirkt hat?",
        icon: "🔁", color: "#f59e0b", methodIds: ["re_endo", "resection", "extraction_after"],
        questions: [
            {
                id: "previous", label: "Warum hat die erste Endo nicht gewirkt?", options: [
                    { value: "short", label: "Kurze Füllung / übersehener Kanal", emoji: "📏" },
                    { value: "leakage", label: "Undichte Restauration, Sekundärinfektion", emoji: "💧" },
                    { value: "anatomy", label: "Schwierige Anatomie / gebrochenes Instrument", emoji: "🔧" },
                ]
            },
            {
                id: "post_present", label: "Ist ein Stift im Kanal?", options: [
                    { value: "no", label: "Nein — Zugang von oben möglich", emoji: "✅" },
                    { value: "yes", label: "Ja — kann nicht entfernt werden", emoji: "🔒" },
                ]
            },
            {
                id: "symptoms_r", label: "Symptome?", options: [
                    { value: "none", label: "Keine — Veränderung nur im Röntgen", emoji: "📷" },
                    { value: "mild", label: "Leichter Schmerz, Unbehagen", emoji: "🟡" },
                    { value: "acute", label: "Starker Schmerz / Schwellung / Abszess", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "endo_sessions", categoryId: "kanalowe",
        title: "Endo: 1 Sitzung vs 2 Sitzungen", subtitle: "Komfort vs Sicherheit",
        icon: "📅", color: "#38bdf8", methodIds: ["endo_1visit", "endo_2visit"],
        questions: [
            {
                id: "diagnosis_e", label: "Wie lautet die Diagnose?", options: [
                    { value: "pulpitis", label: "Pulpitis (Schmerzen bei heiß/kalt)", emoji: "🔥" },
                    { value: "necrosis", label: "Nekrose / Befund im Röntgen", emoji: "📷" },
                    { value: "abscess", label: "Abszess / Schwellung", emoji: "🔴" },
                ]
            },
            {
                id: "anatomy_e", label: "Kanalanatomie?", options: [
                    { value: "simple", label: "Einfach (1–2 Kanäle)", emoji: "📏" },
                    { value: "complex", label: "Komplex (3+ Kanäle, Krümmungen)", emoji: "🔀" },
                ]
            },
            {
                id: "preference_e", label: "Ihre Präferenz?", options: [
                    { value: "one_done", label: "Eine Sitzung — erledigt", emoji: "⚡" },
                    { value: "safe", label: "Lieber zwei kürzere Termine", emoji: "🛡️" },
                ]
            },
        ],
    },
    {
        id: "post_endo_rebuild", categoryId: "kanalowe",
        title: "Aufbau nach Endo", subtitle: "Füllung vs Stift + Krone",
        icon: "🏗️", color: "#10b981", methodIds: ["filling_post_endo", "post_crown"],
        questions: [
            {
                id: "tooth_type_pe", label: "Welcher Zahn?", options: [
                    { value: "front", label: "Frontzahn (Schneidezahn, Eckzahn)", emoji: "😁" },
                    { value: "back", label: "Seitenzahn (Prämolar, Molar)", emoji: "🔨" },
                ]
            },
            {
                id: "tissue_loss", label: "Wie viel Substanz ist übrig?", options: [
                    { value: "plenty", label: "Viel — 3–4 Wände", emoji: "🏰" },
                    { value: "little", label: "Wenig — 1–2 Wände", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_pe", label: "Bruxismus?", options: [
                    { value: "no", label: "Nein", emoji: "😊" },
                    { value: "yes", label: "Ja", emoji: "😬" },
                ]
            },
        ],
    },

    // ═══ PARODONTOLOGIE ═══
    {
        id: "hygiene_methods", categoryId: "periodontologia",
        title: "Scaling vs AIRFLOW vs Kürettage", subtitle: "Was bei Zahnstein und Plaque wählen?",
        icon: "💨", color: "#10b981", methodIds: ["scaling", "airflow", "curettage"],
        questions: [
            {
                id: "pockets", label: "Taschentiefe?", options: [
                    { value: "none", label: "Keine Taschen / weiß nicht", emoji: "❓" },
                    { value: "shallow", label: "Bis 4 mm", emoji: "🟡" },
                    { value: "deep", label: ">4 mm", emoji: "🔴" },
                ]
            },
            {
                id: "sensitivity_h", label: "Zahnfleischempfindlichkeit?", options: [
                    { value: "normal", label: "Normal", emoji: "👍" },
                    { value: "sensitive", label: "Sehr empfindlich, blutet", emoji: "🩸" },
                ]
            },
            {
                id: "implants_h", label: "Haben Sie Implantate oder prothetische Arbeiten?", options: [
                    { value: "no", label: "Nein", emoji: "❌" },
                    { value: "yes", label: "Ja", emoji: "✅" },
                ]
            },
        ],
    },
    {
        id: "gum_treatment", categoryId: "periodontologia",
        title: "Zahnfleischbehandlung — welches Niveau?", subtitle: "Hygienisierung vs geschlossene vs offene Kürettage",
        icon: "🩺", color: "#10b981", methodIds: ["hygiene_instruct", "curettage_closed", "curettage_open"],
        questions: [
            {
                id: "pockets_g", label: "Taschentiefe?", options: [
                    { value: "up_to_4", label: "Bis 4 mm", emoji: "🟡" },
                    { value: "4_to_6", label: "4–6 mm", emoji: "🟠" },
                    { value: "over_6", label: ">6 mm", emoji: "🔴" },
                ]
            },
            {
                id: "bone_loss_g", label: "Knochenverlust im Röntgen?", options: [
                    { value: "none", label: "Keiner / minimal", emoji: "✅" },
                    { value: "moderate", label: "Mäßig", emoji: "🟠" },
                    { value: "advanced", label: "Fortgeschritten", emoji: "🔴" },
                ]
            },
            {
                id: "compliance", label: "Häusliche Hygiene?", options: [
                    { value: "good", label: "Gut — 2× Zähneputzen, Zahnseide", emoji: "⭐" },
                    { value: "average", label: "Durchschnittlich — putze, aber keine Zahnseide", emoji: "👍" },
                ]
            },
        ],
    },
    {
        id: "sensitivity", categoryId: "periodontologia",
        title: "Zahnempfindlichkeit", subtitle: "Lack vs Laser vs Zahnpasta",
        icon: "❄️", color: "#06b6d4", methodIds: ["varnish_sensitivity", "laser_sensitivity", "paste_sensitivity"],
        questions: [
            {
                id: "intensity", label: "Wie stark ist die Empfindlichkeit?", options: [
                    { value: "mild", label: "Leicht — gelegentlich Schauer", emoji: "🟡" },
                    { value: "moderate", label: "Mäßig — schmerzt bei kalt/heiß", emoji: "🟠" },
                    { value: "severe", label: "Stark — spontaner Schmerz", emoji: "🔴" },
                ]
            },
            {
                id: "cause_s", label: "Wahrscheinliche Ursache?", options: [
                    { value: "recession", label: "Freiliegende Zahnhälse", emoji: "🦷" },
                    { value: "post_scaling", label: "Nach Scaling / Bleaching", emoji: "🪥" },
                    { value: "unknown", label: "Weiß ich nicht", emoji: "❓" },
                ]
            },
            {
                id: "tried_paste", label: "Haben Sie Sensitivzahnpasta probiert?", options: [
                    { value: "no", label: "Nein", emoji: "❌" },
                    { value: "yes_helped", label: "Ja, hat geholfen", emoji: "✅" },
                    { value: "yes_not", label: "Ja, hat nicht geholfen", emoji: "😕" },
                ]
            },
        ],
    },

    // ═══ CHIRURGIE ═══
    {
        id: "extraction_type", categoryId: "chirurgia",
        title: "Extraktion: einfach vs chirurgisch", subtitle: "Heilungsdauer, Risiko, Vorbereitung",
        icon: "🦷", color: "#ef4444", methodIds: ["extract_simple", "extract_surgical"],
        questions: [
            {
                id: "tooth_visible", label: "Ist der Zahn sichtbar?", options: [
                    { value: "yes", label: "Ja, voll durchgebrochen", emoji: "✅" },
                    { value: "partial", label: "Teilweise durchgebrochen", emoji: "🟡" },
                    { value: "no", label: "Nein — im Knochen verlagert", emoji: "🔴" },
                ]
            },
            {
                id: "roots_ex", label: "Wurzelzustand?", options: [
                    { value: "normal", label: "Gerade, einzelne Wurzel", emoji: "📏" },
                    { value: "complex", label: "Gekrümmt, brüchig, mehrere Wurzeln", emoji: "🔀" },
                ]
            },
            {
                id: "inflammation", label: "Entzündung?", options: [
                    { value: "no", label: "Keine", emoji: "✅" },
                    { value: "yes", label: "Ja — Schwellung / Abszess", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "wisdom_teeth", categoryId: "chirurgia",
        title: "Weisheitszähne: behalten vs entfernen", subtitle: "Checkliste der Indikationen und Kontraindikationen",
        icon: "🦷", color: "#ef4444", methodIds: ["wisdom_keep", "wisdom_remove"],
        questions: [
            {
                id: "symptoms_w", label: "Verursacht der Weisheitszahn Symptome?", options: [
                    { value: "none", label: "Nein — sitzt ruhig", emoji: "✅" },
                    { value: "occasional", label: "Manchmal Schmerzen / Schwellung", emoji: "🟡" },
                    { value: "frequent", label: "Häufige Probleme", emoji: "🔴" },
                ]
            },
            {
                id: "position_w", label: "Position des Weisheitszahns im Röntgen?", options: [
                    { value: "erupted", label: "Durchgebrochen, in Okklusion", emoji: "✅" },
                    { value: "tilted", label: "Schräg, drückt auf Nachbar", emoji: "↗️" },
                    { value: "impacted", label: "Im Knochen verlagert", emoji: "🔒" },
                ]
            },
            {
                id: "caries_w", label: "Karies am Weisheitszahn oder Nachbar?", options: [
                    { value: "no", label: "Keine", emoji: "✅" },
                    { value: "yes", label: "Ja", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "sinus_lift", categoryId: "chirurgia",
        title: "Sinuslift: geschlossen vs offen", subtitle: "Anhebung des Kieferhöhlenbodens vor Implantat",
        icon: "🔼", color: "#38bdf8", methodIds: ["sinus_closed", "sinus_open"],
        questions: [
            {
                id: "bone_height", label: "Wie viel Restknochen?", options: [
                    { value: "enough", label: "5–7 mm (es fehlen 1–3 mm)", emoji: "🟡" },
                    { value: "little", label: "<5 mm (großer Mangel)", emoji: "🔴" },
                ]
            },
            {
                id: "implant_plan", label: "Implantat gleichzeitig?", options: [
                    { value: "with", label: "Ja — Implantat + Sinus in einer Sitzung", emoji: "⚡" },
                    { value: "staged", label: "Nein — erst Knochen, dann Implantat", emoji: "📅" },
                ]
            },
            {
                id: "sinus_health", label: "Zustand der Kieferhöhle?", options: [
                    { value: "healthy", label: "Gesund", emoji: "✅" },
                    { value: "issues", label: "Polyp / chronische Entzündung", emoji: "⚠️" },
                ]
            },
        ],
    },

    // ═══ PROPHYLAXE ═══
    {
        id: "toothbrush", categoryId: "profilaktyka",
        title: "Zahnbürste: manuell vs elektrisch vs Schall", subtitle: "Was reinigt am besten?",
        icon: "🪥", color: "#06b6d4", methodIds: ["brush_manual", "brush_electric", "brush_sonic"],
        questions: [
            {
                id: "gums", label: "Zahnfleischzustand?", options: [
                    { value: "healthy", label: "Gesund", emoji: "✅" },
                    { value: "sensitive", label: "Empfindlich / blutet", emoji: "🩸" },
                    { value: "receding", label: "Rezessionen", emoji: "📉" },
                ]
            },
            {
                id: "prosthetics", label: "Haben Sie Implantate/Brücken/Veneers?", options: [
                    { value: "no", label: "Nein", emoji: "❌" },
                    { value: "yes", label: "Ja", emoji: "✅" },
                ]
            },
            {
                id: "technique", label: "Putztechnik?", options: [
                    { value: "good", label: "Beherrscht (Bass-Methode)", emoji: "⭐" },
                    { value: "average", label: "Durchschnittlich / weiß nicht", emoji: "🤷" },
                ]
            },
        ],
    },
    {
        id: "interdental", categoryId: "profilaktyka",
        title: "Zahnseide vs Interdentalbürsten vs Irrigator", subtitle: "Interdentalreinigung — was wählen?",
        icon: "🧵", color: "#06b6d4", methodIds: ["floss", "interdental_brush", "irrigator"],
        questions: [
            {
                id: "spaces", label: "Zahnzwischenräume?", options: [
                    { value: "tight", label: "Eng", emoji: "📏" },
                    { value: "normal", label: "Normal", emoji: "👍" },
                    { value: "wide", label: "Weit (nach Paro, Brücken)", emoji: "↔️" },
                ]
            },
            {
                id: "prosthetics_i", label: "Brücken, Implantate, Zahnspange?", options: [
                    { value: "no", label: "Nein", emoji: "❌" },
                    { value: "yes", label: "Ja", emoji: "✅" },
                ]
            },
            {
                id: "dexterity", label: "Manuelle Geschicklichkeit?", options: [
                    { value: "good", label: "Gut — kann Zahnseide verwenden", emoji: "👍" },
                    { value: "limited", label: "Eingeschränkt — Zahnseide ist schwierig", emoji: "😅" },
                ]
            },
        ],
    },
    {
        id: "bruxism_guard", categoryId: "profilaktyka",
        title: "Bruxismus: Schiene vs nichts", subtitle: "Risiko von Abrasion und Zahnbruch",
        icon: "🛡️", color: "#ef4444", methodIds: ["splint_guard", "no_guard"],
        questions: [
            {
                id: "symptoms_br", label: "Bruxismus-Symptome?", options: [
                    { value: "mild", label: "Leichte Kieferspannung morgens", emoji: "🟡" },
                    { value: "moderate", label: "Sichtbare Abrasion, Kopfschmerzen", emoji: "🟠" },
                    { value: "severe", label: "Brüche, starke Abrasion, TMJ-Schmerzen", emoji: "🔴" },
                ]
            },
            {
                id: "wear_visible", label: "Abrasion an den Zähnen?", options: [
                    { value: "no", label: "Keine sichtbare", emoji: "✅" },
                    { value: "yes", label: "Ja", emoji: "⚠️" },
                ]
            },
            {
                id: "willing_br", label: "Werden Sie nachts eine Schiene tragen?", options: [
                    { value: "yes", label: "Ja, kein Problem", emoji: "✅" },
                    { value: "maybe", label: "Ich probiere es", emoji: "🤔" },
                ]
            },
        ],
    },

    // ═══ KINDER ═══
    {
        id: "sealant_vs_fluoride", categoryId: "dzieci",
        title: "Versiegelung vs Fluoridierung vs Infiltration", subtitle: "Kariesprävention bei Kindern",
        icon: "🛡️", color: "#ec4899", methodIds: ["sealant", "fluoride_varnish", "icon_infiltration"],
        questions: [
            {
                id: "tooth_status", label: "Zahnzustand?", options: [
                    { value: "healthy", label: "Gesund, tiefe Fissuren", emoji: "✅" },
                    { value: "white_spot", label: "White Spot — frühe Demineralisation", emoji: "⚪" },
                    { value: "general", label: "Allgemeine Prophylaxe", emoji: "🛡️" },
                ]
            },
            {
                id: "age_child", label: "Alter des Kindes?", options: [
                    { value: "under_6", label: "Unter 6 Jahren", emoji: "👶" },
                    { value: "6_12", label: "6–12 Jahre", emoji: "🧒" },
                    { value: "teen", label: "Teenager", emoji: "🧑" },
                ]
            },
            {
                id: "risk_caries", label: "Kariesrisiko?", options: [
                    { value: "low", label: "Niedrig", emoji: "🟢" },
                    { value: "high", label: "Hoch", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "fluoride_method", categoryId: "dzieci",
        title: "Fluoridierung: Praxis vs häuslich", subtitle: "Pflege, Häufigkeit, Wirksamkeit",
        icon: "💧", color: "#ec4899", methodIds: ["fluoride_office", "fluoride_home"],
        questions: [
            {
                id: "caries_risk_f", label: "Kariesrisiko?", options: [
                    { value: "low", label: "Niedrig", emoji: "🟢" },
                    { value: "high", label: "Hoch (Karies in der Familie, Süßigkeiten)", emoji: "🔴" },
                ]
            },
            {
                id: "age_f", label: "Alter des Kindes?", options: [
                    { value: "under_3", label: "Unter 3 Jahren", emoji: "👶" },
                    { value: "over_3", label: "3+ Jahre", emoji: "🧒" },
                ]
            },
            {
                id: "visits_freq", label: "Wie oft können Sie kommen?", options: [
                    { value: "regular", label: "Alle 3–6 Monate", emoji: "📅" },
                    { value: "rare", label: "Selten", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "baby_tooth_caries", categoryId: "dzieci",
        title: "Karies am Milchzahn", subtitle: "Füllung vs Pulpotomie vs Extraktion",
        icon: "🧒", color: "#ec4899", methodIds: ["baby_filling", "baby_pulpotomy", "baby_extraction"],
        questions: [
            {
                id: "depth", label: "Kariestiefe?", options: [
                    { value: "shallow", label: "Flach/mittel — ohne Pulpa", emoji: "🟡" },
                    { value: "deep", label: "Tief — nah an oder in der Pulpa", emoji: "🟠" },
                    { value: "abscess", label: "Abszess / Fistel", emoji: "🔴" },
                ]
            },
            {
                id: "exchange", label: "Wann kommt der bleibende Zahn?", options: [
                    { value: "far", label: ">2 Jahre", emoji: "⏳" },
                    { value: "soon", label: "<1 Jahr", emoji: "⚡" },
                ]
            },
            {
                id: "cooperation", label: "Kooperation des Kindes?", options: [
                    { value: "good", label: "Gut — sitzt ruhig", emoji: "😊" },
                    { value: "difficult", label: "Schwierig — weint, öffnet nicht", emoji: "😢" },
                ]
            },
        ],
    },
];
