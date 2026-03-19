import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list media with optional tag/type filter
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fileType = searchParams.get('type');
        const tag = searchParams.get('tag');
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        let query = supabase
            .from('social_media_library')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (fileType) {
            query = query.eq('file_type', fileType);
        }

        if (tag) {
            query = query.contains('tags', [tag]);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ media: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST — upload media to Supabase Storage + save record
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const tags = formData.get('tags') as string;
        const description = formData.get('description') as string;

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        const ext = file.name.split('.').pop() || 'bin';
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const storagePath = `social-media/${fileName}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from('social-media')
            .upload(fileName, Buffer.from(arrayBuffer), {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            // If bucket doesn't exist, try to create it
            if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
                // Bucket may not exist — create it then retry
                await supabase.storage.createBucket('social-media', { public: true });
                const { error: retryError } = await supabase.storage
                    .from('social-media')
                    .upload(fileName, Buffer.from(arrayBuffer), {
                        contentType: file.type,
                        upsert: false,
                    });
                if (retryError) throw retryError;
            } else {
                throw uploadError;
            }
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(fileName);
        const fileUrl = urlData.publicUrl;

        // Save record to DB
        const parsedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        const { data, error: dbError } = await supabase
            .from('social_media_library')
            .insert({
                file_url: fileUrl,
                file_type: fileType,
                file_name: file.name,
                file_size: file.size,
                tags: parsedTags,
                description: description || null,
            })
            .select()
            .single();

        if (dbError) throw dbError;
        return NextResponse.json({ media: data }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove media file + record
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Get file info to delete from storage
        const { data: media } = await supabase
            .from('social_media_library')
            .select('file_url')
            .eq('id', id)
            .single();

        if (media?.file_url) {
            // Extract filename from URL
            const urlParts = media.file_url.split('/');
            const storageName = urlParts[urlParts.length - 1];
            if (storageName) {
                await supabase.storage.from('social-media').remove([storageName]);
            }
        }

        const { error } = await supabase
            .from('social_media_library')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
