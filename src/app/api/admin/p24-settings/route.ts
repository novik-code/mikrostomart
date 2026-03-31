/**
 * Admin API: Przelewy24 provider configuration per tenant
 *
 * GET    /api/admin/p24-settings  — returns config status (keys masked)
 * PATCH  /api/admin/p24-settings  — saves credentials to DB
 * POST   /api/admin/p24-settings?action=test — tests connection via P24 testAccess
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getP24Config, getP24BaseUrl } from '@/lib/p24Service';

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

// GET — return current config status
export async function GET() {
    const config = await getP24Config();

    return NextResponse.json({
        source: config.source,
        enabled: config.enabled,
        sandbox: config.sandbox,
        merchant_id: config.merchantId,
        pos_id: config.posId,
        crc_key_masked: config.crcKey ? maskKey(config.crcKey) : null,
        api_key_masked: config.apiKey ? maskKey(config.apiKey) : null,
    });
}

// PATCH — save credentials to DB
export async function PATCH(request: Request) {
    try {
        const { merchant_id, pos_id, crc_key, api_key, sandbox, enabled } = await request.json();

        if (!merchant_id || !pos_id || !crc_key || !api_key) {
            return NextResponse.json(
                { error: 'merchant_id, pos_id, crc_key i api_key są wymagane' },
                { status: 400 }
            );
        }

        const supabase = getSupabase();

        const { error } = await supabase
            .from('clinic_settings')
            .upsert({
                key: 'p24_settings',
                value: {
                    merchant_id: Number(merchant_id),
                    pos_id: Number(pos_id),
                    crc_key,
                    api_key,
                    sandbox: sandbox ?? true,
                    enabled: enabled ?? true,
                },
            }, { onConflict: 'key' });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            crc_key_masked: maskKey(crc_key),
            api_key_masked: maskKey(api_key),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST?action=test — verify credentials via P24 testAccess endpoint
export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        if (searchParams.get('action') !== 'test') {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        const { pos_id, api_key, sandbox } = await request.json();
        if (!pos_id || !api_key) {
            return NextResponse.json({ error: 'pos_id i api_key wymagane' }, { status: 400 });
        }

        const baseUrl = getP24BaseUrl(sandbox ?? true);
        const credentials = Buffer.from(`${pos_id}:${api_key}`).toString('base64');

        const res = await fetch(`${baseUrl}/api/v1/testAccess`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
            },
        });

        const data = await res.json();
        const mode = sandbox ? 'SANDBOX' : 'LIVE';

        if (res.ok && data.data === true) {
            return NextResponse.json({
                ok: true,
                mode,
                message: `Połączenie ${mode} działa poprawnie ✅`,
            });
        } else {
            return NextResponse.json({
                ok: false,
                error: data.error || 'Błąd autentykacji P24',
            }, { status: 400 });
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
}
