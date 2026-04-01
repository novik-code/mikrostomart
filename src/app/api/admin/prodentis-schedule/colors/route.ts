import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/**
 * GET /api/admin/prodentis-schedule/colors
 * Auth: admin/employee required.
 * Proxy → Prodentis GET /api/schedule/colors
 */
export async function GET() {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const res = await fetch(`${PRODENTIS_API}/api/schedule/colors`, {
            signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[ProdentisColors] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
