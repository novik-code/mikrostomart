import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/prodentis-schedule/icon
 * Auth: admin required.
 * Proxy → Prodentis POST /api/schedule/appointment/:id/icon
 */
export async function POST(request: Request) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const { appointmentId, iconId } = await request.json();

        if (!appointmentId || !iconId) {
            return NextResponse.json({ error: 'appointmentId and iconId required' }, { status: 400 });
        }

        const res = await prodentisFetch(`/api/schedule/appointment/${appointmentId}/icon`, {
            method: 'POST',
            body: JSON.stringify({ iconId }),
            timeoutMs: 10000,
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
