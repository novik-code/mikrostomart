// ═══════════════════════════════════════════════════════════════════════════
// Comparator Data — German translations
// ═══════════════════════════════════════════════════════════════════════════

import type { Category, PriorityOption } from "./comparatorTypes";

export const CATEGORIES_DE: Category[] = [
    { id: "estetyka", title: "Ästhetik", subtitle: "Lächeln, Farbe, Form, Veneers", icon: "✨", color: "#a855f7" },
    { id: "braki", title: "Fehlende Zähne", subtitle: "Implantat, Brücke, Prothese, Onlay", icon: "🦷", color: "#38bdf8" },
    { id: "kanalowe", title: "Wurzelkanalbehandlung", subtitle: "Endo, Re-Endo, Aufbau nach Endo", icon: "🔬", color: "#f59e0b" },
    { id: "periodontologia", title: "Zahnfleisch & Hygiene", subtitle: "Scaling, AIRFLOW, Kürettage, Empfindlichkeit", icon: "🩺", color: "#10b981" },
    { id: "chirurgia", title: "Chirurgie", subtitle: "Extraktionen, Weisheitszähne, Sinuslift", icon: "⚕️", color: "#ef4444" },
    { id: "profilaktyka", title: "Prophylaxe", subtitle: "Zahnbürsten, Zahnseide, Schienen, Bruxismus", icon: "🛡️", color: "#06b6d4" },
    { id: "dzieci", title: "Kinder", subtitle: "Versiegelung, Fluorid, Milchzähne", icon: "👶", color: "#ec4899" },
];

export const PRIORITIES_DE: PriorityOption[] = [
    { id: "balanced", label: "Ausgewogen", sublabel: "Balance zwischen allen Faktoren", emoji: "⚖️", color: "#a855f7" },
    { id: "durable", label: "Am haltbarsten", sublabel: "Priorität für Jahre", emoji: "🏰", color: "#38bdf8" },
    { id: "min_invasive", label: "Am wenigsten invasiv", sublabel: "Gewebe erhalten", emoji: "🌿", color: "#10b981" },
    { id: "fast", label: "Am schnellsten", sublabel: "Schnellstes Ergebnis", emoji: "⚡", color: "#f59e0b" },
    { id: "easy_maintenance", label: "Einfache Pflege", sublabel: "Minimaler Aufwand", emoji: "🧼", color: "#06b6d4" },
];

export const TABLE_ROW_LABELS_DE: { key: string; label: string; tooltip: string }[] = [
    { key: "time", label: "Behandlungsdauer", tooltip: "Ungefähre Zeit vom ersten bis zum letzten Termin." },
    { key: "visits", label: "Anzahl der Termine", tooltip: "Ungefähre Anzahl der benötigten Termine." },
    { key: "durability", label: "Haltbarkeit", tooltip: "Wie lange die Lösung voraussichtlich hält." },
    { key: "invasiveness", label: "Invasivität", tooltip: "Grad des Eingriffs in die Zahnsubstanz." },
    { key: "risk", label: "Risiko / Komplikationen", tooltip: "Wie hoch ist das Risiko eines Misserfolgs oder von Komplikationen." },
    { key: "hygiene", label: "Hygiene", tooltip: "Wie einfach die Reinigung ist." },
    { key: "maintenance", label: "Service / Kontrollen", tooltip: "Häufigkeit und Umfang der erforderlichen Wartung." },
];

export function getRecommendationText_DE(priorityId: string, priorityLabel: string, methodLabel: string, methodShort: string, hasBadges: boolean): string {
    return `Bei Priorität „${priorityLabel}" schneidet **${methodLabel}** am besten ab: ${methodShort} ${hasBadges ? "Beachten Sie die Hinweise unten." : ""}`;
}
