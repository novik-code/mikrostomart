'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface StaffSignature {
    id: string;
    staff_name: string;
    role: string;
    signature_data: string;
    created_at: string;
}

const STAFF_LIST = [
    { name: 'lek. dent. Marcin Nowosielski', role: 'lekarz' },
    { name: 'hig. stom. Elżbieta Nowosielska', role: 'higienistka' },
    { name: 'lek. dent. Ilona Piechaczek', role: 'lekarz' },
    { name: 'lek. dent. Aleksandra Modelska-Kępa', role: 'lekarz' },
    { name: 'lek. dent. Katarzyna Hałupczok', role: 'lekarz' },
    { name: 'lek. dent. Dominika Milicz', role: 'lekarz' },
    { name: 'lek. dent. Wiktoria Leja', role: 'lekarz' },
    { name: 'hig. stom. Małgorzata Maćków-Huras', role: 'higienistka' },
    { name: 'Justyna Litewka', role: 'asystentka/higienistka' },
];

export default function StaffSignaturesPage() {
    const [signatures, setSignatures] = useState<StaffSignature[]>([]);
    const [selectedStaff, setSelectedStaff] = useState(STAFF_LIST[0].name);
    const [selectedRole, setSelectedRole] = useState(STAFF_LIST[0].role);
    const [isDrawing, setIsDrawing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    const loadSignatures = async () => {
        const res = await fetch('/api/admin/staff-signatures');
        if (res.ok) {
            const data = await res.json();
            setSignatures(data);
        }
    };

    useEffect(() => {
        loadSignatures();
    }, []);

    useEffect(() => {
        const match = STAFF_LIST.find(s => s.name === selectedStaff);
        if (match) setSelectedRole(match.role);
    }, [selectedStaff]);

    // Canvas drawing handlers
    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const touch = e.touches[0];
            return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        lastPoint.current = getPos(e);
    }, []);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !lastPoint.current) return;

        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1a1a5e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPoint.current = pos;
    }, [isDrawing]);

    const stopDraw = useCallback(() => {
        setIsDrawing(false);
        lastPoint.current = null;
    }, []);

    const clearCanvas = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    };

    const saveSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setSaving(true);
        setMessage('');

        const signatureData = canvas.toDataURL('image/png');

        try {
            const res = await fetch('/api/admin/staff-signatures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffName: selectedStaff,
                    role: selectedRole,
                    signatureData,
                }),
            });
            if (res.ok) {
                setMessage('✅ Podpis zapisany!');
                clearCanvas();
                await loadSignatures();
            } else {
                const err = await res.json();
                setMessage(`❌ Błąd: ${err.error}`);
            }
        } catch (e: any) {
            setMessage(`❌ ${e.message}`);
        }
        setSaving(false);
    };

    const deleteSignature = async (id: string) => {
        await fetch(`/api/admin/staff-signatures?id=${id}`, { method: 'DELETE' });
        await loadSignatures();
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: "'Inter', sans-serif", padding: '1.5rem' }}>
            <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>✍️ Podpisy personelu</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
                Podpisy lekarzy i higienistek używane do automatycznego wstawiania w zgody pacjentów.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Drawing area */}
                <div style={{
                    flex: '1 1 400px',
                    background: 'rgba(20,20,35,0.95)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1.25rem',
                }}>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem' }}>Nowy podpis</h3>

                    {/* Staff selector */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.3rem' }}>
                            Osoba:
                        </label>
                        <select
                            value={selectedStaff}
                            onChange={e => setSelectedStaff(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#0a0a1a',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '0.4rem',
                                fontSize: '0.8rem',
                            }}
                        >
                            {STAFF_LIST.map(s => (
                                <option key={s.name} value={s.name}>{s.name} ({s.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Canvas */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '0.5rem',
                        padding: '2px',
                        marginBottom: '0.75rem',
                    }}>
                        <canvas
                            ref={canvasRef}
                            width={500}
                            height={150}
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            onTouchStart={startDraw}
                            onTouchMove={draw}
                            onTouchEnd={stopDraw}
                            style={{
                                width: '100%',
                                height: '120px',
                                cursor: 'crosshair',
                                display: 'block',
                                borderRadius: '0.4rem',
                                touchAction: 'none',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={clearCanvas}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                borderRadius: '0.4rem',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                            }}
                        >
                            🗑️ Wyczyść
                        </button>
                        <button
                            onClick={saveSignature}
                            disabled={saving}
                            style={{
                                flex: 2,
                                padding: '0.5rem',
                                background: saving ? 'rgba(100,100,100,0.3)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                border: 'none',
                                borderRadius: '0.4rem',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                cursor: saving ? 'default' : 'pointer',
                            }}
                        >
                            {saving ? '⏳ Zapisuję...' : '💾 Zapisz podpis'}
                        </button>
                    </div>

                    {message && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', textAlign: 'center' }}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Saved signatures */}
                <div style={{
                    flex: '1 1 300px',
                    background: 'rgba(20,20,35,0.95)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1.25rem',
                }}>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem' }}>Zapisane podpisy ({signatures.length})</h3>

                    {signatures.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                            Brak zapisanych podpisów
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {signatures.map(sig => (
                                <div key={sig.id} style={{
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{sig.staff_name}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                                                {sig.role} • {new Date(sig.created_at).toLocaleDateString('pl-PL')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteSignature(sig.id)}
                                            style={{
                                                background: 'rgba(239,68,68,0.12)',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                borderRadius: '0.25rem',
                                                padding: '0.2rem 0.4rem',
                                                fontSize: '0.6rem',
                                            }}
                                        >
                                            ✕ Usuń
                                        </button>
                                    </div>
                                    <div style={{ background: '#fff', borderRadius: '0.3rem', padding: '4px' }}>
                                        <img
                                            src={sig.signature_data}
                                            alt={`Podpis ${sig.staff_name}`}
                                            style={{ width: '100%', height: '60px', objectFit: 'contain' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
