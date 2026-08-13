/**
 * High-level PII field encryption helpers for S8-7 transition.
 *
 * Write paths use `prepare*Insert()` to build dual-column payloads (plaintext +
 * encrypted) so existing reads keep working even before ENCRYPTION_KEY is set.
 *
 * Read paths use `read*()` which prefers the encrypted column when present,
 * falls back to plaintext. After backfill + N weeks, plaintext columns can be
 * dropped in a separate migration.
 *
 * Fail-soft: if encryption throws (missing env var, malformed key), the
 * plaintext columns are still written. Better degraded security than data loss.
 */

import {
    encryptStringToBase64,
    encryptJsonToBase64,
    hashPesel,
    isEncryptionConfigured,
    tryDecryptString,
    tryDecryptJson,
} from './fieldEncryption';

// ============================================================================
// patient_intake_submissions
// ============================================================================

export interface IntakeWriteInput {
    pesel?: string | null;
    medical_survey?: unknown;
    medical_notes?: string | null;
    signature_data?: string | null;
}

export interface IntakePiiPayload {
    /**
     * Kolumny JAWNE — opcjonalne od 2026-08-13. Przy sprawnym szyfrowaniu payload ich
     * NIE zawiera, więc `INSERT` zostawia je NULL-em. Pojawiają się wyłącznie w torze
     * awaryjnym (brak konfiguracji szyfrowania albo wyjątek), gdzie jawny PESEL jest
     * złem mniejszym niż e-Karta bez treści.
     */
    pesel?: string | null;
    medical_survey?: unknown;
    medical_notes?: string | null;
    signature_data?: string | null;
    pesel_encrypted?: string | null;
    pesel_hash?: string | null;
    medical_survey_encrypted?: string | null;
    medical_notes_encrypted?: string | null;
    signature_data_encrypted?: string | null;
}

/**
 * Build INSERT payload for patient_intake_submissions PII columns.
 *
 * 🔴 OD 2026-08-13 NOWE WIERSZE NIE MAJĄ JUŻ PESEL-U JAWNYM TEKSTEM.
 *
 * Dotąd payload niósł OBIE wersje — jawną „na okres przejściowy" i zaszyfrowaną.
 * Okres przejściowy się skończył: zmierzone na produkcji, że dla WSZYSTKICH sześciu
 * par kolumn (`patient_intake_submissions`: pesel, medical_survey, medical_notes,
 * signature_data; `patient_consents`: signature_data, biometric_data) liczba wierszy
 * „jawny bez zaszyfrowanego" wynosi **0**. Odczyt i tak idzie przez
 * `readIntakeSubmissionPii`, które woli kolumnę `_encrypted`.
 *
 * 🔑 FAIL-SOFT ZOSTAJE I JEST TU NAJWAŻNIEJSZY. Gdy szyfrowanie nie jest skonfigurowane
 * albo rzuci wyjątkiem, do payloadu wracają kolumny jawne — bo alternatywą byłaby
 * e-Karta zapisana BEZ PESEL-u w ogóle. Lepszy PESEL jawnym tekstem niż wywiad
 * medyczny bez pacjenta, którego dotyczy.
 *
 * ⏳ To jest takt „kod przed danymi". Kolumny jawne wolno usunąć z bazy dopiero wtedy,
 * gdy przez jakiś czas nie przybywa w nich nowych wartości — i to osobną migracją.
 */
export function prepareIntakeSubmissionInsert(input: IntakeWriteInput): IntakePiiPayload {
    const jawne: IntakePiiPayload = {
        pesel: input.pesel ?? null,
        medical_survey: input.medical_survey ?? null,
        medical_notes: input.medical_notes ?? null,
        signature_data: input.signature_data ?? null,
    };

    if (!isEncryptionConfigured()) {
        return jawne;
    }

    // Szyfrowanie działa → jawnych kolumn NIE wypełniamy.
    const payload: IntakePiiPayload = {};

    try {
        if (input.pesel) {
            payload.pesel_encrypted = encryptStringToBase64(input.pesel);
            payload.pesel_hash = hashPesel(input.pesel);
        }
        if (input.medical_survey !== undefined && input.medical_survey !== null) {
            payload.medical_survey_encrypted = encryptJsonToBase64(input.medical_survey);
        }
        if (input.medical_notes) {
            payload.medical_notes_encrypted = encryptStringToBase64(input.medical_notes);
        }
        if (input.signature_data) {
            payload.signature_data_encrypted = encryptStringToBase64(input.signature_data);
        }
    } catch (e) {
        console.error('[encryptedPiiFields] prepareIntakeSubmissionInsert encryption error:', (e as Error).message);
        /**
         * 🔑 FAIL-SOFT: szyfrowanie padło w połowie → wracamy do kolumn JAWNYCH.
         * Bez tego e-Karta zapisałaby się bez PESEL-u, bez wywiadu i bez podpisu —
         * czyli powstałby dokument medyczny bez treści, o czym nikt by się nie dowiedział.
         * Jawny PESEL jest złem mniejszym niż utrata wywiadu pacjenta.
         * `payload` może już nieść część pól zaszyfrowanych — scalamy, nie nadpisujemy.
         */
        return { ...jawne, ...payload };
    }

    return payload;
}

export interface IntakeReadRow {
    pesel?: string | null;
    pesel_encrypted?: string | null;
    medical_survey?: unknown;
    medical_survey_encrypted?: string | null;
    medical_notes?: string | null;
    medical_notes_encrypted?: string | null;
    signature_data?: string | null;
    signature_data_encrypted?: string | null;
}

export interface IntakeReadResult {
    pesel: string | null;
    medical_survey: unknown;
    medical_notes: string | null;
    signature_data: string | null;
}

/**
 * Read PII from a patient_intake_submissions row.
 * Prefers encrypted column when present (post-backfill), falls back to plaintext.
 */
export function readIntakeSubmissionPii(row: IntakeReadRow): IntakeReadResult {
    return {
        pesel: tryDecryptString(row.pesel_encrypted) ?? row.pesel ?? null,
        medical_survey: tryDecryptJson(row.medical_survey_encrypted) ?? row.medical_survey ?? null,
        medical_notes: tryDecryptString(row.medical_notes_encrypted) ?? row.medical_notes ?? null,
        signature_data: tryDecryptString(row.signature_data_encrypted) ?? row.signature_data ?? null,
    };
}

// ============================================================================
// patient_consents
// ============================================================================

export interface ConsentWriteInput {
    signature_data?: string | null;
    biometric_data?: unknown;
}

export interface ConsentPiiPayload {
    signature_data: string | null;
    biometric_data: unknown;
    signature_data_encrypted?: string | null;
    biometric_data_encrypted?: string | null;
}

export function prepareConsentInsert(input: ConsentWriteInput): ConsentPiiPayload {
    const payload: ConsentPiiPayload = {
        signature_data: input.signature_data ?? null,
        biometric_data: input.biometric_data ?? null,
    };

    if (!isEncryptionConfigured()) {
        return payload;
    }

    try {
        if (input.signature_data) {
            payload.signature_data_encrypted = encryptStringToBase64(input.signature_data);
        }
        if (input.biometric_data !== undefined && input.biometric_data !== null) {
            payload.biometric_data_encrypted = encryptJsonToBase64(input.biometric_data);
        }
    } catch (e) {
        console.error('[encryptedPiiFields] prepareConsentInsert encryption error:', (e as Error).message);
    }

    return payload;
}

export interface ConsentReadRow {
    signature_data?: string | null;
    signature_data_encrypted?: string | null;
    biometric_data?: unknown;
    biometric_data_encrypted?: string | null;
}

export interface ConsentReadResult {
    signature_data: string | null;
    biometric_data: unknown;
}

export function readPatientConsentPii(row: ConsentReadRow): ConsentReadResult {
    return {
        signature_data: tryDecryptString(row.signature_data_encrypted) ?? row.signature_data ?? null,
        biometric_data: tryDecryptJson(row.biometric_data_encrypted) ?? row.biometric_data ?? null,
    };
}
