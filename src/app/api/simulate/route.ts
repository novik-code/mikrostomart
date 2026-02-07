import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'nodejs';

// --- GET: Check Status (Polling) ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get("id");

    if (!predictionId) {
        return NextResponse.json({ error: "Missing prediction ID" }, { status: 400 });
    }

    const replicateKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateKey) return NextResponse.json({ error: "Config Error" }, { status: 500 });

    const replicate = new Replicate({ auth: replicateKey });

    try {
        const prediction = await replicate.predictions.get(predictionId);

        if (prediction.status === "succeeded") {
            const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            return NextResponse.json({ status: "succeeded", url: outputUrl });
        } else if (prediction.status === "failed" || prediction.status === "canceled") {
            return NextResponse.json({ status: "failed", error: prediction.error });
        } else {
            return NextResponse.json({ status: prediction.status });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- POST: Start Prediction ---
export async function POST(req: NextRequest) {
    try {
        const replicateKey = process.env.REPLICATE_API_TOKEN;
        if (!replicateKey) {
            return NextResponse.json({ error: "Missing API Token" }, { status: 500 });
        }

        const replicate = new Replicate({ auth: replicateKey });
        const formData = await req.formData();
        const imageFile = formData.get("image") as File;
        const maskFile = formData.get("mask") as File;
        const style = formData.get("style") as string || "hollywood";

        if (!imageFile || !maskFile) {
            return NextResponse.json({ error: "Missing image/mask" }, { status: 400 });
        }

        // Convert to Base64
        const fileToBase64 = async (file: File) => {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            return `data:${file.type};base64,${buffer.toString("base64")}`;
        };

        const imageUri = await fileToBase64(imageFile);
        const maskUri = await fileToBase64(maskFile);

        // Start Flux Fill
        const modelRepo = await replicate.models.get("black-forest-labs", "flux-fill-dev");
        const version = modelRepo.latest_version?.id;

        if (!version) throw new Error("Model version not found");

        const prediction = await replicate.predictions.create({
            version: version,
            input: {
                image: imageUri,
                mask: maskUri,
                // DESCRIPTIVE PROMPT — describe the desired end state, NOT procedure
                prompt: buildSmilePrompt(style),
                guidance_scale: 15,
                n_steps: 50,
                output_format: "png",
                output_quality: 100
            }
        });

        return NextResponse.json({ id: prediction.id }, { status: 202 });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start simulation" },
            { status: 500 }
        );
    }
}

// --- Descriptive prompt builder ---
// KEY PRINCIPLE: Describe the desired RESULT, not the procedure.
// DO NOT use instructions like "open mouth", "reshape lips", "place veneers".
// Simply describe what the final photo should look like.
function buildSmilePrompt(style: string): string {
    const base = `Same person, same photo, same lighting. Only the mouth area is different: a beautiful, natural-looking smile with clean white teeth. Teeth are naturally proportioned, properly aligned, no gaps. Healthy lips. Photorealistic dental photography.`;

    return `${base} ${getStyleSuffix(style)}`;
}

function getStyleSuffix(style: string): string {
    switch (style) {
        case "natural":
            return "Natural white teeth with subtle warmth. Genuine relaxed smile.";
        case "soft":
            return "Gentle soft smile. Rounded teeth, natural white tone.";
        case "strong":
            return "Confident broad smile. Defined teeth, bright white.";
        case "hollywood":
        default:
            return "Bright white Hollywood smile. Perfect symmetry.";
    }
}
