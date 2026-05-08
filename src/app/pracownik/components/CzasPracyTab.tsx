'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Clock, Camera, X, Check, AlertCircle, Loader2, Undo2, CalendarDays, CalendarRange } from 'lucide-react';
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
    entryId?: string;     // do anulowania
}

interface CancelTarget {
    entryId: string;
    type: TimeEntryType;
    scannedAt: string;
}

export default function CzasPracyTab() {
    const [viewMode, setViewMode] = useState<'today' | 'week' | 'month'>('today');
    const [status, setStatus] = useState<TimeStatusResponse | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanInFlight, setScanInFlight] = useState(false);
    const lastScanAt = useRef<number>(0);
    const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelInFlight, setCancelInFlight] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [cancelToast, setCancelToast] = useState<string | null>(null);

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
                const data = (await res.json()) as ScanResult & { entryId?: string };
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

    const openCancelDialog = useCallback((target: CancelTarget) => {
        setCancelTarget(target);
        setCancelReason('');
        setCancelError(null);
    }, []);

    const submitCancel = useCallback(async () => {
        if (!cancelTarget) return;
        const trimmed = cancelReason.trim();
        if (trimmed.length < 3) {
            setCancelError('Podaj krótki powód (min. 3 znaki)');
            return;
        }
        setCancelInFlight(true);
        setCancelError(null);
        try {
            const res = await fetch('/api/time/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryId: cancelTarget.entryId, reason: trimmed }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setCancelError(data?.error ?? `Błąd ${res.status}`);
                return;
            }
            setCancelTarget(null);
            setCancelReason('');
            setScanResult(null);
            setCancelToast(`Anulowano ${cancelTarget.type === 'clock_in' ? 'przyjście' : 'wyjście'} z ${formatTime(cancelTarget.scannedAt)}`);
            void fetchStatus();
            setTimeout(() => setCancelToast(null), 4000);
        } catch (e) {
            setCancelError((e as Error).message);
        } finally {
            setCancelInFlight(false);
        }
    }, [cancelTarget, cancelReason, fetchStatus]);

    const isWorking = status?.isWorkingNow ?? false;
    const expectedAction = status?.expectedNextType ?? 'clock_in';

    return (
        <div style={{ padding: '1.25rem', maxWidth: 980, margin: '0 auto' }}>
            <header style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <Clock size={26} style={{ color: '#fbbf24' }} /> Czas pracy
                    </h1>
                    <div style={{ marginLeft: 'auto', display: 'inline-flex', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <button onClick={() => setViewMode('today')} style={viewMode === 'today' ? viewToggleActive : viewToggle}>
                            <Clock size={14} /> Dziś
                        </button>
                        <button onClick={() => setViewMode('week')} style={viewMode === 'week' ? viewToggleActive : viewToggle}>
                            <CalendarDays size={14} /> Tydzień
                        </button>
                        <button onClick={() => setViewMode('month')} style={viewMode === 'month' ? viewToggleActive : viewToggle}>
                            <CalendarRange size={14} /> Miesiąc
                        </button>
                    </div>
                </div>
                {viewMode === 'today' && (
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: 4 }}>
                        Skanuj QR z ekranu w recepcji, żeby zarejestrować przyjście lub wyjście.
                    </p>
                )}
            </header>

            {viewMode === 'week' && <SelfStatsView period="week" />}
            {viewMode === 'month' && <SelfStatsView period="month" />}
            {viewMode === 'today' && (
                // ── widok DZIŚ (oryginalny) ──────────────────────────────────────
                <div>

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
                                        {e.canCancel && (
                                            <button
                                                onClick={() => openCancelDialog({ entryId: e.id, type: e.type, scannedAt: e.scannedAt })}
                                                title="Anuluj wpis (pomyłka)"
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 14,
                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                    background: 'rgba(239,68,68,0.08)',
                                                    color: '#fca5a5',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
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
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                            {scanResult.ok && !scanResult.duplicate && scanResult.entryId && scanResult.scannedAt && scanResult.type && (
                                <button
                                    onClick={() => {
                                        const target: CancelTarget = {
                                            entryId: scanResult.entryId!,
                                            type: scanResult.type!,
                                            scannedAt: scanResult.scannedAt!,
                                        };
                                        setScanResult(null);
                                        openCancelDialog(target);
                                    }}
                                    style={{
                                        padding: '0.7rem 1.4rem',
                                        background: 'transparent',
                                        color: '#fca5a5',
                                        border: '1px solid rgba(239,68,68,0.5)',
                                        borderRadius: 10,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <Undo2 size={16} /> Anuluj ten skan
                                </button>
                            )}
                            <button
                                onClick={() => setScanResult(null)}
                                style={{
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
                </div>
            )}

            {/* CANCEL DIALOG */}
            {cancelTarget && (
                <div
                    onClick={() => !cancelInFlight && setCancelTarget(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 100002,
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
                            padding: '1.75rem',
                            maxWidth: 460,
                            width: '100%',
                            border: '1px solid rgba(239,68,68,0.4)',
                            color: '#fff',
                        }}
                    >
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
                            Anuluj wpis: {cancelTarget.type === 'clock_in' ? 'przyjście' : 'wyjście'} z {formatTime(cancelTarget.scannedAt)}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginBottom: 14 }}>
                            Powiadomienie o anulowaniu trafi do administratora. Operacja jest cofalna jedynie przez admina.
                        </p>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: 6 }}>
                            Powód <span style={{ color: '#fca5a5' }}>*</span>
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="np. zły button, podwójny skan, test"
                            disabled={cancelInFlight}
                            maxLength={500}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 8,
                                fontSize: '0.95rem',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                        />
                        {cancelError && (
                            <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 8 }}>
                                {cancelError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                            <button
                                onClick={() => setCancelTarget(null)}
                                disabled={cancelInFlight}
                                style={{
                                    padding: '0.6rem 1.3rem',
                                    background: 'transparent',
                                    color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 10,
                                    cursor: cancelInFlight ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={() => void submitCancel()}
                                disabled={cancelInFlight || cancelReason.trim().length < 3}
                                style={{
                                    padding: '0.6rem 1.3rem',
                                    background: cancelInFlight || cancelReason.trim().length < 3 ? 'rgba(239,68,68,0.4)' : '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontWeight: 700,
                                    cursor: cancelInFlight || cancelReason.trim().length < 3 ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                {cancelInFlight && <Loader2 size={16} className="spin" />}
                                Potwierdź anulowanie
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CANCEL TOAST */}
            {cancelToast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15,23,42,0.95)',
                        color: '#fff',
                        padding: '0.9rem 1.4rem',
                        borderRadius: 12,
                        border: '1px solid rgba(239,68,68,0.3)',
                        zIndex: 100003,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        maxWidth: '90vw',
                    }}
                >
                    <Undo2 size={18} style={{ color: '#fca5a5' }} />
                    {cancelToast}
                </div>
            )}

            <style jsx global>{`
                .spin { animation: spinkeyf 1s linear infinite; }
                @keyframes spinkeyf { to { transform: rotate(360deg); } }
            `}</style>
                </div>
            )}
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

const viewToggle: React.CSSProperties = {
    padding: '0.45rem 0.85rem',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
};

const viewToggleActive: React.CSSProperties = {
    ...viewToggle,
    background: 'rgba(251,191,36,0.18)',
    color: '#fbbf24',
};

// ── Widok Tydzień / Miesiąc (statystyki własne na bazie calculated_shifts) ──

interface SelfShift {
    id: string;
    date: string;
    actual_start: string | null;
    actual_end: string | null;
    worked_minutes: number;
    planned_minutes: number;
    planned_start_time: string | null;
    planned_end_time: string | null;
    absence_type: string | null;
    late_minutes: number;
    early_leave_minutes: number;
    overtime_total_minutes: number;
    overtime_justified_minutes: number;
    overtime_unjustified_minutes: number;
    auto_closed: boolean;
    status: string;
    anomaly_flags: string[];
}

interface SelfStatsResponse {
    employee: { id: string; name: string; position: string | null };
    from: string;
    to: string;
    workingDays: number;
    dailyHours: number;
    contractType: string;
    normaMinutes: number;
    shifts: SelfShift[];
    totals: {
        days: number;
        worked_minutes: number;
        planned_minutes: number;
        late_minutes: number;
        early_leave_minutes: number;
        overtime_total_minutes: number;
        overtime_justified_minutes: number;
        overtime_unjustified_minutes: number;
        absence_days: number;
        days_with_anomalies: number;
    };
}

const ABSENCE_LABELS_SHORT: Record<string, { label: string; color: string }> = {
    vacation:   { label: 'Urlop',          color: '#3b82f6' },
    on_demand:  { label: 'Na żądanie',     color: '#06b6d4' },
    sick:       { label: 'Chorobowe',      color: '#ef4444' },
    child_care: { label: 'Opieka',         color: '#a855f7' },
    training:   { label: 'Szkolenie',      color: '#fbbf24' },
    delegation: { label: 'Delegacja',      color: '#10b981' },
    unpaid:     { label: 'Bezpłatny',      color: '#94a3b8' },
    other:      { label: 'Inne',           color: '#64748b' },
};

function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(d: Date): Date {
    const day = d.getDay();          // 0 = niedziela, 1 = pn
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function SelfStatsView({ period }: { period: 'week' | 'month' }) {
    const [refDate, setRefDate] = useState<Date>(() => new Date());
    const [data, setData] = useState<SelfStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Wylicz from/to na podstawie period + refDate
    const range = (() => {
        if (period === 'week') {
            const from = getMondayOfWeek(refDate);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            return { from: ymd(from), to: ymd(to) };
        }
        const from = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        const to = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
        return { from: ymd(from), to: ymd(to) };
    })();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/employee/time-tracking-self?from=${range.from}&to=${range.to}`, { cache: 'no-store' });
            const body = await res.json();
            if (!res.ok) {
                setError(body?.error ?? `Błąd ${res.status}`);
                return;
            }
            setData(body);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    // Reagujemy na zmianę przedziału
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range.from, range.to]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const shiftRange = (delta: number) => {
        const d = new Date(refDate);
        if (period === 'week') d.setDate(d.getDate() + delta * 7);
        else d.setMonth(d.getMonth() + delta);
        setRefDate(d);
    };

    const goToday = () => setRefDate(new Date());

    const periodLabel = (() => {
        if (period === 'week') {
            const fromD = new Date(range.from);
            const toD = new Date(range.to);
            return `${fromD.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} – ${toD.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        return refDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    })();

    return (
        <div>
            {/* Range nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.8rem' }}>
                <button onClick={() => shiftRange(-1)} style={statBtnStyle}><X size={14} style={{ transform: 'rotate(45deg)' }} /></button>
                <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {periodLabel}
                </div>
                <button onClick={() => shiftRange(1)} style={statBtnStyle}><X size={14} style={{ transform: 'rotate(-135deg)' }} /></button>
                <button onClick={goToday} style={{ ...statBtnStyle, padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}>Dziś</button>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <Loader2 size={22} className="spin" /> Ładowanie…
                </div>
            ) : error ? (
                <div style={{ padding: '0.8rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#fca5a5' }}>
                    <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} /> {error}
                </div>
            ) : !data ? null : (
                <>
                    {/* SUMARY CARDS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1rem' }}>
                        <SummaryCard
                            label="Przepracowane"
                            value={formatMinutes(data.totals.worked_minutes)}
                            sub={`norma ${formatMinutes(data.normaMinutes)}`}
                            color={
                                data.totals.worked_minutes >= data.normaMinutes ? '#10b981'
                                : data.totals.worked_minutes >= data.normaMinutes * 0.95 ? '#fbbf24'
                                : '#ef4444'
                            }
                            highlight
                        />
                        <SummaryCard
                            label="Nadgodziny zasadne"
                            value={formatMinutes(data.totals.overtime_justified_minutes)}
                            color="#10b981"
                        />
                        <SummaryCard
                            label="Niezasadne"
                            value={formatMinutes(data.totals.overtime_unjustified_minutes)}
                            color="#ef4444"
                        />
                        <SummaryCard
                            label="Spóźnienia"
                            value={formatMinutes(data.totals.late_minutes)}
                            color="#fb923c"
                        />
                        <SummaryCard
                            label="Dni nieobecne"
                            value={`${data.totals.absence_days}`}
                            color="#3b82f6"
                        />
                        <SummaryCard
                            label="Dni z anomaliami"
                            value={`${data.totals.days_with_anomalies}`}
                            color={data.totals.days_with_anomalies > 0 ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
                        />
                    </div>

                    {/* SHIFTS TABLE */}
                    {data.shifts.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                            Brak wyliczonych dni w tym przedziale. System przelicza dni nocnym cronem (02:30 PL).
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                                        <th style={selfTh}>Dzień</th>
                                        <th style={selfTh}>Plan</th>
                                        <th style={selfTh}>Faktycznie</th>
                                        <th style={selfTh}>Przepr.</th>
                                        <th style={selfTh}>Spóźn.</th>
                                        <th style={selfTh}>Nadgodziny</th>
                                        <th style={selfTh}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.shifts.map((s) => {
                                        const dt = new Date(s.date);
                                        const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                                        const absDef = s.absence_type ? ABSENCE_LABELS_SHORT[s.absence_type] : null;
                                        return (
                                            <tr key={s.id} style={{ background: isWeekend ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                                                <td style={selfTd}>
                                                    <div style={{ fontWeight: 600 }}>{dt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                                        {dt.toLocaleDateString('pl-PL', { weekday: 'short' })}
                                                    </div>
                                                </td>
                                                <td style={selfTd}>
                                                    {s.absence_type ? '—' : (
                                                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                            {s.planned_start_time?.slice(0, 5) ?? '—'}–{s.planned_end_time?.slice(0, 5) ?? '—'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={selfTd}>
                                                    {s.absence_type ? '—' : (
                                                        <span>
                                                            {s.actual_start ? new Date(s.actual_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }) : '—'}
                                                            –
                                                            {s.actual_end ? new Date(s.actual_end).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }) : '—'}
                                                            {s.auto_closed && <span style={{ color: '#fbbf24', fontSize: '0.7rem', marginLeft: 4 }}>auto</span>}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ ...selfTd, fontWeight: 700 }}>
                                                    {s.absence_type ? (
                                                        <span style={{ color: absDef?.color ?? '#94a3b8' }}>{absDef?.label ?? s.absence_type}</span>
                                                    ) : formatMinutes(s.worked_minutes)}
                                                </td>
                                                <td style={{ ...selfTd, color: s.late_minutes > 0 ? '#fb923c' : 'rgba(255,255,255,0.45)' }}>
                                                    {s.late_minutes > 0 ? formatMinutes(s.late_minutes) : '—'}
                                                </td>
                                                <td style={selfTd}>
                                                    {s.overtime_justified_minutes > 0 || s.overtime_unjustified_minutes > 0 ? (
                                                        <span>
                                                            {s.overtime_justified_minutes > 0 && (
                                                                <span style={{ color: '#10b981' }}>+{formatMinutes(s.overtime_justified_minutes)}✓</span>
                                                            )}
                                                            {s.overtime_unjustified_minutes > 0 && (
                                                                <span style={{ color: '#ef4444', marginLeft: 4 }}>+{formatMinutes(s.overtime_unjustified_minutes)}✗</span>
                                                            )}
                                                        </span>
                                                    ) : s.overtime_total_minutes > 0 ? (
                                                        <span style={{ color: '#3b82f6' }}>+{formatMinutes(s.overtime_total_minutes)}</span>
                                                    ) : '—'}
                                                </td>
                                                <td style={selfTd}>
                                                    {s.status === 'admin_approved' ? (
                                                        <span style={{ color: '#10b981', fontSize: '0.7rem' }}>✓ zatw.</span>
                                                    ) : s.anomaly_flags.length > 0 ? (
                                                        <span style={{ color: '#fb923c', fontSize: '0.7rem' }}>⚠ {s.anomaly_flags.length}</span>
                                                    ) : (
                                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>OK</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer info + download */}
                    <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            Dni roboczych w przedziale: <b>{data.workingDays}</b> · Norma {formatMinutes(data.normaMinutes)}h ({data.dailyHours}h/dzień, umowa {data.contractType.toUpperCase()})
                        </div>
                        {period === 'month' && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                <a
                                    href={`/api/employee/time-tracking-self/report?month=${range.from.slice(0, 7)}&format=pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        background: 'rgba(251,191,36,0.15)',
                                        border: '1px solid rgba(251,191,36,0.4)',
                                        borderRadius: 8,
                                        color: '#fbbf24',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                    }}
                                >
                                    📄 Raport PDF
                                </a>
                                <a
                                    href={`/api/employee/time-tracking-self/report?month=${range.from.slice(0, 7)}&format=csv`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        background: 'rgba(16,185,129,0.15)',
                                        border: '1px solid rgba(16,185,129,0.4)',
                                        borderRadius: 8,
                                        color: '#10b981',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                    }}
                                >
                                    📊 CSV
                                </a>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function SummaryCard({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color?: string; highlight?: boolean }) {
    return (
        <div style={{
            padding: '0.7rem 0.85rem',
            background: highlight ? 'rgba(251,191,36,0.08)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${highlight ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10,
        }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)' }}>{label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: color ?? '#fff', marginTop: 2 }}>{value}</div>
            {sub && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>{sub}</div>}
        </div>
    );
}

const statBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const selfTh: React.CSSProperties = {
    padding: '0.5rem',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
};

const selfTd: React.CSSProperties = {
    padding: '0.5rem',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: '0.82rem',
    textAlign: 'center',
    color: '#fff',
};

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
