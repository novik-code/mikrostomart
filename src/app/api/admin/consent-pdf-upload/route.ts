import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/consent-pdf-upload
 * Upload a consent PDF to Supabase Storage.
 * Admin only. Accepts multipart form data with 'file' field.
 * Returns the storage path (used as pdf_file in consent_field_mappings).
 */
export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.pdf')) {
        return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9_\-\.ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '_');
    const storagePath = `consent-templates/${safeName}`;

    // Upload to Supabase Storage bucket 'consent-pdfs'
    const { error: uploadErr } = await supabase
        .storage
        .from('consent-pdfs')
        .upload(storagePath, buffer, {
            contentType: 'application/pdf',
            upsert: true,
        });

    if (uploadErr) {
        console.error('[ConsentPdfUpload] Error:', uploadErr);
        return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase
        .storage
        .from('consent-pdfs')
        .getPublicUrl(storagePath);

    return NextResponse.json({
        success: true,
        fileName: safeName,
        storagePath,
        publicUrl: urlData?.publicUrl,
    });
}
