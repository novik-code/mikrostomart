
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/auth";

export const runtime = 'nodejs';

// Helper to get Supabase Client
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: List all news (for admin)
export async function GET(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create new news article
export async function POST(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const supabase = getSupabase();

        // Simple validation
        if (!body.title || !body.date) {
            return NextResponse.json({ error: "Title and Date are required" }, { status: 400 });
        }

        const payload = {
            id: body.id || Date.now().toString(),
            title: body.title,
            slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            excerpt: body.excerpt || "",
            content: body.content || "",
            date: body.date,
            image: body.image || "/images/placeholder.jpg",
            // i18n locale columns
            title_en: body.title_en || null,
            title_de: body.title_de || null,
            title_ua: body.title_ua || null,
            excerpt_en: body.excerpt_en || null,
            excerpt_de: body.excerpt_de || null,
            excerpt_ua: body.excerpt_ua || null,
            content_en: body.content_en || null,
            content_de: body.content_de || null,
            content_ua: body.content_ua || null,
        };

        const { data, error } = await supabase.from('news').insert(payload).select().single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove news article
export async function DELETE(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = getSupabase();
        const { error } = await supabase.from('news').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update news article
export async function PUT(req: NextRequest) {
    if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('news')
            .update({
                title: body.title,
                slug: body.slug,
                excerpt: body.excerpt,
                content: body.content,
                date: body.date,
                image: body.image,
                // i18n locale columns
                title_en: body.title_en ?? undefined,
                title_de: body.title_de ?? undefined,
                title_ua: body.title_ua ?? undefined,
                excerpt_en: body.excerpt_en ?? undefined,
                excerpt_de: body.excerpt_de ?? undefined,
                excerpt_ua: body.excerpt_ua ?? undefined,
                content_en: body.content_en ?? undefined,
                content_de: body.content_de ?? undefined,
                content_ua: body.content_ua ?? undefined,
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
