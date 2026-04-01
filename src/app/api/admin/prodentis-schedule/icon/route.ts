import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
const PRODENTIS_KEY = process.env.PRODENTIS_API_KEY || '';

/**
 * POST /api/admin/prodentis-schedule/icon
 * Auth: admin required.
 * Proxy → Prodentis POST /api/schedule/appointment/:id/icon
 */
export async function POST(request: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { appointmentId, iconId } = await request.json();

        if (!appointmentId || !iconId) {
            return NextResponse.json({ error: 'appointmentId and iconId required' }, { status: 400 });
        }

        const res = await fetch(`${PRODENTIS_API}/api/schedule/appointment/${appointmentId}/icon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': PRODENTIS_KEY,
            },
            body: JSON.stringify({ iconId }),
            signal: AbortSignal.timeout(10000),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[ProdentisIcon] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
