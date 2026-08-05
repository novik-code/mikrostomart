import { NextResponse } from 'next/server';
import { signRegistrationToken } from '@/lib/registrationToken';
import { prodentisPhoneQueries } from '@/lib/phone';

export const dynamic = 'force-dynamic';

/** Pacjent zwracany przez Prodentis (/api/patient/verify oraz /api/patients/search). */
interface ProdentisPatient {
    id: string | number;
    firstName?: string;
    lastName?: string;
    phone?: string;
    pesel?: string;
}

/** Odpowiedź Prodentisa na weryfikację pacjenta (+ token dopinany przez withVerificationToken). */
interface ProdentisVerifyResponse {
    success?: boolean;
    message?: string;
    patient?: ProdentisPatient;
    verificationToken?: string;
}

/**
 * Attach a signed verification token to a successful match response.
 * S10-2: register endpoint requires this token (bound to prodentisId+phone)
 * — atakujący nie może POST'ować dowolnego prodentisId do /register bez
 * uprzedniego Prodentis match przez /verify.
 */
function withVerificationToken(
    prodentisData: ProdentisVerifyResponse,
    phone: string
): ProdentisVerifyResponse {
    if (!prodentisData?.success || !prodentisData?.patient?.id) return prodentisData;
    const p = prodentisData.patient;
    const verificationToken = signRegistrationToken({
        prodentisId: String(p.id),
        phone,
        firstName: String(p.firstName || ''),
        lastName: String(p.lastName || ''),
    });
    return { ...prodentisData, verificationToken };
}

// 🔴 USUNIĘTO `getPhoneVariants`. Brał OSTATNIE 9 CYFR dowolnego numeru i doklejał "+48",
// więc niemiecki "+49 170 1234567" odpytywał Prodentis o "+48701234567" — poprawnie
// wyglądający polski numer, mogący należeć do KOGOŚ INNEGO. Numery, których część krajowa
// nie ma 9 cyfr (Dania 8, Islandia 7), nie dostawały wariantów w ogóle.
// Zastąpione przez `prodentisPhoneQueries` z '@/lib/phone': dla numerów polskich lista jest
// IDENTYCZNA co do elementu, dla zagranicznych nigdy nie zawiera wariantu z "48".

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
        const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

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
                return NextResponse.json(withVerificationToken(data, normalizedPhone));
            }
        }

        // ── Attempt 2: Try phone variants (spaces, country code) ──
        const variants = prodentisPhoneQueries(phone);
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
                        return NextResponse.json(withVerificationToken(variantData, normalizedPhone));
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
                    const match = patients.find((p: ProdentisPatient) => {
                        const pPhone = (p.phone || '').replace(/\D/g, '');
                        const inputPhone = normalizedPhone.replace(/\D/g, '');
                        const phoneMatch = pPhone.endsWith(inputPhone) || inputPhone.endsWith(pPhone) || pPhone === inputPhone;
                        const nameMatch = (p.firstName || '').toLowerCase().trim() === firstName.toLowerCase().trim();
                        const peselMatch = (p.pesel || '').trim() === normalizedPesel;
                        return phoneMatch && nameMatch && peselMatch;
                    });

                    if (match) {
                        console.log('[Verify] Search fallback match:', match.id);
                        return NextResponse.json(withVerificationToken({
                            success: true,
                            patient: {
                                id: match.id,
                                firstName: match.firstName,
                                lastName: match.lastName,
                                phone: match.phone,
                            }
                        }, normalizedPhone));
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

    } catch (error) {
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

