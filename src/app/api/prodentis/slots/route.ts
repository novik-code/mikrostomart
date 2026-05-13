import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET(request: Request) {
    // Rate limit: 30 requests per minute per IP.
    // The form fetches 5 days in parallel per week navigation, so 30 = ~6 week clicks/min.
    const ip = getClientIP(request);
    const rl = await checkRateLimit(`slots:${ip}`, 30, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many slot requests. Please slow down.' },
            { status: 429, headers: { 'Retry-After': '60' } }
        );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const duration = searchParams.get('duration');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Missing or invalid date parameter' }, { status: 400 });
    }

    // Demo mode: return synthetic slots so the demo flow works without hitting prod Prodentis.
    // Generates 10:00, 10:30, 11:00, 11:30, 12:00 for Marcin on the requested date.
    if (isDemoMode) {
        const times = ['10:00', '10:30', '11:00', '11:30', '12:00'];
        const slots = times.map(t => {
            const [h, m] = t.split(':');
            return {
                doctor: '0100000001',
                doctorName: 'Marcin Nowosielski',
                start: `${date}T${h}:${m}:00+01:00`,
                end: `${date}T${h}:${(parseInt(m) + parseInt(duration || '30')).toString().padStart(2, '0')}:00+01:00`,
            };
        });
        return NextResponse.json(slots);
    }

    const apiUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
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
