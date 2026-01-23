
export interface SymptomInfo {
    title: string;
    description: string;
    symptoms: string[];
    advice: string;
    urgency: 'low' | 'medium' | 'high';
}

export const SYMPTOM_DATA: Record<string, SymptomInfo> = {
    "upper-front": {
        title: "Siekacze i Kły (Góra)",
        description: "Ból w przednim odcinku górnego łuku zębowego.",
        symptoms: [
            "Nadwrażliwość na zimne powietrze/napoje",
            "Ból pulsujący (nasilający się w nocy)",
            "Ukruszenie lub pęknięcie szkliwa",
            "Ból przy nagryzaniu",
            "Zaczerwienienie dziąsła nad zębem"
        ],
        advice: "Jeśli ból jest ostry i pulsujący, może to sugerować zapalenie miazgi. Jeśli reaguje na zimno – nadwrażliwość lub ubytek. Unikaj skrajnych temperatur.",
        urgency: 'medium'
    },
    "upper-posterior-left": {
        title: "Trzonowce Lewe (Góra)",
        description: "Ból tylnych zębów po lewej stronie u góry.",
        symptoms: [
            "Tępy ból promieniujący do ucha/skroni",
            "Ból przy jedzeniu słodyczy",
            "Uczucie 'wysadzania' zęba z zębodołu",
            "Reakcja na gorące posiłki"
        ],
        advice: "Ból promieniujący może pochodzić od zatok lub być związany z głęboką próchnicą. Sprawdź, czy nie masz kataru (zatoki). Jeśli ból wybudza w nocy – konieczna pilna wizyta.",
        urgency: 'medium'
    },
    "upper-posterior-right": {
        title: "Trzonowce Prawe (Góra)",
        description: "Ból tylnych zębów po prawej stronie u góry.",
        symptoms: [
            "Tępy ból promieniujący do skroni",
            "Ostry ból przy nagryzaniu",
            "Utrata wypełnienia (plomby)",
            "Zatrzymywanie się jedzenia między zębami"
        ],
        advice: "Zalegające jedzenie może powodować stan zapalny dziąsła i ból. Użyj nici dentystycznej. Jeśli ból jest silny - umów wizytę.",
        urgency: 'medium'
    },
    "lower-front": {
        title: "Siekacze i Kły (Dół)",
        description: "Ból w przednim odcinku dolnego łuku.",
        symptoms: [
            "Odsłonięte szyjki zębowe (ból przy dotyku)",
            "Kamień nazębny powodujący krwawienie",
            "Rozchwianie zęba (ruchomość)",
            "Ból po urazie"
        ],
        advice: "Dolne jedynki są podatne na kamień nazębny. Jeśli ząb się rusza – to pilne. Przy nadwrażliwości stosuj pasty typu 'Sensitive'.",
        urgency: 'low'
    },
    "lower-posterior-left": {
        title: "Trzonowce Lewe (Dół)",
        description: "Ból tylnych zębów po lewej stronie na dole.",
        symptoms: [
            "Trudności z otwieraniem ust (trzonowce pękają)",
            "Ból promieniujący do ucha/szyi",
            "Opuchlizna na policzku"
        ],
        advice: "Opuchlizna sugeruje ropień – to stan WYMAGAJĄCY pilnej interwencji. Jeśli to ósemka – płucz szałwią, ale umów się na konsultację.",
        urgency: 'high'
    },
    "lower-posterior-right": {
        title: "Trzonowce Prawe (Dół)",
        description: "Ból tylnych zębów po prawej stronie na dole.",
        symptoms: [
            "Ból przy szerokim otwieraniu ust",
            "Trzaski w stawie skroniowo-żuchwowym",
            "Ostry ból przy nagryzaniu twardych pokarmów"
        ],
        advice: "Może to być problem ze stawem lub pęknięcie zęba. Unikaj twardych pokarmów. Jeśli pojawił się obrzęk – pilnie do lekarza.",
        urgency: 'high'
    },
    "palate": {
        title: "Podniebienie",
        description: "Ból lub zmiany na podniebieniu.",
        symptoms: [
            "Pieczenie (jak po oparzeniu)",
            "Owrzodzenie lub afta",
            "Guzek wyczuwalny językiem"
        ],
        advice: "Często to oparzenie gorącym napojem lub afta. Stosuj żele na afty. Jeśli zmiana nie znika przez 2 tygodnie – konieczna diagnostyka.",
        urgency: 'low'
    },
    "tongue": {
        title: "Język i Dno Jamy Ustnej",
        description: "Dolegliwości języka.",
        symptoms: [
            "Pieczenie języka",
            "Biały nalot",
            "Bolesne pęknięcia po bokach",
            "Zmiana koloru"
        ],
        advice: "Może to być infekcja grzybicza, niedobór witamin lub uraz od ostrego zęba. Sprawdź, czy nie masz ostrej krawędzi zęba obok.",
        urgency: 'low'
    },
    "gum-cheeks": {
        title: "Dziąsła i Policzki",
        description: "Tkanki miękkie otaczające zęby.",
        symptoms: [
            "Krwawienie przy szczotkowaniu",
            "Obrzęk i zaczerwienienie",
            "Krwawiąca zmiana na policzku (przygryzanie)",
            "Afta (biała plamka z czerwoną obwódką)"
        ],
        advice: "Krwawienie to zwykle zapalenie dziąseł – popraw higienę, nitkuj! Afty są bolesne, ale znikają same. Przygryzanie policzka wymaga korekty zgryzu.",
        urgency: 'low'
    }
};
