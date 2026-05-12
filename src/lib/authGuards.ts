import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getUserRoles, type UserRole } from "@/lib/roles";

export type AuthSuccess = { ok: true; user: User; roles: UserRole[] };
export type AuthFailure = { ok: false; response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

async function getSupabaseUser(): Promise<User | null> {
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
                        // Ignored — called from a Server Component without write access
                    }
                },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

function unauthorized(): AuthFailure {
    return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
}

function forbidden(): AuthFailure {
    return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
}

export async function requireSupabaseUser(): Promise<AuthResult> {
    const user = await getSupabaseUser();
    if (!user) return unauthorized();
    const roles = await getUserRoles(user.id);
    return { ok: true, user, roles };
}

export async function requireAdmin(): Promise<AuthResult> {
    const user = await getSupabaseUser();
    if (!user) return unauthorized();
    const roles = await getUserRoles(user.id);
    if (!roles.includes("admin")) return forbidden();
    return { ok: true, user, roles };
}

export async function requireEmployeeOrAdmin(): Promise<AuthResult> {
    const user = await getSupabaseUser();
    if (!user) return unauthorized();
    const roles = await getUserRoles(user.id);
    if (!roles.includes("admin") && !roles.includes("employee")) return forbidden();
    return { ok: true, user, roles };
}
