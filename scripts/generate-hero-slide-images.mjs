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

const SLIDES = [
    {
        id: "emotional",
        prompt: "Macro close-up photograph of a flawless natural white smile, ultra-detailed enamel showing perfect alignment and translucency, healthy pink gums, soft natural lips. Dark moody background with deep charcoal blacks, subtle warm gold rim lighting from the side. Modern luxury dental aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "authority",
        prompt: "Elegant still life of a graduation cap with golden tassel resting on a leather-bound diploma case, embossed with subtle 'M.Sc.' lettering, alongside a vintage stethoscope and a black fountain pen. Dark moody background with deep blacks and warm amber accent lighting from upper left. Modern luxury academic aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "technology",
        prompt: "Detail photograph of a high-end dental operating microscope eyepieces and lens assembly, brass and matte black components, precise mechanical engineering visible, fine machined details. Dark moody background with deep blacks and charcoal tones, subtle warm gold accent lighting catching the brass elements. Modern luxury dental clinic aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "specialty",
        prompt: "Macro close-up of premium endodontic instruments - polished nickel-titanium rotary files arranged with surgical precision on a dark leather surface, alongside a glass vial with golden reflection. Dark moody background with deep charcoal blacks, subtle warm gold accent rim lighting. Modern luxury dental specialist aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 macro lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
    {
        id: "international",
        prompt: "Elegant overhead photograph of a vintage world map of Central Europe with brass compass and a leather-bound passport, focusing on Poland with small subtle markers. Dark moody background with deep blacks and warm amber lighting from the side. Modern luxury travel aesthetic, photorealistic, cinematic composition, shallow depth of field, dramatic studio lighting. Canon R5, 85mm f/1.4 lens. Vertical 3:4 portrait orientation. No text. No watermark.",
    },
];

const MODEL = "black-forest-labs/flux-dev";
const OUTPUT_DIR = "public/hero-slides";

const baseInput = {
    aspect_ratio: "3:4",
    output_format: "webp",
    output_quality: 90,
    num_inference_steps: 30,
    guidance: 3.5,
    num_outputs: 1,
    disable_safety_checker: false,
    megapixels: "1", // ~1024x1365 for 3:4
};

async function generateOne(slide) {
    console.log(`\n🎨 [${slide.id}] Generating with Flux Dev...`);
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

        const outPath = path.join(OUTPUT_DIR, `${slide.id}.webp`);
        fs.writeFileSync(outPath, buffer);
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const sizeKb = Math.round(buffer.length / 1024);
        console.log(`   ✅ Saved ${outPath} (${sizeKb} KB, ${elapsedSec}s)`);

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
