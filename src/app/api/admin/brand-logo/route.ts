import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAdmin() {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    return isAdmin ? user : null;
}

// POST /api/admin/brand-logo — upload logo image
export async function POST(request: NextRequest) {
    const user = await checkAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('logo') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: PNG, JPG, SVG, WebP' },
                { status: 400 }
            );
        }

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File too large. Max 2MB.' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `brand-logo-${Date.now()}.${ext}`;

        // Upload to Supabase Storage (bucket: brand-assets)
        const { error: uploadError } = await supabase.storage
            .from('brand-assets')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            // If bucket doesn't exist, try creating it
            if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
                await supabase.storage.createBucket('brand-assets', {
                    public: true,
                    fileSizeLimit: 2 * 1024 * 1024,
                    allowedMimeTypes: allowedTypes,
                });

                // Retry upload
                const { error: retryError } = await supabase.storage
                    .from('brand-assets')
                    .upload(fileName, buffer, {
                        contentType: file.type,
                        upsert: true,
                    });

                if (retryError) {
                    return NextResponse.json({ error: retryError.message }, { status: 500 });
                }
            } else {
                return NextResponse.json({ error: uploadError.message }, { status: 500 });
            }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('brand-assets')
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            fileName,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
