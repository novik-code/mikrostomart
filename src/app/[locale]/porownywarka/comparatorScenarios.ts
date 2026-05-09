import type { Comparator } from "./comparatorTypes";

export const COMPARATORS_ALL: Comparator[] = [
    // ═══ ESTETYKA ═══
    {
        id: "smile_upgrade", categoryId: "estetyka",
        title: "Metamorfoza uśmiechu", subtitle: "Wybielanie vs bonding vs licówki vs korony",
        icon: "😁", color: "#a855f7", methodIds: ["whitening", "bonding_smile", "veneer_porc_smile", "crown_smile"],
        questions: [
            {
                id: "goal", label: "Co chcesz zmienić?", options: [
                    { value: "color", label: "Tylko kolor (jaśniejszy)", emoji: "🎨" },
                    { value: "shape", label: "Kształt i proporcje", emoji: "📐" },
                    { value: "both", label: "Kolor i kształt", emoji: "✨" },
                ]
            },
            {
                id: "scope", label: "Ile zębów dotyczy zmiana?", options: [
                    { value: "few", label: "1–2 zęby", emoji: "1️⃣" },
                    { value: "medium", label: "4–6 zębów", emoji: "🔢" },
                    { value: "full", label: "8–10 (cały łuk)", emoji: "😁" },
                ]
            },
            {
                id: "bruxism", label: "Czy zaciskasz/zgrzytasz zębami?", options: [
                    { value: "no", label: "Nie / nie wiem", emoji: "😊" },
                    { value: "yes", label: "Tak, mam bruksizm", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "veneer_type", categoryId: "estetyka",
        title: "Licówki: kompozyt vs porcelana", subtitle: "Szybkość vs trwałość",
        icon: "💎", color: "#a855f7", methodIds: ["veneer_comp_type", "veneer_porc_type"],
        questions: [
            {
                id: "scope_v", label: "Ile zębów planujesz?", options: [
                    { value: "few", label: "1–3 zęby", emoji: "1️⃣" },
                    { value: "many", label: "4–10 zębów", emoji: "🔢" },
                ]
            },
            {
                id: "priority_v", label: "Co ważniejsze?", options: [
                    { value: "speed", label: "Szybkość realizacji", emoji: "⚡" },
                    { value: "longevity", label: "Trwałość na lata", emoji: "🏰" },
                ]
            },
            {
                id: "bruxism_v", label: "Bruksizm?", options: [
                    { value: "no", label: "Nie", emoji: "😊" },
                    { value: "yes", label: "Tak", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "bonding_scope", categoryId: "estetyka",
        title: "Bonding: punktowy vs full arch", subtitle: "1–2 zęby vs 6–10 zębów",
        icon: "🖌️", color: "#10b981", methodIds: ["bonding_spot", "bonding_full"],
        questions: [
            {
                id: "problem_b", label: "Jaki problem chcesz rozwiązać?", options: [
                    { value: "chip", label: "Ukruszenie / odłamanie", emoji: "💔" },
                    { value: "gap", label: "Diastema / przerwy", emoji: "↔️" },
                    { value: "shape", label: "Kształt / proporcje", emoji: "📐" },
                ]
            },
            {
                id: "scope_b", label: "Ile zębów wymaga korekty?", options: [
                    { value: "few", label: "1–2 zęby", emoji: "1️⃣" },
                    { value: "many", label: "4–10 zębów", emoji: "🔢" },
                ]
            },
            {
                id: "bruxism_b", label: "Bruksizm?", options: [
                    { value: "no", label: "Nie", emoji: "😊" },
                    { value: "yes", label: "Tak", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "straighten_vs_mask", categoryId: "estetyka",
        title: "Prostowanie vs maskowanie", subtitle: "Ortodoncja (alignery) vs bonding/licówki",
        icon: "🔄", color: "#06b6d4", methodIds: ["aligners", "bonding_mask"],
        questions: [
            {
                id: "problem_s", label: "Co Ci przeszkadza?", options: [
                    { value: "crowding", label: "Stłoczenia / rotacje", emoji: "🔀" },
                    { value: "gaps", label: "Przerwy / diastemy", emoji: "↔️" },
                    { value: "both", label: "I jedno, i drugie", emoji: "🔄" },
                ]
            },
            {
                id: "patience", label: "Ile czasu możesz poświęcić?", options: [
                    { value: "fast", label: "Chcę efekt w dniach/tygodniach", emoji: "⚡" },
                    { value: "wait", label: "Mogę poczekać miesiące", emoji: "⏳" },
                ]
            },
            {
                id: "cause", label: "Chcesz leczyć przyczynę czy efekt?", options: [
                    { value: "cause", label: "Przyczynę — ruch zębów", emoji: "🎯" },
                    { value: "effect", label: "Efekt — szybka zmiana wyglądu", emoji: "🎭" },
                ]
            },
        ],
    },
    {
        id: "diastema", categoryId: "estetyka",
        title: "Diastema — jak zamknąć?", subtitle: "Bonding vs ortodoncja vs licówki",
        icon: "↔️", color: "#f59e0b", methodIds: ["bonding_dia", "ortho_dia", "veneer_dia"],
        questions: [
            {
                id: "gap_size", label: "Jak duża jest przerwa?", options: [
                    { value: "small", label: "Mała (<2 mm)", emoji: "📏" },
                    { value: "medium", label: "Średnia (2–3 mm)", emoji: "📐" },
                    { value: "large", label: "Duża (>3 mm)", emoji: "↔️" },
                ]
            },
            {
                id: "other_issues", label: "Czy są inne nierówności?", options: [
                    { value: "no", label: "Nie, tylko diastema", emoji: "✅" },
                    { value: "yes", label: "Tak, inne nierówności też", emoji: "🔀" },
                ]
            },
            {
                id: "speed_d", label: "Jak szybko chcesz efekt?", options: [
                    { value: "asap", label: "Jak najszybciej", emoji: "⚡" },
                    { value: "can_wait", label: "Mogę poczekać", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "bruxism_wear", categoryId: "estetyka",
        title: "Starcia / bruksizm", subtitle: "Szyna + odbudowy vs licówki vs korony",
        icon: "😬", color: "#ef4444", methodIds: ["splint_rebuild", "veneer_brux", "crown_brux"],
        questions: [
            {
                id: "wear_level", label: "Stopień starć?", options: [
                    { value: "mild", label: "Wczesne (lekkie ścięcie brzegów)", emoji: "🟡" },
                    { value: "moderate", label: "Umiarkowane (widoczna utrata tkanek)", emoji: "🟠" },
                    { value: "severe", label: "Zaawansowane (zęby krótkie, płaskie)", emoji: "🔴" },
                ]
            },
            {
                id: "tooth_count_w", label: "Ile zębów wymaga odbudowy?", options: [
                    { value: "few", label: "1–4 zęby", emoji: "1️⃣" },
                    { value: "many", label: "8+ zębów", emoji: "🔢" },
                ]
            },
            {
                id: "splint_ok", label: "Czy zaakceptujesz szynę nocną?", options: [
                    { value: "yes", label: "Tak, bez problemu", emoji: "✅" },
                    { value: "no", label: "Wolałbym się obejść bez", emoji: "❌" },
                ]
            },
        ],
    },

    // ═══ BRAKI ZĘBOWE ═══
    {
        id: "missing_tooth", categoryId: "braki",
        title: "Brak zęba", subtitle: "Implant vs most vs proteza",
        icon: "🦷", color: "#38bdf8", methodIds: ["implant", "bridge", "partial_denture"],
        questions: [
            {
                id: "location", label: "Gdzie brakuje zęba?", options: [
                    { value: "front", label: "Strefa uśmiechu (1–5)", emoji: "😁" },
                    { value: "back", label: "Zęby boczne (6–8)", emoji: "🔨" },
                ]
            },
            {
                id: "count", label: "Ile zębów brakuje?", options: [
                    { value: "one", label: "1 ząb", emoji: "1️⃣" },
                    { value: "few", label: "2–3 zęby", emoji: "🔢" },
                    { value: "many", label: "4+ zębów", emoji: "📊" },
                ]
            },
            {
                id: "neighbors", label: "Stan sąsiednich zębów?", options: [
                    { value: "healthy", label: "Zdrowe, bez wypełnień", emoji: "✅" },
                    { value: "restored", label: "Z wypełnieniami lub koronami", emoji: "🔧" },
                ]
            },
        ],
    },
    {
        id: "implant_timing", categoryId: "braki",
        title: "Implant: natychmiastowy vs odroczony", subtitle: "Od razu po ekstrakcji vs po gojeniu",
        icon: "⏱️", color: "#38bdf8", methodIds: ["implant_immediate", "implant_delayed"],
        questions: [
            {
                id: "infection", label: "Czy jest stan zapalny / ropień?", options: [
                    { value: "no", label: "Nie, ząb jest spokojny", emoji: "✅" },
                    { value: "yes", label: "Tak, jest infekcja", emoji: "🔴" },
                ]
            },
            {
                id: "zone", label: "Gdzie jest ząb?", options: [
                    { value: "aesthetic", label: "Strefa uśmiechu", emoji: "😁" },
                    { value: "posterior", label: "Zęby boczne", emoji: "🔨" },
                ]
            },
            {
                id: "bone", label: "Co mówi lekarz o kości?", options: [
                    { value: "good", label: "Wystarczająca kość", emoji: "💪" },
                    { value: "deficient", label: "Brak kości / augmentacja", emoji: "📉" },
                ]
            },
        ],
    },
    {
        id: "bridge_types", categoryId: "braki",
        title: "Uzupełnienie stałe", subtitle: "Implant+korona vs most na zębach vs most na implantach",
        icon: "🌉", color: "#f59e0b", methodIds: ["implant", "bridge_on_teeth", "bridge_on_implants"],
        questions: [
            {
                id: "gap_count", label: "Ile zębów brakuje obok siebie?", options: [
                    { value: "one", label: "1 ząb", emoji: "1️⃣" },
                    { value: "two_three", label: "2–3 zęby", emoji: "🔢" },
                    { value: "more", label: "4+ zębów", emoji: "📊" },
                ]
            },
            {
                id: "abutment", label: "Stan zębów filarowych?", options: [
                    { value: "healthy", label: "Zdrowe", emoji: "✅" },
                    { value: "restored", label: "Z koronami/dużymi wypełnieniami", emoji: "🔧" },
                ]
            },
            {
                id: "bone_b", label: "Kość wystarczająca na implanty?", options: [
                    { value: "yes", label: "Tak", emoji: "💪" },
                    { value: "no", label: "Nie / nie wiem", emoji: "❓" },
                ]
            },
        ],
    },
    {
        id: "denture_types", categoryId: "braki",
        title: "Proteza częściowa — jaki typ?", subtitle: "Akrylowa vs szkieletowa vs elastyczna",
        icon: "⚙️", color: "#10b981", methodIds: ["denture_acrylic", "denture_skeletal", "denture_flexible"],
        questions: [
            {
                id: "missing_count_d", label: "Ile zębów brakuje?", options: [
                    { value: "few", label: "1–3 zęby", emoji: "1️⃣" },
                    { value: "many", label: "4+ zębów", emoji: "📊" },
                ]
            },
            {
                id: "aesthetics_d", label: "Jak ważna jest estetyka?", options: [
                    { value: "critical", label: "Bardzo ważna — klamry niewidoczne", emoji: "💎" },
                    { value: "ok", label: "Akceptuję widoczne klamry", emoji: "👍" },
                ]
            },
            {
                id: "duration_d", label: "Na jak długo planujesz protezę?", options: [
                    { value: "temp", label: "Tymczasowo (przed implantami)", emoji: "⏳" },
                    { value: "long", label: "Na dłużej / docelowo", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "full_denture", categoryId: "braki",
        title: "Bezzębie: proteza vs overdenture", subtitle: "Proteza całkowita vs proteza na implantach",
        icon: "🔩", color: "#38bdf8", methodIds: ["full_denture", "overdenture"],
        questions: [
            {
                id: "jaw", label: "Która szczęka?", options: [
                    { value: "upper", label: "Górna", emoji: "⬆️" },
                    { value: "lower", label: "Dolna", emoji: "⬇️" },
                ]
            },
            {
                id: "stability", label: "Czy proteza \"skacze\"?", options: [
                    { value: "stable", label: "Trzyma się dobrze", emoji: "✅" },
                    { value: "loose", label: "Luźna, spada przy jedzeniu", emoji: "😫" },
                ]
            },
            {
                id: "surgery_ok", label: "Akceptujesz zabieg chirurgiczny?", options: [
                    { value: "yes", label: "Tak", emoji: "✅" },
                    { value: "no", label: "Nie / boję się", emoji: "❌" },
                ]
            },
        ],
    },
    {
        id: "onlay_vs_crown", categoryId: "braki",
        title: "Onlay vs korona", subtitle: "Zachowanie tkanek vs pełna ochrona",
        icon: "🧩", color: "#10b981", methodIds: ["onlay", "crown_rebuild"],
        questions: [
            {
                id: "endo_done", label: "Czy ząb miał leczenie kanałowe?", options: [
                    { value: "no", label: "Nie — ząb żywy", emoji: "💚" },
                    { value: "yes", label: "Tak — po endo", emoji: "🔬" },
                ]
            },
            {
                id: "walls", label: "Ile ścian korony zachowanych?", options: [
                    { value: "three_plus", label: "3–4 ściany", emoji: "🏰" },
                    { value: "two_less", label: "1–2 ściany", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_o", label: "Bruksizm?", options: [
                    { value: "no", label: "Nie", emoji: "😊" },
                    { value: "yes", label: "Tak", emoji: "😬" },
                ]
            },
        ],
    },
    {
        id: "crown_vs_composite", categoryId: "braki",
        title: "Korona vs odbudowa kompozytowa", subtitle: "Mocno zniszczony ząb — co wybrać?",
        icon: "👑", color: "#38bdf8", methodIds: ["crown_rebuild", "composite_rebuild"],
        questions: [
            {
                id: "destruction", label: "Jak bardzo zniszczony jest ząb?", options: [
                    { value: "moderate", label: "30–50% korony", emoji: "🟡" },
                    { value: "severe", label: ">50% korony", emoji: "🔴" },
                ]
            },
            {
                id: "endo_cr", label: "Czy był leczony kanałowo?", options: [
                    { value: "no", label: "Nie", emoji: "💚" },
                    { value: "yes", label: "Tak", emoji: "🔬" },
                ]
            },
            {
                id: "position_cr", label: "Który ząb?", options: [
                    { value: "front", label: "Przedni", emoji: "😁" },
                    { value: "back", label: "Boczny (trzonowiec/przedtrzonowiec)", emoji: "🔨" },
                ]
            },
        ],
    },

    // ═══ KANAŁOWE ═══
    {
        id: "endo_vs_extract", categoryId: "kanalowe",
        title: "Endo vs ekstrakcja + implant", subtitle: "Ratować ząb czy zastąpić?",
        icon: "⚔️", color: "#f59e0b", methodIds: ["endo", "extract_implant"],
        questions: [
            {
                id: "tooth_state", label: "Stan zęba?", options: [
                    { value: "restorable", label: "Da się odbudować", emoji: "🔧" },
                    { value: "questionable", label: "Wątpliwe rokowanie", emoji: "❓" },
                    { value: "hopeless", label: "Nie nadaje się do ratowania", emoji: "⚠️" },
                ]
            },
            {
                id: "strategic", label: "Czy ząb jest strategicznie ważny?", options: [
                    { value: "yes", label: "Tak (filar, jedynka, kluczowa pozycja)", emoji: "⭐" },
                    { value: "no", label: "Nie koliduje z planem leczenia", emoji: "👍" },
                ]
            },
            {
                id: "time_pref", label: "Szybkość vs trwałość?", options: [
                    { value: "save_time", label: "Chcę szybciej — 1–3 wizyty", emoji: "⚡" },
                    { value: "invest", label: "Inwestuję w trwałość — mogę czekać", emoji: "🏰" },
                ]
            },
        ],
    },
    {
        id: "retreatment", categoryId: "kanalowe",
        title: "Powtórne endo vs resekcja vs ekstrakcja", subtitle: "Co gdy pierwsze endo nie zadziałało?",
        icon: "🔁", color: "#f59e0b", methodIds: ["re_endo", "resection", "extraction_after"],
        questions: [
            {
                id: "previous", label: "Dlaczego pierwsze endo nie zadziałało?", options: [
                    { value: "short", label: "Krótkie wypełnienie / pominięty kanał", emoji: "📏" },
                    { value: "leakage", label: "Nieszczelna odbudowa, wtórna infekcja", emoji: "💧" },
                    { value: "anatomy", label: "Trudna anatomia / złamany instrument", emoji: "🔧" },
                ]
            },
            {
                id: "post_present", label: "Czy w kanale jest wkład koronowy?", options: [
                    { value: "no", label: "Nie — dostęp od góry możliwy", emoji: "✅" },
                    { value: "yes", label: "Tak — nie da się usunąć", emoji: "🔒" },
                ]
            },
            {
                id: "symptoms_r", label: "Objawy?", options: [
                    { value: "none", label: "Brak — zmiana tylko na RTG", emoji: "📷" },
                    { value: "mild", label: "Lekki ból, dyskomfort", emoji: "🟡" },
                    { value: "acute", label: "Silny ból / obrzęk / ropień", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "endo_sessions", categoryId: "kanalowe",
        title: "Endo: 1 wizyta vs 2 wizyty", subtitle: "Komfort vs bezpieczeństwo",
        icon: "📅", color: "#38bdf8", methodIds: ["endo_1visit", "endo_2visit"],
        questions: [
            {
                id: "diagnosis_e", label: "Jaka jest diagnoza?", options: [
                    { value: "pulpitis", label: "Zapalenie miazgi (ból na gorące/zimne)", emoji: "🔥" },
                    { value: "necrosis", label: "Martwica / zmiana na RTG", emoji: "📷" },
                    { value: "abscess", label: "Ropień / obrzęk", emoji: "🔴" },
                ]
            },
            {
                id: "anatomy_e", label: "Anatomia kanałowa?", options: [
                    { value: "simple", label: "Prosta (1–2 kanały)", emoji: "📏" },
                    { value: "complex", label: "Złożona (3+ kanałów, zagięcia)", emoji: "🔀" },
                ]
            },
            {
                id: "preference_e", label: "Twoja preferencja?", options: [
                    { value: "one_done", label: "Jedno posiedzenie — mam to z głowy", emoji: "⚡" },
                    { value: "safe", label: "Wolę dwie krótsze wizyty", emoji: "🛡️" },
                ]
            },
        ],
    },
    {
        id: "post_endo_rebuild", categoryId: "kanalowe",
        title: "Odbudowa po endo", subtitle: "Wypełnienie vs wkład + korona",
        icon: "🏗️", color: "#10b981", methodIds: ["filling_post_endo", "post_crown"],
        questions: [
            {
                id: "tooth_type_pe", label: "Który ząb?", options: [
                    { value: "front", label: "Przedni (siekacz, kieł)", emoji: "😁" },
                    { value: "back", label: "Boczny (przedtrzonowiec, trzonowiec)", emoji: "🔨" },
                ]
            },
            {
                id: "tissue_loss", label: "Ile tkanek zostało?", options: [
                    { value: "plenty", label: "Dużo — 3–4 ściany", emoji: "🏰" },
                    { value: "little", label: "Mało — 1–2 ściany", emoji: "⚠️" },
                ]
            },
            {
                id: "bruxism_pe", label: "Bruksizm?", options: [
                    { value: "no", label: "Nie", emoji: "😊" },
                    { value: "yes", label: "Tak", emoji: "😬" },
                ]
            },
        ],
    },

    // ═══ PERIODONTOLOGIA ═══
    {
        id: "hygiene_methods", categoryId: "periodontologia",
        title: "Skaling vs AIRFLOW vs kiretaż", subtitle: "Co wybrać na kamień i płytkę?",
        icon: "💨", color: "#10b981", methodIds: ["scaling", "airflow", "curettage"],
        questions: [
            {
                id: "pockets", label: "Głębokość kieszonek?", options: [
                    { value: "none", label: "Nie mam kieszonek / nie wiem", emoji: "❓" },
                    { value: "shallow", label: "Do 4 mm", emoji: "🟡" },
                    { value: "deep", label: ">4 mm", emoji: "🔴" },
                ]
            },
            {
                id: "sensitivity_h", label: "Wrażliwość dziąseł?", options: [
                    { value: "normal", label: "Normalne", emoji: "👍" },
                    { value: "sensitive", label: "Bardzo wrażliwe, krwawią", emoji: "🩸" },
                ]
            },
            {
                id: "implants_h", label: "Masz implanty lub prace protetyczne?", options: [
                    { value: "no", label: "Nie", emoji: "❌" },
                    { value: "yes", label: "Tak", emoji: "✅" },
                ]
            },
        ],
    },
    {
        id: "gum_treatment", categoryId: "periodontologia",
        title: "Leczenie dziąseł — jaki poziom?", subtitle: "Higienizacja vs kiretaż zamknięty vs otwarty",
        icon: "🩺", color: "#10b981", methodIds: ["hygiene_instruct", "curettage_closed", "curettage_open"],
        questions: [
            {
                id: "pockets_g", label: "Głębokość kieszonek?", options: [
                    { value: "up_to_4", label: "Do 4 mm", emoji: "🟡" },
                    { value: "4_to_6", label: "4–6 mm", emoji: "🟠" },
                    { value: "over_6", label: ">6 mm", emoji: "🔴" },
                ]
            },
            {
                id: "bone_loss_g", label: "Utrata kości na RTG?", options: [
                    { value: "none", label: "Brak / minimalna", emoji: "✅" },
                    { value: "moderate", label: "Umiarkowana", emoji: "🟠" },
                    { value: "advanced", label: "Zaawansowana", emoji: "🔴" },
                ]
            },
            {
                id: "compliance", label: "Higiena domowa?", options: [
                    { value: "good", label: "Dobra — szczotkuję 2×, nitkuję", emoji: "⭐" },
                    { value: "average", label: "Średnia — szczotkuję, ale nie nitkuję", emoji: "👍" },
                ]
            },
        ],
    },
    {
        id: "sensitivity", categoryId: "periodontologia",
        title: "Nadwrażliwość zębów", subtitle: "Lakier vs laser vs pasta",
        icon: "❄️", color: "#06b6d4", methodIds: ["varnish_sensitivity", "laser_sensitivity", "paste_sensitivity"],
        questions: [
            {
                id: "intensity", label: "Jak silna jest nadwrażliwość?", options: [
                    {
                        value: "mild", label: "Łagodna — czasem przechodzą ciarki", emoji: "🟡"
                    },
                    { value: "moderate", label: "Umiarkowana — boli przy zimnym/gorącym", emoji: "🟠" },
                    { value: "severe", label: "Silna — boli samoistnie", emoji: "🔴" },
                ]
            },
            {
                id: "cause_s", label: "Prawdopodobna przyczyna?", options: [
                    { value: "recession", label: "Odsłonięte szyjki zębów", emoji: "🦷" },
                    { value: "post_scaling", label: "Po skalingu / wybielaniu", emoji: "🪥" },
                    { value: "unknown", label: "Nie wiem", emoji: "❓" },
                ]
            },
            {
                id: "tried_paste", label: "Próbowałeś pasty na nadwrażliwość?", options: [
                    { value: "no", label: "Nie", emoji: "❌" },
                    { value: "yes_helped", label: "Tak, pomogła", emoji: "✅" },
                    { value: "yes_not", label: "Tak, nie pomogła", emoji: "😕" },
                ]
            },
        ],
    },

    // ═══ CHIRURGIA ═══
    {
        id: "extraction_type", categoryId: "chirurgia",
        title: "Ekstrakcja: prosta vs chirurgiczna", subtitle: "Czas gojenia, ryzyko, przygotowanie",
        icon: "🦷", color: "#ef4444", methodIds: ["extract_simple", "extract_surgical"],
        questions: [
            {
                id: "tooth_visible", label: "Czy ząb jest widoczny?", options: [
                    { value: "yes", label: "Tak, wyrżnięty", emoji: "✅" },
                    { value: "partial", label: "Częściowo wyrżnięty", emoji: "🟡" },
                    { value: "no", label: "Nie — zatrzymany w kości", emoji: "🔴" },
                ]
            },
            {
                id: "roots_ex", label: "Stan korzeni?", options: [
                    { value: "normal", label: "Proste, jeden korzeń", emoji: "📏" },
                    { value: "complex", label: "Zagięte, kruche, wiele korzeni", emoji: "🔀" },
                ]
            },
            {
                id: "inflammation", label: "Stan zapalny?", options: [
                    { value: "no", label: "Brak", emoji: "✅" },
                    { value: "yes", label: "Tak — obrzęk / ropień", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "wisdom_teeth", categoryId: "chirurgia",
        title: "Ósemki: zostawić vs usunąć", subtitle: "Checklist wskazań i przeciwwskazań",
        icon: "🦷", color: "#ef4444", methodIds: ["wisdom_keep", "wisdom_remove"],
        questions: [
            {
                id: "symptoms_w", label: "Czy ósemka daje objawy?", options: [
                    { value: "none", label: "Nie — spokojnie siedzi", emoji: "✅" },
                    { value: "occasional", label: "Czasem boli / puchnie", emoji: "🟡" },
                    { value: "frequent", label: "Częste problemy", emoji: "🔴" },
                ]
            },
            {
                id: "position_w", label: "Pozycja ósemki na RTG?", options: [
                    { value: "erupted", label: "Wyrżnięta, w zwarciu", emoji: "✅" },
                    { value: "tilted", label: "Ukośna, napiera na sąsiada", emoji: "↗️" },
                    { value: "impacted", label: "Zatrzymana w kości", emoji: "🔒" },
                ]
            },
            {
                id: "caries_w", label: "Próchnica ósemki lub sąsiada?", options: [
                    { value: "no", label: "Brak", emoji: "✅" },
                    { value: "yes", label: "Tak", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "sinus_lift", categoryId: "chirurgia",
        title: "Sinus lift: zamknięty vs otwarty", subtitle: "Podniesienie dna zatoki przed implantem",
        icon: "🔼", color: "#38bdf8", methodIds: ["sinus_closed", "sinus_open"],
        questions: [
            {
                id: "bone_height", label: "Ile kości resztkowej?", options: [
                    { value: "enough", label: "5–7 mm (brak 1–3 mm)", emoji: "🟡" },
                    { value: "little", label: "<5 mm (duży brak)", emoji: "🔴" },
                ]
            },
            {
                id: "implant_plan", label: "Czy implant jednocześnie?", options: [
                    { value: "with", label: "Tak — implant + sinus w jednej sesji", emoji: "⚡" },
                    { value: "staged", label: "Nie — najpierw kość, potem implant", emoji: "📅" },
                ]
            },
            {
                id: "sinus_health", label: "Stan zatoki?", options: [
                    { value: "healthy", label: "Zdrowa", emoji: "✅" },
                    { value: "issues", label: "Polip / przewlekłe zapalenie", emoji: "⚠️" },
                ]
            },
        ],
    },

    // ═══ PROFILAKTYKA ═══
    {
        id: "toothbrush", categoryId: "profilaktyka",
        title: "Szczoteczka: manualna vs elektryczna vs soniczna", subtitle: "Co najlepiej czyści?",
        icon: "🪥", color: "#06b6d4", methodIds: ["brush_manual", "brush_electric", "brush_sonic"],
        questions: [
            {
                id: "gums", label: "Stan dziąseł?", options: [
                    { value: "healthy", label: "Zdrowe", emoji: "✅" },
                    { value: "sensitive", label: "Wrażliwe / krwawią", emoji: "🩸" },
                    { value: "receding", label: "Recesje", emoji: "📉" },
                ]
            },
            {
                id: "prosthetics", label: "Masz implanty/mosty/licówki?", options: [
                    { value: "no", label: "Nie", emoji: "❌" },
                    { value: "yes", label: "Tak", emoji: "✅" },
                ]
            },
            {
                id: "technique", label: "Technika szczotkowania?", options: [
                    { value: "good", label: "Opanowana (metoda Bassa)", emoji: "⭐" },
                    { value: "average", label: "Średnia / nie wiem", emoji: "🤷" },
                ]
            },
        ],
    },
    {
        id: "interdental", categoryId: "profilaktyka",
        title: "Nić vs szczoteczki vs irygator", subtitle: "Czyszczenie międzyzębowe — co wybrać?",
        icon: "🧵", color: "#06b6d4", methodIds: ["floss", "interdental_brush", "irrigator"],
        questions: [
            {
                id: "spaces", label: "Przestrzenie między zębami?", options: [
                    { value: "tight", label: "Ciasne", emoji: "📏" },
                    { value: "normal", label: "Normalne", emoji: "👍" },
                    { value: "wide", label: "Szerokie (po perio, mosty)", emoji: "↔️" },
                ]
            },
            {
                id: "prosthetics_i", label: "Mosty, implanty, aparat?", options: [
                    { value: "no", label: "Nie", emoji: "❌" },
                    { value: "yes", label: "Tak", emoji: "✅" },
                ]
            },
            {
                id: "dexterity", label: "Zręczność manualna?", options: [
                    { value: "good", label: "Dobra — potrafię nitkować", emoji: "👍" },
                    { value: "limited", label: "Ograniczona — nić jest trudna", emoji: "😅" },
                ]
            },
        ],
    },
    {
        id: "bruxism_guard", categoryId: "profilaktyka",
        title: "Bruksizm: szyna vs nic", subtitle: "Ryzyko starć i pęknięć zębów",
        icon: "🛡️", color: "#ef4444", methodIds: ["splint_guard", "no_guard"],
        questions: [
            {
                id: "symptoms_br", label: "Objawy bruksizmu?", options: [
                    { value: "mild", label: "Lekkie napięcie szczęki rano", emoji: "🟡" },
                    { value: "moderate", label: "Starcia widoczne, bóle głowy", emoji: "🟠" },
                    { value: "severe", label: "Pęknięcia, silne starcia, ból TMJ", emoji: "🔴" },
                ]
            },
            {
                id: "wear_visible", label: "Starcia na zębach?", options: [
                    { value: "no", label: "Brak widocznych", emoji: "✅" },
                    { value: "yes", label: "Tak", emoji: "⚠️" },
                ]
            },
            {
                id: "willing_br", label: "Czy będziesz nosić szynę na noc?", options: [
                    { value: "yes", label: "Tak, bez problemu", emoji: "✅" },
                    { value: "maybe", label: "Spróbuję", emoji: "🤔" },
                ]
            },
        ],
    },

    // ═══ DZIECI ═══
    {
        id: "sealant_vs_fluoride", categoryId: "dzieci",
        title: "Lakowanie vs fluoryzacja vs infiltracja", subtitle: "Profilaktyka próchnicy u dzieci",
        icon: "🛡️", color: "#ec4899", methodIds: ["sealant", "fluoride_varnish", "icon_infiltration"],
        questions: [
            {
                id: "tooth_status", label: "Stan zęba?", options: [
                    { value: "healthy", label: "Zdrowy, głębokie bruzdy", emoji: "✅" },
                    { value: "white_spot", label: "White spot — początek demineralizacji", emoji: "⚪" },
                    { value: "general", label: "Ogólna profilaktyka", emoji: "🛡️" },
                ]
            },
            {
                id: "age_child", label: "Wiek dziecka?", options: [
                    { value: "under_6", label: "Poniżej 6 lat", emoji: "👶" },
                    { value: "6_12", label: "6–12 lat", emoji: "🧒" },
                    { value: "teen", label: "Nastolatek", emoji: "🧑" },
                ]
            },
            {
                id: "risk_caries", label: "Ryzyko próchnicy?", options: [
                    { value: "low", label: "Niskie", emoji: "🟢" },
                    { value: "high", label: "Wysokie", emoji: "🔴" },
                ]
            },
        ],
    },
    {
        id: "fluoride_method", categoryId: "dzieci",
        title: "Fluoryzacja: gabinetowa vs domowa", subtitle: "Utrzymanie, częstotliwość, skuteczność",
        icon: "💧", color: "#ec4899", methodIds: ["fluoride_office", "fluoride_home"],
        questions: [
            {
                id: "caries_risk_f", label: "Ryzyko próchnicy?", options: [
                    { value: "low", label: "Niskie", emoji: "🟢" },
                    { value: "high", label: "Wysokie (próchnica w rodzinie, słodycze)", emoji: "🔴" },
                ]
            },
            {
                id: "age_f", label: "Wiek dziecka?", options: [
                    { value: "under_3", label: "Poniżej 3 lat", emoji: "👶" },
                    { value: "over_3", label: "3+ lat", emoji: "🧒" },
                ]
            },
            {
                id: "visits_freq", label: "Jak często możecie przychodzić?", options: [
                    { value: "regular", label: "Co 3–6 mies.", emoji: "📅" },
                    { value: "rare", label: "Rzadko", emoji: "⏳" },
                ]
            },
        ],
    },
    {
        id: "baby_tooth_caries", categoryId: "dzieci",
        title: "Próchnica mleczaka", subtitle: "Wypełnienie vs leczenie miazgi vs ekstrakcja",
        icon: "🧒", color: "#ec4899", methodIds: ["baby_filling", "baby_pulpotomy", "baby_extraction"],
        questions: [
            {
                id: "depth", label: "Głębokość próchnicy?", options: [
                    { value: "shallow", label: "Płytka/średnia — bez miazgi", emoji: "🟡" },
                    { value: "deep", label: "Głęboka — blisko lub w miazdze", emoji: "🟠" },
                    { value: "abscess", label: "Ropień / przetoka", emoji: "🔴" },
                ]
            },
            {
                id: "exchange", label: "Kiedy wymiana na stały?", options: [
                    { value: "far", label: ">2 lata", emoji: "⏳" },
                    { value: "soon", label: "<1 rok", emoji: "⚡" },
                ]
            },
            {
                id: "cooperation", label: "Współpraca dziecka?", options: [
                    { value: "good", label: "Dobra — siedzi spokojnie", emoji: "😊" },
                    { value: "difficult", label: "Trudna — płacze, nie otwiera", emoji: "😢" },
                ]
            },
        ],
    },
];
