import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';
import { sendTelegramNotification } from '@/lib/telegram';
import { isSmsTypeEnabled } from '@/lib/smsSettings';
import { demoSanitize } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * GET /api/cron/birthday-wishes
 * Vercel Cron — runs daily at 8:00 AM
 * 
 * 1. Fetches all registered patients from Supabase
 * 2. For patients without cached birth_date, fetches from Prodentis and caches
 * 3. Finds today's birthday patients (matching month + day)
 * 4. Sends SMS wishes (one per year per patient)
 * 5. Sends Telegram summary to admin
 */
export async function GET(req: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    try {
        // Verify cron secret (Vercel sends this automatically)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if birthday SMS is enabled
        const enabled = await isSmsTypeEnabled('birthday');
        if (!enabled) {
            console.log('[Birthday] SMS type disabled via admin settings');
            return NextResponse.json({ success: true, skipped: true, reason: 'SMS type disabled' });
        }

        const now = new Date();
        const today = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
        const todayMonth = today.getMonth() + 1; // 1-based
        const todayDay = today.getDate();
        const currentYear = today.getFullYear();

        console.log(`[Birthday] Running for ${todayDay}/${todayMonth}/${currentYear}`);

        // ── Step 1: Get all registered patients ──
        const { data: patients, error: patErr } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone, email, birth_date')
            .not('prodentis_id', 'is', null);

        if (patErr || !patients) {
            console.error('[Birthday] Failed to fetch patients:', patErr);
            return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
        }

        console.log(`[Birthday] Found ${patients.length} registered patients`);

        // ── Step 2: Cache birth_date for patients that don't have it ──
        const uncached = patients.filter(p => !p.birth_date);
        let cached = 0;

        for (const p of uncached) {
            try {
                const res = await fetch(`${PRODENTIS_API}/api/patient/${p.prodentis_id}/details`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (res.ok) {
                    const details = await res.json();
                    if (details.birthDate) {
                        await supabase
                            .from('patients')
                            .update({ birth_date: details.birthDate })
                            .eq('id', p.id);
                        p.birth_date = details.birthDate;
                        cached++;
                    }
                }
            } catch (e) {
                console.warn(`[Birthday] Failed to cache birth_date for ${p.prodentis_id}:`, e);
            }
        }

        if (cached > 0) {
            console.log(`[Birthday] Cached ${cached} birth dates from Prodentis`);
        }

        // ── Step 3: Find today's birthday patients ──
        const birthdayPatients = patients.filter(p => {
            if (!p.birth_date) return false;
            const bd = new Date(p.birth_date);
            return (bd.getMonth() + 1) === todayMonth && bd.getDate() === todayDay;
        });

        console.log(`[Birthday] ${birthdayPatients.length} patients have birthday today`);

        if (birthdayPatients.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No birthdays today',
                birthdayCount: 0,
            });
        }

        // ── Step 4: Send birthday SMS (skip if already sent this year) ──
        let smsSent = 0;
        let smsErrors = 0;
        const birthdayNames: string[] = [];

        for (const p of birthdayPatients) {
            // Check if already sent this year
            const { data: existing } = await supabase
                .from('birthday_wishes')
                .select('id')
                .eq('prodentis_id', p.prodentis_id)
                .eq('year', currentYear)
                .single();

            if (existing) {
                console.log(`[Birthday] Already sent to ${p.prodentis_id} this year`);
                continue;
            }

            // Get patient name from Prodentis
            let patientName = '';
            try {
                const detRes = await fetch(`${PRODENTIS_API}/api/patient/${p.prodentis_id}/details`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (detRes.ok) {
                    const det = await detRes.json();
                    patientName = `${det.firstName || ''} ${det.lastName || ''}`.trim();
                }
            } catch (e) {
                console.warn('[Birthday] Failed to fetch name:', e);
            }

            const firstName = patientName.split(' ')[0] || 'Pacjencie';

            // Birthday message
            const smsMessage = `${firstName}, z okazji urodzin zyczymy duzo zdrowia i pieknego usmiechu! Zespol Mikrostomart`;

            let smsSuccess = false;
            let smsError = '';

            if (p.phone) {
                try {
                    const result = await sendSMS({
                        to: p.phone,
                        message: smsMessage,
                    });
                    smsSuccess = result.success;
                    if (!result.success) smsError = result.error || 'Unknown error';
                } catch (e: any) {
                    smsError = e.message || 'SMS send exception';
                }
            } else {
                smsError = 'No phone number';
            }

            // Record in birthday_wishes table
            await supabase.from('birthday_wishes').insert({
                patient_id: p.id,
                prodentis_id: p.prodentis_id,
                patient_name: patientName,
                patient_phone: p.phone,
                sms_sent: smsSuccess,
                sms_error: smsError || null,
                year: currentYear,
            });

            if (smsSuccess) {
                smsSent++;
                birthdayNames.push(`${patientName} (${p.phone})`);
            } else {
                smsErrors++;
                console.error(`[Birthday] SMS failed for ${p.prodentis_id}:`, smsError);
            }
        }

        // ── Step 5: Telegram summary ──
        if (smsSent > 0 || smsErrors > 0) {
            const telegramMsg = `🎂 <b>ŻYCZENIA URODZINOWE — ${todayDay}.${todayMonth.toString().padStart(2, '0')}</b>\n\n` +
                `✅ Wysłano SMS: <b>${smsSent}</b>\n` +
                (smsErrors > 0 ? `❌ Błędy: <b>${smsErrors}</b>\n` : '') +
                (birthdayNames.length > 0 ? `\n👤 ${birthdayNames.join('\n👤 ')}` : '');

            sendTelegramNotification(telegramMsg, 'default').catch(console.error);
        }

        console.log(`[Birthday] Done: ${smsSent} sent, ${smsErrors} errors`);

        return NextResponse.json({
            success: true,
            birthdayCount: birthdayPatients.length,
            smsSent,
            smsErrors,
            cached,
        });

    } catch (err: any) {
        console.error('[Birthday] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
