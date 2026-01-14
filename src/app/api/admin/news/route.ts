
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';

function isAuthenticated(req: NextRequest): boolean {
    const authHeader = req.headers.get("x-admin-password");
    const envPassword = process.env.ADMIN_PASSWORD || "admin123";
    return authHeader === envPassword;
}

// Helper to get Supabase Client
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: List all news (for admin)
export async function GET(req: NextRequest) {
    if (!isAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (!isAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
            image: body.image || "/images/placeholder.jpg"
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
    if (!isAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (!isAuthenticated(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
                image: body.image
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
