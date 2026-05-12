import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { getProdentisKey } from '@/lib/pmsConfig';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/**
 * PUT /api/admin/prodentis-schedule/color
 * Auth: admin required.
 * Proxy → Prodentis PUT /api/schedule/appointment/:id/color
 */
export async function PUT(request: Request) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const { appointmentId, colorId } = await request.json();

        if (!appointmentId || !colorId) {
            return NextResponse.json({ error: 'appointmentId and colorId required' }, { status: 400 });
        }

        const PRODENTIS_KEY = (await getProdentisKey()) ?? '';

        const res = await fetch(`${PRODENTIS_API}/api/schedule/appointment/${appointmentId}/color`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': PRODENTIS_KEY,
            },
            body: JSON.stringify({ colorId }),
            signal: AbortSignal.timeout(10000),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[ProdentisColor] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
