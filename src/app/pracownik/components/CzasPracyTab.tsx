'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Clock, Camera, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { TimeStatusResponse, TimeEntryType } from '@/lib/timeTracking/types';

// Skaner code-split — biblioteka odpala kamerę dopiero gdy ją otworzymy
const Scanner = dynamic(
    () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
    { ssr: false, loading: () => <ScannerLoader /> }
);

interface ScanResult {
    ok: boolean;
    duplicate?: boolean;
    type?: TimeEntryType;
    scannedAt?: string;
    employeeName?: string;
    locationName?: string | null;
    todayWorkedMinutes?: number;
    message?: string;
    error?: string;
    code?: string;
}

export default function CzasPracyTab() {
    const [status, setStatus] = useState<TimeStatusResponse | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanInFlight, setScanInFlight] = useState(false);
    const lastScanAt = useRef<number>(0);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/time/status', { cache: 'no-store' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setStatusError(data?.error ?? `Błąd ${res.status}`);
                setStatus(null);
            } else {
                const data = (await res.json()) as TimeStatusResponse;
                setStatus(data);
                setStatusError(null);
            }
        } catch (e) {
            setStatusError((e as Error).message);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchStatus();
        const t = setInterval(() => void fetchStatus(), 30000);
        return () => clearInterval(t);
    }, [fetchStatus]);

    const handleScan = useCallback(
        async (codes: Array<{ rawValue: string }>) => {
            if (!codes.length) return;
            // Throttle: max jeden POST/2.5s
            const now = Date.now();
            if (now - lastScanAt.current < 2500 || scanInFlight) return;
            lastScanAt.current = now;
            setScanInFlight(true);

            const payload = codes[0].rawValue;
            try {
                const res = await fetch('/api/time/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        qrPayload: payload,
                        deviceInfo: {
                            userAgent: navigator.userAgent,
                            platform: navigator.platform,
                            language: navigator.language,
                            screen: `${window.screen.width}x${window.screen.height}`,
                        },
                    }),
                });
                const data = (await res.json()) as ScanResult;
                if (!res.ok) {
                    setScanResult({ ok: false, error: data.error ?? `Błąd ${res.status}`, code: data.code });
                } else {
                    setScanResult(data);
                    void fetchStatus();
                }
            } catch (e) {
                setScanResult({ ok: false, error: (e as Error).message });
            } finally {
                setScanInFlight(false);
                setScannerOpen(false);
            }
        },
        [fetchStatus, scanInFlight]
    );

    const handleScanError = useCallback((err: unknown) => {
        console.warn('[scan] error:', err);
    }, []);

    const isWorking = status?.isWorkingNow ?? false;
    const expectedAction = status?.expectedNextType ?? 'clock_in';

    return (
        <div style={{ padding: '1.25rem', maxWidth: 720, margin: '0 auto' }}>
            <header style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={26} style={{ color: '#fbbf24' }} /> Czas pracy
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: 4 }}>
                    Skanuj QR z ekranu w recepcji, żeby zarejestrować przyjście lub wyjście.
                </p>
            </header>

            {statusLoading ? (
                <Card>
                    <Loader2 size={20} className="spin" /> Ładowanie statusu…
                </Card>
            ) : statusError ? (
                <Card>
                    <AlertCircle size={20} style={{ color: '#ef4444' }} />
                    <div>{statusError}</div>
                </Card>
            ) : status ? (
                <>
                    {/* HERO STATUS */}
                    <div
                        style={{
                            background: isWorking
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))'
                                : 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(217,119,6,0.04))',
                            border: `1px solid ${isWorking ? 'rgba(16,185,129,0.35)' : 'rgba(251,191,36,0.3)'}`,
                            borderRadius: 16,
                            padding: '1.5rem',
                            marginBottom: '1rem',
                        }}
                    >
                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 2, color: isWorking ? '#10b981' : '#fbbf24' }}>
                            {isWorking ? 'Jesteś w pracy' : 'Nie jesteś jeszcze wbity'}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#fff', marginTop: 6 }}>
                            {status.employee.name}
                        </div>
                        {status.employee.position && (
                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
                                {status.employee.position}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '0.75rem',
                                marginTop: '1.25rem',
                            }}
                        >
                            <Stat label="Dziś przepracowane" value={formatMinutes(status.today.workedMinutes)} highlight />
                            <Stat label="Pierwsze przyjście" value={formatTime(status.today.firstClockIn)} />
                            <Stat label="Ostatnie wyjście" value={formatTime(status.today.lastClockOut)} />
                        </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <button
                        onClick={() => {
                            setScanResult(null);
                            setScannerOpen(true);
                        }}
                        style={{
                            width: '100%',
                            padding: '1.1rem 1.5rem',
                            borderRadius: 14,
                            border: 'none',
                            background: expectedAction === 'clock_in'
                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        }}
                    >
                        <Camera size={22} />
                        {expectedAction === 'clock_in' ? 'Zarejestruj przyjście' : 'Zarejestruj wyjście'}
                    </button>

                    {/* TODAY ENTRIES */}
                    {status.today.entries.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h2 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '0.6rem' }}>
                                Dzisiejsze wpisy
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {status.today.entries.map((e) => (
                                    <div
                                        key={e.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            padding: '0.6rem 0.9rem',
                                            borderRadius: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: e.type === 'clock_in' ? 'rgba(16,185,129,0.2)' : 'rgba(251,146,60,0.2)',
                                                color: e.type === 'clock_in' ? '#10b981' : '#fb923c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {e.type === 'clock_in' ? '➜' : '✓'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#fff', fontSize: '0.9rem' }}>
                                                {e.type === 'clock_in' ? 'Przyjście' : 'Wyjście'}
                                                {e.manual && (
                                                    <span style={{ marginLeft: 8, color: '#fbbf24', fontSize: '0.75rem' }}>
                                                        (korekta admina)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatTime(e.scannedAt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : null}

            {/* SCANNER MODAL */}
            {scannerOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.95)',
                        zIndex: 100000,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', color: '#fff' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>
                                Skanuj QR
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                {expectedAction === 'clock_in' ? 'Rejestruję przyjście' : 'Rejestruję wyjście'}
                            </div>
                        </div>
                        <button
                            onClick={() => setScannerOpen(false)}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                border: 'none',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={22} />
                        </button>
                    </div>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <Scanner
                            onScan={handleScan}
                            onError={handleScanError}
                            constraints={{ facingMode: 'environment' }}
                            scanDelay={500}
                            sound={false}
                            allowMultiple={false}
                            styles={{ container: { width: '100%', height: '100%' } }}
                        />
                        {scanInFlight && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    gap: 12,
                                }}
                            >
                                <Loader2 size={22} className="spin" /> Zapis…
                            </div>
                        )}
                    </div>
                    <div style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Wyceluj kamerę w QR kod na ekranie w recepcji
                    </div>
                </div>
            )}

            {/* SCAN RESULT TOAST */}
            {scanResult && (
                <div
                    onClick={() => setScanResult(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 100001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#1e293b',
                            borderRadius: 18,
                            padding: '2rem',
                            maxWidth: 420,
                            width: '100%',
                            border: `1px solid ${scanResult.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                            textAlign: 'center',
                            color: '#fff',
                        }}
                    >
                        <div
                            style={{
                                width: 70,
                                height: 70,
                                borderRadius: '50%',
                                background: scanResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                                color: scanResult.ok ? '#10b981' : '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem',
                            }}
                        >
                            {scanResult.ok ? <Check size={32} /> : <AlertCircle size={32} />}
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>
                            {scanResult.ok
                                ? scanResult.duplicate
                                    ? 'Już zarejestrowane'
                                    : scanResult.type === 'clock_in'
                                        ? 'Przyjście zarejestrowane'
                                        : 'Wyjście zarejestrowane'
                                : 'Błąd skanowania'}
                        </h3>
                        {scanResult.ok && scanResult.scannedAt && (
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.4rem', fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
                                {formatTime(scanResult.scannedAt)}
                            </div>
                        )}
                        {scanResult.message && (
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{scanResult.message}</p>
                        )}
                        {scanResult.error && (
                            <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{scanResult.error}</p>
                        )}
                        {scanResult.ok && typeof scanResult.todayWorkedMinutes === 'number' && (
                            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                Dzisiaj przepracowane: <b>{formatMinutes(scanResult.todayWorkedMinutes)}</b>
                            </div>
                        )}
                        <button
                            onClick={() => setScanResult(null)}
                            style={{
                                marginTop: 20,
                                padding: '0.7rem 2rem',
                                background: '#fbbf24',
                                color: '#0f172a',
                                border: 'none',
                                borderRadius: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .spin { animation: spinkeyf 1s linear infinite; }
                @keyframes spinkeyf { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function ScannerLoader() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff', gap: 12 }}>
            <Loader2 size={20} className="spin" /> Inicjalizacja kamery…
        </div>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                padding: '1rem 1.25rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.85)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}
        >
            {children}
        </div>
    );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div
            style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 10,
                padding: '0.75rem 0.9rem',
            }}
        >
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                {label}
            </div>
            <div style={{ fontWeight: 700, fontSize: highlight ? '1.4rem' : '1.05rem', color: highlight ? '#fbbf24' : '#fff', marginTop: 4 }}>
                {value}
            </div>
        </div>
    );
}

function formatMinutes(minutes: number): string {
    if (!minutes) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

function formatTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}
