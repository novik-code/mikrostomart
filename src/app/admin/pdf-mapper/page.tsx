'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type FieldType = 'name' | 'pesel' | 'date' | 'address' | 'city' | 'phone' | 'email' | 'doctor' | 'tooth' | 'doctor_signature' | 'patient_signature';

interface PlacedField {
    type: FieldType;
    page: number;
    nx: number;
    ny: number;
    pdfX: number;
    pdfY: number;
    fontSize?: number;
    boxWidth?: number; // for PESEL
}

interface ConsentMapping {
    consent_key: string;
    label: string;
    pdf_file: string;
    fields: Record<string, any>;
    is_active: boolean;
}

const FIELD_LABELS: Record<FieldType, { label: string; color: string; icon: string }> = {
    name: { label: 'Imię i Nazwisko', color: '#22c55e', icon: '👤' },
    pesel: { label: 'PESEL (lewy kraniec)', color: '#3b82f6', icon: '🔢' },
    date: { label: 'Data', color: '#f59e0b', icon: '📅' },
    address: { label: 'Adres', color: '#a855f7', icon: '🏠' },
    city: { label: 'Miejscowość', color: '#ec4899', icon: '🏙️' },
    phone: { label: 'Telefon', color: '#06b6d4', icon: '📞' },
    email: { label: 'Email', color: '#64748b', icon: '📧' },
    doctor: { label: 'Lekarz (tekst)', color: '#ef4444', icon: '🩺' },
    tooth: { label: 'Ząb', color: '#f97316', icon: '🦷' },
    doctor_signature: { label: 'Podpis lekarza', color: '#8b5cf6', icon: '✒️' },
    patient_signature: { label: 'Podpis pacjenta', color: '#14b8a6', icon: '✍️' },
};

// ═══════════════════════════════════════════════════════════
// pdf.js loader
// ═══════════════════════════════════════════════════════════

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadPdfJs(): Promise<any> {
    return new Promise((resolve, reject) => {
        if ((window as any).pdfjsLib) { resolve((window as any).pdfjsLib); return; }
        const script = document.createElement('script');
        script.src = PDFJS_CDN;
        script.onload = () => {
            const lib = (window as any).pdfjsLib;
            if (lib) { lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN; resolve(lib); }
            else reject(new Error('pdfjsLib not found'));
        };
        script.onerror = () => reject(new Error('Failed to load pdf.js'));
        document.head.appendChild(script);
    });
}

// ═══════════════════════════════════════════════════════════
// Convert DB fields to PlacedField[] and back
// ═══════════════════════════════════════════════════════════

function dbFieldsToPlaced(fields: Record<string, any>, pdfW: number, pdfH: number): PlacedField[] {
    const result: PlacedField[] = [];
    for (const [key, val] of Object.entries(fields)) {
        if (!val) continue;
        const x = val.x ?? val.startX ?? 0;
        const y = val.y ?? 0;
        const page = val.page ?? 1;
        const nx = x / pdfW;
        const ny = 1 - (y / pdfH);
        result.push({
            type: key as FieldType,
            page,
            nx, ny,
            pdfX: x, pdfY: y,
            fontSize: val.fontSize,
            boxWidth: val.boxWidth,
        });
    }
    return result;
}

function placedToDbFields(placed: PlacedField[]): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const f of placed) {
        if (f.type === 'pesel') {
            fields.pesel = { startX: f.pdfX, y: f.pdfY, boxWidth: f.boxWidth || 23.5, fontSize: f.fontSize || 9, page: f.page };
        } else if (f.type === 'patient_signature' || f.type === 'doctor_signature') {
            fields[f.type] = { x: f.pdfX, y: f.pdfY, page: f.page };
        } else {
            fields[f.type] = { x: f.pdfX, y: f.pdfY, fontSize: f.fontSize || 11, page: f.page };
        }
    }
    return fields;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function PdfMapperPage() {
    // State: DB data
    const [consents, setConsents] = useState<ConsentMapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    // State: editor
    const [selectedKey, setSelectedKey] = useState('');
    const [activeField, setActiveField] = useState<FieldType>('name');
    const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pdfSize, setPdfSize] = useState({ w: 612, h: 792 });
    const [rendering, setRendering] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // State: new consent creation
    const [showNewForm, setShowNewForm] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newFile, setNewFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Refs
    const overlayRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfDocRef = useRef<any>(null);

    // ── Load consents from DB ──────────────────────────────────
    useEffect(() => {
        fetch('/api/admin/consent-mappings')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setConsents(data);
                    if (data.length > 0) setSelectedKey(data[0].consent_key);
                }
            })
            .catch(err => console.error('Failed to load consents:', err))
            .finally(() => setLoading(false));
    }, []);

    // ── Current consent info ───────────────────────────────────
    const currentConsent = consents.find(c => c.consent_key === selectedKey);

    // Resolve PDF URL
    const getPdfUrl = (consent: ConsentMapping | undefined) => {
        if (!consent) return '';
        if (consent.pdf_file.startsWith('http')) return consent.pdf_file;
        if (consent.pdf_file.includes('/')) return consent.pdf_file;
        return `/zgody/${consent.pdf_file}`;
    };
    const pdfUrl = getPdfUrl(currentConsent);

    // ── Load PDF when consent changes ──────────────────────────
    useEffect(() => {
        if (!pdfUrl || !currentConsent) return;
        let cancelled = false;

        async function loadPdf() {
            setRendering(true);
            setPdfError(null);
            try {
                const pdfjsLib = await loadPdfJs();
                const doc = await pdfjsLib.getDocument(pdfUrl).promise;
                if (cancelled) return;
                pdfDocRef.current = doc;
                setTotalPages(doc.numPages);
                setCurrentPage(1);
                await renderPage(doc, 1);

                // Load existing fields from DB
                const unscaled = (await doc.getPage(1)).getViewport({ scale: 1 });
                const w = Math.round(unscaled.width * 10) / 10;
                const h = Math.round(unscaled.height * 10) / 10;
                if (currentConsent!.fields && Object.keys(currentConsent!.fields).length > 0) {
                    setPlacedFields(dbFieldsToPlaced(currentConsent!.fields, w, h));
                } else {
                    setPlacedFields([]);
                }
                setHasChanges(false);
            } catch (err: any) {
                if (!cancelled) setPdfError(err.message || 'Błąd ładowania PDF');
            } finally {
                if (!cancelled) setRendering(false);
            }
        }

        loadPdf();
        return () => { cancelled = true; };
    }, [pdfUrl, selectedKey]);

    // ── Render page when currentPage changes ───────────────────
    useEffect(() => {
        const doc = pdfDocRef.current;
        if (!doc) return;
        let cancelled = false;
        async function doRender() {
            setRendering(true);
            try { await renderPage(doc, currentPage); }
            catch (err: any) { if (!cancelled) setPdfError(err.message); }
            finally { if (!cancelled) setRendering(false); }
        }
        doRender();
        return () => { cancelled = true; };
    }, [currentPage]);

    async function renderPage(doc: any, pageNum: number) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const unscaled = page.getViewport({ scale: 1 });
        setPdfSize({ w: Math.round(unscaled.width * 10) / 10, h: Math.round(unscaled.height * 10) / 10 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
    }

    // ── Click to place field ───────────────────────────────────
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const div = overlayRef.current;
        if (!div) return;
        const rect = div.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        const pdfX = Math.round(nx * pdfSize.w * 10) / 10;
        const pdfY = Math.round((1 - ny) * pdfSize.h * 10) / 10;

        const newField: PlacedField = {
            type: activeField, page: currentPage, nx, ny, pdfX, pdfY,
            fontSize: activeField === 'pesel' ? 9 : 11,
            boxWidth: activeField === 'pesel' ? 23.5 : undefined,
        };

        setPlacedFields(prev => {
            const updated = prev.filter(f => f.type !== activeField);
            updated.push(newField);
            return updated;
        });
        setHasChanges(true);
    }, [activeField, pdfSize, currentPage]);

    // ── Remove field ───────────────────────────────────────────
    const removeField = (type: FieldType) => {
        setPlacedFields(prev => prev.filter(f => f.type !== type));
        setHasChanges(true);
    };

    // ── Save to DB ─────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedKey) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            const fields = placedToDbFields(placedFields);
            const res = await fetch('/api/admin/consent-mappings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consent_key: selectedKey, fields }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }
            setSaveMsg('✅ Zapisano!');
            setHasChanges(false);
            // Update local state
            setConsents(prev => prev.map(c =>
                c.consent_key === selectedKey ? { ...c, fields } : c
            ));
        } catch (err: any) {
            setSaveMsg(`❌ ${err.message}`);
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(null), 3000);
        }
    };

    // ── Create new consent type ────────────────────────────────
    const handleCreateNew = async () => {
        if (!newKey || !newLabel) return;
        setUploading(true);
        try {
            let pdf_file = '';

            // Upload PDF if provided
            if (newFile) {
                const formData = new FormData();
                formData.append('file', newFile);
                const uploadRes = await fetch('/api/admin/consent-pdf-upload', {
                    method: 'POST',
                    body: formData,
                });
                if (!uploadRes.ok) throw new Error('Upload PDF failed');
                const uploadData = await uploadRes.json();
                pdf_file = uploadData.publicUrl || uploadData.fileName;
            }

            // Create consent type
            const res = await fetch('/api/admin/consent-mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    consent_key: newKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                    label: newLabel,
                    pdf_file,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Create failed');
            }

            const created = await res.json();
            setConsents(prev => [...prev, created]);
            setSelectedKey(created.consent_key);
            setShowNewForm(false);
            setNewKey('');
            setNewLabel('');
            setNewFile(null);
        } catch (err: any) {
            alert(`Błąd: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // ── Change consent ─────────────────────────────────────────
    const handleConsentChange = (key: string) => {
        if (hasChanges && !confirm('Masz niezapisane zmiany. Zmienić formularz?')) return;
        setSelectedKey(key);
        setCurrentPage(1);
        pdfDocRef.current = null;
    };

    const fieldsOnPage = placedFields.filter(f => f.page === currentPage);
    const aspectRatio = pdfSize.h / pdfSize.w;

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '1.2rem' }}>⏳ Ładowanie typów zgód...</div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
            {/* ═══ HEADER ═══ */}
            <div style={{
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(20,20,35,0.95)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h1 style={{ fontSize: '1.1rem', margin: 0 }}>🗺️ Edytor Mapowania Zgód</h1>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {saveMsg && <span style={{ fontSize: '0.75rem' }}>{saveMsg}</span>}
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            style={{
                                padding: '0.4rem 1rem',
                                background: hasChanges ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: hasChanges ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                cursor: hasChanges ? 'pointer' : 'default',
                            }}
                        >
                            {saving ? '⏳ Zapisuję...' : hasChanges ? '💾 Zapisz do bazy' : '✅ Zapisane'}
                        </button>
                    </div>
                </div>

                {/* Consent selector */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem', alignItems: 'center' }}>
                    {consents.map(c => (
                        <button
                            key={c.consent_key}
                            onClick={() => handleConsentChange(c.consent_key)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.3rem',
                                border: selectedKey === c.consent_key ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                                background: selectedKey === c.consent_key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                                color: selectedKey === c.consent_key ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                fontWeight: selectedKey === c.consent_key ? 'bold' : 'normal',
                            }}
                        >
                            {Object.keys(c.fields || {}).length > 0 ? '✅ ' : '○ '}{c.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowNewForm(!showNewForm)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.3rem',
                            border: '1px dashed rgba(34,197,94,0.4)',
                            background: showNewForm ? 'rgba(34,197,94,0.15)' : 'transparent',
                            color: '#22c55e',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        ➕ Nowy typ zgody
                    </button>
                </div>

                {/* New consent form */}
                {showNewForm && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(34,197,94,0.08)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(34,197,94,0.2)',
                        marginBottom: '0.5rem',
                        display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap',
                    }}>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Klucz (np. periodontologia)</label>
                            <input value={newKey} onChange={e => setNewKey(e.target.value)}
                                placeholder="nazwa_klucza"
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem', width: '160px' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Nazwa wyświetlana</label>
                            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                                placeholder="Zgoda na leczenie periodontologiczne"
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem', width: '280px' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Plik PDF</label>
                            <input type="file" accept=".pdf" onChange={e => setNewFile(e.target.files?.[0] || null)}
                                style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}
                            />
                        </div>
                        <button
                            onClick={handleCreateNew}
                            disabled={!newKey || !newLabel || uploading}
                            style={{
                                padding: '0.35rem 0.8rem',
                                background: newKey && newLabel ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                                border: 'none', borderRadius: '0.3rem',
                                color: '#fff', fontWeight: 'bold', fontSize: '0.75rem',
                                cursor: newKey && newLabel ? 'pointer' : 'default',
                            }}
                        >
                            {uploading ? '⏳ Tworzę...' : '✅ Utwórz'}
                        </button>
                    </div>
                )}

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
                            {placedFields.find(f => f.type === ft) ? '● ' : '○ '}{FIELD_LABELS[ft].icon} {FIELD_LABELS[ft].label}
                        </button>
                    ))}
                </div>

                {/* Page navigation */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                            style={{ padding: '0.4rem 1rem', background: currentPage <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: currentPage <= 1 ? 'rgba(255,255,255,0.3)' : '#38bdf8', fontSize: '0.8rem', cursor: currentPage <= 1 ? 'default' : 'pointer', fontWeight: 'bold' }}>
                            ← Poprzednia
                        </button>
                        <div style={{ padding: '0.4rem 1.2rem', background: 'rgba(56,189,248,0.15)', borderRadius: '0.5rem', border: '2px solid rgba(56,189,248,0.4)', fontWeight: 'bold', fontSize: '0.85rem', color: '#38bdf8' }}>
                            📄 Strona {currentPage} / {totalPages}
                        </div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                            style={{ padding: '0.4rem 1rem', background: currentPage >= totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: currentPage >= totalPages ? 'rgba(255,255,255,0.3)' : '#38bdf8', fontSize: '0.8rem', cursor: currentPage >= totalPages ? 'default' : 'pointer', fontWeight: 'bold' }}>
                            Następna →
                        </button>
                    </div>
                )}
            </div>

            {/* ═══ MAIN AREA ═══ */}
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem' }}>
                {/* PDF canvas + overlay */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'relative', width: '100%', paddingBottom: `${aspectRatio * 100}%`, borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#fff' }}>
                        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

                        {(rendering || pdfError) && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: rendering ? 'rgba(255,255,255,0.8)' : 'rgba(255,0,0,0.1)', zIndex: 5 }}>
                                <span style={{ color: pdfError ? '#ef4444' : '#333', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    {pdfError ? `❌ ${pdfError}` : '⏳ Renderuję stronę...'}
                                </span>
                            </div>
                        )}

                        {/* Click capture overlay */}
                        <div ref={overlayRef} onClick={handleClick} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 10 }}>
                            {fieldsOnPage.map(f => (
                                <div key={f.type} style={{ position: 'absolute', left: `${f.nx * 100}%`, top: `${f.ny * 100}%`, transform: 'translate(-6px, -6px)', pointerEvents: 'none' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: FIELD_LABELS[f.type].color, border: '2px solid #fff', boxShadow: `0 0 10px ${FIELD_LABELS[f.type].color}80` }} />
                                    <div style={{ position: 'absolute', left: '18px', top: '-3px', fontSize: '0.6rem', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', background: FIELD_LABELS[f.type].color, padding: '2px 6px', borderRadius: '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                                        {FIELD_LABELS[f.type].icon} {FIELD_LABELS[f.type].label} ({f.pdfX}, {f.pdfY})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                        PDF: {pdfSize.w} × {pdfSize.h} pts • Strona {currentPage}/{totalPages} • Kliknij aby wyznaczyć &quot;{FIELD_LABELS[activeField].label}&quot;
                    </div>
                </div>

                {/* ═══ SIDEBAR ═══ */}
                <div style={{ width: '280px', flexShrink: 0 }}>
                    <div style={{ background: 'rgba(20,20,35,0.95)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.8rem', margin: '0 0 0.5rem', color: '#38bdf8' }}>
                            📍 {currentConsent?.label || 'Wybierz formularz'}
                        </h3>

                        {currentConsent && (
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                                Klucz: {currentConsent.consent_key}
                                <br />Plik: {currentConsent.pdf_file}
                            </div>
                        )}

                        {placedFields.length === 0 ? (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                                Kliknij na PDF aby dodać pole
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {placedFields.map(f => (
                                    <div key={f.type} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.35rem 0.5rem',
                                        background: f.page === currentPage ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '0.35rem',
                                        borderLeft: `3px solid ${FIELD_LABELS[f.type].color}`,
                                        opacity: f.page === currentPage ? 1 : 0.5,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.67rem', color: FIELD_LABELS[f.type].color, fontWeight: 'bold' }}>
                                                {FIELD_LABELS[f.type].icon} {FIELD_LABELS[f.type].label}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                                s.{f.page} x={f.pdfX} y={f.pdfY}
                                            </div>
                                        </div>
                                        <button onClick={() => removeField(f.type)}
                                            style={{ background: 'rgba(239,68,68,0.12)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '0.25rem', padding: '0.15rem 0.35rem', fontSize: '0.6rem' }}>
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Save button in sidebar too */}
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            style={{
                                marginTop: '0.75rem',
                                width: '100%',
                                padding: '0.6rem',
                                background: hasChanges ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.04)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: hasChanges ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                cursor: hasChanges ? 'pointer' : 'default',
                            }}
                        >
                            {saving ? '⏳ Zapisuję...' : hasChanges ? '💾 Zapisz mapowanie' : '✅ Brak zmian'}
                        </button>

                        {hasChanges && (
                            <div style={{ marginTop: '0.35rem', fontSize: '0.6rem', color: '#f59e0b', textAlign: 'center' }}>
                                ⚠️ Niezapisane zmiany
                            </div>
                        )}
                    </div>

                    {/* Info panel */}
                    <div style={{
                        marginTop: '0.75rem',
                        background: 'rgba(20,20,35,0.95)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '0.75rem',
                    }}>
                        <h4 style={{ fontSize: '0.7rem', margin: '0 0 0.35rem', color: 'rgba(255,255,255,0.5)' }}>ℹ️ Jak używać</h4>
                        <ul style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', margin: 0, paddingLeft: '1rem', lineHeight: '1.6' }}>
                            <li>Wybierz typ pola na górze</li>
                            <li>Kliknij na PDF w miejscu, gdzie ma być pole</li>
                            <li>Aby poprawić — kliknij ponownie (nadpisze)</li>
                            <li>Przycisk ✕ usuwa pole</li>
                            <li>Kliknij &quot;Zapisz&quot; by zachować w bazie</li>
                            <li>Zmiany działają natychmiast — bez deploymentu!</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
