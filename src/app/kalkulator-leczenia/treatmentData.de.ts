// ───────────────────────────────────────────────────────────────────────────
// Treatment Time Calculator — German Data
// ───────────────────────────────────────────────────────────────────────────

import type { Question, Variant, TreatmentPath } from "./treatmentData";

// ═══════════════════════════════════════════════════════════════════════════
// A) ENDODONTIE
// ═══════════════════════════════════════════════════════════════════════════

const endoQuestions_DE: Question[] = [
    {
        id: "history",
        text: "Wurde der Zahn bereits wurzelbehandelt?",
        options: [
            { value: "first", label: "Erste Behandlung", emoji: "🆕" },
            { value: "retreatment", label: "Wiederholungsbehandlung", emoji: "🔄" },
        ],
    },
    {
        id: "tooth",
        text: "Welcher Zahn muss behandelt werden?",
        options: [
            { value: "front", label: "Frontzahn (Schneide-/Eckzahn)", emoji: "🦷" },
            { value: "premolar", label: "Prämolar", emoji: "🦷" },
            { value: "molar", label: "Molar (Backenzahn)", emoji: "🦷" },
            { value: "unknown", label: "Ich weiß nicht", emoji: "❓" },
        ],
    },
    {
        id: "symptoms",
        text: "Haben Sie akute Beschwerden?",
        options: [
            { value: "none", label: "Keine Beschwerden", emoji: "✅" },
            { value: "pain", label: "Starke Schmerzen", emoji: "😣" },
            { value: "swelling", label: "Schwellung / Fistel", emoji: "🔴" },
        ],
    },
    {
        id: "xray",
        text: "Haben Sie ein Röntgenbild oder CBCT der letzten 12 Monate?",
        options: [
            { value: "yes", label: "Ja", emoji: "✅" },
            { value: "no", label: "Nein", emoji: "❌" },
        ],
    },
];

function getEndoVariant_DE(answers: Record<string, string>): Variant {
    const isRetreament = answers.history === "retreatment";
    const isMolar = answers.tooth === "molar" || answers.tooth === "unknown";
    const hasAcute = answers.symptoms === "pain" || answers.symptoms === "swelling";
    const noXray = answers.xray === "no";

    if (isRetreament) {
        return {
            id: "endo-3",
            label: "Wurzelkanal-Revision",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 42,
            durationLabel: "1–6 Wochen",
            recommendedSpecialist: "marcin",
            stages: [
                {
                    name: "Erweiterte Diagnostik",
                    description: "3D-CBCT, Vitalitätstests, Bewertung der Vorbehandlung und Revisionsplan.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 Tage",
                },
                {
                    name: "Revision unter Mikroskop",
                    description: "Entfernung der alten Kanalfüllung, Reinigung und erneute Aufbereitung unter dem OP-Mikroskop.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 21, gapLabel: "7–21 Tage",
                },
                {
                    name: "Zwischenbesuch",
                    description: "Heilungskontrolle, Verbandwechsel, Beurteilung des Behandlungsansprechens.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage",
                    conditional: "endo-3",
                },
                {
                    name: "Kontrolle und Aufbauplan",
                    description: "Bewertung des Behandlungsergebnisses, Plan für den Zahnaufbau (Füllung oder Krone).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "nach Plan",
                },
            ],
            extendingFactors: [
                "Ungewöhnliche Kanalanatomie (Zusatzkanäle, Krümmungen)",
                "Frakturiertes Instrument im Kanal zur Entfernung",
                "Große periapikale Läsionen mit längerer Heilung",
                "Zwischenstadium mit medikamentöser Einlage",
                "Zusätzliche CBCT-Diagnostik",
            ],
        };
    }

    if (isMolar) {
        return {
            id: "endo-2",
            label: "Wurzelbehandlung eines Molaren",
            visitsMin: 1 + (hasAcute ? 1 : 0),
            visitsMax: 3,
            durationMinDays: 1,
            durationMaxDays: 21,
            durationLabel: "1–21 Tage",
            recommendedSpecialist: "ilona",
            stages: [
                {
                    name: "Diagnostik und Qualifizierung",
                    description: "Röntgen/CBCT, Pulpa-Vitalitätstests, Zahnzustandsbewertung und Behandlungsplan.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 Tage",
                },
                {
                    name: "Wurzelbehandlung unter Mikroskop",
                    description: "Aufbereitung von 3–4 Molarkanälen unter dem OP-Mikroskop. Präzise Reinigung und Füllung.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "nach Bedarf",
                },
                {
                    name: "Zwischenbesuch",
                    description: "Verbandkontrolle, Heilungsbeurteilung — bei akuten Beschwerden erforderlich.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage",
                    conditional: "endo-2",
                },
                {
                    name: "Kontrolle und Aufbauplan",
                    description: "Behandlungsbewertung, Plan für den Zahnaufbau (Kompositfüllung oder prothetische Krone).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 Tage",
                },
            ],
            extendingFactors: [
                "Entzündung muss vor Behandlung beruhigt werden",
                "Ungewöhnliche Kanalanatomie (Zusatzkanäle)",
                "CBCT für präzise Diagnostik erforderlich",
                "Zwischenstadium mit medikamentöser Einlage",
            ],
        };
    }

    return {
        id: "endo-1",
        label: "Wurzelbehandlung — einfacher Fall",
        visitsMin: 1,
        visitsMax: 2,
        durationMinDays: 1,
        durationMaxDays: 14,
        durationLabel: "1–14 Tage",
        recommendedSpecialist: "ilona",
        stages: [
            {
                name: "Diagnostik und Qualifizierung",
                description: "Digitales Röntgen, Pulpa-Vitalitätstests, Besprechung des Behandlungsplans.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 Tage",
            },
            {
                name: "Wurzelbehandlung unter Mikroskop",
                description: "Kanalreinigung und -aufbereitung unter dem OP-Mikroskop mit bis zu 25-facher Vergrößerung.",
                durationMin: 60, durationMax: 120,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "nach Bedarf",
            },
            {
                name: "Kontrolle und Aufbauplan",
                description: "Kontrollröntgen, Bewertung des Behandlungsergebnisses, Aufbauplan (Füllung oder Krone).",
                durationMin: 20, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 Tage",
            },
        ],
        extendingFactors: [
            "Zusätzliche Diagnostik (CBCT) bei ungewöhnlicher Anatomie",
            "Entzündung muss beruhigt werden",
            "Kronenaufbau statt Füllung erforderlich",
            noXray ? "Kein aktuelles Röntgenbild — zusätzlicher Diagnostiktermin" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// B) IMPLANTAT
// ═══════════════════════════════════════════════════════════════════════════

const implantQuestions_DE: Question[] = [
    {
        id: "status",
        text: "Fehlt der Zahn bereits oder muss er gezogen werden?",
        options: [
            { value: "missing", label: "Zahn fehlt", emoji: "⬜" },
            { value: "extraction", label: "Zahn muss gezogen werden", emoji: "🔧" },
            { value: "unknown", label: "Ich weiß nicht", emoji: "❓" },
        ],
    },
    {
        id: "location",
        text: "Wo befindet sich die Stelle?",
        options: [
            { value: "front", label: "Vorne (Lächelzone)", emoji: "😁" },
            { value: "side", label: "Seitlich (Molaren / Prämolaren)", emoji: "🦷" },
        ],
    },
    {
        id: "cbct",
        text: "Haben Sie ein aktuelles CBCT?",
        options: [
            { value: "yes", label: "Ja", emoji: "✅" },
            { value: "no", label: "Nein", emoji: "❌" },
        ],
    },
    {
        id: "augmentation",
        text: "Erwarten Sie einen Knochenaufbau?",
        options: [
            { value: "no", label: "Nein / eher nicht", emoji: "✅" },
            { value: "possible", label: "Möglich", emoji: "🤔" },
            { value: "unknown", label: "Ich weiß nicht", emoji: "❓" },
        ],
    },
    {
        id: "temporary",
        text: "Möchten Sie einen provisorischen Zahn während der Heilung?",
        options: [
            { value: "yes", label: "Ja", emoji: "✅" },
            { value: "no", label: "Nein", emoji: "❌" },
        ],
    },
];

function getImplantVariant_DE(answers: Record<string, string>): Variant {
    const needsAugmentation = answers.augmentation === "possible" || answers.augmentation === "unknown";
    const needsExtraction = answers.extraction === "extraction" || answers.status === "extraction";
    const isFront = answers.location === "front";

    if (needsAugmentation) {
        return {
            id: "impl-2",
            label: "Implantat mit Knochenaufbau / Sinuslift",
            visitsMin: 4,
            visitsMax: 7,
            durationMinDays: 150,
            durationMaxDays: 270,
            durationLabel: "5–9 Monate",
            recommendedSpecialist: "marcin",
            stages: [
                {
                    name: "Beratung und Diagnostik",
                    description: "Klinische Untersuchung, 3D-CBCT, Besprechung der Behandlungsmöglichkeiten und des chirurgischen Plans.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 Tage",
                },
                {
                    name: "Knochenaufbau / Sinuslift",
                    description: "Augmentationseingriff — Knochentransplantat oder Sinusbodenelevation zur Schaffung einer Basis für das Implantat.",
                    durationMin: 45, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 90, gapToNextMax: 180, gapLabel: "3–6 Mon. Heilung",
                },
                {
                    name: "Implantation",
                    description: "Präzises Einsetzen des Titanimplantats in den aufgebauten Knochen.",
                    durationMin: 45, durationMax: 90,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 Wo. Osseointegration",
                },
                {
                    name: "Kontrolle / Nahtentfernung",
                    description: "Heilungskontrolle, Nahtentfernung, Kontrollröntgen.",
                    durationMin: 15, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage",
                },
                {
                    name: "Digitaler Scan und Abdrücke",
                    description: "3D-Digitalscan für die Gestaltung der prothetischen Krone auf dem Implantat.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage (Labor)",
                },
                {
                    name: "Kronenbefestigung auf Implantat",
                    description: "Endgültige prothetische Krone — Endergebnis: ein neuer Zahn.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
                },
            ],
            extendingFactors: [
                "Umfang des Knochenaufbaus (kleines Transplantat vs. vollständige Augmentation)",
                "Ästhetik der Lächelzone — zusätzliche Weichgewebemodellierung",
                "Entzündungsbehandlung vor Implantation",
                "Osseointegrationszeit abhängig von Knochenqualität",
                needsExtraction ? "Zahnextraktion vor Augmentation — zusätzliche Phase" : "",
            ].filter(Boolean),
        };
    }

    return {
        id: "impl-1",
        label: "Implantat — Standardweg",
        visitsMin: 3 + (needsExtraction ? 1 : 0),
        visitsMax: 5 + (needsExtraction ? 1 : 0),
        durationMinDays: 90,
        durationMaxDays: 180,
        durationLabel: "3–6 Monate",
        recommendedSpecialist: "marcin",
        stages: [
            {
                name: "Beratung und Diagnostik",
                description: "Klinische Untersuchung, 3D-CBCT, Implantat-Behandlungsplan, Besprechung der Optionen.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 Tage",
            },
            ...(needsExtraction ? [{
                name: "Zahnextraktion",
                description: "Zahnentfernung mit Alveolenschutz — Vorbereitung für Implantation.",
                durationMin: 20, durationMax: 45,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 14, gapToNextMax: 60, gapLabel: "2–8 Wo. Heilung",
            }] : []),
            {
                name: "Implantation",
                description: "Einsetzen des Titanimplantats. Eingriff unter Lokalanästhesie, oft schmerzfrei.",
                durationMin: 45, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 Wo. Osseointegration",
            },
            {
                name: "Kontrolle / Nahtentfernung",
                description: "Heilungskontrolle nach 7–14 Tagen, Nahtentfernung, Kontrollröntgen.",
                durationMin: 15, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage",
            },
            {
                name: "Digitaler Scan und Abdrücke",
                description: "3D-Digitalscan zur Gestaltung der prothetischen Krone auf dem Implantat.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage (Labor)",
            },
            {
                name: "Kronenbefestigung auf Implantat",
                description: "Endgültige Krone — natürliches Aussehen und Funktion wie ein eigener Zahn.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
            },
        ],
        extendingFactors: [
            "Osseointegrationszeit abhängig von der Knochenqualität des Patienten",
            isFront ? "Ästhetische Zone — möglicherweise zusätzliche Gewebemodellierung" : "",
            "Eventuelles Gingivaformer-Fitting — zusätzlicher Termin",
            needsExtraction ? "Heilung nach Extraktion vor Implantation" : "",
            "CBCT erforderlich (falls kein aktueller Scan vorhanden)",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// C) PROTHETIK
// ═══════════════════════════════════════════════════════════════════════════

const protetykaQuestions_DE: Question[] = [
    {
        id: "type",
        text: "Welche Art von Restauration benötigen Sie?",
        options: [
            { value: "crown", label: "Krone", emoji: "👑" },
            { value: "onlay", label: "Onlay / Inlay", emoji: "🔲" },
            { value: "bridge", label: "Brücke", emoji: "🌉" },
            { value: "unknown", label: "Ich weiß nicht", emoji: "❓" },
        ],
    },
    {
        id: "endo",
        text: "Wurde der Zahn wurzelbehandelt?",
        options: [
            { value: "no", label: "Nein, Zahn lebt", emoji: "💚" },
            { value: "yes", label: "Ja, nach Endo", emoji: "✅" },
            { value: "unknown", label: "Ich weiß nicht", emoji: "❓" },
        ],
    },
    {
        id: "xray",
        text: "Haben Sie ein aktuelles Röntgenbild dieses Zahns?",
        options: [
            { value: "yes", label: "Ja", emoji: "✅" },
            { value: "no", label: "Nein", emoji: "❌" },
        ],
    },
    {
        id: "priority",
        text: "Was ist Ihre Priorität?",
        options: [
            { value: "fast", label: "So schnell wie möglich", emoji: "⚡" },
            { value: "standard", label: "Standard", emoji: "📅" },
            { value: "comfort", label: "Komfortabel, ohne Eile", emoji: "🧘" },
        ],
    },
];

function getProtetykaVariant_DE(answers: Record<string, string>): Variant {
    const isBridge = answers.type === "bridge";
    const needsEndoCheck = answers.endo === "unknown";

    if (isBridge) {
        return {
            id: "prot-2",
            label: "Zahnbrücke",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 Wochen",
            recommendedSpecialist: "ilona",
            stages: [
                {
                    name: "Qualifizierung und Planung",
                    description: "Klinische Untersuchung, Röntgen, Pfeilerbewertung, prothetischer Plan, Farbauswahl.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 Tage",
                },
                {
                    name: "Pfeilerpräparation + Scan/Abdruck",
                    description: "Aufbereitung der Pfeilerzähne, 3D-Digitalscan oder traditioneller Abdruck, provisorische Brücke.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage (Labor)",
                },
                {
                    name: "Einprobe (optional)",
                    description: "Kontrolle der Passgenauigkeit des Brückengerüsts, Korrekturen vor endgültiger Fertigstellung.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 Tage",
                    conditional: "prot-2",
                },
                {
                    name: "Brückenzementierung",
                    description: "Endgültige Brückeneinglierung, Okklusions- und Kontaktpunktkontrolle.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
                },
            ],
            extendingFactors: [
                "Wurzelbehandlung des Pfeilers vor Brücke erforderlich",
                "Stumpfaufbau des Pfeilerzahns",
                "Okklusionskorrekturen nach Zementierung",
                "Längere Laborzeit bei größeren Arbeiten",
                needsEndoCheck ? "Überprüfung der Pfeilerzahnvitalität erforderlich" : "",
            ].filter(Boolean),
        };
    }

    return {
        id: "prot-1",
        label: answers.type === "onlay" ? "Onlay / Inlay" : "Prothetische Krone",
        visitsMin: 2,
        visitsMax: 3,
        durationMinDays: 5,
        durationMaxDays: 14,
        durationLabel: "5–14 Tage",
        recommendedSpecialist: "ilona",
        stages: [
            {
                name: "Qualifizierung und Bildgebung",
                description: "Klinische Untersuchung, Röntgen, Zahnbewertung, prothetischer Plan, Farbauswahl.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 Tage",
            },
            {
                name: "Präparation + Scan + Provisorium",
                description: "Zahnpräparation, 3D-Digitalscan, Einsetzen einer provisorischen Krone/Onlay.",
                durationMin: 60, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 5, gapToNextMax: 14, gapLabel: "5–14 Tage (Labor)",
            },
            {
                name: "Zementierung + Kontrolle",
                description: "Endgültiges Einsetzen der Krone/Onlay, Okklusions- und Kontaktpunktprüfung.",
                durationMin: 30, durationMax: 45,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
            },
        ],
        extendingFactors: [
            "Stumpfaufbau vor Krone erforderlich",
            "Wurzelbehandlung vor prothetischer Versorgung",
            "Kontakt- und Passungskorrekturen",
            "Zahntechnische Labortermine",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// D) BONDING / ÄSTHETISCHE RESTAURATION
// ═══════════════════════════════════════════════════════════════════════════

const bondingQuestions_DE: Question[] = [
    {
        id: "count",
        text: "Wie viele Zähne müssen restauriert werden?",
        options: [
            { value: "1-2", label: "1–2 Zähne", emoji: "1️⃣" },
            { value: "3-4", label: "2–4 Zähne", emoji: "🔢" },
            { value: "6-10", label: "6–10 Zähne (volles Lächeln)", emoji: "😁" },
        ],
    },
    {
        id: "goal",
        text: "Was ist das Ziel der Restauration?",
        options: [
            { value: "chip", label: "Absplitterung / Bruch", emoji: "💥" },
            { value: "gap", label: "Zahnlücke (Diastema)", emoji: "↔️" },
            { value: "wear", label: "Abnutzung / Abrasion", emoji: "📐" },
            { value: "shape", label: "Form-/Proportionskorrektur", emoji: "✨" },
        ],
    },
    {
        id: "hygiene",
        text: "Professionelle Reinigung in den letzten 6 Monaten?",
        options: [
            { value: "yes", label: "Ja", emoji: "✅" },
            { value: "no", label: "Nein", emoji: "❌" },
            { value: "unknown", label: "Ich erinnere mich nicht", emoji: "❓" },
        ],
    },
    {
        id: "mockup",
        text: "Möchten Sie vorher eine Vorschau (Mock-up) sehen?",
        options: [
            { value: "yes", label: "Ja, ich möchte eine Visualisierung", emoji: "👀" },
            { value: "no", label: "Nein, ich vertraue dem Zahnarzt", emoji: "👍" },
        ],
    },
];

function getBondingVariant_DE(answers: Record<string, string>): Variant {
    const count = answers.count;
    const wantsMockup = answers.mockup === "yes";
    const needsHygiene = answers.hygiene === "no" || answers.hygiene === "unknown";

    if (count === "6-10") {
        return {
            id: "bond-3",
            label: "Vollständige ästhetische Lächeln-Restauration",
            visitsMin: 2 + (wantsMockup ? 1 : 0),
            visitsMax: 3 + (wantsMockup ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 Wochen",
            recommendedSpecialist: "marcin",
            stages: [
                ...(needsHygiene ? [{
                    name: "Professionelle Zahnreinigung",
                    description: "Professionelle Zahnreinigung — vor Bonding für optimale Haftung erforderlich.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 Tage",
                }] : []),
                {
                    name: "Planung und Fotodokumentation",
                    description: "Detaillierte Fotos, Lächelanalyse, ästhetischer Plan in Absprache mit dem Patienten.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: wantsMockup ? 3 : 0, gapToNextMax: wantsMockup ? 7 : 7, gapLabel: wantsMockup ? "3–7 Tage" : "0–7 Tage",
                },
                ...(wantsMockup ? [{
                    name: "Mock-up / Vorschau",
                    description: "\"Probefahrt\" für Ihr neues Lächeln — temporäre Visualisierung auf den Zähnen, mit Korrekturmöglichkeiten.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 Tage",
                }] : []),
                {
                    name: "Komposit-Bonding",
                    description: "Restauration von 6–10 Zähnen mit Nanohybrid-Komposit, Schicht für Schicht, mit Farb- und Formanpassung.",
                    durationMin: 120, durationMax: 240,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
                },
            ],
            extendingFactors: [
                "Reinigung vor Bonding erforderlich",
                "Mock-up-Iterationen (Anpassungen vor finalem Bonding)",
                "Umfangreiches Bonding kann 2 Behandlungssitzungen erfordern",
                "Bleaching vor Bonding (für optimale Farbabstimmung)",
            ],
        };
    }

    if (count === "3-4") {
        return {
            id: "bond-2",
            label: "Ästhetische Restauration von 2–4 Zähnen",
            visitsMin: 1,
            visitsMax: 2,
            durationMinDays: 1,
            durationMaxDays: 14,
            durationLabel: "1–14 Tage",
            recommendedSpecialist: "katarzyna",
            stages: [
                {
                    name: "Planung und Fotos",
                    description: "Fotodokumentation, ästhetischer Plan, Kompositfarbauswahl.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 Tage",
                },
                {
                    name: "Komposit-Bonding",
                    description: "Präzise Restauration von 2–4 Zähnen mit Komposit — Form, Farbe, Oberflächentextur.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
                },
            ],
            extendingFactors: [
                "Reinigung vor dem Eingriff erforderlich",
                "Farbabstimmung mit gebleichten Zähnen",
                "Umfangreiches Bonding kann eine längere Sitzung erfordern",
            ],
        };
    }

    return {
        id: "bond-1",
        label: "Reparatur von 1–2 Zähnen (Bonding)",
        visitsMin: 1,
        visitsMax: 1,
        durationMinDays: 1,
        durationMaxDays: 1,
        durationLabel: "1 Tag",
        recommendedSpecialist: "katarzyna",
        stages: [
            {
                name: "Bonding-Restauration",
                description: "Wiederherstellung des beschädigten Zahns mit Komposit — Reparatur von Absplitterungen, Lückenschluss oder Formkorrektur.",
                durationMin: 45, durationMax: 90,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
            },
        ],
        extendingFactors: [
            "Reinigung vor dem Eingriff erforderlich",
            "Umfangreiche Reparatur kann Anästhesie erfordern",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// E) BLEACHING
// ═══════════════════════════════════════════════════════════════════════════

const wybielanieQuestions_DE: Question[] = [
    {
        id: "method",
        text: "Welche Bleaching-Methode interessiert Sie?",
        options: [
            { value: "office", label: "In-Office (schnell)", emoji: "⚡" },
            { value: "home", label: "Schienen (zu Hause)", emoji: "🏠" },
            { value: "combined", label: "Kombiniert (Praxis + Zuhause)", emoji: "🔄" },
            { value: "unknown", label: "Ich weiß nicht, beraten Sie mich", emoji: "❓" },
        ],
    },
    {
        id: "hygiene",
        text: "Professionelle Reinigung in den letzten 6 Monaten?",
        options: [
            { value: "yes", label: "Ja", emoji: "✅" },
            { value: "no", label: "Nein", emoji: "❌" },
        ],
    },
    {
        id: "sensitivity",
        text: "Haben Sie empfindliche Zähne?",
        options: [
            { value: "no", label: "Nein", emoji: "✅" },
            { value: "yes", label: "Ja, Empfindlichkeit", emoji: "😬" },
        ],
    },
];

function getWybielanieVariant_DE(answers: Record<string, string>): Variant {
    const method = answers.method;
    const needsHygiene = answers.hygiene === "no";

    if (method === "home") {
        return {
            id: "white-2",
            label: "Schienen-Bleaching (zu Hause)",
            visitsMin: 1 + (needsHygiene ? 1 : 0),
            visitsMax: 2 + (needsHygiene ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 14,
            durationLabel: "7–14 Tage",
            recommendedSpecialist: "malgorzata",
            stages: [
                ...(needsHygiene ? [{
                    name: "Professionelle Zahnreinigung",
                    description: "Obligatorische Zahnreinigung vor dem Bleaching — Entfernung von Zahnstein und Belägen.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 Tage",
                }] : []),
                {
                    name: "Scan / Abdruck + Anleitung",
                    description: "Digitaler Scan oder Abdruck für individuelle Bleaching-Schienen. Anleitung zur Gel-Anwendung.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 Tage Gel-Anwendung",
                },
                {
                    name: "Ergebniskontrolle",
                    description: "Farbvergleich, Ergebnisbewertung, Pflegehinweise.",
                    durationMin: 15, durationMax: 20,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
                },
            ],
            extendingFactors: [
                "Reinigung vor dem Bleaching erforderlich",
                "Empfindlichkeit — langsameres Schema mit Pausen",
                "Starke Verfärbungen erfordern möglicherweise längere Anwendung",
            ],
        };
    }

    return {
        id: "white-1",
        label: method === "combined" ? "Kombiniertes Bleaching (Praxis + Schienen)" : "In-Office-Bleaching",
        recommendedSpecialist: "malgorzata",
        visitsMin: 1 + (needsHygiene ? 1 : 0),
        visitsMax: 2 + (needsHygiene ? 1 : 0),
        durationMinDays: 1,
        durationMaxDays: method === "combined" ? 14 : 7,
        durationLabel: method === "combined" ? "1–14 Tage" : "1–7 Tage",
        stages: [
            ...(needsHygiene ? [{
                name: "Professionelle Zahnreinigung",
                description: "Obligatorische Zahnreinigung vor dem Bleaching — besseres und gleichmäßigeres Ergebnis.",
                durationMin: 40, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 Tage",
            }] : []),
            {
                name: "Qualifizierung und Ausgangsfarbe",
                description: "Zahnfarbbestimmung (VITA-Skala), Zahnfleischprotection, Vorbereitung für den Eingriff.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "am selben Tag",
            },
            {
                name: "In-Office-Bleaching",
                description: "Professionelle Bleaching-Gel-Applikation mit LED-Lichtaktivierung. 2–3 Zyklen à 15 Min.",
                durationMin: 60, durationMax: 90,
                anesthesia: false, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: method === "combined" ? "Heimschienen 7–14 Tage" : "optionale Kontrolle",
            },
            {
                name: "Ergebniskontrolle",
                description: "Vergleich mit Ausgangsfarbe, Ergebnisbewertung, Ernährungs- und Pflegeempfehlungen.",
                durationMin: 15, durationMax: 20,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "fertig ✓",
            },
        ],
        extendingFactors: [
            "Reinigung vor dem Eingriff erforderlich",
            "Empfindlichkeit — Desensibilisierung vor/nach erforderlich",
            "Starke Verfärbungen (Tetracycline) — längeres Programm",
            method === "combined" ? "Heimphase verlängert um 7–14 Tage" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const TREATMENT_PATHS_DE: TreatmentPath[] = [
    {
        id: "endo",
        title: "Wurzelbehandlung",
        subtitle: "Endodontie unter Mikroskop",
        icon: "🔬",
        color: "#f59e0b",
        questions: endoQuestions_DE,
        getVariant: getEndoVariant_DE,
    },
    {
        id: "implant",
        title: "Zahnimplantat",
        subtitle: "Von der Beratung bis zur Krone",
        icon: "🦷",
        color: "#3b82f6",
        questions: implantQuestions_DE,
        getVariant: getImplantVariant_DE,
    },
    {
        id: "protetyka",
        title: "Prothetik",
        subtitle: "Krone, Onlay oder Brücke",
        icon: "👑",
        color: "#8b5cf6",
        questions: protetykaQuestions_DE,
        getVariant: getProtetykaVariant_DE,
    },
    {
        id: "bonding",
        title: "Bonding / Ästhetik",
        subtitle: "Ästhetische Kompositrestauration",
        icon: "✨",
        color: "#ec4899",
        questions: bondingQuestions_DE,
        getVariant: getBondingVariant_DE,
    },
    {
        id: "wybielanie",
        title: "Zahnbleaching",
        subtitle: "In-Office oder Schienenbleaching",
        icon: "💎",
        color: "#06b6d4",
        questions: wybielanieQuestions_DE,
        getVariant: getWybielanieVariant_DE,
    },
];

export function formatDuration_DE(days: number): string {
    if (days <= 1) return "1 Tag";
    if (days < 7) return `${days} Tage`;
    if (days === 7) return "1 Woche";
    if (days < 30) {
        const weeks = Math.round(days / 7);
        return `${weeks} Wo.`;
    }
    const months = Math.round(days / 30);
    if (months === 1) return "1 Monat";
    if (months < 5) return `${months} Monate`;
    return `${months} Monate`;
}
