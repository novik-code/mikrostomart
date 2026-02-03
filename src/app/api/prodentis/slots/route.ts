import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const duration = searchParams.get('duration');

    if (!date) {
        return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const apiUrl = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';
    const endpoint = `${apiUrl}/api/slots/free?date=${date}&duration=${duration || '30'}`;

    try {
        console.log(`Fetching Prodentis slots from: ${endpoint}`);

        // Set a timeout to avoid hanging the Vercel function
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

        const response = await fetch(endpoint, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Prodentis API Error: ${response.status} ${response.statusText}`);
            return NextResponse.json({ error: `Prodentis API Error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Prodentis Connection Failed:', error);

        // Return a structured error so the frontend knows to fallback or show a message
        return NextResponse.json(
            { error: 'Connection to Prodentis server failed', details: error.message },
            { status: 502 } // Bad Gateway
        );
    }
}
