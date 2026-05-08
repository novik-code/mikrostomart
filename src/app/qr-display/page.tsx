'use client';

// Strona kioskowa: pełnoekranowy rotujący QR dla pracowników do skanowania.
// Auth: tylko admin (RBAC sprawdzane po stronie /api/time/qr-current).
// UX: iPad zalogowany raz w recepcji, strona auto-fetchuje świeży QR na bieżąco.

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCurrent {
    payload: string;
    period: number;
    rotationSeconds: number;
    validUntil: number;
    locationName: string;
    locationId: string;
    serverTime: number;
    isDemoMode?: boolean;
}

export default function QrDisplayPage() {
    const [data, setData] = useState<QrCurrent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());
    const [authChecked, setAuthChecked] = useState(false);
    const [authorized, setAuthorized] = useState(false);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ukryj globalny Navbar/Footer/DemoBanner — strona ma być pełnoekranowa
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'hide-global-nav-qr-display';
        style.textContent = `
            nav[class*="Navbar"],
            footer[class*="Footer"],
            [class*="DemoBanner"],
            [class*="AssistantTeaser"],
            [class*="PWAInstallPrompt"],
            [class*="AdminFloatingBar"] { display: none !important; }
            html, body { background: #0a0a0f !important; overflow: hidden; }
        `;
        document.head.appendChild(style);
        return () => style.remove();
    }, []);

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const scheduleRefresh = useCallback((nextValidUntil: number) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        // Odśwież ~3 sekundy przed wygaśnięciem (mała tolerancja synchronizacji)
        const wait = Math.max(2000, nextValidUntil - Date.now() - 3000);
        refreshTimerRef.current = setTimeout(() => {
            void fetchQr();
        }, wait);
    }, []);

    const fetchQr = useCallback(async () => {
        try {
            const res = await fetch('/api/time/qr-current', { cache: 'no-store' });
            if (res.status === 401) {
                setAuthorized(false);
                setAuthChecked(true);
                return;
            }
            if (!res.ok) {
                setError(`Błąd ${res.status}`);
                scheduleRefresh(Date.now() + 5000);
                return;
            }
            const json = (await res.json()) as QrCurrent;
            setData(json);
            setError(null);
            setAuthorized(true);
            setAuthChecked(true);
            scheduleRefresh(json.validUntil);
        } catch (e) {
            setError(`Błąd sieci: ${(e as Error).message}`);
            scheduleRefresh(Date.now() + 5000);
        }
    }, [scheduleRefresh]);

    useEffect(() => {
        void fetchQr();
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, [fetchQr]);

    if (!authChecked) {
        return (
            <FullScreen>
                <div style={{ color: '#888', fontSize: '1.2rem' }}>Ładowanie…</div>
            </FullScreen>
        );
    }

    if (!authorized) {
        return (
            <FullScreen>
                <div style={{ textAlign: 'center', color: '#fafafa', maxWidth: 480 }}>
                    <h1 style={{ fontSize: '2rem', color: '#dcb14a', marginBottom: '1rem' }}>
                        Wymagane logowanie admina
                    </h1>
                    <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                        Zaloguj się jako administrator, żeby ekran QR mógł generować świeże tokeny.
                    </p>
                    <a
                        href="/admin/login?redirectTo=/qr-display"
                        style={{
                            display: 'inline-block',
                            padding: '0.9rem 2rem',
                            background: '#dcb14a',
                            color: '#0a0a0f',
                            borderRadius: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                        }}
                    >
                        Zaloguj się
                    </a>
                </div>
            </FullScreen>
        );
    }

    if (!data) {
        return (
            <FullScreen>
                <div style={{ color: '#888', fontSize: '1.2rem' }}>
                    {error ?? 'Inicjalizacja…'}
                </div>
            </FullScreen>
        );
    }

    const remainingMs = Math.max(0, data.validUntil - now);
    const remainingSec = Math.ceil(remainingMs / 1000);
    const totalMs = data.rotationSeconds * 1000;
    const progress = Math.max(0, Math.min(1, remainingMs / totalMs));

    const clock = new Date(now).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const dateStr = new Date(now).toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <FullScreen>
            <div
                style={{
                    width: '100%',
                    maxWidth: 720,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    color: '#fafafa',
                    padding: '2rem',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', letterSpacing: 4, color: '#888', textTransform: 'uppercase' }}>
                        Rejestracja czasu pracy
                    </div>
                    <h1 style={{ fontSize: '2rem', color: '#dcb14a', margin: '0.4rem 0', fontWeight: 700 }}>
                        {data.locationName}
                    </h1>
                </div>

                <div
                    style={{
                        background: '#fff',
                        padding: '1.5rem',
                        borderRadius: 24,
                        boxShadow: '0 30px 80px rgba(220,177,74,0.25)',
                    }}
                >
                    {data.isDemoMode ? (
                        <div
                            style={{
                                width: 380,
                                height: 380,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                textAlign: 'center',
                                padding: '1rem',
                            }}
                        >
                            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🧪</div>
                            <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#444' }}>
                                Tryb demonstracyjny
                            </div>
                            <div style={{ marginTop: '0.6rem' }}>QR niedostępny w demo.</div>
                        </div>
                    ) : (
                        <QRCodeSVG
                            value={data.payload}
                            size={380}
                            level="M"
                            includeMargin={false}
                            fgColor="#0a0a0f"
                            bgColor="#fff"
                        />
                    )}
                </div>

                <div style={{ width: '100%', maxWidth: 380 }}>
                    <div
                        style={{
                            height: 6,
                            background: 'rgba(220,177,74,0.2)',
                            borderRadius: 3,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${progress * 100}%`,
                                background: '#dcb14a',
                                transition: 'width 1s linear',
                            }}
                        />
                    </div>
                    <div
                        style={{
                            marginTop: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                            color: '#888',
                        }}
                    >
                        <span>Świeży QR za {remainingSec}s</span>
                        <span>okres #{data.period}</span>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3.5rem', color: '#fafafa', fontVariantNumeric: 'tabular-nums', fontWeight: 300 }}>
                        {clock}
                    </div>
                    <div style={{ color: '#888', textTransform: 'capitalize' }}>{dateStr}</div>
                </div>

                <div
                    style={{
                        marginTop: '0.5rem',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '0.85rem',
                        maxWidth: 480,
                        lineHeight: 1.6,
                    }}
                >
                    Otwórz aplikację Mikrostomart na telefonie → zakładka <b style={{ color: '#dcb14a' }}>Czas pracy</b> → zeskanuj kod, aby zarejestrować przyjście lub wyjście.
                </div>

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠ {error}</div>
                )}
            </div>
        </FullScreen>
    );
}

function FullScreen({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#0a0a0f',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
            }}
        >
            {children}
        </div>
    );
}
