
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/auth";

export const runtime = 'nodejs';

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: List all blog posts
export async function GET(req: NextRequest) {
    // Optional: allow public access for fetching? No, admin API is for admin. Public uses client supabase.
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

// POST: Create new blog post
export async function POST(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const supabase = getSupabase();

        // Validation
        if (!body.title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const payload = {
            title: body.title,
            slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            excerpt: body.excerpt || "",
            content: body.content || "",
            date: body.date,
            image: body.image || null,
            tags: body.tags || [],
            is_published: true
        };

        const { data, error } = await supabase.from('blog_posts').insert(payload).select().single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove blog post
export async function DELETE(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = getSupabase();
        const { error } = await supabase.from('blog_posts').delete().eq('id', id);

        if (error) throw error;
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
