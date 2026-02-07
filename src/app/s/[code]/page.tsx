'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ShortLinkRedirect() {
    const params = useParams<{ code: string }>();

    useEffect(() => {
        const redirect = async () => {
            try {
                const res = await fetch(`/api/short-links/${params.code}`);

                if (res.ok) {
                    const data = await res.json();

                    // Redirect to destination
                    if (data.destinationUrl) {
                        window.location.href = data.destinationUrl;
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    // Link not found or expired
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('[SHORT-LINK] Redirect error:', error);
                window.location.href = '/';
            }
        };

        redirect();
    }, [params.code]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'var(--color-background)',
            color: 'var(--color-text-main)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h2>Przekierowywanie...</h2>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>
                    Za chwilę zostaniesz przekierowany
                </p>
            </div>
        </div>
    );
}
