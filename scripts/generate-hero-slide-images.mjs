// scripts/generate-hero-slide-images.mjs
//
// Generuje 5 dedykowanych grafik dla HeroSlideshow (K-1b) przez Replicate Flux Dev.
// Styl wzorowany 1:1 na grafikach z OfferCarousel (premium dental, dark moody +
// gold accents) — Marcin K-1b v2 feedback 2026-05-18.
//
// Uruchomienie:
//   node scripts/generate-hero-slide-images.mjs
//
// Wynik: public/hero-slides/{emotional,authority,technology,specialty,international}.webp
// Koszt: ~$0.13 (5 × $0.025 Flux Dev)
// Czas: ~3-5 minut
//
// Po wygenerowaniu zaktualizuj `SLIDE_CONFIG` w src/components/HeroSlideshow.tsx
// żeby image paths wskazywały na /hero-slides/{id}.webp.

import Replicate from "replicate";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.REPLICATE_API_TOKEN) {
    console.error("❌ Missing REPLICATE_API_TOKEN in .env.local");
    process.exit(1);
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// 5 wariacji macro smile photos — różne osoby/wiek/płeć/expression, ten sam
// premium dental aesthetic (dark moody + warm gold rim, Canon R5 macro).
// Marcin K-1c feedback 2026-05-19: "wszystkie 5 mają być piękne uśmiechy
// jak emotional który już był OK".
const SLIDES = [
    {
        id: "emotional",
        prompt: "Macro close-up of bright joyful natural smile of a young woman (around 30 years old), ultra-detailed white enamel showing perfect alignment, healthy pink gums, soft natural lips slightly parted, hints of laugh lines around the mouth, fresh energetic expression. Dark moody background with deep charcoal blacks, subtle warm gold rim lighting from the right side. Modern luxury dental aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "authority",
        prompt: "Macro close-up of confident composed smile of a mature professional man (around 45 years old), well-aligned strong white teeth, slight stubble visible, calm trustworthy expression, masculine jaw line, healthy gums. Dark moody background with deep blacks, subtle warm amber rim lighting from upper left. Modern luxury dental aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "technology",
        prompt: "Extreme macro close-up showing perfect details of upper central incisors and canines of a beautiful smile, glistening enamel with subtle natural variations, healthy pink gum line, micro-detail texture of tooth surface, lip outline visible. Dark moody background with deep charcoal blacks, warm gold accent lighting catching enamel highlights. Modern luxury dental aesthetic, photorealistic precision (ZEISS microscope-grade detail), cinematic composition, shallow depth of field. Canon R5, 100mm macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "specialty",
        prompt: "Macro warm genuine smile of a middle-aged person (around 50 years old) showing healthy beautifully restored teeth (front incisors plus visible premolars), natural alignment, slight character wrinkles around the mouth showing experience and authenticity, deeply satisfied expression. Dark moody background, subtle warm golden hour rim lighting from the side. Modern luxury dental aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "international",
        prompt: "Macro warm authentic smile of an elegantly aging woman (around 60 years old) with beautiful white teeth, subtle laugh lines around bright eyes (partially visible), gracefully mature skin texture, sophisticated expression conveying wisdom and joy. Dark moody background with deep blacks, warm gold rim lighting from the right. Modern luxury dental aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
];

// K-1c #2 (Marcin 2026-05-19): Flux Dev dał "sztuczne" rezultaty (uncanny valley
// w ustach/zębach). Upgrade na Flux 1.1 Pro Ultra — najwyższa jakość modelu BFL,
// znacznie lepszy realism dla portretów. Koszt ~$0.06/img zamiast ~$0.025.
const MODEL = "black-forest-labs/flux-1.1-pro-ultra";
const OUTPUT_DIR = "public/hero-slides";
// VERSION suffix dla cache-bust (Vercel CDN cache "immutable, 1 year" dla
// assets serwowanych spod /public/). Bumpuj przy każdej regeneracji + update
// SLIDE_CONFIG paths w src/components/HeroSlideshow.tsx do `${id}-${VERSION}.webp`.
// Override przez env: VERSION=v3 node scripts/generate-hero-slide-images.mjs
const VERSION = process.env.VERSION || "v3";

// Flux 1.1 Pro Ultra inputs — różne od Flux Dev:
// - aspect_ratio, output_format (tylko jpg/png — webp UNSUPPORTED, convertujemy
//   przez sharp po download)
// - raw: true = bardziej natural/photographic (NIE polished AI look)
// - safety_tolerance: 2 (1=strict, 6=most permissive)
// - BRAK guidance/num_inference_steps/megapixels — model auto
const baseInput = {
    aspect_ratio: "3:4",
    output_format: "jpg",
    raw: true,
    safety_tolerance: 2,
};

async function generateOne(slide) {
    console.log(`\n🎨 [${slide.id}] Generating with ${MODEL}...`);
    console.log(`   Prompt: ${slide.prompt.slice(0, 80)}...`);

    const startedAt = Date.now();

    try {
        const output = await replicate.run(MODEL, {
            input: { ...baseInput, prompt: slide.prompt },
        });

        // Flux Dev returns an array of file-like outputs (or URLs depending on SDK version)
        const item = Array.isArray(output) ? output[0] : output;

        let buffer;
        if (typeof item === "string") {
            // URL — fetch it
            const r = await fetch(item);
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${item}`);
            buffer = Buffer.from(await r.arrayBuffer());
        } else if (item && typeof item.arrayBuffer === "function") {
            // File-like (newer SDK)
            buffer = Buffer.from(await item.arrayBuffer());
        } else if (item && typeof item.blob === "function") {
            // Response-like
            const blob = await item.blob();
            buffer = Buffer.from(await blob.arrayBuffer());
        } else {
            throw new Error(`Unexpected output type: ${typeof item} ${JSON.stringify(item)?.slice(0, 200)}`);
        }

        // Convert jpg → webp przez sharp (Flux 1.1 Pro Ultra zwraca tylko jpg/png)
        const sharpMod = await import("sharp");
        const sharp = sharpMod.default;
        const webpBuffer = await sharp(buffer).webp({ quality: 88 }).toBuffer();

        const outPath = path.join(OUTPUT_DIR, `${slide.id}-${VERSION}.webp`);
        fs.writeFileSync(outPath, webpBuffer);
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const sizeKb = Math.round(webpBuffer.length / 1024);
        console.log(`   ✅ Saved ${outPath} (${sizeKb} KB, ${elapsedSec}s, jpg→webp)`);

        return { id: slide.id, path: outPath, sizeKb, elapsedSec };
    } catch (err) {
        console.error(`   ❌ Failed for ${slide.id}:`, err.message);
        throw err;
    }
}

async function main() {
    console.log(`🚀 Generating ${SLIDES.length} hero slide images via ${MODEL}`);
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const results = [];
    for (const slide of SLIDES) {
        const result = await generateOne(slide);
        results.push(result);
    }

    console.log(`\n📊 Summary:`);
    console.table(results.map(r => ({ id: r.id, sizeKb: r.sizeKb, time: `${r.elapsedSec}s` })));
    console.log(`\n✨ Done. Update src/components/HeroSlideshow.tsx SLIDE_CONFIG to use /hero-slides/{id}.webp paths.`);
}

main().catch(err => {
    console.error("\n💥 Fatal error:", err);
    process.exit(1);
});
