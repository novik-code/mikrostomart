'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ConsentItem {
    type: string;
    label: string;
    file: string;
    signed: boolean;
}

interface PatientDetails {
    firstName: string;
    lastName: string;
    pesel: string;
    birthDate: string;
    phone: string;
    address: { street: string; houseNumber: string; apartmentNumber: string; postalCode: string; city: string } | null;
}

type Phase = 'loading' | 'error' | 'list' | 'preparing' | 'viewing' | 'signing' | 'done';

/**
 * PDF field positions per consent type — where to overlay patient data.
 * x, y are in PDF points (1pt = 1/72 inch), from bottom-left corner.
 * A4 = 595 x 842 points.
 */
const PDF_FIELD_POSITIONS: Record<string, { name?: { x: number; y: number }; pesel?: { x: number; y: number }; date?: { x: number; y: number }; address?: { x: number; y: number } }> = {
    // Default positions — most consent forms have name near top, PESEL below
    _default: {
        name: { x: 70, y: 742 },
        pesel: { x: 70, y: 720 },
        date: { x: 420, y: 742 },
    },
};

export default function ConsentSigningPage() {
    const params = useParams();
    const token = params.token as string;

    const [phase, setPhase] = useState<Phase>('loading');
    const [error, setError] = useState('');
    const [patientName, setPatientName] = useState('');
    const [prodentisPatientId, setProdentisPatientId] = useState('');
    const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
    const [consents, setConsents] = useState<ConsentItem[]>([]);
    const [currentConsent, setCurrentConsent] = useState<ConsentItem | null>(null);
    const [signing, setSigning] = useState(false);
    const [prefilledPdfUrl, setPrefilledPdfUrl] = useState<string | null>(null);
    const [prefilledPdfBytes, setPrefilledPdfBytes] = useState<Uint8Array | null>(null);

    // Canvas signature
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // Verify token on mount
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch('/api/consents/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || 'Token nieważny');
                    setPhase('error');
                    return;
                }

                const data = await res.json();
                setPatientName(data.patientName);
                setProdentisPatientId(data.prodentisPatientId || '');
                setPatientDetails(data.patientDetails || null);
                setConsents(data.consents);
                setPhase('list');
            } catch {
                setError('Błąd połączenia');
                setPhase('error');
            }
        };
        verify();
    }, [token]);

    // Canvas resize
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;
        const w = container.clientWidth;
        const h = 180;
        canvas.width = w * 2;
        canvas.height = h * 2;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(2, 2);
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }, []);

    useEffect(() => {
        if (phase === 'signing') {
            setTimeout(resizeCanvas, 100);
            window.addEventListener('resize', resizeCanvas);
            return () => window.removeEventListener('resize', resizeCanvas);
        }
    }, [phase, resizeCanvas]);

    // Drawing handlers
    const getPos = (e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        setHasDrawn(true);
        const pos = getPos(e);
        lastPointRef.current = pos;
    };

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !lastPointRef.current) return;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPointRef.current = pos;
    };

    const stopDraw = () => {
        setIsDrawing(false);
        lastPointRef.current = null;
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    /**
     * Pre-fill a PDF with patient data using pdf-lib.
     * Overlays name, PESEL, and date onto the first page.
     */
    const prefillPdf = async (consent: ConsentItem): Promise<{ url: string; bytes: Uint8Array }> => {
        // Fetch original PDF
        const pdfRes = await fetch(consent.file);
        const pdfBytes = await pdfRes.arrayBuffer();

        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { height: pageHeight } = firstPage.getSize();

        const positions = PDF_FIELD_POSITIONS[consent.type] || PDF_FIELD_POSITIONS._default;
        const today = new Date().toLocaleDateString('pl-PL');
        const fullName = patientDetails
            ? `${patientDetails.firstName} ${patientDetails.lastName}`
            : patientName;
        const pesel = patientDetails?.pesel || '';

        // Draw patient info header block at top
        const headerX = 70;
        const headerStartY = pageHeight - 60;
        const fontSize = 10;
        const lineHeight = 14;

        // Semi-transparent white background for readability
        firstPage.drawRectangle({
            x: headerX - 5,
            y: headerStartY - lineHeight * 4 - 5,
            width: 350,
            height: lineHeight * 4 + 15,
            color: rgb(1, 1, 1),
            opacity: 0.85,
        });

        // Patient name
        firstPage.drawText(`Pacjent: ${fullName}`, {
            x: headerX,
            y: headerStartY,
            size: fontSize,
            font: boldFont,
            color: rgb(0, 0, 0),
        });

        // PESEL
        if (pesel) {
            firstPage.drawText(`PESEL: ${pesel}`, {
                x: headerX,
                y: headerStartY - lineHeight,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
        }

        // Date
        firstPage.drawText(`Data: ${today}`, {
            x: headerX,
            y: headerStartY - lineHeight * 2,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });

        // Address if available
        if (patientDetails?.address) {
            const addr = patientDetails.address;
            const addrStr = `${addr.street || ''} ${addr.houseNumber || ''}${addr.apartmentNumber ? '/' + addr.apartmentNumber : ''}, ${addr.postalCode || ''} ${addr.city || ''}`.trim();
            if (addrStr.length > 3) {
                firstPage.drawText(`Adres: ${addrStr}`, {
                    x: headerX,
                    y: headerStartY - lineHeight * 3,
                    size: fontSize - 1,
                    font,
                    color: rgb(0.2, 0.2, 0.2),
                });
            }
        }

        const modifiedBytes = await pdfDoc.save();
        const blob = new Blob([modifiedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        return { url, bytes: modifiedBytes };
    };

    // Open consent for viewing (with pre-fill)
    const openConsent = async (consent: ConsentItem) => {
        setCurrentConsent(consent);
        setPhase('preparing');

        try {
            const { url, bytes } = await prefillPdf(consent);
            setPrefilledPdfUrl(url);
            setPrefilledPdfBytes(bytes);
            setPhase('viewing');
        } catch (err) {
            console.error('PDF prefill error:', err);
            // Fallback — open without pre-fill
            setPrefilledPdfUrl(consent.file);
            setPhase('viewing');
        }
    };

    // Go to signing phase
    const goToSigning = () => {
        setPhase('signing');
        setHasDrawn(false);
    };

    // Submit signed consent
    const submitSignature = async () => {
        if (!canvasRef.current || !currentConsent) return;

        setSigning(true);
        try {
            // Get signature as PNG data URL
            const signatureDataUrl = canvasRef.current.toDataURL('image/png');

            // Use pre-filled PDF bytes or fetch original
            let pdfDoc: PDFDocument;
            if (prefilledPdfBytes) {
                pdfDoc = await PDFDocument.load(prefilledPdfBytes);
            } else {
                const pdfRes = await fetch(currentConsent.file);
                const pdfBytes = await pdfRes.arrayBuffer();
                pdfDoc = await PDFDocument.load(pdfBytes);
            }

            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];

            // Convert signature canvas to PNG for embedding
            const signatureImageBytes = await fetch(signatureDataUrl).then(r => r.arrayBuffer());
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

            // Place signature at bottom of last page
            const { width: pageWidth } = lastPage.getSize();
            const sigWidth = 200;
            const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
            lastPage.drawImage(signatureImage, {
                x: pageWidth / 2 - sigWidth / 2,
                y: 40,
                width: sigWidth,
                height: sigHeight,
            });

            // Save modified PDF
            const signedPdfBytes = await pdfDoc.save();

            // Convert to base64 in chunks (avoid stack overflow for large PDFs)
            const uint8 = new Uint8Array(signedPdfBytes);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8.length; i += chunkSize) {
                binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
            }
            const signedPdfBase64 = btoa(binary);

            // Upload
            const res = await fetch('/api/consents/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    consentType: currentConsent.type,
                    signedPdfBase64,
                    signatureDataUrl,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(`Błąd: ${data.error}`);
                setSigning(false);
                return;
            }

            // Clean up blob URL
            if (prefilledPdfUrl && prefilledPdfUrl.startsWith('blob:')) {
                URL.revokeObjectURL(prefilledPdfUrl);
            }
            setPrefilledPdfUrl(null);
            setPrefilledPdfBytes(null);

            // Mark as signed locally
            setConsents(prev =>
                prev.map(c => c.type === currentConsent.type ? { ...c, signed: true } : c)
            );
            setCurrentConsent(null);
            setPhase('list');
        } catch (err: any) {
            console.error('Sign error:', err);
            alert('Błąd podczas zapisywania podpisu');
        }
        setSigning(false);
    };

    const allSigned = consents.length > 0 && consents.every(c => c.signed);

    // ─── RENDER ─────────────────────────────────────

    if (phase === 'loading') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.spinner} />
                    <p style={styles.loadingText}>Ładowanie...</p>
                </div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h2 style={styles.title}>{error}</h2>
                    <p style={styles.subtitle}>Poproś personel o nowy link.</p>
                </div>
            </div>
        );
    }

    if (phase === 'preparing') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.spinner} />
                    <p style={styles.loadingText}>Przygotowuję dokument...</p>
                </div>
            </div>
        );
    }

    if (phase === 'viewing' && currentConsent && prefilledPdfUrl) {
        return (
            <div style={styles.container}>
                <div style={{ ...styles.card, maxWidth: '900px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h2 style={{ ...styles.title, margin: 0, fontSize: '1rem' }}>{currentConsent.label}</h2>
                        <button onClick={() => {
                            if (prefilledPdfUrl.startsWith('blob:')) URL.revokeObjectURL(prefilledPdfUrl);
                            setPrefilledPdfUrl(null);
                            setPrefilledPdfBytes(null);
                            setCurrentConsent(null);
                            setPhase('list');
                        }} style={styles.backBtn}>
                            ← Wróć
                        </button>
                    </div>

                    {/* Patient info banner */}
                    {patientDetails && (
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.08)',
                            borderRadius: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            marginBottom: '0.5rem',
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.7)',
                            display: 'flex',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            border: '1px solid rgba(56,189,248,0.12)',
                        }}>
                            <span>👤 <b style={{ color: '#fff' }}>{patientDetails.firstName} {patientDetails.lastName}</b></span>
                            {patientDetails.pesel && <span>🆔 {patientDetails.pesel}</span>}
                            <span>📅 {new Date().toLocaleDateString('pl-PL')}</span>
                        </div>
                    )}

                    <iframe
                        src={prefilledPdfUrl}
                        style={{ flex: 1, border: 'none', borderRadius: '0.5rem', background: '#fff' }}
                        title={currentConsent.label}
                    />
                    <button onClick={goToSigning} style={{ ...styles.primaryBtn, marginTop: '0.75rem' }}>
                        ✍️ Przejdź do podpisania
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'signing' && currentConsent) {
        return (
            <div style={styles.container}>
                <div style={{ ...styles.card, maxWidth: '600px', width: '90vw' }}>
                    <h2 style={{ ...styles.title, fontSize: '1.1rem' }}>Podpisz: {currentConsent.label}</h2>
                    <p style={styles.subtitle}>Złóż podpis palcem lub rysikiem poniżej</p>

                    <div style={{
                        border: '2px dashed rgba(56, 189, 248, 0.4)',
                        borderRadius: '0.75rem',
                        background: '#fff',
                        marginBottom: '1rem',
                        marginTop: '0.75rem',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            onTouchStart={startDraw}
                            onTouchMove={draw}
                            onTouchEnd={stopDraw}
                            style={{ cursor: 'crosshair', touchAction: 'none' }}
                        />
                        {!hasDrawn && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'rgba(0,0,0,0.2)', fontSize: '0.9rem', pointerEvents: 'none',
                            }}>
                                Podpisz tutaj
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={clearSignature}
                            style={{ ...styles.secondaryBtn, flex: 1 }}
                        >
                            🗑 Wyczyść
                        </button>
                        <button
                            onClick={() => { setPhase('viewing'); }}
                            style={{ ...styles.secondaryBtn, flex: 1 }}
                        >
                            ← Wróć do dokumentu
                        </button>
                    </div>

                    <button
                        onClick={submitSignature}
                        disabled={!hasDrawn || signing}
                        style={{
                            ...styles.primaryBtn,
                            marginTop: '0.75rem',
                            opacity: (!hasDrawn || signing) ? 0.5 : 1,
                        }}
                    >
                        {signing ? '⏳ Zapisuję...' : '✅ Podpisz i zatwierdź'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── LIST phase ─────────
    return (
        <div style={styles.container}>
            <div style={{ ...styles.card, maxWidth: '550px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🦷</div>
                    <h1 style={{ ...styles.title, fontSize: '1.3rem' }}>Mikrostomart</h1>
                    <p style={styles.subtitle}>Zgody do podpisania</p>
                </div>

                <div style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    border: '1px solid rgba(56, 189, 248, 0.15)',
                }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Pacjent</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{patientName}</div>
                    {patientDetails && (
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>
                            {patientDetails.pesel && `PESEL: ${patientDetails.pesel}`}
                            {patientDetails.birthDate && ` • ur. ${new Date(patientDetails.birthDate).toLocaleDateString('pl-PL')}`}
                        </div>
                    )}
                </div>

                {allSigned ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                        <h2 style={styles.title}>Wszystkie zgody podpisane!</h2>
                        <p style={styles.subtitle}>Dziękujemy. Możesz zwrócić tablet personelowi.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {consents.map(consent => (
                            <button
                                key={consent.type}
                                onClick={() => !consent.signed && openConsent(consent)}
                                disabled={consent.signed}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    background: consent.signed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.04)',
                                    border: consent.signed
                                        ? '1px solid rgba(34, 197, 94, 0.3)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '0.75rem',
                                    cursor: consent.signed ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    color: '#fff',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>
                                    {consent.signed ? '✅' : '📄'}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{consent.label}</div>
                                    <div style={{ fontSize: '0.72rem', color: consent.signed ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.4)' }}>
                                        {consent.signed ? 'Podpisano' : 'Wymaga podpisu'}
                                    </div>
                                </div>
                                {!consent.signed && (
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(56, 189, 248, 0.8)' }}>Otwórz →</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Styles ─────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    card: {
        background: 'rgba(20, 20, 35, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '1.25rem',
        border: '1px solid rgba(56, 189, 248, 0.12)',
        padding: '1.5rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        width: '90vw',
        maxWidth: '550px',
    },
    title: {
        color: '#fff',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        margin: '0 0 0.3rem',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.8rem',
        margin: 0,
    },
    loadingText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(56, 189, 248, 0.2)',
        borderTopColor: '#38bdf8',
        borderRadius: '50%',
        margin: '0 auto 1rem',
        animation: 'spin 0.8s linear infinite',
    },
    primaryBtn: {
        width: '100%',
        padding: '0.875rem',
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        border: 'none',
        borderRadius: '0.75rem',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        cursor: 'pointer',
    },
    secondaryBtn: {
        padding: '0.65rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '0.5rem',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    backBtn: {
        padding: '0.4rem 0.8rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '0.4rem',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.75rem',
        cursor: 'pointer',
    },
};
