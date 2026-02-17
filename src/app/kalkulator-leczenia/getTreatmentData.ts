// ───────────────────────────────────────────────────────────────────────────
// getTreatmentData.ts  –  locale-aware treatment data loader
// ───────────────────────────────────────────────────────────────────────────

import type { TreatmentPath } from "./treatmentData";
import { TREATMENT_PATHS, formatDuration } from "./treatmentData";
import { TREATMENT_PATHS_EN, formatDuration_EN } from "./treatmentData.en";
import { TREATMENT_PATHS_DE, formatDuration_DE } from "./treatmentData.de";
import { TREATMENT_PATHS_UA, formatDuration_UA } from "./treatmentData.ua";

export interface TreatmentDataSet {
    treatmentPaths: TreatmentPath[];
    formatDuration: (days: number) => string;
}

const DATA_MAP: Record<string, TreatmentDataSet> = {
    pl: { treatmentPaths: TREATMENT_PATHS, formatDuration },
    en: { treatmentPaths: TREATMENT_PATHS_EN, formatDuration: formatDuration_EN },
    de: { treatmentPaths: TREATMENT_PATHS_DE, formatDuration: formatDuration_DE },
    ua: { treatmentPaths: TREATMENT_PATHS_UA, formatDuration: formatDuration_UA },
};

export function getTreatmentData(locale: string): TreatmentDataSet {
    return DATA_MAP[locale] ?? DATA_MAP.pl;
}
