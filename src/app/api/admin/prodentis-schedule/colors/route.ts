import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/prodentis-schedule/colors
 * Auth: admin/employee required.
 * Proxy → Prodentis GET /api/schedule/colors
 */
export async function GET() {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;
        const res = await prodentisFetch('/api/schedule/colors', {
            timeoutMs: 10000,
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[ProdentisColors] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
