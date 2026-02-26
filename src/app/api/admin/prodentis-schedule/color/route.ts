import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
const PRODENTIS_KEY = process.env.PRODENTIS_API_KEY || '';

/**
 * PUT /api/admin/prodentis-schedule/color
 * Proxy → Prodentis PUT /api/schedule/appointment/:id/color
 * Body: { appointmentId, colorId }
 */
export async function PUT(request: Request) {
    try {
        const { appointmentId, colorId } = await request.json();

        if (!appointmentId || !colorId) {
            return NextResponse.json({ error: 'appointmentId and colorId required' }, { status: 400 });
        }

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
