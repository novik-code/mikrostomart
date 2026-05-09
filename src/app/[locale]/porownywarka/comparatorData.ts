// ═══════════════════════════════════════════════════════════════════════════
// Porównywarka — Core Data (categories, priorities, scoring, table labels)
// ═══════════════════════════════════════════════════════════════════════════

export type { Category, Comparator, Method, ScoredMethod, TableCell, GatingRule, PriorityOption } from "./comparatorTypes";
import type { Category, PriorityOption, PriorityWeights, ScoredMethod, GatingRule, Method } from "./comparatorTypes";

import { METHODS_ESTETYKA } from "./methodsEstetyka";
import { METHODS_BRAKI } from "./methodsBraki";
import { METHODS_KANALOWE } from "./methodsKanalowe";
import { METHODS_PERIO } from "./methodsPerio";
import { METHODS_CHIRURGIA } from "./methodsChirurgia";
import { METHODS_PROFILAKTYKA } from "./methodsProfilaktyka";
import { METHODS_DZIECI } from "./methodsDzieci";
import { COMPARATORS_ALL } from "./comparatorScenarios";
import { GATING_RULES_ALL } from "./comparatorGating";

// ═══ MERGED METHODS ═══
export const METHODS: Record<string, Method> = {
    ...METHODS_ESTETYKA, ...METHODS_BRAKI, ...METHODS_KANALOWE,
    ...METHODS_PERIO, ...METHODS_CHIRURGIA, ...METHODS_PROFILAKTYKA, ...METHODS_DZIECI,
};

// ═══ RE-EXPORTS ═══
export const COMPARATORS = COMPARATORS_ALL;
export const GATING_RULES = GATING_RULES_ALL;

// ═══ CATEGORIES ═══
export const CATEGORIES: Category[] = [
    { id: "estetyka", title: "Estetyka", subtitle: "Uśmiech, kolor, kształt, licówki", icon: "✨", color: "#a855f7" },
    { id: "braki", title: "Braki zębowe", subtitle: "Implant, most, proteza, onlay", icon: "🦷", color: "#38bdf8" },
    { id: "kanalowe", title: "Leczenie kanałowe", subtitle: "Endo, re-endo, odbudowa po endo", icon: "🔬", color: "#f59e0b" },
    { id: "periodontologia", title: "Dziąsła i higiena", subtitle: "Skaling, AIRFLOW, kiretaż, nadwrażliwość", icon: "🩺", color: "#10b981" },
    { id: "chirurgia", title: "Chirurgia", subtitle: "Ekstrakcje, ósemki, sinus lift", icon: "⚕️", color: "#ef4444" },
    { id: "profilaktyka", title: "Profilaktyka", subtitle: "Szczoteczki, nici, szyny, bruksizm", icon: "🛡️", color: "#06b6d4" },
    { id: "dzieci", title: "Dzieci", subtitle: "Lakowanie, fluor, mleczaki", icon: "👶", color: "#ec4899" },
];

// ═══ PRIORITIES ═══
export const PRIORITIES: PriorityOption[] = [
    { id: "balanced", label: "Zbalansowane", sublabel: "Równowaga między wszystkimi", emoji: "⚖️", color: "#a855f7" },
    { id: "durable", label: "Najtrwalsze", sublabel: "Priorytet na lata", emoji: "🏰", color: "#38bdf8" },
    { id: "min_invasive", label: "Najmniej inwazyjne", sublabel: "Zachowanie tkanek", emoji: "🌿", color: "#10b981" },
    { id: "fast", label: "Najszybsze", sublabel: "Efekt jak najszybciej", emoji: "⚡", color: "#f59e0b" },
    { id: "easy_maintenance", label: "Łatwa higiena", sublabel: "Minimum serwisu", emoji: "🧼", color: "#06b6d4" },
];

const WEIGHTS: Record<string, PriorityWeights> = {
    balanced: { durabilityScore: 0.25, speedScore: 0.20, minInvasiveScore: 0.20, maintenanceScore: 0.20, riskScore: 0.15 },
    durable: { durabilityScore: 0.50, speedScore: 0.05, minInvasiveScore: 0.10, maintenanceScore: 0.20, riskScore: 0.15 },
    min_invasive: { durabilityScore: 0.10, speedScore: 0.10, minInvasiveScore: 0.45, maintenanceScore: 0.15, riskScore: 0.20 },
    fast: { durabilityScore: 0.10, speedScore: 0.50, minInvasiveScore: 0.10, maintenanceScore: 0.15, riskScore: 0.15 },
    easy_maintenance: { durabilityScore: 0.15, speedScore: 0.10, minInvasiveScore: 0.10, maintenanceScore: 0.45, riskScore: 0.20 },
};

// ═══ TABLE ROW LABELS ═══
export const TABLE_ROW_LABELS: { key: string; label: string; tooltip: string }[] = [
    { key: "time", label: "Czas leczenia", tooltip: "Orientacyjny czas od pierwszej do ostatniej wizyty." },
    { key: "visits", label: "Liczba wizyt", tooltip: "Przybliżona liczba wizyt potrzebnych do zakończenia." },
    { key: "durability", label: "Trwałość", tooltip: "Jak długo można oczekiwać, że rozwiązanie przetrwa." },
    { key: "invasiveness", label: "Inwazyjność", tooltip: "Stopień ingerencji w tkanki zęba." },
    { key: "risk", label: "Ryzyko / powikłania", tooltip: "Jak duże jest ryzyko niepowodzenia lub powikłań." },
    { key: "hygiene", label: "Higiena", tooltip: "Jak łatwe jest utrzymanie czystości." },
    { key: "maintenance", label: "Serwis / kontrole", tooltip: "Częstotliwość i zakres wymaganej konserwacji." },
];

// ═══ SCORING ═══
export function rankMethods(comparatorId: string, priorityId: string, answers: Record<string, string>): ScoredMethod[] {
    const comp = COMPARATORS.find(c => c.id === comparatorId);
    const w = WEIGHTS[priorityId];
    if (!comp || !w) return [];

    const scored: ScoredMethod[] = comp.methodIds.map(mid => {
        const m = METHODS[mid];
        if (!m) return { methodId: mid, score: 0, badges: [] };
        const base =
            m.metrics.durabilityScore * w.durabilityScore +
            m.metrics.speedScore * w.speedScore +
            m.metrics.minInvasiveScore * w.minInvasiveScore +
            m.metrics.maintenanceScore * w.maintenanceScore +
            m.metrics.riskScore * w.riskScore;
        return { methodId: mid, score: Math.round(base), badges: [] as string[] };
    });

    // Apply gating rules
    for (const rule of GATING_RULES) {
        if (rule.comparatorId !== comparatorId) continue;
        const match = Object.entries(rule.answers).every(([k, v]) => answers[k] === v);
        if (!match) continue;
        for (const eff of rule.effects) {
            const s = scored.find(x => x.methodId === eff.methodId);
            if (s) {
                s.score = Math.max(0, Math.min(100, s.score + eff.scoreDelta));
                if (eff.badge) s.badges.push(eff.badge);
            }
        }
    }

    return scored.sort((a, b) => b.score - a.score);
}

// ═══ RECOMMENDATION TEXT ═══
export function getRecommendationText(priorityId: string, top: ScoredMethod): string {
    const m = METHODS[top.methodId];
    if (!m) return "";
    const pri = PRIORITIES.find(p => p.id === priorityId);
    return `Przy priorytecie „**${pri?.label || priorityId}**" najlepiej wypada **${m.label}**: ${m.short} ${top.badges.length > 0 ? "Zwróć uwagę na zastrzeżenia poniżej." : ""}`;
}
