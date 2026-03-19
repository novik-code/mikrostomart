import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list all schedules (with platform names)
export async function GET() {
    try {
        const { data: schedules, error } = await supabase
            .from('social_schedules')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch platform names for display
        const allPlatformIds = new Set<string>();
        (schedules || []).forEach((s: any) => {
            (s.platform_ids || []).forEach((pid: string) => allPlatformIds.add(pid));
        });

        let platformMap: Record<string, any> = {};
        if (allPlatformIds.size > 0) {
            const { data: platforms } = await supabase
                .from('social_platforms')
                .select('id, platform, account_name')
                .in('id', Array.from(allPlatformIds));

            (platforms || []).forEach((p: any) => {
                platformMap[p.id] = p;
            });
        }

        const enriched = (schedules || []).map((s: any) => ({
            ...s,
            platforms_info: (s.platform_ids || []).map((pid: string) => platformMap[pid] || { id: pid, platform: '?', account_name: '?' }),
        }));

        return NextResponse.json({ schedules: enriched });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST — create new schedule
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, platform_ids, content_type, ai_prompt, frequency, cron_expression, preferred_hour, preferred_days, auto_publish } = body;

        if (!name || !platform_ids?.length || !content_type || !frequency) {
            return NextResponse.json({ error: 'Missing required fields: name, platform_ids, content_type, frequency' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('social_schedules')
            .insert({
                name,
                platform_ids,
                content_type,
                ai_prompt: ai_prompt || null,
                frequency,
                cron_expression: cron_expression || null,
                preferred_hour: preferred_hour ?? 10,
                preferred_days: preferred_days || [1, 2, 3, 4, 5, 6, 7],
                auto_publish: auto_publish || false,
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ schedule: data }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT — update schedule
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('social_schedules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ schedule: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove schedule
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('social_schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
