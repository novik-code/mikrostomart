import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list posts with optional status filter
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        let query = supabase
            .from('social_posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ posts: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST — create manual draft post
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { platform_ids, content_type, text_content, hashtags, image_url, video_url, scheduled_for, admin_notes } = body;

        if (!content_type) {
            return NextResponse.json({ error: 'content_type is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('social_posts')
            .insert({
                platform_ids: platform_ids || [],
                content_type,
                text_content: text_content || null,
                hashtags: hashtags || [],
                image_url: image_url || null,
                video_url: video_url || null,
                scheduled_for: scheduled_for || null,
                admin_notes: admin_notes || null,
                status: 'draft',
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ post: data }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT — update post (approve, reject, edit)
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, action, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Handle special actions
        if (action === 'approve') {
            const { data, error } = await supabase
                .from('social_posts')
                .update({ status: 'approved', edited_by: 'admin' })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ post: data });
        }

        if (action === 'reject') {
            const { data, error } = await supabase
                .from('social_posts')
                .update({ status: 'rejected', admin_notes: updates.admin_notes || null })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ post: data });
        }

        // If text_content is being updated, save original AI text first (for AI learning)
        if (updates.text_content) {
            const { data: existing } = await supabase
                .from('social_posts')
                .select('text_content, original_ai_text')
                .eq('id', id)
                .single();
            
            // Only save original if not already saved (first edit)
            if (existing && !existing.original_ai_text && existing.text_content) {
                updates.original_ai_text = existing.text_content;
            }
        }

        // Generic update
        const { data, error } = await supabase
            .from('social_posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ post: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove post
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('social_posts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
