'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StrefaPacjentaRoot() {
    const router = useRouter();

    useEffect(() => {
        // Check if patient is logged in
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        const hasToken = tokenCookie && tokenCookie.split('=')[1];

        // Redirect based on auth status
        if (hasToken) {
            router.replace('/strefa-pacjenta/dashboard');
        } else {
            router.replace('/strefa-pacjenta/login');
        }
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
        }}>
            Przekierowanie...
        </div>
    );
}
