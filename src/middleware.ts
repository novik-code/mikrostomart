import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Known search engine bot user-agent patterns.
 * When detected, skip Supabase auth to reduce latency for crawlers.
 */
const BOT_UA_PATTERNS = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot/i;

function isBot(request: NextRequest): boolean {
    const ua = request.headers.get('user-agent') || '';
    return BOT_UA_PATTERNS.test(ua);
}

/**
 * Apply security headers to response.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy — restrictive but allows needed sources
    // Report-Only mode: logs violations to browser console without blocking
    // After verifying no issues, change to 'Content-Security-Policy' to enforce
    response.headers.set('Content-Security-Policy-Report-Only', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.smsapi.pl https://api.stripe.com https://maps.googleapis.com http://83.230.40.14:3000",
        "frame-src 'self' https://www.google.com https://www.youtube.com",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
    ].join('; '));

    // Additional security headers (supplements existing ones in API routes)
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Fast path for bots: skip auth, just apply security headers ─────
    if (isBot(request)) {
        return addSecurityHeaders(NextResponse.next());
    }

    // ─── Block /mapa-bolu/editor in production (debug tool) ───────────────
    if (pathname === '/mapa-bolu/editor') {
        // Only allow if user has Supabase auth session (admin/employee)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            const supabase = createServerClient(supabaseUrl, supabaseKey, {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { /* read-only check */ },
                },
            });
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        }
        return addSecurityHeaders(NextResponse.next());
    }

    // ─── Patient zone protection (JWT cookie check) ──────────────────────
    // Patient auth uses custom JWT cookies, not Supabase auth.
    // This is a fast server-side guard; full JWT verification happens in API routes.
    if (pathname.startsWith('/strefa-pacjenta')) {
        const PUBLIC_PATIENT_PATHS = [
            '/strefa-pacjenta/login',
            '/strefa-pacjenta/register',
            '/strefa-pacjenta/reset-password',
        ];

        const isPublicPatientPage = PUBLIC_PATIENT_PATHS.some(p => pathname.startsWith(p))
            || pathname === '/strefa-pacjenta';

        if (!isPublicPatientPage) {
            const token = request.cookies.get('patient_token')?.value;
            if (!token) {
                return NextResponse.redirect(new URL('/strefa-pacjenta/login', request.url));
            }
        }

        // Patient zone doesn't need Supabase auth — return early
        return addSecurityHeaders(NextResponse.next());
    }

    // ─── Supabase auth for admin/employee routes ──────────────────────────
    return handleSupabaseAuth(request);
}

/**
 * Handles Supabase auth: refreshes session cookies and protects admin/employee routes.
 */
async function handleSupabaseAuth(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // If accessing admin routes
    if (pathname.startsWith("/admin")) {
        if (pathname === "/admin/login") {
            if (user) {
                return addSecurityHeaders(NextResponse.redirect(new URL("/admin", request.url)));
            }
            return addSecurityHeaders(response);
        }

        if (pathname === "/admin/update-password") {
            return addSecurityHeaders(response);
        }

        if (!user) {
            return addSecurityHeaders(NextResponse.redirect(
                new URL("/admin/login", request.url)
            ));
        }
    }

    // If accessing employee routes (/pracownik)
    if (pathname.startsWith("/pracownik")) {
        if (
            pathname === "/pracownik/login" ||
            pathname === "/pracownik/reset-haslo"
        ) {
            if (user) {
                return addSecurityHeaders(NextResponse.redirect(
                    new URL("/pracownik", request.url)
                ));
            }
            return addSecurityHeaders(response);
        }

        if (!user) {
            return addSecurityHeaders(NextResponse.redirect(
                new URL("/pracownik/login", request.url)
            ));
        }
    }

    return addSecurityHeaders(response);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};

