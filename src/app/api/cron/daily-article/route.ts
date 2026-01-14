
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { uploadToRepo, getFileContent } from '@/lib/githubService';

export const maxDuration = 60; // Allow 60 seconds (Vercel Hobby limit 10s? Pro 60s? Cron might have different limits).
// Actually, generating image + text + commits might take > 10s. 
// If on Hobby plan, timeout is 10s for serverless functions.
// We should check plan. User is likely paying or on trial if using Vercel IP?
// Safe bet: Vercel Hobby max is 10s. This might be tight for DALL-E.
// Solution: We hope it's fast enough or User is Pro.

// Helper to write to stream
const send = async (writer: WritableStreamDefaultWriter, msg: string) => {
    await writer.write(new TextEncoder().encode(msg + "\n"));
};

export async function GET(req: Request) {
    // 1. Auth Check using URL params or Headers (Headers preferred for security)
    const authHeader = req.headers.get('authorization');
    const adminPasswordHeader = req.headers.get('x-admin-password');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isAdminAuth = adminPasswordHeader === (process.env.ADMIN_PASSWORD || "admin123");

    if (!isCronAuth && !isAdminAuth && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Prepare Stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Start processing in background (but connected to stream)
    (async () => {
        try {
            await send(writer, "START: Inicjalizacja...");

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // Dynamic import for Supabase Admin
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
            const adminDb = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

            // 2. Determine Topic
            await send(writer, "STEP: Szukam tematu (lub pobieram pytanie)...");

            let topic = "";
            let pendingIdeaId = null;

            const { data: pendingIdeas } = await adminDb
                .from('article_ideas')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (pendingIdeas && pendingIdeas.length > 0) {
                const idea = pendingIdeas[0];
                topic = idea.question;
                pendingIdeaId = idea.id;
                await send(writer, `TOPIC: Pytanie użytkownika: ${topic}`);
            } else {
                await send(writer, "STEP: Generuję temat AI...");
                const topicResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{
                        role: "system",
                        content: "Jesteś redaktorem naczelnym bloga stomatologicznego. Wymyśl JEDEN unikalny, chwytliwy temat artykułu poradnikowego dla pacjentów."
                    }, {
                        role: "user",
                        content: "Podaj tylko tytuł."
                    }]
                });
                topic = topicResponse.choices[0].message.content?.trim() || "Nowoczesna Stomatologia";
                await send(writer, `TOPIC: AI wymyśliło: ${topic}`);
            }

            // 3. Generate Content
            await send(writer, "STEP: Piszę artykuł (GPT-4o)...");
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Napisz profesjonalny artykuł stomatologiczny na temat: "${topic}".
                        Zwróć odpowiedź WYŁĄCZNIE w formacie JSON:
                        {
                            "title": "Tytuł artykułu",
                            "slug": "url-friendly-slug-bez-polskich-znakow",
                            "excerpt": "Krótkie streszczenie (2 zdania) do kafelka.",
                            "content": "Treść artykułu w formacie Markdown. Używaj nagłówków ###, list *, pogrubień **.",
                            "imagePrompt": "Szczegółowy prompt po angielsku do wygenerowania fotorealistycznego zdjęcia ilustrującego ten temat przez DALL-E 3."
                        }`
                    }
                ],
                response_format: { type: "json_object" }
            });

            const articleData = JSON.parse(completion.choices[0].message.content || "{}");
            if (!articleData.title) throw new Error("Błąd generowania JSON");

            await send(writer, "STEP: Generuję obrazek (Flux Pro)... To może potrwać 30s.");

            // 4. Generate Image (Flux via Replicate)
            // Note: We use require here to avoid top-level await issues if any, though normally import is fine.
            const Replicate = require("replicate");
            const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

            const input = {
                prompt: articleData.imagePrompt + " photorealistic, natural lighting, luxury dental clinic, soft shadows, 8k, highly detailed, professional photography, depth of field. Canon R5, 50mm lens. High texture realism.",
                go_fast: true,
                output_format: "png",
                aspect_ratio: "16:9", // Blog posts usually look better with landscape
                output_quality: 100
            };

            let imageBase64: string | undefined;

            try {
                const output: any = await replicate.run("black-forest-labs/flux-dev", { input });
                const imageUrl = Array.isArray(output) ? output[0] : output;

                // Download image
                const imgRes = await fetch(imageUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            } catch (err: any) {
                console.error("Flux Error:", err);
                await send(writer, `ERROR: Flux failed (${err.message}). Fallback to DALL-E...`);

                // Fallback to DALL-E 3 if Flux fails (e.g. no token)
                const imageResponse = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: articleData.imagePrompt + " elegant, minimalist, modern dental clinic, luxury medical aesthetic",
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json"
                });
                imageBase64 = imageResponse.data?.[0]?.b64_json;
            }

            if (!imageBase64) throw new Error("Błąd generowania obrazka");

            // 5. Commit to GitHub
            await send(writer, "STEP: Zapisuję plik graficzny na GitHub...");
            const targetImagePath = `public/kb-${articleData.slug}.png`;
            const publicUrl = `/kb-${articleData.slug}.png`;

            const uploadSuccess = await uploadToRepo(
                targetImagePath,
                imageBase64,
                `feat(blog): add image for ${articleData.slug}`,
                'base64'
            );

            if (!uploadSuccess) throw new Error("Błąd uploadu na GitHub");

            // 6. Insert into DB
            await send(writer, "STEP: Zapisuję artykuł w bazie...");
            const { error: insertError } = await adminDb.from('articles').insert({
                title: articleData.title,
                slug: articleData.slug,
                excerpt: articleData.excerpt,
                content: articleData.content,
                image_url: publicUrl,
                published_date: new Date().toISOString().split('T')[0]
            });

            if (insertError) throw new Error(`Błąd bazy danych: ${insertError.message}`);

            if (pendingIdeaId) {
                await adminDb.from('article_ideas').update({ status: 'processed' }).eq('id', pendingIdeaId);
            }

            await send(writer, `SUCCESS: ${JSON.stringify({ title: articleData.title })}`);
        } catch (e: any) {
            console.error(e);
            await send(writer, `ERROR: ${e.message}`);
        } finally {
            await writer.close();
        }
    })();

    return new NextResponse(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
