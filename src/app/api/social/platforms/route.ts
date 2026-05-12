import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/authGuards';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Strip raw OAuth tokens from a platform row before returning to the client.
// Admin UI only needs to know that a token exists + when it expires, never
// the secret itself (audit P0-04).
function maskPlatform(p: Record<string, any>) {
    const { access_token, refresh_token, ...rest } = p;
    return {
        ...rest,
        has_access_token: !!access_token,
        has_refresh_token: !!refresh_token,
        token_expires_at: p.token_expires_at ?? null,
    };
}

// GET — list all platforms (tokens masked)
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { data, error } = await supabase
            .from('social_platforms')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ platforms: (data || []).map(maskPlatform) });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST — add new platform
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const body = await req.json();
        const { platform, account_name, account_id, account_url, content_type, access_token, refresh_token, token_expires_at, config } = body;

        if (!platform) {
            return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('social_platforms')
            .insert({
                platform,
                account_name: account_name || null,
                account_id: account_id || null,
                account_url: account_url || null,
                content_type: content_type || 'all',
                access_token: access_token || null,
                refresh_token: refresh_token || null,
                token_expires_at: token_expires_at || null,
                config: config || {},
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ platform: maskPlatform(data) }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT — update platform
export async function PUT(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('social_platforms')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ platform: maskPlatform(data) });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove platform
export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('social_platforms')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
