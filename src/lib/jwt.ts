// Utility function to verify JWT tokens
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JWTPayload {
    prodentisId: string;
    phone: string;
    userId: string;
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
