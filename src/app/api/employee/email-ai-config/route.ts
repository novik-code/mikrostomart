/**
 * Employee Email AI Config API — admin-only CRUD for:
 * - Sender rules (include/exclude patterns)
 * - Training instructions (free-text AI instructions)
 * - Feedback/learning history (read-only)
 * 
 * GET:    Returns { rules[], instructions[], feedback[], stats }
 * POST:   Create rule or instruction ({ type: 'rule' | 'instruction', ... })
 * PUT:    Update rule or instruction ({ type: 'rule' | 'instruction', id, ... })
 * DELETE: Remove rule or instruction (?type=rule|instruction&id=UUID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(): Promise<{ userId: string; email: string } | null> {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return null;
    return { userId: user.id, email: user.email || '' };
}

// ─── GET: Fetch all config ──────────────────────────────────────

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const [
            { data: rules, error: rulesErr },
            { data: instructions, error: instrErr },
            { data: feedback, error: fbErr },
            { data: stats, error: statsErr },
        ] = await Promise.all([
            supabase
                .from('email_ai_sender_rules')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase
                .from('email_ai_instructions')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase
                .from('email_ai_feedback')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20),
            // Stats: count drafts by status
            supabase
                .from('email_ai_drafts')
                .select('status, admin_rating'),
        ]);

        if (rulesErr) throw rulesErr;
        if (instrErr) throw instrErr;
        if (fbErr) throw fbErr;

        // Compute stats
        const allDrafts = stats || [];
        const draftStats = {
            total: allDrafts.length,
            pending: allDrafts.filter((d: any) => d.status === 'pending').length,
            approved: allDrafts.filter((d: any) => d.status === 'approved').length,
            sent: allDrafts.filter((d: any) => d.status === 'sent').length,
            rejected: allDrafts.filter((d: any) => d.status === 'rejected').length,
            learned: allDrafts.filter((d: any) => d.status === 'learned').length,
            avgRating: (() => {
                const rated = allDrafts.filter((d: any) => d.admin_rating);
                if (rated.length === 0) return null;
                return Math.round(rated.reduce((sum: number, d: any) => sum + d.admin_rating, 0) / rated.length * 10) / 10;
            })(),
        };

        // Fetch knowledge base (DB override or static file)
        const { data: kbRow } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'ai_knowledge_base')
            .maybeSingle();

        const knowledgeBase = kbRow?.value || KNOWLEDGE_BASE;

        return NextResponse.json({
            rules: rules || [],
            instructions: instructions || [],
            feedback: feedback || [],
            stats: draftStats,
            knowledgeBase,
        });
    } catch (err: any) {
        console.error('[Email AI Config] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── POST: Create rule or instruction ───────────────────────────

export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type } = body;

        if (type === 'rule') {
            const { email_pattern, rule_type, note } = body;
            if (!email_pattern) {
                return NextResponse.json({ error: 'Missing email_pattern' }, { status: 400 });
            }

            const { data, error } = await supabase
                .from('email_ai_sender_rules')
                .insert({
                    email_pattern: email_pattern.toLowerCase().trim(),
                    rule_type: rule_type || 'exclude',
                    note: note || null,
                    created_by: admin.email,
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ rule: data });
        }

        if (type === 'instruction') {
            const { instruction, category } = body;
            if (!instruction) {
                return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });
            }

            const { data, error } = await supabase
                .from('email_ai_instructions')
                .insert({
                    instruction: instruction.trim(),
                    category: category || 'other',
                    is_active: true,
                    created_by: admin.email,
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ instruction: data });
        }

        return NextResponse.json({ error: 'Invalid type — use "rule" or "instruction"' }, { status: 400 });
    } catch (err: any) {
        console.error('[Email AI Config] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── PUT: Update rule or instruction ────────────────────────────

export async function PUT(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        if (type === 'rule') {
            const updates: Record<string, any> = {};
            if (body.email_pattern !== undefined) updates.email_pattern = body.email_pattern.toLowerCase().trim();
            if (body.rule_type !== undefined) updates.rule_type = body.rule_type;
            if (body.note !== undefined) updates.note = body.note;

            const { data, error } = await supabase
                .from('email_ai_sender_rules')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ rule: data });
        }

        if (type === 'instruction') {
            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (body.instruction !== undefined) updates.instruction = body.instruction.trim();
            if (body.category !== undefined) updates.category = body.category;
            if (body.is_active !== undefined) updates.is_active = body.is_active;

            const { data, error } = await supabase
                .from('email_ai_instructions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ instruction: data });
        }

        if (type === 'knowledge_base') {
            const { content } = body;
            if (!content || typeof content !== 'string') {
                return NextResponse.json({ error: 'Missing content' }, { status: 400 });
            }

            // Upsert into site_settings
            const { data: existing } = await supabase
                .from('site_settings')
                .select('key')
                .eq('key', 'ai_knowledge_base')
                .single();

            if (existing) {
                await supabase
                    .from('site_settings')
                    .update({ value: content, updated_at: new Date().toISOString() })
                    .eq('key', 'ai_knowledge_base');
            } else {
                await supabase
                    .from('site_settings')
                    .insert({ key: 'ai_knowledge_base', value: content });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid type — use "rule", "instruction", or "knowledge_base"' }, { status: 400 });
    } catch (err: any) {
        console.error('[Email AI Config] PUT error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── DELETE: Remove rule or instruction ─────────────────────────

export async function DELETE(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
        return NextResponse.json({ error: 'Missing type and id params' }, { status: 400 });
    }

    try {
        const table = type === 'rule' ? 'email_ai_sender_rules'
            : type === 'instruction' ? 'email_ai_instructions'
                : null;

        if (!table) {
            return NextResponse.json({ error: 'Invalid type — use "rule" or "instruction"' }, { status: 400 });
        }

        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Email AI Config] DELETE error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
