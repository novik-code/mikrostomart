/**
 * Admin API: PayU configuration per tenant
 *
 * GET    /api/admin/payu-settings  — config status (keys masked)
 * PATCH  /api/admin/payu-settings  — save credentials to DB
 * POST   /api/admin/payu-settings?action=test — test via OAuth2 token
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPayUConfig, getPayUToken } from '@/lib/payuService';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

function maskKey(key: string | null | undefined): string | null {
    if (!key) return null;
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export async function GET() {
    const config = await getPayUConfig();
    return NextResponse.json({
        source: config.source,
        enabled: config.enabled,
        sandbox: config.sandbox,
        pos_id: config.posId,
        client_id: config.clientId,
        client_secret_masked: maskKey(config.clientSecret),
        second_key_masked: maskKey(config.secondKey),
    });
}

export async function PATCH(request: Request) {
    try {
        const { pos_id, client_id, client_secret, second_key, sandbox, enabled } = await request.json();

        if (!pos_id || !client_id || !client_secret || !second_key) {
            return NextResponse.json(
                { error: 'pos_id, client_id, client_secret i second_key są wymagane' },
                { status: 400 }
            );
        }

        const supabase = getSupabase();
        const { error } = await supabase
            .from('clinic_settings')
            .upsert({
                key: 'payu_settings',
                value: { pos_id, client_id, client_secret, second_key, sandbox: sandbox ?? true, enabled: enabled ?? true },
            }, { onConflict: 'key' });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({
            ok: true,
            client_secret_masked: maskKey(client_secret),
            second_key_masked: maskKey(second_key),
        });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        if (searchParams.get('action') !== 'test') {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        // Try to read body — fallback to saved DB config
        let body: { pos_id?: string; client_id?: string; client_secret?: string; sandbox?: boolean } = {};
        try { body = await request.json(); } catch { /* empty body ok */ }

        let config = await getPayUConfig();

        // Override with body if provided
        if (body.pos_id && body.client_id && body.client_secret) {
            config = {
                ...config,
                posId: body.pos_id,
                clientId: body.client_id,
                clientSecret: body.client_secret,
                sandbox: body.sandbox ?? config.sandbox,
                enabled: true,
            };
        }

        if (!config.clientId || !config.clientSecret) {
            return NextResponse.json({ error: 'Brak danych konfiguracyjnych PayU' }, { status: 400 });
        }

        // Test: try to get OAuth2 token
        const token = await getPayUToken(config);
        const mode = config.sandbox ? 'SANDBOX' : 'LIVE';

        return NextResponse.json({
            ok: true,
            mode,
            message: `Połączenie ${mode} działa — token OAuth2 uzyskany ✅`,
            token_preview: token.slice(0, 16) + '...',
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
}
