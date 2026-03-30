import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/sms-provider
 * Returns SMS provider config status (token masked)
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('clinic_settings')
        .select('value')
        .eq('key', 'sms_settings')
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const settings = (data?.value || {}) as Record<string, string>;
    const hasDbToken = !!(settings.token && settings.token.length > 0);
    const hasEnvToken = !!process.env.SMSAPI_TOKEN;

    return NextResponse.json({
        token_set: hasDbToken,
        token_source: hasDbToken ? 'db' : (hasEnvToken ? 'env' : 'none'),
        sender_name: settings.sender_name || '',
        test_phone: settings.test_phone || '',
    });
}

/**
 * PATCH /api/admin/sms-provider
 * Save token, sender_name to clinic_settings
 * Body: { token?: string, sender_name?: string, test_phone?: string }
 */
export async function PATCH(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Record<string, string>;
    const { token, sender_name, test_phone } = body;

    // Fetch existing to merge
    const { data: existing } = await supabase
        .from('clinic_settings')
        .select('value')
        .eq('key', 'sms_settings')
        .maybeSingle();

    const current = (existing?.value || {}) as Record<string, string>;
    const updated: Record<string, string> = {
        ...current,
        provider: 'smsapi',
    };
    if (token !== undefined) updated.token = token;
    if (sender_name !== undefined) updated.sender_name = sender_name;
    if (test_phone !== undefined) updated.test_phone = test_phone;

    const { error } = await supabase
        .from('clinic_settings')
        .upsert({ key: 'sms_settings', value: updated });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    console.log(`[SMS Provider] config updated by ${user.email}`);
    return NextResponse.json({ success: true });
}

/**
 * POST /api/admin/sms-provider?action=test
 * Send a test SMS using the currently configured token
 * Body: { phone: string }
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    if (searchParams.get('action') !== 'test') {
        return NextResponse.json({ error: 'Use ?action=test' }, { status: 400 });
    }

    const body = await req.json() as { phone?: string };
    const phone = body.phone;
    if (!phone) return NextResponse.json({ error: 'Brak numeru telefonu' }, { status: 400 });

    // Read config: DB first, env fallback
    const { data } = await supabase
        .from('clinic_settings')
        .select('value')
        .eq('key', 'sms_settings')
        .maybeSingle();

    const settings = (data?.value || {}) as Record<string, string>;
    const token = settings.token || process.env.SMSAPI_TOKEN;
    const senderName = settings.sender_name || process.env.SMSAPI_FROM || 'DensFlow';

    if (!token) {
        return NextResponse.json({ error: 'Brak tokenu SMSAPI. Zapisz token najpierw.' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/^\+/, '').replace(/\s+/g, '');
    const testMessage = `${senderName}: Test SMS z panelu DensFlow.Ai. Konfiguracja SMS dziala poprawnie!`;

    const response = await fetch('https://api.smsapi.pl/sms.do', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: normalizedPhone, message: testMessage, format: 'json' }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `SMSAPI error (${response.status}): ${errorText}` }, { status: 502 });
    }

    const result = await response.json() as { count?: number; list?: Array<{ id?: string }> };
    if (result.count && result.count > 0) {
        return NextResponse.json({ success: true, messageId: result.list?.[0]?.id });
    }

    return NextResponse.json({ error: `Nieznany błąd SMSAPI: ${JSON.stringify(result)}` }, { status: 502 });
}
