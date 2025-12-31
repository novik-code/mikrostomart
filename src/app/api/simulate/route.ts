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

        console.log("Using Version ID:", latestVersion);

        // 2. Create Prediction with valid version
        // Prompt Engineering: Explicit color change and transformation
        let prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: imageUri,
                mask: maskUri,
                prompt: "Photorealistic dental smile makeover (FLUX fill / black-forest-labs/flux-fill-dev, inpaint masked area only). In the masked region, COMPLETELY IGNORE the original teeth and rebuild a brand-new ideal smile from scratch (do not follow the initial tooth positions, shapes, gaps, discoloration, or missing teeth; treat the masked area as blank). Create a proportional, perfectly symmetric upper dental arch ONLY as far as the smile reveals, but ALWAYS as left-right pairs with correct tooth count: exactly TWO central incisors (11 & 21), TWO lateral incisors (12 & 22), TWO canines (13 & 23). If premolars are visible, include TWO first premolars (14 & 24) and TWO second premolars (15 & 25). If first molars are visible, include TWO first molars (16 & 26). Never generate a single tooth where a pair must exist. Enforce bilateral symmetry, correct midline, correct tooth widths and proportions, correct incisal edge line, natural contact points, no missing teeth, no gaps, no diastema, no black triangles, no crowding. Ultra-white ceramic veneers shade BL1 (Hollywood white), photoreal enamel micro-texture, subtle incisal translucency, natural specular highlights and shadows matching the original lighting/camera flash, correct perspective and scale to fit the face, no distortion. Keep lips, gumline and surrounding skin photorealistic and unchanged outside the mask; preserve the person’s identity and facial features.",
                negative_prompt: "missing tooth, wrong tooth count, single central incisor, one front tooth, extra tooth, duplicate tooth, asymmetry, gaps, diastema, black triangles, crooked teeth, warped mouth, changed lips, changed face, changed nose, changed skin, dentures, fake plastic teeth, braces, metal, blurry, cartoon, CGI, illustration, uncanny, text, watermark, logo, warm lighting, yellow tones, natural teeth color",
                guidance_scale: 7.0, // User recommendation: 5-7
                n_steps: 40,         // User recommendation: 30-45
                seed: 42,            // User recommendation: Fixed seed for consistency
                output_format: "png",
                output_quality: 100
            }
        });

        // 3. Poll for completion
        const maxAttempts = 60; // 60 * 1s = 60s timeout
        let attempts = 0;

        while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
            if (attempts >= maxAttempts) {
                throw new Error("Timeout waiting for prediction");
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            prediction = await replicate.predictions.get(prediction.id);
            attempts++;
        }

        console.log("Prediction Final Status:", prediction.status);
        console.log("Prediction Logs:", prediction.logs);

        // 4. Handle Result
        if (prediction.status === "succeeded" && prediction.output) {
            // Flux Fill typically returns a string URL or array of strings
            const output = prediction.output;
            const resultUrl = Array.isArray(output) ? output[0] : output;

            return NextResponse.json({
                url: resultUrl,
                debug: JSON.stringify({ logs: prediction.logs, output: prediction.output })
            });
        } else {
            return NextResponse.json({
                error: `Prediction failed: ${prediction.error}`,
                debug: JSON.stringify({ logs: prediction.logs, status: prediction.status, error: prediction.error })
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
