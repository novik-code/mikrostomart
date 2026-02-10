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
 * Client-side hook to fetch the current user's roles
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
        const fetchRoles = async () => {
            try {
                const response = await fetch('/api/auth/roles');

                if (!response.ok) {
                    if (response.status === 401) {
                        setState(prev => ({ ...prev, loading: false, error: 'Not authenticated' }));
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
                setState(prev => ({
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
