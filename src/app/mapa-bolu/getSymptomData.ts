// ─────────────────────────────────────────────────────────────
// Locale-aware accessor for SymptomData + Doctors
// ─────────────────────────────────────────────────────────────

import { SYMPTOM_DATA, DOCTORS, type ZoneInfo } from './SymptomData';
import { SYMPTOM_DATA_EN, DOCTORS_EN } from './SymptomData.en';
import { SYMPTOM_DATA_DE, DOCTORS_DE } from './SymptomData.de';
import { SYMPTOM_DATA_UA, DOCTORS_UA } from './SymptomData.ua';

type DoctorMap = Record<string, { name: string; specialties: string }>;

const DATA_MAP: Record<string, Record<string, ZoneInfo>> = {
    pl: SYMPTOM_DATA,
    en: SYMPTOM_DATA_EN,
    de: SYMPTOM_DATA_DE,
    ua: SYMPTOM_DATA_UA,
};

const DOCTOR_MAP: Record<string, DoctorMap> = {
    pl: DOCTORS,
    en: DOCTORS_EN,
    de: DOCTORS_DE,
    ua: DOCTORS_UA,
};

export function getSymptomData(locale: string) {
    return {
        symptomData: DATA_MAP[locale] ?? SYMPTOM_DATA,
        doctors: DOCTOR_MAP[locale] ?? DOCTORS,
    };
}
