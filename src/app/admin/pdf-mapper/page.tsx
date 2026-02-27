'use client';

import { useState, useRef, useEffect } from 'react';
import { CONSENT_TYPES } from '@/lib/consentTypes';

type FieldType = 'name' | 'pesel' | 'date' | 'address' | 'city' | 'phone' | 'doctor' | 'tooth';

interface PlacedField {
    type: FieldType;
    x: number;
    y: number;
    pdfX: number;
    pdfY: number;
}

const FIELD_LABELS: Record<FieldType, { label: string; color: string }> = {
    name: { label: 'Imię i Nazwisko', color: '#22c55e' },
    pesel: { label: 'PESEL (lewy kraniec)', color: '#3b82f6' },
    date: { label: 'Data', color: '#f59e0b' },
    address: { label: 'Adres', color: '#a855f7' },
    city: { label: 'Miejscowość', color: '#ec4899' },
    phone: { label: 'Telefon', color: '#06b6d4' },
    doctor: { label: 'Lekarz', color: '#ef4444' },
    tooth: { label: 'Ząb', color: '#f97316' },
};

const CONSENT_KEYS = Object.keys(CONSENT_TYPES);

export default function PdfMapperPage() {
    const [selectedConsent, setSelectedConsent] = useState(CONSENT_KEYS[0]);
    const [activeField, setActiveField] = useState<FieldType>('name');
    const [fields, setFields] = useState<PlacedField[]>([]);
    const [allMappings, setAllMappings] = useState<Record<string, PlacedField[]>>({});
    const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
    const [pdfSize, setPdfSize] = useState<{ w: number; h: number }>({ w: 612, h: 792 });
    const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
    const [showExport, setShowExport] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Load PDF as image using canvas
    useEffect(() => {
        const loadPdf = async () => {
            const consentType = CONSENT_TYPES[selectedConsent];
            if (!consentType) return;

            setPdfDataUrl(null);

            // Use pdf.js via dynamic import to render PDF page to canvas
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const pdfUrl = `/zgody/${consentType.file}`;
            const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2 }); // 2x for clarity

            setPdfSize({ w: viewport.width / 2, h: viewport.height / 2 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d')!;
            await page.render({ canvasContext: ctx, viewport } as any).promise;

            const dataUrl = canvas.toDataURL('image/png');
            setPdfDataUrl(dataUrl);
            setImgNaturalSize({ w: viewport.width, h: viewport.height });

            // Load saved fields for this consent
            setFields(allMappings[selectedConsent] || []);
        };
        loadPdf();
    }, [selectedConsent]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle click on PDF image
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const div = imgRef.current;
        if (!div) return;

        const rect = div.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const displayW = div.clientWidth;
        const displayH = div.clientHeight;

        // Convert to PDF coordinate system (origin at bottom-left)
        const pdfX = (clickX / displayW) * pdfSize.w;
        const pdfY = pdfSize.h - (clickY / displayH) * pdfSize.h;

        const newField: PlacedField = {
            type: activeField,
            x: clickX / displayW, // normalized 0-1
            y: clickY / displayH, // normalized 0-1
            pdfX: Math.round(pdfX * 10) / 10,
            pdfY: Math.round(pdfY * 10) / 10,
        };

        // Replace if same field type already placed
        const updated = fields.filter(f => f.type !== activeField);
        updated.push(newField);
        setFields(updated);
        setAllMappings(prev => ({ ...prev, [selectedConsent]: updated }));
    };

    const removeField = (type: FieldType) => {
        const updated = fields.filter(f => f.type !== type);
        setFields(updated);
        setAllMappings(prev => ({ ...prev, [selectedConsent]: updated }));
    };

    // Generate export code
    const generateExport = () => {
        const lines: string[] = [];
        for (const [key, flds] of Object.entries(allMappings)) {
            if (flds.length === 0) continue;
            lines.push(`    ${key}: {`);
            lines.push(`        label: '${CONSENT_TYPES[key]?.label || key}',`);
            lines.push(`        file: '${CONSENT_TYPES[key]?.file || ''}',`);
            lines.push(`        fields: {`);
            for (const f of flds) {
                if (f.type === 'pesel') {
                    lines.push(`            pesel: { startX: ${f.pdfX}, y: ${f.pdfY}, boxWidth: 23.5, fontSize: 12 },`);
                } else {
                    lines.push(`            ${f.type}: { x: ${f.pdfX}, y: ${f.pdfY}, fontSize: 11 },`);
                }
            }
            lines.push(`        },`);
            lines.push(`    },`);
        }
        return lines.join('\n');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,35,0.95)' }}>
                <h1 style={{ fontSize: '1.3rem', margin: '0 0 0.75rem' }}>🗺️ PDF Coordinate Mapper</h1>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.75rem' }}>
                    Kliknij na PDF aby wyznaczyć pozycje pól. Koordynaty zapisują się automatycznie.
                </p>

                {/* Consent selector */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {CONSENT_KEYS.map(key => (
                        <button
                            key={key}
                            onClick={() => setSelectedConsent(key)}
                            style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '0.4rem',
                                border: selectedConsent === key ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                                background: selectedConsent === key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                                color: selectedConsent === key ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: selectedConsent === key ? 'bold' : 'normal',
                            }}
                        >
                            {allMappings[key]?.length ? '✅ ' : ''}{CONSENT_TYPES[key]?.label || key}
                        </button>
                    ))}
                </div>

                {/* Field type selector */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {(Object.keys(FIELD_LABELS) as FieldType[]).map(ft => (
                        <button
                            key={ft}
                            onClick={() => setActiveField(ft)}
                            style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '2rem',
                                border: activeField === ft ? `2px solid ${FIELD_LABELS[ft].color}` : '1px solid rgba(255,255,255,0.1)',
                                background: activeField === ft ? `${FIELD_LABELS[ft].color}22` : 'transparent',
                                color: FIELD_LABELS[ft].color,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: activeField === ft ? 'bold' : 'normal',
                            }}
                        >
                            {fields.find(f => f.type === ft) ? '● ' : '○ '}{FIELD_LABELS[ft].label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
                {/* PDF Image */}
                <div style={{ flex: 1, position: 'relative' }}>
                    {pdfDataUrl ? (
                        <div
                            ref={imgRef}
                            onClick={handleClick}
                            style={{ position: 'relative', cursor: 'crosshair', display: 'inline-block', width: '100%' }}
                        >
                            <img
                                src={pdfDataUrl}
                                alt="PDF page 1"
                                style={{ width: '100%', display: 'block', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}
                            />

                            {/* Placed field markers */}
                            {fields.map(f => (
                                <div
                                    key={f.type}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.x * 100}%`,
                                        top: `${f.y * 100}%`,
                                        transform: 'translate(-4px, -4px)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: FIELD_LABELS[f.type].color,
                                        border: '2px solid #fff',
                                        boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                                    }} />
                                    <div style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '-2px',
                                        fontSize: '0.6rem',
                                        color: FIELD_LABELS[f.type].color,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                        background: 'rgba(0,0,0,0.8)',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                    }}>
                                        {FIELD_LABELS[f.type].label} ({f.pdfX}, {f.pdfY})
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
                            ⏳ Ładowanie PDF...
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div style={{ width: '280px', flexShrink: 0 }}>
                    <div style={{
                        background: 'rgba(20,20,35,0.95)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '1rem',
                    }}>
                        <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem' }}>Naniesione pola — {CONSENT_TYPES[selectedConsent]?.label}</h3>

                        {fields.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                Kliknij na PDF aby dodać pole
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {fields.map(f => (
                                    <div key={f.type} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.4rem 0.6rem',
                                        background: 'rgba(255,255,255,0.04)',
                                        borderRadius: '0.4rem',
                                        border: `1px solid ${FIELD_LABELS[f.type].color}33`,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: FIELD_LABELS[f.type].color, fontWeight: 'bold' }}>
                                                {FIELD_LABELS[f.type].label}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
                                                PDF: x={f.pdfX} y={f.pdfY}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeField(f.type)}
                                            style={{
                                                background: 'rgba(239,68,68,0.15)',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                borderRadius: '0.3rem',
                                                padding: '0.2rem 0.4rem',
                                                fontSize: '0.65rem',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>
                                Rozmiar PDF: {pdfSize.w} × {pdfSize.h} pts
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                Aktywne pole: <span style={{ color: FIELD_LABELS[activeField].color }}>{FIELD_LABELS[activeField].label}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowExport(!showExport)}
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                padding: '0.6rem',
                                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                            }}
                        >
                            📋 {showExport ? 'Ukryj' : 'Pokaż'} Export
                        </button>
                    </div>

                    {showExport && (
                        <div style={{
                            marginTop: '0.75rem',
                            background: 'rgba(20,20,35,0.95)',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '1rem',
                        }}>
                            <h4 style={{ fontSize: '0.75rem', margin: '0 0 0.5rem' }}>consentTypes.ts export:</h4>
                            <textarea
                                readOnly
                                value={generateExport()}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    background: '#0a0a1a',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '0.4rem',
                                    fontFamily: 'monospace',
                                    fontSize: '0.6rem',
                                    padding: '0.5rem',
                                    resize: 'vertical',
                                }}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generateExport());
                                    alert('Skopiowano do schowka!');
                                }}
                                style={{
                                    marginTop: '0.5rem',
                                    width: '100%',
                                    padding: '0.4rem',
                                    background: 'rgba(34,197,94,0.15)',
                                    border: '1px solid rgba(34,197,94,0.3)',
                                    borderRadius: '0.4rem',
                                    color: '#22c55e',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                }}
                            >
                                📋 Kopiuj do schowka
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
