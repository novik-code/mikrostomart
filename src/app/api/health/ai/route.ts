/**
 * GET /api/health/ai
 * 
 * Health check endpoint for all AI dependencies.
 * Returns status of: OpenAI API, Supabase, Knowledge Base, Prodentis tunnel,
 * Replicate, Mirage/Captions, and key Supabase tables.
 * 
 * Auth: Admin only (verifyAdmin)
 * Usage: ?verbose=true for detailed output
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface CheckResult {
    name: string;
    status: 'ok' | 'warning' | 'error';
    detail: string;
    latencyMs?: number;
}

async function timedCheck(name: string, fn: () => Promise<{ status: 'ok' | 'warning' | 'error'; detail: string }>): Promise<CheckResult> {
    const start = Date.now();
    try {
        const result = await fn();
        return { name, ...result, latencyMs: Date.now() - start };
    } catch (err: any) {
        return { name, status: 'error', detail: err.message?.slice(0, 200) || 'Unknown error', latencyMs: Date.now() - start };
    }
}

export async function GET(req: NextRequest) {
    // Auth check — admin only
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const verbose = searchParams.get('verbose') === 'true';

    const checks: Promise<CheckResult>[] = [];

    // ─── 1. OpenAI API ───────────────────────────────────────
    checks.push(timedCheck('openai_api', async () => {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return { status: 'error', detail: 'OPENAI_API_KEY not set' };

        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${key}` },
            signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401) return { status: 'error', detail: 'API key invalid (401)' };
        if (res.status === 429) return { status: 'warning', detail: 'Rate limited (429) — check billing' };
        if (!res.ok) return { status: 'error', detail: `HTTP ${res.status}` };

        const data = await res.json();
        const models = data.data || [];
        const hasGpt4o = models.some((m: any) => m.id === 'gpt-4o');
        const hasTts = models.some((m: any) => m.id === 'tts-1');
        const hasWhisper = models.some((m: any) => m.id === 'whisper-1');

        return {
            status: hasGpt4o ? 'ok' : 'warning',
            detail: `${models.length} models | gpt-4o:${hasGpt4o ? '✅' : '❌'} tts-1:${hasTts ? '✅' : '❌'} whisper:${hasWhisper ? '✅' : '❌'}`,
        };
    }));

    // ─── 2. Supabase ─────────────────────────────────────────
    checks.push(timedCheck('supabase', async () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return { status: 'error', detail: 'SUPABASE_URL or SERVICE_ROLE_KEY not set' };

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(url, key);

        // Test a simple query
        const { count, error } = await supabase
            .from('site_settings')
            .select('*', { count: 'exact', head: true });

        if (error) return { status: 'error', detail: error.message };
        return { status: 'ok', detail: `Connected, site_settings has ${count} rows` };
    }));

    // ─── 3. Knowledge Base ───────────────────────────────────
    checks.push(timedCheck('knowledge_base', async () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return { status: 'error', detail: 'Supabase not configured' };

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(url, key);

        const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'ai_knowledge_base')
            .maybeSingle();

        if (!data?.value) return { status: 'warning', detail: 'No ai_knowledge_base row — using static fallback' };
        const len = typeof data.value === 'string' ? data.value.length : JSON.stringify(data.value).length;
        if (len < 100) return { status: 'warning', detail: `KB value is too short (${len} chars) — will use static fallback` };
        return { status: 'ok', detail: `KB from Supabase: ${len} chars` };
    }));

    // ─── 4. Prodentis Tunnel ─────────────────────────────────
    checks.push(timedCheck('prodentis_tunnel', async () => {
        const tunnelUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const res = await fetch(`${tunnelUrl}/api/slots/free?date=${tomorrow}&duration=30`, {
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return { status: 'error', detail: `HTTP ${res.status}` };
        const data = await res.json();
        return { status: 'ok', detail: `Tunnel OK, ${Array.isArray(data) ? data.length : '?'} slots for tomorrow` };
    }));

    // ─── 5. Replicate (Flux images) ─────────────────────────
    checks.push(timedCheck('replicate', async () => {
        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) return { status: 'warning', detail: 'REPLICATE_API_TOKEN not set — will use DALL-E 3 fallback' };
        return { status: 'ok', detail: 'Token configured' };
    }));

    // ─── 6. Mirage/Captions API ──────────────────────────────
    checks.push(timedCheck('captions_api', async () => {
        const key = process.env.MIRAGE_API_KEY;
        if (!key) return { status: 'warning', detail: 'MIRAGE_API_KEY not set — video captions disabled' };
        return { status: 'ok', detail: 'Key configured' };
    }));

    // ─── 7. Shotstack (legacy video editing) ─────────────────
    checks.push(timedCheck('shotstack', async () => {
        const key = process.env.SHOTSTACK_API_KEY;
        if (!key) return { status: 'warning', detail: 'SHOTSTACK_API_KEY not set — video editing disabled' };
        return { status: 'ok', detail: 'Key configured' };
    }));

    // ─── 8. Key AI tables row counts ─────────────────────────
    if (verbose) {
        checks.push(timedCheck('ai_tables', async () => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!url || !key) return { status: 'error', detail: 'Supabase not configured' };

            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(url, key);

            const tables = [
                'assistant_memory', 'email_ai_drafts', 'email_ai_sender_rules',
                'email_ai_instructions', 'email_ai_feedback', 'email_ai_knowledge_files',
                'social_topics', 'social_posts', 'social_ai_style_notes',
                'social_comment_replies', 'social_schedules', 'social_platforms',
            ];

            const counts: Record<string, number | string> = {};
            const warnings: string[] = [];

            for (const table of tables) {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                if (error) {
                    counts[table] = `ERROR: ${error.message}`;
                    warnings.push(table);
                } else {
                    counts[table] = count || 0;
                    if (count === 0 && ['assistant_memory', 'email_ai_instructions'].includes(table)) {
                        warnings.push(`${table}=0`);
                    }
                }
            }

            return {
                status: warnings.length > 0 ? 'warning' : 'ok',
                detail: `${Object.keys(counts).length} tables checked${warnings.length > 0 ? ` | ⚠️ ${warnings.join(', ')}` : ''} | ${JSON.stringify(counts)}`,
            };
        }));
    }

    // ─── Run all checks ──────────────────────────────────────
    const results = await Promise.all(checks);

    const summary = {
        ok: results.filter(r => r.status === 'ok').length,
        warning: results.filter(r => r.status === 'warning').length,
        error: results.filter(r => r.status === 'error').length,
    };

    const overallStatus = summary.error > 0 ? 'unhealthy' : summary.warning > 0 ? 'degraded' : 'healthy';

    return NextResponse.json({
        status: overallStatus,
        summary,
        checks: results,
        timestamp: new Date().toISOString(),
    });
}
