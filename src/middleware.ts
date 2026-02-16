import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create the next-intl middleware for locale detection & routing
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Skip i18n for internal routes ───────────────────────────────────
    // Admin, employee, patient portal, and API routes stay Polish-only
    const skipI18nPaths = [
        "/admin",
        "/pracownik",
        "/strefa-pacjenta",
        "/api/",
        "/auth/",
        "/_next/",
        "/manifest.json",
        "/sw.js",
        "/workbox-",
        "/swe-worker-",
    ];

    const shouldSkipI18n = skipI18nPaths.some((p) => pathname.startsWith(p));

    // ─── For non-i18n routes: run Supabase auth only ─────────────────────
    if (shouldSkipI18n) {
        return handleSupabaseAuth(request);
    }

    // ─── For public routes: run i18n first, then Supabase auth ──────────
    const intlResponse = intlMiddleware(request);

    // Then apply Supabase auth on top of the i18n response
    // (primarily for cookie refresh, not route protection on public pages)
    return handleSupabaseAuth(request, intlResponse);
}

/**
 * Handles Supabase auth: refreshes session cookies and protects admin/employee routes.
 * Optionally takes a pre-built response from i18n middleware.
 */
async function handleSupabaseAuth(
    request: NextRequest,
    existingResponse?: NextResponse
) {
    let response =
        existingResponse ||
        NextResponse.next({
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
                    // If we have an existing response from intl, set cookies on it
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
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return response;
        }

        if (pathname === "/admin/update-password") {
            return response;
        }

        if (!user) {
            return NextResponse.redirect(
                new URL("/admin/login", request.url)
            );
        }
    }

    // If accessing employee routes (/pracownik)
    if (pathname.startsWith("/pracownik")) {
        if (
            pathname === "/pracownik/login" ||
            pathname === "/pracownik/reset-haslo"
        ) {
            if (user) {
                return NextResponse.redirect(
                    new URL("/pracownik", request.url)
                );
            }
            return response;
        }

        if (!user) {
            return NextResponse.redirect(
                new URL("/pracownik/login", request.url)
            );
        }
    }

    return response;
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
