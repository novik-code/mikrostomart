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
        // For larger files, uploading to a temp host is better, but Data URI works for reasonable sizes (<10MB)
        const fileToBase64 = async (file: File) => {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            return `data:${file.type};base64,${buffer.toString("base64")}`;
        };

        const imageUri = await fileToBase64(imageFile);
        const maskUri = await fileToBase64(maskFile);

        console.log("Creating prediction temporarily to get logs...");

        // 1. Create Prediction
        let prediction = await replicate.predictions.create({
            version: "96793f64d08a543666245973792036c05eb3fa774D381a3d90f2307137452814", // Flux Fill Dev Version ID (specific) or use model name
            model: "black-forest-labs/flux-fill-dev",
            input: {
                image: imageUri,
                mask: maskUri,
                prompt: "A close up photo of a person smiling with open mouth, showing a full set of perfect, straight, white teeth. High quality dental photography, realistic texture, natural lighting.",
                guidance_scale: 3.0,
                n_steps: 25,
                output_format: "png",
                output_quality: 90
            }
        });

        // 2. Poll for completion
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

        // 3. Handle Result
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
