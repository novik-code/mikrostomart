/**
 * One-time script: Translate existing Polish blog posts to EN, DE, UA
 * 
 * Usage: npx tsx scripts/translate-blog-posts.ts
 * 
 * Requirements:
 *   - OPENAI_API_KEY env var
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TARGET_LOCALES = ['en', 'de', 'ua'] as const;
const LOCALE_LABELS: Record<string, string> = { en: 'English', de: 'German', ua: 'Ukrainian' };

async function translatePost(
    post: { title: string; slug: string; excerpt: string; content: string; tags?: string[] },
    targetLocale: string
) {
    const langName = LOCALE_LABELS[targetLocale];
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are a professional medical translator. Translate the following blog post from Polish to ${langName}.
Keep the same Markdown formatting, HTML tags, and structure.
The blog post is written by a dentist from Opole, Poland — keep the tone personal and warm.
Return ONLY valid JSON with keys: title, slug, excerpt, content, tags.
The slug must be URL-friendly (lowercase, hyphens, no special characters, no diacritics).`
            },
            {
                role: 'user',
                content: JSON.stringify({
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.excerpt,
                    content: post.content,
                    tags: post.tags || []
                })
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
}

async function main() {
    // Get all PL blog posts
    const { data: plPosts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('locale', 'pl')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching posts:', error);
        process.exit(1);
    }

    console.log(`Found ${plPosts?.length || 0} Polish blog posts to translate`);

    for (const post of plPosts || []) {
        console.log(`\n--- Translating: "${post.title}" ---`);

        for (const locale of TARGET_LOCALES) {
            // Check if translation already exists
            const { data: existing } = await supabase
                .from('blog_posts')
                .select('id')
                .eq('group_id', post.group_id)
                .eq('locale', locale)
                .single();

            if (existing) {
                console.log(`  [${locale}] ✅ Already exists, skipping`);
                continue;
            }

            try {
                const translated = await translatePost({
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.excerpt || '',
                    content: post.content,
                    tags: post.tags,
                }, locale);

                const { error: insertErr } = await supabase.from('blog_posts').insert({
                    title: translated.title,
                    slug: translated.slug || `${post.slug}-${locale}`,
                    excerpt: translated.excerpt,
                    content: translated.content,
                    date: post.date,
                    image: post.image,
                    tags: translated.tags || post.tags,
                    is_published: post.is_published,
                    locale,
                    group_id: post.group_id,
                });

                if (insertErr) {
                    console.error(`  [${locale}] ❌ Insert error:`, insertErr.message);
                } else {
                    console.log(`  [${locale}] ✅ Translated`);
                }
            } catch (err: any) {
                console.error(`  [${locale}] ❌ Translation error:`, err.message);
            }
        }
    }

    // Summary
    const { data: counts } = await supabase
        .from('blog_posts')
        .select('locale')
        .order('locale');

    const summary: Record<string, number> = {};
    for (const row of counts || []) {
        summary[row.locale] = (summary[row.locale] || 0) + 1;
    }

    console.log('\n=== Summary ===');
    for (const [locale, count] of Object.entries(summary)) {
        console.log(`  ${locale}: ${count} posts`);
    }
    console.log(`  TOTAL: ${counts?.length || 0} posts`);
}

main().catch(console.error);
