import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { getProdentisKey } from '@/lib/pmsConfig';
import { warsawIso } from '@/lib/careflowSchedule';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendPushToGroups, type PushGroup } from '@/lib/pushService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Odpowiedź crona zawiera dane o pacjentach — nigdzie nie może osiąść w cache. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Grupy personelu powiadamiane o propozycjach, gdy nie ma wpisu w push_notification_config. */
const DEFAULT_PROPOSAL_GROUPS: PushGroup[] = ['doctors', 'admin'];

/** Polska odmiana po liczbie: 1 / 2-4 / 5+. */
function plural(n: number, one: string, few: string, many: string): string {
    if (n === 1) return one;
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

/**
 * CareFlow Auto-Qualification Cron — TRYB PROPOZYCJI (D1)
 * Runs daily at 8:00 AM — scans tomorrow's Prodentis appointments
 * and creates PROPOSALS for patients whose appointment type matches a template's procedure_types.
 *
 * BRAMKA BEZPIECZEŃSTWA KLINICZNEGO: dopasowanie po nazwie typu wizyty nie wie nic
 * o alergiach, ciąży, interakcjach ani wieku pacjenta. Dlatego cron NIE zapisuje już
 * nikogo na protokół — tworzy wiersz ze statusem 'proposed', ZERO care_tasks i ZERO
 * powiadomień dla pacjenta. Zadania i cały protokół uruchamia dopiero akceptacja
 * lekarza (trasa .../accept).
 *
 * Flow:
 * 1. Fetch all active CareFlow templates with their procedure_types
 * 2. Fetch all appointments for tomorrow from Prodentis
 * 3. Match appointment types to template procedure_types (case-insensitive, partial match)
 * 4. Skip if the patient already has a non-cancelled enrollment for that day — or an
 *    auto-qualify proposal the doctor already rejected (rejection sets 'cancelled')
 * 5. Create a 'proposed' enrollment + audit entry
 * 6. Notify staff once (aggregate, no patient names)
 *
 * Logi tego crona trafiają do Vercela: identyfikujemy pacjenta wyłącznie numerem
 * kartoteki (patientId). Nazwisko razem z nazwą protokołu chirurgicznego to dana
 * o zdrowiu i nie ma prawa wyjść poza bazę.
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' }, { headers: NO_STORE });
    }

    console.log('🏥 [CareFlow Auto-Qualify] Starting cron...');
    const startTime = Date.now();
    const elapsed = () => `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401, headers: NO_STORE });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let proposed = 0;
    let skipped = 0;
    let matched = 0;
    const errors: string[] = [];

    try {
        // 1. Fetch all active templates with procedure_types
        const { data: templates, error: tErr } = await supabase
            .from('care_templates')
            .select('*')
            .eq('is_active', true);

        if (tErr) {
            console.error('🏥 [CareFlow Auto-Qualify] Templates query failed:', tErr.message);
            throw new Error('Templates query failed');
        }

        // Filter templates that have procedure_types defined (auto-qualify enabled)
        const autoTemplates = (templates || []).filter(
            (t: any) => t.procedure_types && t.procedure_types.length > 0
        );

        if (autoTemplates.length === 0) {
            console.log('🏥 [CareFlow Auto-Qualify] No templates with procedure_types — nothing to auto-qualify.');
            return NextResponse.json(
                { success: true, matched: 0, proposed: 0, skipped: 0, message: 'No auto-qualify templates', duration: elapsed() },
                { headers: NO_STORE }
            );
        }

        console.log(`📋 Templates with auto-qualify: ${autoTemplates.map((t: any) => `${t.name} (${t.procedure_types.join(', ')})`).join('; ')}`);

        // 2. Calculate target date (tomorrow)
        const url = new URL(req.url);
        const targetDateParam = url.searchParams.get('targetDate');
        let targetDateStr: string;
        if (targetDateParam && /^\d{4}-\d{2}-\d{2}$/.test(targetDateParam)) {
            // Ręczne nadpisanie do testów — walidowane, bo trafia prosto do URL-a Prodentisa.
            targetDateStr = targetDateParam;
        } else {
            const tomorrow = new Date();
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            targetDateStr = tomorrow.toISOString().split('T')[0];
        }
        console.log(`📅 Scanning appointments for: ${targetDateStr}`);

        // 3. Fetch appointments from Prodentis
        // prodentisFetch = tunel Cloudflare z fallbackiem na direct-IP; bez X-API-Key
        // Prodentis odrzuca zapytanie (to dlatego cron nie zapisał nikogo od kwietnia).
        const prodentisKey = (await getProdentisKey()) ?? '';
        const apiResponse = await prodentisFetch(`/api/appointments/by-date?date=${targetDateStr}`, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
            signal: AbortSignal.timeout(15000),
        });

        if (!apiResponse.ok) {
            console.error(`🏥 [CareFlow Auto-Qualify] Prodentis API error: ${apiResponse.status} ${apiResponse.statusText}`);
            throw new Error('Prodentis API error');
        }

        const apiData = await apiResponse.json();
        const appointments = apiData.appointments || [];
        console.log(`📊 Found ${appointments.length} appointments for ${targetDateStr}`);

        if (appointments.length === 0) {
            return NextResponse.json(
                { success: true, matched: 0, proposed: 0, skipped: 0, message: 'No appointments for target date', duration: elapsed() },
                { headers: NO_STORE }
            );
        }

        // 4. Build procedure_type → template mapping (case-insensitive, partial match)
        // Template procedure_types: ["Chirurgia", "Implantologia"]
        // Appointment type: "Chirurgia stomatologiczna" → should match "Chirurgia"

        // 5. Process each appointment
        for (const appointment of appointments) {
            const appointmentType = appointment.appointmentType?.name || '';
            const patientId = appointment.patientId;
            const patientName = appointment.patientName || 'Nieznany';
            const doctorName = (appointment.doctor?.name || '').replace(/\s*\(I\)\s*/g, ' ').trim();

            if (!patientId || !appointmentType) {
                skipped++;
                continue;
            }

            // Skip non-working-hour appointments
            if (appointment.isWorkingHour !== true) {
                continue;
            }

            // Find matching template
            const normalizedType = appointmentType.toLowerCase().trim();
            let matchedTemplate: any = null;
            let matchedProcedureType = '';

            for (const template of autoTemplates) {
                const types = (template.procedure_types || []) as string[];
                const hit = types.find((pt: string) => {
                    const normalizedPt = pt.toLowerCase().trim();
                    // Pusty typ zabiegu pasowałby do WSZYSTKIEGO (''.includes → true) — odrzucamy.
                    if (!normalizedPt) return false;
                    // Partial match: "chirurgia" matches "chirurgia stomatologiczna"
                    return normalizedType.includes(normalizedPt) || normalizedPt.includes(normalizedType);
                });
                if (hit) {
                    matchedTemplate = template;
                    matchedProcedureType = hit;
                    break;
                }
            }

            if (!matchedTemplate) {
                // No template matches this appointment type
                continue;
            }

            matched++;
            // Logi Vercela nie są dokumentacją medyczną: identyfikujemy pacjenta numerem
            // kartoteki, nigdy nazwiskiem (nazwisko + typ zabiegu = dana o zdrowiu).
            console.log(`   🎯 Match: "${appointmentType}" → template "${matchedTemplate.name}" for patient ${patientId}`);

            // 6. Check if the patient already has an enrollment for this day.
            const { data: sameDayRows } = await supabase
                .from('care_enrollments')
                .select('id, status, enrolled_by')
                .eq('patient_id', patientId)
                // Doba WARSZAWSKA — bez jawnego offsetu Postgres liczyłby ją w UTC.
                .gte('appointment_date', warsawIso(targetDateStr, '00:00'))
                .lte('appointment_date', warsawIso(targetDateStr, '23:59'))
                .limit(10);

            // Blokuje każdy niezanulowany zapis (w tym 'proposed') ORAZ propozycja już
            // ODRZUCONA przez lekarza — odrzucenie ustawia 'cancelled', więc bez tego warunku
            // kolejny przebieg crona odtwarzałby propozycję, której lekarz świadomie nie chciał.
            const dayRows = (sameDayRows ?? []) as { id: string; status: string; enrolled_by: string | null }[];
            const existing = dayRows.find(
                (row) => row.status !== 'cancelled' || row.enrolled_by === 'auto-qualify'
            );

            if (existing) {
                const reason = existing.status === 'cancelled' ? 'odrzucona propozycja' : `status ${existing.status}`;
                console.log(`   ⏭ Skipping patient ${patientId} (enrollment ${existing.id}, ${reason})`);
                skipped++;
                continue;
            }

            // 7. Template must have steps — propozycja pustego protokołu nic nie daje.
            const { data: steps } = await supabase
                .from('care_template_steps')
                .select('id')
                .eq('template_id', matchedTemplate.id)
                .limit(1);

            if (!steps || steps.length === 0) {
                console.log(`   ⚠️ Template "${matchedTemplate.name}" has no steps — skipping`);
                skipped++;
                continue;
            }

            // 8. Find patient DB ID
            const { data: patientRow } = await supabase
                .from('patients')
                .select('id')
                .eq('prodentis_id', patientId)
                .maybeSingle();

            // 9. Create the proposal.
            // Prodentis podaje datę i godzinę w czasie lokalnym Polski — warsawIso dokleja
            // właściwy offset, żeby serwer w UTC nie przesunął punktu zerowego offsetów.
            const appointmentDateStr = warsawIso(appointment.date || targetDateStr, appointment.time || '10:00');
            console.log(`   📅 Parsed Prodentis Date: ${appointment.date} ${appointment.time} -> ${appointmentDateStr}`);

            const { data: enrollment, error: eErr } = await supabase
                .from('care_enrollments')
                .insert({
                    patient_id: patientId,
                    patient_name: patientName,
                    patient_phone: appointment.patientPhone || null,
                    patient_db_id: patientRow?.id || null,
                    template_id: matchedTemplate.id,
                    template_name: matchedTemplate.name,
                    appointment_id: appointment.id || null,
                    appointment_date: appointmentDateStr,
                    doctor_name: doctorName,
                    enrolled_by: 'auto-qualify',
                    // Propozycja, nie zapis: zero care_tasks, zero powiadomień do pacjenta.
                    status: 'proposed',
                })
                .select('id')
                .single();

            if (eErr) {
                // 23514 = check_violation. CHECK statusu z mig 110 nie zna wartości 'proposed'
                // (dokłada ją mig 181), więc bez wgranej migracji KAŻDY insert pada, a cron
                // kończył się { success: true, proposed: 0 } — cały tor D1 martwy i niewidoczny.
                if (eErr.code === '23514') {
                    console.error(
                        '🏥 [CareFlow Auto-Qualify] CHECK violation na care_enrollments.status — MIGRACJA 181 NIE ZOSTAŁA WGRANA. ' +
                        'Auto-kwalifikacja nie utworzy żadnej propozycji, dopóki nie wgrasz jej na Supabase (produkcja + demo).'
                    );
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'migration_181_required',
                            matched,
                            proposed,
                            skipped,
                            duration: elapsed(),
                        },
                        { status: 500, headers: NO_STORE }
                    );
                }
                console.error(`   ❌ Proposal failed for patient ${patientId}:`, eErr.message);
                errors.push(`Wizyta ${appointment.id || '?'}: nie udało się utworzyć propozycji`);
                continue;
            }

            // 10. Audit log
            await supabase.from('care_audit_log').insert({
                enrollment_id: enrollment.id,
                action: 'proposed',
                actor: 'careflow-auto-qualify',
                details: {
                    template_name: matchedTemplate.name,
                    patient_name: patientName,
                    appointment_type: appointmentType,
                    tasks_created: 0,
                    appointment_date: appointmentDateStr,
                    matched_procedure_type: matchedProcedureType,
                    match_reason: `Typ wizyty "${appointmentType}" pasuje do typu zabiegu "${matchedProcedureType}" protokołu "${matchedTemplate.name}"`,
                },
            });

            proposed++;
            console.log(`   📝 Proposed: patient ${patientId} → "${matchedTemplate.name}" (czeka na akceptację lekarza)`);
        }

        // 11. Jedno zbiorcze powiadomienie gabinetu — bez nazwisk (propozycja to dana medyczna).
        if (proposed > 0) {
            const phrase = `${proposed} ${plural(proposed, 'pacjent czeka', 'pacjenci czekają', 'pacjentów czeka')} na akceptację protokołu opieki`;
            try {
                await sendTelegramNotification(
                    `🏥 <b>CareFlow — propozycje do akceptacji</b>\n\n${phrase}.\nWizyty z dnia: ${targetDateStr}\n\nOtwórz panel, aby zaakceptować lub odrzucić.`,
                    'default'
                );

                const { data: configs } = await supabase
                    .from('push_notification_config')
                    .select('key, groups, enabled')
                    .eq('key', 'careflow-proposals');

                const cfg = (configs || [])[0] as { groups: string[] | null; enabled: boolean } | undefined;
                const groups = (cfg && cfg.enabled !== false && cfg.groups && cfg.groups.length > 0)
                    ? cfg.groups as PushGroup[]
                    : DEFAULT_PROPOSAL_GROUPS;

                await sendPushToGroups(groups, {
                    title: '🏥 CareFlow — propozycje do akceptacji',
                    body: `${phrase}.`,
                    url: '/admin',
                    tag: 'careflow-proposals-daily',
                    data: { type: 'careflow_proposals', count: proposed, date: targetDateStr },
                });
            } catch (notifyErr) {
                // Powiadomienie jest dodatkiem — jego awaria nie może unieważnić propozycji.
                console.error('🏥 [CareFlow Auto-Qualify] Staff notification error:', notifyErr);
            }
        }

        const duration = elapsed();
        console.log(`\n🏥 [CareFlow Auto-Qualify] Done: ${matched} matched, ${proposed} proposed, ${skipped} skipped, ${errors.length} errors (${duration})`);

        return NextResponse.json(
            {
                success: true,
                matched,
                proposed,
                skipped,
                errors: errors.length > 0 ? errors : undefined,
                duration,
            },
            { headers: NO_STORE }
        );
    } catch (err: any) {
        console.error('🏥 [CareFlow Auto-Qualify] Fatal error:', err);
        return NextResponse.json(
            { success: false, error: 'Auto-kwalifikacja nie powiodła się' },
            { status: 500, headers: NO_STORE }
        );
    }
}
