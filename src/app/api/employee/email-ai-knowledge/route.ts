/**
 * Employee Email AI Knowledge Files API
 * 
 * GET:    List all knowledge files
 * POST:   Upload and parse a file (PDF or TXT), store extracted text
 * DELETE: Remove a knowledge file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

async function requireAdmin(): Promise<{ userId: string } | null> {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return null;
    return { userId: user.id };
}

// ─── GET: List all knowledge files ───────────────────────────

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from('email_ai_knowledge_files')
            .select('id, filename, file_size, description, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ files: data || [] });
    } catch (err: any) {
        console.error('[AI Knowledge] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── POST: Upload and parse a file ──────────────────────────

export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Check file count limit
        const { count } = await supabase
            .from('email_ai_knowledge_files')
            .select('id', { count: 'exact', head: true });

        if ((count || 0) >= MAX_FILES) {
            return NextResponse.json({
                error: `Limit ${MAX_FILES} plików osiągnięty. Usuń stare pliki przed dodaniem nowych.`
            }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const description = (formData.get('description') as string) || '';

        if (!file) {
            return NextResponse.json({ error: 'Brak pliku' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: `Plik za duży (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${MAX_FILE_SIZE / 1024 / 1024} MB`
            }, { status: 400 });
        }

        const filename = file.name;
        const isPdf = filename.toLowerCase().endsWith('.pdf');
        const isTxt = filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.md');

        if (!isPdf && !isTxt) {
            return NextResponse.json({
                error: 'Obsługiwane formaty: PDF, TXT, MD'
            }, { status: 400 });
        }

        let contentText = '';

        if (isPdf) {
            const buffer = Buffer.from(await file.arrayBuffer());
            try {
                const pdfParse = (await import('pdf-parse')).default;
                const pdfData = await pdfParse(buffer);
                contentText = pdfData.text || '';
            } catch (pdfErr: any) {
                console.error('[AI Knowledge] PDF parse error:', pdfErr);
                return NextResponse.json({
                    error: `Błąd parsowania PDF: ${pdfErr.message}`
                }, { status: 400 });
            }
        } else {
            // TXT / MD — read as UTF-8 text
            const buffer = Buffer.from(await file.arrayBuffer());
            contentText = buffer.toString('utf-8');
        }

        if (contentText.trim().length < 10) {
            return NextResponse.json({
                error: 'Plik jest pusty lub zawiera za mało tekstu'
            }, { status: 400 });
        }

        // Truncate very long content (max ~50K chars)
        if (contentText.length > 50000) {
            contentText = contentText.substring(0, 50000) + '\n\n[... treść skrócona do 50 000 znaków]';
        }

        const { data, error } = await supabase
            .from('email_ai_knowledge_files')
            .insert({
                filename,
                file_size: file.size,
                content_text: contentText,
                description,
                uploaded_by: admin.userId,
            })
            .select('id, filename, file_size, description, created_at')
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            file: data,
            textLength: contentText.length,
        });
    } catch (err: any) {
        console.error('[AI Knowledge] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── DELETE: Remove a knowledge file ─────────────────────────

export async function DELETE(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const { error } = await supabase
            .from('email_ai_knowledge_files')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[AI Knowledge] DELETE error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
