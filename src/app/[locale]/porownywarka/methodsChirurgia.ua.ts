import type { Method } from "./comparatorTypes";

export const METHODS_CHIRURGIA_UA: Record<string, Method> = {
    extraction_simple: {
        id: "extraction_simple", label: "Просте видалення", short: "Швидке видалення рухомого або зруйнованого зуба.",
        icon: "🦷", color: "#ef4444", recommendedSpecialist: "marcin",
        table: {
            time: { value: "15–30 хв", scale: 5, tooltip: "Один короткий візит." },
            visits: { value: "1–2", scale: 5, tooltip: "Видалення + контроль." },
            durability: { value: "Постійна", scale: 5, tooltip: "Зуб видалений. Потрібне відновлення проміжку." },
            invasiveness: { value: "Середня", scale: 3, tooltip: "Видалення під місцевою анестезією." },
            risk: { value: "Низький", scale: 4, tooltip: "Стандартні ризики: набряк, незначна кровотеча." },
            hygiene: { value: "Догляд за раною", scale: 3, tooltip: "Обережне полоскання, не сплювати, не палити." },
            worksWhen: ["Рухомий зуб", "Зуб не підлягає лікуванню", "Перед ортодонтичним або протезним лікуванням"],
            notIdealWhen: ["Зуб можна врятувати ендо + коронка", "Анатомічно складний корінь", "Системні захворювання, що обмежують хірургію"],
            maintenance: { value: "Контроль через 1 тиждень", tooltip: "Оцінка загоєння." },
        },
        metrics: { durabilityScore: 100, speedScore: 95, minInvasiveScore: 30, maintenanceScore: 95, riskScore: 72 },
    },
    extraction_surgical: {
        id: "extraction_surgical", label: "Хірургічне видалення", short: "Складне видалення — клапоть, остеотомія, розділення коренів.",
        icon: "🔪", color: "#dc2626", recommendedSpecialist: "marcin",
        table: {
            time: { value: "30–60 хв", scale: 4, tooltip: "Може потребувати видалення кістки та розділення коренів." },
            visits: { value: "2–3", scale: 4, tooltip: "Видалення + контроль + зняття швів." },
            durability: { value: "Постійна", scale: 5, tooltip: "Зуб видалений. Можлива аугментація." },
            invasiveness: { value: "Висока", scale: 2, tooltip: "Клапоть, остеотомія, іноді розділення коренів." },
            risk: { value: "Середній", scale: 3, tooltip: "Більший ризик набряку, болю, близькість нервів." },
            hygiene: { value: "Догляд за раною", scale: 3, tooltip: "Компреси з холодом, м'яка їжа, не палити." },
            worksWhen: ["Ретенований або зламаний зуб", "Видалення зубів мудрості", "Видалення перед плануванням імпланту"],
            notIdealWhen: ["Зуб рухомий — достатньо простого видалення", "Неконтрольований діабет", "Активна інфекція (можливо, спершу антибіотик)"],
            maintenance: { value: "Контроль + знімок", tooltip: "Контроль через 1 тиждень і 1 місяць." },
        },
        metrics: { durabilityScore: 100, speedScore: 82, minInvasiveScore: 15, maintenanceScore: 90, riskScore: 55 },
    },
    bone_augmentation: {
        id: "bone_augmentation", label: "Аугментація кістки", short: "Відбудова кістки перед імплантацією.",
        icon: "🧱", color: "#f59e0b", recommendedSpecialist: "marcin",
        table: {
            time: { value: "4–9 місяців", scale: 1, tooltip: "Аугментація + загоєння + імплант." },
            visits: { value: "3–5", scale: 3, tooltip: "Операція, контролі, імплантація." },
            durability: { value: "Постійна", scale: 4, tooltip: "Відбудована кістка інтегрується в організм." },
            invasiveness: { value: "Висока", scale: 2, tooltip: "Хірургічна процедура з кістковим матеріалом/мембраною." },
            risk: { value: "Середній", scale: 3, tooltip: "Інфекція, невдача трансплантату, набряк." },
            hygiene: { value: "Догляд за раною", scale: 2, tooltip: "Суворий постопераційний догляд." },
            worksWhen: ["Недостатня кістка для імпланту", "Резорбція кістки після видалення", "Занадто низький дно пазухи (синус-ліфт)"],
            notIdealWhen: ["Імплантація не планується", "Системні захворювання, що обмежують загоєння", "Пацієнт не приймає період очікування"],
            maintenance: { value: "Рентген-моніторинг", tooltip: "Перевірка об'єму кістки перед імплантацією." },
        },
        metrics: { durabilityScore: 85, speedScore: 15, minInvasiveScore: 15, maintenanceScore: 85, riskScore: 52 },
    },
};
