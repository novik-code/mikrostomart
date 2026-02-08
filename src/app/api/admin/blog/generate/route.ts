
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { uploadToRepo } from "@/lib/githubService";
import { verifyAdmin } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { topic, instructions, model } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // 1. Generate Blog Post Content (GPT-4o) — long-form, Dr. Marcin's style
        const systemPrompt = `Jesteś Marcinem Nowosielskim — dentystą z Opola, prowadzącym klinikę Mikrostomart. 
Piszesz artykuł na swojego bloga. Twój styl pisania:
- Piszesz w PIERWSZEJ OSOBIE liczby pojedynczej (ja, mój gabinet, moi pacjenci)
- Język jest przystępny, ciepły i luźny — jak rozmowa z pacjentem
- Używasz porównań i metafor z życia codziennego, żeby wytłumaczyć skomplikowane rzeczy
- Wspominasz o swoim doświadczeniu, przypadkach z gabinetu (anonimowo)
- Jesteś pasjonatem stomatologii mikroskopowej, implantologii i laserów
- Kończysz artykuły zaproszeniem do wizyty lub konsultacji w Mikrostomart
- Twój gabinet jest w Opolu, pracujesz z mikroskopem, laserem Fotona LightWalker, drukarką 3D

WYMAGANIA DOTYCZĄCE ARTYKUŁU:
- Długość: 800-1200 słów (MINIMUM 800 słów — to jest absolutne minimum!)
- Struktura: wstęp → rozwinięcie z nagłówkami → praktyczne porady → podsumowanie  
- Formatowanie: Markdown z ## nagłówkami, **pogrubieniami**, listami punktowymi
- Ton: profesjonalny ale przystępny, nie akademicki
- Dodaj 3-5 praktycznych porad dla pacjentów
- Wspomniej przynajmniej jedną anegdotę z gabinetu (zmyśloną ale realistyczną)

Dodatkowe wskazówki od użytkownika: "${instructions || "Brak"}".

Zwróć odpowiedź WYŁĄCZNIE w poprawnym formacie JSON:
{
    "title": "Chwytliwy, SEO-friendly tytuł (50-80 znaków)",
    "slug": "url-friendly-slug-bez-polskich-znakow-z-myslnikami",
    "excerpt": "Wciągający wstęp zachęcający do czytania (150-200 znaków). Powinien wzbudzać ciekawość.",
    "content": "Pełna treść artykułu w formacie Markdown. MINIMUM 800 słów.",
    "tags": ["tag1", "tag2", "tag3", "tag4"],
    "imagePrompt": "Detailed English prompt for generating a premium blog header image. The image should have: dark moody background with deep blacks and charcoal tones, subtle gold/amber accent lighting, modern luxury dental clinic aesthetic, photorealistic quality, cinematic composition, shallow depth of field, dramatic lighting. Canon R5, 85mm f/1.4 lens, professional studio lighting. ${model === 'flux-dev' ? 'Hyper-detailed textures, natural skin tones, volumetric lighting, 8K resolution.' : 'DALL-E 3 photorealistic style, elegant composition.'}"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Temat artykułu: ${topic}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8, // Higher creativity for Dr. Marcin's personal style
            max_tokens: 4096, // Ensure enough room for long articles
        });

        const articleData = JSON.parse(completion.choices[0].message.content || "{}");
        if (!articleData.title) throw new Error("Błąd generowania treści przez AI");

        // 2. Generate Image (Flux or DALL-E)
        let imageBase64: string | undefined;

        if (model === 'flux-dev' || !model) {
            console.log("Blog: Generating with Flux (Replicate)...");
            try {
                const Replicate = require("replicate");
                const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

                const input = {
                    prompt: articleData.imagePrompt +
                        " Ultra-premium dental photography, dark moody atmosphere, gold accent lighting, bokeh background, magazine cover quality, luxury medical brand aesthetic, no text overlays",
                    go_fast: true,
                    output_format: "png",
                    aspect_ratio: "16:9",
                    output_quality: 100,
                };

                const output: any = await replicate.run("black-forest-labs/flux-dev", { input });
                const imageUrl = Array.isArray(output) ? output[0] : output;

                const imgRes = await fetch(imageUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            } catch (fluxErr: any) {
                console.error("Flux Error (falling back to DALL-E):", fluxErr.message);
                // Fallback to DALL-E
                const imageResponse = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: articleData.imagePrompt +
                        " Premium dental clinic, dark moody background, gold accent lighting, luxury brand aesthetic, magazine quality photography",
                    n: 1,
                    size: "1792x1024",
                    response_format: "b64_json",
                });
                imageBase64 = imageResponse.data?.[0]?.b64_json;
            }
        } else {
            console.log("Blog: Generating with DALL-E 3...");
            const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: articleData.imagePrompt +
                    " Premium dental clinic, dark moody background, gold accent lighting, luxury brand aesthetic, magazine quality photography",
                n: 1,
                size: "1792x1024",
                response_format: "b64_json",
            });
            imageBase64 = imageResponse.data?.[0]?.b64_json;
        }

        if (!imageBase64) throw new Error("Błąd generowania obrazka");

        // 3. Upload to GitHub
        const timestamp = Date.now();
        const filename = `blog-${articleData.slug}-${timestamp}.png`;
        const targetPath = `public/images/blog/${filename}`;

        const commitMsg = `feat(blog): add AI generated image for ${articleData.slug}`;
        const uploadSuccess = await uploadToRepo(targetPath, imageBase64, commitMsg, 'base64');

        if (!uploadSuccess) throw new Error("Błąd uploadu zdjęcia na GitHub");

        const rawImageUrl = `https://raw.githubusercontent.com/novik-code/mikrostomart/main/${targetPath}`;

        return NextResponse.json({
            title: articleData.title,
            slug: articleData.slug,
            excerpt: articleData.excerpt,
            content: articleData.content,
            tags: articleData.tags || [],
            image: rawImageUrl,
        });

    } catch (error: any) {
        console.error("Blog AI Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
