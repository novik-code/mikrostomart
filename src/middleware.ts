import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

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
        return NextResponse.next();
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
