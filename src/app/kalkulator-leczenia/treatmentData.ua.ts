// ───────────────────────────────────────────────────────────────────────────
// Treatment Time Calculator — Ukrainian Data
// ───────────────────────────────────────────────────────────────────────────

import type { Question, Variant, TreatmentPath } from "./treatmentData";

// ═══════════════════════════════════════════════════════════════════════════
// A) ЕНДОДОНТІЯ
// ═══════════════════════════════════════════════════════════════════════════

const endoQuestions_UA: Question[] = [
    {
        id: "history",
        text: "Чи лікувався зуб раніше ендодонтично?",
        options: [
            { value: "first", label: "Вперше", emoji: "🆕" },
            { value: "retreatment", label: "Повторне лікування", emoji: "🔄" },
        ],
    },
    {
        id: "tooth",
        text: "Який зуб потребує лікування?",
        options: [
            { value: "front", label: "Передній (різець / ікло)", emoji: "🦷" },
            { value: "premolar", label: "Премоляр", emoji: "🦷" },
            { value: "molar", label: "Моляр (жувальний)", emoji: "🦷" },
            { value: "unknown", label: "Не знаю", emoji: "❓" },
        ],
    },
    {
        id: "symptoms",
        text: "Чи маєте Ви гострі симптоми?",
        options: [
            { value: "none", label: "Без симптомів", emoji: "✅" },
            { value: "pain", label: "Сильний біль", emoji: "😣" },
            { value: "swelling", label: "Набряк / нориця", emoji: "🔴" },
        ],
    },
    {
        id: "xray",
        text: "Чи маєте рентген або CBCT за останні 12 місяців?",
        options: [
            { value: "yes", label: "Так", emoji: "✅" },
            { value: "no", label: "Ні", emoji: "❌" },
        ],
    },
];

function getEndoVariant_UA(answers: Record<string, string>): Variant {
    const isRetreament = answers.history === "retreatment";
    const isMolar = answers.tooth === "molar" || answers.tooth === "unknown";
    const hasAcute = answers.symptoms === "pain" || answers.symptoms === "swelling";
    const noXray = answers.xray === "no";

    if (isRetreament) {
        return {
            id: "endo-3",
            label: "Повторне ендодонтичне лікування",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 42,
            durationLabel: "1–6 тижнів",
            recommendedSpecialist: "marcin",
            stages: [
                {
                    name: "Розширена діагностика",
                    description: "CBCT 3D, тести вітальності, оцінка попереднього лікування та план ревізії.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 днів",
                },
                {
                    name: "Ревізія під мікроскопом",
                    description: "Видалення старого пломбування каналів, очищення та повторна обробка під операційним мікроскопом.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 21, gapLabel: "7–21 днів",
                },
                {
                    name: "Проміжний візит",
                    description: "Контроль загоєння, зміна пов'язки, оцінка відповіді на лікування.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів",
                    conditional: "endo-3",
                },
                {
                    name: "Контроль та план відновлення",
                    description: "Оцінка результату лікування, план відновлення зуба (пломба або коронка).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "за планом",
                },
            ],
            extendingFactors: [
                "Нетипова анатомія каналів (додаткові канали, викривлення)",
                "Зламаний інструмент у каналі, що потребує видалення",
                "Великі періапікальні зміни, що потребують тривалого загоєння",
                "Необхідність проміжного етапу з лікувальною пов'язкою",
                "Додаткова діагностика CBCT",
            ],
        };
    }

    if (isMolar) {
        return {
            id: "endo-2",
            label: "Ендодонтичне лікування моляра",
            visitsMin: 1 + (hasAcute ? 1 : 0),
            visitsMax: 3,
            durationMinDays: 1,
            durationMaxDays: 21,
            durationLabel: "1–21 днів",
            recommendedSpecialist: "ilona",
            stages: [
                {
                    name: "Кваліфікація та діагностика",
                    description: "Рентген/CBCT, тести вітальності пульпи, оцінка стану зуба та план лікування.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 днів",
                },
                {
                    name: "Ендодонтичне лікування під мікроскопом",
                    description: "Обробка 3–4 каналів моляра під операційним мікроскопом. Точне очищення та пломбування.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "за потребою",
                },
                {
                    name: "Проміжний візит",
                    description: "Контроль пов'язки, оцінка загоєння — необхідний при гострих станах.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів",
                    conditional: "endo-2",
                },
                {
                    name: "Контроль та план відновлення",
                    description: "Оцінка лікування, план відновлення зуба (композитна пломба або протезна коронка).",
                    durationMin: 20, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 днів",
                },
            ],
            extendingFactors: [
                "Запалення, що потребує зняття перед лікуванням",
                "Нетипова анатомія каналів (додаткові канали)",
                "Необхідність CBCT для точної діагностики",
                "Проміжний етап з лікувальною пов'язкою",
            ],
        };
    }

    return {
        id: "endo-1",
        label: "Ендодонтичне лікування — простий випадок",
        visitsMin: 1,
        visitsMax: 2,
        durationMinDays: 1,
        durationMaxDays: 14,
        durationLabel: "1–14 днів",
        recommendedSpecialist: "ilona",
        stages: [
            {
                name: "Кваліфікація та діагностика",
                description: "Цифровий рентген, тести вітальності пульпи, обговорення плану лікування.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 днів",
            },
            {
                name: "Ендодонтичне лікування під мікроскопом",
                description: "Очищення та обробка каналів під операційним мікроскопом зі збільшенням до 25×.",
                durationMin: 60, durationMax: 120,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "за потребою",
            },
            {
                name: "Контроль та план відновлення",
                description: "Контрольний рентген, оцінка результату лікування, план відновлення (пломба або коронка).",
                durationMin: 20, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 днів",
            },
        ],
        extendingFactors: [
            "Додаткова діагностика (CBCT) при нетиповій анатомії",
            "Запалення, що потребує зняття",
            "Необхідність відновлення зуба коронкою замість пломби",
            noXray ? "Відсутність актуального рентгену — додатковий діагностичний візит" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// B) ІМПЛАНТ
// ═══════════════════════════════════════════════════════════════════════════

const implantQuestions_UA: Question[] = [
    {
        id: "status",
        text: "Зуб вже відсутній чи потребує видалення?",
        options: [
            { value: "missing", label: "Зуб відсутній", emoji: "⬜" },
            { value: "extraction", label: "Зуб для видалення", emoji: "🔧" },
            { value: "unknown", label: "Не знаю", emoji: "❓" },
        ],
    },
    {
        id: "location",
        text: "В якому місці?",
        options: [
            { value: "front", label: "Спереду (зона усмішки)", emoji: "😁" },
            { value: "side", label: "Збоку (моляри / премоляри)", emoji: "🦷" },
        ],
    },
    {
        id: "cbct",
        text: "Чи маєте актуальне CBCT?",
        options: [
            { value: "yes", label: "Так", emoji: "✅" },
            { value: "no", label: "Ні", emoji: "❌" },
        ],
    },
    {
        id: "augmentation",
        text: "Чи очікуєте необхідність відновлення кістки?",
        options: [
            { value: "no", label: "Ні / скоріше ні", emoji: "✅" },
            { value: "possible", label: "Можливо", emoji: "🤔" },
            { value: "unknown", label: "Не знаю", emoji: "❓" },
        ],
    },
    {
        id: "temporary",
        text: "Бажаєте тимчасовий зуб на час загоєння?",
        options: [
            { value: "yes", label: "Так", emoji: "✅" },
            { value: "no", label: "Ні", emoji: "❌" },
        ],
    },
];

function getImplantVariant_UA(answers: Record<string, string>): Variant {
    const needsAugmentation = answers.augmentation === "possible" || answers.augmentation === "unknown";
    const needsExtraction = answers.extraction === "extraction" || answers.status === "extraction";
    const isFront = answers.location === "front";

    if (needsAugmentation) {
        return {
            id: "impl-2",
            label: "Імплант з відновленням кістки / синус-ліфтом",
            visitsMin: 4,
            visitsMax: 7,
            durationMinDays: 150,
            durationMaxDays: 270,
            durationLabel: "5–9 місяців",
            recommendedSpecialist: "marcin",
            stages: [
                {
                    name: "Консультація та діагностика",
                    description: "Клінічний огляд, 3D CBCT, обговорення варіантів лікування та хірургічного плану.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 днів",
                },
                {
                    name: "Відновлення кістки / підняття дна пазухи",
                    description: "Аугментація — кістковий трансплантат або підняття дна верхньощелепної пазухи (синус-ліфт) для створення основи для імпланту.",
                    durationMin: 45, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 90, gapToNextMax: 180, gapLabel: "3–6 міс. загоєння",
                },
                {
                    name: "Імплантація",
                    description: "Точне встановлення титанового імпланту у відновлену кістку.",
                    durationMin: 45, durationMax: 90,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 тиж. остеоінтеграції",
                },
                {
                    name: "Контроль / зняття швів",
                    description: "Перевірка загоєння, зняття швів, контрольний рентген.",
                    durationMin: 15, durationMax: 30,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів",
                },
                {
                    name: "Цифрове сканування та відбитки",
                    description: "3D цифрове сканування для проектування протезної коронки на імпланті.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів (лабораторія)",
                },
                {
                    name: "Встановлення коронки на імплант",
                    description: "Остаточна протезна коронка — кінцевий результат: новий зуб.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
                },
            ],
            extendingFactors: [
                "Обсяг відновлення кістки (малий трансплантат vs повна аугментація)",
                "Естетика зони усмішки — додаткове моделювання м'яких тканин",
                "Лікування запалення перед імплантацією",
                "Час остеоінтеграції залежить від якості кістки",
                needsExtraction ? "Видалення зуба перед аугментацією — додатковий етап" : "",
            ].filter(Boolean),
        };
    }

    return {
        id: "impl-1",
        label: "Імплант — стандартний шлях",
        visitsMin: 3 + (needsExtraction ? 1 : 0),
        visitsMax: 5 + (needsExtraction ? 1 : 0),
        durationMinDays: 90,
        durationMaxDays: 180,
        durationLabel: "3–6 місяців",
        recommendedSpecialist: "marcin",
        stages: [
            {
                name: "Консультація та діагностика",
                description: "Клінічний огляд, 3D CBCT, план імплантації, обговорення варіантів.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 14, gapLabel: "0–14 днів",
            },
            ...(needsExtraction ? [{
                name: "Видалення зуба",
                description: "Видалення зуба зі збереженням лунки — підготовка до імплантації.",
                durationMin: 20, durationMax: 45,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 14, gapToNextMax: 60, gapLabel: "2–8 тиж. загоєння",
            }] : []),
            {
                name: "Імплантація",
                description: "Встановлення титанового імпланту. Процедура під місцевою анестезією, зазвичай безболісна.",
                durationMin: 45, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 56, gapToNextMax: 112, gapLabel: "8–16 тиж. остеоінтеграції",
            },
            {
                name: "Контроль / зняття швів",
                description: "Контроль загоєння через 7–14 днів, зняття швів, контрольний рентген.",
                durationMin: 15, durationMax: 30,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів",
            },
            {
                name: "Цифрове сканування та відбитки",
                description: "3D цифрове сканування для проектування протезної коронки на імпланті.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів (лабораторія)",
            },
            {
                name: "Встановлення коронки на імплант",
                description: "Остаточна коронка — природний вигляд і функція як власний зуб.",
                durationMin: 30, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
            },
        ],
        extendingFactors: [
            "Час остеоінтеграції залежить від якості кістки пацієнта",
            isFront ? "Естетична зона — може потребувати додаткового моделювання тканин" : "",
            "Можливе встановлення формувача ясен — додатковий візит",
            needsExtraction ? "Загоєння після видалення перед імплантацією" : "",
            "Необхідність CBCT (якщо відсутнє актуальне дослідження)",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// C) ПРОТЕЗУВАННЯ
// ═══════════════════════════════════════════════════════════════════════════

const protetykaQuestions_UA: Question[] = [
    {
        id: "type",
        text: "Який тип відновлення Вам потрібен?",
        options: [
            { value: "crown", label: "Коронка", emoji: "👑" },
            { value: "onlay", label: "Онлей / інлей", emoji: "🔲" },
            { value: "bridge", label: "Міст", emoji: "🌉" },
            { value: "unknown", label: "Не знаю", emoji: "❓" },
        ],
    },
    {
        id: "endo",
        text: "Чи лікувався зуб ендодонтично?",
        options: [
            { value: "no", label: "Ні, зуб живий", emoji: "💚" },
            { value: "yes", label: "Так, після ендо", emoji: "✅" },
            { value: "unknown", label: "Не знаю", emoji: "❓" },
        ],
    },
    {
        id: "xray",
        text: "Чи маєте актуальний рентген цього зуба?",
        options: [
            { value: "yes", label: "Так", emoji: "✅" },
            { value: "no", label: "Ні", emoji: "❌" },
        ],
    },
    {
        id: "priority",
        text: "Який Ваш пріоритет?",
        options: [
            { value: "fast", label: "Якнайшвидше", emoji: "⚡" },
            { value: "standard", label: "Стандартно", emoji: "📅" },
            { value: "comfort", label: "Комфортно, без поспіху", emoji: "🧘" },
        ],
    },
];

function getProtetykaVariant_UA(answers: Record<string, string>): Variant {
    const isBridge = answers.type === "bridge";
    const needsEndoCheck = answers.endo === "unknown";

    if (isBridge) {
        return {
            id: "prot-2",
            label: "Зубний міст",
            visitsMin: 2,
            visitsMax: 4,
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 тижні",
            recommendedSpecialist: "ilona",
            stages: [
                {
                    name: "Кваліфікація та планування",
                    description: "Клінічний огляд, рентген, оцінка опорних зубів, протезний план, підбір кольору.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 днів",
                },
                {
                    name: "Препарація опор + скан/відбиток",
                    description: "Обробка опорних зубів, 3D цифрове сканування або традиційний відбиток, тимчасовий міст.",
                    durationMin: 60, durationMax: 120,
                    anesthesia: true, discomfortAfter: true,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів (лабораторія)",
                },
                {
                    name: "Примірка (за потреби)",
                    description: "Перевірка посадки каркаса мосту, корекції перед остаточним завершенням.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 днів",
                    conditional: "prot-2",
                },
                {
                    name: "Цементування мосту",
                    description: "Встановлення остаточного мосту, контроль оклюзії та контактних точок.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
                },
            ],
            extendingFactors: [
                "Необхідність ендодонтичного лікування опори перед мостом",
                "Відновлення кукси опорного зуба",
                "Корекції оклюзії після цементування",
                "Триваліший лабораторний етап при більших роботах",
                needsEndoCheck ? "Необхідність перевірки вітальності опорних зубів" : "",
            ].filter(Boolean),
        };
    }

    return {
        id: "prot-1",
        label: answers.type === "onlay" ? "Онлей / інлей" : "Протезна коронка",
        visitsMin: 2,
        visitsMax: 3,
        durationMinDays: 5,
        durationMaxDays: 14,
        durationLabel: "5–14 днів",
        recommendedSpecialist: "ilona",
        stages: [
            {
                name: "Кваліфікація та знімки",
                description: "Клінічний огляд, рентген, оцінка зуба, протезний план, підбір кольору.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 днів",
            },
            {
                name: "Препарація + скан + тимчасівка",
                description: "Обробка зуба, 3D цифрове сканування, встановлення тимчасової коронки/онлею.",
                durationMin: 60, durationMax: 90,
                anesthesia: true, discomfortAfter: true,
                gapToNextMin: 5, gapToNextMax: 14, gapLabel: "5–14 днів (лабораторія)",
            },
            {
                name: "Цементування + контроль",
                description: "Встановлення остаточної коронки/онлею, контроль оклюзії та контактних точок.",
                durationMin: 30, durationMax: 45,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
            },
        ],
        extendingFactors: [
            "Необхідність відновлення кукси зуба перед коронкою",
            "Ендодонтичне лікування перед протезуванням",
            "Корекції контактів або посадки",
            "Терміни зуботехнічної лабораторії",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// D) БОНДИНГ / ЕСТЕТИЧНА РЕСТАВРАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

const bondingQuestions_UA: Question[] = [
    {
        id: "count",
        text: "Скільки зубів потребують відновлення?",
        options: [
            { value: "1-2", label: "1–2 зуби", emoji: "1️⃣" },
            { value: "3-4", label: "2–4 зуби", emoji: "🔢" },
            { value: "6-10", label: "6–10 зубів (повна усмішка)", emoji: "😁" },
        ],
    },
    {
        id: "goal",
        text: "Яка мета відновлення?",
        options: [
            { value: "chip", label: "Скол / відлом", emoji: "💥" },
            { value: "gap", label: "Щілина між зубами (діастема)", emoji: "↔️" },
            { value: "wear", label: "Стертість / абразія", emoji: "📐" },
            { value: "shape", label: "Корекція форми / пропорцій", emoji: "✨" },
        ],
    },
    {
        id: "hygiene",
        text: "Гігієнізація за останні 6 місяців?",
        options: [
            { value: "yes", label: "Так", emoji: "✅" },
            { value: "no", label: "Ні", emoji: "❌" },
            { value: "unknown", label: "Не пам'ятаю", emoji: "❓" },
        ],
    },
    {
        id: "mockup",
        text: "Бажаєте попередньо побачити примірку (мок-ап)?",
        options: [
            { value: "yes", label: "Так, хочу візуалізацію", emoji: "👀" },
            { value: "no", label: "Ні, довіряю лікарю", emoji: "👍" },
        ],
    },
];

function getBondingVariant_UA(answers: Record<string, string>): Variant {
    const count = answers.count;
    const wantsMockup = answers.mockup === "yes";
    const needsHygiene = answers.hygiene === "no" || answers.hygiene === "unknown";

    if (count === "6-10") {
        return {
            id: "bond-3",
            label: "Повна естетична реставрація усмішки",
            visitsMin: 2 + (wantsMockup ? 1 : 0),
            visitsMax: 3 + (wantsMockup ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 21,
            durationLabel: "1–3 тижні",
            recommendedSpecialist: "marcin",
            stages: [
                ...(needsHygiene ? [{
                    name: "Гігієнізація",
                    description: "Професійне чищення зубів — необхідне перед бондингом для оптимального з'єднання.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 днів",
                }] : []),
                {
                    name: "Планування та фотодокументація",
                    description: "Детальні фото, аналіз усмішки, естетичний план у погодженні з пацієнтом.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: wantsMockup ? 3 : 0, gapToNextMax: wantsMockup ? 7 : 7, gapLabel: wantsMockup ? "3–7 днів" : "0–7 днів",
                },
                ...(wantsMockup ? [{
                    name: "Мок-ап / примірка",
                    description: "\"Тест-драйв\" нової усмішки — тимчасова візуалізація на зубах, з можливістю корекції.",
                    durationMin: 30, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 днів",
                }] : []),
                {
                    name: "Композитний бондинг",
                    description: "Відновлення 6–10 зубів наногібридним композитом, шар за шаром, з підбором кольору та форми.",
                    durationMin: 120, durationMax: 240,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
                },
            ],
            extendingFactors: [
                "Необхідність гігієнізації перед бондингом",
                "Ітерації мок-апу (корекції перед остаточним бондингом)",
                "Розлогий бондинг може потребувати 2 лікувальних сеансів",
                "Відбілювання перед бондингом (для оптимального кольору)",
            ],
        };
    }

    if (count === "3-4") {
        return {
            id: "bond-2",
            label: "Естетична реставрація 2–4 зубів",
            visitsMin: 1,
            visitsMax: 2,
            durationMinDays: 1,
            durationMaxDays: 14,
            durationLabel: "1–14 днів",
            recommendedSpecialist: "katarzyna",
            stages: [
                {
                    name: "Планування та фото",
                    description: "Фотодокументація, естетичний план, підбір кольору композиту.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 7, gapLabel: "0–7 днів",
                },
                {
                    name: "Композитний бондинг",
                    description: "Точна реставрація 2–4 зубів композитом — форма, колір, текстура поверхні.",
                    durationMin: 90, durationMax: 150,
                    anesthesia: true, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
                },
            ],
            extendingFactors: [
                "Необхідність гігієнізації перед процедурою",
                "Необхідність підбору кольору до відбілених зубів",
                "Розлогий бондинг може потребувати тривалішого сеансу",
            ],
        };
    }

    return {
        id: "bond-1",
        label: "Ремонт 1–2 зубів (бондинг)",
        visitsMin: 1,
        visitsMax: 1,
        durationMinDays: 1,
        durationMaxDays: 1,
        durationLabel: "1 день",
        recommendedSpecialist: "katarzyna",
        stages: [
            {
                name: "Реставрація бондинг",
                description: "Відновлення пошкодженого зуба композитом — ремонт сколу, закриття щілини або корекція форми.",
                durationMin: 45, durationMax: 90,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
            },
        ],
        extendingFactors: [
            "Необхідність гігієнізації перед процедурою",
            "Розлогий ремонт може потребувати анестезії",
        ],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// E) ВІДБІЛЮВАННЯ
// ═══════════════════════════════════════════════════════════════════════════

const wybielanieQuestions_UA: Question[] = [
    {
        id: "method",
        text: "Який метод відбілювання Вас цікавить?",
        options: [
            { value: "office", label: "Кабінетне (швидке)", emoji: "⚡" },
            { value: "home", label: "Капами (домашнє)", emoji: "🏠" },
            { value: "combined", label: "Комбіноване (кабінет + дім)", emoji: "🔄" },
            { value: "unknown", label: "Не знаю, порадьте", emoji: "❓" },
        ],
    },
    {
        id: "hygiene",
        text: "Гігієнізація за останні 6 місяців?",
        options: [
            { value: "yes", label: "Так", emoji: "✅" },
            { value: "no", label: "Ні", emoji: "❌" },
        ],
    },
    {
        id: "sensitivity",
        text: "Чи маєте чутливі зуби?",
        options: [
            { value: "no", label: "Ні", emoji: "✅" },
            { value: "yes", label: "Так, чутливість", emoji: "😬" },
        ],
    },
];

function getWybielanieVariant_UA(answers: Record<string, string>): Variant {
    const method = answers.method;
    const needsHygiene = answers.hygiene === "no";

    if (method === "home") {
        return {
            id: "white-2",
            label: "Відбілювання капами (домашнє)",
            visitsMin: 1 + (needsHygiene ? 1 : 0),
            visitsMax: 2 + (needsHygiene ? 1 : 0),
            durationMinDays: 7,
            durationMaxDays: 14,
            durationLabel: "7–14 днів",
            recommendedSpecialist: "malgorzata",
            stages: [
                ...(needsHygiene ? [{
                    name: "Професійна гігієнізація",
                    description: "Обов'язкове чищення зубів перед відбілюванням — видалення зубного каменю та нальоту.",
                    durationMin: 40, durationMax: 60,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 днів",
                }] : []),
                {
                    name: "Скан / відбиток + інструкція",
                    description: "Цифрове сканування або відбиток для виготовлення індивідуальних кап. Інструкція з використання гелю.",
                    durationMin: 20, durationMax: 40,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 7, gapToNextMax: 14, gapLabel: "7–14 днів використання гелю",
                },
                {
                    name: "Контроль результату",
                    description: "Порівняння кольору, оцінка ефекту, поради щодо підтримки результату.",
                    durationMin: 15, durationMax: 20,
                    anesthesia: false, discomfortAfter: false,
                    gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
                },
            ],
            extendingFactors: [
                "Необхідність гігієнізації перед відбілюванням",
                "Чутливість — повільніша схема з перервами",
                "Інтенсивне забарвлення може потребувати тривалішого використання",
            ],
        };
    }

    return {
        id: "white-1",
        label: method === "combined" ? "Комбіноване відбілювання (кабінет + капи)" : "Кабінетне відбілювання",
        recommendedSpecialist: "malgorzata",
        visitsMin: 1 + (needsHygiene ? 1 : 0),
        visitsMax: 2 + (needsHygiene ? 1 : 0),
        durationMinDays: 1,
        durationMaxDays: method === "combined" ? 14 : 7,
        durationLabel: method === "combined" ? "1–14 днів" : "1–7 днів",
        stages: [
            ...(needsHygiene ? [{
                name: "Професійна гігієнізація",
                description: "Обов'язкове чищення зубів перед відбілюванням — кращий і рівномірніший ефект.",
                durationMin: 40, durationMax: 60,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 3, gapToNextMax: 7, gapLabel: "3–7 днів",
            }] : []),
            {
                name: "Кваліфікація та початковий колір",
                description: "Оцінка кольору зубів (шкала VITA), захист ясен, підготовка до процедури.",
                durationMin: 20, durationMax: 40,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "того ж дня",
            },
            {
                name: "Кабінетне відбілювання",
                description: "Аплікація професійного відбілюючого гелю з активацією LED-лампою. 2–3 цикли по 15 хв.",
                durationMin: 60, durationMax: 90,
                anesthesia: false, discomfortAfter: true,
                gapToNextMin: 0, gapToNextMax: 7, gapLabel: method === "combined" ? "домашні капи 7–14 днів" : "факультативний контроль",
            },
            {
                name: "Контроль результату",
                description: "Порівняння з початковим кольором, оцінка ефекту, рекомендації щодо дієти та догляду.",
                durationMin: 15, durationMax: 20,
                anesthesia: false, discomfortAfter: false,
                gapToNextMin: 0, gapToNextMax: 0, gapLabel: "готово ✓",
            },
        ],
        extendingFactors: [
            "Необхідність гігієнізації перед процедурою",
            "Чутливість — необхідна десенсибілізація до/після",
            "Інтенсивне забарвлення (тетрацикліни) — тривалішa програма",
            method === "combined" ? "Домашня фаза додає 7–14 днів" : "",
        ].filter(Boolean),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const TREATMENT_PATHS_UA: TreatmentPath[] = [
    {
        id: "endo",
        title: "Лікування каналів",
        subtitle: "Ендодонтія під мікроскопом",
        icon: "🔬",
        color: "#f59e0b",
        questions: endoQuestions_UA,
        getVariant: getEndoVariant_UA,
    },
    {
        id: "implant",
        title: "Імплант",
        subtitle: "Від консультації до коронки",
        icon: "🦷",
        color: "#3b82f6",
        questions: implantQuestions_UA,
        getVariant: getImplantVariant_UA,
    },
    {
        id: "protetyka",
        title: "Протезування",
        subtitle: "Коронка, онлей або міст",
        icon: "👑",
        color: "#8b5cf6",
        questions: protetykaQuestions_UA,
        getVariant: getProtetykaVariant_UA,
    },
    {
        id: "bonding",
        title: "Бондинг / естетика",
        subtitle: "Естетична реставрація композитом",
        icon: "✨",
        color: "#ec4899",
        questions: bondingQuestions_UA,
        getVariant: getBondingVariant_UA,
    },
    {
        id: "wybielanie",
        title: "Відбілювання",
        subtitle: "Кабінетне або домашнє",
        icon: "💎",
        color: "#06b6d4",
        questions: wybielanieQuestions_UA,
        getVariant: getWybielanieVariant_UA,
    },
];

export function formatDuration_UA(days: number): string {
    if (days <= 1) return "1 день";
    if (days < 7) return `${days} днів`;
    if (days === 7) return "1 тиждень";
    if (days < 30) {
        const weeks = Math.round(days / 7);
        return `${weeks} тиж.`;
    }
    const months = Math.round(days / 30);
    if (months === 1) return "1 місяць";
    if (months < 5) return `${months} місяці`;
    return `${months} місяців`;
}
