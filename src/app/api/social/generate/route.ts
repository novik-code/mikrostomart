/**
 * POST /api/social/generate
 * 
 * Manually generate an AI social media post draft.
 * Called from admin UI "Generate" button.
 * 
 * Body: { schedule_id?, platform_ids?, content_type, custom_prompt?, with_image? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSocialText, generateSocialImage, uploadImageToStorage } from '@/lib/socialAI';
import type { Platform, ContentType } from '@/lib/socialAI';

export const maxDuration = 120; // image generation can be slow

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            schedule_id,
            platform_ids,
            content_type = 'post_text_image',
            custom_prompt,
            with_image = true,
            auto_publish = false,
        } = body;

        // Resolve platform names and IDs
        let platforms: Platform[] = ['facebook', 'instagram'];
        let resolvedPlatformIds: string[] = platform_ids || [];

        if (platform_ids && platform_ids.length > 0) {
            const { data: platformRecords } = await supabase
                .from('social_platforms')
                .select('id, platform')
                .in('id', platform_ids);
            if (platformRecords && platformRecords.length > 0) {
                platforms = [...new Set(platformRecords.map((p: any) => p.platform as Platform))];
                resolvedPlatformIds = platformRecords.map((p: any) => p.id);
            }
        }

        // If schedule_id provided, load schedule details
        let schedulePrompt = custom_prompt;
        if (schedule_id) {
            const { data: schedule } = await supabase
                .from('social_schedules')
                .select('*')
                .eq('id', schedule_id)
                .single();
            if (schedule) {
                schedulePrompt = schedulePrompt || schedule.ai_prompt;
                if (schedule.platform_ids?.length > 0) {
                    resolvedPlatformIds = schedule.platform_ids;
                    const { data: pRecords } = await supabase
                        .from('social_platforms')
                        .select('id, platform')
                        .in('id', schedule.platform_ids);
                    if (pRecords && pRecords.length > 0) {
                        platforms = [...new Set(pRecords.map((p: any) => p.platform as Platform))];
                    }
                }
            }
        }

        // AUTO-RESOLVE: if still no platform IDs, fetch all active FB+IG platforms
        if (resolvedPlatformIds.length === 0) {
            console.log('[Social Generate] No platform IDs provided — auto-resolving active FB+IG platforms');
            const { data: allPlatforms } = await supabase
                .from('social_platforms')
                .select('id, platform')
                .in('platform', ['facebook', 'instagram'])
                .eq('is_active', true);
            if (allPlatforms && allPlatforms.length > 0) {
                resolvedPlatformIds = allPlatforms.map((p: any) => p.id);
                platforms = [...new Set(allPlatforms.map((p: any) => p.platform as Platform))];
                console.log(`[Social Generate] Auto-resolved ${resolvedPlatformIds.length} platforms:`, platforms);
            } else {
                console.warn('[Social Generate] No active FB/IG platforms found!');
            }
        }

        // 1. Generate text
        console.log('[Social Generate] Generating text...');
        const content = await generateSocialText(
            content_type as ContentType,
            platforms,
            schedulePrompt,
        );

        // 2. Generate image (optional)
        let imageUrl: string | null = null;
        if (with_image && content.imagePrompt && content_type !== 'video_short') {
            console.log('[Social Generate] Generating image...');
            const format = content_type === 'carousel' ? 'square' : 'square';
            const base64 = await generateSocialImage(content.imagePrompt, format);
            imageUrl = await uploadImageToStorage(base64, supabase, 'social_post');
            console.log('[Social Generate] Image uploaded:', imageUrl);
        }

        // 3. Create post in DB (draft or approved for auto-publish)
        const postStatus = auto_publish ? 'approved' : 'draft';
        const { data: post, error: insertError } = await supabase
            .from('social_posts')
            .insert({
                schedule_id: schedule_id || null,
                status: postStatus,
                platform_ids: resolvedPlatformIds,
                content_type,
                text_content: content.text,
                hashtags: content.hashtags,
                image_url: imageUrl,
                ai_model: process.env.SOCIAL_AI_MODEL || 'gpt-4o',
                ai_prompt_used: schedulePrompt || '(auto-generated topic)',
                scheduled_for: auto_publish ? new Date().toISOString() : null,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        console.log(`[Social Generate] Post created (${postStatus}):`, post.id);

        // 4. Auto-publish if requested
        let publishResults = null;
        if (auto_publish) {
            try {
                const { publishPost } = await import('@/lib/socialPublish');
                publishResults = await publishPost(post.id);
                console.log('[Social Generate] Auto-published:', publishResults);
            } catch (pubErr: any) {
                console.error('[Social Generate] Auto-publish error:', pubErr.message);
            }
        }

        return NextResponse.json({
            success: true,
            post,
            generated: {
                text_length: content.text.length,
                hashtags_count: content.hashtags.length,
                has_image: !!imageUrl,
            },
            published: auto_publish,
            publishResults,
        });
    } catch (err: any) {
        console.error('[Social Generate] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
