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

    const getAuthToken = useCallback(() => {
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
    }, []);

    const logout = useCallback(() => {
        document.cookie = 'patient_token=; path=/; max-age=0';
        localStorage.removeItem('patient_data');
        router.push('/strefa-pacjenta/login');
    }, [router]);

    useEffect(() => {
        const loadPatient = async () => {
            const token = getAuthToken();

            if (!token) {
                router.push('/strefa-pacjenta/login');
                return;
            }

            try {
                const res = await fetch('/api/patients/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

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
