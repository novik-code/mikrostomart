import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { exchangeCode } from '@/lib/googleCalendar';
import { odczytajStateOauth } from '@/lib/oauthState';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/calendar/auth/callback
 * OAuth2 callback handler — exchanges code and redirects back to employee page
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // podpisany token tożsamości (P-038)
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

    /**
     * 🔴 P-038: `state` MUSI BYĆ NASZ I MUSI PASOWAĆ DO SESJI.
     *
     * Do 07.09 `state` był GOŁYM `user.id` sprawdzanym wyłącznie na niepustość, a tokeny
     * zapisywały się pod tożsamością z cookie — czyli `state` nie był z niczym wiązany.
     * Callback bez sesji nie zużywa kodu, a cookie Supabase ma `SameSite=Lax`, więc
     * napastnik mógł wygenerować własny `code` i podsunąć zalogowanemu pracownikowi
     * link: JEGO konto Google podpinało się do konta OFIARY (login-CSRF). Asystent
     * tworzył potem w cudzym kalendarzu wydarzenia z nazwiskiem pacjenta.
     *
     * 🔑 Sprawdzamy DWIE rzeczy: podpis (czy `state` wyszedł od nas i nie wygasł)
     * ORAZ zgodność tożsamości z sesją. Sam podpis nie wystarczy — napastnik ma własny,
     * ważny `state` ze swojego logowania.
     */
    const idZeState = odczytajStateOauth(state);
    if (!idZeState || idZeState !== user.id) {
        console.error('[Calendar Callback] state nie pasuje do sesji — odmowa');
        return NextResponse.redirect(new URL('/pracownik?calendar=state', req.url));
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
