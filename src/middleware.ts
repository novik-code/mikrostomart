import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

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
 * Paths that should bypass next-intl locale handling entirely.
 * These are internal apps (admin, employee zones) or technical endpoints,
 * not part of the multilingual public site.
 *
 * Faza 2 SEO Recovery (2026-05-09): public pages live in src/app/[locale]/
 * while these paths stay in src/app/ root and don't get locale prefix routing.
 */
const NON_LOCALE_PATHS = [
    '/api/',
    '/admin',
    '/pracownik',
    '/ekarta/',
    '/qr-display',
    '/zgody/',
    '/auth/',
    '/opieka/',
    '/s/',
    '/zespol',  // 301-redirected to /o-nas via next.config redirects
];

function shouldBypassIntl(pathname: string): boolean {
    return NON_LOCALE_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

// next-intl middleware handles URL → locale extraction and redirect for /en, /de, /ua prefixes
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Apply security headers to response.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy — restrictive but allows needed sources
    // Report-Only mode: logs violations to browser console without blocking
    // After verifying no issues, change to 'Content-Security-Policy' to enforce
    const prodentisOrigin = process.env.PRODENTIS_API_URL
        ? new URL(process.env.PRODENTIS_API_URL).origin
        : 'http://83.230.40.14:3000';

    response.headers.set('Content-Security-Policy-Report-Only', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' https://fonts.gstatic.com",
        `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.smsapi.pl https://api.stripe.com https://maps.googleapis.com ${prodentisOrigin}`,
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

    // ─── Fast path for bots: skip auth + apply intl + security headers ─────
    if (isBot(request)) {
        // Bots still need intl middleware for locale-prefixed URLs
        if (!shouldBypassIntl(pathname)) {
            const intlResponse = intlMiddleware(request);
            return addSecurityHeaders(intlResponse);
        }
        return addSecurityHeaders(NextResponse.next());
    }

    // ─── Block /mapa-bolu/editor in production (debug tool) ───────────────
    // Note: /mapa-bolu lives under [locale] now, so editor path includes locale prefix.
    // Match both with and without locale prefix.
    const isMapaBoluEditor = pathname === '/mapa-bolu/editor'
        || /^\/(en|de|ua)\/mapa-bolu\/editor$/.test(pathname);
    if (isMapaBoluEditor) {
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
        return addSecurityHeaders(intlMiddleware(request));
    }

    // ─── Patient zone protection (JWT cookie check) ──────────────────────
    // Patient auth uses custom JWT cookies, not Supabase auth.
    // Strefa pacjenta lives under [locale] now (Faza 2 SEO 2026-05-09):
    // /strefa-pacjenta/* (PL) or /en|de|ua/strefa-pacjenta/*. We strip the locale
    // prefix when checking auth-protected vs public sub-paths.
    const localePrefixMatch = pathname.match(/^\/(en|de|ua)(\/.*)?$/);
    const pathWithoutLocale = localePrefixMatch
        ? (localePrefixMatch[2] || '/')
        : pathname;

    if (pathWithoutLocale.startsWith('/strefa-pacjenta')) {
        const PUBLIC_PATIENT_PATHS = [
            '/strefa-pacjenta/login',
            '/strefa-pacjenta/register',
            '/strefa-pacjenta/reset-password',
        ];

        const isPublicPatientPage = PUBLIC_PATIENT_PATHS.some(p => pathWithoutLocale.startsWith(p))
            || pathWithoutLocale === '/strefa-pacjenta';

        if (!isPublicPatientPage) {
            const token = request.cookies.get('patient_token')?.value;
            if (!token) {
                // Preserve locale prefix in redirect target if present
                const loginPath = localePrefixMatch
                    ? `/${localePrefixMatch[1]}/strefa-pacjenta/login`
                    : '/strefa-pacjenta/login';
                return NextResponse.redirect(new URL(loginPath, request.url));
            }
        }

        // Patient zone doesn't need Supabase auth — apply intl + security
        return addSecurityHeaders(intlMiddleware(request));
    }

    // ─── Non-locale paths (admin, pracownik, api, etc.): only Supabase auth ──
    if (shouldBypassIntl(pathname)) {
        return handleSupabaseAuth(request);
    }

    // ─── All public locale-aware routes: next-intl handles URL → locale ──
    return addSecurityHeaders(intlMiddleware(request));
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
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
    ],
};

