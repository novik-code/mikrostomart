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

        // Helper to poll for prediction (Simplified)
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
            const blendModelRepo = await replicate.models.get("black-forest-labs", "flux-dev");
            const blendVersion = blendModelRepo.latest_version?.id;

            if (!blendVersion) throw new Error("Flux Dev version not found");

            const prediction = await replicate.predictions.create({
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
            });

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

        // 2. SINGLE-PASS AI GENERATE MODE (Flux Fill)
        // REFACTOR: Removed "Two-Pass" (Erase -> Build) logic.
        // Single pass is cleaner, preserves lighting, and reduces artifacts.

        console.log("--- STARTING SINGLE-PASS FLUX FILL ---");

        const modelRepo = await replicate.models.get("black-forest-labs", "flux-fill-dev");
        const latestVersion = modelRepo.latest_version?.id;

        if (!latestVersion) {
            throw new Error("Could not fetch latest version for black-forest-labs/flux-fill-dev");
        }

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: imageUri,
                mask: maskUri,
                prompt: `Dental macro photography. Inside the mouth, realistic ${style} teeth. High resolution, 8k, sharp focus, wet texture, enamel reflections.
                ${getStylePrompt(style)}
                Perfectly integrated with the surrounding lips and gums. Natural lighting match.`,
                guidance_scale: 60, // High guidance for strict adherence to prompt text (teeth)
                n_steps: 50,
                output_format: "png",
                output_quality: 100
            }
        });

        const finalPrediction = await waitForPrediction(prediction);

        if (finalPrediction.status === "succeeded" && finalPrediction.output) {
            const resultUrl = Array.isArray(finalPrediction.output) ? finalPrediction.output[0] : finalPrediction.output;
            return NextResponse.json({
                url: resultUrl,
                debug: JSON.stringify({ mode: 'single-pass-flux', logs: finalPrediction.logs })
            });
        } else {
            return NextResponse.json({
                error: `Generation failed: ${finalPrediction.error}`,
                debug: JSON.stringify(finalPrediction)
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
