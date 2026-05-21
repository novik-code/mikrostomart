/**
 * One-shot script: AI-translate missing keys in messages/{en,de,ua}/pages.json
 * from messages/pl/pages.json. Used for Phase 2 SEO recovery (URL-based i18n).
 *
 * Usage:
 *   OPENAI_API_KEY=... npx tsx scripts/translate-missing-i18n.ts
 *
 * The script:
 *   1. Loads PL as source-of-truth.
 *   2. For each target locale (en, de, ua), finds keys present in PL but missing in target.
 *   3. Sends them in batches to GPT-4o-mini with a single system prompt per locale.
 *   4. Writes back the merged pages.json for each target locale.
 *
 * Idempotent: re-running only translates still-missing keys (already-translated ones are skipped).
 * Safe to interrupt: writes output after each section completes.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local first (project secrets), then .env (fallbacks)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TARGETS: Array<{ code: string; name: string; languageDescription: string }> = [
    { code: 'en', name: 'English', languageDescription: 'English (en)' },
    { code: 'de', name: 'German', languageDescription: 'German (de)' },
    { code: 'ua', name: 'Ukrainian', languageDescription: 'Ukrainian (uk)' },
];

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
// Override via MESSAGES_FILE env var (e.g. `MESSAGES_FILE=common.json npx tsx ...`)
// Default keeps backwards compat with original Phase 2 SEO recovery use case.
const FILE = process.env.MESSAGES_FILE || 'pages.json';
const MODEL = 'gpt-4o-mini';

type FlatDict = Record<string, string>;
type NestedDict = { [key: string]: string | NestedDict };

function flatten(obj: NestedDict, prefix = ''): FlatDict {
    const result: FlatDict = {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        const nk = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null) {
            Object.assign(result, flatten(v, nk));
        } else if (typeof v === 'string') {
            result[nk] = v;
        }
    }
    return result;
}

function setDeep(obj: NestedDict, key: string, value: string): void {
    const parts = key.split('.');
    let cursor: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cursor[parts[i]] !== 'object' || cursor[parts[i]] === null) {
            cursor[parts[i]] = {};
        }
        cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
}

function loadJson(filePath: string): NestedDict {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath: string, data: NestedDict): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
}

async function translateBatch(
    polishKvs: Array<{ key: string; value: string }>,
    target: typeof TARGETS[number]
): Promise<Record<string, string>> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const systemPrompt = [
        `You are a professional translator for a dental clinic website (Mikrostomart, a clinic in Opole, Poland).`,
        `Translate Polish dental marketing copy to ${target.languageDescription}.`,
        ``,
        `RULES:`,
        `- Preserve placeholders exactly: {brandName}, {cityShort}, {phone1}, {legalName}, {email}, etc.`,
        `- Keep medical/dental terminology accurate (use established translations).`,
        `- Match the tone: warm, professional, premium, trustworthy.`,
        `- Keep formatting: line breaks, punctuation, bold markers (**text**), etc.`,
        `- For German: use formal "Sie" form.`,
        `- For Ukrainian: use modern Ukrainian (NOT Russian-influenced spelling).`,
        ``,
        `Return ONLY a JSON object mapping each Polish key to its translated value. No explanations, no markdown.`,
        `Example output: {"key1": "translated text", "key2": "translated text"}`,
    ].join('\n');

    const userPrompt = `Translate these Polish strings to ${target.languageDescription}:\n\n` +
        JSON.stringify(Object.fromEntries(polishKvs.map(({ key, value }) => [key, value])), null, 2);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API error: ${res.status} ${errText.slice(0, 500)}`);
    }

    const json = await res.json() as any;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in OpenAI response');

    return JSON.parse(content);
}

async function main(): Promise<void> {
    const plPath = path.join(MESSAGES_DIR, 'pl', FILE);
    const plJson = loadJson(plPath);
    const flatPL = flatten(plJson);
    console.log(`📖 Loaded PL source: ${Object.keys(flatPL).length} keys`);

    for (const target of TARGETS) {
        const targetPath = path.join(MESSAGES_DIR, target.code, FILE);
        const targetJson = loadJson(targetPath);
        const flatTarget = flatten(targetJson);

        const missingKeys = Object.keys(flatPL).filter((k) => !(k in flatTarget));
        if (missingKeys.length === 0) {
            console.log(`✅ ${target.name}: 0 missing keys, skipping`);
            continue;
        }

        console.log(`\n🌐 ${target.name}: ${missingKeys.length} missing keys`);

        // Group missing keys by top-level section to keep batches semantically related
        const bySection: Record<string, Array<{ key: string; value: string }>> = {};
        for (const k of missingKeys) {
            const section = k.split('.')[0];
            if (!bySection[section]) bySection[section] = [];
            bySection[section].push({ key: k, value: flatPL[k] });
        }

        for (const [section, kvs] of Object.entries(bySection)) {
            console.log(`   → ${section}: ${kvs.length} keys ...`);
            try {
                const translated = await translateBatch(kvs, target);
                let written = 0;
                for (const { key } of kvs) {
                    if (translated[key]) {
                        setDeep(targetJson, key, translated[key]);
                        written++;
                    } else {
                        console.warn(`     ⚠️  no translation returned for ${key}`);
                    }
                }
                // Save after each section so we don't lose work on interrupt
                saveJson(targetPath, targetJson);
                console.log(`     ✓ wrote ${written}/${kvs.length}`);
            } catch (err: any) {
                console.error(`     ✗ FAILED: ${err.message}`);
                console.error(`     Saving partial progress and continuing to next section...`);
                saveJson(targetPath, targetJson);
            }
        }
    }

    console.log('\n✨ Done.');
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
