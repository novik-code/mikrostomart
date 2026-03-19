import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list all platforms
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('social_platforms')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ platforms: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST — add new platform
export async function POST(req: NextRequest) {
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
        return NextResponse.json({ platform: data }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT — update platform
export async function PUT(req: NextRequest) {
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
        return NextResponse.json({ platform: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove platform
export async function DELETE(req: NextRequest) {
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
