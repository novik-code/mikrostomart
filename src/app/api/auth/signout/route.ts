import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { clearMfaSessionCookie } from '@/lib/mfaSession';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/signout
 *
 * Server-side sign-out:
 *   1. Wywołuje supabase.auth.signOut() — Supabase czyści swoje session cookies
 *   2. Czyści cookie mfa_session (po 2FA challenge user mógł je dostać)
 *   3. Redirect do strony logowania (pracownik default, można override przez ?redirect=)
 *
 * Powstał dlatego że /auth/2fa-challenge page miała link do tego endpointa którego
 * wcześniej nie było (Marcin trafiał na 404 gdy chciał się wylogować przed
 * potwierdzeniem 2FA). Reszta aplikacji używa client-side `supabase.auth.signOut()`
 * w przyciskach Wyloguj — ten endpoint jest fallbackiem dla stron które nie mają
 * full client lub gdy explicit GET nawigacja jest potrzebna.
 *
 * Bezpiecznie idempotent: jeśli user nie ma sesji, signOut() jest no-op,
 * cookie clearing też no-op, redirect i tak działa.
 */
async function handleSignOut(request: NextRequest): Promise<NextResponse> {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Server Component context — fine, signOut still works via API call
                    }
                },
            },
        }
    );

    // Best-effort Supabase signOut (czyści sb-* cookies)
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.warn('[signout] supabase.auth.signOut failed (continuing anyway):', err);
    }

    // Czyść mfa_session cookie (po 2FA challenge user dostał httpOnly cookie)
    try {
        await clearMfaSessionCookie();
    } catch (err) {
        console.warn('[signout] clearMfaSessionCookie failed (continuing):', err);
    }

    // Determine redirect target
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const safeRedirect = redirectParam && redirectParam.startsWith('/')
        ? redirectParam
        : '/pracownik/login';

    const redirectUrl = new URL(safeRedirect, request.url);
    return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(request: NextRequest) {
    return handleSignOut(request);
}

export async function POST(request: NextRequest) {
    return handleSignOut(request);
}
