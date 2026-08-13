// Utility function to verify JWT tokens
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JWTPayload {
    prodentisId: string;
    phone: string;
    userId: string;
    /** Data wystawienia w sekundach — dodaje ją `jwt.sign` domyślnie. Używa jej rewokacja. */
    iat?: number;
}

/**
 * Verify JWT from raw token string
 */
function verifyRawToken(token: string): JWTPayload | null {
    try {
        const secret = process.env.JWT_SECRET!;
        return jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
        console.error('[JWT] Verification failed:', error);
        return null;
    }
}

/**
 * Verify JWT from Authorization header (backward compatible)
 */
export function verifyToken(authHeader: string | null): JWTPayload | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    return verifyRawToken(token);
}

/**
 * Verify JWT from request — checks Authorization header first, then httpOnly cookie.
 * Use this in all patient API routes for maximum compatibility.
 */
export function verifyTokenFromRequest(request: NextRequest): JWTPayload | null {
    // 1. Try Authorization header first (backward compatible)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const result = verifyRawToken(authHeader.substring(7));
        if (result) return result;
    }

    // 2. Fall back to httpOnly cookie
    const cookieToken = request.cookies.get('patient_token')?.value;
    if (cookieToken) {
        return verifyRawToken(cookieToken);
    }

    return null;
}

/**
 * Tolerancja przy porównaniu `iat` z `sessions_valid_from` — **2 sekundy**.
 *
 * 🔑 PO CO. `iat` ma rozdzielczość SEKUNDY (zaokrąglone w dół), a `sessions_valid_from`
 * milisekundy. Zmiana hasła o 10:00:00.500 i token wystawiony 200 ms później dostaje
 * `iat` = 10:00:00.000 — czyli formalnie WCZEŚNIEJSZY niż data unieważnienia. Bez
 * tolerancji pacjent zmieniający hasło zostawałby wylogowany w tej samej sekundzie,
 * w której się zalogował.
 *
 * Ochrony to nie osłabia: token, który chcemy ubić, jest starszy o godziny albo dni.
 */
const TOLERANCJA_MS = 2000;

/**
 * Czy token o danym `iat` jest starszy niż unieważnienie sesji.
 *
 * Wydzielone z `verifyPatientSession`, żeby dało się to sprawdzić WYKONANIEM, bez bazy.
 * Każde „nie wiem" (brak `iat`, brak daty, data nie do sparsowania) znaczy **NIE unieważniaj** —
 * ta funkcja nigdy nie wyrzuca pacjenta na podstawie niepewnych danych.
 */
export function czySesjaUniewazniona(iat: number | undefined, sessionsValidFrom: string | null | undefined): boolean {
    if (typeof iat !== 'number') return false;
    if (!sessionsValidFrom) return false;
    const uniewaznioneOd = Date.parse(sessionsValidFrom);
    if (Number.isNaN(uniewaznioneOd)) return false;
    return iat * 1000 + TOLERANCJA_MS < uniewaznioneOd;
}

/**
 * Weryfikacja tokenu pacjenta **wraz ze sprawdzeniem, czy sesja nie została unieważniona**
 * (migracja 197).
 *
 * Token żyje 30 dni i do tej pory nie dało się go odwołać niczym. Zmiana hasła, reset po
 * przejęciu konta i usunięcie konta z RODO przestawiają `patients.sessions_valid_from`;
 * ta funkcja odrzuca tokeny wystawione wcześniej.
 *
 * 🔴 FAIL-OPEN PRZY BŁĘDZIE BAZY — I TO JEST ŚWIADOMA DECYZJA, NIE NIEDBAŁOŚĆ.
 * Gdy zapytanie nie przejdzie (awaria Supabase, brak kolumny przed migracją, timeout),
 * zwracamy token jako WAŻNY. Powód: `me/visits` i `upcoming-appointments` nie dotykają
 * dziś Supabase wcale — twarde odrzucenie zamieniłoby awarię bazy w wylogowanie
 * WSZYSTKICH pacjentów i wygaszenie historii wizyt oraz ekranu głównego aplikacji.
 * Rewokacja jest zabezpieczeniem przed skradzionym tokenem, nie bramką dostępu;
 * jej chwilowa niedostępność nie może kasować działającej funkcji.
 *
 * ⚠️ Konsekwencja do świadomego przyjęcia: w czasie awarii bazy unieważniony token
 * znów przechodzi. Okno jest równe czasowi awarii.
 */
export async function verifyPatientSession(request: NextRequest): Promise<JWTPayload | null> {
    const payload = verifyTokenFromRequest(request);
    if (!payload) return null;

    // Token bez `iat` (teoretycznie: podpisany z `noTimestamp`) — nie ma czego porównać.
    if (typeof payload.iat !== 'number') return payload;
    if (!payload.userId) return payload;

    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        const { data, error } = await supabase
            .from('patients')
            .select('sessions_valid_from')
            .eq('id', payload.userId)
            .maybeSingle();

        if (error || !data) return payload;                        // fail-open

        if (czySesjaUniewazniona(payload.iat, data.sessions_valid_from as string | null)) {
            console.warn('[JWT] Token pacjenta unieważniony (sessions_valid_from):', payload.userId);
            return null;
        }
        return payload;
    } catch (e) {
        console.error('[JWT] Sprawdzenie rewokacji nieudane — przepuszczam token:', (e as Error).message);
        return payload;                                            // fail-open
    }
}
