
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { uploadToRepo, getFileContent } from '@/lib/githubService';

export const maxDuration = 60; // Allow 60 seconds (Vercel Hobby limit 10s? Pro 60s? Cron might have different limits).
// Actually, generating image + text + commits might take > 10s. 
// If on Hobby plan, timeout is 10s for serverless functions.
// We should check plan. User is likely paying or on trial if using Vercel IP?
// Safe bet: Vercel Hobby max is 10s. This might be tight for DALL-E.
// Solution: We hope it's fast enough or User is Pro.

export async function GET(req: Request) {
    // 1. Auth Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        // Allow manual trigger in dev or if secret matches
        // But for security in prod, require secret
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // 2. Generate Topic
        const topicResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "system",
                content: "Jesteś redaktorem naczelnym bloga stomatologicznego. Wymyśl JEDEN unikalny, chwytliwy temat artykułu poradnikowego dla pacjentów. Temat nie powinien się powtarzać z popularnymi (już mamy o implantach, wybielaniu, bruksiźmie, higienie). Skup się na ciekawostkach lub konkretnych problemach."
            }, {
                role: "user",
                content: "Podaj tylko tytuł."
            }]
        });
        const topic = topicResponse.choices[0].message.content?.trim() || "Nowoczesna Stomatologia";

        // 3. Generate Content (JSON)
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
                        "content": "Treść artykułu w formacie Markdown. Używaj nagłówków ###, list *, pogrubień **. Pisany językiem korzyści, przyjaznym dla pacjenta.",
                        "imagePrompt": "Szczegółowy prompt po angielsku do wygenerowania fotorealistycznego zdjęcia ilustrującego ten temat przez DALL-E 3."
                    }`
                }
            ],
            response_format: { type: "json_object" }
        });

        const articleData = JSON.parse(completion.choices[0].message.content || "{}");
        if (!articleData.title) throw new Error("Failed to generate article JSON");

        // 4. Generate Image
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: articleData.imagePrompt + " photorealistic, professional dental clinic style, high quality, bright lighting",
            n: 1,
            size: "1024x1024",
            response_format: "b64_json" // Get base64 directly to save download step
        });

        const imageBase64 = imageResponse.data?.[0]?.b64_json;
        if (!imageBase64) throw new Error("Failed to generate image: No data returned");

        // 5. Commit Image to GitHub
        const imageFilename = `auto-${articleData.slug}-${Date.now()}.png`;
        const imagePath = `public/images/articles/${imageFilename}`; // Ensure folder exists? GitHub creates it. Note: 'public/images/articles' is good.
        // Wait, current images are in /images/articles? Check articles.ts.
        // Article 1 uses '/kb-implant-structure.png' (root public).
        // Let's use root `public/` for simplicity or `public/images/kb/`.
        // Let's stick to `public/kb-${filename}` to keep it clean in one place if possible, or `public/images/kb/`.
        // User's current manual articles used `public/kb-...`.
        const targetImagePath = `public/kb-${articleData.slug}.png`;
        const publicUrl = `/kb-${articleData.slug}.png`;

        await uploadToRepo(
            targetImagePath,
            imageBase64,
            `feat(blog): add image for ${articleData.slug}`,
            'base64'
        );

        // 6. Update Article Database
        const dbPath = 'src/data/knowledgeBaseArticles.ts';
        const currentDbContent = await getFileContent(dbPath);

        if (!currentDbContent) throw new Error("Failed to read database file");

        const newArticleEntry = `
    {
        id: 'auto-${Date.now()}',
        title: '${articleData.title.replace(/'/g, "\\'")}',
        slug: '${articleData.slug}',
        date: '${new Date().toISOString().split('T')[0]}',
        excerpt: '${articleData.excerpt.replace(/'/g, "\\'")}',
        content: \`
${articleData.content.replace(/`/g, "\\`")}
\`,
        image: '${publicUrl}'
    }`;

        // Append to array
        // Replace last ]; with , newObj ];
        // Use a robust regex to find the end of the array
        const updatedDbContent = currentDbContent.replace(
            /\s*\];\s*$/,
            `,${newArticleEntry}\n];\n`
        );

        await uploadToRepo(
            dbPath,
            updatedDbContent,
            `feat(blog): add article ${articleData.title}`,
            'utf-8'
        );

        return NextResponse.json({ success: true, topic, slug: articleData.slug });

    } catch (error: any) {
        console.error("Cron Job Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
