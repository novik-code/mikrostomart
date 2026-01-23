
export interface SymptomInfo {
    title: string;
    description: string;
    symptoms: string[];
    advice: string;
    urgency: 'low' | 'medium' | 'high';
}

// Helper to share data between similar teeth
const COMMON_DATA = {
    incisor: {
        title: "Siekacz (Jedynka/Dwójka)",
        description: "Ząb przedni, odpowiedzialny za odgryzanie.",
        symptoms: ["Nadwrażliwość na zimno", "Ból przy odgryzaniu", "Ukruszenie brzegu", "Estetyka (przebarwienie)"],
        advice: "Ból przy odgryzaniu może sugerować uraz lub próchnicę. Jeśli to tylko estetyka - zapraszamy na bonding.",
        urgency: 'low'
    },
    canine: {
        title: "Kieł (Trójka)",
        description: "Ząb narożny, korzeń jest bardzo długi.",
        symptoms: ["Ból promieniujący do oka", "Nadwrażliwość przy szyjce (od dziąsła)", "Starcie wierzchołka"],
        advice: "Kły są kluczowe dla prowadzenia zgryzu. Ich ścieranie sugeruje bruksizm (zgrzytanie).",
        urgency: 'medium'
    },
    premolar: {
        title: "Przedtrzonowiec (Czwórka/Piątka)",
        description: "Ząb boczny, strefa przejściowa.",
        symptoms: ["Pęknięcie pionowe", "Ból przy żuciu", "Ubytek klinowy przy dziąśle"],
        advice: "Często pękają od zaciskania zębów. Wymagają dokładnej diagnostyki pod mikroskopem.",
        urgency: 'medium'
    },
    molar: {
        title: "Trzonowiec (Szóstka/Siódemka/Ósemka)",
        description: "Duży ząb trzonowy do rozgniatania pokarmu.",
        symptoms: ["Głęboki ból pulsujący", "Reakcja na ciepło", "Trudność w gryzieniu", "Jedzenie wchodzi między zęby"],
        advice: "Jeśli reaguje na ciepło - to może być stan zapalny miazgi (leczenie kanałowe). Jeśli jedzenie wchodzi - nieszczelna plomba.",
        urgency: 'high'
    }
};

export const SYMPTOM_DATA: Record<string, SymptomInfo> = {
    // UPPER LEFT (Quadrant 2)
    "21": { ...COMMON_DATA.incisor, title: "Górna Lewa Jedynka" },
    "22": { ...COMMON_DATA.incisor, title: "Górna Lewa Dwójka" },
    "23": { ...COMMON_DATA.canine, title: "Górny Lewy Kieł" },
    "24": { ...COMMON_DATA.premolar, title: "Górna Lewa Czwórka" },
    "25": { ...COMMON_DATA.premolar, title: "Górna Lewa Piątka" },
    "26": { ...COMMON_DATA.molar, title: "Górna Lewa Szóstka" },
    "27": { ...COMMON_DATA.molar, title: "Górna Lewa Siódemka" },
    "28": { ...COMMON_DATA.molar, title: "Górna Lewa Ósemka" },

    // UPPER RIGHT (Quadrant 1)
    "11": { ...COMMON_DATA.incisor, title: "Górna Prawa Jedynka" },
    "12": { ...COMMON_DATA.incisor, title: "Górna Prawa Dwójka" },
    "13": { ...COMMON_DATA.canine, title: "Górny Prawy Kieł" },
    "14": { ...COMMON_DATA.premolar, title: "Górna Prawa Czwórka" },
    "15": { ...COMMON_DATA.premolar, title: "Górna Prawa Piątka" },
    "16": { ...COMMON_DATA.molar, title: "Górna Prawa Szóstka" },
    "17": { ...COMMON_DATA.molar, title: "Górna Prawa Siódemka" },
    "18": { ...COMMON_DATA.molar, title: "Górna Prawa Ósemka" },

    // LOWER LEFT (Quadrant 3)
    "31": { ...COMMON_DATA.incisor, title: "Dolna Lewa Jedynka" },
    "32": { ...COMMON_DATA.incisor, title: "Dolna Lewa Dwójka" },
    "33": { ...COMMON_DATA.canine, title: "Dolny Lewy Kieł" },
    "34": { ...COMMON_DATA.premolar, title: "Dolna Lewa Czwórka" },
    "35": { ...COMMON_DATA.premolar, title: "Dolna Lewa Piątka" },
    "36": { ...COMMON_DATA.molar, title: "Dolna Lewa Szóstka" },
    "37": { ...COMMON_DATA.molar, title: "Dolna Lewa Siódemka" },
    "38": { ...COMMON_DATA.molar, title: "Dolna Lewa Ósemka" },

    // LOWER RIGHT (Quadrant 4)
    "41": { ...COMMON_DATA.incisor, title: "Dolna Prawa Jedynka" },
    "42": { ...COMMON_DATA.incisor, title: "Dolna Prawa Dwójka" },
    "43": { ...COMMON_DATA.canine, title: "Dolny Prawy Kieł" },
    "44": { ...COMMON_DATA.premolar, title: "Dolna Prawa Czwórka" },
    "45": { ...COMMON_DATA.premolar, title: "Dolna Prawa Piątka" },
    "46": { ...COMMON_DATA.molar, title: "Dolna Prawa Szóstka" },
    "47": { ...COMMON_DATA.molar, title: "Dolna Prawa Siódemka" },
    "48": { ...COMMON_DATA.molar, title: "Dolna Prawa Ósemka" },

    // SOFT TISSUES
    "tongue": {
        title: "Język",
        description: "Dolegliwości języka i dna jamy ustnej.",
        symptoms: ["Pieczenie", "Biały nalot", "Zmiany na boku języka"],
        advice: "Często powiązane z dietą, papierosami lub ostrymi krawędziami zębów. Wymaga kontroli.",
        urgency: 'low'
    },
    "palate": {
        title: "Podniebienie",
        description: "Górna ściana jamy ustnej.",
        symptoms: ["Pieczenie", "Guzek", "Otarcia"],
        advice: "Najczęściej oparzenia termiczne. Jeśli zmiana trwa >2 tygodnie, pokaż to lekarzowi.",
        urgency: 'medium'
    },
    "throat": {
        title: "Gardło / Tylna ściana",
        description: "Obszar za językiem i migdałki.",
        symptoms: ["Drapanie", "Trudności w przełykaniu", "Zaczerwienienie"],
        advice: "Może to być infekcja wirusowa, ale też powikłanie od zębów (ósemek).",
        urgency: 'medium'
    },
    "cheek-left": {
        title: "Policzek Lewy",
        description: "Błona śluzowa policzka.",
        symptoms: ["Przygryzanie (kresa biała)", "Afty", "Zmiany na śluzówce"],
        advice: "Przygryzanie policzka świadczy o problemach ze zgryzem lub stresem.",
        urgency: 'low'
    },
    "cheek-right": {
        title: "Policzek Prawy",
        description: "Błona śluzowa policzka.",
        symptoms: ["Przygryzanie (kresa biała)", "Afty", "Zmiany na śluzówce"],
        advice: "Przygryzanie policzka świadczy o problemach ze zgryzem lub stresem.",
        urgency: 'low'
    }
};

export type SymptomKey = keyof typeof SYMPTOM_DATA;
