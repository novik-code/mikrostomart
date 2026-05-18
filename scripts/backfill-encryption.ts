/**
 * S8-7 Backfill: encrypt existing PII rows in patient_intake_submissions + patient_consents.
 *
 * Strategy:
 *   1. Iterate rows WHERE *_encrypted IS NULL AND plaintext column IS NOT NULL.
 *   2. Compute encrypted ciphertext + (for PESEL) hash.
 *   3. UPDATE only encrypted/hash columns. Plaintext stays for rollback safety.
 *   4. Log counts, sample IDs, errors.
 *
 * Modes:
 *   - DRY_RUN=true (default): print what WOULD be updated, no DB writes.
 *   - DRY_RUN=false: actually run UPDATEs.
 *
 * Required env vars:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ENCRYPTION_KEY (64 hex chars)
 *   - ENCRYPTION_HMAC_SALT (64 hex chars)
 *
 * Usage:
 *   # DRY_RUN on demo:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     ENCRYPTION_KEY=... ENCRYPTION_HMAC_SALT=... \
 *     DRY_RUN=true npx tsx scripts/backfill-encryption.ts
 *
 *   # Real run on demo (after DRY_RUN looks sane):
 *   DRY_RUN=false npx tsx scripts/backfill-encryption.ts
 *
 *   # Then repeat with PRODUCTION credentials.
 */

import { createClient } from '@supabase/supabase-js';
import {
    encryptStringToBase64,
    encryptJsonToBase64,
    hashPesel,
} from '../src/lib/fieldEncryption';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN !== 'false'; // default true for safety

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_HMAC_SALT) {
    console.error('Missing ENCRYPTION_KEY or ENCRYPTION_HMAC_SALT');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const log = (...args: unknown[]) => console.log(`[${DRY_RUN ? 'DRY' : 'LIVE'}]`, ...args);

interface BackfillStats {
    table: string;
    totalCandidates: number;
    encrypted: number;
    skipped: number;
    errors: number;
    sampleIds: string[];
}

async function backfillIntakeSubmissions(): Promise<BackfillStats> {
    const stats: BackfillStats = {
        table: 'patient_intake_submissions',
        totalCandidates: 0,
        encrypted: 0,
        skipped: 0,
        errors: 0,
        sampleIds: [],
    };

    log('--- patient_intake_submissions ---');

    const { data: rows, error } = await supabase
        .from('patient_intake_submissions')
        .select('id, pesel, pesel_encrypted, medical_survey, medical_survey_encrypted, medical_notes, medical_notes_encrypted, signature_data, signature_data_encrypted')
        .order('submitted_at', { ascending: true });

    if (error) {
        console.error('Failed to query patient_intake_submissions:', error);
        stats.errors++;
        return stats;
    }

    stats.totalCandidates = rows?.length || 0;
    log(`Found ${stats.totalCandidates} rows total`);

    for (const row of rows || []) {
        const updates: Record<string, string | null> = {};
        let needsUpdate = false;

        try {
            if (row.pesel && !row.pesel_encrypted) {
                updates.pesel_encrypted = encryptStringToBase64(row.pesel);
                updates.pesel_hash = hashPesel(row.pesel);
                needsUpdate = true;
            }
            if (row.medical_survey != null && !row.medical_survey_encrypted) {
                updates.medical_survey_encrypted = encryptJsonToBase64(row.medical_survey);
                needsUpdate = true;
            }
            if (row.medical_notes && !row.medical_notes_encrypted) {
                updates.medical_notes_encrypted = encryptStringToBase64(row.medical_notes);
                needsUpdate = true;
            }
            if (row.signature_data && !row.signature_data_encrypted) {
                updates.signature_data_encrypted = encryptStringToBase64(row.signature_data);
                needsUpdate = true;
            }

            if (!needsUpdate) {
                stats.skipped++;
                continue;
            }

            if (stats.sampleIds.length < 5) stats.sampleIds.push(row.id);

            if (DRY_RUN) {
                log(`  Would UPDATE ${row.id}: ${Object.keys(updates).join(', ')}`);
                stats.encrypted++;
            } else {
                const { error: updErr } = await supabase
                    .from('patient_intake_submissions')
                    .update(updates)
                    .eq('id', row.id);
                if (updErr) {
                    console.error(`  ERR ${row.id}:`, updErr);
                    stats.errors++;
                } else {
                    stats.encrypted++;
                    if (stats.encrypted % 50 === 0) log(`  Progress: ${stats.encrypted} encrypted`);
                }
            }
        } catch (e) {
            console.error(`  EXCEPTION on row ${row.id}:`, (e as Error).message);
            stats.errors++;
        }
    }

    return stats;
}

async function backfillPatientConsents(): Promise<BackfillStats> {
    const stats: BackfillStats = {
        table: 'patient_consents',
        totalCandidates: 0,
        encrypted: 0,
        skipped: 0,
        errors: 0,
        sampleIds: [],
    };

    log('--- patient_consents ---');

    const { data: rows, error } = await supabase
        .from('patient_consents')
        .select('id, signature_data, signature_data_encrypted, biometric_data, biometric_data_encrypted')
        .order('signed_at', { ascending: true });

    if (error) {
        console.error('Failed to query patient_consents:', error);
        stats.errors++;
        return stats;
    }

    stats.totalCandidates = rows?.length || 0;
    log(`Found ${stats.totalCandidates} rows total`);

    for (const row of rows || []) {
        const updates: Record<string, string | null> = {};
        let needsUpdate = false;

        try {
            if (row.signature_data && !row.signature_data_encrypted) {
                updates.signature_data_encrypted = encryptStringToBase64(row.signature_data);
                needsUpdate = true;
            }
            if (row.biometric_data != null && !row.biometric_data_encrypted) {
                updates.biometric_data_encrypted = encryptJsonToBase64(row.biometric_data);
                needsUpdate = true;
            }

            if (!needsUpdate) {
                stats.skipped++;
                continue;
            }

            if (stats.sampleIds.length < 5) stats.sampleIds.push(row.id);

            if (DRY_RUN) {
                log(`  Would UPDATE ${row.id}: ${Object.keys(updates).join(', ')}`);
                stats.encrypted++;
            } else {
                const { error: updErr } = await supabase
                    .from('patient_consents')
                    .update(updates)
                    .eq('id', row.id);
                if (updErr) {
                    console.error(`  ERR ${row.id}:`, updErr);
                    stats.errors++;
                } else {
                    stats.encrypted++;
                    if (stats.encrypted % 50 === 0) log(`  Progress: ${stats.encrypted} encrypted`);
                }
            }
        } catch (e) {
            console.error(`  EXCEPTION on row ${row.id}:`, (e as Error).message);
            stats.errors++;
        }
    }

    return stats;
}

async function verifyRoundTrip(): Promise<void> {
    log('--- Round-trip verification (1 row each table) ---');
    const { decryptStringFromBase64, decryptJsonFromBase64 } = await import('../src/lib/fieldEncryption');

    // Intake
    const { data: intakeSample } = await supabase
        .from('patient_intake_submissions')
        .select('id, pesel, pesel_encrypted, medical_survey, medical_survey_encrypted')
        .not('pesel_encrypted', 'is', null)
        .limit(1);

    if (intakeSample?.[0]) {
        const row = intakeSample[0];
        try {
            const decryptedPesel = decryptStringFromBase64(row.pesel_encrypted!);
            const matches = decryptedPesel === row.pesel;
            log(`  Intake ${row.id}: pesel round-trip ${matches ? '✅ OK' : '❌ MISMATCH'}`);
            if (row.medical_survey_encrypted) {
                const decryptedSurvey = decryptJsonFromBase64(row.medical_survey_encrypted);
                const sameKeys = JSON.stringify(decryptedSurvey) === JSON.stringify(row.medical_survey);
                log(`  Intake ${row.id}: medical_survey round-trip ${sameKeys ? '✅ OK' : '⚠️  JSON diff (may be ordering)'}`);
            }
        } catch (e) {
            console.error(`  Intake ${row.id} verify FAILED:`, (e as Error).message);
        }
    } else {
        log('  No encrypted intake rows to verify');
    }

    // Consent
    const { data: consentSample } = await supabase
        .from('patient_consents')
        .select('id, signature_data, signature_data_encrypted, biometric_data, biometric_data_encrypted')
        .not('signature_data_encrypted', 'is', null)
        .limit(1);

    if (consentSample?.[0]) {
        const row = consentSample[0];
        try {
            const decryptedSig = decryptStringFromBase64(row.signature_data_encrypted!);
            const matches = decryptedSig === row.signature_data;
            log(`  Consent ${row.id}: signature round-trip ${matches ? '✅ OK' : '❌ MISMATCH'}`);
            if (row.biometric_data_encrypted) {
                const decryptedBio = decryptJsonFromBase64(row.biometric_data_encrypted);
                const sameKeys = JSON.stringify(decryptedBio) === JSON.stringify(row.biometric_data);
                log(`  Consent ${row.id}: biometric round-trip ${sameKeys ? '✅ OK' : '⚠️  JSON diff'}`);
            }
        } catch (e) {
            console.error(`  Consent ${row.id} verify FAILED:`, (e as Error).message);
        }
    } else {
        log('  No encrypted consent rows to verify');
    }
}

async function main() {
    console.log('');
    console.log('=======================================');
    console.log('  S8-7 PII Encryption Backfill');
    console.log(`  Mode: ${DRY_RUN ? 'DRY_RUN (no DB writes)' : '🚨 LIVE (writes to DB)'}`);
    console.log(`  Target: ${SUPABASE_URL}`);
    console.log('=======================================');
    console.log('');

    const start = Date.now();
    const intakeStats = await backfillIntakeSubmissions();
    const consentStats = await backfillPatientConsents();

    if (!DRY_RUN) {
        await verifyRoundTrip();
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log('');
    console.log('=======================================');
    console.log('  SUMMARY');
    console.log('=======================================');
    for (const stats of [intakeStats, consentStats]) {
        console.log(`  ${stats.table}:`);
        console.log(`    total candidates: ${stats.totalCandidates}`);
        console.log(`    encrypted: ${stats.encrypted}`);
        console.log(`    skipped (already encrypted): ${stats.skipped}`);
        console.log(`    errors: ${stats.errors}`);
        if (stats.sampleIds.length) console.log(`    sample IDs: ${stats.sampleIds.join(', ')}`);
    }
    console.log(`  Elapsed: ${elapsed}s`);
    console.log('');

    if (DRY_RUN) {
        console.log('▶ Re-run with DRY_RUN=false to apply changes.');
    } else {
        console.log('✅ Backfill complete. Verify decryption in app + spot-check a few records.');
    }
    console.log('');

    process.exit(intakeStats.errors + consentStats.errors > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
