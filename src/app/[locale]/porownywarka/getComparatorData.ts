// ═══════════════════════════════════════════════════════════════════════════
// Locale-aware comparator data loader
// ═══════════════════════════════════════════════════════════════════════════

import type { Category, Comparator, Method, PriorityOption, GatingRule, ScoredMethod, PriorityWeights } from "./comparatorTypes";

// ─── Polish (default) ───
import { METHODS_ESTETYKA } from "./methodsEstetyka";
import { METHODS_BRAKI } from "./methodsBraki";
import { METHODS_KANALOWE } from "./methodsKanalowe";
import { METHODS_PERIO } from "./methodsPerio";
import { METHODS_CHIRURGIA } from "./methodsChirurgia";
import { METHODS_PROFILAKTYKA } from "./methodsProfilaktyka";
import { METHODS_DZIECI } from "./methodsDzieci";
import { COMPARATORS_ALL } from "./comparatorScenarios";
import { GATING_RULES_ALL } from "./comparatorGating";
import {
    CATEGORIES as CATEGORIES_PL,
    PRIORITIES as PRIORITIES_PL,
    TABLE_ROW_LABELS as TABLE_ROW_LABELS_PL,
} from "./comparatorData";

// ─── English ───
import { METHODS_ESTETYKA_EN } from "./methodsEstetyka.en";
import { METHODS_BRAKI_EN } from "./methodsBraki.en";
import { METHODS_KANALOWE_EN } from "./methodsKanalowe.en";
import { METHODS_PERIO_EN } from "./methodsPerio.en";
import { METHODS_CHIRURGIA_EN } from "./methodsChirurgia.en";
import { METHODS_PROFILAKTYKA_EN } from "./methodsProfilaktyka.en";
import { METHODS_DZIECI_EN } from "./methodsDzieci.en";
import { COMPARATORS_EN } from "./comparatorScenarios.en";
import { GATING_RULES_ALL_EN } from "./comparatorGating.en";
import { CATEGORIES_EN, PRIORITIES_EN, TABLE_ROW_LABELS_EN, getRecommendationText_EN } from "./comparatorData.en";

// ─── German ───
import { METHODS_ESTETYKA_DE } from "./methodsEstetyka.de";
import { METHODS_BRAKI_DE } from "./methodsBraki.de";
import { METHODS_KANALOWE_DE } from "./methodsKanalowe.de";
import { METHODS_PERIO_DE } from "./methodsPerio.de";
import { METHODS_CHIRURGIA_DE } from "./methodsChirurgia.de";
import { METHODS_PROFILAKTYKA_DE } from "./methodsProfilaktyka.de";
import { METHODS_DZIECI_DE } from "./methodsDzieci.de";
import { COMPARATORS_DE } from "./comparatorScenarios.de";
import { GATING_RULES_ALL_DE } from "./comparatorGating.de";
import { CATEGORIES_DE, PRIORITIES_DE, TABLE_ROW_LABELS_DE, getRecommendationText_DE } from "./comparatorData.de";

// ─── Ukrainian ───
import { METHODS_ESTETYKA_UA } from "./methodsEstetyka.ua";
import { METHODS_BRAKI_UA } from "./methodsBraki.ua";
import { METHODS_KANALOWE_UA } from "./methodsKanalowe.ua";
import { METHODS_PERIO_UA } from "./methodsPerio.ua";
import { METHODS_CHIRURGIA_UA } from "./methodsChirurgia.ua";
import { METHODS_PROFILAKTYKA_UA } from "./methodsProfilaktyka.ua";
import { METHODS_DZIECI_UA } from "./methodsDzieci.ua";
import { COMPARATORS_UA } from "./comparatorScenarios.ua";
import { GATING_RULES_ALL_UA } from "./comparatorGating.ua";
import { CATEGORIES_UA, PRIORITIES_UA, TABLE_ROW_LABELS_UA, getRecommendationText_UA } from "./comparatorData.ua";

// ─── Types ───

export interface ComparatorDataSet {
    categories: Category[];
    comparators: Comparator[];
    priorities: PriorityOption[];
    methods: Record<string, Method>;
    gatingRules: GatingRule[];
    tableRowLabels: { key: string; label: string; tooltip: string }[];
    getRecommendationText: (priorityId: string, priorityLabel: string, methodLabel: string, methodShort: string, hasBadges: boolean) => string;
    rankMethods: (comparatorId: string, priorityId: string, answers: Record<string, string>) => ScoredMethod[];
}

const WEIGHTS: Record<string, PriorityWeights> = {
    balanced: { durabilityScore: 0.25, speedScore: 0.20, minInvasiveScore: 0.20, maintenanceScore: 0.20, riskScore: 0.15 },
    durable: { durabilityScore: 0.50, speedScore: 0.05, minInvasiveScore: 0.10, maintenanceScore: 0.20, riskScore: 0.15 },
    min_invasive: { durabilityScore: 0.10, speedScore: 0.10, minInvasiveScore: 0.45, maintenanceScore: 0.15, riskScore: 0.20 },
    fast: { durabilityScore: 0.10, speedScore: 0.50, minInvasiveScore: 0.10, maintenanceScore: 0.15, riskScore: 0.15 },
    easy_maintenance: { durabilityScore: 0.15, speedScore: 0.10, minInvasiveScore: 0.10, maintenanceScore: 0.45, riskScore: 0.20 },
};

function createRankMethods(
    comparators: Comparator[],
    methods: Record<string, Method>,
    gatingRules: GatingRule[]
) {
    return function rankMethods(comparatorId: string, priorityId: string, answers: Record<string, string>): ScoredMethod[] {
        const comp = comparators.find(c => c.id === comparatorId);
        const w = WEIGHTS[priorityId];
        if (!comp || !w) return [];

        const scored: ScoredMethod[] = comp.methodIds.map(mid => {
            const m = methods[mid];
            if (!m) return { methodId: mid, score: 0, badges: [] };
            const base =
                m.metrics.durabilityScore * w.durabilityScore +
                m.metrics.speedScore * w.speedScore +
                m.metrics.minInvasiveScore * w.minInvasiveScore +
                m.metrics.maintenanceScore * w.maintenanceScore +
                m.metrics.riskScore * w.riskScore;
            return { methodId: mid, score: Math.round(base), badges: [] as string[] };
        });

        for (const rule of gatingRules) {
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
    };
}

// ─── Polish recommendation text (adapted to new signature) ───
function getRecommendationText_PL(_priorityId: string, priorityLabel: string, methodLabel: string, methodShort: string, hasBadges: boolean): string {
    return `Przy priorytecie „**${priorityLabel}**" najlepiej wypada **${methodLabel}**: ${methodShort} ${hasBadges ? "Zwróć uwagę na zastrzeżenia poniżej." : ""}`;
}

// ─── Merged methods per locale ───
const METHODS_PL: Record<string, Method> = {
    ...METHODS_ESTETYKA, ...METHODS_BRAKI, ...METHODS_KANALOWE,
    ...METHODS_PERIO, ...METHODS_CHIRURGIA, ...METHODS_PROFILAKTYKA, ...METHODS_DZIECI,
};

const METHODS_EN_ALL: Record<string, Method> = {
    ...METHODS_ESTETYKA_EN, ...METHODS_BRAKI_EN, ...METHODS_KANALOWE_EN,
    ...METHODS_PERIO_EN, ...METHODS_CHIRURGIA_EN, ...METHODS_PROFILAKTYKA_EN, ...METHODS_DZIECI_EN,
};

const METHODS_DE_ALL: Record<string, Method> = {
    ...METHODS_ESTETYKA_DE, ...METHODS_BRAKI_DE, ...METHODS_KANALOWE_DE,
    ...METHODS_PERIO_DE, ...METHODS_CHIRURGIA_DE, ...METHODS_PROFILAKTYKA_DE, ...METHODS_DZIECI_DE,
};

const METHODS_UA_ALL: Record<string, Method> = {
    ...METHODS_ESTETYKA_UA, ...METHODS_BRAKI_UA, ...METHODS_KANALOWE_UA,
    ...METHODS_PERIO_UA, ...METHODS_CHIRURGIA_UA, ...METHODS_PROFILAKTYKA_UA, ...METHODS_DZIECI_UA,
};

// ─── Main lookup ───
const DATA_MAP: Record<string, ComparatorDataSet> = {
    pl: {
        categories: CATEGORIES_PL,
        comparators: COMPARATORS_ALL,
        priorities: PRIORITIES_PL,
        methods: METHODS_PL,
        gatingRules: GATING_RULES_ALL,
        tableRowLabels: TABLE_ROW_LABELS_PL,
        getRecommendationText: getRecommendationText_PL,
        rankMethods: createRankMethods(COMPARATORS_ALL, METHODS_PL, GATING_RULES_ALL),
    },
    en: {
        categories: CATEGORIES_EN,
        comparators: COMPARATORS_EN,
        priorities: PRIORITIES_EN,
        methods: METHODS_EN_ALL,
        gatingRules: GATING_RULES_ALL_EN,
        tableRowLabels: TABLE_ROW_LABELS_EN,
        getRecommendationText: getRecommendationText_EN,
        rankMethods: createRankMethods(COMPARATORS_EN, METHODS_EN_ALL, GATING_RULES_ALL_EN),
    },
    de: {
        categories: CATEGORIES_DE,
        comparators: COMPARATORS_DE,
        priorities: PRIORITIES_DE,
        methods: METHODS_DE_ALL,
        gatingRules: GATING_RULES_ALL_DE,
        tableRowLabels: TABLE_ROW_LABELS_DE,
        getRecommendationText: getRecommendationText_DE,
        rankMethods: createRankMethods(COMPARATORS_DE, METHODS_DE_ALL, GATING_RULES_ALL_DE),
    },
    ua: {
        categories: CATEGORIES_UA,
        comparators: COMPARATORS_UA,
        priorities: PRIORITIES_UA,
        methods: METHODS_UA_ALL,
        gatingRules: GATING_RULES_ALL_UA,
        tableRowLabels: TABLE_ROW_LABELS_UA,
        getRecommendationText: getRecommendationText_UA,
        rankMethods: createRankMethods(COMPARATORS_UA, METHODS_UA_ALL, GATING_RULES_ALL_UA),
    },
};

export function getComparatorData(locale: string): ComparatorDataSet {
    return DATA_MAP[locale] ?? DATA_MAP.pl;
}
