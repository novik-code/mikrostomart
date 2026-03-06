import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SMS_TYPES = [
    { id: 'noshow_followup', label: 'No-show (po nieobecnosci)', icon: '🚫' },
    { id: 'post_visit', label: 'Po wizycie (ankieta)', icon: '📝' },
    { id: 'week_after_visit', label: 'Tydzien po (aplikacja)', icon: '📱' },
    { id: 'birthday', label: 'Urodziny', icon: '🎂' },
    { id: 'deposit_reminder', label: 'Przypomnienie o zadatku', icon: '💰' },
];

/**
 * GET /api/admin/sms-settings
 * Returns all SMS type settings with their enabled/disabled status
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: settings } = await supabase
            .from('sms_settings')
            .select('*');

        // Merge with SMS_TYPES to include labels and defaults
        const result = SMS_TYPES.map(type => {
            const setting = (settings || []).find(s => s.id === type.id);
            return {
                ...type,
                enabled: setting ? setting.enabled : true, // Default: enabled
                updated_at: setting?.updated_at || null,
                updated_by: setting?.updated_by || null,
            };
        });

        return NextResponse.json({ settings: result });
    } catch (error) {
        console.error('[SMS Settings] GET error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/sms-settings
 * Toggle a single SMS type on/off
 * Body: { id: string, enabled: boolean }
 */
export async function PATCH(req: Request) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, enabled } = body;

        if (!id || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'Missing id or enabled' }, { status: 400 });
        }

        // Validate type
        if (!SMS_TYPES.find(t => t.id === id)) {
            return NextResponse.json({ error: `Invalid SMS type: ${id}` }, { status: 400 });
        }

        // Upsert
        const { error } = await supabase
            .from('sms_settings')
            .upsert({
                id,
                enabled,
                updated_at: new Date().toISOString(),
                updated_by: user.email || user.id,
            }, { onConflict: 'id' });

        if (error) {
            console.error('[SMS Settings] PATCH error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[SMS Settings] ${id} → ${enabled ? 'ENABLED' : 'DISABLED'} by ${user.email}`);

        return NextResponse.json({ success: true, id, enabled });
    } catch (error) {
        console.error('[SMS Settings] PATCH error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
