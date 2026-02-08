'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StrefaPacjentaRoot() {
    const router = useRouter();
    const [showFallback, setShowFallback] = useState(false);

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

        // Show fallback after 3 seconds in case redirect fails
        const timer = setTimeout(() => setShowFallback(true), 3000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            gap: '1.5rem'
        }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(212,175,55,0.15)', borderTop: '3px solid #dcb14a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Przekierowanie...</p>
            {showFallback && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', marginTop: '1rem' }}>
                    <a href="/strefa-pacjenta/login" style={{ color: '#dcb14a', textDecoration: 'underline', fontSize: '0.9rem' }}>
                        Zaloguj się do Strefy Pacjenta →
                    </a>
                    <a href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.8rem' }}>
                        Wróć na stronę główną
                    </a>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
