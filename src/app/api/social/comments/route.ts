import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET — list comment replies with filters
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const platform = searchParams.get('platform');
        const postId = searchParams.get('post_id');
        const limit = parseInt(searchParams.get('limit') || '100', 10);

        let query = supabase
            .from('social_comment_replies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status && status !== 'all') query = query.eq('status', status);
        if (platform && platform !== 'all') query = query.eq('platform', platform);
        if (postId) query = query.eq('post_id', postId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ comments: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH — update reply (approve, reject, edit text, skip)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, action, reply_text } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const updates: any = {};

        switch (action) {
            case 'approve':
                updates.status = 'approved';
                if (reply_text) updates.reply_text = reply_text;
                break;
            case 'reject':
                updates.status = 'rejected';
                break;
            case 'skip':
                updates.status = 'skipped';
                break;
            case 'edit':
                if (!reply_text) return NextResponse.json({ error: 'reply_text is required' }, { status: 400 });
                updates.reply_text = reply_text;
                break;
            default:
                // Direct field update
                if (reply_text) updates.reply_text = reply_text;
                if (body.status) updates.status = body.status;
        }

        const { data, error } = await supabase
            .from('social_comment_replies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ comment: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove a reply record
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabase
            .from('social_comment_replies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
