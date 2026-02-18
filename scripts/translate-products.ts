/**
 * One-time script to translate existing product names/descriptions/categories
 * from Polish to EN, DE, UA using GPT-4o.
 * 
 * Usage:
 *   npx tsx scripts/translate-products.ts
 * 
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const TARGET_LOCALES = ['en', 'de', 'ua'] as const;
const LOCALE_LABELS: Record<string, string> = { en: 'English', de: 'German', ua: 'Ukrainian' };

async function translateProductFields(
    name: string,
    description: string,
    category: string,
    locale: string
): Promise<{ name: string; description: string; category: string }> {
    const langName = LOCALE_LABELS[locale];

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are a professional translator for a medical/dental products e-commerce store. Translate the following product information from Polish to ${langName}. Return ONLY valid JSON with keys: name, description, category.`
            },
            {
                role: 'user',
                content: JSON.stringify({ name, description, category })
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1024,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
}

async function main() {
    console.log('🔄 Fetching products from Supabase...');

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Error fetching products:', error);
        process.exit(1);
    }

    console.log(`📦 Found ${products.length} products`);

    let translated = 0;
    let skipped = 0;

    for (const product of products) {
        // Skip if already has translations
        const existing = product.name_translations || {};
        if (existing.en && existing.de && existing.ua) {
            console.log(`  ⏩ "${product.name}" — already translated, skipping`);
            skipped++;
            continue;
        }

        console.log(`\n🔄 Translating: "${product.name}"`);

        const nameTranslations: Record<string, string> = { ...existing };
        const descTranslations: Record<string, string> = { ...(product.description_translations || {}) };
        const catTranslations: Record<string, string> = { ...(product.category_translations || {}) };

        for (const locale of TARGET_LOCALES) {
            if (nameTranslations[locale]) {
                console.log(`    ⏩ ${locale} already exists`);
                continue;
            }

            try {
                const result = await translateProductFields(
                    product.name,
                    product.description || '',
                    product.category || '',
                    locale
                );

                nameTranslations[locale] = result.name;
                descTranslations[locale] = result.description;
                catTranslations[locale] = result.category;

                console.log(`    ✅ ${LOCALE_LABELS[locale]}: "${result.name}"`);
            } catch (err) {
                console.error(`    ❌ ${LOCALE_LABELS[locale]} failed:`, err);
            }
        }

        // Update product in DB
        const { error: updateError } = await supabase
            .from('products')
            .update({
                name_translations: nameTranslations,
                description_translations: descTranslations,
                category_translations: catTranslations,
            })
            .eq('id', product.id);

        if (updateError) {
            console.error(`  ❌ DB update failed for "${product.name}":`, updateError);
        } else {
            console.log(`  💾 Saved translations for "${product.name}"`);
            translated++;
        }
    }

    console.log(`\n✅ Done! Translated: ${translated}, Skipped: ${skipped}, Total: ${products.length}`);
}

main().catch(console.error);
