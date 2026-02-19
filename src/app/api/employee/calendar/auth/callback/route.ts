import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { exchangeCode } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/calendar/auth/callback
 * OAuth2 callback handler — exchanges code and redirects back to employee page
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // userId passed as state
    const error = url.searchParams.get('error');

    if (error) {
        console.error('[Calendar Callback] OAuth error:', error);
        return NextResponse.redirect(new URL('/pracownik?calendar=error', req.url));
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL('/pracownik?calendar=missing', req.url));
    }

    // Verify the user is still authenticated
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.redirect(new URL('/pracownik/login', req.url));
    }

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.redirect(new URL('/pracownik?calendar=forbidden', req.url));
    }

    // Exchange the code for tokens
    const result = await exchangeCode(code, user.id);

    if (result.success) {
        return NextResponse.redirect(new URL('/pracownik?calendar=connected&tab=asystent', req.url));
    } else {
        console.error('[Calendar Callback] Exchange failed:', result.error);
        return NextResponse.redirect(new URL('/pracownik?calendar=error', req.url));
    }
}
