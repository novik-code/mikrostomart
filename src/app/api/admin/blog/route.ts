
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { verifyAdmin } from "@/lib/auth";

export const runtime = 'nodejs';
export const maxDuration = 60;

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

const TARGET_LOCALES = ['en', 'de', 'ua'] as const;
const LOCALE_LABELS: Record<string, string> = { en: 'English', de: 'German', ua: 'Ukrainian' };

// Translate a blog post to a target locale via GPT-4o
async function translateBlogPost(
    openai: OpenAI,
    post: { title: string; slug: string; excerpt: string; content: string; tags?: string[] },
    targetLocale: string
): Promise<{ title: string; slug: string; excerpt: string; content: string; tags: string[] }> {
    const langName = LOCALE_LABELS[targetLocale] || targetLocale;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are a professional medical translator. Translate the following blog post from Polish to ${langName}.
Keep the same Markdown formatting, HTML tags, and structure.
The blog post is written by a dentist from Opole, Poland — keep the tone personal and warm.
Return ONLY valid JSON with keys: title, slug, excerpt, content, tags.
The slug must be URL-friendly (lowercase, hyphens, no special characters, no Polish/German/Ukrainian diacritics).`
            },
            {
                role: 'user',
                content: JSON.stringify({
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.excerpt,
                    content: post.content,
                    tags: post.tags || []
                })
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
}

// GET: List all blog posts
export async function GET(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create new blog post + auto-translate to EN/DE/UA
export async function POST(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const supabase = getSupabase();

        // Validation
        if (!body.title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Generate shared group_id for all language versions
        const group_id = crypto.randomUUID();

        const payload = {
            title: body.title,
            slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            excerpt: body.excerpt || "",
            content: body.content || "",
            date: body.date,
            image: body.image || null,
            tags: body.tags || [],
            is_published: true,
            locale: 'pl',
            group_id,
        };

        const { data, error } = await supabase.from('blog_posts').insert(payload).select().single();

        if (error) throw error;

        // Auto-translate to other locales (non-blocking — PL post is already saved)
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            for (const targetLocale of TARGET_LOCALES) {
                try {
                    const translated = await translateBlogPost(openai, {
                        title: payload.title,
                        slug: payload.slug,
                        excerpt: payload.excerpt,
                        content: payload.content,
                        tags: payload.tags,
                    }, targetLocale);

                    await supabase.from('blog_posts').insert({
                        title: translated.title,
                        slug: translated.slug || `${payload.slug}-${targetLocale}`,
                        excerpt: translated.excerpt,
                        content: translated.content,
                        date: payload.date,
                        image: payload.image, // Same image for all locales
                        tags: translated.tags || payload.tags,
                        is_published: true,
                        locale: targetLocale,
                        group_id,
                    });

                    console.log(`Blog: translated to ${targetLocale}`);
                } catch (translationErr: any) {
                    console.error(`Blog: failed to translate to ${targetLocale}:`, translationErr.message);
                }
            }
        } catch (aiErr: any) {
            console.error("Blog: OpenAI translation error:", aiErr.message);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove blog post + cascade all translations via group_id
export async function DELETE(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = getSupabase();

        // Find group_id of the post being deleted
        const { data: post } = await supabase
            .from('blog_posts')
            .select('group_id')
            .eq('id', id)
            .single();

        if (post?.group_id) {
            // Delete ALL translations in the group
            const { error } = await supabase
                .from('blog_posts')
                .delete()
                .eq('group_id', post.group_id);
            if (error) throw error;
        } else {
            // Fallback: delete just this post
            const { error } = await supabase.from('blog_posts').delete().eq('id', id);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update blog post
export async function PUT(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('blog_posts')
            .update({
                title: body.title,
                slug: body.slug,
                excerpt: body.excerpt,
                content: body.content,
                date: body.date,
                image: body.image,
                tags: body.tags
            })
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
