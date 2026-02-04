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

        // Fetch patient details from Prodentis
        const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
        const url = `${prodentisUrl}/api/patient/${payload.prodentisId}/details`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('[Me] Prodentis API error:', response.status);
            return NextResponse.json(
                { error: 'Failed to fetch patient data' },
                { status: 500 }
            );
        }

        const patientData = await response.json();

        return NextResponse.json(patientData);

    } catch (error: any) {
        console.error('[Me] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
