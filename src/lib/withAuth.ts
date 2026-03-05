import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from './auth';
import { hasRole, UserRole } from './roles';
import type { User } from '@supabase/supabase-js';

/**
 * Higher-order function that wraps a Next.js API route handler with
 * authentication and optional role checks.
 *
 * Usage (single role):
 *   export const GET = withAuth(async (req, user) => { ... });
 *
 * Usage (admin-only):
 *   export const POST = withAuth(async (req, user) => { ... }, { roles: ['admin'] });
 *
 * Usage (employee or admin):
 *   export const GET = withAuth(async (req, user) => { ... }, { roles: ['employee', 'admin'] });
 *
 * The handler receives the authenticated `User` object. If the user is not
 * authenticated or doesn't have the required role, a 401/403 is returned
 * automatically — no boilerplate needed in each route.
 */

type AuthenticatedHandler = (
    request: NextRequest,
    user: User,
    context?: { params: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

interface WithAuthOptions {
    /** Required roles — user must have at least one of these. If empty/omitted, any authenticated user is allowed. */
    roles?: UserRole[];
}

export function withAuth(handler: AuthenticatedHandler, options?: WithAuthOptions) {
    return async (request: NextRequest, context?: { params: Record<string, string> }) => {
        const user = await verifyAdmin();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Role check (if specified)
        if (options?.roles && options.roles.length > 0) {
            const roleChecks = await Promise.all(
                options.roles.map(role => hasRole(user.id, role))
            );
            const hasAnyRole = roleChecks.some(Boolean);
            if (!hasAnyRole) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return handler(request, user, context);
    };
}
