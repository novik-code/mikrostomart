// ═══════════════════════════════════════════════════════════════════════════
// Comparator Data — Ukrainian translations
// ═══════════════════════════════════════════════════════════════════════════

import type { Category, PriorityOption } from "./comparatorTypes";

export const CATEGORIES_UA: Category[] = [
    { id: "estetyka", title: "Естетика", subtitle: "Посмішка, колір, форма, вініри", icon: "✨", color: "#a855f7" },
    { id: "braki", title: "Відсутні зуби", subtitle: "Імплант, міст, протез, онлей", icon: "🦷", color: "#38bdf8" },
    { id: "kanalowe", title: "Лікування каналів", subtitle: "Ендо, ре-ендо, відбудова після ендо", icon: "🔬", color: "#f59e0b" },
    { id: "periodontologia", title: "Ясна та гігієна", subtitle: "Скейлінг, AIRFLOW, кюретаж, чутливість", icon: "🩺", color: "#10b981" },
    { id: "chirurgia", title: "Хірургія", subtitle: "Екстракції, зуби мудрості, синус-ліфт", icon: "⚕️", color: "#ef4444" },
    { id: "profilaktyka", title: "Профілактика", subtitle: "Щітки, нитки, шини, бруксизм", icon: "🛡️", color: "#06b6d4" },
    { id: "dzieci", title: "Діти", subtitle: "Герметизація, фтор, молочні зуби", icon: "👶", color: "#ec4899" },
];

export const PRIORITIES_UA: PriorityOption[] = [
    { id: "balanced", label: "Збалансований", sublabel: "Баланс між усіма факторами", emoji: "⚖️", color: "#a855f7" },
    { id: "durable", label: "Найтриваліше", sublabel: "Пріоритет на роки", emoji: "🏰", color: "#38bdf8" },
    { id: "min_invasive", label: "Найменш інвазивне", sublabel: "Збереження тканин", emoji: "🌿", color: "#10b981" },
    { id: "fast", label: "Найшвидше", sublabel: "Ефект якнайшвидше", emoji: "⚡", color: "#f59e0b" },
    { id: "easy_maintenance", label: "Легка гігієна", sublabel: "Мінімум обслуговування", emoji: "🧼", color: "#06b6d4" },
];

export const TABLE_ROW_LABELS_UA: { key: string; label: string; tooltip: string }[] = [
    { key: "time", label: "Час лікування", tooltip: "Орієнтовний час від першого до останнього візиту." },
    { key: "visits", label: "Кількість візитів", tooltip: "Приблизна кількість візитів до завершення." },
    { key: "durability", label: "Тривалість", tooltip: "Як довго можна очікувати, що рішення протримається." },
    { key: "invasiveness", label: "Інвазивність", tooltip: "Ступінь втручання в тканини зуба." },
    { key: "risk", label: "Ризик / ускладнення", tooltip: "Наскільки високий ризик невдачі або ускладнень." },
    { key: "hygiene", label: "Гігієна", tooltip: "Наскільки легко підтримувати чистоту." },
    { key: "maintenance", label: "Сервіс / контролі", tooltip: "Частота та обсяг необхідного обслуговування." },
];

export function getRecommendationText_UA(priorityId: string, priorityLabel: string, methodLabel: string, methodShort: string, hasBadges: boolean): string {
    return `При пріоритеті «${priorityLabel}» найкраще підходить **${methodLabel}**: ${methodShort} ${hasBadges ? "Зверніть увагу на застереження нижче." : ""}`;
}
