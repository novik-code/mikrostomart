'use client';

import { useState, useEffect } from 'react';

export type UserRole = 'admin' | 'employee' | 'patient';

interface UserRolesState {
    roles: UserRole[];
    email: string | null;
    userId: string | null;
    loading: boolean;
    error: string | null;
}

/**
 * Quick client-side check whether a Supabase auth cookie is present.
 * Avoids triggering /api/auth/roles 401 for anonymous visitors — the 401
 * was logged by browsers as a network error and counted against Lighthouse
 * Best Practices score.
 */
function hasSupabaseAuthCookie(): boolean {
    if (typeof document === 'undefined') return false;
    return document.cookie.split(';').some((c) => c.trim().startsWith('sb-'));
}

/**
 * Client-side hook to fetch the current user's roles.
 *
 * Faza G3 (2026-05-09): skip fetch for anonymous visitors. Previously the hook
 * always fetched /api/auth/roles which returned 401 for non-logged-in users,
 * generating console errors and Lighthouse Best Practices penalties on every
 * public page where the hook was mounted.
 */
export function useUserRoles() {
    const [state, setState] = useState<UserRolesState>({
        roles: [],
        email: null,
        userId: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        // Anonymous visitor → skip fetch, return empty roles immediately.
        if (!hasSupabaseAuthCookie()) {
            setState({
                roles: [],
                email: null,
                userId: null,
                loading: false,
                error: null,
            });
            return;
        }

        const fetchRoles = async () => {
            try {
                const response = await fetch('/api/auth/roles');

                if (!response.ok) {
                    if (response.status === 401) {
                        // Cookie was stale (expired session). Treat as anonymous.
                        setState({ roles: [], email: null, userId: null, loading: false, error: null });
                        return;
                    }
                    throw new Error(`Failed to fetch roles: ${response.status}`);
                }

                const data = await response.json();
                setState({
                    roles: data.roles || [],
                    email: data.email || null,
                    userId: data.userId || null,
                    loading: false,
                    error: null,
                });
            } catch (err) {
                console.error('[useUserRoles] Error:', err);
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Unknown error',
                }));
            }
        };

        fetchRoles();
    }, []);

    const hasRole = (role: UserRole): boolean => state.roles.includes(role);

    return {
        ...state,
        hasRole,
        isAdmin: state.roles.includes('admin'),
        isEmployee: state.roles.includes('employee'),
        isPatient: state.roles.includes('patient'),
    };
}
