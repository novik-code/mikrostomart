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

        // Using black-forest-labs/flux-fill-dev (SOTA Inpainting)
        const model = "black-forest-labs/flux-fill-dev";

        console.log("Sending request to Replicate (Flux Fill)...");

        const output = await replicate.run(model, {
            input: {
                image: imageUri,
                mask: maskUri,
                prompt: "A close up photo of a person smiling with open mouth, showing a full set of perfect, straight, white teeth. High quality dental photography, realistic texture, natural lighting.",
                guidance_scale: 30, // Flux likes higher guidance often
                n_steps: 20,
                output_format: "png",
                output_quality: 90
            }
        });

        console.log("Replicate Output:", output);

        // Output is typically a URL string or an array of URL strings
        const resultUrl = Array.isArray(output) ? output[0] : output;

        return NextResponse.json({ url: resultUrl });

    } catch (error: any) {
        console.error("Replicate API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}
