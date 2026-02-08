// ───────────────────────────────────────────────────────────────────────────
// Treatment Time Calculator — Data & Logic
// ───────────────────────────────────────────────────────────────────────────

export interface QuestionOption {
    value: string;
    label: string;
    emoji?: string;
}

export interface Question {
    id: string;
    text: string;
    options: QuestionOption[];
}

export interface Stage {
    name: string;
    description: string;
    durationMin: number;    // minutes in chair
    durationMax: number;
    anesthesia: boolean;
    discomfortAfter: boolean;
    gapToNextMin: number;   // days until next stage
    gapToNextMax: number;
    gapLabel: string;       // human-readable, e.g. "7–14 dni"
    conditional?: string;   // only show if this string appears in variant id
}

export interface Variant {
    id: string;
    label: string;
    visitsMin: number;
    visitsMax: number;
    durationMinDays: number;
    durationMaxDays: number;
    durationLabel: string;  // human-readable, e.g. "3–6 miesięcy"
    stages: Stage[];
    extendingFactors: string[];
    recommendedSpecialist: string; // specialist id matching ReservationForm SPECIALISTS
}

export interface TreatmentPath {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    questions: Question[];
    getVariant: (answers: Record<string, string>) => Variant;
}

// ═══════════════════════════════════════════════════════════════════════════
// A) ENDODONCJA
// ═══════════════════════════════════════════════════════════════════════════

const endoQuestions: Question[] = [
    {
        id: "history",
        text: "Czy ząb był już leczony kanałowo?",
        options: [
            { value: "first", label: "Pierwszy raz", emoji: "🆕" },
            { value: "retreatment", label: "Powtórne leczenie", emoji: "🔄" },
        ],
    },
    {
        id: "tooth",
        text: "Który ząb wymaga leczenia?",
        options: [
            { value: "front", label: "Przód (siekacz / kieł)", emoji: "🦷" },
            { value: "premolar", label: "Przedtrzonowiec", emoji: "🦷" },
            { value: "molar", label: "Trzonowiec", emoji: "🦷" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
    {
        id: "symptoms",
        text: "Czy masz ostre objawy?",
        options: [
            { value: "none", label: "Brak objawów", emoji: "✅" },
            { value: "pain", label: "Silny ból", emoji: "😣" },
            { value: "swelling", label: "Obrzęk / przetoka", emoji: "🔴" },
        ],
    },
    {
        id: "xray",
        text: "Masz RTG lub CBCT z ostatnich 12 miesięcy?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
        ],
    },
];

function getEndoVariant(answers: Record<string, string>): Variant {
    const isRetreament = answers.history === "retreatment";
    const isMolar = answers.tooth === "molar" || answers.tooth === "unknown";
    const hasAcute = answers.symptoms === "pain" || answers.symptoms === "swelling";
    const noXray = answers.xray === "no";

    // ENDO 3: powtórne leczenie
    if (isRetreament) {
        return {
            id: "endo-3",
            label: "Powtórne leczenie kanałowe",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 42,
            durationLabel: "1–6 tygodni",
            recommendedSpecialist: "marcin", // zaawansowana endodoncja
            stages: [
                {
                    name: "Diagnostyka rozszerzona",
                    description: "CBCT 3D, testy żywotności, ocena wcześniejszego leczenia i plan re-endo.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 dni",
                },
                {
                    name: "Re-endo pod mikroskopem",
                    description: "Usunięcie starego wypełnienia kanałów, oczyszczenie i ponowne opracowanie pod mikroskopem.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 21, gapLabel: "7–21 dni",
                },
                {
                    name: "Wizyta pośrednia",
                    description: "Kontrola gojenia, wymiana opatrunku, ocena odpowiedzi na leczenie.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni",
                    conditional: "endo-3",
                },
                {
                    name: "Kontrola i plan odbudowy",
                    description: "Ocena efektu leczenia, plan odbudowy zęba (wypełnienie lub korona).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "wg planu",
                },
            ],
            extendingFactors: [
                "Nietypowa anatomia kanałów (dodatkowe kanały, zakrzywienia)",
                "Złamane narzędzie w kanale wymagające usunięcia",
                "Duże zmiany okołowierzchołkowe wymagające dłuższego gojenia",
                "Konieczność etapu pośredniego z opatrunkiem leczniczym",
                "Dodatkowa diagnostyka CBCT",
            ],
        };
    }

    // ENDO 2: trzonowiec, pierwszy raz
    if (isMolar) {
        return {
            id: "endo-2",
            label: "Leczenie kanałowe trzonowca",
            visitsMin: 1 + (hasAcute ? 1 : 0),
            visitsMax: 3,
            durationMinDays: 1,
            durationMaxDays: 21,
            durationLabel: "1–21 dni",
            recommendedSpecialist: "ilona", // endodoncja mikroskopowa
            stages: [
                {
                    name: "Kwalifikacja i diagnostyka",
                    description: "RTG/CBCT, testy żywotności miazgi, ocena stanu zęba i plan leczenia.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 dni",
                },
                {
                    name: "Leczenie kanałowe pod mikroskopem",
                    description: "Opracowanie 3–4 kanałów trzonowca pod mikroskopem operacyjnym. Precyzyjne oczyszczenie i wypełnienie.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "wg potrzeby",
                },
                {
                    name: "Wizyta pośrednia",
                    description: "Kontrola opatrunku, ocena gojenia — potrzebna przy stanach ostrych.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni",
                    conditional: "endo-2",
                },
                {
                    name: "Kontrola i plan odbudowy",
                    description: "Ocena leczenia, plan odbudowy zęba (wypełnienie kompozytowe lub korona protetyczna).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 dni",
                },
            ],
            extendingFactors: [
                "Stan zapalny wymagający wyciszenia przed leczeniem",
                "Nietypowa anatomia kanałów (dodatkowe kanały)",
                "Konieczność CBCT do precyzyjnej diagnostyki",
                "Etap pośredni z opatrunkiem leczniczym",
            ],
        };
    }

    // ENDO 1: przód/przedtrzonowiec, pierwszy raz
    return {
        id: "endo-1",
        label: "Leczenie kanałowe — prosty przypadek",
        visitsMin: 1,
        visitsMax: 2,
        durationMinDays: 1,
        durationMaxDays: 14,
        durationLabel: "1–14 dni",
        recommendedSpecialist: "ilona", // endodoncja mikroskopowa
        stages: [
            {
                name: "Kwalifikacja i diagnostyka",
                description: "RTG cyfrowe, testy żywotności miazgi, omówienie planu leczenia.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 dni",
            },
            {
                name: "Leczenie kanałowe pod mikroskopem",
                description: "Oczyszczenie i opracowanie kanałów pod mikroskopem operacyjnym z powiększeniem do 25×.",
                durationMin: 60, durationMax: 120,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "wg potrzeby",
            },
            {
                name: "Kontrola i plan odbudowy",
                description: "Kontrolne RTG, ocena efektu leczenia, plan odbudowy (wypełnienie lub korona).",
                durationMin: 20, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 dni",
            },
        ],
        extendingFactors: [
            "Dodatkowa diagnostyka (CBCT) przy nietypowej anatomii",
            "Stan zapalny wymagający wyciszenia",
            "Konieczność odbudowy zęba koroną zamiast wypełnieniem",
            noXray ? "Brak aktualnego RTG — dodatkowa wizyta diagnostyczna" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// B) IMPLANT
// ═══════════════════════════════════════════════════════════════════════════

const implantQuestions: Question[] = [
    {
        id: "status",
        text: "Czy zęba już nie ma, czy jest do usunięcia?",
        options: [
            { value: "missing", label: "Brak zęba", emoji: "⬜" },
            { value: "extraction", label: "Ząb do usunięcia", emoji: "🔧" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
    {
        id: "location",
        text: "W którym miejscu?",
        options: [
            { value: "front", label: "Przód (strefa uśmiechu)", emoji: "😁" },
            { value: "side", label: "Bok (trzonowce / przedtrzonowce)", emoji: "🦷" },
        ],
    },
    {
        id: "cbct",
        text: "Czy masz aktualne badanie CBCT?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
        ],
    },
    {
        id: "augmentation",
        text: "Czy przewidujesz potrzebę odbudowy kości?",
        options: [
            { value: "no", label: "Nie / raczej nie", emoji: "✅" },
            { value: "possible", label: "Możliwe", emoji: "🤔" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
    {
        id: "temporary",
        text: "Czy chcesz ząb tymczasowy na czas gojenia?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
        ],
    },
];

function getImplantVariant(answers: Record<string, string>): Variant {
    const needsAugmentation = answers.augmentation === "possible" || answers.augmentation === "unknown";
    const needsExtraction = answers.extraction === "extraction" || answers.status === "extraction";
    const isFront = answers.location === "front";

    if (needsAugmentation) {
        return {
            id: "impl-2",
            label: "Implant z odbudową kości / zatoką",
            visitsMin: 4,
            visitsMax: 7,
            durationMinDays: 150,
            durationMaxDays: 270,
            durationLabel: "5–9 miesięcy",
            recommendedSpecialist: "marcin", // chirurgia, protetyka na implantach
            stages: [
                {
                    name: "Konsultacja i diagnostyka",
                    description: "Badanie kliniczne, CBCT 3D, omówienie opcji leczenia i planu chirurgicznego.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 dni",
                },
                {
                    name: "Odbudowa kości / podniesienie dna zatoki",
                    description: "Zabieg augmentacji — przeszczep kostny lub podniesienie dna zatoki szczękowej (sinus lift) w celu stworzenia podłoża dla implantu.",
                    durationMin: 45, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 90, gapToNextMax: 180, gapLabel: "3–6 mies. gojenia",
                },
                {
                    name: "Zabieg implantacji",
                    description: "Precyzyjne wszczepienie implantu tytanowego w odbudowaną kość.",
                    durationMin: 45, durationMax: 90,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 tyg. osteointegracji",
                },
                {
                    name: "Kontrola / zdjęcie szwów",
                    description: "Sprawdzenie gojenia, zdjęcie szwów, kontrolne RTG.",
                    durationMin: 15, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni",
                },
                {
                    name: "Skan cyfrowy i wyciski",
                    description: "Cyfrowy skan 3D pod koronę protetyczną na implancie.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni (laboratorium)",
                },
                {
                    name: "Osadzenie korony na implancie",
                    description: "Ostateczna korona protetyczna — efekt końcowy: nowy ząb.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
                },
            ],
            extendingFactors: [
                "Zakres odbudowy kości (mały przeszczep vs pełna augmentacja)",
                "Estetyka strefy uśmiechu — dodatkowe modelowanie tkanek miękkich",
                "Leczenie stanu zapalnego przed implantacją",
                "Czas osteointegracji zależy od jakości kości",
                needsExtraction ? "Ekstrakcja zęba przed augmentacją — dodatkowy etap" : "",
            ].filter(Boolean),
        };
    }

    // IMPL 1: standard
    return {
        id: "impl-1",
        label: "Implant — ścieżka standardowa",
        visitsMin: 3 + (needsExtraction ? 1 : 0),
        visitsMax: 5 + (needsExtraction ? 1 : 0),
        durationMinDays: 90,
        durationMaxDays: 180,
        durationLabel: "3–6 miesięcy",
        recommendedSpecialist: "marcin", // chirurgia, protetyka na implantach
        stages: [
            {
                name: "Konsultacja i diagnostyka",
                description: "Badanie kliniczne, CBCT 3D, plan leczenia implantologicznego, omówienie opcji.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 dni",
            },
            ...(needsExtraction ? [{
                name: "Ekstrakcja zęba",
                description: "Usunięcie zęba z zachowaniem zębodołu — przygotowanie do implantacji.",
                durationMin: 20, durationMax: 45,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 14, gapToNextMax: 60, gapLabel: "2–8 tyg. gojenia",
            }] : []),
            {
                name: "Zabieg implantacji",
                description: "Wszczepienie implantu tytanowego. Zabieg pod znieczuleniem miejscowym, często bezbolesny.",
                durationMin: 45, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 tyg. osteointegracji",
            },
            {
                name: "Kontrola / zdjęcie szwów",
                description: "Kontrola gojenia po 7–14 dniach, zdjęcie szwów, kontrolne RTG.",
                durationMin: 15, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni",
            },
            {
                name: "Skan cyfrowy i wyciski",
                description: "Cyfrowy skan 3D do zaprojektowania korony protetycznej na implancie.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni (laboratorium)",
            },
            {
                name: "Osadzenie korony na implancie",
                description: "Korona ostateczna — naturalny wygląd i funkcja jak własny ząb.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
            },
        ],
        extendingFactors: [
            "Czas osteointegracji zależy od jakości kości pacjenta",
            isFront ? "Strefa estetyczna — może wymagać dodatkowego modelowania tkanek" : "",
            "Ewentualne formowanie dziąsła (gingival former) — dodatkowa wizyta",
            needsExtraction ? "Gojenie po ekstrakcji przed implantacją" : "",
            "Potrzeba CBCT (jeśli brak aktualnego badania)",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// C) PROTETYKA
// ═══════════════════════════════════════════════════════════════════════════

const protetykaQuestions: Question[] = [
    {
        id: "type",
        text: "Jakiego rodzaju uzupełnienia potrzebujesz?",
        options: [
            { value: "crown", label: "Korona", emoji: "👑" },
            { value: "onlay", label: "Onlay / inlay", emoji: "🔲" },
            { value: "bridge", label: "Most", emoji: "🌉" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
    {
        id: "endo",
        text: "Czy ząb był leczony kanałowo?",
        options: [
            { value: "no", label: "Nie, ząb żywy", emoji: "💚" },
            { value: "yes", label: "Tak, po endo", emoji: "✅" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
    {
        id: "xray",
        text: "Masz aktualne RTG tego zęba?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
        ],
    },
    {
        id: "priority",
        text: "Jaki jest Twój priorytet?",
        options: [
            { value: "fast", label: "Najszybciej jak się da", emoji: "⚡" },
            { value: "standard", label: "Standardowo", emoji: "📅" },
            { value: "comfort", label: "Komfortowo, bez pośpiechu", emoji: "🧘" },
        ],
    },
];

function getProtetykaVariant(answers: Record<string, string>): Variant {
    const isBridge = answers.type === "bridge";
    const needsEndoCheck = answers.endo === "unknown";

    if (isBridge) {
        return {
            id: "prot-2",
            label: "Most protetyczny",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 tygodnie",
            recommendedSpecialist: "ilona", // protetyka cyfrowa
            stages: [
                {
                    name: "Kwalifikacja i plan",
                    description: "Badanie kliniczne, RTG, ocena filarów, plan protetyczny, dobór koloru.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 dni",
                },
                {
                    name: "Preparacja filarów + skan/wycisk",
                    description: "Opracowanie zębów filarowych, skan cyfrowy 3D lub wycisk tradycyjny, most tymczasowy.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni (laboratorium)",
                },
                {
                    name: "Przymiarka (opcjonalnie)",
                    description: "Sprawdzenie dopasowania szkieletu mostu, korekty przed ostatecznym wykończeniem.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 dni",
                    conditional: "prot-2",
                },
                {
                    name: "Cementowanie mostu",
                    description: "Osadzenie ostatecznego mostu, kontrola zgryzu i kontaktów.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
                },
            ],
            extendingFactors: [
                "Konieczność leczenia kanałowego filaru przed mostem",
                "Odbudowa zrębu zęba filarowego",
                "Korekty zgryzu po cementowaniu",
                "Dłuższy etap laboratoryjny przy większych pracach",
                needsEndoCheck ? "Konieczność weryfikacji żywotności zębów filarowych" : "",
            ].filter(Boolean),
        };
    }

    // korona / onlay standard
    return {
        id: "prot-1",
        label: answers.type === "onlay" ? "Onlay / inlay" : "Korona protetyczna",
        visitsMin: 2,
        visitsMax: 3,
        durationMinDays: 5,
        durationMaxDays: 14,
        durationLabel: "5–14 dni",
        recommendedSpecialist: "ilona", // protetyka cyfrowa
        stages: [
            {
                name: "Kwalifikacja i zdjęcia",
                description: "Badanie kliniczne, RTG, ocena zęba, plan protetyczny, dobór koloru.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 dni",
            },
            {
                name: "Preparacja + skan + tymczasówka",
                description: "Opracowanie zęba, skan cyfrowy 3D, założenie korony/onlaya tymczasowego.",
                durationMin: 60, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 5, gapToNextMax: 14, gapLabel: "5–14 dni (laboratorium)",
            },
            {
                name: "Cementowanie + kontrola",
                description: "Osadzenie ostatecznej korony/onlaya, kontrola zgryzu i punktów stycznych.",
                durationMin: 30, durationMax: 45,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
            },
        ],
        extendingFactors: [
            "Konieczność odbudowy zrębu zęba przed koroną",
            "Leczenie kanałowe przed protetycznym uzupełnieniem",
            "Korekty kontaktów lub dopasowania",
            "Terminy laboratorium protetycznego",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// D) BONDING / ODBUDOWA ESTETYCZNA
// ═══════════════════════════════════════════════════════════════════════════

const bondingQuestions: Question[] = [
    {
        id: "count",
        text: "Ile zębów do odbudowy?",
        options: [
            { value: "1-2", label: "1–2 zęby", emoji: "1️⃣" },
            { value: "3-4", label: "2–4 zęby", emoji: "🔢" },
            { value: "6-10", label: "6–10 zębów (pełny uśmiech)", emoji: "😁" },
        ],
    },
    {
        id: "goal",
        text: "Jaki jest cel odbudowy?",
        options: [
            { value: "chip", label: "Ukruszenie / odłamanie", emoji: "💥" },
            { value: "gap", label: "Przerwa między zębami (diastema)", emoji: "↔️" },
            { value: "wear", label: "Starty / abrazja", emoji: "📐" },
            { value: "shape", label: "Korekta kształtu / proporcji", emoji: "✨" },
        ],
    },
    {
        id: "hygiene",
        text: "Higienizacja w ostatnich 6 miesiącach?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
            { value: "unknown", label: "Nie pamiętam", emoji: "❓" },
        ],
    },
    {
        id: "mockup",
        text: "Chcesz wcześniej zobaczyć przymiarkę (mock-up)?",
        options: [
            { value: "yes", label: "Tak, chcę wizualizację", emoji: "👀" },
            { value: "no", label: "Nie, ufam lekarzowi", emoji: "👍" },
        ],
    },
];

function getBondingVariant(answers: Record<string, string>): Variant {
    const count = answers.count;
    const wantsMockup = answers.mockup === "yes";
    const needsHygiene = answers.hygiene === "no" || answers.hygiene === "unknown";

    // BOND 3: full smile
    if (count === "6-10") {
        return {
            id: "bond-3",
            label: "Pełna odbudowa estetyczna uśmiechu",
            visitsMin: 2 + (wantsMockup ? 1 : 0),
            visitsMax: 3 + (wantsMockup ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 tygodnie",
            recommendedSpecialist: "marcin", // stomatologia estetyczna zaawansowana
            stages: [
                ...(needsHygiene ? [{
                    name: "Higienizacja",
                    description: "Profesjonalne czyszczenie zębów — konieczne przed bondingiem dla optymalnego połączenia.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 dni",
                }] : []),
                {
                    name: "Plan i dokumentacja fotograficzna",
                    description: "Szczegółowe zdjęcia, analiza uśmiechu, plan estetyczny w porozumieniu z pacjentem.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: wantsMockup ? 3 : 0, gapToNextMax: wantsMockup ? 7 : 7, gapLabel: wantsMockup ? "3–7 dni" : "0–7 dni",
                },
                ...(wantsMockup ? [{
                    name: "Mock-up / przymiarka",
                    description: "\"Test drive\" nowego uśmiechu — tymczasowa wizualizacja nałożona na zęby, możliwość korekty.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 dni",
                }] : []),
                {
                    name: "Bonding kompozytowy",
                    description: "Odbudowa 6–10 zębów kompozytem nanohybrydowym, warstwa po warstwie, z dopasowaniem koloru i kształtu.",
                    durationMin: 120, durationMax: 240,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
                },
            ],
            extendingFactors: [
                "Konieczność higienizacji przed bondingiem",
                "Iteracje mock-up (korekty przed ostatecznym bondingiem)",
                "Rozległy bonding może wymagać 2 sesji zabiegowych",
                "Wybielanie przed bondingiem (dla optymalnego koloru)",
            ],
        };
    }

    // BOND 2: 2-4 teeth
    if (count === "3-4") {
        return {
            id: "bond-2",
            label: "Odbudowa estetyczna 2–4 zębów",
            visitsMin: 1,
            visitsMax: 2,
            durationMinDays: 1,
            durationMaxDays: 14,
            durationLabel: "1–14 dni",
            recommendedSpecialist: "katarzyna", // stomatologia zachowawcza
            stages: [
                {
                    name: "Plan i zdjęcia",
                    description: "Dokumentacja fotograficzna, plan estetyczny, dobór koloru kompozytu.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 dni",
                },
                {
                    name: "Bonding kompozytowy",
                    description: "Precyzyjna odbudowa 2–4 zębów kompozytem — kształt, kolor, faktura powierzchni.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
                },
            ],
            extendingFactors: [
                "Konieczność higienizacji przed zabiegiem",
                "Konieczność dopasowania koloru do wybionych zębów",
                "Rozległy bonding może wymagać dłuższej sesji",
            ],
        };
    }

    // BOND 1: 1-2 teeth — simplest
    return {
        id: "bond-1",
        label: "Naprawa 1–2 zębów (bonding)",
        visitsMin: 1,
        visitsMax: 1,
        durationMinDays: 1,
        durationMaxDays: 1,
        durationLabel: "1 dzień",
        recommendedSpecialist: "katarzyna", // stomatologia zachowawcza
        stages: [
            {
                name: "Odbudowa bonding",
                description: "Odbudowa uszkodzonego zęba kompozytem — naprawa ukruszenia, zamknięcie przerwy lub korekta kształtu.",
                durationMin: 45, durationMax: 90,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
            },
        ],
        extendingFactors: [
            "Konieczność higienizacji przed zabiegiem",
            "Rozległa naprawa może wymagać znieczulenia",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// E) WYBIELANIE
// ═══════════════════════════════════════════════════════════════════════════

const wybielanieQuestions: Question[] = [
    {
        id: "method",
        text: "Jaka metoda wybielania Cię interesuje?",
        options: [
            { value: "office", label: "Gabinetowe (szybkie)", emoji: "⚡" },
            { value: "home", label: "Nakładkowe (domowe)", emoji: "🏠" },
            { value: "combined", label: "Mieszane (gabinet + dom)", emoji: "🔄" },
            { value: "unknown", label: "Nie wiem, doradźcie", emoji: "❓" },
        ],
    },
    {
        id: "hygiene",
        text: "Higienizacja w ostatnich 6 miesiącach?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
        ],
    },
    {
        id: "sensitivity",
        text: "Czy masz wrażliwe zęby?",
        options: [
            { value: "no", label: "Nie", emoji: "✅" },
            { value: "yes", label: "Tak, nadwrażliwość", emoji: "😬" },
        ],
    },
];

function getWybielanieVariant(answers: Record<string, string>): Variant {
    const method = answers.method;
    const needsHygiene = answers.hygiene === "no";

    if (method === "home") {
        return {
            id: "white-2",
            label: "Wybielanie nakładkowe (domowe)",
            visitsMin: 1 + (needsHygiene ? 1 : 0),
            visitsMax: 2 + (needsHygiene ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 14,
            durationLabel: "7–14 dni",
            recommendedSpecialist: "malgorzata", // higienistka stom.
            stages: [
                ...(needsHygiene ? [{
                    name: "Higienizacja profesjonalna",
                    description: "Obowiązkowe czyszczenie zębów przed wybielaniem — usunięcie kamienia i osadów.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 dni",
                }] : []),
                {
                    name: "Skan / wycisk + instrukcja",
                    description: "Skan cyfrowy lub wycisk do wykonania indywidualnych nakładek. Omówienie schematu stosowania żelu.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 dni stosowania żelu",
                },
                {
                    name: "Kontrola efektu",
                    description: "Porównanie koloru, ocena efektu, ewentualne wskazówki do utrzymania efektu.",
                    durationMin: 15, durationMax: 20,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
                },
            ],
            extendingFactors: [
                "Konieczność higienizacji przed wybielaniem",
                "Nadwrażliwość — wolniejszy schemat z przerwami",
                "Intensywne przebarwienia mogą wymagać dłuższego stosowania",
            ],
        };
    }

    // Office / combined / unknown → gabinetowe
    return {
        id: "white-1",
        label: method === "combined" ? "Wybielanie mieszane (gabinet + nakładki)" : "Wybielanie gabinetowe",
        recommendedSpecialist: "malgorzata", // higienistka stom.
        visitsMin: 1 + (needsHygiene ? 1 : 0),
        visitsMax: 2 + (needsHygiene ? 1 : 0),
        durationMinDays: 1,
        durationMaxDays: method === "combined" ? 14 : 7,
        durationLabel: method === "combined" ? "1–14 dni" : "1–7 dni",
        stages: [
            ...(needsHygiene ? [{
                name: "Higienizacja profesjonalna",
                description: "Obowiązkowe czyszczenie zębów przed wybielaniem — lepszy i równomierniejszy efekt.",
                durationMin: 40, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 dni",
            }] : []),
            {
                name: "Kwalifikacja i kolor wyjściowy",
                description: "Ocena koloru zębów (skala VITA), ochrona dziąseł, przygotowanie do zabiegu.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "tego samego dnia",
            },
            {
                name: "Wybielanie gabinetowe",
                description: "Aplikacja profesjonalnego żelu wybielającego z aktywacją lampą LED. 2–3 cykle po 15 min.",
                durationMin: 60, durationMax: 90,
                anesthesia: false, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: method === "combined" ? "nakładki domowe 7–14 dni" : "opcjonalna kontrola",
            },
            {
                name: "Kontrola efektu",
                description: "Porównanie z kolorem wyjściowym, ocena efektu, zalecenia dotyczące diety i pielęgnacji.",
                durationMin: 15, durationMax: 20,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "gotowe ✓",
            },
        ],
        extendingFactors: [
            "Konieczność higienizacji przed zabiegiem",
            "Nadwrażliwość — konieczność desensybilizacji przed/po",
            "Intensywne przebarwienia (tetracykliny) — dłuższy program",
            method === "combined" ? "Faza domowa dodaje 7–14 dni" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: All treatment paths
// ═══════════════════════════════════════════════════════════════════════════

export const TREATMENT_PATHS: TreatmentPath[] = [
    {
        id: "endo",
        title: "Leczenie kanałowe",
        subtitle: "Endodoncja pod mikroskopem",
        icon: "🔬",
        color: "#f59e0b",
        questions: endoQuestions,
        getVariant: getEndoVariant,
    },
    {
        id: "implant",
        title: "Implant",
        subtitle: "Od konsultacji do korony",
        icon: "🦷",
        color: "#3b82f6",
        questions: implantQuestions,
        getVariant: getImplantVariant,
    },
    {
        id: "protetyka",
        title: "Protetyka",
        subtitle: "Korona, onlay lub most",
        icon: "👑",
        color: "#8b5cf6",
        questions: protetykaQuestions,
        getVariant: getProtetykaVariant,
    },
    {
        id: "bonding",
        title: "Bonding / estetyka",
        subtitle: "Odbudowa estetyczna kompozytem",
        icon: "✨",
        color: "#ec4899",
        questions: bondingQuestions,
        getVariant: getBondingVariant,
    },
    {
        id: "wybielanie",
        title: "Wybielanie",
        subtitle: "Gabinetowe lub nakładkowe",
        icon: "💎",
        color: "#06b6d4",
        questions: wybielanieQuestions,
        getVariant: getWybielanieVariant,
    },
];

// Helper: format days into human-readable Polish
export function formatDuration(days: number): string {
    if (days <= 1) return "1 dzień";
    if (days < 7) return `${days} dni`;
    if (days === 7) return "1 tydzień";
    if (days < 30) {
        const weeks = Math.round(days / 7);
        return `${weeks} tyg.`;
    }
    const months = Math.round(days / 30);
    if (months === 1) return "1 miesiąc";
    if (months < 5) return `${months} miesiące`;
    return `${months} miesięcy`;
}
