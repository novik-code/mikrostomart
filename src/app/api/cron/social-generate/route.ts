/**
 * Cron: Social Media Draft Generator
 * 
 * Runs daily (4:00 UTC). Checks active schedules that should generate today,
 * creates AI-powered draft posts for admin approval.
 * 
 * Schedule: "0 4 * * *" (every day at 4:00 AM UTC = 5:00 CET / 6:00 CEST)
 * Auth: CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSocialText, generateSocialImage, uploadImageToStorage } from '@/lib/socialAI';
import type { Platform, ContentType } from '@/lib/socialAI';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    // Auth
    const { searchParams } = new URL(req.url);
    const isManual = searchParams.get('manual') === 'true';
    if (!isManual) {
        const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const startTime = Date.now();
    console.log('[Social Generate Cron] Started');

    try {
        // 1. Fetch active schedules
        const { data: schedules, error: schErr } = await supabase
            .from('social_schedules')
            .select('*')
            .eq('is_active', true);

        if (schErr) throw schErr;
        if (!schedules || schedules.length === 0) {
            console.log('[Social Generate Cron] No active schedules');
            return NextResponse.json({ message: 'No active schedules', generated: 0 });
        }

        const now = new Date();
        const dayOfWeek = now.getDay() || 7; // 1=Mon, 7=Sun

        // 2. Filter schedules that should generate today
        const todaySchedules = schedules.filter((s: any) => {
            // Check day of week
            if (s.preferred_days && !s.preferred_days.includes(dayOfWeek)) return false;

            // Check frequency — for daily, always generate; for weekly, check if it's been 7+ days
            if (s.frequency === 'weekly' && s.last_generated_at) {
                const lastGen = new Date(s.last_generated_at);
                const daysSinceLastGen = (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceLastGen < 6.5) return false; // Less than ~7 days
            }

            return true;
        });

        console.log(`[Social Generate Cron] ${todaySchedules.length}/${schedules.length} schedules to generate for today`);

        if (todaySchedules.length === 0) {
            return NextResponse.json({ message: 'No schedules due today', generated: 0 });
        }

        // 3. Process each schedule
        let generated = 0;
        const results: { schedule: string; status: string; postId?: string; error?: string }[] = [];

        for (const schedule of todaySchedules) {
            const elapsed = Date.now() - startTime;
            if (elapsed > 100_000) { // 100s safety margin
                console.log('[Social Generate Cron] Time budget exceeded, deferring remaining');
                break;
            }

            try {
                // Resolve platform names
                let platforms: Platform[] = ['facebook'];
                if (schedule.platform_ids?.length > 0) {
                    const { data: pRecords } = await supabase
                        .from('social_platforms')
                        .select('platform')
                        .in('id', schedule.platform_ids);
                    if (pRecords && pRecords.length > 0) {
                        platforms = [...new Set(pRecords.map((p: any) => p.platform as Platform))];
                    }
                }

                // Generate text
                const content = await generateSocialText(
                    schedule.content_type as ContentType,
                    platforms,
                    schedule.ai_prompt,
                );

                // Generate image for post types
                let imageUrl: string | null = null;
                if (schedule.content_type === 'post_text_image' && content.imagePrompt) {
                    try {
                        const base64 = await generateSocialImage(content.imagePrompt, 'square');
                        imageUrl = await uploadImageToStorage(base64, supabase, 'cron_social');
                    } catch (imgErr: any) {
                        console.error(`[Social Generate Cron] Image generation failed for "${schedule.name}":`, imgErr.message);
                        // Continue without image
                    }
                }

                // Calculate scheduled_for based on preferred_hour
                const scheduledFor = new Date();
                scheduledFor.setHours(schedule.preferred_hour || 10, 0, 0, 0);
                if (scheduledFor < now) {
                    // If preferred hour already passed, schedule for tomorrow
                    scheduledFor.setDate(scheduledFor.getDate() + 1);
                }

                // Create post
                const status = schedule.auto_publish ? 'approved' : 'draft';
                const { data: post, error: postErr } = await supabase
                    .from('social_posts')
                    .insert({
                        schedule_id: schedule.id,
                        status,
                        platform_ids: schedule.platform_ids,
                        content_type: schedule.content_type,
                        text_content: content.text,
                        hashtags: content.hashtags,
                        image_url: imageUrl,
                        ai_model: process.env.SOCIAL_AI_MODEL || 'gpt-4o',
                        ai_prompt_used: schedule.ai_prompt || '(auto topic)',
                        scheduled_for: scheduledFor.toISOString(),
                    })
                    .select()
                    .single();

                if (postErr) throw postErr;

                // Update last_generated_at
                await supabase
                    .from('social_schedules')
                    .update({ last_generated_at: now.toISOString() })
                    .eq('id', schedule.id);

                generated++;
                results.push({ schedule: schedule.name, status: 'ok', postId: post.id });
                console.log(`[Social Generate Cron] Generated "${schedule.name}" → ${status}`);
            } catch (err: any) {
                console.error(`[Social Generate Cron] Error for "${schedule.name}":`, err.message);
                results.push({ schedule: schedule.name, status: 'error', error: err.message });
            }
        }

        // 3.5 Auto-replenish topics if running low (perpetuum mobile)
        let topicsReplenished = 0;
        try {
            const { data: unusedTopics } = await supabase
                .from('social_topics')
                .select('id', { count: 'exact' })
                .eq('is_active', true)
                .eq('used_count', 0);

            const unusedCount = unusedTopics?.length || 0;
            console.log(`[Social Generate Cron] Unused topics: ${unusedCount}`);

            if (unusedCount < 5) {
                console.log('[Social Generate Cron] Topics running low — auto-generating 15 new topics...');

                const { data: existing } = await supabase
                    .from('social_topics')
                    .select('topic');
                const existingTopics = (existing || []).map((t: any) => t.topic);

                const OpenAI = (await import('openai')).default;
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [{
                        role: 'system',
                        content: `Jesteś redaktorem bloga stomatologicznego kliniki Mikrostomart w Opolu.
Wygeneruj 15 UNIKALNYCH tematów na posty w social media.
Tematy powinny obejmować różne aspekty stomatologii.

Tematy powinny być:
- Chwytliwe i angażujące
- Edukacyjne ale przystępne
- Z perspektywy pacjenta
- Mieszanka: porady, mity vs fakty, nowości, case studies

NIE powtarzaj tych tematów:
${existingTopics.join('\n')}

Odpowiedz WYŁĄCZNIE w JSON:
{
    "topics": [
        { "topic": "Tytuł tematu", "category": "kategoria" }
    ]
}

Kategorie: ogólne, implantologia, estetyka, higiena, endodoncja, protetyka, ortodoncja, chirurgia, laser, dzieci`
                    }],
                    response_format: { type: 'json_object' },
                    temperature: 0.9,
                });

                const result = JSON.parse(completion.choices[0].message.content || '{}');
                const newTopics = result.topics || [];

                if (newTopics.length > 0) {
                    const insertData = newTopics.map((t: any) => ({
                        topic: t.topic,
                        category: t.category || 'ogólne',
                        created_by: 'ai',
                    }));
                    const { data: inserted } = await supabase
                        .from('social_topics')
                        .insert(insertData)
                        .select();
                    topicsReplenished = inserted?.length || 0;
                    console.log(`[Social Generate Cron] Auto-generated ${topicsReplenished} new topics`);
                }
            }
        } catch (topicErr: any) {
            console.error('[Social Generate Cron] Topic replenish error:', topicErr.message);
        }
        // 4. Notify via Telegram
        if (generated > 0 || topicsReplenished > 0) {
            try {
                const { sendTelegramNotification } = await import('@/lib/telegram');
                let msg = `📱 Social Media AI: ${generated} nowych draftów`;
                if (topicsReplenished > 0) msg += `\n🔄 Auto-uzupełniono ${topicsReplenished} nowych tematów`;
                msg += `\n\n${results.filter(r => r.status === 'ok').map(r => `• ${r.schedule}`).join('\n')}\n\n👉 Otwórz panel admina → Social Media → Drafty`;
                await sendTelegramNotification(msg, 'default');
            } catch { /* Telegram optional */ }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[Social Generate Cron] Done in ${elapsed}ms — ${generated} generated`);

        return NextResponse.json({
            message: `Generated ${generated} draft(s)${topicsReplenished > 0 ? `, replenished ${topicsReplenished} topics` : ''}`,
            generated,
            topicsReplenished,
            results,
            elapsed: `${elapsed}ms`,
        });
    } catch (err: any) {
        console.error('[Social Generate Cron] Fatal error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
