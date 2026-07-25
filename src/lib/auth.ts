import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { extractBearerToken, getUserFromBearerToken } from "@/lib/bearerAuth";

export async function verifyAdmin() {
    // 1. Native staff clients (mobile app) — Authorization: Bearer <supabase access_token>.
    //    Additive: web sends no Authorization header on employee routes, so the
    //    cookie path below is unchanged byte-for-byte. See lib/bearerAuth.ts.
    const headerStore = await headers();
    const bearer = extractBearerToken(headerStore.get("authorization"));
    if (bearer) {
        const bearerUser = await getUserFromBearerToken(bearer);
        if (bearerUser) return bearerUser;
        // Bearer present but invalid → fall through to cookie.
    }

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
                        // Ignored
                    }
                },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}
