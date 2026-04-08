/**
 * /api/admin/ai-knowledge
 *
 * CRUD for AI Knowledge Base sections.
 * GET  — list all sections
 * POST — create new section
 * PUT  — update section (with history log)
 * DELETE — delete section
 *
 * Auth: Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { invalidateKBCache } from '@/lib/unifiedAI';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── GET — List all KB sections ───────────────────────────────
export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('priority', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ sections: data });
}

// ── POST — Create new section ────────────────────────────────
export async function POST(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { section, title, content, context_tags, priority } = body;

    if (!section || !title) {
        return NextResponse.json({ error: 'section and title are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('ai_knowledge_base')
        .insert({
            section,
            title,
            content: content || '',
            context_tags: context_tags || ['*'],
            priority: priority || 50,
            updated_by: user.email || 'admin',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log to history
    await supabase.from('ai_knowledge_base_history').insert({
        section,
        old_content: null,
        new_content: content || '',
        change_reason: 'New section created',
        changed_by: user.email || 'admin',
    });

    invalidateKBCache();
    return NextResponse.json({ section: data }, { status: 201 });
}

// ── PUT — Update section ─────────────────────────────────────
export async function PUT(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { section, title, content, context_tags, priority, is_active, change_reason } = body;

    if (!section) {
        return NextResponse.json({ error: 'section is required' }, { status: 400 });
    }

    // Get old content for history
    const { data: existing } = await supabase
        .from('ai_knowledge_base')
        .select('content')
        .eq('section', section)
        .single();

    // Build update object — only include fields that were provided
    const update: Record<string, any> = {
        updated_at: new Date().toISOString(),
        updated_by: user.email || 'admin',
    };
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (context_tags !== undefined) update.context_tags = context_tags;
    if (priority !== undefined) update.priority = priority;
    if (is_active !== undefined) update.is_active = is_active;

    const { data, error } = await supabase
        .from('ai_knowledge_base')
        .update(update)
        .eq('section', section)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log to history
    if (content !== undefined && existing?.content !== content) {
        await supabase.from('ai_knowledge_base_history').insert({
            section,
            old_content: existing?.content || null,
            new_content: content,
            change_reason: change_reason || 'Manual edit by admin',
            changed_by: user.email || 'admin',
        });
    }

    invalidateKBCache();
    return NextResponse.json({ section: data });
}

// ── DELETE — Remove section ──────────────────────────────────
export async function DELETE(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');

    if (!section) {
        return NextResponse.json({ error: 'section param required' }, { status: 400 });
    }

    // Prevent deleting core sections
    const PROTECTED_SECTIONS = ['core', 'pricing', 'brand_voice'];
    if (PROTECTED_SECTIONS.includes(section)) {
        return NextResponse.json({ error: `Cannot delete protected section: ${section}` }, { status: 403 });
    }

    const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('section', section);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateKBCache();
    return NextResponse.json({ deleted: section });
}
