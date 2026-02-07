import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60s for image generation

// --- POST: Generate smile simulation via OpenAI gpt-image-1 ---
export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing OpenAI API Key" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });
        const formData = await req.formData();
        const imageFile = formData.get("image") as File;
        const maskFile = formData.get("mask") as File;
        const style = (formData.get("style") as string) || "hollywood";

        if (!imageFile || !maskFile) {
            return NextResponse.json({ error: "Missing image or mask" }, { status: 400 });
        }

        // Convert uploaded Files to OpenAI-compatible format
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const maskBuffer = Buffer.from(await maskFile.arrayBuffer());

        const openaiImage = await toFile(imageBuffer, "image.png", { type: "image/png" });
        const openaiMask = await toFile(maskBuffer, "mask.png", { type: "image/png" });

        // --- CALL OpenAI Image Edit ---
        const response = await openai.images.edit({
            model: "gpt-image-1",
            image: openaiImage,
            mask: openaiMask,
            prompt: buildSmilePrompt(style),
            size: "1024x1024",
            n: 1,
        });

        // gpt-image-1 returns base64 data
        const b64 = response.data?.[0]?.b64_json;
        if (b64) {
            return NextResponse.json({
                status: "succeeded",
                url: `data:image/png;base64,${b64}`,
            });
        }

        // Fallback: if URL is returned instead
        const url = response.data?.[0]?.url;
        if (url) {
            return NextResponse.json({ status: "succeeded", url });
        }

        return NextResponse.json({ error: "No image returned from AI" }, { status: 500 });

    } catch (error: any) {
        console.error("Smile Simulation Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate smile" },
            { status: 500 }
        );
    }
}

// --- Descriptive prompt builder ---
// Key principle: describe the DESIRED RESULT, never the procedure.
function buildSmilePrompt(style: string): string {
    const base = `A photorealistic close-up portrait photograph of this exact same person with a beautiful, warm, natural-looking smile showing perfectly white, straight teeth. The smile is genuine, confident and photorealistic. Teeth are naturally proportioned, bright white, with perfect alignment and no gaps or discoloration. Healthy natural pink lips. The person's face, skin tone, identity, lighting, and background remain completely unchanged. Only the mouth area has a beautiful new smile.`;

    const styleAddition = getStyleAddition(style);

    return `${base} ${styleAddition}`;
}

function getStyleAddition(style: string): string {
    switch (style) {
        case "natural":
            return "The teeth have a natural warm white tone with very subtle, realistic imperfections for an authentic look. The smile is relaxed and genuine.";
        case "soft":
            return "The smile is gentle and soft, with naturally rounded teeth and a warm, inviting expression. Teeth are a natural white, not overly bright.";
        case "strong":
            return "The smile is broad and confident, with well-defined, slightly square teeth. The expression conveys strength and command. Bright white teeth.";
        case "hollywood":
        default:
            return "Ultra-white Hollywood veneers with perfect symmetry. A broad, radiant, red-carpet-worthy smile. Flawlessly aligned, brilliant white teeth.";
    }
}
