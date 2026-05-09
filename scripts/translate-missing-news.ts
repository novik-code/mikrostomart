/**
 * Utility: AI-translate missing locale columns in Supabase `news` table.
 *
 * Schema: each row in `news` has Polish source columns (title, excerpt, content, slug, date)
 * plus per-locale columns (title_en, excerpt_en, content_en; same for de, ua).
 *
 * This script finds rows where any *_<locale> column is null/empty and fills them via
 * GPT-4o-mini. Idempotent — re-run only translates still-missing fields.
 *
 * Usage:
 *   npx tsx scripts/translate-missing-news.ts
 *
 * Stan na 2026-05-09: wszystkie 14 wierszy ma już tłumaczenia (skrypt to no-op).
 * Zostawiony w repo na wypadek dodania nowych newsów w przyszłości.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const TARGETS: Array<{ code: 'en' | 'de' | 'ua'; name: string }> = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'ua', name: 'Ukrainian (NOT Russian-influenced)' },
];

const FIELDS_TO_TRANSLATE = ['title', 'excerpt', 'content'] as const;
type Field = typeof FIELDS_TO_TRANSLATE[number];

async function translateRow(
    plValues: Record<Field, string>,
    target: typeof TARGETS[number]
): Promise<Record<Field, string>> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const systemPrompt = [
        `You are a professional translator for a dental clinic news/blog (Mikrostomart, Opole, Poland).`,
        `Translate Polish content to ${target.name}.`,
        ``,
        `RULES:`,
        `- Preserve markdown formatting exactly: ### headers, **bold**, * lists, ![alt](url) images.`,
        `- Keep medical/dental terminology accurate.`,
        `- Match tone: warm, professional, premium, trustworthy.`,
        `- For German: use formal "Sie" form.`,
        `- Keep existing newlines and paragraph structure.`,
        ``,
        `Return ONLY a JSON object: {"title": "...", "excerpt": "...", "content": "..."}.`,
        `No explanations, no markdown wrapping.`,
    ].join('\n');

    const userPrompt = `Translate this Polish article to ${target.name}:\n\n` +
        JSON.stringify({
            title: plValues.title,
            excerpt: plValues.excerpt,
            content: plValues.content,
        }, null, 2);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
        }),
    });

    if (!res.ok) {
        throw new Error(`OpenAI error: ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
    const json = await res.json() as any;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in OpenAI response');
    return JSON.parse(content);
}

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase.from('news').select('*');
    if (error) {
        console.error('DB error:', error);
        process.exit(1);
    }
    if (!data) {
        console.log('No rows.');
        return;
    }

    console.log(`📊 ${data.length} news rows in DB\n`);
    let totalUpdated = 0;

    for (const row of data) {
        for (const target of TARGETS) {
            // Determine which fields are missing for this row+locale
            const missingFields = FIELDS_TO_TRANSLATE.filter(
                (f) => !row[`${f}_${target.code}`]
            );
            if (missingFields.length === 0) continue;

            console.log(`🌐 [${target.code}] ${row.slug}: missing ${missingFields.join(', ')}`);

            try {
                const plValues = {
                    title: row.title || '',
                    excerpt: row.excerpt || '',
                    content: row.content || '',
                };
                const translated = await translateRow(plValues, target);

                // Build update only with originally-missing fields (idempotent)
                const update: Record<string, string> = {};
                for (const f of missingFields) {
                    if (translated[f]) update[`${f}_${target.code}`] = translated[f];
                }

                const { error: updErr } = await supabase
                    .from('news')
                    .update(update)
                    .eq('id', row.id);

                if (updErr) {
                    console.error(`   ✗ DB update failed: ${updErr.message}`);
                } else {
                    console.log(`   ✓ wrote ${Object.keys(update).length} fields`);
                    totalUpdated += Object.keys(update).length;
                }
            } catch (err: any) {
                console.error(`   ✗ ${err.message}`);
            }
        }
    }

    console.log(`\n✨ Done. Updated ${totalUpdated} columns total.`);
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
