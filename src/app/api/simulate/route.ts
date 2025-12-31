import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'nodejs'; // Replicate SDK works best in Node env
// Force Deploy Timestamp: 2025-12-31 22:00

export async function POST(req: NextRequest) {
    try {
        const replicateKey = process.env.REPLICATE_API_TOKEN;

        if (!replicateKey) {
            console.error("Missing REPLICATE_API_TOKEN");
            return NextResponse.json(
                { error: "Configuration Error: Missing API Token" },
                { status: 500 }
            );
        }

        const replicate = new Replicate({
            auth: replicateKey,
        });

        // --- HELPERS ---

        // Helper to poll for prediction
        const waitForPrediction = async (pred: any) => {
            const maxAttempts = 60;
            let attempts = 0;
            while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
                if (attempts >= maxAttempts) throw new Error("Timeout");
                await new Promise(resolve => setTimeout(resolve, 1000));
                pred = await replicate.predictions.get(pred.id);
                attempts++;
            }
            return pred;
        };

        // Helper to handle Rate Limits (429) automatically
        const createWithRetry = async (createFn: () => Promise<any>, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await createFn();
                } catch (error: any) {
                    const isRateLimit = error.toString().includes("429") || (error.status === 429);
                    if (isRateLimit && i < retries - 1) {
                        console.log(`Rate limit hit (429). Waiting 10s before retry ${i + 1}/${retries}...`);
                        await new Promise(resolve => setTimeout(resolve, 12000)); // Wait 12s to be safe
                        continue;
                    }
                    throw error;
                }
            }
        };

        // --- REQUEST PARSING ---

        const formData = await req.formData();
        const imageFile = formData.get("image") as File;
        const maskFile = formData.get("mask") as File;
        const style = formData.get("style") as string || "hollywood";
        const mode = formData.get("mode") as string || "ai-generate";

        if (!imageFile || !maskFile) {
            return NextResponse.json(
                { error: "Missing image or mask" },
                { status: 400 }
            );
        }

        // Convert Files to base64 Data URIs which Replicate accepts
        const fileToBase64 = async (file: File) => {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            return `data:${file.type};base64,${buffer.toString("base64")}`;
        };

        const imageUri = await fileToBase64(imageFile);
        const maskUri = await fileToBase64(maskFile);

        // --- LOGIC DISPATCH ---

        // 1. TEMPLATE BLEND MODE (Image-to-Image / Blending)
        if (mode === "template-blend") {
            console.log("--- STARTING TEMPLATE BLEND MODE (Flux Dev Img2Img) ---");

            // Use black-forest-labs/flux-dev for blending the composite
            const blendModel = "black-forest-labs/flux-dev";
            const blendModelRepo = await replicate.models.get("black-forest-labs", "flux-dev");
            const blendVersion = blendModelRepo.latest_version?.id;

            if (!blendVersion) throw new Error("Flux Dev version not found");

            // Parameters for blending:
            // "image" is the input composite (face + template overlay)
            // "prompt_strength" controls how much we overwrite. 
            // 0.65 means "change about 65% of the pixels" (or strictness depending on model implementation).
            // Actually in Flux Dev, `prompt_strength` might be `strength` or `denoising_strength`.
            // Replicate documentation for flux-dev typically exposes `prompt_strength` (0-1).

            const prediction = await createWithRetry(() => replicate.predictions.create({
                version: blendVersion,
                input: {
                    prompt: `Photorealistic dental photography. A beautiful smile with ${style} teeth. High detailed macro shot, natural skin texture, professional lighting. ${getStylePrompt(style)}`,
                    image: imageUri,
                    prompt_strength: 0.65,
                    num_inference_steps: 30,
                    guidance_scale: 3.5,
                    output_format: "png",
                    output_quality: 100,
                    go_fast: true
                }
            }));

            const finalPrediction = await waitForPrediction(prediction);

            if (finalPrediction.status === "succeeded" && finalPrediction.output) {
                const resultUrl = Array.isArray(finalPrediction.output) ? finalPrediction.output[0] : finalPrediction.output;
                return NextResponse.json({
                    url: resultUrl,
                    debug: JSON.stringify({ mode: 'template-blend', logs: finalPrediction.logs })
                });
            } else {
                throw new Error(`Template Blend failed: ${finalPrediction.error}`);
            }
        }

        // 2. ORIGINAL AI GENERATE MODE (Inpainting)
        console.log("Fetching latest model version for Flux Fill (Inpainting)...");

        const modelRepo = await replicate.models.get("black-forest-labs", "flux-fill-dev");
        const latestVersion = modelRepo.latest_version?.id;

        if (!latestVersion) {
            throw new Error("Could not fetch latest version for black-forest-labs/flux-fill-dev");
        }

        console.log("--- STARTING PASS 1: ERASING TEETH ---");

        // PASS 1: ERASE
        let erasePrediction = await createWithRetry(() => replicate.predictions.create({
            version: latestVersion,
            input: {
                image: imageUri,
                mask: maskUri,
                prompt: "Inpaint masked area only. Remove all teeth information completely and create a clean neutral mouth interior as a base: natural open-mouth cavity with realistic darkness and soft gradients, no visible teeth, no tooth shapes, no tooth edges, no gaps, no artifacts. Preserve lips, skin, and everything outside the mask unchanged, photorealistic, matching original lighting.",
                guidance_scale: 4.5,
                n_steps: 25,
                output_format: "png",
                output_quality: 100
            }
        }));

        erasePrediction = await waitForPrediction(erasePrediction);

        if (erasePrediction.status !== "succeeded" || !erasePrediction.output) {
            throw new Error(`Pass 1 (Erase) failed: ${erasePrediction.error}`);
        }

        const erasedImageUrl = Array.isArray(erasePrediction.output) ? erasePrediction.output[0] : erasePrediction.output;
        console.log("Pass 1 Succeeded. URL:", erasedImageUrl);

        console.log("--- STARTING PASS 2: BUILD NEW SMILE ---");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // PASS 2: BUILD
        const proModelRepo = await replicate.models.get("black-forest-labs", "flux-fill-pro");
        const proVersion = proModelRepo.latest_version?.id;

        if (!proVersion) throw new Error("Flux Fill Pro version not found");

        let buildPrediction = await createWithRetry(() => replicate.predictions.create({
            version: proVersion,
            input: {
                image: erasedImageUrl,
                mask: maskUri,
                prompt: `Photorealistic dental smile makeover (inpaint masked area only). Build a brand-new ideal upper dental arch from scratch inside the mask.
                
                STYLE: ${style.toUpperCase()}.
                ${getStylePrompt(style)}

                Generate correct left-right paired tooth anatomy. Enforce bilateral symmetry, correct midline, correct incisal edge line, natural contact points. Preserve lips, gumline, and identity. Avoid: missing teeth, wrong tooth count, gaps, diastema, black triangles, crooked teeth, fake plastic dentures look, braces, metal.`,
                guidance: style === "hollywood" ? 60 : 50, // Higher guidance for Hollywood perfection
                steps: 50,
                output_format: "png",
                output_quality: 100,
                safety_tolerance: 5
            }
        }));

        buildPrediction = await waitForPrediction(buildPrediction);

        console.log("Pass 2 Final Status:", buildPrediction.status);

        if (buildPrediction.status === "succeeded" && buildPrediction.output) {
            const resultUrl = Array.isArray(buildPrediction.output) ? buildPrediction.output[0] : buildPrediction.output;
            return NextResponse.json({
                url: resultUrl,
                debug: JSON.stringify({
                    pass1_logs: erasePrediction.logs,
                    pass2_logs: buildPrediction.logs
                })
            });
        } else {
            return NextResponse.json({
                error: `Pass 2 failed: ${buildPrediction.error}`,
                debug: JSON.stringify(buildPrediction)
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Replicate API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}

function getStylePrompt(style: string): string {
    switch (style) {
        case "natural":
            return "Natural aesthetics: Shade A1/B1 (not blinding white). Realistic biomimetic tooth shapes with slight natural asymmetries and texture. Incisal edges should have subtle translucency and natural wear irregularities. Not artificially perfect.";
        case "soft":
            return "Soft aesthetics: Rounded tooth corners, oval shapes, feminine and gentle appearance. Shade BL2. Smooth surface texture, dominantly rounded canines, youthful smile.";
        case "strong":
            return "Strong aesthetics: Square tooth shapes, flat incisal edges, bold masculine appearance. Shade BL2. Prominent canines, strong distinct anatomy.";
        case "hollywood":
        default:
            return "Hollywood aesthetics: Ultra-white ceramic veneers shade BL1. Perfect bilateral symmetry. Dominant central incisors, perfectly aligned. High gloss, smooth surface, flawless geometry. The 'perfect tv smile'.";
    }
}
