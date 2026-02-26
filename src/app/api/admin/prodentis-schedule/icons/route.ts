import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/**
 * GET /api/admin/prodentis-schedule/icons
 * Proxy → Prodentis GET /api/schedule/icons
 * Returns available appointment icons (e.g. "Pacjent potwierdzony")
 */
export async function GET() {
    try {
        const res = await fetch(`${PRODENTIS_API}/api/schedule/icons`, {
            signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[ProdentisIcons] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
