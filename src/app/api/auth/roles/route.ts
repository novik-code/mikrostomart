import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { getUserRoles } from '@/lib/roles';
import { extractBearerToken, getUserFromBearerToken } from '@/lib/bearerAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/roles
 * Returns the current authenticated user's roles.
 * Accepts either the web cookie session or a native staff Bearer token.
 */
export async function GET() {
    try {
        // 1. Native staff clients — Authorization: Bearer <supabase access_token>.
        const headerStore = await headers();
        const bearer = extractBearerToken(headerStore.get('authorization'));
        let user = bearer ? await getUserFromBearerToken(bearer) : null;

        // 2. Web — Supabase cookie session (unchanged when no Bearer).
        if (!user) {
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
                                // Ignored in read-only context
                            }
                        },
                    },
                }
            );
            const { data: { user: cookieUser }, error } = await supabase.auth.getUser();
            if (!error) user = cookieUser;
        }

        if (!user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const roles = await getUserRoles(user.id);

        return NextResponse.json({
            userId: user.id,
            email: user.email,
            roles,
        });
    } catch (error) {
        console.error('[Auth/Roles] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
