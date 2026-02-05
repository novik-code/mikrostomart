import { NextRequest, NextResponse } from 'next/server';

// Prodentis API base URL
const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const prodentisId = params.id;

        // Call Prodentis API
        const response = await fetch(
            `${PRODENTIS_API_URL}/api/patient/${prodentisId}/next-appointment`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Don't cache the response
                cache: 'no-store',
            }
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
