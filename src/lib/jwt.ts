// Utility function to verify JWT tokens
import jwt from 'jsonwebtoken';

export interface JWTPayload {
    prodentisId: string;
    phone: string;
    userId: string;
}

export function verifyToken(authHeader: string | null): JWTPayload | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as JWTPayload;
        return decoded;
    } catch (error) {
        console.error('[JWT] Verification failed:', error);
        return null;
    }
}
