import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';
import { getEmailTemplate } from '@/lib/emailTemplates';
import { getDoctorInfo, normalizePhone, fuzzyNameMatch, extractFirstName, extractLastName, findBestPatientMatch, nameMatchScore } from '@/lib/doctorMapping';
import type { PatientCandidate } from '@/lib/doctorMapping';
import { demoSanitize, brand } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, firstName: formFirstName, lastName: formLastName, email, phone, specialist, specialistName, date, time, description, attachment, locale: requestLocale } = body;
        // Use separate firstName/lastName if provided, otherwise fall back to splitting name
        const patientFirstName = formFirstName || name?.split(/\s+/)[0] || '';
        const patientLastName = formLastName || name?.split(/\s+/).slice(1).join(' ') || '';
        const displayName = name || `${patientFirstName} ${patientLastName}`.trim();
        const locale = ['pl', 'en', 'de', 'ua'].includes(requestLocale) ? requestLocale : 'pl';

        // Format date WITHOUT timezone conversion (date/time are already in Warsaw time)
        const [year, month, day] = date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
        const appointmentDate = `${dayName}, ${formattedDate} o godz. ${time}`;

        // --- Supabase client (shared across all DB operations) ---
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

        // Save to Database (Supabase) — capture reservation ID
        let reservationId: string | null = null;
        if (supabase) {
            try {
                const { data: resData, error: dbError } = await supabase.from('reservations').insert({
                    name,
                    email,
                    phone,
                    date,
                    time,
                    specialist: specialistName,
                    service: specialistName,
                    description,
                    has_attachment: !!attachment,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }).select('id').single();

                if (dbError) {
                    console.error("Supabase Reservation Insert Error:", dbError);
                } else {
                    reservationId = resData?.id || null;
                    console.log("Reservation saved to Supabase:", reservationId);
                }
            } catch (dbEx) {
                console.error("Database save exception:", dbEx);
            }
        }

        // Telegram Message (Admin)
        const telegramMessage = `📅 <b>NOWA REZERWACJA</b>\n\n` +
            `🩺 <b>Specjalista:</b> ${specialistName}\n` +
            `📆 <b>Data i godz.:</b> ${appointmentDate}\n` +
            `👤 <b>Pacjent:</b> ${name}\n` +
            `📞 <b>Telefon:</b> <a href="tel:${phone}">${phone}</a>\n` +
            `📧 <b>Email:</b> ${email}\n` +
            (description ? `💬 <b>Opis:</b> ${description}\n` : '') +
            (attachment ? `📎 <b>Załącznik:</b> ${attachment.name}\n` : '');

        // Email Content (Admin)
        const adminSubject = `Nowa rezerwacja: ${specialistName} - ${date} ${time}`;
        const adminHtml = `
            <h1>Nowa Rezerwacja Online</h1>
            <p><strong>Specjalista:</strong> ${specialistName}</p>
            <p><strong>Data:</strong> ${appointmentDate}</p>
            <hr />
            <h3>Dane pacjenta:</h3>
            <p><strong>Imię i nazwisko:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefon:</strong> ${phone}</p>
            ${description ? `<p><strong>Opis problemu:</strong><br/>${description}</p>` : ''}
            ${attachment ? `<p><strong>Załącznik:</strong> ${attachment.name} (${attachment.type})</p>` : ''}
        `;

        const firstName = patientFirstName;
        const patientEmail = getEmailTemplate('reservation_confirmation', locale, {
            firstName,
            specialist: specialistName,
            appointmentDate,
            description: description || '',
        });
        const patientSubject = patientEmail.subject;
        const patientHtml = patientEmail.html;

        // Send Telegram
        if (telegramMessage) {
            await sendTelegramNotification(telegramMessage, 'default');
        }

        // Push notification to admin + employees
        broadcastPush('admin', 'new_reservation', {
            name, specialist: specialistName || '', date: date || '', time: time || '',
        }, '/admin').catch(console.error);
        broadcastPush('employee', 'new_reservation', {
            name, specialist: specialistName || '', date: date || '', time: time || '',
        }, '/pracownik').catch(console.error);

        // Send Emails
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const adminEmail = demoSanitize('gabinet@mikrostomart.pl');

            const adminAttachments = attachment && attachment.content
                ? [{ filename: attachment.name, content: attachment.content.split(',')[1] }]
                : undefined;

            await sendEmail({
                from: brand.notificationEmail,
                to: adminEmail,
                subject: adminSubject,
                html: adminHtml,
                attachments: adminAttachments,
            });

            await sendEmail({
                from: `Gabinet Mikrostomart <${adminEmail}>`,
                replyTo: adminEmail,
                to: email,
                subject: patientSubject,
                html: patientHtml,
            });
        }

        // ═══════════════════════════════════════════════════════════
        //  ONLINE BOOKING — Patient matching with double verification
        // ═══════════════════════════════════════════════════════════
        let intakeUrl: string | null = null;
        let isNewPatient = false;

        if (supabase) {
            try {
                const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
                const prodentisKey = process.env.PRODENTIS_API_KEY || '';
                const doctorInfo = getDoctorInfo(specialist);
                const normalizedPhone = normalizePhone(phone);
                const patientFirstName = extractFirstName(name);
                const patientLastName = extractLastName(name);

                let prodentisPatientId: string | null = null;
                let matchMethod: string = 'new';
                let matchConfidence: number | null = null;
                let matchCandidates: PatientCandidate[] = [];

                // ── Step 1: Search patient by phone in Prodentis ──
                if (prodentisKey && normalizedPhone) {
                    try {
                        const phoneSearchRes = await fetch(
                            `${prodentisUrl}/api/patients/search?phone=${normalizedPhone}&limit=10`,
                            {
                                headers: { 'Content-Type': 'application/json' },
                                signal: AbortSignal.timeout(5000),
                            }
                        );

                        if (phoneSearchRes.ok) {
                            const phoneData = await phoneSearchRes.json();
                            const candidates = (phoneData.patients || []).map((p: any) => ({
                                id: p.id || p.prodentisId,
                                firstName: p.firstName || p.imie || '',
                                lastName: p.lastName || p.nazwisko || '',
                                phone: p.phone || '',
                            }));

                            if (candidates.length > 0) {
                                // Score ALL candidates by firstName + lastName
                                const { best, all } = findBestPatientMatch(candidates, patientFirstName, patientLastName);
                                matchCandidates = all;

                                if (best) {
                                    if (best.score >= 85) {
                                        // HIGH CONFIDENCE — auto-match
                                        prodentisPatientId = best.id;
                                        matchMethod = `phone+name_verified`;
                                        matchConfidence = best.score;
                                        console.log(`[OnlineBooking] AUTO-MATCH: "${patientFirstName} ${patientLastName}" → "${best.firstName} ${best.lastName}" (ID: ${best.id}, score: ${best.score})`);
                                    } else if (best.score >= 60) {
                                        // MEDIUM CONFIDENCE — needs admin review
                                        // Do NOT auto-use, save candidates for admin pick
                                        matchMethod = 'needs_review';
                                        matchConfidence = best.score;
                                        console.warn(`[OnlineBooking] NEEDS REVIEW: "${patientFirstName} ${patientLastName}" closest to "${best.firstName} ${best.lastName}" (score: ${best.score}). Admin must verify.`);
                                    } else {
                                        // LOW CONFIDENCE — no match
                                        console.log(`[OnlineBooking] NO MATCH: best candidate "${best.firstName} ${best.lastName}" scored only ${best.score}`);
                                    }
                                }
                            }
                        } else {
                            // Phone search not available — fallback to name search
                            console.log('[OnlineBooking] Phone search not available, trying name search');
                            const nameSearchRes = await fetch(
                                `${prodentisUrl}/api/patients/search?q=${encodeURIComponent(patientLastName)}&limit=10`,
                                {
                                    headers: { 'Content-Type': 'application/json' },
                                    signal: AbortSignal.timeout(5000),
                                }
                            );

                            if (nameSearchRes.ok) {
                                const nameData = await nameSearchRes.json();
                                const candidates = (nameData.patients || [])
                                    .filter((p: any) => {
                                        const candidatePhone = normalizePhone(p.phone || '');
                                        return candidatePhone === normalizedPhone;
                                    })
                                    .map((p: any) => ({
                                        id: p.id || p.prodentisId,
                                        firstName: p.firstName || p.imie || '',
                                        lastName: p.lastName || p.nazwisko || '',
                                        phone: p.phone || '',
                                    }));

                                if (candidates.length > 0) {
                                    const { best, all } = findBestPatientMatch(candidates, patientFirstName, patientLastName);
                                    matchCandidates = all;

                                    if (best && best.score >= 85) {
                                        prodentisPatientId = best.id;
                                        matchMethod = 'phone+name_verified';
                                        matchConfidence = best.score;
                                    } else if (best && best.score >= 60) {
                                        matchMethod = 'needs_review';
                                        matchConfidence = best.score;
                                    }
                                }
                            }
                        }
                    } catch (searchErr) {
                        console.error('[OnlineBooking] Patient search error:', searchErr);
                    }
                }

                // ── Step 2: Create new patient if not found and not needs_review ──
                if (!prodentisPatientId && matchMethod !== 'needs_review' && prodentisKey) {
                    isNewPatient = true;
                    // Use the separate firstName/lastName fields directly (no name.split guessing)
                    const pFirst = patientFirstName;
                    const pLast = patientLastName;

                    try {
                        const createRes = await fetch(`${prodentisUrl}/api/patients`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                            body: JSON.stringify({
                                firstName: pFirst,
                                lastName: pLast,
                                phone: phone,
                                email: email || '',
                            }),
                            signal: AbortSignal.timeout(10000),
                        });

                        const createResult = await createRes.json();

                        if (createRes.status === 201 && createResult.prodentisId) {
                            prodentisPatientId = createResult.prodentisId;
                            matchMethod = 'created';
                            matchConfidence = 100;
                            console.log(`[OnlineBooking] New patient created: ${prodentisPatientId}`);
                        } else if (createResult.error === 'PATIENT_EXISTS' && createResult.prodentisId) {
                            // Phone collision — score the returned patient
                            const returnedFirst = createResult.firstName || '';
                            const returnedLast = createResult.lastName || '';
                            const { score, method: mMethod } = nameMatchScore(pFirst, pLast, returnedFirst, returnedLast);

                            if (score >= 85) {
                                prodentisPatientId = createResult.prodentisId;
                                isNewPatient = false;
                                matchMethod = 'patient_exists_verified';
                                matchConfidence = score;
                                console.log(`[OnlineBooking] PATIENT_EXISTS confirmed: "${returnedFirst} ${returnedLast}" (score: ${score})`);
                            } else {
                                // Different person — flag for review, don't use this ID
                                isNewPatient = true;
                                matchMethod = score >= 60 ? 'needs_review' : 'phone_conflict';
                                matchConfidence = score;
                                matchCandidates = [{
                                    id: createResult.prodentisId,
                                    firstName: returnedFirst,
                                    lastName: returnedLast,
                                    score,
                                    firstNameScore: 0,
                                    lastNameScore: 0,
                                    method: mMethod,
                                }];
                                console.warn(`[OnlineBooking] PHONE CONFLICT: "${returnedFirst} ${returnedLast}" (score: ${score}), booking for "${name}"`);
                            }
                        } else {
                            console.error('[OnlineBooking] Failed to create patient:', createResult);
                        }
                    } catch (createErr) {
                        console.error('[OnlineBooking] Patient create error:', createErr);
                    }
                }

                // ── Step 3: Generate e-karta token for new patients ──
                let intakeTokenId: string | null = null;
                if (isNewPatient || matchMethod === 'needs_review') {
                    try {
                        const nameParts = name.trim().split(/\s+/);
                        const tokenPayload = {
                            prodentisPatientId: prodentisPatientId || undefined,
                            prefillFirstName: nameParts[0] || '',
                            prefillLastName: nameParts.slice(1).join(' ') || '',
                            appointmentDate: date,
                            appointmentType: description || 'Rezerwacja online',
                            createdByEmployee: 'system-auto-booking',
                            expiresInHours: 72,
                        };

                        const { data: tokenData, error: tokenErr } = await supabase
                            .from('patient_intake_tokens')
                            .insert({
                                prodentis_patient_id: tokenPayload.prodentisPatientId || null,
                                prefill_first_name: tokenPayload.prefillFirstName,
                                prefill_last_name: tokenPayload.prefillLastName,
                                appointment_date: tokenPayload.appointmentDate,
                                appointment_type: tokenPayload.appointmentType,
                                created_by_employee: tokenPayload.createdByEmployee,
                                expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
                            })
                            .select('id, token, expires_at')
                            .single();

                        if (!tokenErr && tokenData) {
                            intakeTokenId = tokenData.id;
                            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
                            intakeUrl = `${baseUrl}/ekarta/${tokenData.token}`;
                            console.log(`[OnlineBooking] E-karta token generated: ${intakeUrl}`);
                        } else {
                            console.error('[OnlineBooking] Failed to create intake token:', tokenErr);
                        }
                    } catch (intakeErr) {
                        console.error('[OnlineBooking] Intake token error:', intakeErr);
                    }
                }

                // ── Step 4: Save to online_bookings ──
                const { error: bookingErr } = await supabase.from('online_bookings').insert({
                    reservation_id: reservationId,
                    patient_name: name,
                    patient_phone: normalizedPhone || phone,
                    patient_email: email || null,
                    prodentis_patient_id: prodentisPatientId,
                    is_new_patient: isNewPatient,
                    patient_match_method: matchMethod,
                    match_confidence: matchConfidence,
                    match_candidates: matchCandidates.length > 0 ? matchCandidates : null,
                    specialist_id: specialist,
                    specialist_name: specialistName,
                    doctor_prodentis_id: doctorInfo?.prodentisId || null,
                    appointment_date: date,
                    appointment_time: time,
                    service_type: body.service || null,
                    description: description || null,
                    schedule_status: matchMethod === 'needs_review' ? 'pending' : 'pending',
                    intake_token_id: intakeTokenId,
                    intake_url: intakeUrl,
                });

                if (bookingErr) {
                    console.error('[OnlineBooking] Failed to save online booking:', bookingErr);
                } else {
                    console.log(`[OnlineBooking] Saved. Method: ${matchMethod}, Confidence: ${matchConfidence}, ProdentisID: ${prodentisPatientId}`);
                }
            } catch (bookingEx) {
                // Non-blocking — don't fail the reservation if booking logic fails
                console.error('[OnlineBooking] Exception:', bookingEx);
            }
        }

        return NextResponse.json({
            success: true,
            ...(intakeUrl ? { intakeUrl, isNewPatient: true } : {}),
        });

    } catch (error: any) {
        console.error("Reservation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
