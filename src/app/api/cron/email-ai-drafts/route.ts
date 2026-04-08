/**
 * Cron: AI Email Draft Generator
 * 
 * Analyzes new emails in INBOX, identifies important patient correspondence,
 * and generates draft replies using GPT-4o-mini with clinic knowledge base.
 * 
 * Schedule: 3×/day (8:30, 12:30, 16:30 UTC)
 * Auth: CRON_SECRET or ?manual=true
 */

import { isDemoMode } from '@/lib/demoMode';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listEmails, getEmail } from '@/lib/imapService';
import { buildContextPrompt } from '@/lib/unifiedAI';
import { sendTelegramNotification } from '@/lib/telegram';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { demoSanitize, brand } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_CANDIDATES_PER_RUN = 5; // Process at most 5 emails per invocation
const TIME_BUDGET_MS = 90_000; // Bail out after 90s to avoid Vercel timeout

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Email classification (mirror of frontend classifyEmail) ─────

type EmailLabel = 'powiadomienia' | 'strona' | 'chat' | 'pozostale';

function classifyEmailServer(email: { from: { address: string; name: string }; subject: string }): EmailLabel {
    const addr = email.from.address.toLowerCase();
    const name = email.from.name.toLowerCase();
    const subj = email.subject.toLowerCase();

    const isAppSender = addr.includes(brand.senderEmail.split('@')[1])
        || addr.includes('noreply@')
        || name.includes(brand.smsSenderName.toLowerCase())
        || name.includes('strefa pacjenta');

    if (isAppSender) {
        if (subj.includes('czat') || subj.includes('chat') || subj.includes('odpowied') || subj.includes('wiadomoś') || subj.includes('wiadomosc') || subj.includes('💬')) {
            return 'chat';
        }
        if (subj.includes('formularz') || subj.includes('kontakt') || subj.includes('zapytanie')
            || subj.includes('zamówieni') || subj.includes('zamowieni')
            || subj.includes('lead') || subj.includes('leczeni')
            || subj.includes('rezerwacj')
            || subj.includes('order') || subj.includes('reservation')) {
            return 'strona';
        }
        return 'powiadomienia';
    }

    if (subj.includes('formularz kontakt') || subj.includes('nowe zapytanie') || subj.includes('nowy lead')) {
        return 'strona';
    }

    if (addr.includes('mailer-daemon') || addr.includes('postmaster') || subj.includes('delivery') || subj.includes('undeliverable') || subj.includes('bounce')) {
        return 'powiadomienia';
    }

    if (subj.includes('cron') || subj.includes('raport') || subj.includes('report') || subj.includes('sms') || subj.includes('[system]')) {
        return 'powiadomienia';
    }

    return 'pozostale';
}

// ─── Main handler ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    // Demo mode: skip cron jobs
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    const { searchParams } = new URL(req.url);
    const isManual = searchParams.get('manual') === 'true';

    if (!isManual) {
        const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const startTime = Date.now();
    console.log('[Email AI Drafts] Cron started');

    try {
        // 1. Fetch inbox emails from the last 30 days (paginated)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const PAGE_SIZE = 50;
        let page = 1;
        let inboxEmails: Awaited<ReturnType<typeof listEmails>>['emails'] = [];
        let reachedOldEmails = false;

        while (!reachedOldEmails) {
            const { emails: batch, total } = await listEmails('INBOX', page, PAGE_SIZE);

            if (batch.length === 0) break;

            for (const email of batch) {
                const emailDate = new Date(email.date);
                if (emailDate < thirtyDaysAgo) {
                    reachedOldEmails = true;
                    break;
                }
                inboxEmails.push(email);
            }

            // If we got fewer than PAGE_SIZE, there are no more pages
            if (batch.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
            page++;
        }

        console.log(`[Email AI Drafts] Fetched ${inboxEmails.length} inbox emails from last 30 days (${page} pages)`);

        // 2. Get already-processed UIDs from DB
        const { data: existingDrafts } = await supabase
            .from('email_ai_drafts')
            .select('email_uid');

        const processedUids = new Set(
            (existingDrafts || []).map((d: { email_uid: number }) => d.email_uid)
        );

        // 2b. Load AI training config from DB (resilient — works even if tables missing)
        let senderRules: any[] = [];
        let activeInstructions: any[] = [];
        let recentFeedback: any[] = [];
        let effectiveKnowledgeBase = '';

        try {
            const { data } = await supabase.from('email_ai_sender_rules').select('*');
            senderRules = data || [];
        } catch { /* table may not exist */ }

        try {
            const { data } = await supabase.from('email_ai_instructions').select('*').eq('is_active', true);
            activeInstructions = data || [];
        } catch { /* table may not exist */ }

        try {
            const { data } = await supabase.from('email_ai_feedback').select('original_draft_html, corrected_draft_html, ai_analysis, feedback_note').order('created_at', { ascending: false }).limit(10);
            recentFeedback = data || [];
        } catch { /* table may not exist */ }

        try {
            effectiveKnowledgeBase = await buildContextPrompt('email_draft');
        } catch {
            console.warn('[Email AI Drafts] Could not load KB from unifiedAI');
        }

        // Load uploaded knowledge files (PDFs, TXTs)
        let knowledgeFilesContext = '';
        try {
            const { data: kFiles } = await supabase
                .from('email_ai_knowledge_files')
                .select('filename, content_text, description')
                .order('created_at', { ascending: false })
                .limit(10);
            if (kFiles && kFiles.length > 0) {
                knowledgeFilesContext = '\n\n## DODATKOWE MATERIAŁY WIEDZY (WGRANE PLIKI)\n' +
                    kFiles.map((f: any) =>
                        `### Plik: ${f.filename}${f.description ? ` — ${f.description}` : ''}\n${f.content_text.substring(0, 5000)}`
                    ).join('\n\n');
            }
        } catch { /* table may not exist yet */ }

        // Helper: check if email matches a sender rule pattern
        function matchesSenderPattern(emailAddr: string, pattern: string): boolean {
            const addr = emailAddr.toLowerCase();
            const pat = pattern.toLowerCase();
            if (pat.startsWith('*@')) {
                // Domain wildcard: *@gmail.com matches anything@gmail.com
                return addr.endsWith(pat.slice(1));
            }
            if (pat.includes('*')) {
                // Generic glob: convert to regex
                const regex = new RegExp('^' + pat.replace(/\*/g, '.*') + '$');
                return regex.test(addr);
            }
            return addr === pat;
        }

        // Separate include and exclude rules
        const includeRules = senderRules.filter((r: any) => r.rule_type === 'include');
        const excludeRules = senderRules.filter((r: any) => r.rule_type === 'exclude');

        console.log(`[Email AI Drafts] Training config: ${senderRules.length} sender rules, ${activeInstructions.length} instructions, ${recentFeedback.length} feedback entries`);

        // 3. Filter: only "pozostale" + not yet processed + respect sender rules
        const candidates = inboxEmails.filter(email => {
            if (processedUids.has(email.uid)) return false;
            if (classifyEmailServer(email) !== 'pozostale') return false;

            const addr = email.from.address.toLowerCase();

            // If there are include rules, email MUST match at least one
            if (includeRules.length > 0) {
                const matchesInclude = includeRules.some((r: any) => matchesSenderPattern(addr, r.email_pattern));
                if (!matchesInclude) return false;
            }

            // If email matches any exclude rule, skip it
            const matchesExclude = excludeRules.some((r: any) => matchesSenderPattern(addr, r.email_pattern));
            if (matchesExclude) return false;

            return true;
        });

        console.log(`[Email AI Drafts] ${candidates.length} new unprocessed candidates after sender rules`);

        // Limit candidates per run to avoid timeout
        const candidatesToProcess = candidates.slice(0, MAX_CANDIDATES_PER_RUN);
        const skippedForNextRun = candidates.length - candidatesToProcess.length;
        if (skippedForNextRun > 0) {
            console.log(`[Email AI Drafts] Processing ${candidatesToProcess.length}, deferring ${skippedForNextRun} to next run`);
        }

        // ─── Debug mode: return classification details ────
        const isDebug = searchParams.get('debug') === 'true';
        if (isDebug) {
            const debugDetails = inboxEmails.slice(0, 20).map(email => {
                const label = classifyEmailServer(email);
                const isProcessed = processedUids.has(email.uid);
                const addr = email.from.address.toLowerCase();
                let includeMatch = 'N/A (no include rules)';
                if (includeRules.length > 0) {
                    const match = includeRules.find((r: any) => matchesSenderPattern(addr, r.email_pattern));
                    includeMatch = match ? `✅ matches "${match.email_pattern}"` : '❌ no match';
                }
                const excludeMatch = excludeRules.find((r: any) => matchesSenderPattern(addr, r.email_pattern));
                // Check include rules
                let passesInclude = true;
                if (includeRules.length > 0) {
                    passesInclude = includeRules.some((r: any) => matchesSenderPattern(addr, r.email_pattern));
                }
                return {
                    uid: email.uid,
                    from: email.from.address,
                    subject: email.subject.substring(0, 60),
                    date: email.date,
                    label,
                    isProcessed,
                    includeRuleResult: includeMatch,
                    excludeRuleResult: excludeMatch ? `❌ excluded by "${excludeMatch.email_pattern}"` : '✅ not excluded',
                    wouldProcess: label === 'pozostale' && !isProcessed && !excludeMatch && passesInclude,
                };
            });

            return NextResponse.json({
                debug: true,
                totalInboxEmails: inboxEmails.length,
                processedUidsCount: processedUids.size,
                candidatesCount: candidates.length,
                senderRules: { include: includeRules.length, exclude: excludeRules.length },
                trainingConfig: {
                    instructions: activeInstructions.length,
                    feedbackEntries: recentFeedback.length,
                },
                emailClassification: debugDetails,
            });
        }

        if (candidatesToProcess.length === 0) {
            await logCronHeartbeat('email-ai-drafts', 'ok', `No new candidates${skippedForNextRun > 0 ? ` (${skippedForNextRun} deferred)` : ''}`);
            return NextResponse.json({ message: 'No new emails to process', draftsCreated: 0 });
        }

        // 4. Fetch sent emails for style analysis (try "Sent" then "INBOX.Sent")
        let sentEmailTexts: string[] = [];
        try {
            let sentResult = await listEmails('Sent', 1, 10);
            if (sentResult.emails.length === 0) {
                sentResult = await listEmails('INBOX.Sent', 1, 10);
            }

            // Get full text of sent emails (limit to 5 for token budget)
            const sentToFetch = sentResult.emails.slice(0, 5);
            for (const sentEmail of sentToFetch) {
                try {
                    const full = await getEmail(sentEmail.uid, sentEmail.uid ? 'Sent' : 'INBOX.Sent', false);
                    if (full?.text) {
                        sentEmailTexts.push(
                            `--- Wysłany mail ---\nDo: ${full.to.map(t => t.address).join(', ')}\nTemat: ${full.subject}\nTreść:\n${full.text.substring(0, 500)}\n`
                        );
                    }
                } catch { /* skip individual failures */ }
            }
        } catch (e) {
            console.log('[Email AI Drafts] Could not fetch sent emails for style analysis:', e);
        }

        const styleContext = sentEmailTexts.length > 0
            ? `\n\n## STYL WCZEŚNIEJSZYCH ODPOWIEDZI KLINIKI\nPoniżej znajdują się przykłady wcześniejszych odpowiedzi wysłanych przez pracowników kliniki. Naśladuj ich styl, ton i sposób zwracania się do pacjentów:\n\n${sentEmailTexts.join('\n')}`
            : '';

        // Build training context from admin instructions
        const instructionsContext = activeInstructions.length > 0
            ? `\n\n## INSTRUKCJE OD ADMINA (OBOWIĄZKOWE)\nPoniższe instrukcje zostały dodane przez administratora kliniki. MUSISZ ich bezwzględnie przestrzegać:\n\n${activeInstructions.map((i: any, idx: number) => `${idx + 1}. [${(i.category || 'other').toUpperCase()}] ${i.instruction}`).join('\n')}`
            : '';

        // Build learning context from recent corrections
        const feedbackContext = recentFeedback.length > 0
            ? `\n\n## WNIOSKI Z POPRZEDNICH POPRAWEK\nPoniżej znajdują się wnioski z wcześniejszych poprawek dokonanych przez admina na Twoich draftach. Ucz się z nich i unikaj tych samych błędów:\n\n${recentFeedback.map((f: any, idx: number) => {
                let entry = `${idx + 1}. `;
                if (f.ai_analysis) entry += f.ai_analysis;
                if (f.feedback_note) entry += ` (Uwaga admina: ${f.feedback_note})`;
                return entry;
            }).join('\n')}`
            : '';

        // Fetch available appointment slots from Prodentis (for next 7 days)
        let appointmentSlotsContext = '';
        try {
            const PRODENTIS_API_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
            const slotsByDay: string[] = [];
            for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
                const d = new Date();
                d.setDate(d.getDate() + dayOffset);
                const dateStr = d.toISOString().split('T')[0];
                try {
                    const slotsRes = await fetch(`${PRODENTIS_API_URL}/api/slots/free?date=${dateStr}&duration=30`, {
                        signal: AbortSignal.timeout(3000),
                    });
                    if (slotsRes.ok) {
                        const slotsData = await slotsRes.json();
                        if (slotsData.slots && slotsData.slots.length > 0) {
                            const dayName = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                            const doctorSlots = slotsData.slots.reduce((acc: Record<string, string[]>, slot: any) => {
                                const doc = slot.doctorName || 'Nieprzypisany';
                                if (!acc[doc]) acc[doc] = [];
                                acc[doc].push(slot.time || slot.startTime);
                                return acc;
                            }, {} as Record<string, string[]>);
                            const summary = Object.entries(doctorSlots).map(([doc, times]) =>
                                `  - ${doc}: ${(times as string[]).slice(0, 5).join(', ')}${(times as string[]).length > 5 ? ` (+${(times as string[]).length - 5} więcej)` : ''}`
                            ).join('\n');
                            slotsByDay.push(`${dayName}:\n${summary}`);
                        }
                    }
                } catch { /* individual day fetch failed — skip */ }
            }
            if (slotsByDay.length > 0) {
                appointmentSlotsContext = '\n\n## WOLNE TERMINY WIZYT (NAJBLI\u017bSZE 7 DNI)\nPoni\u017cej aktualne wolne terminy. Podawaj je pacjentom gdy pytaj\u0105 o um\u00f3wienie wizyty:\n\n' +
                    slotsByDay.join('\n');
            }
        } catch (slotsErr) {
            console.log('[Email AI Drafts] Could not fetch Prodentis slots:', slotsErr);
        }

        // 5. Process each candidate with GPT-4o-mini
        let draftsCreated = 0;
        let emailsSkipped = 0;
        const newDraftSubjects: string[] = [];
        const processedDetails: { uid: number; from: string; subject: string; result: string; reasoning?: string }[] = [];

        for (const candidate of candidatesToProcess) {
            // Check time budget before processing each candidate
            const elapsed = Date.now() - startTime;
            if (elapsed > TIME_BUDGET_MS) {
                console.log(`[Email AI Drafts] Time budget exceeded (${elapsed}ms), stopping. Remaining candidates deferred.`);
                break;
            }

            try {
                // Get full email content
                const fullEmail = await getEmail(candidate.uid, 'INBOX', false);
                if (!fullEmail) {
                    processedDetails.push({ uid: candidate.uid, from: candidate.from.address, subject: candidate.subject, result: 'error', reasoning: 'Nie udało się pobrać pełnej treści emaila' });
                    continue;
                }

                const emailContent = fullEmail.text || fullEmail.html?.replace(/<[^>]*>/g, '') || '';
                if (emailContent.trim().length < 10) {
                    processedDetails.push({ uid: candidate.uid, from: candidate.from.address, subject: candidate.subject, result: 'skipped', reasoning: 'Email prawie pusty (< 10 znaków)' });
                    continue;
                }

                // Ask AI to classify + draft
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        temperature: 0.3,
                        max_tokens: 2000,
                        messages: [
                            {
                                role: 'system',
                                content: `Jesteś asystentem recepcji gabinetu stomatologicznego ${brand.smsSenderName} w ${brand.cityShort}.

TWOJE ZADANIE:
1. Przeanalizuj poniższy email i oceń czy jest to WAŻNA wiadomość operacyjna (zapytanie pacjenta o leczenie, o ceny, o umówienie wizyty, reklamacja, roszczenie, korespondencja z pacjentem) czy NIEWAŻNA (reklama, spam, oferta firmy, newsletter, mailing marketingowy, powiadomienia systemowe, faktury od dostawców).

2. Jeśli wiadomość jest WAŻNA — przygotuj DRAFT odpowiedzi po polsku w imieniu recepcji kliniki ${brand.smsSenderName}. Odpowiedź powinna być:
   - Profesjonalna ale ciepła
   - Zawierać KONKRETNE ceny z cennika kliniki gdy pacjent pyta o koszty (dodaj "ceny orientacyjne, ostateczna wycena po konsultacji")
   - Gdy pacjent pyta o termin wizyty — sprawdź WOLNE TERMINY poniżej i zaproponuj konkretne daty
   - Zakończona zachętą do kontaktu telefonicznego (${brand.phone1}) lub rezerwacji online (/rezerwacja)
   - W formacie HTML (proste <p>, <br>, <strong> — bez stylów inline)

3. Jeśli wiadomość jest NIEWAŻNA — odpowiedz "SKIP".

BAZA WIEDZY KLINIKI:
${effectiveKnowledgeBase}${knowledgeFilesContext}${appointmentSlotsContext}
${styleContext}${instructionsContext}${feedbackContext}

ODPOWIEDZ W FORMACIE JSON:
{
  "is_important": true/false,
  "reasoning": "krótkie wyjaśnienie dlaczego mail jest ważny/nieważny (1-2 zdania)",
  "draft_subject": "Re: [oryginalny temat]",
  "draft_html": "<p>Treść odpowiedzi...</p>"
}

Jeśli mail jest NIEWAŻNY, odpowiedz:
{
  "is_important": false,
  "reasoning": "powód pominięcia"
}`
                            },
                            {
                                role: 'user',
                                content: `Od: ${fullEmail.from.name} <${fullEmail.from.address}>
Temat: ${fullEmail.subject}
Data: ${fullEmail.date}

Treść:
${emailContent.substring(0, 3000)}`
                            }
                        ],
                    }),
                });

                if (!aiResponse.ok) {
                    console.error(`[Email AI Drafts] OpenAI error for UID ${candidate.uid}:`, await aiResponse.text());
                    continue;
                }

                const aiData = await aiResponse.json();
                const content = aiData.choices?.[0]?.message?.content || '';

                // Parse JSON response
                let parsed: {
                    is_important: boolean;
                    reasoning: string;
                    draft_subject?: string;
                    draft_html?: string;
                };

                try {
                    // Extract JSON from potential markdown code blocks
                    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
                    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
                    parsed = JSON.parse(jsonStr.trim());
                } catch {
                    console.error(`[Email AI Drafts] Failed to parse AI response for UID ${candidate.uid}:`, content.substring(0, 200));
                    continue;
                }

                if (parsed.is_important && parsed.draft_html) {
                    // Save draft to DB
                    const { error: insertError } = await supabase
                        .from('email_ai_drafts')
                        .insert({
                            email_uid: candidate.uid,
                            email_folder: 'INBOX',
                            email_subject: fullEmail.subject,
                            email_from_address: fullEmail.from.address,
                            email_from_name: fullEmail.from.name,
                            email_date: fullEmail.date,
                            email_snippet: emailContent.substring(0, 200),
                            draft_subject: parsed.draft_subject || `Re: ${fullEmail.subject}`,
                            draft_html: parsed.draft_html,
                            ai_reasoning: parsed.reasoning,
                            status: 'pending',
                        });

                    if (insertError) {
                        console.error(`[Email AI Drafts] DB insert error for UID ${candidate.uid}:`, insertError);
                        processedDetails.push({ uid: candidate.uid, from: fullEmail.from.address, subject: fullEmail.subject, result: 'error', reasoning: `Błąd zapisu: ${insertError.message}` });
                    } else {
                        draftsCreated++;
                        newDraftSubjects.push(fullEmail.subject);
                        console.log(`[Email AI Drafts] Created draft for: "${fullEmail.subject}" from ${fullEmail.from.address}`);
                        processedDetails.push({ uid: candidate.uid, from: fullEmail.from.address, subject: fullEmail.subject, result: 'drafted', reasoning: parsed.reasoning });
                    }
                } else {
                    // Record as skipped so we don't re-analyze next time
                    const { error: skipError } = await supabase
                        .from('email_ai_drafts')
                        .insert({
                            email_uid: candidate.uid,
                            email_folder: 'INBOX',
                            email_subject: fullEmail.subject,
                            email_from_address: fullEmail.from.address,
                            email_from_name: fullEmail.from.name,
                            email_date: fullEmail.date,
                            email_snippet: emailContent.substring(0, 200),
                            ai_reasoning: parsed.reasoning,
                            status: 'skipped',
                        });
                    if (!skipError) {
                        emailsSkipped++;
                    }
                    console.log(`[Email AI Drafts] Skipped (not important): "${fullEmail.subject}" — ${parsed.reasoning}`);
                    processedDetails.push({ uid: candidate.uid, from: fullEmail.from.address, subject: fullEmail.subject, result: 'skipped', reasoning: parsed.reasoning });
                }
            } catch (err: any) {
                console.error(`[Email AI Drafts] Error processing UID ${candidate.uid}:`, err);
                processedDetails.push({ uid: candidate.uid, from: candidate.from.address, subject: candidate.subject, result: 'error', reasoning: err.message || 'Unknown error' });
            }
        }

        // 6. Send notifications if drafts were created
        if (draftsCreated > 0) {
            const telegramMsg = `📧 AI Email Drafts: ${draftsCreated} nowych\n\n${newDraftSubjects.map(s => `• ${s}`).join('\n')}\n\n👉 Otwórz klienta email aby przejrzeć i zatwierdzić drafty.`;

            await sendTelegramNotification(telegramMsg, 'default');

            // Push notification to admins
            try {
                const { broadcastPush } = await import('@/lib/webpush');
                await broadcastPush('employee', 'task_new', {
                    title: `📧 Drafty AI: ${draftsCreated} nowych`,
                    body: newDraftSubjects.slice(0, 3).join(', '),
                }, '/pracownik?tab=email');
            } catch (pushErr) {
                console.error('[Email AI Drafts] Push error:', pushErr);
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[Email AI Drafts] Done in ${elapsed}ms — ${draftsCreated} drafts, ${emailsSkipped} skipped from ${candidatesToProcess.length} candidates`);

        await logCronHeartbeat('email-ai-drafts', 'ok', `${draftsCreated} drafts, ${emailsSkipped} skipped from ${candidatesToProcess.length} candidates in ${elapsed}ms`);

        return NextResponse.json({
            message: `Przetworzono ${candidatesToProcess.length} emaili, ${draftsCreated} draftów, ${emailsSkipped} pominiętych`,
            draftsCreated,
            emailsSkipped,
            candidatesProcessed: candidatesToProcess.length,
            candidatesDeferred: skippedForNextRun,
            processedDetails,
            elapsed: `${elapsed}ms`,
        });
    } catch (err: any) {
        console.error('[Email AI Drafts] Cron error:', err);
        await logCronHeartbeat('email-ai-drafts', 'error', err.message);
        return NextResponse.json({ error: err.message || 'Cron error' }, { status: 500 });
    }
}
