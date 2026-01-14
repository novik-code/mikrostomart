
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { uploadToRepo } from "@/lib/githubService";

// Helper for auth
function isAuthenticated(req: NextRequest) {
    const authHeader = req.headers.get("x-admin-password");
    const envPassword = process.env.ADMIN_PASSWORD || "admin123";
    return authHeader === envPassword;
}

export const maxDuration = 60; // Allow sufficient time for AI + Upload

export async function POST(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { topic, instructions, model } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const Replicate = require("replicate"); // Late require

        // 1. Generate Text Content (GPT-4o)
        const systemPrompt = `Jesteś doświadczonym redaktorem medycznym/stomatologicznym. 
        Napisz profesjonalny artykuł do sekcji "Aktualności" na temat: "${topic}".
        
        Dodatkowe wskazówki od użytkownika: "${instructions || "Brak"}".

        Zwróć odpowiedź WYŁĄCZNIE w poprawnym formacie JSON:
        {
            "title": "Chwytliwy tytuł (max 60 znaków)",
            "slug": "url-friendly-slug-bez-polskich-znakow",
            "excerpt": "Krótki wstęp zachęcający do czytania (max 160 znaków).",
            "content": "Pełna treść artykułu w formacie Markdown (używaj nagłówków ##, list, pogrubień).",
            "imagePrompt": "Szczegółowy opis zdjęcia w języku angielskim (prompt). Fotorealistyczne, nowoczesna klinika, eleganckie. ${model === 'flux-dev' ? 'Natural lighting, canon r5, 50mm, detailed texture.' : 'DALL-E 3 style.'}"
        }`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Temat: ${topic}` }
            ],
            response_format: { type: "json_object" }
        });

        const articleData = JSON.parse(completion.choices[0].message.content || "{}");
        if (!articleData.title) throw new Error("Błąd generowania treści przez AI");

        // 2. Generate Image
        let imageBase64: string | undefined;

        if (model === 'flux-dev') {
            console.log("Generating with Flux (Replicate)...");
            const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

            // Input for black-forest-labs/flux-dev
            const input = {
                prompt: articleData.imagePrompt + " photorealistic, natural lighting, luxury dental clinic, soft shadows, 8k, highly detailed, professional photography, depth of field",
                go_fast: true,
                output_format: "png",
                aspect_ratio: "1:1",
                output_quality: 100
            };

            const output: any = await replicate.run("black-forest-labs/flux-dev", { input });

            // Replicate returns a URL (or array of URLs)
            const imageUrl = Array.isArray(output) ? output[0] : output;

            // Download the image to get base64 (since uploadToRepo expects base64)
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            imageBase64 = Buffer.from(arrayBuffer).toString('base64');

        } else {
            console.log("Generating with DALL-E 3...");
            const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: articleData.imagePrompt + " elegant, minimalist, modern dental clinic, luxury medical aesthetic, soft lighting, gold and white color palette, photorealistic, high quality, 8k, cinematic depth of field",
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            });
            imageBase64 = imageResponse.data?.[0]?.b64_json;
        }

        if (!imageBase64) throw new Error("Błąd generowania obrazka");

        // 3. Upload to GitHub
        // Use a timestamp to ensure unique filename even if slug is reused
        const timestamp = Date.now();
        const filename = `news-${articleData.slug}-${timestamp}.png`;
        const targetPath = `public/images/news/${filename}`;

        // Ensure directory structure in public/images/news/ if needed, but uploadToRepo usually handles paths.
        // We put it in public/images/news to keep it organized.

        const commitMsg = `feat(content): add AI generated image for ${articleData.slug}`;
        const uploadSuccess = await uploadToRepo(targetPath, imageBase64, commitMsg, 'base64');

        if (!uploadSuccess) throw new Error("Błąd uploadu zdjęcia na GitHub");

        // Public URL for the image
        // Assuming the repo is public or deployed via Vercel, the image will be available relative to root
        // But since we just committed, it might take a moment to be visible on Vercel unless we use raw.githubusercontent or wait for rebuild.
        // However, for Next.js <Image>, we usually ship assets at build time. 
        // DYNAMIC CONTENT PROBLEM: 
        // If we push to 'public/', it requires a rebuild to be served by Next.js as a static asset.
        // BUT, we can use the "raw.githubusercontent.com" URL for immediate display!
        // Repository: novik-code/mikrostomart

        const rawImageUrl = `https://raw.githubusercontent.com/novik-code/mikrostomart/main/${targetPath}`;

        return NextResponse.json({
            ...articleData,
            image: rawImageUrl
        });

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
