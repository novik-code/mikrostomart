/**
 * GET /api/employee/reports?status= — lista zgłoszeń z aplikacji
 *
 * Guard: `requireEmployeeOrAdmin()` (Bearer-first). Zgłoszenia widzi każdy
 * pracownik — usterkę apki najczęściej rozpoznaje ten, kto jej używa, nie admin.
 *
 * 🔑 W przeciwieństwie do widoku pacjenta ta trasa oddaje `*`, bo diagnostyka
 * (wersja, platforma, model, ostatni ekran) jest tu CAŁYM SENSEM listy. Żadne
 * z tych pól nie jest daną wrażliwą — patrz komentarze w migracji 199.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { REPORT_STATUSES, type ReportStatus } from '@/lib/appReports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

export async function GET(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const status = new URL(request.url).searchParams.get('status');

    let q = supabase()
        .from('app_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (status && REPORT_STATUSES.includes(status as ReportStatus)) {
        q = q.eq('status', status);
    }

    const { data, error } = await q;
    if (error) {
        console.error('[AppReports/staff] odczyt nieudany:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ reports: data ?? [] });
}
