import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

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

        const res = await prodentisFetch(`/api/schedule/appointment/${appointmentId}/color`, {
            klucz: 'personel',
            method: 'PUT',
            body: JSON.stringify({ colorId }),
            timeoutMs: 10000,
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
