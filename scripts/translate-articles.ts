/**
 * One-time script: Translate existing Polish articles to EN, DE, UA
 * 
 * Usage: npx tsx scripts/translate-articles.ts
 * 
 * Requirements:
 *   - OPENAI_API_KEY env var
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const TRANSLATE_LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'ua', name: 'Ukrainian' },
] as const;

async function main() {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all Polish articles
    const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('locale', 'pl')
        .order('published_date', { ascending: true });

    if (error) {
        console.error('Error fetching articles:', error.message);
        process.exit(1);
    }

    console.log(`Found ${articles.length} Polish articles to translate.\n`);

    for (const article of articles) {
        console.log(`\n--- Translating: "${article.title}" (group: ${article.group_id}) ---`);

        for (const lang of TRANSLATE_LOCALES) {
            // Check if translation already exists
            const { data: existing } = await supabase
                .from('articles')
                .select('id')
                .eq('group_id', article.group_id)
                .eq('locale', lang.code)
                .single();

            if (existing) {
                console.log(`  [${lang.code}] Already exists, skipping.`);
                continue;
            }

            try {
                console.log(`  [${lang.code}] Translating to ${lang.name}...`);

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional medical translator. Translate the following dental article from Polish to ${lang.name}.
Keep the same Markdown formatting (###, *, **).
Keep medical terminology accurate.
Return ONLY a JSON object:
{
    "title": "translated title",
    "slug": "url-friendly-slug-in-${lang.code}",
    "excerpt": "translated excerpt",
    "content": "translated content with same Markdown formatting"
}`
                        },
                        {
                            role: 'user',
                            content: JSON.stringify({
                                title: article.title,
                                slug: article.slug,
                                excerpt: article.excerpt,
                                content: article.content
                            })
                        }
                    ],
                    response_format: { type: 'json_object' }
                });

                const translated = JSON.parse(response.choices[0].message.content || '{}');

                if (!translated.title) {
                    console.error(`  [${lang.code}] Empty translation result, skipping.`);
                    continue;
                }

                const { error: insertError } = await supabase.from('articles').insert({
                    title: translated.title,
                    slug: translated.slug || `${article.slug}-${lang.code}`,
                    excerpt: translated.excerpt || article.excerpt,
                    content: translated.content || article.content,
                    image_url: article.image_url,
                    published_date: article.published_date,
                    locale: lang.code,
                    group_id: article.group_id
                });

                if (insertError) {
                    console.error(`  [${lang.code}] Insert error: ${insertError.message}`);
                } else {
                    console.log(`  [${lang.code}] ✓ Done`);
                }

            } catch (err: any) {
                console.error(`  [${lang.code}] Translation error: ${err.message}`);
            }
        }
    }

    console.log('\n=== Translation complete ===');
}

main().catch(console.error);
