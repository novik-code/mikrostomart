// ───────────────────────────────────────────────────────────────────────────
// Treatment Time Calculator — English Data
// ───────────────────────────────────────────────────────────────────────────

import type { Question, Variant, TreatmentPath } from "./treatmentData";

// ═══════════════════════════════════════════════════════════════════════════
// A) ENDODONTICS
// ═══════════════════════════════════════════════════════════════════════════

const endoQuestions_EN: Question[] = [
    {
        id: "history",
        text: "Has the tooth been root-canal treated before?",
        options: [
            { value: "first", label: "First time", emoji: "🆕" },
            { value: "retreatment", label: "Re-treatment", emoji: "🔄" },
        ],
    },
    {
        id: "tooth",
        text: "Which tooth needs treatment?",
        options: [
            { value: "front", label: "Front (incisor / canine)", emoji: "🦷" },
            { value: "premolar", label: "Premolar", emoji: "🦷" },
            { value: "molar", label: "Molar", emoji: "🦷" },
            { value: "unknown", label: "I don't know", emoji: "❓" },
        ],
    },
    {
        id: "symptoms",
        text: "Do you have acute symptoms?",
        options: [
            { value: "none", label: "No symptoms", emoji: "✅" },
            { value: "pain", label: "Severe pain", emoji: "😣" },
            { value: "swelling", label: "Swelling / fistula", emoji: "🔴" },
        ],
    },
    {
        id: "xray",
        text: "Do you have an X-ray or CBCT from the last 12 months?",
        options: [
            { value: "yes", label: "Yes", emoji: "✅" },
            { value: "no", label: "No", emoji: "❌" },
        ],
    },
];

function getEndoVariant_EN(answers: Record<string, string>): Variant {
    const isRetreament = answers.history === "retreatment";
    const isMolar = answers.tooth === "molar" || answers.tooth === "unknown";
    const hasAcute = answers.symptoms === "pain" || answers.symptoms === "swelling";
    const noXray = answers.xray === "no";

    if (isRetreament) {
        return {
            id: "endo-3",
            label: "Root canal re-treatment",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 42,
            durationLabel: "1–6 weeks",
            recommendedSpecialist: "marcin",
            stages: [
                {
                    name: "Extended diagnostics",
                    description: "3D CBCT, vitality tests, assessment of previous treatment and re-endo plan.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 days",
                },
                {
                    name: "Re-endo under microscope",
                    description: "Removal of old canal filling, cleaning and re-preparation under the operating microscope.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 21, gapLabel: "7–21 days",
                },
                {
                    name: "Follow-up visit",
                    description: "Healing check, dressing change, assessment of treatment response.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days",
                    conditional: "endo-3",
                },
                {
                    name: "Check-up and restoration plan",
                    description: "Treatment outcome assessment, tooth restoration plan (filling or crown).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "as planned",
                },
            ],
            extendingFactors: [
                "Unusual canal anatomy (extra canals, curvatures)",
                "Broken instrument in canal requiring removal",
                "Large periapical lesions requiring longer healing",
                "Need for intermediate stage with medicated dressing",
                "Additional CBCT diagnostics",
            ],
        };
    }

    if (isMolar) {
        return {
            id: "endo-2",
            label: "Molar root canal treatment",
            visitsMin: 1 + (hasAcute ? 1 : 0),
            visitsMax: 3,
            durationMinDays: 1,
            durationMaxDays: 21,
            durationLabel: "1–21 days",
            recommendedSpecialist: "ilona",
            stages: [
                {
                    name: "Qualification and diagnostics",
                    description: "X-ray/CBCT, pulp vitality tests, tooth condition assessment and treatment plan.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 days",
                },
                {
                    name: "Root canal treatment under microscope",
                    description: "Preparation of 3–4 molar canals under the operating microscope. Precise cleaning and filling.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "as needed",
                },
                {
                    name: "Follow-up visit",
                    description: "Dressing check, healing assessment — needed in acute cases.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days",
                    conditional: "endo-2",
                },
                {
                    name: "Check-up and restoration plan",
                    description: "Treatment assessment, tooth restoration plan (composite filling or prosthetic crown).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 days",
                },
            ],
            extendingFactors: [
                "Inflammation requiring calming before treatment",
                "Unusual canal anatomy (extra canals)",
                "Need for CBCT for precise diagnostics",
                "Intermediate stage with medicated dressing",
            ],
        };
    }

    return {
        id: "endo-1",
        label: "Root canal treatment — simple case",
        visitsMin: 1,
        visitsMax: 2,
        durationMinDays: 1,
        durationMaxDays: 14,
        durationLabel: "1–14 days",
        recommendedSpecialist: "ilona",
        stages: [
            {
                name: "Qualification and diagnostics",
                description: "Digital X-ray, pulp vitality tests, treatment plan discussion.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 days",
            },
            {
                name: "Root canal treatment under microscope",
                description: "Canal cleaning and preparation under the operating microscope with up to 25× magnification.",
                durationMin: 60, durationMax: 120,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "as needed",
            },
            {
                name: "Check-up and restoration plan",
                description: "Follow-up X-ray, treatment outcome assessment, restoration plan (filling or crown).",
                durationMin: 20, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 days",
            },
        ],
        extendingFactors: [
            "Additional diagnostics (CBCT) for unusual anatomy",
            "Inflammation requiring calming",
            "Need for crown restoration instead of filling",
            noXray ? "No current X-ray — additional diagnostic visit" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// B) IMPLANT
// ═══════════════════════════════════════════════════════════════════════════

const implantQuestions_EN: Question[] = [
    {
        id: "status",
        text: "Is the tooth already missing or does it need extraction?",
        options: [
            { value: "missing", label: "Missing tooth", emoji: "⬜" },
            { value: "extraction", label: "Tooth to be extracted", emoji: "🔧" },
            { value: "unknown", label: "I don't know", emoji: "❓" },
        ],
    },
    {
        id: "location",
        text: "Where is it located?",
        options: [
            { value: "front", label: "Front (smile zone)", emoji: "😁" },
            { value: "side", label: "Side (molars / premolars)", emoji: "🦷" },
        ],
    },
    {
        id: "cbct",
        text: "Do you have a current CBCT scan?",
        options: [
            { value: "yes", label: "Yes", emoji: "✅" },
            { value: "no", label: "No", emoji: "❌" },
        ],
    },
    {
        id: "augmentation",
        text: "Do you expect a need for bone augmentation?",
        options: [
            { value: "no", label: "No / probably not", emoji: "✅" },
            { value: "possible", label: "Possibly", emoji: "🤔" },
            { value: "unknown", label: "I don't know", emoji: "❓" },
        ],
    },
    {
        id: "temporary",
        text: "Would you like a temporary tooth during healing?",
        options: [
            { value: "yes", label: "Yes", emoji: "✅" },
            { value: "no", label: "No", emoji: "❌" },
        ],
    },
];

function getImplantVariant_EN(answers: Record<string, string>): Variant {
    const needsAugmentation = answers.augmentation === "possible" || answers.augmentation === "unknown";
    const needsExtraction = answers.extraction === "extraction" || answers.status === "extraction";
    const isFront = answers.location === "front";

    if (needsAugmentation) {
        return {
            id: "impl-2",
            label: "Implant with bone augmentation / sinus lift",
            visitsMin: 4,
            visitsMax: 7,
            durationMinDays: 150,
            durationMaxDays: 270,
            durationLabel: "5–9 months",
            recommendedSpecialist: "marcin",
            stages: [
                {
                    name: "Consultation and diagnostics",
                    description: "Clinical examination, 3D CBCT, discussion of treatment options and surgical plan.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 days",
                },
                {
                    name: "Bone augmentation / sinus lift",
                    description: "Augmentation procedure — bone graft or maxillary sinus floor elevation (sinus lift) to create a foundation for the implant.",
                    durationMin: 45, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 90, gapToNextMax: 180, gapLabel: "3–6 months healing",
                },
                {
                    name: "Implant placement",
                    description: "Precise insertion of the titanium implant into the augmented bone.",
                    durationMin: 45, durationMax: 90,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 weeks osseointegration",
                },
                {
                    name: "Follow-up / suture removal",
                    description: "Healing check, suture removal, follow-up X-ray.",
                    durationMin: 15, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days",
                },
                {
                    name: "Digital scan and impressions",
                    description: "3D digital scan for designing the prosthetic crown on the implant.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days (laboratory)",
                },
                {
                    name: "Crown placement on implant",
                    description: "Final prosthetic crown — the end result: a new tooth.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
                },
            ],
            extendingFactors: [
                "Scope of bone augmentation (small graft vs full augmentation)",
                "Smile zone aesthetics — additional soft tissue modeling",
                "Inflammation treatment prior to implantation",
                "Osseointegration time depends on bone quality",
                needsExtraction ? "Tooth extraction before augmentation — additional stage" : "",
            ].filter(Boolean),
        };
    }

    return {
        id: "impl-1",
        label: "Implant — standard pathway",
        visitsMin: 3 + (needsExtraction ? 1 : 0),
        visitsMax: 5 + (needsExtraction ? 1 : 0),
        durationMinDays: 90,
        durationMaxDays: 180,
        durationLabel: "3–6 months",
        recommendedSpecialist: "marcin",
        stages: [
            {
                name: "Consultation and diagnostics",
                description: "Clinical examination, 3D CBCT, implant treatment plan, discussion of options.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 days",
            },
            ...(needsExtraction ? [{
                name: "Tooth extraction",
                description: "Tooth removal with socket preservation — preparation for implantation.",
                durationMin: 20, durationMax: 45,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 14, gapToNextMax: 60, gapLabel: "2–8 weeks healing",
            }] : []),
            {
                name: "Implant placement",
                description: "Titanium implant insertion. Procedure under local anesthesia, often painless.",
                durationMin: 45, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 weeks osseointegration",
            },
            {
                name: "Follow-up / suture removal",
                description: "Healing check after 7–14 days, suture removal, follow-up X-ray.",
                durationMin: 15, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days",
            },
            {
                name: "Digital scan and impressions",
                description: "3D digital scan for designing the prosthetic crown on the implant.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days (laboratory)",
            },
            {
                name: "Crown placement on implant",
                description: "Final crown — natural appearance and function like your own tooth.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
            },
        ],
        extendingFactors: [
            "Osseointegration time depends on patient's bone quality",
            isFront ? "Aesthetic zone — may require additional tissue modeling" : "",
            "Possible gingival former fitting — additional visit",
            needsExtraction ? "Healing after extraction before implantation" : "",
            "CBCT needed (if no current scan available)",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// C) PROSTHETICS
// ═══════════════════════════════════════════════════════════════════════════

const protetykaQuestions_EN: Question[] = [
    {
        id: "type",
        text: "What type of restoration do you need?",
        options: [
            { value: "crown", label: "Crown", emoji: "👑" },
            { value: "onlay", label: "Onlay / inlay", emoji: "🔲" },
            { value: "bridge", label: "Bridge", emoji: "🌉" },
            { value: "unknown", label: "I don't know", emoji: "❓" },
        ],
    },
    {
        id: "endo",
        text: "Has the tooth been root-canal treated?",
        options: [
            { value: "no", label: "No, tooth is vital", emoji: "💚" },
            { value: "yes", label: "Yes, after endo", emoji: "✅" },
            { value: "unknown", label: "I don't know", emoji: "❓" },
        ],
    },
    {
        id: "xray",
        text: "Do you have a current X-ray of this tooth?",
        options: [
            { value: "yes", label: "Yes", emoji: "✅" },
            { value: "no", label: "No", emoji: "❌" },
        ],
    },
    {
        id: "priority",
        text: "What is your priority?",
        options: [
            { value: "fast", label: "As fast as possible", emoji: "⚡" },
            { value: "standard", label: "Standard", emoji: "📅" },
            { value: "comfort", label: "Comfortable, no rush", emoji: "🧘" },
        ],
    },
];

function getProtetykaVariant_EN(answers: Record<string, string>): Variant {
    const isBridge = answers.type === "bridge";
    const needsEndoCheck = answers.endo === "unknown";

    if (isBridge) {
        return {
            id: "prot-2",
            label: "Dental bridge",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 weeks",
            recommendedSpecialist: "ilona",
            stages: [
                {
                    name: "Qualification and planning",
                    description: "Clinical examination, X-ray, abutment assessment, prosthetic plan, shade matching.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 days",
                },
                {
                    name: "Abutment preparation + scan/impression",
                    description: "Preparation of abutment teeth, 3D digital scan or traditional impression, temporary bridge.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days (laboratory)",
                },
                {
                    name: "Try-in (optional)",
                    description: "Bridge framework fit check, adjustments before final finishing.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 days",
                    conditional: "prot-2",
                },
                {
                    name: "Bridge cementation",
                    description: "Final bridge placement, occlusion and contact point check.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
                },
            ],
            extendingFactors: [
                "Need for root canal treatment of abutment before bridge",
                "Abutment core build-up",
                "Occlusion adjustments after cementation",
                "Longer laboratory stage for larger works",
                needsEndoCheck ? "Need to verify abutment teeth vitality" : "",
            ].filter(Boolean),
        };
    }

    return {
        id: "prot-1",
        label: answers.type === "onlay" ? "Onlay / inlay" : "Prosthetic crown",
        visitsMin: 2,
        visitsMax: 3,
        durationMinDays: 5,
        durationMaxDays: 14,
        durationLabel: "5–14 days",
        recommendedSpecialist: "ilona",
        stages: [
            {
                name: "Qualification and imaging",
                description: "Clinical examination, X-ray, tooth assessment, prosthetic plan, shade matching.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 days",
            },
            {
                name: "Preparation + scan + temporary",
                description: "Tooth preparation, 3D digital scan, placement of temporary crown/onlay.",
                durationMin: 60, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 5, gapToNextMax: 14, gapLabel: "5–14 days (laboratory)",
            },
            {
                name: "Cementation + check-up",
                description: "Final crown/onlay placement, occlusion and contact point check.",
                durationMin: 30, durationMax: 45,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
            },
        ],
        extendingFactors: [
            "Need for core build-up before crown",
            "Root canal treatment before prosthetic restoration",
            "Contact and fit adjustments",
            "Prosthetic laboratory timelines",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// D) BONDING / AESTHETIC RESTORATION
// ═══════════════════════════════════════════════════════════════════════════

const bondingQuestions_EN: Question[] = [
    {
        id: "count",
        text: "How many teeth need restoration?",
        options: [
            { value: "1-2", label: "1–2 teeth", emoji: "1️⃣" },
            { value: "3-4", label: "2–4 teeth", emoji: "🔢" },
            { value: "6-10", label: "6–10 teeth (full smile)", emoji: "😁" },
        ],
    },
    {
        id: "goal",
        text: "What is the goal of the restoration?",
        options: [
            { value: "chip", label: "Chip / fracture", emoji: "💥" },
            { value: "gap", label: "Gap between teeth (diastema)", emoji: "↔️" },
            { value: "wear", label: "Wear / abrasion", emoji: "📐" },
            { value: "shape", label: "Shape / proportion correction", emoji: "✨" },
        ],
    },
    {
        id: "hygiene",
        text: "Professional cleaning in the last 6 months?",
        options: [
            { value: "yes", label: "Yes", emoji: "✅" },
            { value: "no", label: "No", emoji: "❌" },
            { value: "unknown", label: "I don't remember", emoji: "❓" },
        ],
    },
    {
        id: "mockup",
        text: "Would you like to see a preview (mock-up) first?",
        options: [
            { value: "yes", label: "Yes, I want a preview", emoji: "👀" },
            { value: "no", label: "No, I trust the dentist", emoji: "👍" },
        ],
    },
];

function getBondingVariant_EN(answers: Record<string, string>): Variant {
    const count = answers.count;
    const wantsMockup = answers.mockup === "yes";
    const needsHygiene = answers.hygiene === "no" || answers.hygiene === "unknown";

    if (count === "6-10") {
        return {
            id: "bond-3",
            label: "Full aesthetic smile restoration",
            visitsMin: 2 + (wantsMockup ? 1 : 0),
            visitsMax: 3 + (wantsMockup ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 weeks",
            recommendedSpecialist: "marcin",
            stages: [
                ...(needsHygiene ? [{
                    name: "Professional cleaning",
                    description: "Professional teeth cleaning — necessary before bonding for optimal adhesion.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 days",
                }] : []),
                {
                    name: "Planning and photo documentation",
                    description: "Detailed photos, smile analysis, aesthetic plan in consultation with the patient.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: wantsMockup ? 3 : 0, gapToNextMax: wantsMockup ? 7 : 7, gapLabel: wantsMockup ? "3–7 days" : "0–7 days",
                },
                ...(wantsMockup ? [{
                    name: "Mock-up / preview",
                    description: "\"Test drive\" of your new smile — temporary visualization applied to teeth, with adjustment options.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 days",
                }] : []),
                {
                    name: "Composite bonding",
                    description: "Restoration of 6–10 teeth with nanohybrid composite, layer by layer, with shade and shape matching.",
                    durationMin: 120, durationMax: 240,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
                },
            ],
            extendingFactors: [
                "Need for cleaning before bonding",
                "Mock-up iterations (adjustments before final bonding)",
                "Extensive bonding may require 2 treatment sessions",
                "Whitening before bonding (for optimal shade match)",
            ],
        };
    }

    if (count === "3-4") {
        return {
            id: "bond-2",
            label: "Aesthetic restoration of 2–4 teeth",
            visitsMin: 1,
            visitsMax: 2,
            durationMinDays: 1,
            durationMaxDays: 14,
            durationLabel: "1–14 days",
            recommendedSpecialist: "katarzyna",
            stages: [
                {
                    name: "Planning and photos",
                    description: "Photo documentation, aesthetic plan, composite shade selection.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 days",
                },
                {
                    name: "Composite bonding",
                    description: "Precise restoration of 2–4 teeth with composite — shape, shade, surface texture.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
                },
            ],
            extendingFactors: [
                "Need for cleaning before procedure",
                "Need for shade matching with whitened teeth",
                "Extensive bonding may require a longer session",
            ],
        };
    }

    return {
        id: "bond-1",
        label: "1–2 teeth repair (bonding)",
        visitsMin: 1,
        visitsMax: 1,
        durationMinDays: 1,
        durationMaxDays: 1,
        durationLabel: "1 day",
        recommendedSpecialist: "katarzyna",
        stages: [
            {
                name: "Bonding restoration",
                description: "Damaged tooth restoration with composite — chip repair, gap closure, or shape correction.",
                durationMin: 45, durationMax: 90,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
            },
        ],
        extendingFactors: [
            "Need for cleaning before procedure",
            "Extensive repair may require anesthesia",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// E) WHITENING
// ═══════════════════════════════════════════════════════════════════════════

const wybielanieQuestions_EN: Question[] = [
    {
        id: "method",
        text: "Which whitening method interests you?",
        options: [
            { value: "office", label: "In-office (quick)", emoji: "⚡" },
            { value: "home", label: "Tray-based (at home)", emoji: "🏠" },
            { value: "combined", label: "Combined (office + home)", emoji: "🔄" },
            { value: "unknown", label: "I don't know, advise me", emoji: "❓" },
        ],
    },
    {
        id: "hygiene",
        text: "Professional cleaning in the last 6 months?",
        options: [
            { value: "yes", label: "Yes", emoji: "✅" },
            { value: "no", label: "No", emoji: "❌" },
        ],
    },
    {
        id: "sensitivity",
        text: "Do you have sensitive teeth?",
        options: [
            { value: "no", label: "No", emoji: "✅" },
            { value: "yes", label: "Yes, sensitivity", emoji: "😬" },
        ],
    },
];

function getWybielanieVariant_EN(answers: Record<string, string>): Variant {
    const method = answers.method;
    const needsHygiene = answers.hygiene === "no";

    if (method === "home") {
        return {
            id: "white-2",
            label: "Tray-based whitening (at home)",
            visitsMin: 1 + (needsHygiene ? 1 : 0),
            visitsMax: 2 + (needsHygiene ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 14,
            durationLabel: "7–14 days",
            recommendedSpecialist: "malgorzata",
            stages: [
                ...(needsHygiene ? [{
                    name: "Professional cleaning",
                    description: "Mandatory teeth cleaning before whitening — removal of tartar and deposits.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 days",
                }] : []),
                {
                    name: "Scan / impression + instructions",
                    description: "Digital scan or impression for custom whitening trays. Gel application instructions.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 days of gel use",
                },
                {
                    name: "Result check-up",
                    description: "Shade comparison, result assessment, maintenance tips.",
                    durationMin: 15, durationMax: 20,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
                },
            ],
            extendingFactors: [
                "Need for cleaning before whitening",
                "Sensitivity — slower schedule with breaks",
                "Intense staining may require longer use",
            ],
        };
    }

    return {
        id: "white-1",
        label: method === "combined" ? "Combined whitening (office + trays)" : "In-office whitening",
        recommendedSpecialist: "malgorzata",
        visitsMin: 1 + (needsHygiene ? 1 : 0),
        visitsMax: 2 + (needsHygiene ? 1 : 0),
        durationMinDays: 1,
        durationMaxDays: method === "combined" ? 14 : 7,
        durationLabel: method === "combined" ? "1–14 days" : "1–7 days",
        stages: [
            ...(needsHygiene ? [{
                name: "Professional cleaning",
                description: "Mandatory teeth cleaning before whitening — better and more even results.",
                durationMin: 40, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 days",
            }] : []),
            {
                name: "Qualification and baseline shade",
                description: "Tooth shade assessment (VITA scale), gum protection, preparation for procedure.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "same day",
            },
            {
                name: "In-office whitening",
                description: "Professional whitening gel application with LED light activation. 2–3 cycles of 15 min.",
                durationMin: 60, durationMax: 90,
                anesthesia: false, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: method === "combined" ? "home trays 7–14 days" : "optional check-up",
            },
            {
                name: "Result check-up",
                description: "Comparison with baseline shade, result assessment, diet and care recommendations.",
                durationMin: 15, durationMax: 20,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "done ✓",
            },
        ],
        extendingFactors: [
            "Need for cleaning before procedure",
            "Sensitivity — desensitization needed before/after",
            "Intense staining (tetracyclines) — longer program",
            method === "combined" ? "Home phase adds 7–14 days" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const TREATMENT_PATHS_EN: TreatmentPath[] = [
    {
        id: "endo",
        title: "Root Canal Treatment",
        subtitle: "Endodontics under microscope",
        icon: "🔬",
        color: "#f59e0b",
        questions: endoQuestions_EN,
        getVariant: getEndoVariant_EN,
    },
    {
        id: "implant",
        title: "Dental Implant",
        subtitle: "From consultation to crown",
        icon: "🦷",
        color: "#3b82f6",
        questions: implantQuestions_EN,
        getVariant: getImplantVariant_EN,
    },
    {
        id: "protetyka",
        title: "Prosthetics",
        subtitle: "Crown, onlay, or bridge",
        icon: "👑",
        color: "#8b5cf6",
        questions: protetykaQuestions_EN,
        getVariant: getProtetykaVariant_EN,
    },
    {
        id: "bonding",
        title: "Bonding / Aesthetics",
        subtitle: "Aesthetic composite restoration",
        icon: "✨",
        color: "#ec4899",
        questions: bondingQuestions_EN,
        getVariant: getBondingVariant_EN,
    },
    {
        id: "wybielanie",
        title: "Whitening",
        subtitle: "In-office or tray-based",
        icon: "💎",
        color: "#06b6d4",
        questions: wybielanieQuestions_EN,
        getVariant: getWybielanieVariant_EN,
    },
];

export function formatDuration_EN(days: number): string {
    if (days <= 1) return "1 day";
    if (days < 7) return `${days} days`;
    if (days === 7) return "1 week";
    if (days < 30) {
        const weeks = Math.round(days / 7);
        return `${weeks} wk.`;
    }
    const months = Math.round(days / 30);
    if (months === 1) return "1 month";
    return `${months} months`;
}
