import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, firstName, pesel } = body;

        // Validation
        if (!phone || !firstName || !pesel) {
            return NextResponse.json(
                { success: false, message: 'Brak wymaganych danych: telefon, imię, PESEL' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedPhone = phone.replace(/[\s-]/g, '');
        const normalizedPesel = pesel.trim();

        // Proxy to Prodentis API
        const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
        const url = `${prodentisUrl}/api/patient/verify?phone=${encodeURIComponent(normalizedPhone)}&firstName=${encodeURIComponent(firstName)}&pesel=${encodeURIComponent(normalizedPesel)}`;

        console.log('[Verify] Calling Prodentis API:', url);
        console.log('[Verify] Input data:', { phone: normalizedPhone, firstName, pesel: normalizedPesel });

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        console.log('[Verify] Prodentis response status:', response.status);

        if (!response.ok) {
            console.error('[Verify] Prodentis API error:', response.status);
            return NextResponse.json(
                { success: false, message: 'Błąd połączenia z systemem Prodentis' },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[Verify] Prodentis response:', JSON.stringify(data, null, 2));

        // Log success
        if (data.success) {
            console.log('[Verify] Patient verified:', data.patient?.id);
        } else {
            console.log('[Verify] Verification failed:', data.message);
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[Verify] Error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Nie udało się połączyć z serwerem. Spróbuj ponownie.'
            },
            { status: 500 }
        );
    }
}
