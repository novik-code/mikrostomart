'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    locale: string;
    account_status: string | null;
    address?: {
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
        postalCode?: string;
        city?: string;
    };
    // From Prodentis
    street?: string;
    houseNumber?: string;
    apartmentNumber?: string;
    postalCode?: string;
    city?: string;
    prodentis_id?: string;
    supabaseId?: string;
}

export function usePatientAuth() {
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [accountStatus, setAccountStatus] = useState<string | null>(null);
    const router = useRouter();

    /**
     * Get auth token from cookie (backward compatibility).
     * With httpOnly cookies, JS can't read the token directly,
     * but this fallback reads the legacy non-httpOnly cookie if it exists.
     * For API calls: the httpOnly cookie is sent automatically by the browser.
     */
    const getAuthToken = useCallback(() => {
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
    }, []);

    /**
     * Logout — calls server endpoint to clear httpOnly cookie,
     * also clears legacy client-side cookie and localStorage.
     */
    const logout = useCallback(async () => {
        try {
            await fetch('/api/patients/logout', { method: 'POST' });
        } catch {
            // Fallback: clear non-httpOnly cookie manually
        }
        // Also clear legacy client-side data
        document.cookie = 'patient_token=; path=/; max-age=0';
        localStorage.removeItem('patient_data');
        router.push('/strefa-pacjenta/login');
    }, [router]);

    useEffect(() => {
        const loadPatient = async () => {
            try {
                // With httpOnly cookie, we just call the API — browser sends cookie automatically.
                // Also try passing Authorization header for backward compat.
                const token = getAuthToken();
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const res = await fetch('/api/patients/me', { headers });

                if (!res.ok) {
                    throw new Error('Unauthorized');
                }

                const data = await res.json();
                setPatient(data);
                setAccountStatus(data.account_status || null);
            } catch (err) {
                console.error('[usePatientAuth] Failed to load patient:', err);
                router.push('/strefa-pacjenta/login');
            } finally {
                setIsLoading(false);
            }
        };

        loadPatient();
    }, [router, getAuthToken]);

    return { patient, isLoading, accountStatus, logout, getAuthToken };
}
