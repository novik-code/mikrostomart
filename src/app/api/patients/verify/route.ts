import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Generate common Polish phone format variants for Prodentis matching.
 * Prodentis may store phones as "123456789", "123 456 789", "+48 123 456 789", etc.
 */
function getPhoneVariants(phone: string): string[] {
    const digits = phone.replace(/\D/g, '');
    // Get last 9 digits (strip country code if present)
    const core = digits.length > 9 ? digits.slice(-9) : digits;
    if (core.length !== 9) return [phone];

    const variants = new Set<string>();
    // 123456789
    variants.add(core);
    // 123 456 789
    variants.add(`${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`);
    // +48123456789
    variants.add(`+48${core}`);
    // +48 123 456 789
    variants.add(`+48 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`);
    // 48123456789
    variants.add(`48${core}`);
    // 0048123456789
    variants.add(`0048${core}`);
    return Array.from(variants);
}

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
        const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

        // ── Attempt 1: Direct verify with normalized phone ──
        console.log('[Verify] Attempt 1: normalized phone', normalizedPhone);
        const url = `${prodentisUrl}/api/patient/verify?phone=${encodeURIComponent(normalizedPhone)}&firstName=${encodeURIComponent(firstName)}&pesel=${encodeURIComponent(normalizedPesel)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('[Verify] Attempt 1 success:', data.patient?.id);
                return NextResponse.json(data);
            }
        }

        // ── Attempt 2: Try phone variants (spaces, country code) ──
        const variants = getPhoneVariants(normalizedPhone);
        console.log('[Verify] Attempt 2: trying', variants.length, 'phone variants');

        for (const variant of variants) {
            if (variant === normalizedPhone) continue; // Already tried
            try {
                const variantUrl = `${prodentisUrl}/api/patient/verify?phone=${encodeURIComponent(variant)}&firstName=${encodeURIComponent(firstName)}&pesel=${encodeURIComponent(normalizedPesel)}`;
                const variantRes = await fetch(variantUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(5000),
                });
                if (variantRes.ok) {
                    const variantData = await variantRes.json();
                    if (variantData.success) {
                        console.log('[Verify] Variant match:', variant, '→', variantData.patient?.id);
                        return NextResponse.json(variantData);
                    }
                }
            } catch (e) {
                console.warn('[Verify] Variant failed:', variant, e);
            }
        }

        // ── Attempt 3: Fallback — search by phone, then verify PESEL client-side ──
        console.log('[Verify] Attempt 3: search fallback');
        try {
            const searchUrl = `${prodentisUrl}/api/patients/search?phone=${encodeURIComponent(normalizedPhone)}&limit=10`;
            const searchRes = await fetch(searchUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000),
            });

            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const patients = searchData.patients || searchData || [];

                if (Array.isArray(patients)) {
                    // Find patient matching firstName and PESEL
                    const match = patients.find((p: any) => {
                        const pPhone = (p.phone || '').replace(/\D/g, '');
                        const inputPhone = normalizedPhone.replace(/\D/g, '');
                        const phoneMatch = pPhone.endsWith(inputPhone) || inputPhone.endsWith(pPhone) || pPhone === inputPhone;
                        const nameMatch = (p.firstName || '').toLowerCase().trim() === firstName.toLowerCase().trim();
                        const peselMatch = (p.pesel || '').trim() === normalizedPesel;
                        return phoneMatch && nameMatch && peselMatch;
                    });

                    if (match) {
                        console.log('[Verify] Search fallback match:', match.id);
                        return NextResponse.json({
                            success: true,
                            patient: {
                                id: match.id,
                                firstName: match.firstName,
                                lastName: match.lastName,
                                phone: match.phone,
                            }
                        });
                    }
                }
            }
        } catch (searchError) {
            console.error('[Verify] Search fallback error:', searchError);
        }

        // All attempts failed
        console.log('[Verify] All attempts failed for phone:', normalizedPhone);
        return NextResponse.json({
            success: false,
            message: 'Nie znaleziono pacjenta o podanych danych. Sprawdź numer telefonu, imię i PESEL.'
        });

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

