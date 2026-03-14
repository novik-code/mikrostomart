'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { CONSENT_TYPES as HARDCODED_CONSENT_TYPES, ConsentType, CheckboxFieldPosition } from '@/lib/consentTypes';

/** Cache for the Inter font bytes so we only fetch it once */
let cachedFontBytes: ArrayBuffer | null = null;
async function getInterFont(): Promise<ArrayBuffer> {
    if (cachedFontBytes) return cachedFontBytes;
    const res = await fetch('/fonts/Inter-Variable.ttf');
    cachedFontBytes = await res.arrayBuffer();
    return cachedFontBytes;
}

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

type Phase = 'loading' | 'error' | 'list' | 'pick_doctor' | 'preparing' | 'viewing' | 'signing' | 'done';

// ── Biometric signature types ──
interface BiometricPoint {
    x: number;   // canvas X (px)
    y: number;   // canvas Y (px)
    t: number;   // relative timestamp (ms)
    p: number;   // pressure (0-1)
    tx: number;  // tiltX (-90 to 90)
    ty: number;  // tiltY (-90 to 90)
}

interface BiometricStroke {
    points: BiometricPoint[];
    startTime: number;
    endTime: number;
}

interface BiometricSignatureData {
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
}

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
    const [prefilledPdfBytes, setPrefilledPdfBytes] = useState<Uint8Array | null>(null);
    const [prefillOk, setPrefillOk] = useState(true);
    const [prefillError, setPrefillError] = useState<string | null>(null);

    // Consent types: loaded from DB (API), fallback to hardcoded
    const [CONSENT_TYPES, setConsentTypes] = useState<Record<string, ConsentType>>(HARDCODED_CONSENT_TYPES);

    // Doctor & procedure selection — per consent (key = consent type)
    const [staffSignatures, setStaffSignatures] = useState<any[]>([]);
    const [doctorPerConsent, setDoctorPerConsent] = useState<Record<string, number>>({});
    const [procedurePerConsent, setProcedurePerConsent] = useState<Record<string, string>>({});
    // Checkbox values per consent — key = consent_type, value = Record<checkboxKey, boolean>
    const [checkboxPerConsent, setCheckboxPerConsent] = useState<Record<string, Record<string, boolean>>>({});
    // Temporary state for the pick_doctor phase
    const [pickDoctorIdx, setPickDoctorIdx] = useState(0);
    const [pickProcedure, setPickProcedure] = useState('');
    const [pickCheckboxes, setPickCheckboxes] = useState<Record<string, boolean>>({});

    // PDF.js page rendering
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const [pdfPageCount, setPdfPageCount] = useState(0);

    // Canvas signature
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // Biometric data collection
    const biometricStrokesRef = useRef<BiometricStroke[]>([]);
    const currentStrokeRef = useRef<BiometricPoint[]>([]);
    const strokeStartTimeRef = useRef<number>(0);
    const sigStartTimeRef = useRef<number>(0);
    const detectedPointerTypeRef = useRef<string>('unknown');

    // Load consent types from DB on mount
    useEffect(() => {
        fetch('/api/admin/consent-mappings')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const mapped: Record<string, ConsentType> = {};
                    for (const row of data) {
                        mapped[row.consent_key] = {
                            label: row.label,
                            file: row.pdf_file,
                            fields: row.fields,
                        };
                    }
                    setConsentTypes(mapped);
                }
            })
            .catch(() => { /* keep hardcoded fallback */ });
    }, []);

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

    // Fetch staff signatures for doctor selection
    useEffect(() => {
        fetch('/api/staff-signatures')
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                const sigs = Array.isArray(data) ? data : (data?.signatures || []);
                setStaffSignatures(sigs);
            })
            .catch(() => { });
    }, []);

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

    // ── Drawing handlers (Pointer Events — biometric capture) ──
    const getPos = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const startDraw = (e: React.PointerEvent) => {
        e.preventDefault();
        // Capture the pointer so we get events even if finger moves outside canvas
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

        setIsDrawing(true);
        setHasDrawn(true);
        const pos = getPos(e);
        lastPointRef.current = pos;

        // Track pointer type (pen/touch/mouse)
        detectedPointerTypeRef.current = e.pointerType || 'unknown';

        // Start timing on first stroke
        if (biometricStrokesRef.current.length === 0) {
            sigStartTimeRef.current = performance.now();
        }

        // Start new stroke
        strokeStartTimeRef.current = performance.now();
        currentStrokeRef.current = [{
            x: pos.x,
            y: pos.y,
            t: Math.round(performance.now() - sigStartTimeRef.current),
            p: e.pressure ?? 0.5,
            tx: e.tiltX ?? 0,
            ty: e.tiltY ?? 0,
        }];
    };

    const draw = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !lastPointRef.current) return;
        const pos = getPos(e);

        // Dynamic line width based on pressure (1-5px)
        const pressure = e.pressure ?? 0.5;
        ctx.lineWidth = 1 + pressure * 4;

        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPointRef.current = pos;

        // Record biometric point
        currentStrokeRef.current.push({
            x: Math.round(pos.x * 10) / 10,
            y: Math.round(pos.y * 10) / 10,
            t: Math.round(performance.now() - sigStartTimeRef.current),
            p: Math.round(pressure * 1000) / 1000,
            tx: Math.round(e.tiltX ?? 0),
            ty: Math.round(e.tiltY ?? 0),
        });
    };

    const stopDraw = (e?: React.PointerEvent) => {
        if (isDrawing && currentStrokeRef.current.length > 0) {
            biometricStrokesRef.current.push({
                points: [...currentStrokeRef.current],
                startTime: Math.round(strokeStartTimeRef.current - sigStartTimeRef.current),
                endTime: Math.round(performance.now() - sigStartTimeRef.current),
            });
            currentStrokeRef.current = [];
        }
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
        // Reset biometric data
        biometricStrokesRef.current = [];
        currentStrokeRef.current = [];
        sigStartTimeRef.current = 0;
    };

    /** Build the final biometric signature JSON */
    const buildBiometricData = (): BiometricSignatureData => {
        const strokes = biometricStrokesRef.current;
        const allPoints = strokes.flatMap(s => s.points);
        const pressures = allPoints.map(p => p.p).filter(p => p > 0);
        const canvas = canvasRef.current;

        return {
            strokes,
            deviceInfo: {
                pointerType: detectedPointerTypeRef.current,
                userAgent: navigator.userAgent,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                canvasWidth: canvas?.width ?? 0,
                canvasHeight: canvas?.height ?? 0,
            },
            totalDuration: strokes.length > 0
                ? strokes[strokes.length - 1].endTime - strokes[0].startTime
                : 0,
            avgPressure: pressures.length > 0
                ? Math.round((pressures.reduce((a, b) => a + b, 0) / pressures.length) * 1000) / 1000
                : 0,
            maxPressure: pressures.length > 0
                ? Math.round(Math.max(...pressures) * 1000) / 1000
                : 0,
            pointCount: allPoints.length,
            signedAt: new Date().toISOString(),
        };
    };

    /**
     * Render PDF bytes to canvas elements using pdf.js (all pages stacked vertically).
     */
    const renderPdfToCanvases = useCallback(async (pdfBytes: Uint8Array) => {
        const container = pdfContainerRef.current;
        if (!container) return;

        // Clear previous canvases
        container.innerHTML = '';

        try {
            // Use pdfjs-dist legacy build for Safari/iOS compatibility
            // Legacy build avoids modern JS features (private fields, etc.) that break on Safari
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

            const pdf = await pdfjsLib.getDocument({
                data: pdfBytes,
                isEvalSupported: false,
            }).promise;
            setPdfPageCount(pdf.numPages);

            const containerWidth = container.clientWidth || 800;

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1 });
                // Use high scale for sharp rendering on tablets/retina
                const scale = Math.min((containerWidth * 2) / viewport.width, 3);
                const scaledViewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
                canvas.style.display = 'block';
                canvas.style.borderRadius = '0.5rem';
                canvas.style.background = '#fff';

                if (pageNum > 1) {
                    canvas.style.marginTop = '0.75rem';
                }

                // Page number label
                if (pdf.numPages > 1) {
                    const label = document.createElement('div');
                    label.textContent = `Strona ${pageNum} z ${pdf.numPages}`;
                    label.style.cssText = 'text-align:center;font-size:0.7rem;color:rgba(255,255,255,0.4);margin:0.3rem 0 0.2rem;';
                    container.appendChild(label);
                }

                container.appendChild(canvas);

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport } as any).promise;
                }
            }
        } catch (err: any) {
            console.error('PDF render error:', err);
            const errMsg = err?.message || err?.toString() || 'Nieznany błąd';
            container.innerHTML = `<div style="color:red;text-align:center;padding:1rem;"><p style="font-weight:bold;margin-bottom:0.5rem;">Nie udało się wyświetlić dokumentu</p><p style="font-size:0.75rem;color:#ff6b6b;word-break:break-all;">${errMsg}</p><button onclick="window.location.reload()" style="margin-top:0.75rem;padding:0.5rem 1.5rem;background:#f59e0b;color:#fff;border:none;border-radius:0.5rem;font-size:0.85rem;cursor:pointer;">🔄 Spróbuj ponownie</button></div>`;
        }
    }, []);

    /**
     * Pre-fill a PDF with patient data using pdf-lib.
     */
    const prefillPdf = async (consent: ConsentItem, overrideDoctorIdx?: number, overrideProcedure?: string, overrideCheckboxValues?: Record<string, boolean>): Promise<Uint8Array> => {
        const pdfRes = await fetch(consent.file);
        const pdfBytes = await pdfRes.arrayBuffer();

        const pdfDoc = await PDFDocument.load(pdfBytes);
        // Register fontkit and embed Inter (supports Polish characters)
        pdfDoc.registerFontkit(fontkit);
        const interFontBytes = await getInterFont();
        const font = await pdfDoc.embedFont(interFontBytes);
        const pages = pdfDoc.getPages();

        const getPage = (pageNum?: number) => pages[Math.min((pageNum || 1) - 1, pages.length - 1)];

        const today = new Date().toLocaleDateString('pl-PL');
        const fullName = patientDetails
            ? `${patientDetails.firstName} ${patientDetails.lastName}`
            : patientName;
        const pesel = patientDetails?.pesel || '';

        const consentType = CONSENT_TYPES[consent.type];
        const fields = consentType?.fields;

        if (fields) {
            const textColor = rgb(0.05, 0.05, 0.3);

            if (fields.name) {
                getPage(fields.name.page).drawText(fullName, {
                    x: fields.name.x, y: fields.name.y,
                    size: fields.name.fontSize || 11, font, color: textColor,
                });
            }

            if (fields.pesel && pesel) {
                const peselPage = getPage(fields.pesel.page);
                const peselSize = fields.pesel.fontSize || 9;
                const digits = pesel.split('');
                for (let i = 0; i < digits.length && i < 11; i++) {
                    const digitWidth = font.widthOfTextAtSize(digits[i], peselSize);
                    const digitX = fields.pesel.startX + (i * fields.pesel.boxWidth) + (fields.pesel.boxWidth - digitWidth) / 2;
                    peselPage.drawText(digits[i], {
                        x: digitX, y: fields.pesel.y,
                        size: peselSize, font, color: textColor,
                    });
                }
            }

            if (fields.date) {
                getPage(fields.date.page).drawText(today, {
                    x: fields.date.x, y: fields.date.y,
                    size: fields.date.fontSize || 11, font, color: textColor,
                });
            }

            if (fields.address && patientDetails?.address) {
                const addr = patientDetails.address;
                const addrStr = `${addr.street || ''} ${addr.houseNumber || ''}${addr.apartmentNumber ? '/' + addr.apartmentNumber : ''}, ${addr.postalCode || ''} ${addr.city || ''}`.trim();
                if (addrStr.length > 3) {
                    getPage(fields.address.page).drawText(addrStr, {
                        x: fields.address.x, y: fields.address.y,
                        size: fields.address.fontSize || 10, font, color: textColor,
                    });
                }
            }

            if (fields.city && patientDetails?.address?.city) {
                getPage(fields.city.page).drawText(patientDetails.address.city, {
                    x: fields.city.x, y: fields.city.y,
                    size: fields.city.fontSize || 11, font, color: textColor,
                });
            }

            if (fields.phone && patientDetails?.phone) {
                getPage(fields.phone.page).drawText(patientDetails.phone, {
                    x: fields.phone.x, y: fields.phone.y,
                    size: fields.phone.fontSize || 10, font, color: textColor,
                });
            }

            // Doctor name (per-consent) — use override if provided (avoids stale state)
            const consentDoctorIdx = overrideDoctorIdx ?? doctorPerConsent[consent.type] ?? 0;
            const selectedDoctor = staffSignatures[consentDoctorIdx];
            if (fields.doctor && selectedDoctor?.staff_name) {
                getPage(fields.doctor.page).drawText(selectedDoctor.staff_name, {
                    x: fields.doctor.x, y: fields.doctor.y,
                    size: fields.doctor.fontSize || 11, font, color: textColor,
                });
            }

            // Tooth / procedure text (per-consent) — use override if provided
            const consentProcedure = overrideProcedure ?? procedurePerConsent[consent.type] ?? '';
            if (fields.tooth && consentProcedure) {
                getPage(fields.tooth.page).drawText(consentProcedure, {
                    x: fields.tooth.x, y: fields.tooth.y,
                    size: fields.tooth.fontSize || 11, font, color: textColor,
                });
            }

            // Checkbox fields — draw ✓ or ✗ based on patient selection
            const overrideCheckboxes = overrideCheckboxValues ?? checkboxPerConsent[consent.type] ?? {};
            for (const [fKey, fVal] of Object.entries(fields)) {
                if (fVal && typeof fVal === 'object' && 'fieldType' in fVal && fVal.fieldType === 'checkbox') {
                    const cbField = fVal as CheckboxFieldPosition;
                    const isChecked = overrideCheckboxes[fKey] ?? false;
                    const mark = isChecked ? '✓' : '✗';
                    const markColor = isChecked ? rgb(0.05, 0.45, 0.15) : rgb(0.5, 0.1, 0.1);
                    getPage(cbField.page).drawText(mark, {
                        x: cbField.x, y: cbField.y,
                        size: cbField.fontSize || 14, font, color: markColor,
                    });
                }
            }
        }

        const modifiedBytes = await pdfDoc.save();
        return new Uint8Array(modifiedBytes);
    };

    // Render PDF when bytes change and we're viewing
    useEffect(() => {
        if (phase === 'viewing' && prefilledPdfBytes && pdfContainerRef.current) {
            renderPdfToCanvases(prefilledPdfBytes);
        }
    }, [phase, prefilledPdfBytes, renderPdfToCanvases]);

    // Helper: extract checkbox fields from consent type definition
    const getCheckboxFields = (consentType: string): { key: string; field: CheckboxFieldPosition }[] => {
        const ct = CONSENT_TYPES[consentType];
        if (!ct?.fields) return [];
        const result: { key: string; field: CheckboxFieldPosition }[] = [];
        for (const [fKey, fVal] of Object.entries(ct.fields)) {
            if (fVal && typeof fVal === 'object' && 'fieldType' in fVal && fVal.fieldType === 'checkbox') {
                result.push({ key: fKey, field: fVal as CheckboxFieldPosition });
            }
        }
        return result;
    };

    // Open consent — first go to doctor picker, then view
    const startConsentFlow = (consent: ConsentItem) => {
        setCurrentConsent(consent);
        // Pre-populate from previous selection if exists
        setPickDoctorIdx(doctorPerConsent[consent.type] ?? 0);
        setPickProcedure(procedurePerConsent[consent.type] ?? '');
        setPickCheckboxes(checkboxPerConsent[consent.type] ?? {});
        setPhase('pick_doctor');
    };

    // After doctor is picked, open consent for viewing (with pre-fill)
    const openConsent = async (consent: ConsentItem, overrideDoctorIdx?: number, overrideProcedure?: string, overrideCheckboxValues?: Record<string, boolean>) => {
        setPhase('preparing');
        setPrefillOk(true);
        setPrefillError(null);

        try {
            const bytes = await prefillPdf(consent, overrideDoctorIdx, overrideProcedure, overrideCheckboxValues);
            setPrefilledPdfBytes(bytes);
            setPrefillOk(true);
            setPhase('viewing');
        } catch (err: any) {
            console.error('PDF prefill error:', err);
            setPrefillOk(false);
            setPrefillError(err?.message || 'Nieznany błąd');
            // Fallback — load original without pre-fill
            try {
                const pdfRes = await fetch(consent.file);
                if (!pdfRes.ok) {
                    throw new Error(`PDF fetch failed: ${pdfRes.status} ${pdfRes.statusText} for ${consent.file}`);
                }
                const pdfBytes = await pdfRes.arrayBuffer();
                if (pdfBytes.byteLength < 100) {
                    throw new Error(`PDF file too small (${pdfBytes.byteLength} bytes) — likely not a valid PDF`);
                }
                setPrefilledPdfBytes(new Uint8Array(pdfBytes));
            } catch (fallbackErr: any) {
                console.error('PDF fallback fetch also failed:', fallbackErr);
                setPrefillError((err?.message || 'Prefill error') + ' | Fallback: ' + (fallbackErr?.message || 'unknown'));
            }
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

            // ── STEP 1: Load original PDF and re-apply prefill + signatures ──
            // Always load from the original file to avoid "No PDF header" parse errors
            const pdfRes = await fetch(currentConsent.file);
            const pdfBytes = await pdfRes.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Re-apply patient data (prefill) since we start from original
            pdfDoc.registerFontkit(fontkit);
            const interFontBytes = await getInterFont();
            const interFont = await pdfDoc.embedFont(interFontBytes);
            const today = new Date().toLocaleDateString('pl-PL');
            const fullName = patientDetails
                ? `${patientDetails.firstName} ${patientDetails.lastName}`
                : patientName;
            const pesel = patientDetails?.pesel || '';
            const textColor = rgb(0.05, 0.05, 0.3);
            const consentTypeDef2 = CONSENT_TYPES[currentConsent.type];
            const fields2 = consentTypeDef2?.fields;
            if (fields2) {
                const getPage2 = (p?: number) => pdfDoc.getPages()[Math.min((p || 1) - 1, pdfDoc.getPages().length - 1)];
                if (fields2.name) getPage2(fields2.name.page).drawText(fullName, { x: fields2.name.x, y: fields2.name.y, size: fields2.name.fontSize || 11, font: interFont, color: textColor });
                if (fields2.pesel && pesel) {
                    const peselPage = getPage2(fields2.pesel.page);
                    const peselSize = fields2.pesel.fontSize || 9;
                    pesel.split('').forEach((d: string, i: number) => {
                        if (i < 11) {
                            const dw = interFont.widthOfTextAtSize(d, peselSize);
                            peselPage.drawText(d, {
                                x: fields2.pesel!.startX + i * fields2.pesel!.boxWidth + (fields2.pesel!.boxWidth - dw) / 2,
                                y: fields2.pesel!.y,
                                size: peselSize, font: interFont, color: textColor,
                            });
                        }
                    });
                }
                if (fields2.date) getPage2(fields2.date.page).drawText(today, { x: fields2.date.x, y: fields2.date.y, size: fields2.date.fontSize || 11, font: interFont, color: textColor });
                if (fields2.address && patientDetails?.address) {
                    const a = patientDetails.address;
                    const s = `${a.street || ''} ${a.houseNumber || ''}${a.apartmentNumber ? '/' + a.apartmentNumber : ''}, ${a.postalCode || ''} ${a.city || ''}`.trim();
                    if (s.length > 3) getPage2(fields2.address.page).drawText(s, { x: fields2.address.x, y: fields2.address.y, size: fields2.address.fontSize || 10, font: interFont, color: textColor });
                }
                if (fields2.city && patientDetails?.address?.city) getPage2(fields2.city.page).drawText(patientDetails.address.city, { x: fields2.city.x, y: fields2.city.y, size: fields2.city.fontSize || 11, font: interFont, color: textColor });
                if (fields2.phone && patientDetails?.phone) getPage2(fields2.phone.page).drawText(patientDetails.phone, { x: fields2.phone.x, y: fields2.phone.y, size: fields2.phone.fontSize || 10, font: interFont, color: textColor });
                // Doctor name (per-consent)
                const selDocIdx2 = doctorPerConsent[currentConsent.type] ?? 0;
                const selDoc = staffSignatures[selDocIdx2];
                if (fields2.doctor && selDoc?.staff_name) getPage2(fields2.doctor.page).drawText(selDoc.staff_name, { x: fields2.doctor.x, y: fields2.doctor.y, size: fields2.doctor.fontSize || 11, font: interFont, color: textColor });
                // Tooth / procedure (per-consent)
                const procText2 = procedurePerConsent[currentConsent.type] ?? '';
                if (fields2.tooth && procText2) getPage2(fields2.tooth.page).drawText(procText2, { x: fields2.tooth.x, y: fields2.tooth.y, size: fields2.tooth.fontSize || 11, font: interFont, color: textColor });
                // Checkbox fields (re-apply from saved state)
                const savedCheckboxes2 = checkboxPerConsent[currentConsent.type] ?? {};
                for (const [fKey2, fVal2] of Object.entries(fields2)) {
                    if (fVal2 && typeof fVal2 === 'object' && 'fieldType' in fVal2 && fVal2.fieldType === 'checkbox') {
                        const cbField2 = fVal2 as CheckboxFieldPosition;
                        const isChecked2 = savedCheckboxes2[fKey2] ?? false;
                        const mark2 = isChecked2 ? '✓' : '✗';
                        const markColor2 = isChecked2 ? rgb(0.05, 0.45, 0.15) : rgb(0.5, 0.1, 0.1);
                        getPage2(cbField2.page).drawText(mark2, {
                            x: cbField2.x, y: cbField2.y,
                            size: cbField2.fontSize || 14, font: interFont, color: markColor2,
                        });
                    }
                }
            }

            const pages = pdfDoc.getPages();
            const consentTypeDef = CONSENT_TYPES[currentConsent.type];
            const fields = consentTypeDef?.fields;

            // ── STEP 2: Embed patient signature ──
            const signatureImageBytes = await fetch(signatureDataUrl).then(r => r.arrayBuffer());
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

            const patSigPos = fields?.patient_signature;
            const patSigPageIdx = Math.min((patSigPos?.page || pages.length) - 1, pages.length - 1);
            const patSigPage = pages[patSigPageIdx];
            const sigWidth = 150;
            const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;

            if (patSigPos) {
                patSigPage.drawImage(signatureImage, {
                    x: patSigPos.x,
                    y: patSigPos.y - sigHeight,
                    width: sigWidth,
                    height: sigHeight,
                });
            } else {
                const { width: pageWidth } = patSigPage.getSize();
                patSigPage.drawImage(signatureImage, {
                    x: pageWidth / 2 - sigWidth / 2,
                    y: 40,
                    width: sigWidth,
                    height: sigHeight,
                });
            }

            // ── STEP 3: Doctor signature (from per-consent selected staff) ──
            const docSigPos = fields?.doctor_signature;
            if (docSigPos) {
                const activeSig = staffSignatures[doctorPerConsent[currentConsent.type] ?? 0];
                if (activeSig?.signature_data) {
                    try {
                        const docSigBytes = await fetch(activeSig.signature_data).then(r => r.arrayBuffer());
                        const docSigImage = await pdfDoc.embedPng(docSigBytes);
                        const docSigPageIdx = Math.min((docSigPos.page || 1) - 1, pages.length - 1);
                        const docSigPage = pages[docSigPageIdx];
                        const docSigWidth = 120;
                        const docSigHeight = (docSigImage.height / docSigImage.width) * docSigWidth;
                        docSigPage.drawImage(docSigImage, {
                            x: docSigPos.x,
                            y: docSigPos.y - docSigHeight,
                            width: docSigWidth,
                            height: docSigHeight,
                        });
                    } catch (e) {
                        console.warn('Could not embed doctor signature:', e);
                    }
                }
            }

            // ── STEP 4: Save and upload ──
            const signedPdfBytes = await pdfDoc.save();

            const uint8 = new Uint8Array(signedPdfBytes);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8.length; i += chunkSize) {
                binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
            }
            const signedPdfBase64 = btoa(binary);

            // Build biometric data before sending
            const biometricData = buildBiometricData();

            const res = await fetch('/api/consents/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    consentType: currentConsent.type,
                    signedPdfBase64,
                    signatureDataUrl,
                    biometricData,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(`Błąd: ${data.error}`);
                setSigning(false);
                return;
            }

            setPrefilledPdfBytes(null);

            // Mark as signed locally
            setConsents(prev =>
                prev.map(c => c.type === currentConsent.type ? { ...c, signed: true } : c)
            );
            setCurrentConsent(null);
            setPhase('list');
        } catch (err: any) {
            console.error('Sign error:', err);
            alert('Błąd podczas zapisywania podpisu: ' + (err?.message || 'Nieznany błąd'));
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

    // ─── PICK DOCTOR phase (per-consent) ─────────
    if (phase === 'pick_doctor' && currentConsent) {
        return (
            <div style={styles.container}>
                <div style={{ ...styles.card, maxWidth: '550px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>📋</div>
                        <h2 style={{ ...styles.title, fontSize: '1.1rem', margin: 0 }}>{currentConsent.label}</h2>
                    </div>

                    {/* Doctor selection */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 1rem',
                        marginBottom: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>🩺 Lekarz prowadzący</div>
                        {staffSignatures.length > 0 ? (
                            <select
                                value={pickDoctorIdx}
                                onChange={e => setPickDoctorIdx(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    background: 'rgba(20, 20, 35, 0.9)',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {staffSignatures.map((sig: any, idx: number) => (
                                    <option key={sig.id || idx} value={idx}>
                                        {sig.staff_name}{sig.role ? ` (${sig.role})` : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,150,50,0.8)' }}>
                                Brak zapisanych podpisów lekarzy. Dodaj w panelu admin.
                            </div>
                        )}
                    </div>

                    {/* Procedure / tooth text */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>🦷 Procedura / ząb (opcjonalnie)</div>
                        <input
                            type="text"
                            value={pickProcedure}
                            onChange={e => setPickProcedure(e.target.value)}
                            placeholder="np. ząb 36, implant, etc."
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                background: 'rgba(20, 20, 35, 0.9)',
                                color: '#fff',
                                fontSize: '0.9rem',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Checkbox fields (TAK / NIE) */}
                    {currentConsent && (() => {
                        const cbFields = getCheckboxFields(currentConsent.type);
                        if (cbFields.length === 0) return null;
                        // Group by mutexGroup
                        const groups: Record<string, typeof cbFields> = {};
                        const standalone: typeof cbFields = [];
                        for (const cb of cbFields) {
                            if (cb.field.mutexGroup) {
                                if (!groups[cb.field.mutexGroup]) groups[cb.field.mutexGroup] = [];
                                groups[cb.field.mutexGroup].push(cb);
                            } else {
                                standalone.push(cb);
                            }
                        }
                        return (
                            <div style={{
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: '0.75rem',
                                padding: '0.75rem 1rem',
                                marginBottom: '1rem',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>☑️ Ankieta — zaznacz odpowiedzi</div>
                                {/* Mutex groups (radio-like) */}
                                {Object.entries(groups).map(([groupName, groupCbs]) => (
                                    <div key={groupName} style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            {groupName}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {groupCbs.map(cb => {
                                                const isChecked = pickCheckboxes[cb.key] ?? false;
                                                return (
                                                    <button
                                                        key={cb.key}
                                                        onClick={() => {
                                                            setPickCheckboxes(prev => {
                                                                const next = { ...prev };
                                                                // Uncheck others in same group
                                                                for (const other of groupCbs) {
                                                                    next[other.key] = false;
                                                                }
                                                                next[cb.key] = true;
                                                                return next;
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '0.45rem 0.85rem',
                                                            borderRadius: '0.5rem',
                                                            border: isChecked ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                                                            background: isChecked ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                                                            color: isChecked ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                                                            fontSize: '0.82rem',
                                                            fontWeight: isChecked ? 'bold' : 'normal',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        {isChecked ? '✓ ' : '○ '}{cb.field.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {/* Standalone checkboxes */}
                                {standalone.map(cb => {
                                    const isChecked = pickCheckboxes[cb.key] ?? false;
                                    return (
                                        <button
                                            key={cb.key}
                                            onClick={() => {
                                                setPickCheckboxes(prev => ({
                                                    ...prev,
                                                    [cb.key]: !prev[cb.key],
                                                }));
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.45rem 0.85rem',
                                                borderRadius: '0.5rem',
                                                border: isChecked ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                                                background: isChecked ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                                                color: isChecked ? '#22c55e' : 'rgba(255,255,255,0.7)',
                                                fontSize: '0.82rem',
                                                fontWeight: isChecked ? 'bold' : 'normal',
                                                cursor: 'pointer',
                                                marginBottom: '0.3rem',
                                                width: '100%',
                                                textAlign: 'left',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{ fontSize: '1rem' }}>{isChecked ? '☑️' : '☐'}</span>
                                            {cb.field.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    <button
                        onClick={() => {
                            // Save doctor + procedure + checkboxes for this consent
                            setDoctorPerConsent(prev => ({ ...prev, [currentConsent.type]: pickDoctorIdx }));
                            setProcedurePerConsent(prev => ({ ...prev, [currentConsent.type]: pickProcedure }));
                            setCheckboxPerConsent(prev => ({ ...prev, [currentConsent.type]: pickCheckboxes }));
                            // Pass values directly to avoid React stale-state race
                            openConsent(currentConsent, pickDoctorIdx, pickProcedure, pickCheckboxes);
                        }}
                        style={{ ...styles.primaryBtn, fontSize: '0.95rem', padding: '0.875rem' }}
                    >
                        📄 Otwórz dokument →
                    </button>

                    <button
                        onClick={() => {
                            setCurrentConsent(null);
                            setPhase('list');
                        }}
                        style={{ ...styles.secondaryBtn, marginTop: '0.5rem', width: '100%' }}
                    >
                        ← Wróć do listy
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'viewing' && currentConsent) {
        return (
            <div style={{ ...styles.container, flexDirection: 'column', alignItems: 'stretch', padding: 0 }}>
                {/* Header bar - always visible at top */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 10,
                    background: 'rgba(20, 20, 35, 0.98)',
                    borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                    padding: '0.5rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    backdropFilter: 'blur(10px)',
                }}>
                    <h2 style={{ ...styles.title, margin: 0, fontSize: '0.95rem' }}>{currentConsent.label}</h2>
                    <button onClick={() => {
                        setPrefilledPdfBytes(null);
                        setCurrentConsent(null);
                        setPhase('list');
                    }} style={styles.backBtn}>
                        ← Wróć
                    </button>
                </div>

                {/* Warning if prefill failed */}
                {!prefillOk && (
                    <div style={{
                        background: 'rgba(255, 150, 50, 0.15)',
                        border: '1px solid rgba(255, 150, 50, 0.4)',
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        color: '#ffaa44',
                        textAlign: 'center',
                    }}>
                        ⚠️ Dane pacjenta nie zostały wstawione — {prefillError || 'błąd prefill'}.
                        Podpis nadal można złożyć.
                    </div>
                )}

                {/* Patient info banner */}
                {patientDetails && (
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        padding: '0.35rem 1rem',
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        borderBottom: '1px solid rgba(56,189,248,0.1)',
                    }}>
                        <span>👤 <b style={{ color: '#fff' }}>{patientDetails.firstName} {patientDetails.lastName}</b></span>
                        {patientDetails.pesel && <span>🆔 {patientDetails.pesel}</span>}
                        <span>📅 {new Date().toLocaleDateString('pl-PL')}</span>
                    </div>
                )}

                {/* PDF pages rendered via pdf.js canvases — scrollable area */}
                <div
                    ref={pdfContainerRef}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                >
                    <div style={styles.spinner} />
                    <p style={styles.loadingText}>Renderuję dokument...</p>
                </div>

                {/* Footer bar — ALWAYS visible at bottom */}
                <div style={{
                    position: 'sticky', bottom: 0, zIndex: 10,
                    background: 'rgba(20, 20, 35, 0.98)',
                    borderTop: '1px solid rgba(56, 189, 248, 0.15)',
                    padding: '0.75rem 1rem',
                    backdropFilter: 'blur(10px)',
                }}>
                    {pdfPageCount > 1 && (
                        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem' }}>
                            Przewiń aby zobaczyć {pdfPageCount} stron(y)
                        </div>
                    )}
                    <button onClick={goToSigning} style={{ ...styles.primaryBtn, fontSize: '1rem', padding: '1rem' }}>
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
                            onPointerDown={startDraw}
                            onPointerMove={draw}
                            onPointerUp={stopDraw}
                            onPointerLeave={stopDraw}
                            onPointerCancel={stopDraw}
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

                {/* Per-consent doctor info hint */}
                {staffSignatures.length > 0 && (
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.06)',
                        borderRadius: '0.75rem',
                        padding: '0.6rem 1rem',
                        marginBottom: '0.75rem',
                        border: '1px solid rgba(56, 189, 248, 0.12)',
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                    }}>
                        🩺 Przy każdej zgodzie wybierzesz lekarza prowadzącego
                    </div>
                )}

                {allSigned && (
                    <div style={{ textAlign: 'center', padding: '1rem 0', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>✅</div>
                        <p style={{ ...styles.subtitle, fontSize: '0.75rem' }}>Wszystkie zgody podpisane. Możesz podpisać ponownie klikając poniżej.</p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {consents.map(consent => (
                        <button
                            key={consent.type}
                            onClick={() => startConsentFlow(consent)}
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
                                cursor: 'pointer',
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
                                    {consent.signed ? 'Podpisano ✓ (kliknij aby podpisać ponownie)' : 'Wymaga podpisu'}
                                </div>
                                {doctorPerConsent[consent.type] !== undefined && staffSignatures[doctorPerConsent[consent.type]] && (
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(56,189,248,0.7)', marginTop: '0.15rem' }}>
                                        🩺 {staffSignatures[doctorPerConsent[consent.type]].staff_name}
                                        {procedurePerConsent[consent.type] ? ` • 🦷 ${procedurePerConsent[consent.type]}` : ''}
                                    </div>
                                )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(56, 189, 248, 0.8)' }}>Otwórz →</span>
                        </button>
                    ))}
                </div>
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
