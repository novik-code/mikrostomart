'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

// Built-in field types (auto-filled from patient data)
const BUILTIN_FIELDS: Record<string, { label: string; color: string; icon: string; category: 'auto' }> = {
    name: { label: 'Imię i Nazwisko', color: '#22c55e', icon: '👤', category: 'auto' },
    pesel: { label: 'PESEL (lewy kraniec)', color: '#3b82f6', icon: '🔢', category: 'auto' },
    date: { label: 'Data', color: '#f59e0b', icon: '📅', category: 'auto' },
    address: { label: 'Adres', color: '#a855f7', icon: '🏠', category: 'auto' },
    city: { label: 'Miejscowość', color: '#ec4899', icon: '🏙️', category: 'auto' },
    phone: { label: 'Telefon', color: '#06b6d4', icon: '📞', category: 'auto' },
    email: { label: 'Email', color: '#64748b', icon: '📧', category: 'auto' },
    doctor: { label: 'Lekarz (tekst)', color: '#ef4444', icon: '🩺', category: 'auto' },
    tooth: { label: 'Ząb / Zabieg', color: '#f97316', icon: '🦷', category: 'auto' },
    doctor_signature: { label: 'Podpis lekarza', color: '#8b5cf6', icon: '✒️', category: 'auto' },
    patient_signature: { label: 'Podpis pacjenta', color: '#14b8a6', icon: '✍️', category: 'auto' },
};

// Color palette for custom fields
const CUSTOM_COLORS = ['#f43f5e', '#d946ef', '#8b5cf6', '#0ea5e9', '#10b981', '#f97316', '#84cc16', '#06b6d4', '#e11d48', '#7c3aed'];
function getCustomColor(index: number) { return CUSTOM_COLORS[index % CUSTOM_COLORS.length]; }

interface PlacedField {
    key: string;        // field key (built-in like 'name' or custom like 'checkbox_1')
    label: string;      // display label
    fieldType: 'text' | 'signature' | 'pesel' | 'checkbox';
    page: number;
    nx: number;
    ny: number;
    pdfX: number;
    pdfY: number;
    fontSize?: number;
    boxWidth?: number;  // for PESEL boxes
    color: string;
    icon: string;
}

interface ConsentMapping {
    consent_key: string;
    label: string;
    pdf_file: string;
    fields: Record<string, any>;
    is_active: boolean;
}

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
// Convert DB fields <-> PlacedField[]
// ═══════════════════════════════════════════════════════════

function inferFieldType(key: string, val: any): 'text' | 'signature' | 'pesel' | 'checkbox' {
    if (key === 'pesel') return 'pesel';
    if (key.endsWith('_signature')) return 'signature';
    if (val.fieldType === 'checkbox' || key.startsWith('checkbox_')) return 'checkbox';
    return val.fieldType || 'text';
}

// Get base field key (strip _2, _3 suffix for multi-instance fields)
function getBaseKey(key: string): string {
    // Match keys like 'patient_signature_2', 'address_3', but NOT 'doctor_signature' (built-in)
    const match = key.match(/^(.+?)_(\d+)$/);
    if (match) {
        const potentialBase = match[1];
        // Only strip suffix if base is a known built-in or custom prefix
        if (BUILTIN_FIELDS[potentialBase] || potentialBase.startsWith('custom_') || potentialBase.startsWith('checkbox_')) {
            return potentialBase;
        }
    }
    return key;
}

function getFieldMeta(key: string, val: any, idx: number): { label: string; color: string; icon: string } {
    const base = getBaseKey(key);
    if (BUILTIN_FIELDS[base]) {
        const meta = BUILTIN_FIELDS[base];
        const suffix = key !== base ? ` #${key.split('_').pop()}` : '';
        return { label: meta.label + suffix, color: meta.color, icon: meta.icon };
    }
    const ft = inferFieldType(key, val);
    return {
        label: val.label || key,
        color: getCustomColor(idx),
        icon: ft === 'checkbox' ? '☑️' : '📝',
    };
}

function dbFieldsToPlaced(fields: Record<string, any>, pdfW: number, pdfH: number): PlacedField[] {
    const result: PlacedField[] = [];
    let idx = 0;
    for (const [key, val] of Object.entries(fields)) {
        if (!val) continue;
        const x = val.x ?? val.startX ?? 0;
        const y = val.y ?? 0;
        const page = val.page ?? 1;
        const nx = x / pdfW;
        const ny = 1 - (y / pdfH);
        const meta = getFieldMeta(key, val, idx);
        result.push({
            key,
            label: meta.label,
            fieldType: inferFieldType(key, val),
            page, nx, ny,
            pdfX: x, pdfY: y,
            fontSize: val.fontSize,
            boxWidth: val.boxWidth,
            color: meta.color,
            icon: meta.icon,
        });
        idx++;
    }
    return result;
}

function placedToDbFields(placed: PlacedField[]): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const f of placed) {
        const base = getBaseKey(f.key);
        const isMultiInstance = f.key !== base;
        if (f.fieldType === 'pesel') {
            fields[f.key] = { startX: f.pdfX, y: f.pdfY, boxWidth: f.boxWidth || 23.5, fontSize: f.fontSize || 9, page: f.page };
            if (isMultiInstance) fields[f.key].sourceField = base;
        } else if (f.fieldType === 'signature') {
            fields[f.key] = { x: f.pdfX, y: f.pdfY, page: f.page };
            if (isMultiInstance) fields[f.key].sourceField = base;
        } else if (f.fieldType === 'checkbox') {
            fields[f.key] = { x: f.pdfX, y: f.pdfY, page: f.page, fieldType: 'checkbox', label: f.label, fontSize: f.fontSize || 11 };
        } else {
            const entry: any = { x: f.pdfX, y: f.pdfY, fontSize: f.fontSize || 11, page: f.page };
            if (!BUILTIN_FIELDS[f.key] && !BUILTIN_FIELDS[base]) {
                entry.label = f.label;
                entry.fieldType = 'text';
            }
            if (isMultiInstance) entry.sourceField = base;
            fields[f.key] = entry;
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
    const [activeFieldKey, setActiveFieldKey] = useState('name');
    const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pdfSize, setPdfSize] = useState({ w: 612, h: 792 });
    const [rendering, setRendering] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // State: add custom field
    const [showAddField, setShowAddField] = useState(false);
    const [newFieldKey, setNewFieldKey] = useState('');
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState<'text' | 'checkbox'>('text');

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

    // Build active field list: built-in + custom (from placed fields)
    const allFieldOptions = (() => {
        const options: { key: string; label: string; color: string; icon: string; fieldType: string }[] = [];
        // Built-in first
        for (const [key, meta] of Object.entries(BUILTIN_FIELDS)) {
            options.push({ key, label: meta.label, color: meta.color, icon: meta.icon, fieldType: key === 'pesel' ? 'pesel' : (key.endsWith('_signature') ? 'signature' : 'text') });
        }
        // Custom fields from placed
        for (const f of placedFields) {
            if (!BUILTIN_FIELDS[f.key]) {
                if (!options.find(o => o.key === f.key)) {
                    options.push({ key: f.key, label: f.label, color: f.color, icon: f.icon, fieldType: f.fieldType });
                }
            }
        }
        return options;
    })();

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

    // ── Render page ────────────────────────────────────────────
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

    // ── Click to place field (multi-instance: adds _2, _3 etc.) ──
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const div = overlayRef.current;
        if (!div) return;
        const rect = div.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        const pdfX = Math.round(nx * pdfSize.w * 10) / 10;
        const pdfY = Math.round((1 - ny) * pdfSize.h * 10) / 10;

        const activeOption = allFieldOptions.find(o => o.key === activeFieldKey);
        if (!activeOption) return;

        setPlacedFields(prev => {
            // Find existing instances of this base field
            const baseKey = activeFieldKey;
            const existingInstances = prev.filter(f => f.key === baseKey || getBaseKey(f.key) === baseKey);

            let finalKey: string;
            let finalLabel: string;

            if (existingInstances.length === 0) {
                // First instance — use base key directly
                finalKey = baseKey;
                finalLabel = activeOption.label;
            } else {
                // Find next available suffix
                let nextNum = 2;
                while (prev.some(f => f.key === `${baseKey}_${nextNum}`)) nextNum++;
                finalKey = `${baseKey}_${nextNum}`;
                finalLabel = `${activeOption.label} #${nextNum}`;
            }

            const newField: PlacedField = {
                key: finalKey,
                label: finalLabel,
                fieldType: activeOption.fieldType as any,
                page: currentPage, nx, ny, pdfX, pdfY,
                fontSize: activeOption.fieldType === 'pesel' ? 9 : 11,
                boxWidth: activeOption.fieldType === 'pesel' ? 23.5 : undefined,
                color: activeOption.color,
                icon: activeOption.icon,
            };

            return [...prev, newField];
        });
        setHasChanges(true);
    }, [activeFieldKey, pdfSize, currentPage, allFieldOptions]);

    // ── Remove field ───────────────────────────────────────────
    const removeField = (key: string) => {
        setPlacedFields(prev => prev.filter(f => f.key !== key));
        setHasChanges(true);
    };

    // ── Duplicate field (add another instance) ─────────────────
    const duplicateField = (key: string) => {
        const existing = placedFields.find(f => f.key === key);
        if (!existing) return;
        const baseKey = getBaseKey(key);
        let nextNum = 2;
        while (placedFields.some(f => f.key === `${baseKey}_${nextNum}`)) nextNum++;
        const newKey = `${baseKey}_${nextNum}`;
        const baseLabel = BUILTIN_FIELDS[baseKey]?.label || existing.label.replace(/ #\d+$/, '');
        setPlacedFields(prev => [...prev, {
            ...existing,
            key: newKey,
            label: `${baseLabel} #${nextNum}`,
            // Offset slightly so it's visible
            nx: Math.min(existing.nx + 0.02, 0.98),
            ny: Math.min(existing.ny + 0.02, 0.98),
            pdfX: Math.round((Math.min(existing.nx + 0.02, 0.98)) * pdfSize.w * 10) / 10,
            pdfY: Math.round((1 - Math.min(existing.ny + 0.02, 0.98)) * pdfSize.h * 10) / 10,
        }]);
        setHasChanges(true);
    };

    // ── Add custom field ───────────────────────────────────────
    const handleAddCustomField = () => {
        const sanitizedKey = newFieldKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!sanitizedKey || !newFieldLabel) return;

        const finalKey = newFieldType === 'checkbox' ? `checkbox_${sanitizedKey}` : `custom_${sanitizedKey}`;

        // Check for duplicate
        if (allFieldOptions.find(o => o.key === finalKey)) {
            alert(`Pole "${finalKey}" już istnieje!`);
            return;
        }

        // Add to placed fields with a temporary position (user will click to place)
        setActiveFieldKey(finalKey);
        setShowAddField(false);
        setNewFieldKey('');
        setNewFieldLabel('');

        // Pre-register the custom field in placed so it appears in the field list
        // But without position — user needs to click on PDF to place it
        const idx = placedFields.length;
        const color = getCustomColor(idx);
        const icon = newFieldType === 'checkbox' ? '☑️' : '📝';

        // Add a "pending" field — it will be placed when user clicks
        setPlacedFields(prev => [...prev, {
            key: finalKey,
            label: newFieldLabel,
            fieldType: newFieldType,
            page: currentPage,
            nx: 0.5, ny: 0.5, // center temporarily
            pdfX: Math.round(pdfSize.w / 2 * 10) / 10,
            pdfY: Math.round(pdfSize.h / 2 * 10) / 10,
            fontSize: 11,
            color, icon,
        }]);
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
            if (newFile) {
                const formData = new FormData();
                formData.append('file', newFile);
                const uploadRes = await fetch('/api/admin/consent-pdf-upload', { method: 'POST', body: formData });
                if (!uploadRes.ok) throw new Error('Upload PDF failed');
                const uploadData = await uploadRes.json();
                pdf_file = uploadData.publicUrl || uploadData.fileName;
            }
            const res = await fetch('/api/admin/consent-mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    consent_key: newKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                    label: newLabel, pdf_file,
                }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Create failed'); }
            const created = await res.json();
            setConsents(prev => [...prev, created]);
            setSelectedKey(created.consent_key);
            setShowNewForm(false);
            setNewKey(''); setNewLabel(''); setNewFile(null);
        } catch (err: any) { alert(`Błąd: ${err.message}`); }
        finally { setUploading(false); }
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
    const activeOption = allFieldOptions.find(o => o.key === activeFieldKey);

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
                        <button onClick={handleSave} disabled={!hasChanges || saving}
                            style={{
                                padding: '0.4rem 1rem',
                                background: hasChanges ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                                border: 'none', borderRadius: '0.5rem',
                                color: hasChanges ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontWeight: 'bold', fontSize: '0.8rem',
                                cursor: hasChanges ? 'pointer' : 'default',
                            }}>
                            {saving ? '⏳ Zapisuję...' : hasChanges ? '💾 Zapisz do bazy' : '✅ Zapisane'}
                        </button>
                    </div>
                </div>

                {/* Consent selector */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem', alignItems: 'center' }}>
                    {consents.map(c => (
                        <button key={c.consent_key} onClick={() => handleConsentChange(c.consent_key)}
                            style={{
                                padding: '0.25rem 0.5rem', borderRadius: '0.3rem',
                                border: selectedKey === c.consent_key ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                                background: selectedKey === c.consent_key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                                color: selectedKey === c.consent_key ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.65rem', cursor: 'pointer',
                                fontWeight: selectedKey === c.consent_key ? 'bold' : 'normal',
                            }}>
                            {Object.keys(c.fields || {}).length > 0 ? '✅ ' : '○ '}{c.label}
                        </button>
                    ))}
                    <button onClick={() => setShowNewForm(!showNewForm)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '0.3rem', border: '1px dashed rgba(34,197,94,0.4)', background: showNewForm ? 'rgba(34,197,94,0.15)' : 'transparent', color: '#22c55e', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>
                        ➕ Nowy typ zgody
                    </button>
                </div>

                {/* New consent form */}
                {showNewForm && (
                    <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Klucz</label>
                            <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="nazwa_klucza"
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem', width: '160px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Nazwa</label>
                            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Zgoda na..."
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem', width: '280px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>PDF</label>
                            <input type="file" accept=".pdf" onChange={e => setNewFile(e.target.files?.[0] || null)} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }} />
                        </div>
                        <button onClick={handleCreateNew} disabled={!newKey || !newLabel || uploading}
                            style={{ padding: '0.35rem 0.8rem', background: newKey && newLabel ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '0.3rem', color: '#fff', fontWeight: 'bold', fontSize: '0.75rem', cursor: newKey && newLabel ? 'pointer' : 'default' }}>
                            {uploading ? '⏳ Tworzę...' : '✅ Utwórz'}
                        </button>
                    </div>
                )}

                {/* Field type selector — built-in fields */}
                <div style={{ marginBottom: '0.3rem', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pola automatyczne (dane pacjenta)</div>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    {allFieldOptions.filter(o => BUILTIN_FIELDS[o.key]).map(o => (
                        <button key={o.key} onClick={() => setActiveFieldKey(o.key)}
                            style={{
                                padding: '0.25rem 0.6rem', borderRadius: '2rem',
                                border: activeFieldKey === o.key ? `2px solid ${o.color}` : '1px solid rgba(255,255,255,0.08)',
                                background: activeFieldKey === o.key ? `${o.color}22` : 'transparent',
                                color: o.color, fontSize: '0.67rem', cursor: 'pointer',
                                fontWeight: activeFieldKey === o.key ? 'bold' : 'normal',
                            }}>
                            {(() => { const count = placedFields.filter(f => f.key === o.key || getBaseKey(f.key) === o.key).length; return count > 0 ? `●${count > 1 ? count : ''} ` : '○ '; })()}{o.icon} {o.label}
                        </button>
                    ))}
                </div>

                {/* Custom fields */}
                {allFieldOptions.filter(o => !BUILTIN_FIELDS[o.key]).length > 0 && (
                    <>
                        <div style={{ marginBottom: '0.3rem', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pola dodatkowe (custom)</div>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                            {allFieldOptions.filter(o => !BUILTIN_FIELDS[o.key]).map(o => (
                                <button key={o.key} onClick={() => setActiveFieldKey(o.key)}
                                    style={{
                                        padding: '0.25rem 0.6rem', borderRadius: '2rem',
                                        border: activeFieldKey === o.key ? `2px solid ${o.color}` : '1px solid rgba(255,255,255,0.08)',
                                        background: activeFieldKey === o.key ? `${o.color}22` : 'transparent',
                                        color: o.color, fontSize: '0.67rem', cursor: 'pointer',
                                        fontWeight: activeFieldKey === o.key ? 'bold' : 'normal',
                                    }}>
                                    ● {o.icon} {o.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Add custom field button + form */}
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowAddField(!showAddField)}
                        style={{
                            padding: '0.25rem 0.6rem', borderRadius: '2rem',
                            border: '1px dashed rgba(251,191,36,0.4)',
                            background: showAddField ? 'rgba(251,191,36,0.15)' : 'transparent',
                            color: '#fbbf24', fontSize: '0.67rem', cursor: 'pointer', fontWeight: 'bold',
                        }}>
                        ➕ Dodaj nowe pole
                    </button>
                </div>

                {showAddField && (
                    <div style={{
                        marginTop: '0.4rem', padding: '0.6rem',
                        background: 'rgba(251,191,36,0.08)', borderRadius: '0.5rem',
                        border: '1px solid rgba(251,191,36,0.2)',
                        display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap',
                    }}>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Typ pola</label>
                            <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)}
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem' }}>
                                <option value="text">📝 Tekst</option>
                                <option value="checkbox">☑️ Checkbox</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Klucz (identyfikator)</label>
                            <input value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} placeholder="np. nieletni"
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem', width: '140px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Etykieta</label>
                            <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="np. Pacjent nieletni"
                                style={{ padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.75rem', width: '200px' }} />
                        </div>
                        <button onClick={handleAddCustomField} disabled={!newFieldKey || !newFieldLabel}
                            style={{
                                padding: '0.35rem 0.8rem',
                                background: newFieldKey && newFieldLabel ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.05)',
                                border: 'none', borderRadius: '0.3rem', color: '#000', fontWeight: 'bold', fontSize: '0.75rem',
                                cursor: newFieldKey && newFieldLabel ? 'pointer' : 'default',
                            }}>
                            ✅ Dodaj i umieść na PDF
                        </button>
                    </div>
                )}

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
                        {/* Click overlay */}
                        <div ref={overlayRef} onClick={handleClick} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 10 }}>
                            {fieldsOnPage.map(f => (
                                <div key={f.key} style={{ position: 'absolute', left: `${f.nx * 100}%`, top: `${f.ny * 100}%`, transform: 'translate(-6px, -6px)', pointerEvents: 'none' }}>
                                    <div style={{
                                        width: f.fieldType === 'checkbox' ? '16px' : '14px',
                                        height: f.fieldType === 'checkbox' ? '16px' : '14px',
                                        borderRadius: f.fieldType === 'checkbox' ? '3px' : '50%',
                                        background: f.color,
                                        border: '2px solid #fff',
                                        boxShadow: `0 0 10px ${f.color}80`,
                                    }} />
                                    <div style={{ position: 'absolute', left: '20px', top: '-3px', fontSize: '0.6rem', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', background: f.color, padding: '2px 6px', borderRadius: '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                                        {f.icon} {f.label} ({f.pdfX}, {f.pdfY})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                        PDF: {pdfSize.w} × {pdfSize.h} pts • Strona {currentPage}/{totalPages} • Kliknij aby wyznaczyć &quot;{activeOption?.label || activeFieldKey}&quot;
                    </div>
                </div>

                {/* ═══ SIDEBAR ═══ */}
                <div style={{ width: '290px', flexShrink: 0 }}>
                    <div style={{ background: 'rgba(20,20,35,0.95)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.8rem', margin: '0 0 0.5rem', color: '#38bdf8' }}>
                            📍 {currentConsent?.label || 'Wybierz formularz'}
                        </h3>
                        {currentConsent && (
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                                Klucz: {currentConsent.consent_key}<br />Plik: {currentConsent.pdf_file}
                            </div>
                        )}

                        {placedFields.length === 0 ? (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>Kliknij na PDF aby dodać pole</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '50vh', overflowY: 'auto' }}>
                                {placedFields.map(f => (
                                    <div key={f.key} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.35rem 0.5rem',
                                        background: f.page === currentPage ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '0.35rem',
                                        borderLeft: `3px solid ${f.color}`,
                                        opacity: f.page === currentPage ? 1 : 0.5,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.67rem', color: f.color, fontWeight: 'bold' }}>
                                                {f.icon} {f.label}
                                                {f.fieldType === 'checkbox' && <span style={{ fontSize: '0.55rem', marginLeft: '0.3rem', color: 'rgba(255,255,255,0.4)' }}>(checkbox)</span>}
                                                {f.key !== getBaseKey(f.key) && <span style={{ fontSize: '0.55rem', marginLeft: '0.3rem', color: 'rgba(255,255,255,0.3)' }}>(kopia)</span>}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                                s.{f.page} x={f.pdfX} y={f.pdfY}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                                            <button onClick={() => duplicateField(f.key)} title="Zwielokrotnij pole (dodaj kolejną kopię)"
                                                style={{ background: 'rgba(56,189,248,0.12)', border: 'none', color: '#38bdf8', cursor: 'pointer', borderRadius: '0.25rem', padding: '0.15rem 0.35rem', fontSize: '0.6rem' }}>
                                                📋+
                                            </button>
                                            <button onClick={() => removeField(f.key)}
                                                style={{ background: 'rgba(239,68,68,0.12)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '0.25rem', padding: '0.15rem 0.35rem', fontSize: '0.6rem' }}>
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button onClick={handleSave} disabled={!hasChanges || saving}
                            style={{
                                marginTop: '0.75rem', width: '100%', padding: '0.6rem',
                                background: hasChanges ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.04)',
                                border: 'none', borderRadius: '0.5rem',
                                color: hasChanges ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontWeight: 'bold', fontSize: '0.8rem',
                                cursor: hasChanges ? 'pointer' : 'default',
                            }}>
                            {saving ? '⏳ Zapisuję...' : hasChanges ? '💾 Zapisz mapowanie' : '✅ Brak zmian'}
                        </button>
                        {hasChanges && (
                            <div style={{ marginTop: '0.35rem', fontSize: '0.6rem', color: '#f59e0b', textAlign: 'center' }}>
                                ⚠️ Niezapisane zmiany
                            </div>
                        )}
                    </div>

                    {/* Info panel */}
                    <div style={{ marginTop: '0.75rem', background: 'rgba(20,20,35,0.95)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.7rem', margin: '0 0 0.35rem', color: 'rgba(255,255,255,0.5)' }}>ℹ️ Jak używać</h4>
                        <ul style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', margin: 0, paddingLeft: '1rem', lineHeight: '1.6' }}>
                            <li>Wybierz typ pola na górze</li>
                            <li>Kliknij na PDF w miejscu pola</li>
                            <li>Kliknij ponownie → tworzy <strong>nową kopię</strong> (np. podpis #2)</li>
                            <li><strong>📋+</strong> w sidebarze = zwielokrotnij pole</li>
                            <li>✕ w sidebarze = usuń pole</li>
                            <li><strong>➕ Dodaj nowe pole</strong> — tekst lub checkbox</li>
                            <li>&quot;Zapisz&quot; = natychmiast w bazie, bez deploymentu</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
