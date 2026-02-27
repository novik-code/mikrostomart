'use client';

import { useState, useRef, useCallback } from 'react';
import { CONSENT_TYPES } from '@/lib/consentTypes';

type FieldType = 'name' | 'pesel' | 'date' | 'address' | 'city' | 'phone' | 'doctor' | 'tooth' | 'doctor_signature' | 'patient_signature';

interface PlacedField {
    type: FieldType;
    /** Which page this field is on (1-indexed) */
    page: number;
    /** Normalized 0-1 position on display */
    nx: number;
    ny: number;
    /** PDF coordinate (pts, origin bottom-left) */
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
    doctor: { label: 'Lekarz (tekst)', color: '#ef4444' },
    tooth: { label: 'Ząb', color: '#f97316' },
    doctor_signature: { label: 'Podpis lekarza', color: '#8b5cf6' },
    patient_signature: { label: 'Podpis pacjenta', color: '#14b8a6' },
};

/** Known PDF page sizes in pts (width x height) */
const PDF_SIZES: Record<string, { w: number; h: number }> = {
    protetyka_implant: { w: 595.3, h: 841.9 }, // A4
};
const DEFAULT_SIZE = { w: 612, h: 792 };

/** Known number of pages per consent PDF */
const PDF_PAGES: Record<string, number> = {
    higienizacja: 1,
    znieczulenie: 1,
    chirurgiczne: 2,
    protetyczne: 2,
    endodontyczne: 2,
    zachowawcze: 2,
    protetyka_implant: 2,
    rtg: 1,
    implantacja: 3,
    wizerunek: 1,
};

const CONSENT_KEYS = Object.keys(CONSENT_TYPES);

export default function PdfMapperPage() {
    const [selectedConsent, setSelectedConsent] = useState(CONSENT_KEYS[0]);
    const [activeField, setActiveField] = useState<FieldType>('name');
    const [allMappings, setAllMappings] = useState<Record<string, PlacedField[]>>({});
    const [showExport, setShowExport] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const overlayRef = useRef<HTMLDivElement>(null);

    const fields = allMappings[selectedConsent] || [];
    const fieldsOnPage = fields.filter(f => f.page === currentPage);
    const pdfSize = PDF_SIZES[selectedConsent] || DEFAULT_SIZE;
    const totalPages = PDF_PAGES[selectedConsent] || 1;
    const consentType = CONSENT_TYPES[selectedConsent];
    const pdfUrl = consentType ? `/zgody/${consentType.file}` : '';

    const handleConsentChange = (key: string) => {
        setSelectedConsent(key);
        setCurrentPage(1);
    };

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const div = overlayRef.current;
        if (!div) return;

        const rect = div.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;

        // Convert to PDF coords (origin at bottom-left)
        const pdfX = Math.round(nx * pdfSize.w * 10) / 10;
        const pdfY = Math.round((1 - ny) * pdfSize.h * 10) / 10;

        const newField: PlacedField = { type: activeField, page: currentPage, nx, ny, pdfX, pdfY };

        setAllMappings(prev => {
            const existing = prev[selectedConsent] || [];
            const updated = existing.filter(f => f.type !== activeField);
            updated.push(newField);
            return { ...prev, [selectedConsent]: updated };
        });
    }, [activeField, selectedConsent, pdfSize, currentPage]);

    const removeField = (type: FieldType) => {
        setAllMappings(prev => {
            const existing = prev[selectedConsent] || [];
            return { ...prev, [selectedConsent]: existing.filter(f => f.type !== type) };
        });
    };

    const generateExport = () => {
        const lines: string[] = [];
        for (const [key, flds] of Object.entries(allMappings)) {
            if (!flds || flds.length === 0) continue;
            lines.push(`    ${key}: {`);
            lines.push(`        label: '${CONSENT_TYPES[key]?.label || key}',`);
            lines.push(`        file: '${CONSENT_TYPES[key]?.file || ''}',`);
            lines.push(`        fields: {`);
            for (const f of flds) {
                const pageNote = f.page > 1 ? ` // page ${f.page}` : '';
                if (f.type === 'pesel') {
                    lines.push(`            pesel: { startX: ${f.pdfX}, y: ${f.pdfY}, boxWidth: 23.5, fontSize: 12, page: ${f.page} },${pageNote}`);
                } else if (f.type === 'patient_signature' || f.type === 'doctor_signature') {
                    lines.push(`            ${f.type}: { x: ${f.pdfX}, y: ${f.pdfY}, page: ${f.page} },${pageNote}`);
                } else {
                    lines.push(`            ${f.type}: { x: ${f.pdfX}, y: ${f.pdfY}, fontSize: 11, page: ${f.page} },${pageNote}`);
                }
            }
            lines.push(`        },`);
            lines.push(`    },`);
        }
        return lines.join('\n');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(20,20,35,0.95)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <h1 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>🗺️ PDF Coordinate Mapper</h1>

                {/* Consent selector */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {CONSENT_KEYS.map(key => (
                        <button
                            key={key}
                            onClick={() => handleConsentChange(key)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.3rem',
                                border: selectedConsent === key ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                                background: selectedConsent === key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                                color: selectedConsent === key ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                fontWeight: selectedConsent === key ? 'bold' : 'normal',
                            }}
                        >
                            {(allMappings[key]?.length || 0) > 0 ? '✅ ' : ''}{CONSENT_TYPES[key]?.label || key}
                        </button>
                    ))}
                </div>

                {/* Field type selector */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {(Object.keys(FIELD_LABELS) as FieldType[]).map(ft => (
                        <button
                            key={ft}
                            onClick={() => setActiveField(ft)}
                            style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '2rem',
                                border: activeField === ft ? `2px solid ${FIELD_LABELS[ft].color}` : '1px solid rgba(255,255,255,0.08)',
                                background: activeField === ft ? `${FIELD_LABELS[ft].color}22` : 'transparent',
                                color: FIELD_LABELS[ft].color,
                                fontSize: '0.67rem',
                                cursor: 'pointer',
                                fontWeight: activeField === ft ? 'bold' : 'normal',
                            }}
                        >
                            {fields.find(f => f.type === ft) ? '● ' : '○ '}{FIELD_LABELS[ft].label}
                        </button>
                    ))}
                </div>

                {/* Page navigation — in header, always accessible */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        position: 'relative',
                        zIndex: 200,
                    }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }}
                            disabled={currentPage <= 1}
                            style={{
                                padding: '0.5rem 1.2rem',
                                background: currentPage <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.2)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '0.5rem',
                                color: currentPage <= 1 ? 'rgba(255,255,255,0.3)' : '#38bdf8',
                                fontSize: '0.85rem',
                                cursor: currentPage <= 1 ? 'default' : 'pointer',
                                fontWeight: 'bold',
                            }}
                        >
                            ← Poprzednia
                        </button>
                        <div style={{
                            padding: '0.5rem 1.5rem',
                            background: 'rgba(56,189,248,0.15)',
                            borderRadius: '0.5rem',
                            border: '2px solid rgba(56,189,248,0.4)',
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            color: '#38bdf8',
                        }}>
                            📄 Strona {currentPage} / {totalPages}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                            disabled={currentPage >= totalPages}
                            style={{
                                padding: '0.5rem 1.2rem',
                                background: currentPage >= totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.2)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '0.5rem',
                                color: currentPage >= totalPages ? 'rgba(255,255,255,0.3)' : '#38bdf8',
                                fontSize: '0.85rem',
                                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                                fontWeight: 'bold',
                            }}
                        >
                            Następna →
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem' }}>
                {/* PDF area with overlay */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingBottom: `${(pdfSize.h / pdfSize.w) * 100}%`,
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#fff',
                    }}>
                        {/* PDF iframe — use #page=N to navigate */}
                        <iframe
                            key={`${selectedConsent}-p${currentPage}`}
                            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&page=${currentPage}`}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                            }}
                            title={`PDF page ${currentPage}`}
                        />

                        {/* Click capture overlay */}
                        <div
                            ref={overlayRef}
                            onClick={handleClick}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'crosshair',
                                zIndex: 10,
                            }}
                        >
                            {/* Placed markers for current page only */}
                            {fieldsOnPage.map(f => (
                                <div
                                    key={f.type}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.nx * 100}%`,
                                        top: `${f.ny * 100}%`,
                                        transform: 'translate(-5px, -5px)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: FIELD_LABELS[f.type].color,
                                        border: '2px solid #fff',
                                        boxShadow: `0 0 8px ${FIELD_LABELS[f.type].color}80`,
                                    }} />
                                    <div style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: '-2px',
                                        fontSize: '0.6rem',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                        background: FIELD_LABELS[f.type].color,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                    }}>
                                        {FIELD_LABELS[f.type].label} ({f.pdfX}, {f.pdfY})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        marginTop: '0.4rem',
                        fontSize: '0.6rem',
                        color: 'rgba(255,255,255,0.35)',
                        textAlign: 'center',
                    }}>
                        PDF: {pdfSize.w} × {pdfSize.h} pts • Strona {currentPage}/{totalPages} • Kliknij aby wyznaczyć &quot;{FIELD_LABELS[activeField].label}&quot;
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ width: '260px', flexShrink: 0 }}>
                    <div style={{
                        background: 'rgba(20,20,35,0.95)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '0.75rem',
                    }}>
                        <h3 style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
                            📍 {consentType?.label}
                        </h3>

                        {fields.length === 0 ? (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                                Kliknij na PDF aby dodać pole
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {fields.map(f => (
                                    <div key={f.type} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.35rem 0.5rem',
                                        background: f.page === currentPage ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '0.35rem',
                                        borderLeft: `3px solid ${FIELD_LABELS[f.type].color}`,
                                        opacity: f.page === currentPage ? 1 : 0.5,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.67rem', color: FIELD_LABELS[f.type].color, fontWeight: 'bold' }}>
                                                {FIELD_LABELS[f.type].label}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                                s.{f.page} x={f.pdfX} y={f.pdfY}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeField(f.type)}
                                            style={{
                                                background: 'rgba(239,68,68,0.12)',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                borderRadius: '0.25rem',
                                                padding: '0.15rem 0.35rem',
                                                fontSize: '0.6rem',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowExport(!showExport)}
                            style={{
                                marginTop: '0.75rem',
                                width: '100%',
                                padding: '0.5rem',
                                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                            }}
                        >
                            📋 {showExport ? 'Ukryj' : 'Pokaż'} Export
                        </button>
                    </div>

                    {showExport && (
                        <div style={{
                            marginTop: '0.5rem',
                            background: 'rgba(20,20,35,0.95)',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '0.75rem',
                        }}>
                            <textarea
                                readOnly
                                value={generateExport()}
                                style={{
                                    width: '100%',
                                    height: '180px',
                                    background: '#0a0a1a',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '0.35rem',
                                    fontFamily: 'monospace',
                                    fontSize: '0.55rem',
                                    padding: '0.4rem',
                                    resize: 'vertical',
                                }}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generateExport());
                                    alert('Skopiowano!');
                                }}
                                style={{
                                    marginTop: '0.35rem',
                                    width: '100%',
                                    padding: '0.35rem',
                                    background: 'rgba(34,197,94,0.12)',
                                    border: '1px solid rgba(34,197,94,0.25)',
                                    borderRadius: '0.35rem',
                                    color: '#22c55e',
                                    fontSize: '0.67rem',
                                    cursor: 'pointer',
                                }}
                            >
                                📋 Kopiuj do schowka
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
