// ═══════════════════════════════════════════════════════════════════════════
// Comparator Data — English translations
// ═══════════════════════════════════════════════════════════════════════════

import type { Category, PriorityOption } from "./comparatorTypes";

export const CATEGORIES_EN: Category[] = [
    { id: "estetyka", title: "Aesthetics", subtitle: "Smile, colour, shape, veneers", icon: "✨", color: "#a855f7" },
    { id: "braki", title: "Missing teeth", subtitle: "Implant, bridge, denture, onlay", icon: "🦷", color: "#38bdf8" },
    { id: "kanalowe", title: "Root canal treatment", subtitle: "Endo, re-endo, post-endo restoration", icon: "🔬", color: "#f59e0b" },
    { id: "periodontologia", title: "Gums & hygiene", subtitle: "Scaling, AIRFLOW, curettage, sensitivity", icon: "🩺", color: "#10b981" },
    { id: "chirurgia", title: "Surgery", subtitle: "Extractions, wisdom teeth, sinus lift", icon: "⚕️", color: "#ef4444" },
    { id: "profilaktyka", title: "Prevention", subtitle: "Toothbrushes, floss, splints, bruxism", icon: "🛡️", color: "#06b6d4" },
    { id: "dzieci", title: "Children", subtitle: "Sealants, fluoride, baby teeth", icon: "👶", color: "#ec4899" },
];

export const PRIORITIES_EN: PriorityOption[] = [
    { id: "balanced", label: "Balanced", sublabel: "Balance between all factors", emoji: "⚖️", color: "#a855f7" },
    { id: "durable", label: "Most durable", sublabel: "Priority for years", emoji: "��", color: "#38bdf8" },
    { id: "min_invasive", label: "Least invasive", sublabel: "Preserve tissue", emoji: "🌿", color: "#10b981" },
    { id: "fast", label: "Fastest", sublabel: "Quickest result", emoji: "⚡", color: "#f59e0b" },
    { id: "easy_maintenance", label: "Easy maintenance", sublabel: "Minimum upkeep", emoji: "🧼", color: "#06b6d4" },
];

export const TABLE_ROW_LABELS_EN: { key: string; label: string; tooltip: string }[] = [
    { key: "time", label: "Treatment time", tooltip: "Approximate time from first to last visit." },
    { key: "visits", label: "Number of visits", tooltip: "Approximate number of visits needed to complete." },
    { key: "durability", label: "Durability", tooltip: "How long the solution can be expected to last." },
    { key: "invasiveness", label: "Invasiveness", tooltip: "Degree of intervention in tooth tissue." },
    { key: "risk", label: "Risk / complications", tooltip: "How high is the risk of failure or complications." },
    { key: "hygiene", label: "Hygiene", tooltip: "How easy it is to keep clean." },
    { key: "maintenance", label: "Service / check-ups", tooltip: "Frequency and scope of required maintenance." },
];

export function getRecommendationText_EN(priorityId: string, priorityLabel: string, methodLabel: string, methodShort: string, hasBadges: boolean): string {
    return `With priority "${priorityLabel}" the best match is **${methodLabel}**: ${methodShort} ${hasBadges ? "Pay attention to the notes below." : ""}`;
}
