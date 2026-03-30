import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SETTINGS_ROW = 'pms_settings';

/**
 * GET /api/admin/pms-settings
 * Returns current PMS configuration (stored in clinic_settings table).
 * Merges with environment variable defaults.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data } = await supabase
            .from('clinic_settings')
            .select('value')
            .eq('key', SETTINGS_ROW)
            .single();

        const saved = data?.value || {};

        return NextResponse.json({
            provider: saved.provider || process.env.NEXT_PUBLIC_PMS_PROVIDER || 'prodentis',
            apiUrl: saved.apiUrl || process.env.PRODENTIS_API_URL || '',
            hasApiKey: !!(saved.hasApiKey || process.env.PRODENTIS_API_KEY),
            notes: saved.notes || '',
            updatedAt: saved.updatedAt || null,
            updatedBy: saved.updatedBy || null,
        });
    } catch {
        return NextResponse.json({
            provider: process.env.NEXT_PUBLIC_PMS_PROVIDER || 'prodentis',
            apiUrl: process.env.PRODENTIS_API_URL || '',
            hasApiKey: !!process.env.PRODENTIS_API_KEY,
            notes: '',
            updatedAt: null,
            updatedBy: null,
        });
    }
}

/**
 * PATCH /api/admin/pms-settings
 * Updates PMS settings (stored in clinic_settings).
 * NOTE: env vars are the source of truth at deploy time.
 * This stores admin UI overrides that are visible but don't affect runtime
 * until code redeploy (env vars require Vercel redeploy).
 */
export async function PATCH(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { provider, notes } = body;

    const allowed = ['prodentis', 'standalone'];
    if (provider && !allowed.includes(provider)) {
        return NextResponse.json({ error: `Unknown provider: ${provider}. Allowed: ${allowed.join(', ')}` }, { status: 400 });
    }

    const value = {
        provider: provider || 'prodentis',
        notes: notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
    };

    const { error } = await supabase
        .from('clinic_settings')
        .upsert({ key: SETTINGS_ROW, value }, { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, setting: value });
}

/**
 * POST /api/admin/pms-settings?action=health
 * Tests connection to the currently configured PMS.
 */
export async function POST(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    if (searchParams.get('action') !== 'health') {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const provider = process.env.NEXT_PUBLIC_PMS_PROVIDER || 'prodentis';

    if (provider === 'standalone') {
        try {
            const { error } = await supabase.from('employees').select('id').limit(1);
            if (error) throw error;
            return NextResponse.json({ healthy: true, provider, message: 'Supabase połączony ✅' });
        } catch (e: any) {
            return NextResponse.json({ healthy: false, provider, message: `Supabase error: ${e.message}` });
        }
    }

    // prodentis — ping health endpoint
    const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
    try {
        const res = await fetch(`${prodentisUrl}/api/health`, {
            signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            return NextResponse.json({ healthy: true, provider, message: `Prodentis API dostępne ✅ (${prodentisUrl})`, detail: data });
        }
        return NextResponse.json({ healthy: false, provider, message: `Prodentis API status ${res.status} ❌ (${prodentisUrl})` });
    } catch (e: any) {
        return NextResponse.json({ healthy: false, provider, message: `Prodentis niedostępny: ${e.message} (${prodentisUrl})` });
    }
}
