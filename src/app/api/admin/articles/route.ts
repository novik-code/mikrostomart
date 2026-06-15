import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/authGuards";
import { uploadToRepo } from "@/lib/githubService";
import { getAICompletion } from "@/lib/unifiedAI";

export const runtime = 'nodejs';
// publish action generuje obrazek (Flux ~30s) + 3 tłumaczenia (~30-45s)
export const maxDuration = 300;

const TRANSLATE_LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'ua', name: 'Ukrainian' },
] as const;

function db() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
    return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Generuje obrazek (Flux Dev → DALL-E fallback) i commituje do repo public/kb-<slug>.png.
// Zwraca publiczny URL albo null (obrazek opcjonalny — artykuł publikuje się i bez niego).
async function generateAndUploadImage(slug: string, title: string): Promise<string | null> {
    const prompt = `Editorial photo illustrating a Polish dental clinic article titled "${title}". `
        + `photorealistic, natural lighting, luxury dental clinic, soft shadows, 8k, highly detailed, `
        + `professional photography, depth of field. Canon R5, 50mm lens. High texture realism.`;
    let imageBase64: string | undefined;
    try {
        const Replicate = require("replicate");
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
        const output: any = await replicate.run("black-forest-labs/flux-dev", {
            input: { prompt, go_fast: true, output_format: "png", aspect_ratio: "16:9", output_quality: 100 },
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        const imgRes = await fetch(imageUrl);
        imageBase64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
    } catch {
        try {
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const r = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt + " elegant, minimalist, modern dental clinic, luxury medical aesthetic",
                n: 1, size: "1024x1024", response_format: "b64_json",
            });
            imageBase64 = r.data?.[0]?.b64_json;
        } catch { return null; }
    }
    if (!imageBase64) return null;
    const ok = await uploadToRepo(`public/kb-${slug}.png`, imageBase64, `feat(kb): image for ${slug}`, 'base64');
    return ok ? `/kb-${slug}.png` : null;
}

// GET: List all articles
export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        // Use fallback URL logic same as other endpoints
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('published_date', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove an article and all its translations (same group_id)
export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // First get the group_id of the article being deleted
        const { data: article } = await supabase
            .from('articles')
            .select('group_id')
            .eq('id', id)
            .single();

        if (article?.group_id) {
            // Delete all translations in the same group
            const { error } = await supabase
                .from('articles')
                .delete()
                .eq('group_id', article.group_id);
            if (error) throw error;
        } else {
            // Fallback: just delete by id
            const { error } = await supabase
                .from('articles')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: akcje na artykule — publish (obrazek + tłumaczenia + publikacja) lub reject (usuń).
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    try {
        const { action, id } = (await req.json()) || {};
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const supabase = db();

        if (action === 'reject') {
            const { data: art } = await supabase.from('articles').select('group_id').eq('id', id).single();
            if (art?.group_id) {
                await supabase.from('articles').delete().eq('group_id', art.group_id);
            } else {
                await supabase.from('articles').delete().eq('id', id);
            }
            return NextResponse.json({ success: true, action: 'rejected' });
        }

        if (action === 'publish') {
            const { data: article, error: fErr } = await supabase
                .from('articles').select('*').eq('id', id).single();
            if (fErr || !article) return NextResponse.json({ error: "Artykuł nie znaleziony" }, { status: 404 });

            const groupId = article.group_id || crypto.randomUUID();
            const today = new Date().toISOString().split('T')[0];

            // 1. Obrazek (jeśli draft go nie ma) — opcjonalny.
            let imageUrl: string | null = article.image_url || null;
            if (!imageUrl) imageUrl = await generateAndUploadImage(article.slug, article.title);

            // 2. Publikuj PL NAJPIERW (błąd tłumaczeń nie blokuje publikacji).
            const { error: upErr } = await supabase.from('articles').update({
                status: 'published',
                published_date: today,
                group_id: groupId,
                ...(imageUrl ? { image_url: imageUrl } : {}),
            }).eq('id', id);
            if (upErr) throw new Error(`Publikacja PL: ${upErr.message}`);

            // 3. Tłumaczenia EN/DE/UA (best-effort), jako published, ten sam group_id + obrazek.
            const translations: string[] = [];
            for (const lang of TRANSLATE_LOCALES) {
                try {
                    const { data: exists } = await supabase.from('articles')
                        .select('id').eq('group_id', groupId).eq('locale', lang.code).limit(1);
                    if (exists && exists.length > 0) continue;

                    const res = await getAICompletion({
                        context: 'translator',
                        responseFormat: 'json',
                        maxTokens: 4000,
                        temperature: 0.3,
                        messages: [{
                            role: 'user',
                            content: `Przetłumacz artykuł stomatologiczny z polskiego na ${lang.name}. Zachowaj formatowanie Markdown (##, ###, *, **) ORAZ linki wewnętrzne [tekst](/sciezka) BEZ zmiany ścieżek. Zachowaj terminologię medyczną. Zwróć WYŁĄCZNIE JSON {"title","slug","excerpt","content"} (slug ASCII a-z0-9-).\n\n${JSON.stringify({ title: article.title, slug: article.slug, excerpt: article.excerpt, content: article.content })}`,
                        }],
                    });
                    const tr = JSON.parse(res.reply || '{}');
                    if (!tr.title || !tr.content) continue;
                    const trSlug = (String(tr.slug || `${article.slug}-${lang.code}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)) || `${article.slug}-${lang.code}`;
                    await supabase.from('articles').insert({
                        title: tr.title,
                        slug: trSlug,
                        excerpt: tr.excerpt || article.excerpt,
                        content: tr.content,
                        image_url: imageUrl,
                        published_date: today,
                        locale: lang.code,
                        group_id: groupId,
                        status: 'published',
                    });
                    translations.push(lang.code);
                } catch (e: any) {
                    console.error(`[articles publish] translate ${lang.code}:`, e?.message);
                }
            }

            return NextResponse.json({ success: true, action: 'published', image: !!imageUrl, translations });
        }

        return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: edycja artykułu/draftu — title/excerpt/content/slug.
export async function PUT(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    try {
        const { id, title, excerpt, content, slug } = (await req.json()) || {};
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const patch: Record<string, any> = {};
        if (typeof title === 'string') patch.title = title;
        if (typeof excerpt === 'string') patch.excerpt = excerpt;
        if (typeof content === 'string') patch.content = content;
        if (typeof slug === 'string') patch.slug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
        if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Brak pól do aktualizacji" }, { status: 400 });
        const { error } = await db().from('articles').update(patch).eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
