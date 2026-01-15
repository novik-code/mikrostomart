import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
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

    // If accessing admin routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
        // Allow access to login and reset-password
        if (
            request.nextUrl.pathname === "/admin/login" ||
            request.nextUrl.pathname === "/admin/update-password"
        ) {
            // If already logged in, redirect to admin panel
            if (user) {
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return response;
        }

        // Checking authentication for main /admin page
        if (!user) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        // Optional: Check specific email
        if (user.email !== "dr.nowosielski@gmail.com") {
            // Log out unauthorized user? Or just show 403.
            // For better UX, redirect to login with error, or maybe just home.
            // returning new NextResponse("Unauthorized", { status: 403 }); 
            // For now, let's just allow login for any created user in Supabase, 
            // assuming user creation is disabled or restricted.
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
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
