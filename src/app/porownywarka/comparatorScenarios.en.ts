import type { Comparator } from "./comparatorTypes";

export const COMPARATORS_EN: Comparator[] = [
    // ═══ AESTHETICS ═══
    {
        id: "smile_upgrade", categoryId: "estetyka",
        title: "Smile makeover", subtitle: "Whitening vs bonding vs veneers vs crowns",
        icon: "😁", color: "#a855f7", methodIds: ["whitening", "bonding_smile", "veneer_porc_smile", "crown_smile"],
        questions: [
            {
                id: "goal", label: "What do you want to change?", options: [
                    { value: "color", label: "Colour only (brighter)", emoji: "🎨" },
                    { value: "shape", label: "Shape and proportions", emoji: "📐" },
                    { value: "both", label: "Colour and shape", emoji: "✨" },
                ]
            },
            {
                id: "scope", label: "How many teeth are affected?", options: [
                    { value: "few", label: "1–2 teeth", emoji: "1️⃣" },
                    { value: "medium", label: "4–6 teeth", emoji: "🔢" },
                    { value: "full", label: "8–10 (full arch)", emoji: "😁" },
                ]
            },
            {
                id: "bruxism", label: "Do you clench/grind your teeth?", options: [
                    { value: "no", label: "No / I don't know", emoji: "😊" },
                    { value: "yes", label: "Yes, I have bruxism", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "veneer_type", categoryId: "estetyka",
        title: "Veneers: composite vs porcelain", subtitle: "Speed vs durability",
        icon: "💎", color: "#a855f7", methodIds: ["veneer_comp_type", "veneer_porc_type"],
        questions: [
            {
                id: "scope_v", label: "How many teeth are you planning?", options: [
                    { value: "few", label: "1–3 teeth", emoji: "1️⃣" },
                    { value: "many", label: "4–10 teeth", emoji: "🔢" },
                ]
            },
            {
                id: "priority_v", label: "What is more important?", options: [
                    { value: "speed", label: "Speed of completion", emoji: "⚡" },
                    { value: "longevity", label: "Long-term durability", emoji: "🏰" },
                ]
            },
            {
                id: "bruxism_v", label: "Bruxism?", options: [
                    { value: "no", label: "No", emoji: "😊" },
                    { value: "yes", label: "Yes", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "bonding_scope", categoryId: "estetyka",
        title: "Bonding: spot vs full arch", subtitle: "1–2 teeth vs 6–10 teeth",
        icon: "🖌️", color: "#10b981", methodIds: ["bonding_spot", "bonding_full"],
        questions: [
            {
                id: "problem_b", label: "What problem do you want to solve?", options: [
                    { value: "chip", label: "Chip / fracture", emoji: "💔" },
                    { value: "gap", label: "Diastema / gaps", emoji: "↔️" },
                    { value: "shape", label: "Shape / proportions", emoji: "📐" },
                ]
            },
            {
                id: "scope_b", label: "How many teeth need correction?", options: [
                    { value: "few", label: "1–2 teeth", emoji: "1️⃣" },
                    { value: "many", label: "4–10 teeth", emoji: "🔢" },
                ]
            },
            {
                id: "bruxism_b", label: "Bruxism?", options: [
                    { value: "no", label: "No", emoji: "😊" },
                    { value: "yes", label: "Yes", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "straighten_vs_mask", categoryId: "estetyka",
        title: "Straightening vs masking", subtitle: "Orthodontics (aligners) vs bonding/veneers",
        icon: "🔄", color: "#06b6d4", methodIds: ["aligners", "bonding_mask"],
        questions: [
            {
                id: "problem_s", label: "What bothers you?", options: [
                    { value: "crowding", label: "Crowding / rotations", emoji: "🔀" },
                    { value: "gaps", label: "Gaps / diastemas", emoji: "↔️" },
                    { value: "both", label: "Both", emoji: "🔄" },
                ]
            },
            {
                id: "patience", label: "How much time can you spare?", options: [
                    { value: "fast", label: "I want results in days/weeks", emoji: "⚡" },
                    { value: "wait", label: "I can wait months", emoji: "⏳" },
                ]
            },
            {
                id: "cause", label: "Do you want to treat the cause or the effect?", options: [
                    { value: "cause", label: "The cause — tooth movement", emoji: "🎯" },
                    { value: "effect", label: "The effect — quick appearance change", emoji: "🎭" },
                ]
            },
        ],
    },
    {
        id: "diastema", categoryId: "estetyka",
        title: "Diastema — how to close it?", subtitle: "Bonding vs orthodontics vs veneers",
        icon: "↔️", color: "#f59e0b", methodIds: ["bonding_dia", "ortho_dia", "veneer_dia"],
        questions: [
            {
                id: "gap_size", label: "How large is the gap?", options: [
                    { value: "small", label: "Small (<2 mm)", emoji: "📏" },
                    { value: "medium", label: "Medium (2–3 mm)", emoji: "📐" },
                    { value: "large", label: "Large (>3 mm)", emoji: "↔️" },
                ]
            },
            {
                id: "other_issues", label: "Are there other irregularities?", options: [
                    { value: "no", label: "No, just the diastema", emoji: "✅" },
                    { value: "yes", label: "Yes, other irregularities too", emoji: "🔀" },
                ]
            },
            {
                id: "speed_d", label: "How quickly do you want results?", options: [
                    { value: "asap", label: "As soon as possible", emoji: "⚡" },
                    { value: "can_wait", label: "I can wait", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "bruxism_wear", categoryId: "estetyka",
        title: "Wear / bruxism", subtitle: "Splint + restorations vs veneers vs crowns",
        icon: "😬", color: "#ef4444", methodIds: ["splint_rebuild", "veneer_brux", "crown_brux"],
        questions: [
            {
                id: "wear_level", label: "Degree of wear?", options: [
                    { value: "mild", label: "Early (slight shortening of edges)", emoji: "🟡" },
                    { value: "moderate", label: "Moderate (visible tissue loss)", emoji: "🟠" },
                    { value: "severe", label: "Advanced (teeth short and flat)", emoji: "🔴" },
                ]
            },
            {
                id: "tooth_count_w", label: "How many teeth need restoration?", options: [
                    { value: "few", label: "1–4 teeth", emoji: "1️⃣" },
                    { value: "many", label: "8+ teeth", emoji: "🔢" },
                ]
            },
            {
                id: "splint_ok", label: "Will you accept a night guard?", options: [
                    { value: "yes", label: "Yes, no problem", emoji: "✅" },
                    { value: "no", label: "I'd rather do without", emoji: "❌" },
                ]
            },
        ],
    },

    // ═══ MISSING TEETH ═══
    {
        id: "missing_tooth", categoryId: "braki",
        title: "Missing tooth", subtitle: "Implant vs bridge vs denture",
        icon: "🦷", color: "#38bdf8", methodIds: ["implant", "bridge", "partial_denture"],
        questions: [
            {
                id: "location", label: "Where is the tooth missing?", options: [
                    { value: "front", label: "Smile zone (1–5)", emoji: "😁" },
                    { value: "back", label: "Back teeth (6–8)", emoji: "🔨" },
                ]
            },
            {
                id: "count", label: "How many teeth are missing?", options: [
                    { value: "one", label: "1 tooth", emoji: "1️⃣" },
                    { value: "few", label: "2–3 teeth", emoji: "🔢" },
                    { value: "many", label: "4+ teeth", emoji: "📊" },
                ]
            },
            {
                id: "neighbors", label: "Condition of neighbouring teeth?", options: [
                    { value: "healthy", label: "Healthy, no fillings", emoji: "✅" },
                    { value: "restored", label: "With fillings or crowns", emoji: "🔧" },
                ]
            },
        ],
    },
    {
        id: "implant_timing", categoryId: "braki",
        title: "Implant: immediate vs delayed", subtitle: "Right after extraction vs after healing",
        icon: "⏱️", color: "#38bdf8", methodIds: ["implant_immediate", "implant_delayed"],
        questions: [
            {
                id: "infection", label: "Is there inflammation / abscess?", options: [
                    { value: "no", label: "No, the tooth is calm", emoji: "✅" },
                    { value: "yes", label: "Yes, there is infection", emoji: "🔴" },
                ]
            },
            {
                id: "zone", label: "Where is the tooth?", options: [
                    { value: "aesthetic", label: "Smile zone", emoji: "😁" },
                    { value: "posterior", label: "Back teeth", emoji: "🔨" },
                ]
            },
            {
                id: "bone", label: "What does the doctor say about bone?", options: [
                    { value: "good", label: "Sufficient bone", emoji: "💪" },
                    { value: "deficient", label: "Bone deficiency / augmentation needed", emoji: "📉" },
                ]
            },
        ],
    },
    {
        id: "bridge_types", categoryId: "braki",
        title: "Fixed replacement", subtitle: "Implant+crown vs tooth-supported bridge vs implant bridge",
        icon: "🌉", color: "#f59e0b", methodIds: ["implant", "bridge_on_teeth", "bridge_on_implants"],
        questions: [
            {
                id: "gap_count", label: "How many adjacent teeth are missing?", options: [
                    { value: "one", label: "1 tooth", emoji: "1️⃣" },
                    { value: "two_three", label: "2–3 teeth", emoji: "🔢" },
                    { value: "more", label: "4+ teeth", emoji: "📊" },
                ]
            },
            {
                id: "abutment", label: "Condition of abutment teeth?", options: [
                    { value: "healthy", label: "Healthy", emoji: "✅" },
                    { value: "restored", label: "With crowns/large fillings", emoji: "🔧" },
                ]
            },
            {
                id: "bone_b", label: "Sufficient bone for implants?", options: [
                    { value: "yes", label: "Yes", emoji: "💪" },
                    { value: "no", label: "No / I don't know", emoji: "❓" },
                ]
            },
        ],
    },
    {
        id: "denture_types", categoryId: "braki",
        title: "Partial denture — which type?", subtitle: "Acrylic vs skeletal vs flexible",
        icon: "⚙️", color: "#10b981", methodIds: ["denture_acrylic", "denture_skeletal", "denture_flexible"],
        questions: [
            {
                id: "missing_count_d", label: "How many teeth are missing?", options: [
                    { value: "few", label: "1–3 teeth", emoji: "1️⃣" },
                    { value: "many", label: "4+ teeth", emoji: "📊" },
                ]
            },
            {
                id: "aesthetics_d", label: "How important is aesthetics?", options: [
                    { value: "critical", label: "Very important — invisible clasps", emoji: "💎" },
                    { value: "ok", label: "I accept visible clasps", emoji: "👍" },
                ]
            },
            {
                id: "duration_d", label: "How long do you plan the denture for?", options: [
                    { value: "temp", label: "Temporarily (before implants)", emoji: "⏳" },
                    { value: "long", label: "Long-term / permanent", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "full_denture", categoryId: "braki",
        title: "Edentulism: denture vs overdenture", subtitle: "Complete denture vs implant-supported denture",
        icon: "🔩", color: "#38bdf8", methodIds: ["full_denture", "overdenture"],
        questions: [
            {
                id: "jaw", label: "Which jaw?", options: [
                    { value: "upper", label: "Upper", emoji: "⬆️" },
                    { value: "lower", label: "Lower", emoji: "⬇️" },
                ]
            },
            {
                id: "stability", label: "Does the denture \"jump\"?", options: [
                    { value: "stable", label: "Holds well", emoji: "✅" },
                    { value: "loose", label: "Loose, falls off when eating", emoji: "😫" },
                ]
            },
            {
                id: "surgery_ok", label: "Do you accept a surgical procedure?", options: [
                    { value: "yes", label: "Yes", emoji: "✅" },
                    { value: "no", label: "No / I'm afraid", emoji: "❌" },
                ]
            },
        ],
    },
    {
        id: "onlay_vs_crown", categoryId: "braki",
        title: "Onlay vs crown", subtitle: "Tissue preservation vs full protection",
        icon: "🧩", color: "#10b981", methodIds: ["onlay", "crown_rebuild"],
        questions: [
            {
                id: "endo_done", label: "Has the tooth had root canal treatment?", options: [
                    { value: "no", label: "No — tooth is vital", emoji: "💚" },
                    { value: "yes", label: "Yes — after endo", emoji: "🔬" },
                ]
            },
            {
                id: "walls", label: "How many crown walls are preserved?", options: [
                    { value: "three_plus", label: "3–4 walls", emoji: "🏰" },
                    { value: "two_less", label: "1–2 walls", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_o", label: "Bruxism?", options: [
                    { value: "no", label: "No", emoji: "😊" },
                    { value: "yes", label: "Yes", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "crown_vs_composite", categoryId: "braki",
        title: "Crown vs composite restoration", subtitle: "Severely damaged tooth — what to choose?",
        icon: "👑", color: "#38bdf8", methodIds: ["crown_rebuild", "composite_rebuild"],
        questions: [
            {
                id: "destruction", label: "How damaged is the tooth?", options: [
                    { value: "moderate", label: "30–50% of crown", emoji: "🟡" },
                    { value: "severe", label: ">50% of crown", emoji: "🔴" },
                ]
            },
            {
                id: "endo_cr", label: "Has it had root canal treatment?", options: [
                    { value: "no", label: "No", emoji: "💚" },
                    { value: "yes", label: "Yes", emoji: "🔬" },
                ]
            },
            {
                id: "position_cr", label: "Which tooth?", options: [
                    { value: "front", label: "Front tooth", emoji: "😁" },
                    { value: "back", label: "Back tooth (molar/premolar)", emoji: "🔨" },
                ]
            },
        ],
    },

    // ═══ ROOT CANAL ═══
    {
        id: "endo_vs_extract", categoryId: "kanalowe",
        title: "Endo vs extraction + implant", subtitle: "Save the tooth or replace it?",
        icon: "⚔️", color: "#f59e0b", methodIds: ["endo", "extract_implant"],
        questions: [
            {
                id: "tooth_state", label: "Tooth condition?", options: [
                    { value: "restorable", label: "Can be restored", emoji: "🔧" },
                    { value: "questionable", label: "Doubtful prognosis", emoji: "❓" },
                    { value: "hopeless", label: "Not salvageable", emoji: "⚠️" },
                ]
            },
            {
                id: "strategic", label: "Is the tooth strategically important?", options: [
                    { value: "yes", label: "Yes (abutment, incisor, key position)", emoji: "⭐" },
                    { value: "no", label: "Does not conflict with treatment plan", emoji: "👍" },
                ]
            },
            {
                id: "time_pref", label: "Speed vs durability?", options: [
                    { value: "save_time", label: "I want it faster — 1–3 visits", emoji: "⚡" },
                    { value: "invest", label: "I invest in durability — I can wait", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "retreatment", categoryId: "kanalowe",
        title: "Re-endo vs resection vs extraction", subtitle: "What if the first endo didn't work?",
        icon: "🔁", color: "#f59e0b", methodIds: ["re_endo", "resection", "extraction_after"],
        questions: [
            {
                id: "previous", label: "Why didn't the first endo work?", options: [
                    { value: "short", label: "Short filling / missed canal", emoji: "📏" },
                    { value: "leakage", label: "Leaky restoration, secondary infection", emoji: "💧" },
                    { value: "anatomy", label: "Difficult anatomy / broken instrument", emoji: "🔧" },
                ]
            },
            {
                id: "post_present", label: "Is there a post in the canal?", options: [
                    { value: "no", label: "No — access from above is possible", emoji: "✅" },
                    { value: "yes", label: "Yes — cannot be removed", emoji: "🔒" },
                ]
            },
            {
                id: "symptoms_r", label: "Symptoms?", options: [
                    { value: "none", label: "None — change only on X-ray", emoji: "📷" },
                    { value: "mild", label: "Mild pain, discomfort", emoji: "🟡" },
                    { value: "acute", label: "Severe pain / swelling / abscess", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "endo_sessions", categoryId: "kanalowe",
        title: "Endo: 1 visit vs 2 visits", subtitle: "Convenience vs safety",
        icon: "📅", color: "#38bdf8", methodIds: ["endo_1visit", "endo_2visit"],
        questions: [
            {
                id: "diagnosis_e", label: "What is the diagnosis?", options: [
                    { value: "pulpitis", label: "Pulpitis (pain from hot/cold)", emoji: "🔥" },
                    { value: "necrosis", label: "Necrosis / lesion on X-ray", emoji: "📷" },
                    { value: "abscess", label: "Abscess / swelling", emoji: "🔴" },
                ]
            },
            {
                id: "anatomy_e", label: "Canal anatomy?", options: [
                    { value: "simple", label: "Simple (1–2 canals)", emoji: "📏" },
                    { value: "complex", label: "Complex (3+ canals, curves)", emoji: "🔀" },
                ]
            },
            {
                id: "preference_e", label: "Your preference?", options: [
                    { value: "one_done", label: "One sitting — get it over with", emoji: "⚡" },
                    { value: "safe", label: "I prefer two shorter visits", emoji: "🛡️" },
                ]
            },
        ],
    },
    {
        id: "post_endo_rebuild", categoryId: "kanalowe",
        title: "Post-endo restoration", subtitle: "Filling vs post + crown",
        icon: "🏗️", color: "#10b981", methodIds: ["filling_post_endo", "post_crown"],
        questions: [
            {
                id: "tooth_type_pe", label: "Which tooth?", options: [
                    { value: "front", label: "Front (incisor, canine)", emoji: "😁" },
                    { value: "back", label: "Back (premolar, molar)", emoji: "🔨" },
                ]
            },
            {
                id: "tissue_loss", label: "How much tissue remains?", options: [
                    { value: "plenty", label: "Plenty — 3–4 walls", emoji: "🏰" },
                    { value: "little", label: "Little — 1–2 walls", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_pe", label: "Bruxism?", options: [
                    { value: "no", label: "No", emoji: "😊" },
                    { value: "yes", label: "Yes", emoji: "😬" },
                ]
            },
        ],
    },

    // ═══ PERIODONTOLOGY ═══
    {
        id: "hygiene_methods", categoryId: "periodontologia",
        title: "Scaling vs AIRFLOW vs curettage", subtitle: "What to choose for tartar and plaque?",
        icon: "💨", color: "#10b981", methodIds: ["scaling", "airflow", "curettage"],
        questions: [
            {
                id: "pockets", label: "Pocket depth?", options: [
                    { value: "none", label: "No pockets / I don't know", emoji: "❓" },
                    { value: "shallow", label: "Up to 4 mm", emoji: "🟡" },
                    { value: "deep", label: ">4 mm", emoji: "🔴" },
                ]
            },
            {
                id: "sensitivity_h", label: "Gum sensitivity?", options: [
                    { value: "normal", label: "Normal", emoji: "👍" },
                    { value: "sensitive", label: "Very sensitive, bleeding", emoji: "🩸" },
                ]
            },
            {
                id: "implants_h", label: "Do you have implants or prosthetic work?", options: [
                    { value: "no", label: "No", emoji: "❌" },
                    { value: "yes", label: "Yes", emoji: "✅" },
                ]
            },
        ],
    },
    {
        id: "gum_treatment", categoryId: "periodontologia",
        title: "Gum treatment — what level?", subtitle: "Hygienisation vs closed curettage vs open curettage",
        icon: "🩺", color: "#10b981", methodIds: ["hygiene_instruct", "curettage_closed", "curettage_open"],
        questions: [
            {
                id: "pockets_g", label: "Pocket depth?", options: [
                    { value: "up_to_4", label: "Up to 4 mm", emoji: "🟡" },
                    { value: "4_to_6", label: "4–6 mm", emoji: "🟠" },
                    { value: "over_6", label: ">6 mm", emoji: "🔴" },
                ]
            },
            {
                id: "bone_loss_g", label: "Bone loss on X-ray?", options: [
                    { value: "none", label: "None / minimal", emoji: "✅" },
                    { value: "moderate", label: "Moderate", emoji: "🟠" },
                    { value: "advanced", label: "Advanced", emoji: "🔴" },
                ]
            },
            {
                id: "compliance", label: "Home hygiene?", options: [
                    { value: "good", label: "Good — I brush 2×, I floss", emoji: "⭐" },
                    { value: "average", label: "Average — I brush but don't floss", emoji: "👍" },
                ]
            },
        ],
    },
    {
        id: "sensitivity", categoryId: "periodontologia",
        title: "Tooth sensitivity", subtitle: "Varnish vs laser vs toothpaste",
        icon: "❄️", color: "#06b6d4", methodIds: ["varnish_sensitivity", "laser_sensitivity", "paste_sensitivity"],
        questions: [
            {
                id: "intensity", label: "How strong is the sensitivity?", options: [
                    { value: "mild", label: "Mild — occasional shivers", emoji: "🟡" },
                    { value: "moderate", label: "Moderate — hurts with cold/hot", emoji: "🟠" },
                    { value: "severe", label: "Severe — spontaneous pain", emoji: "🔴" },
                ]
            },
            {
                id: "cause_s", label: "Probable cause?", options: [
                    { value: "recession", label: "Exposed tooth necks", emoji: "🦷" },
                    { value: "post_scaling", label: "After scaling / whitening", emoji: "🪥" },
                    { value: "unknown", label: "I don't know", emoji: "❓" },
                ]
            },
            {
                id: "tried_paste", label: "Have you tried sensitivity toothpaste?", options: [
                    { value: "no", label: "No", emoji: "❌" },
                    { value: "yes_helped", label: "Yes, it helped", emoji: "✅" },
                    { value: "yes_not", label: "Yes, it didn't help", emoji: "😕" },
                ]
            },
        ],
    },

    // ═══ SURGERY ═══
    {
        id: "extraction_type", categoryId: "chirurgia",
        title: "Extraction: simple vs surgical", subtitle: "Healing time, risk, preparation",
        icon: "🦷", color: "#ef4444", methodIds: ["extract_simple", "extract_surgical"],
        questions: [
            {
                id: "tooth_visible", label: "Is the tooth visible?", options: [
                    { value: "yes", label: "Yes, fully erupted", emoji: "✅" },
                    { value: "partial", label: "Partially erupted", emoji: "🟡" },
                    { value: "no", label: "No — impacted in bone", emoji: "🔴" },
                ]
            },
            {
                id: "roots_ex", label: "Root condition?", options: [
                    { value: "normal", label: "Straight, single root", emoji: "📏" },
                    { value: "complex", label: "Curved, fragile, multiple roots", emoji: "🔀" },
                ]
            },
            {
                id: "inflammation", label: "Inflammation?", options: [
                    { value: "no", label: "None", emoji: "✅" },
                    { value: "yes", label: "Yes — swelling / abscess", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "wisdom_teeth", categoryId: "chirurgia",
        title: "Wisdom teeth: keep vs remove", subtitle: "Checklist of indications and contraindications",
        icon: "🦷", color: "#ef4444", methodIds: ["wisdom_keep", "wisdom_remove"],
        questions: [
            {
                id: "symptoms_w", label: "Is the wisdom tooth causing symptoms?", options: [
                    { value: "none", label: "No — sitting quietly", emoji: "✅" },
                    { value: "occasional", label: "Sometimes hurts / swells", emoji: "🟡" },
                    { value: "frequent", label: "Frequent problems", emoji: "🔴" },
                ]
            },
            {
                id: "position_w", label: "Wisdom tooth position on X-ray?", options: [
                    { value: "erupted", label: "Erupted, in occlusion", emoji: "✅" },
                    { value: "tilted", label: "Tilted, pressing on neighbour", emoji: "↗️" },
                    { value: "impacted", label: "Impacted in bone", emoji: "🔒" },
                ]
            },
            {
                id: "caries_w", label: "Caries in wisdom tooth or neighbour?", options: [
                    { value: "no", label: "None", emoji: "✅" },
                    { value: "yes", label: "Yes", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "sinus_lift", categoryId: "chirurgia",
        title: "Sinus lift: closed vs open", subtitle: "Raising the sinus floor before implant",
        icon: "🔼", color: "#38bdf8", methodIds: ["sinus_closed", "sinus_open"],
        questions: [
            {
                id: "bone_height", label: "How much residual bone?", options: [
                    { value: "enough", label: "5–7 mm (missing 1–3 mm)", emoji: "🟡" },
                    { value: "little", label: "<5 mm (large deficiency)", emoji: "🔴" },
                ]
            },
            {
                id: "implant_plan", label: "Implant at the same time?", options: [
                    { value: "with", label: "Yes — implant + sinus in one session", emoji: "⚡" },
                    { value: "staged", label: "No — bone first, then implant", emoji: "📅" },
                ]
            },
            {
                id: "sinus_health", label: "Sinus condition?", options: [
                    { value: "healthy", label: "Healthy", emoji: "✅" },
                    { value: "issues", label: "Polyp / chronic inflammation", emoji: "⚠️" },
                ]
            },
        ],
    },

    // ═══ PREVENTION ═══
    {
        id: "toothbrush", categoryId: "profilaktyka",
        title: "Toothbrush: manual vs electric vs sonic", subtitle: "What cleans best?",
        icon: "🪥", color: "#06b6d4", methodIds: ["brush_manual", "brush_electric", "brush_sonic"],
        questions: [
            {
                id: "gums", label: "Gum condition?", options: [
                    { value: "healthy", label: "Healthy", emoji: "✅" },
                    { value: "sensitive", label: "Sensitive / bleeding", emoji: "🩸" },
                    { value: "receding", label: "Recessions", emoji: "📉" },
                ]
            },
            {
                id: "prosthetics", label: "Do you have implants/bridges/veneers?", options: [
                    { value: "no", label: "No", emoji: "❌" },
                    { value: "yes", label: "Yes", emoji: "✅" },
                ]
            },
            {
                id: "technique", label: "Brushing technique?", options: [
                    { value: "good", label: "Mastered (Bass method)", emoji: "⭐" },
                    { value: "average", label: "Average / I don't know", emoji: "🤷" },
                ]
            },
        ],
    },
    {
        id: "interdental", categoryId: "profilaktyka",
        title: "Floss vs interdental brushes vs irrigator", subtitle: "Interdental cleaning — what to choose?",
        icon: "🧵", color: "#06b6d4", methodIds: ["floss", "interdental_brush", "irrigator"],
        questions: [
            {
                id: "spaces", label: "Spaces between teeth?", options: [
                    { value: "tight", label: "Tight", emoji: "📏" },
                    { value: "normal", label: "Normal", emoji: "👍" },
                    { value: "wide", label: "Wide (after perio, bridges)", emoji: "↔️" },
                ]
            },
            {
                id: "prosthetics_i", label: "Bridges, implants, braces?", options: [
                    { value: "no", label: "No", emoji: "❌" },
                    { value: "yes", label: "Yes", emoji: "✅" },
                ]
            },
            {
                id: "dexterity", label: "Manual dexterity?", options: [
                    { value: "good", label: "Good — I can floss", emoji: "👍" },
                    { value: "limited", label: "Limited — flossing is difficult", emoji: "😅" },
                ]
            },
        ],
    },
    {
        id: "bruxism_guard", categoryId: "profilaktyka",
        title: "Bruxism: guard vs nothing", subtitle: "Risk of wear and tooth fractures",
        icon: "🛡️", color: "#ef4444", methodIds: ["splint_guard", "no_guard"],
        questions: [
            {
                id: "symptoms_br", label: "Bruxism symptoms?", options: [
                    { value: "mild", label: "Mild jaw tension in the morning", emoji: "🟡" },
                    { value: "moderate", label: "Visible wear, headaches", emoji: "🟠" },
                    { value: "severe", label: "Fractures, severe wear, TMJ pain", emoji: "🔴" },
                ]
            },
            {
                id: "wear_visible", label: "Wear on teeth?", options: [
                    { value: "no", label: "None visible", emoji: "✅" },
                    { value: "yes", label: "Yes", emoji: "⚠️" },
                ]
            },
            {
                id: "willing_br", label: "Will you wear a guard at night?", options: [
                    { value: "yes", label: "Yes, no problem", emoji: "✅" },
                    { value: "maybe", label: "I'll try", emoji: "🤔" },
                ]
            },
        ],
    },

    // ═══ CHILDREN ═══
    {
        id: "sealant_vs_fluoride", categoryId: "dzieci",
        title: "Sealant vs fluoridation vs infiltration", subtitle: "Caries prevention in children",
        icon: "🛡️", color: "#ec4899", methodIds: ["sealant", "fluoride_varnish", "icon_infiltration"],
        questions: [
            {
                id: "tooth_status", label: "Tooth condition?", options: [
                    { value: "healthy", label: "Healthy, deep fissures", emoji: "✅" },
                    { value: "white_spot", label: "White spot — early demineralisation", emoji: "⚪" },
                    { value: "general", label: "General prevention", emoji: "🛡️" },
                ]
            },
            {
                id: "age_child", label: "Child's age?", options: [
                    { value: "under_6", label: "Under 6 years", emoji: "👶" },
                    { value: "6_12", label: "6–12 years", emoji: "🧒" },
                    { value: "teen", label: "Teenager", emoji: "🧑" },
                ]
            },
            {
                id: "risk_caries", label: "Caries risk?", options: [
                    { value: "low", label: "Low", emoji: "🟢" },
                    { value: "high", label: "High", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "fluoride_method", categoryId: "dzieci",
        title: "Fluoridation: in-office vs at-home", subtitle: "Maintenance, frequency, effectiveness",
        icon: "💧", color: "#ec4899", methodIds: ["fluoride_office", "fluoride_home"],
        questions: [
            {
                id: "caries_risk_f", label: "Caries risk?", options: [
                    { value: "low", label: "Low", emoji: "🟢" },
                    { value: "high", label: "High (family history, sweets)", emoji: "🔴" },
                ]
            },
            {
                id: "age_f", label: "Child's age?", options: [
                    { value: "under_3", label: "Under 3 years", emoji: "👶" },
                    { value: "over_3", label: "3+ years", emoji: "🧒" },
                ]
            },
            {
                id: "visits_freq", label: "How often can you visit?", options: [
                    { value: "regular", label: "Every 3–6 months", emoji: "📅" },
                    { value: "rare", label: "Rarely", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "baby_tooth_caries", categoryId: "dzieci",
        title: "Baby tooth caries", subtitle: "Filling vs pulp treatment vs extraction",
        icon: "🧒", color: "#ec4899", methodIds: ["baby_filling", "baby_pulpotomy", "baby_extraction"],
        questions: [
            {
                id: "depth", label: "Caries depth?", options: [
                    { value: "shallow", label: "Shallow/medium — no pulp involvement", emoji: "🟡" },
                    { value: "deep", label: "Deep — near or in the pulp", emoji: "🟠" },
                    { value: "abscess", label: "Abscess / fistula", emoji: "🔴" },
                ]
            },
            {
                id: "exchange", label: "When does the permanent tooth come in?", options: [
                    { value: "far", label: ">2 years", emoji: "⏳" },
                    { value: "soon", label: "<1 year", emoji: "⚡" },
                ]
            },
            {
                id: "cooperation", label: "Child's cooperation?", options: [
                    { value: "good", label: "Good — sits still", emoji: "😊" },
                    { value: "difficult", label: "Difficult — cries, won't open", emoji: "😢" },
                ]
            },
        ],
    },
];
