import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'nodejs'; // Replicate SDK works best in Node env

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
                prompt: "extreme closeup of a hollywood smile makeover, gleaming white porcelain veneers, perfect alignment, straight bleached teeth, high fashion dental photography, bright white tooth shade, cold blue studio lighting, medical white aesthetic, transformative output",
                negative_prompt: "yellow teeth, stained teeth, cavities, discoloration, dark teeth, shadows on teeth, rot, broken teeth, gap, yellowing, plaque, natural teeth color, warm lighting, yellow tones",
                guidance_scale: 15.0, // MAXED OUT to force prompt adherence over image blending
                n_steps: 40,          // Max steps for detail
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
