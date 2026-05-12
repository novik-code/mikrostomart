#!/usr/bin/env node
/**
 * Converts public/kb-*.png to .webp (75% quality) and .avif (60% quality).
 *
 * Problem: knowledge base PNGs average ~900 KB each; with 131 files that's
 * ~130 MB on disk and the same wire size every time Googlebot, social
 * scrapers, or any non-next/image consumer fetches the `image` URL from a
 * JSON-LD schema or og:image tag. next/image already serves WebP to browsers,
 * but raw URLs in schema.org/OpenGraph metadata bypass it.
 *
 * Strategy: emit .webp + .avif siblings beside every .png. The DB column
 * `articles.image_url` keeps its .png value (no migration), but a runtime
 * helper rewrites `.png → .webp` for schema/OG output. The .png stays as
 * fallback for any external link or third-party scraper that doesn't accept
 * WebP.
 *
 * Idempotent: skips files whose .webp/.avif already exists and is newer than
 * the source .png (mtime check).
 *
 * Usage: `npm run optimize:kb-images` or `node scripts/optimize-kb-images.mjs`
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '..', 'public');

const sources = readdirSync(PUBLIC_DIR).filter((f) => f.startsWith('kb-') && f.endsWith('.png'));

console.log(`Found ${sources.length} kb-*.png files in public/`);

let converted = 0;
let skipped = 0;
let failed = 0;
let totalSrcBytes = 0;
let totalWebpBytes = 0;
let totalAvifBytes = 0;

for (const source of sources) {
    const srcPath = join(PUBLIC_DIR, source);
    const webpPath = srcPath.replace(/\.png$/, '.webp');
    const avifPath = srcPath.replace(/\.png$/, '.avif');

    const srcStat = statSync(srcPath);
    totalSrcBytes += srcStat.size;

    // Skip if both outputs exist and are newer than source.
    const webpFresh = existsSync(webpPath) && statSync(webpPath).mtimeMs >= srcStat.mtimeMs;
    const avifFresh = existsSync(avifPath) && statSync(avifPath).mtimeMs >= srcStat.mtimeMs;

    if (webpFresh && avifFresh) {
        totalWebpBytes += statSync(webpPath).size;
        totalAvifBytes += statSync(avifPath).size;
        skipped++;
        continue;
    }

    try {
        const input = sharp(srcPath);
        if (!webpFresh) {
            await input.clone().webp({ quality: 75, effort: 4 }).toFile(webpPath);
        }
        if (!avifFresh) {
            await input.clone().avif({ quality: 60, effort: 4 }).toFile(avifPath);
        }
        totalWebpBytes += statSync(webpPath).size;
        totalAvifBytes += statSync(avifPath).size;
        converted++;
        if (converted % 20 === 0) console.log(`  …${converted}/${sources.length}`);
    } catch (e) {
        console.error(`✗ ${source}: ${e?.message || e}`);
        failed++;
    }
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
const pct = (a, b) => ((1 - a / b) * 100).toFixed(0);

console.log(`\n✓ Converted: ${converted}, skipped (up-to-date): ${skipped}, failed: ${failed}`);
console.log(`  PNG total:  ${mb(totalSrcBytes)} MB`);
console.log(`  WebP total: ${mb(totalWebpBytes)} MB  (-${pct(totalWebpBytes, totalSrcBytes)}%)`);
console.log(`  AVIF total: ${mb(totalAvifBytes)} MB  (-${pct(totalAvifBytes, totalSrcBytes)}%)`);

if (failed > 0) process.exit(1);
