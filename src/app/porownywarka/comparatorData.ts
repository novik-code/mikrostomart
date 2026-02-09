// ───────────────────────────────────────────────────────────────────────────
// Porównywarka Rozwiązań — Data & Logic
// ───────────────────────────────────────────────────────────────────────────

// ═══ TYPES ═══════════════════════════════════════════════════════════════════

export interface QuestionOption {
    value: string;
    label: string;
    emoji?: string;
}

export interface Question {
    id: string;
    label: string;
    options: QuestionOption[];
}

export interface TableCell {
    value: string;
    scale?: number;       // 1-5 visual scale (filled segments)
    tooltip?: string;
}

export interface MethodTable {
    time: TableCell;
    visits: TableCell;
    durability: TableCell;
    invasiveness: TableCell;
    risk: TableCell;
    hygiene: TableCell;
    worksWhen: string[];
    notIdealWhen: string[];
    maintenance: TableCell;
}

export interface MethodMetrics {
    durabilityScore: number;   // 0-100
    speedScore: number;
    minInvasiveScore: number;
    maintenanceScore: number;
    riskScore: number;
}

export interface Method {
    id: string;
    label: string;
    short: string;
    icon: string;
    color: string;
    table: MethodTable;
    metrics: MethodMetrics;
    recommendedSpecialist: string;
}

export interface GatingEffect {
    methodId: string;
    scoreDelta: number;
    badge?: string;
}

export interface GatingRule {
    id: string;
    comparatorId: string;
    answers: Record<string, string>;
    effects: GatingEffect[];
}

export interface PriorityOption {
    id: string;
    label: string;
    sublabel: string;
    emoji: string;
    color: string;
}

export interface PriorityWeights {
    durabilityScore: number;
    speedScore: number;
    minInvasiveScore: number;
    maintenanceScore: number;
    riskScore: number;
}

export interface Comparator {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    methodIds: string[];
    questions: Question[];
}

export interface ScoredMethod {
    methodId: string;
    score: number;
    badges: string[];
}

// ═══ PRIORITIES ══════════════════════════════════════════════════════════════

export const PRIORITIES: PriorityOption[] = [
    { id: "balanced", label: "Zbalansowane", sublabel: "Najlepsza równowaga", emoji: "⚖️", color: "#d4af37" },
    { id: "durable", label: "Najtrwalsze", sublabel: "Maksymalna żywotność", emoji: "🏗️", color: "#38bdf8" },
    { id: "min_invasive", label: "Najmniej inwazyjne", sublabel: "Jak najmniej interwencji", emoji: "🌿", color: "#10b981" },
    { id: "fast", label: "Najszybciej", sublabel: "Najkrótszy czas leczenia", emoji: "⚡", color: "#f59e0b" },
    { id: "easy_maintenance", label: "Najłatwiej utrzymać", sublabel: "Prosta higiena i serwis", emoji: "🧹", color: "#a855f7" },
];

export const PRIORITY_WEIGHTS: Record<string, PriorityWeights> = {
    balanced: { durabilityScore: 0.25, speedScore: 0.25, minInvasiveScore: 0.2, maintenanceScore: 0.2, riskScore: 0.1 },
    durable: { durabilityScore: 0.45, speedScore: 0.1, minInvasiveScore: 0.1, maintenanceScore: 0.15, riskScore: 0.2 },
    min_invasive: { durabilityScore: 0.1, speedScore: 0.15, minInvasiveScore: 0.45, maintenanceScore: 0.1, riskScore: 0.2 },
    fast: { durabilityScore: 0.1, speedScore: 0.5, minInvasiveScore: 0.15, maintenanceScore: 0.1, riskScore: 0.15 },
    easy_maintenance: { durabilityScore: 0.15, speedScore: 0.1, minInvasiveScore: 0.1, maintenanceScore: 0.45, riskScore: 0.2 },
};

// ═══ TABLE ROW LABELS ════════════════════════════════════════════════════════

export const TABLE_ROW_LABELS: { key: keyof Omit<MethodTable, 'worksWhen' | 'notIdealWhen'>; label: string; tooltip: string }[] = [
    { key: "time", label: "Czas leczenia", tooltip: "Orientacyjny czas od pierwszej wizyty do efektu końcowego" },
    { key: "visits", label: "Liczba wizyt", tooltip: "Orientacyjna liczba wizyt w gabinecie" },
    { key: "durability", label: "Trwałość", tooltip: "Przewidywana żywotność rozwiązania (5 = najdłuższa)" },
    { key: "invasiveness", label: "Inwazyjność", tooltip: "Zakres interwencji (5 = najmniej inwazyjne)" },
    { key: "risk", label: "Ryzyko", tooltip: "Ogólne ryzyko i ograniczenia (5 = najniższe)" },
    { key: "hygiene", label: "Higiena", tooltip: "Łatwość utrzymania higieny (5 = najłatwiejsza)" },
    { key: "maintenance", label: "Serwis / kontrole", tooltip: "Wymagane kontrole i konserwacja" },
];

// ═══ SCENARIO A: BRAK ZĘBA ══════════════════════════════════════════════════

const missingToothQuestions: Question[] = [
    {
        id: "location",
        label: "Gdzie jest problem?",
        options: [
            { value: "front", label: "Przód (strefa uśmiechu)", emoji: "😁" },
            { value: "back", label: "Bok (trzonowce / przedtrzonowce)", emoji: "🦷" },
        ],
    },
    {
        id: "count",
        label: "Ile zębów brakuje?",
        options: [
            { value: "one", label: "1 ząb", emoji: "1️⃣" },
            { value: "several", label: "Kilka", emoji: "🔢" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
    {
        id: "neighbors",
        label: "Czy zęby sąsiednie są zdrowe?",
        options: [
            { value: "yes", label: "Tak", emoji: "✅" },
            { value: "no", label: "Nie", emoji: "❌" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
];

// ═══ SCENARIO B: ESTETYKA ════════════════════════════════════════════════════

const aestheticsQuestions: Question[] = [
    {
        id: "count",
        label: "Ile zębów chcesz poprawić?",
        options: [
            { value: "1-2", label: "1–2 zęby", emoji: "1️⃣" },
            { value: "4-6", label: "4–6 zębów", emoji: "🔢" },
            { value: "8-10", label: "8–10 (pełny uśmiech)", emoji: "😁" },
        ],
    },
    {
        id: "problem",
        label: "Jaki jest główny problem?",
        options: [
            { value: "color", label: "Kolor / przebarwienia", emoji: "🎨" },
            { value: "shape", label: "Kształt / proporcje", emoji: "📐" },
            { value: "diastema", label: "Przerwy (diastema)", emoji: "↔️" },
            { value: "wear", label: "Starty / abrazja", emoji: "⚙️" },
        ],
    },
    {
        id: "bruxism",
        label: "Masz bruksizm (zaciskanie / ścieranie zębów)?",
        options: [
            { value: "no", label: "Nie", emoji: "✅" },
            { value: "yes", label: "Tak", emoji: "😬" },
            { value: "unknown", label: "Nie wiem", emoji: "❓" },
        ],
    },
];

// ═══ COMPARATORS (SCENARIOS) ════════════════════════════════════════════════

export const COMPARATORS: Comparator[] = [
    {
        id: "missing_tooth",
        title: "Brak zęba",
        subtitle: "Implant vs Most vs Proteza",
        icon: "🦷",
        color: "#38bdf8",
        methodIds: ["implant", "bridge", "partial_denture"],
        questions: missingToothQuestions,
    },
    {
        id: "aesthetics",
        title: "Estetyka uśmiechu",
        subtitle: "Bonding vs Licówki vs Korony",
        icon: "✨",
        color: "#a855f7",
        methodIds: ["bonding", "veneer_composite", "veneer_porcelain", "crown"],
        questions: aestheticsQuestions,
    },
];

// ═══ METHODS — MISSING TOOTH ════════════════════════════════════════════════

export const METHODS: Record<string, Method> = {
    // ── A1: Implant ──
    implant: {
        id: "implant",
        label: "Implant",
        short: "Stałe uzupełnienie bez szlifowania sąsiadów. Najbliższe własnemu zębowi.",
        icon: "🔩",
        color: "#38bdf8",
        recommendedSpecialist: "marcin",
        table: {
            time: { value: "3–6 miesięcy", scale: 2, tooltip: "Duża część to gojenie tkanek — wizyt jest niewiele, ale osteointegracja wymaga cierpliwości." },
            visits: { value: "3–5", scale: 3, tooltip: "Kwalifikacja, zabieg, kontrole, skan, korona." },
            durability: { value: "Wysoka", scale: 5, tooltip: "Przy dobrej higienie implant może służyć dekady. Korona wymaga ewentualnej wymiany po 10–15 latach." },
            invasiveness: { value: "Średnia", scale: 3, tooltip: "Zabieg chirurgiczny pod znieczuleniem, ale nie narusza zębów sąsiednich." },
            risk: { value: "Średnie", scale: 3, tooltip: "Wymaga kwalifikacji, odpowiednich warunków kostnych i okresu gojenia." },
            hygiene: { value: "Jak własny ząb", scale: 4, tooltip: "Nitkowanie i szczoteczki międzyzębowe jak przy naturalnych zębach." },
            worksWhen: [
                "Brak 1 zęba i chcesz rozwiązanie stałe",
                "Zależy Ci na ochronie zębów sąsiednich",
                "Masz wystarczające warunki kostne (lub jesteś gotowy na augmentację)",
                "Szukasz rozwiązania najbliższego naturalnemu zębowi",
            ],
            notIdealWhen: [
                "Brak warunków kostnych bez możliwości odbudowy",
                "Nieuregulowane stany zapalne (zapalenie dziąseł)",
                "Bruksizm bez zabezpieczenia szyną",
                "Szukasz rozwiązania natychmiastowego",
            ],
            maintenance: { value: "Kontrole 1–2×/rok", tooltip: "Profilaktyka, ocena tkanek wokół implantu, kontrolne RTG." },
        },
        metrics: { durabilityScore: 90, speedScore: 35, minInvasiveScore: 55, maintenanceScore: 75, riskScore: 70 },
    },

    // ── A2: Most ──
    bridge: {
        id: "bridge",
        label: "Most protetyczny",
        short: "Stałe uzupełnienie oparte na zębach sąsiednich — szybsze niż implant.",
        icon: "🌉",
        color: "#f59e0b",
        recommendedSpecialist: "ilona",
        table: {
            time: { value: "1–3 tygodnie", scale: 4, tooltip: "Zależy od diagnostyki i pracy laboratoryjnej. Znacznie szybciej niż implant." },
            visits: { value: "2–4", scale: 4, tooltip: "Kwalifikacja, preparacja, ewentualna przymiarka, osadzenie." },
            durability: { value: "Średnio-wysoka", scale: 4, tooltip: "Zależna od stanu filarów i higieny. Średnio 10–15 lat." },
            invasiveness: { value: "Wyższa", scale: 2, tooltip: "Wymaga opracowania (szlifowania) zębów sąsiednich — nawet jeśli są zdrowe." },
            risk: { value: "Średnie", scale: 3, tooltip: "Ryzyko próchnicy filarów przy słabej higienie. Przeciążenia mechaniczne." },
            hygiene: { value: "Trudniejsza", scale: 2, tooltip: "Wymaga specjalnych nici i wyciorków pod przęsłem mostu." },
            worksWhen: [
                "Chcesz szybciej niż implant",
                "Zęby filarowe i tak wymagają odbudowy protetycznej (po endo, rozległe ubytki)",
                "Warunki do implantu ograniczone",
                "Brak 1–2 zębów w jednym odcinku",
            ],
            notIdealWhen: [
                "Zęby sąsiednie są zupełnie zdrowe — szkoda je szlifować",
                "Trudność z utrzymaniem higieny pod mostem",
                "Brakuje wielu zębów — most wymaga mocnych filarów",
                "Priorytetem jest maksymalna ochrona tkanki własnej",
            ],
            maintenance: { value: "Regularne kontrole", tooltip: "Higiena pod przęsłem, kontrola filarów, ewentualne korekty." },
        },
        metrics: { durabilityScore: 75, speedScore: 80, minInvasiveScore: 35, maintenanceScore: 45, riskScore: 65 },
    },

    // ── A3: Proteza częściowa ──
    partial_denture: {
        id: "partial_denture",
        label: "Proteza częściowa",
        short: "Najszybsza opcja bez zabiegów chirurgicznych — wyjmowana.",
        icon: "🔄",
        color: "#10b981",
        recommendedSpecialist: "ilona",
        table: {
            time: { value: "1–2 tygodnie", scale: 5, tooltip: "Zwykle kilka wizyt + wykonanie w laboratorium. Najszybsza ścieżka." },
            visits: { value: "2–4", scale: 4, tooltip: "Wyciski/skany, przymiarki, oddanie protezy." },
            durability: { value: "Średnia", scale: 3, tooltip: "Zużywa się i wymaga okresowych dopasowań. Średnio 5–8 lat." },
            invasiveness: { value: "Niska", scale: 5, tooltip: "Najmniej zabiegowa opcja — żadnych cięć, żadnego szlifowania." },
            risk: { value: "Niskie", scale: 4, tooltip: "Może wpływać na komfort żucia i przyzwyczajenie. Wymaga adaptacji." },
            hygiene: { value: "Wymaga rutyny", scale: 3, tooltip: "Czyszczenie protezy po posiłkach + higiena jamy ustnej. Nie śpi się w protezie." },
            worksWhen: [
                "Brakuje kilku zębów i szukasz szybkiego rozwiązania",
                "Nie chcesz zabiegów chirurgicznych",
                "Opcja przejściowa w planie długofalowym (np. przed implantami)",
                "Ograniczenia zdrowotne wykluczające zabiegi",
            ],
            notIdealWhen: [
                "Priorytetem jest maksymalny komfort i stałość",
                "Wysokie wymagania estetyczne w streifie uśmiechu",
                "Nie akceptujesz protezy wyjmowanej",
                "Brak 1 zęba — zwykle wygodniejszy implant lub most",
            ],
            maintenance: { value: "Dopasowania wg potrzeb", tooltip: "Możliwe podścielenia, korekty, wymiana zębów w protezie." },
        },
        metrics: { durabilityScore: 55, speedScore: 85, minInvasiveScore: 95, maintenanceScore: 60, riskScore: 75 },
    },

    // ═══ METHODS — AESTHETICS ═══════════════════════════════════════════════

    // ── B1: Bonding ──
    bonding: {
        id: "bonding",
        label: "Bonding kompozytowy",
        short: "Bezpośrednia odbudowa kompozytem — szybka, zachowawcza, odwracalna.",
        icon: "🖌️",
        color: "#10b981",
        recommendedSpecialist: "katarzyna",
        table: {
            time: { value: "1 dzień – 2 tyg.", scale: 5, tooltip: "Prosty bonding 1–2 zębów: 1 wizyta. Większy zakres może wymagać higienizacji + sesji." },
            visits: { value: "1–3", scale: 5, tooltip: "Często wszystko w 1 sesji. Większe prace: plan + sesja zabiegowa." },
            durability: { value: "Średnia", scale: 3, tooltip: "Kompozyt wymaga polerowania co 1–2 lata i może się barwić. Żywotność: 3–7 lat." },
            invasiveness: { value: "Bardzo niska", scale: 5, tooltip: "Minimalne lub zerowe szlifowanie — dodajemy materiał, nie usuwamy tkanki." },
            risk: { value: "Niskie", scale: 5, tooltip: "Procedura odwracalna. Główne ryzyko: odbarwienie lub odłamanie fragmentu." },
            hygiene: { value: "Łatwa", scale: 5, tooltip: "Jak własne zęby — standardowe szczotkowanie i nitkowanie." },
            worksWhen: [
                "Drobne korekty: ukruszenia, małe diastemy, nierówności",
                "Chcesz szybko i bez szlifowania zębów",
                "Budżet jest ograniczony",
                "Chcesz przetestować zmianę — bonding można usunąć/zmienić",
            ],
            notIdealWhen: [
                "Duże zmiany koloru całego łuku — bonding nie zastąpi wybielania",
                "Bruksizm — bez szyny kompozyt pęka szybciej",
                "Oczekujesz wieloletniego efektu bez serwisu",
                "Potrzebujesz pełnej zmiany kształtu w strefie uśmiechu",
            ],
            maintenance: { value: "Polerowanie 1–2×/rok", tooltip: "Proste polerowanie utrzymuje gładkość i kolor. Drobne naprawy w gabinecie." },
        },
        metrics: { durabilityScore: 45, speedScore: 95, minInvasiveScore: 95, maintenanceScore: 70, riskScore: 90 },
    },

    // ── B2: Licówki kompozytowe ──
    veneer_composite: {
        id: "veneer_composite",
        label: "Licówki kompozytowe",
        short: "Cienkie pokrycia z kompozytu — kompromis między bondingiem a porcelaną.",
        icon: "🪞",
        color: "#f59e0b",
        recommendedSpecialist: "katarzyna",
        table: {
            time: { value: "1–7 dni", scale: 4, tooltip: "Często w 1–2 wizytach. Bez etapu laboratoryjnego." },
            visits: { value: "1–2", scale: 4, tooltip: "Plan + sesja zabiegowa. Przy większym zakresie: 2 sesje." },
            durability: { value: "Średnia", scale: 3, tooltip: "Podobna do bondingu: 3–7 lat. Wymagają polerowania i mogą się barwić." },
            invasiveness: { value: "Niska", scale: 4, tooltip: "Minimalne szlifowanie powierzchni — mniej niż przy porcelanowych." },
            risk: { value: "Niskie", scale: 4, tooltip: "Mniejsza trwałość niż porcelana, ale procedura odwracalna." },
            hygiene: { value: "Łatwa", scale: 4, tooltip: "Standardowa higiena. Unikaj jedzenia twardych rzeczy bezpośrednio przedniego." },
            worksWhen: [
                "Chcesz zmienić kształt kilku zębów bez dużego szlifowania",
                "Szukasz kompromisu: lepszy efekt niż bonding, mniejsza inwazyjność niż porcelana",
                "Chcesz efekt w 1–2 wizytach bez czekania na laboratorium",
                "Korekta diastem, kształtu, drobnych nierówności",
            ],
            notIdealWhen: [
                "Oczekujesz efektu 10+ lat bez serwisu",
                "Bruksizm — kompozyt jest mniej odporny na ścieranie",
                "Potrzebujesz dużej zmiany koloru — porcelana daje trwalszy efekt kolorystyczny",
                "Pełna metamorfoza 8–10 zębów — porcelana będzie trwalsza",
            ],
            maintenance: { value: "Polerowanie 1–2×/rok", tooltip: "Jak bonding: polerowanie i ocena stanu na wizytach kontrolnych." },
        },
        metrics: { durabilityScore: 50, speedScore: 85, minInvasiveScore: 80, maintenanceScore: 65, riskScore: 82 },
    },

    // ── B3: Licówki porcelanowe ──
    veneer_porcelain: {
        id: "veneer_porcelain",
        label: "Licówki porcelanowe",
        short: "Premium: trwałe, niebarwiące się — złoty standard estetyki.",
        icon: "💎",
        color: "#a855f7",
        recommendedSpecialist: "marcin",
        table: {
            time: { value: "2–4 tygodnie", scale: 3, tooltip: "Preparacja + skan → laboratorium → osadzenie. Wymaga etapu laboratoryjnego." },
            visits: { value: "2–4", scale: 3, tooltip: "Plan, preparacja + skan, przymiarka (opcja), cementowanie." },
            durability: { value: "Wysoka", scale: 5, tooltip: "Porcelana nie zmienia koloru, nie barwi się. Żywotność 10–20 lat." },
            invasiveness: { value: "Średnia", scale: 3, tooltip: "Wymaga opracowania warstwy szkliwa (0.3–0.7 mm). Procedura nieodwracalna." },
            risk: { value: "Średnie", scale: 3, tooltip: "Nieodwracalne szlifowanie. Przy bruksizmie: ryzyko pęknięcia bez szyny." },
            hygiene: { value: "Łatwa", scale: 4, tooltip: "Porcelana jest gładka — łatwa do czyszczenia. Standardowa higiena." },
            worksWhen: [
                "Chcesz trwały, niebarwiący się efekt na lata",
                "Pełna metamorfoza uśmiechu (8–10 zębów)",
                "Duża zmiana koloru, kształtu lub proporcji",
                "Priorytetem jest estetyka na najwyższym poziomie",
            ],
            notIdealWhen: [
                "Nie chcesz szlifować zębów — procedura nieodwracalna",
                "Budżet jest ograniczony",
                "Potrzebujesz korekty 1–2 zębów — bonding może wystarczyć",
                "Masz cienki szkliwo lub bardzo duże ubytki — korona może być konieczna",
            ],
            maintenance: { value: "Kontrole 1–2×/rok", tooltip: "Ocena stanu cementowania, kontrola zębów pod licówkami." },
        },
        metrics: { durabilityScore: 88, speedScore: 55, minInvasiveScore: 50, maintenanceScore: 78, riskScore: 60 },
    },

    // ── B4: Korony ──
    crown: {
        id: "crown",
        label: "Korona protetyczna",
        short: "Pełne pokrycie zęba — gdy trzeba odbudować i wzmocnić strukturę.",
        icon: "👑",
        color: "#38bdf8",
        recommendedSpecialist: "ilona",
        table: {
            time: { value: "5–14 dni", scale: 4, tooltip: "Preparacja + skan → laboratorium → cementowanie. Nosi się tymczasówkę." },
            visits: { value: "2–3", scale: 4, tooltip: "Preparacja + skan, ewentualna przymiarka, cementowanie." },
            durability: { value: "Wysoka", scale: 5, tooltip: "Korona ceramiczna chroni ząb i służy 10–20 lat." },
            invasiveness: { value: "Wysoka", scale: 1, tooltip: "Znaczne opracowanie zęba ze wszystkich stron. Najbardziej inwazyjna opcja." },
            risk: { value: "Średnie", scale: 3, tooltip: "Wymaga oceny żywotności zęba. Czasem potrzebne wcześniejsze leczenie kanałowe." },
            hygiene: { value: "Łatwa", scale: 4, tooltip: "Jak przy własnym zębie — standardowa higiena + nitkowanie." },
            worksWhen: [
                "Ząb jest mocno zniszczony (po endo, duże ubytki, pęknięcia)",
                "Potrzebujesz wzmocnienia struktury + zmiany estetyki",
                "Licówka nie wystarczy (za mało tkanki, ząb martwiaczy)",
                "Bruksizm — korona ceramiczna jest bardziej odporna niż licówka",
            ],
            notIdealWhen: [
                "Ząb jest zdrowy i chcesz tylko poprawić estetykę — licówka lub bonding wystarczy",
                "Chcesz zachować jak najwięcej własnej tkanki",
                "Zmiana dotyczy tylko powierzchni labialnej — licówka jest mniej inwazyjna",
                "Problem jest czysto kolorystyczny — rozważ wybielanie",
            ],
            maintenance: { value: "Kontrole 1–2×/rok", tooltip: "Kontrola stanu korony, ocena szczelności brzegów, RTG kontrolne." },
        },
        metrics: { durabilityScore: 85, speedScore: 70, minInvasiveScore: 20, maintenanceScore: 75, riskScore: 55 },
    },
};

// ═══ GATING RULES ════════════════════════════════════════════════════════════

export const GATING_RULES: GatingRule[] = [
    // ── MISSING TOOTH RULES ──
    {
        id: "neighbors_healthy_penalty_bridge",
        comparatorId: "missing_tooth",
        answers: { neighbors: "yes" },
        effects: [
            { methodId: "bridge", scoreDelta: -12, badge: "Wymaga opracowania zdrowych zębów sąsiednich" },
        ],
    },
    {
        id: "front_penalty_partial",
        comparatorId: "missing_tooth",
        answers: { location: "front" },
        effects: [
            { methodId: "partial_denture", scoreDelta: -8, badge: "W strefie uśmiechu zwykle rozważamy rozwiązania stałe" },
        ],
    },
    {
        id: "several_bonus_partial",
        comparatorId: "missing_tooth",
        answers: { count: "several" },
        effects: [
            { methodId: "partial_denture", scoreDelta: 10, badge: "Często dobra opcja przy wielu brakach" },
        ],
    },
    {
        id: "one_tooth_penalty_partial",
        comparatorId: "missing_tooth",
        answers: { count: "one" },
        effects: [
            { methodId: "partial_denture", scoreDelta: -6, badge: "Przy braku 1 zęba wygodniejszy zwykle implant lub most" },
        ],
    },
    {
        id: "neighbors_damaged_bonus_bridge",
        comparatorId: "missing_tooth",
        answers: { neighbors: "no" },
        effects: [
            { methodId: "bridge", scoreDelta: 8, badge: "Zęby sąsiednie wymagają odbudowy — most je jednocześnie chroni" },
        ],
    },

    // ── AESTHETICS RULES ──
    {
        id: "bruxism_penalty_bonding",
        comparatorId: "aesthetics",
        answers: { bruxism: "yes" },
        effects: [
            { methodId: "bonding", scoreDelta: -10, badge: "Bruksizm: kompozyt wymaga szyny ochronnej, ryzyko pęknięcia" },
            { methodId: "veneer_composite", scoreDelta: -8, badge: "Bruksizm: licówki kompozytowe mniej odporne na ścieranie" },
            { methodId: "veneer_porcelain", scoreDelta: -4, badge: "Bruksizm: porcelana bardziej odporna, ale wymaga szyny nocnej" },
            { methodId: "crown", scoreDelta: 5, badge: "Bruksizm: korona najlepiej chroni ząb przy zaciskaniu" },
        ],
    },
    {
        id: "large_scope_penalty_bonding",
        comparatorId: "aesthetics",
        answers: { count: "8-10" },
        effects: [
            { methodId: "bonding", scoreDelta: -5, badge: "Przy 8–10 zębach bonding wymaga regularnego serwisu — rozważ licówki" },
            { methodId: "veneer_porcelain", scoreDelta: 5, badge: "Pełna metamorfoza — porcelana daje najtrwalszy efekt" },
        ],
    },
    {
        id: "wear_bonus_crown",
        comparatorId: "aesthetics",
        answers: { problem: "wear" },
        effects: [
            { methodId: "crown", scoreDelta: 6, badge: "Przy startach korona odbudowuje i chroni strukturę zęba" },
            { methodId: "bonding", scoreDelta: -3, badge: "Starty: bonding na dużych powierzchniach może wymagać częstszych korekt" },
        ],
    },
    {
        id: "small_scope_bonus_bonding",
        comparatorId: "aesthetics",
        answers: { count: "1-2" },
        effects: [
            { methodId: "bonding", scoreDelta: 8, badge: "Dla 1–2 zębów bonding jest najszybszy i najoszczędniejszy" },
        ],
    },
    {
        id: "color_bonus_porcelain",
        comparatorId: "aesthetics",
        answers: { problem: "color" },
        effects: [
            { methodId: "veneer_porcelain", scoreDelta: 4, badge: "Porcelana nie zmienia koloru — stały efekt kolorystyczny" },
            { methodId: "bonding", scoreDelta: -3, badge: "Kompozyt może się barwić z czasem — wymaga polerowania" },
        ],
    },
];

// ═══ SCORING FUNCTION ════════════════════════════════════════════════════════

function matchesAnswers(ruleAnswers: Record<string, string>, userAnswers: Record<string, string>): boolean {
    return Object.entries(ruleAnswers).every(([key, value]) => userAnswers[key] === value);
}

export function rankMethods(
    comparator: Comparator,
    priority: string,
    answers: Record<string, string>,
): ScoredMethod[] {
    const w = PRIORITY_WEIGHTS[priority] || PRIORITY_WEIGHTS.balanced;

    let scored: ScoredMethod[] = comparator.methodIds.map(methodId => {
        const m = METHODS[methodId];
        if (!m) return { methodId, score: 0, badges: [] };

        const base =
            m.metrics.durabilityScore * w.durabilityScore +
            m.metrics.speedScore * w.speedScore +
            m.metrics.minInvasiveScore * w.minInvasiveScore +
            m.metrics.maintenanceScore * w.maintenanceScore +
            m.metrics.riskScore * w.riskScore;

        return { methodId, score: Math.round(base * 10) / 10, badges: [] };
    });

    // Apply gating rules
    for (const rule of GATING_RULES) {
        if (rule.comparatorId !== comparator.id) continue;
        if (!matchesAnswers(rule.answers, answers)) continue;

        for (const eff of rule.effects) {
            const item = scored.find(x => x.methodId === eff.methodId);
            if (!item) continue;
            item.score = Math.round((item.score + eff.scoreDelta) * 10) / 10;
            if (eff.badge) item.badges.push(eff.badge);
        }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
}

// ═══ RECOMMENDATION TEXT ═════════════════════════════════════════════════════

const PRIORITY_LABELS: Record<string, string> = {
    balanced: "zbalansowane podejście",
    durable: "najtrwalsze rozwiązanie",
    min_invasive: "najmniej inwazyjne rozwiązanie",
    fast: "najszybsze rozwiązanie",
    easy_maintenance: "najłatwiejsze w utrzymaniu",
};

export function getRecommendationText(priority: string, topMethod: ScoredMethod): string {
    const method = METHODS[topMethod.methodId];
    if (!method) return "";
    const priorityLabel = PRIORITY_LABELS[priority] || "zbalansowane podejście";
    return `Przy priorytecie „${priorityLabel}" najczęściej rozważaną opcją jest **${method.label}**. ${method.short}`;
}
