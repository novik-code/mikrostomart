import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/tasks/upload-image
 * 
 * Uploads an image to Supabase Storage (task-images bucket).
 * Body: FormData with 'file' field.
 * Returns: { url: string } — the public URL of the uploaded image.
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `tasks/${filename}`;

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('task-images')
            .upload(path, buffer, {
                contentType: file.type,
                cacheControl: '3600',
            });

        if (error) {
            console.error('[TaskUpload] Storage error:', error);
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('task-images')
            .getPublicUrl(path);

        console.log(`[TaskUpload] Uploaded ${filename} by ${user.email}`);
        return NextResponse.json({ url: urlData.publicUrl });

    } catch (error: any) {
        console.error('[TaskUpload] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
