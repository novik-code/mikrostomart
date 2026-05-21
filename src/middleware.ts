import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { verifyMfaSessionToken, MFA_COOKIE_NAME } from "./lib/mfaSession";

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
    // Batch SEO-2 (2026-05-21): usunięto '/zespol' z NON_LOCALE_PATHS — teraz
    // /zespol/marcin-nowosielski i /zespol/elzbieta-nowosielska to dedykowane
    // multi-locale strony pod src/app/[locale]/zespol/*. Stary redirect
    // /zespol → /o-nas (plus /zespol/<numeric-slug>) nadal działa via next.config
    // redirects (apply BEFORE middleware), więc legacy Joomla URLs są obsłużone.
];

function shouldBypassIntl(pathname: string): boolean {
    return NON_LOCALE_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

// next-intl middleware handles URL → locale extraction and redirect for /en, /de, /ua prefixes
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Build Sentry CSP report-uri endpoint from existing Sentry DSN.
 *
 * DSN format: https://<public-key>@<host>/<project-id>
 * Report URI: https://<host>/api/<project-id>/security/?sentry_key=<public-key>&sentry_environment=<env>
 *
 * Same key + host + project id, different path. Built at request time so
 * production and demo deployments each report to their own Sentry project
 * without needing a separate env var. Returns null if DSN is missing or
 * malformed — caller should omit the directive in that case.
 */
function buildSentryCspReportUri(): string | null {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
    if (!dsn) return null;
    try {
        const u = new URL(dsn);
        const projectId = u.pathname.replace(/^\/+/, ''); // strip leading slash(es)
        const publicKey = u.username;
        if (!projectId || !publicKey) return null;
        const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'production';
        return `${u.protocol}//${u.host}/api/${projectId}/security/?sentry_key=${publicKey}&sentry_environment=${encodeURIComponent(env)}`;
    } catch {
        return null;
    }
}

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

    // Sentry CSP report endpoint — built from DSN so this works on both Mikrostomart
    // and Demo deployments automatically. Null if DSN missing — directive is then omitted.
    const cspReportUri = buildSentryCspReportUri();

    // Faza E SEO (2026-05-09): napraw next-intl Link header `hreflang="ua"` → "uk".
    // Lighthouse SEO audit oznacza `ua` jako "nieoczekiwany kod języka" bo ISO 639-1
    // dla ukraińskiego to `uk` (URL prefix `/ua` zostaje, ale hreflang language code
    // musi być `uk`). Routing.ts ma `locales: ['pl', 'en', 'de', 'ua']` — `'ua'` jest
    // URL-friendly ale nie ISO. Zmiana całej nomenklatury locale to ryzykowny refactor
    // (i18n folders, wszystkie miejsca z locale === 'ua', etc.). Tańsze: post-process
    // Link header w naszym middleware.
    const linkHeader = response.headers.get('link');
    if (linkHeader && linkHeader.includes('hreflang="ua"')) {
        response.headers.set('link', linkHeader.replace(/hreflang="ua"/g, 'hreflang="uk"'));
    }

    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://www.googletagmanager.com https://www.googleadservices.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' https://fonts.gstatic.com",
        // Faza C SEO: Sentry ingest endpoints (browser SDK posts errors here) + YouTube
        // tracking domain so background video doesn't generate CSP report noise.
        `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.smsapi.pl https://api.stripe.com https://maps.googleapis.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io https://www.youtube.com ${prodentisOrigin}`,
        // YouTube embed loads from youtube.com/embed but resources come from googlevideo,
        // ytimg, and youtube-nocookie subdomains.
        "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com",
        "media-src 'self' blob: https://*.googlevideo.com",
        "worker-src 'self' blob:",
    ];
    // S4-2a (2026-05-13 EOD #6): send violation reports to Sentry so we can audit
    // before flipping Report-Only off. Without this directive, violations log only
    // to the browser console — never reach our telemetry, so we'd be flying blind
    // when toggling to enforce. Skipped if DSN missing (e.g. local dev w/o Sentry).
    if (cspReportUri) {
        cspDirectives.push(`report-uri ${cspReportUri}`);
    }
    response.headers.set('Content-Security-Policy-Report-Only', cspDirectives.join('; '));

    // Additional security headers (supplements existing ones in API routes)
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Fast path for bots: skip auth ONLY for public SEO paths ────────────
    // S10-3 (audyt P1 #3): bot bypass dla /admin, /pracownik, /api, /auth itd.
    // omijał handleSupabaseAuth + 2FA enforcement → `curl -A Googlebot /admin`
    // zwracał 200 zamiast 307. Fix: bypass auth tylko dla public locale paths.
    // Dla NON_LOCALE_PATHS (admin/pracownik/api/...) bot przechodzi przez
    // normalną auth — i tak nie powinien tam wchodzić, a jeśli wchodzi, to
    // dostaje redirect do login.
    if (isBot(request)) {
        // Bots na public locale paths — skip Supabase auth dla speed, apply intl
        if (!shouldBypassIntl(pathname)) {
            const intlResponse = intlMiddleware(request);
            return addSecurityHeaders(intlResponse);
        }
        // Bots na NON_LOCALE_PATHS (admin/pracownik/api/...) — full auth flow
        // continues below jak dla każdego innego usera.
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

    // ─── S8-2 2FA Enforcement ────────────────────────────────────────────
    // After Supabase auth check, ensure 2FA is satisfied for protected routes.
    // Skip during login flow, password update, /auth/2fa-challenge, and 2FA API.
    if (user) {
        const mfaCheck = await enforce2FA(request, user.id, pathname);
        if (mfaCheck) {
            return addSecurityHeaders(mfaCheck);
        }
    }

    return addSecurityHeaders(response);
}

/**
 * S8-2 2FA enforcement.
 *
 * Rules:
 *   - Skip for login pages, password update, /auth/2fa-challenge, and 2FA APIs
 *     (chicken-and-egg: user must reach setup/challenge without 2FA cookie)
 *   - If user is admin AND 2FA NOT enabled → redirect to /pracownik/security?force=true
 *     (mandatory per D3 = Wariant B)
 *   - If user has 2FA enabled AND no valid mfa_session cookie → redirect to /auth/2fa-challenge
 *
 * Lookup employee row via service_role (RLS doesn't matter here, server-only).
 */
async function enforce2FA(request: NextRequest, userId: string, pathname: string): Promise<NextResponse | null> {
    // Skip paths that 2FA setup/challenge themselves need to work
    const SKIP_2FA_PATHS = [
        '/auth/2fa-challenge',
        '/api/auth/2fa/',
        '/api/admin/2fa/',
        '/admin/login',
        '/admin/update-password',
        '/pracownik/login',
        '/pracownik/reset-haslo',
        '/api/auth/signout',
        '/pracownik/security',  // user needs to reach security page to setup 2FA
    ];
    if (SKIP_2FA_PATHS.some(p => pathname === p || pathname.startsWith(p))) {
        return null;
    }

    // Only enforce on /admin and /pracownik routes (and admin/employee API paths)
    const PROTECTED_PREFIXES = ['/admin', '/pracownik', '/api/admin', '/api/employee'];
    if (!PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
        return null;
    }

    // Look up employee + role data
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) return null;

        const admin = createClient(supabaseUrl, serviceKey);

        const [{ data: employee }, { data: roles }] = await Promise.all([
            admin.from('employees').select('totp_enabled').eq('user_id', userId).maybeSingle(),
            admin.from('user_roles').select('role').eq('user_id', userId),
        ]);

        const isAdmin = (roles || []).some(r => r.role === 'admin');
        const totpEnabled = Boolean(employee?.totp_enabled);

        // Case 1: Admin without 2FA → force setup
        if (isAdmin && !totpEnabled) {
            const url = new URL('/pracownik/security?force=true', request.url);
            return NextResponse.redirect(url);
        }

        // Case 2: 2FA enabled but no valid mfa_session → challenge
        if (totpEnabled) {
            const cookie = request.cookies.get(MFA_COOKIE_NAME)?.value;
            const session = verifyMfaSessionToken(cookie);
            if (!session || session.userId !== userId) {
                const url = new URL('/auth/2fa-challenge', request.url);
                url.searchParams.set('redirect', pathname);
                return NextResponse.redirect(url);
            }
        }

        return null;
    } catch (err) {
        console.error('[middleware 2FA] enforce error:', err);
        // Fail open: if 2FA check breaks, allow through (don't lock everyone out from bugs).
        // Production should monitor Sentry for this error.
        return null;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         *
         * Excluded extensions cover: images, fonts, audio/video, and especially
         * static assets in /public/ that the next-intl + Supabase middleware
         * would otherwise route through page logic (resulting in 404).
         *
         * CRITICAL after Faza 2 (URL-based i18n) regression: /sw.js, /firebase-messaging-sw.js,
         * /manifest.json, /push-sw.js were being 404'd because the matcher only
         * excluded image extensions. Adding js/css/json/woff2/map/webmanifest fixes PWA.
         *
         * 2026-05-18: Added `mjs` + `wasm` after pdfjs-dist 4.10.38 update — middleware
         * routed /pdf.worker.min.mjs through page logic → 404 → "API version does not
         * match Worker version" crash w /zgody/[token] (e-karta podpisywanie zgód
         * pacjentów). Bez tego pacjent nie mógł podpisać zgody na tablecie. Bug-class
         * "static asset extension not in exclusion list" jest zazwyczaj fatalny dla
         * features które są blokujące dla operacji gabinetu.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|js|mjs|wasm|css|woff|woff2|ttf|otf|eot|json|webmanifest|map|mp4|mp3|wav|pdf)$).*)",
    ],
};

