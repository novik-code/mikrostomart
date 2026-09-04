import { NextRequest, NextResponse } from 'next/server';
import { verifyPatientSession } from '@/lib/jwt';
import { prodentisFetch } from '@/lib/prodentisFetch';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ── Auth check ──
        const payload = await verifyPatientSession(request);
        if (!payload) {
            return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
        }

        const { id: prodentisId } = await params;

        // ── Security: verify the requested ID matches the authenticated patient ──
        if (payload.prodentisId !== prodentisId) {
            return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
        }

        // Call Prodentis API
        const response = await prodentisFetch(
            `/api/patient/${prodentisId}/next-appointment`,
            { method: 'GET' }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch appointment from Prodentis API' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching next appointment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

