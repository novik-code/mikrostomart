import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'nodejs'; // Replicate SDK works best in Node env
// Force Deploy Timestamp: 2025-12-31 21:30

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

        const formData = await req.formData();
        const imageFile = formData.get("image") as File;
        const maskFile = formData.get("mask") as File;
        const style = formData.get("style") as string || "hollywood";

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

        console.log("Fetching latest model version for Flux Fill...");

        // 1. Get the latest version ID dynamically (Robust way)
        // This prevents 422 errors from hardcoded/outdated version IDs
        const modelRepo = await replicate.models.get("black-forest-labs", "flux-fill-dev");
        const latestVersion = modelRepo.latest_version?.id;

        if (!latestVersion) {
            throw new Error("Could not fetch latest version for black-forest-labs/flux-fill-dev");
        }

        // STRATEGY: Two-Pass Generation (Erase -> Rebuild)
        // Pass 1: Remove all teeth to create a neutral cavity (breaking the "anchor" to original teeth)
        // Pass 2: Generate perfect teeth on the blank canvas

        console.log("--- STARTING PASS 1: ERASING TEETH ---");

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

        // PASS 1: ERASE
        let erasePrediction = await createWithRetry(() => replicate.predictions.create({
            version: latestVersion,
            input: {
                image: imageUri,
                mask: maskUri,
                prompt: "Inpaint masked area only. Remove all teeth information completely and create a clean neutral mouth interior as a base: natural open-mouth cavity with realistic darkness and soft gradients, no visible teeth, no tooth shapes, no tooth edges, no gaps, no artifacts. Preserve lips, skin, and everything outside the mask unchanged, photorealistic, matching original lighting.",
                guidance_scale: 4.5,
                n_steps: 25, // Fast erase
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

        // Add a small safety buffer between passes even if no error
        await new Promise(resolve => setTimeout(resolve, 2000));

        // PASS 2: BUILD (Using output of Pass 1 as input)
        // STRATEGY V4.1: Switch to Flux-Fill-PRO for the quality build pass
        const proModel = "black-forest-labs/flux-fill-pro";



        // Re-fetching Pro version here to be dynamic
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
                safety_tolerance: 5 // Allow medical content
            }
        }));

        buildPrediction = await waitForPrediction(buildPrediction);

        console.log("Pass 2 Final Status:", buildPrediction.status);

        // 4. Handle Result
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
