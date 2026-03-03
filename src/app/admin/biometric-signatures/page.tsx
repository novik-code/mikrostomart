'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface BiometricPoint {
    x: number;
    y: number;
    t: number;
    p: number;
    tx: number;
    ty: number;
}

interface BiometricStroke {
    points: BiometricPoint[];
    startTime: number;
    endTime: number;
}

interface BiometricSummary {
    hasData: boolean;
    pointCount: number;
    avgPressure: number;
    maxPressure: number;
    totalDuration: number;
    pointerType: string;
    strokeCount: number;
}

interface ConsentRow {
    id: string;
    patient_name: string;
    prodentis_patient_id: string | null;
    consent_type: string;
    consent_label: string;
    file_url: string;
    file_name: string;
    signed_at: string;
    prodentis_synced: boolean;
    created_by: string | null;
    biometric_data: BiometricSummary | null;
}

interface FullConsent extends Omit<ConsentRow, 'biometric_data'> {
    signature_data: string | null;
    biometric_data: {
        strokes: BiometricStroke[];
        deviceInfo: {
            pointerType: string;
            userAgent: string;
            screenWidth: number;
            screenHeight: number;
            canvasWidth: number;
            canvasHeight: number;
        };
        totalDuration: number;
        avgPressure: number;
        maxPressure: number;
        pointCount: number;
        signedAt: string;
    } | null;
}

export default function BiometricViewerPage() {
    const [consents, setConsents] = useState<ConsentRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<FullConsent | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [replayProgress, setReplayProgress] = useState<number | null>(null);
    const replayCanvasRef = useRef<HTMLCanvasElement>(null);
    const replayAnimRef = useRef<number>(0);

    useEffect(() => {
        fetch('/api/admin/patient-consents?limit=100')
            .then(r => r.json())
            .then(data => {
                setConsents(data.consents || []);
                setTotal(data.total || 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const openDetail = async (id: string) => {
        setLoadingDetail(true);
        setReplayProgress(null);
        cancelAnimationFrame(replayAnimRef.current);
        try {
            const res = await fetch(`/api/admin/patient-consents?id=${id}`);
            const data = await res.json();
            setSelected(data);
        } catch (err) {
            console.error(err);
        }
        setLoadingDetail(false);
    };

    const closeDetail = () => {
        cancelAnimationFrame(replayAnimRef.current);
        setSelected(null);
        setReplayProgress(null);
    };

    // ── Pressure Chart ──
    const PressureChart = ({ strokes }: { strokes: BiometricStroke[] }) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const allPoints = strokes.flatMap(s => s.points);
            if (allPoints.length === 0) return;

            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, W, H);

            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = (H / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }

            // Labels
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px sans-serif';
            ctx.fillText('1.0', 2, 12);
            ctx.fillText('0.5', 2, H / 2 + 4);
            ctx.fillText('0.0', 2, H - 2);

            // Draw pressure line
            const maxT = allPoints[allPoints.length - 1].t;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            allPoints.forEach((p, i) => {
                const x = (p.t / maxT) * W;
                const y = H - p.p * H;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw tilt (lighter)
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            allPoints.forEach((p, i) => {
                const x = (p.t / maxT) * W;
                const tiltMag = Math.sqrt(p.tx * p.tx + p.ty * p.ty) / 90;
                const y = H - tiltMag * H;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Stroke separators
            ctx.strokeStyle = 'rgba(255,200,50,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            strokes.forEach(s => {
                const x = (s.startTime / maxT) * W;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.stroke();
            });
            ctx.setLineDash([]);

        }, [strokes]);

        return (
            <div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                    <span>🔵 Nacisk (pressure)</span>
                    <span>🟣 Kąt nachylenia (tilt)</span>
                    <span>🟡 Podniesienie rysika</span>
                </div>
                <canvas ref={canvasRef} width={600} height={120} style={{ width: '100%', height: '120px', borderRadius: '0.5rem' }} />
            </div>
        );
    };

    // ── Signature Replay ──
    const replaySignature = useCallback(() => {
        if (!selected?.biometric_data?.strokes?.length) return;
        const canvas = replayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { strokes, deviceInfo } = selected.biometric_data;
        const allPoints = strokes.flatMap(s => s.points);
        if (allPoints.length === 0) return;

        // Set canvas size
        const cW = deviceInfo.canvasWidth || 600;
        const cH = deviceInfo.canvasHeight || 360;
        canvas.width = cW;
        canvas.height = cH;
        canvas.style.width = Math.min(cW / 2, 500) + 'px';
        canvas.style.height = Math.min(cH / 2, 300) + 'px';

        ctx.clearRect(0, 0, cW, cH);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const totalDuration = allPoints[allPoints.length - 1].t;
        const startTime = performance.now();
        const SPEED = 1; // 1x speed

        cancelAnimationFrame(replayAnimRef.current);

        const animate = () => {
            const elapsed = (performance.now() - startTime) * SPEED;
            ctx.clearRect(0, 0, cW, cH);

            for (const stroke of strokes) {
                const visiblePoints = stroke.points.filter(p => p.t <= elapsed);
                if (visiblePoints.length < 2) continue;

                for (let i = 1; i < visiblePoints.length; i++) {
                    const prev = visiblePoints[i - 1];
                    const curr = visiblePoints[i];
                    ctx.strokeStyle = `rgba(26, 26, 46, ${0.5 + curr.p * 0.5})`;
                    ctx.lineWidth = (1 + curr.p * 4) * (cW > 600 ? 2 : 1);
                    ctx.beginPath();
                    ctx.moveTo(prev.x, prev.y);
                    ctx.lineTo(curr.x, curr.y);
                    ctx.stroke();
                }
            }

            const progress = Math.min(elapsed / totalDuration, 1);
            setReplayProgress(progress);

            if (elapsed < totalDuration) {
                replayAnimRef.current = requestAnimationFrame(animate);
            }
        };

        replayAnimRef.current = requestAnimationFrame(animate);
    }, [selected]);

    // ── Styles ──
    const card: React.CSSProperties = {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '0.75rem',
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>Ładowanie...</div>
            </div>
        );
    }

    // ── Detail Modal ──
    if (selected) {
        const bio = selected.biometric_data;
        return (
            <div style={{ minHeight: '100vh', background: '#0a0a1a', padding: '1rem', color: '#fff' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <button onClick={closeDetail} style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '0.5rem',
                        color: 'rgba(255,255,255,0.7)',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                    }}>
                        ← Wróć do listy
                    </button>

                    <h1 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                        📋 {selected.consent_label}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        {selected.patient_name} • {new Date(selected.signed_at).toLocaleString('pl-PL')}
                    </p>

                    {/* Signature Image (PNG) */}
                    <div style={card}>
                        <h3 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
                            🖊️ Obraz podpisu (PNG)
                        </h3>
                        {selected.signature_data ? (
                            <div style={{
                                background: '#fff',
                                borderRadius: '0.5rem',
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'center',
                            }}>
                                <img
                                    src={selected.signature_data}
                                    alt="Podpis pacjenta"
                                    style={{ maxWidth: '400px', maxHeight: '200px' }}
                                />
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(255,255,255,0.3)' }}>Brak obrazu podpisu</p>
                        )}
                    </div>

                    {/* Biometric Data */}
                    {bio ? (
                        <>
                            {/* Stats */}
                            <div style={card}>
                                <h3 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
                                    📊 Dane biometryczne
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: '0.75rem',
                                }}>
                                    {[
                                        { label: 'Typ wejścia', value: bio.deviceInfo?.pointerType === 'pen' ? '🖊️ Rysik (Pencil)' : bio.deviceInfo?.pointerType === 'touch' ? '👆 Palec' : '🖱️ Mysz', color: '#38bdf8' },
                                        { label: 'Punkty danych', value: bio.pointCount.toLocaleString(), color: '#818cf8' },
                                        { label: 'Pociągnięcia', value: bio.strokes?.length || 0, color: '#a78bfa' },
                                        { label: 'Czas trwania', value: `${(bio.totalDuration / 1000).toFixed(1)}s`, color: '#34d399' },
                                        { label: 'Śr. nacisk', value: `${(bio.avgPressure * 100).toFixed(1)}%`, color: '#fbbf24' },
                                        { label: 'Max nacisk', value: `${(bio.maxPressure * 100).toFixed(1)}%`, color: '#f87171' },
                                    ].map(stat => (
                                        <div key={stat.label} style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pressure Chart */}
                            {bio.strokes && bio.strokes.length > 0 && (
                                <div style={card}>
                                    <h3 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
                                        📈 Wykres nacisku i kąta w czasie
                                    </h3>
                                    <PressureChart strokes={bio.strokes} />
                                </div>
                            )}

                            {/* Signature Replay */}
                            {bio.strokes && bio.strokes.length > 0 && (
                                <div style={card}>
                                    <h3 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
                                        🔄 Odtwarzanie podpisu
                                    </h3>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                                        Odtworzenie kolejności kreślenia — grubość linii zależy od nacisku
                                    </p>
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        marginBottom: '0.5rem',
                                    }}>
                                        <canvas ref={replayCanvasRef} style={{ maxWidth: '100%' }} />
                                    </div>
                                    {replayProgress !== null && (
                                        <div style={{
                                            background: 'rgba(56,189,248,0.1)',
                                            borderRadius: '0.25rem',
                                            height: '4px',
                                            marginBottom: '0.5rem',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${replayProgress * 100}%`,
                                                height: '100%',
                                                background: '#38bdf8',
                                                transition: 'width 0.1s',
                                            }} />
                                        </div>
                                    )}
                                    <button onClick={replaySignature} style={{
                                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        padding: '0.6rem 1.5rem',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                    }}>
                                        ▶ Odtwórz podpis
                                    </button>
                                </div>
                            )}

                            {/* Device Info */}
                            {bio.deviceInfo && (
                                <div style={card}>
                                    <h3 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
                                        📱 Informacje o urządzeniu
                                    </h3>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                                        <div><strong>Pointer:</strong> {bio.deviceInfo.pointerType}</div>
                                        <div><strong>Ekran:</strong> {bio.deviceInfo.screenWidth}×{bio.deviceInfo.screenHeight}</div>
                                        <div><strong>Canvas:</strong> {bio.deviceInfo.canvasWidth}×{bio.deviceInfo.canvasHeight}</div>
                                        <div style={{ wordBreak: 'break-all', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
                                            UA: {bio.deviceInfo.userAgent}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{
                            ...card,
                            textAlign: 'center',
                            padding: '2rem',
                            color: 'rgba(255,255,255,0.4)',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                            <p>Brak danych biometrycznych</p>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                                Ten podpis został złożony przed wdrożeniem systemu biometrycznego
                            </p>
                        </div>
                    )}

                    {/* PDF link */}
                    {selected.file_url && (
                        <div style={{ ...card, textAlign: 'center' }}>
                            <a
                                href={selected.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.9rem' }}
                            >
                                📄 Otwórz podpisany PDF →
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── List View ──
    return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', padding: '1rem', color: '#fff' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>🔬 Podpisy biometryczne</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                        {total} podpisanych zgód • Kliknij aby zobaczyć szczegóły biometryczne
                    </p>
                </div>

                {consents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                        Brak podpisanych zgód
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {consents.map(c => (
                            <div
                                key={c.id}
                                onClick={() => openDetail(c.id)}
                                style={{
                                    ...card,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    marginBottom: 0,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.08)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {c.consent_label}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                                        {c.patient_name} • {new Date(c.signed_at).toLocaleDateString('pl-PL')}
                                        {c.prodentis_synced && <span style={{ color: '#34d399', marginLeft: '0.5rem' }}>✓ Prodentis</span>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                    {c.biometric_data ? (
                                        <div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '1rem',
                                                background: c.biometric_data.pointerType === 'pen'
                                                    ? 'rgba(56,189,248,0.15)'
                                                    : c.biometric_data.pointerType === 'touch'
                                                        ? 'rgba(52,211,153,0.15)'
                                                        : 'rgba(255,255,255,0.08)',
                                                color: c.biometric_data.pointerType === 'pen'
                                                    ? '#38bdf8'
                                                    : c.biometric_data.pointerType === 'touch'
                                                        ? '#34d399'
                                                        : 'rgba(255,255,255,0.5)',
                                                display: 'inline-block',
                                                marginBottom: '0.2rem',
                                            }}>
                                                {c.biometric_data.pointerType === 'pen' ? '🖊️ Rysik' : c.biometric_data.pointerType === 'touch' ? '👆 Palec' : '🖱️ Mysz'}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                                                {c.biometric_data.pointCount} pts • {c.biometric_data.strokeCount} strokes
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
                                            Brak biometrii
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {loadingDetail && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}>
                        <div style={{ color: '#38bdf8' }}>Ładowanie szczegółów...</div>
                    </div>
                )}
            </div>
        </div>
    );
}
