// ───────────────────────────────────────────────────────────────────────────
// Porównywarka — Type Definitions
// ───────────────────────────────────────────────────────────────────────────

export interface QuestionOption {
    value: string;
    label: string;
    emoji?: string;
}

export interface Question {
    id: string;
    label: string;
    options: QuestionOption[];
}

export interface TableCell {
    value: string;
    scale?: number;
    tooltip?: string;
}

export interface MethodTable {
    time: TableCell;
    visits: TableCell;
    durability: TableCell;
    invasiveness: TableCell;
    risk: TableCell;
    hygiene: TableCell;
    worksWhen: string[];
    notIdealWhen: string[];
    maintenance: TableCell;
}

export interface MethodMetrics {
    durabilityScore: number;
    speedScore: number;
    minInvasiveScore: number;
    maintenanceScore: number;
    riskScore: number;
}

export interface Method {
    id: string;
    label: string;
    short: string;
    icon: string;
    color: string;
    table: MethodTable;
    metrics: MethodMetrics;
    recommendedSpecialist: string;
}

export interface GatingEffect {
    methodId: string;
    scoreDelta: number;
    badge?: string;
}

export interface GatingRule {
    id: string;
    comparatorId: string;
    answers: Record<string, string>;
    effects: GatingEffect[];
}

export interface PriorityOption {
    id: string;
    label: string;
    sublabel: string;
    emoji: string;
    color: string;
}

export interface PriorityWeights {
    durabilityScore: number;
    speedScore: number;
    minInvasiveScore: number;
    maintenanceScore: number;
    riskScore: number;
}

export interface Category {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
}

export interface Comparator {
    id: string;
    categoryId: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    methodIds: string[];
    questions: Question[];
}

export interface ScoredMethod {
    methodId: string;
    score: number;
    badges: string[];
}
