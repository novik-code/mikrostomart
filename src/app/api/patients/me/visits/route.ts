import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Verify JWT
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get query params
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || '50';
        const offset = searchParams.get('offset') || '0';

        // Fetch visits from Prodentis
        const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
        const url = `${prodentisUrl}/api/patient/${payload.prodentisId}/appointments?limit=${limit}&offset=${offset}`;

        console.log('[Visits] Fetching from:', url);

        const response = await fetch(url);

        if (!response.ok) {
            console.error('[Visits] Prodentis API error:', response.status);
            return NextResponse.json(
                { error: 'Failed to fetch visit history' },
                { status: 500 }
            );
        }

        const visitsData = await response.json();

        return NextResponse.json(visitsData);

    } catch (error: any) {
        console.error('[Visits] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
