/**
 * API: Social Topics CRUD + AI Generation
 * 
 * GET    — list all topics (optional ?active=true)
 * POST   — create topic OR generate AI topics (action: 'generate')
 * PUT    — update topic
 * DELETE — delete topic (?id=...)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import OpenAI from 'openai';
import { demoSanitize } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── GET — list topics ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
        .from('social_topics')
        .select('*')
        .order('created_at', { ascending: false });

    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Compute categories for filter
    const categories = [...new Set((data || []).map((t: any) => t.category).filter(Boolean))];

    return NextResponse.json({ topics: data || [], categories });
}

// ── POST — create topic OR generate AI topics ──────────────────────
export async function POST(req: NextRequest) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // AI Generate mode
    if (body.action === 'generate') {
        const count = body.count || 10;
        const category = body.category || '';

        // Get existing topics to avoid duplicates
        const { data: existing } = await supabase
            .from('social_topics')
            .select('topic');
        const existingTopics = (existing || []).map((t: any) => t.topic);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const categoryInstruction = category
            ? `Kategoria: ${category}. Wszystkie tematy powinny dotyczyć tej kategorii.`
            : 'Tematy powinny obejmować różne aspekty stomatologii.';

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Jesteś redaktorem bloga stomatologicznego kliniki Mikrostomart w Opolu.
Wygeneruj ${count} UNIKALNYCH tematów na posty w social media.
${categoryInstruction}

Tematy powinny być:
- Chwytliwe i angażujące
- Edukacyjne ale przystępne
- Z perspektywy pacjenta (co go interesuje, co go boli, czego się boi)
- Mieszanka: porady, mity vs fakty, nowości technologiczne, case studies

NIE powtarzaj tych tematów:
${existingTopics.slice(0, 50).join('\n')}

Odpowiedz WYŁĄCZNIE w JSON:
{
    "topics": [
        { "topic": "Tytuł tematu", "category": "kategoria" }
    ]
}

Dostępne kategorie: ogólne, implantologia, estetyka, higiena, endodoncja, protetyka, ortodoncja, chirurgia, laser, dzieci`
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.9,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        const newTopics = result.topics || [];

        if (newTopics.length === 0) {
            return NextResponse.json({ error: 'AI nie wygenerowało tematów' }, { status: 500 });
        }

        // Insert all generated topics
        const insertData = newTopics.map((t: any) => ({
            topic: t.topic,
            category: t.category || 'ogólne',
            created_by: 'ai',
        }));

        const { data: inserted, error: insertErr } = await supabase
            .from('social_topics')
            .insert(insertData)
            .select();

        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

        return NextResponse.json({ generated: inserted?.length || 0, topics: inserted });
    }

    // Manual create mode
    if (!body.topic) {
        return NextResponse.json({ error: 'Temat wymagany' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('social_topics')
        .insert({
            topic: body.topic,
            category: body.category || 'ogólne',
            created_by: 'admin',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ topic: data });
}

// ── PUT — update topic ─────────────────────────────────────────────
export async function PUT(req: NextRequest) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID wymagane' }, { status: 400 });

    const updates: any = {};
    if (body.topic !== undefined) updates.topic = body.topic;
    if (body.category !== undefined) updates.category = body.category;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { error } = await supabase
        .from('social_topics')
        .update(updates)
        .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}

// ── DELETE — delete topic ──────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wymagane' }, { status: 400 });

    const { error } = await supabase
        .from('social_topics')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
