import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
    const response = NextResponse.json({ success: true });

    // Clear the httpOnly cookie by setting maxAge to 0
    response.cookies.set('patient_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });

    return response;
}
