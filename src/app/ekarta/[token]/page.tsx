"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { demoSanitize } from '@/lib/brandConfig';

// ─── Types ────────────────────────────────────────────────
interface TokenData {
    valid: boolean;
    reason?: string;
    prefill?: { firstName: string; lastName: string };
    prodentisPatientId?: string;
    appointmentType?: string;
    appointmentDate?: string;
    expiresAt?: string;
}

interface MedicalSurvey {
    // Ogólne
    feelsHealthy: boolean;           // Czy czuje się zdrowy?
    hospitalLast2Years: boolean;     // Szpital w ciągu 2 lat?
    hospitalReason: string;
    currentlyTreated: boolean;       // Obecnie leczy się?
    currentTreatment: string;
    takesMedication: boolean;        // Przyjmuje leki?
    medications: string;
    hasAllergies: boolean;           // Uczulenia?
    allergies: string;

    // Skłonności
    bleedingTendency: boolean;       // Skłonność do krwawień
    faintingEpisodes: boolean;       // Omdlenia/utrata przytomności
    hasPacemaker: boolean;           // Rozrusznik serca

    // Choroby (dokładnie z karty)
    heartDiseases: boolean;          // Choroby serca (zawał, wieńcowa, wady, zaburzenia rytmu)
    circulatoryDiseases: boolean;    // Układ krążenia (nadciśnienie, omdlenia, duszności)
    vascularDiseases: boolean;       // Choroby naczyń (żylaki, zapalenie żył)
    lungDiseases: boolean;           // Choroby płuc (rozedma, astma, zapalenie oskrzeli, gruźlica)
    digestiveDiseases: boolean;      // Układ pokarmowy (wrzody, choroby jelit)
    liverDiseases: boolean;          // Choroby wątroby (kamica, żółtaczka, marskość)
    urinaryDiseases: boolean;        // Układ moczowy (zapalenie nerek, kamica)
    metabolicDiseases: boolean;      // Zaburzenia przemiany materii (cukrzyca, dna)
    thyroidDiseases: boolean;        // Choroby tarczycy
    neurologicalDiseases: boolean;   // Układ nerwowy (padaczka, niedowłady, miastenia)
    musculoskeletalDiseases: boolean; // Układ kostno-stawowy (zwyrodnienia, złamania)
    bloodDiseases: boolean;          // Choroby krwi (hemofilia, anemia, krwawienia)
    eyeDiseases: boolean;            // Choroby oczu (jaskra)
    moodDisorders: boolean;          // Zmiany nastroju (depresja, nerwica)

    // Choroby zakaźne
    infectiousDisease: boolean;
    hepatitisA: boolean;
    hepatitisB: boolean;
    hepatitisC: boolean;
    aids: boolean;
    tuberculosis: boolean;
    std: boolean;

    // Inne
    rheumaticDisease: boolean;       // Choroba reumatyczna
    osteoporosis: boolean;           // Osteoporoza
    otherDiseases: string;           // Inne dolegliwości
    lastBloodPressure: string;       // Ostatni pomiar ciśnienia

    // Historia medyczna
    hadSurgery: boolean;             // Operowany?
    surgeryDetails: string;
    toleratedAnesthesia: boolean;    // Dobrze zniósł znieczulenie?
    hadBloodTransfusion: boolean;    // Przetaczana krew?
    transfusionDetails: string;

    // Używki
    smoker: boolean;                 // Pali tytoń?
    smokingDetails: string;
    drinksAlcohol: string;           // TAK/NIE/OKAZJONALNIE
    takesSedatives: boolean;         // Środki uspokajające/narkotyki?
    sedativesDetails: string;

    // Kobiety
    isPregnant: boolean;
    pregnancyMonth: string;
    lastPeriod: string;
    usesContraceptives: boolean;     // Doustne antykoncepcyjne
}

interface FormData {
    firstName: string;
    lastName: string;
    middleName: string;
    maidenName: string;
    pesel: string;
    birthDate: string;
    gender: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    medicalSurvey: MedicalSurvey;
    rodoConsent: boolean;
    contactConsent: boolean;
    marketingConsent: boolean;
    signatureData: string;
}

const defaultSurvey: MedicalSurvey = {
    feelsHealthy: true, hospitalLast2Years: false, hospitalReason: '',
    currentlyTreated: false, currentTreatment: '', takesMedication: false, medications: '',
    hasAllergies: false, allergies: '', bleedingTendency: false, faintingEpisodes: false,
    hasPacemaker: false, heartDiseases: false, circulatoryDiseases: false, vascularDiseases: false,
    lungDiseases: false, digestiveDiseases: false, liverDiseases: false, urinaryDiseases: false,
    metabolicDiseases: false, thyroidDiseases: false, neurologicalDiseases: false,
    musculoskeletalDiseases: false, bloodDiseases: false, eyeDiseases: false, moodDisorders: false,
    infectiousDisease: false, hepatitisA: false, hepatitisB: false, hepatitisC: false,
    aids: false, tuberculosis: false, std: false, rheumaticDisease: false,
    osteoporosis: false, otherDiseases: '', lastBloodPressure: '',
    hadSurgery: false, surgeryDetails: '', toleratedAnesthesia: true,
    hadBloodTransfusion: false, transfusionDetails: '',
    smoker: false, smokingDetails: '', drinksAlcohol: 'NIE',
    takesSedatives: false, sedativesDetails: '',
    isPregnant: false, pregnancyMonth: '', lastPeriod: '', usesContraceptives: false,
};

const defaultForm: FormData = {
    firstName: "", lastName: "", middleName: "", maidenName: "",
    pesel: "", birthDate: "", gender: "", street: "", postalCode: "",
    city: "", phone: "", email: "",
    medicalSurvey: { ...defaultSurvey },
    rodoConsent: false, contactConsent: true, marketingConsent: false,
    signatureData: "",
};

// ─── PESEL validation ────────────────────────────────────
function validatePesel(pesel: string): { valid: boolean; error?: string; birthDate?: string; gender?: string } {
    if (!pesel) return { valid: true }; // empty = optional
    if (pesel.length < 11) return { valid: false, error: 'PESEL musi mieć 11 cyfr' };
    if (!/^\d{11}$/.test(pesel)) return { valid: false, error: 'PESEL może zawierać tylko cyfry' };

    // Checksum (weights: 1,3,7,9,1,3,7,9,1,3)
    const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    const digits = pesel.split('').map(Number);
    const sum = w.reduce((acc, weight, i) => acc + weight * digits[i], 0);
    const checksum = (10 - (sum % 10)) % 10;
    if (checksum !== digits[10]) return { valid: false, error: 'Nieprawidłowa suma kontrolna PESEL' };

    // Extract birth date (century offsets: 00-12=1900s, 20-32=2000s, 40-52=2100s, 60-72=2200s, 80-92=1800s)
    const yy = digits[0] * 10 + digits[1];
    const mm = digits[2] * 10 + digits[3];
    const dd = digits[4] * 10 + digits[5];
    let century: number, month: number;
    if (mm >= 1 && mm <= 12) { century = 1900; month = mm; }
    else if (mm >= 21 && mm <= 32) { century = 2000; month = mm - 20; }
    else if (mm >= 41 && mm <= 52) { century = 2100; month = mm - 40; }
    else if (mm >= 61 && mm <= 72) { century = 2200; month = mm - 60; }
    else if (mm >= 81 && mm <= 92) { century = 1800; month = mm - 80; }
    else return { valid: false, error: 'Nieprawidłowy miesiąc w PESEL' };

    const year = century + yy;
    const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

    // Validate date is real
    const d = new Date(birthDate);
    if (isNaN(d.getTime()) || d.getMonth() + 1 !== month || d.getDate() !== dd) {
        return { valid: false, error: 'Nieprawidłowa data urodzenia w PESEL' };
    }

    // Gender (10th digit: even=F, odd=M)
    const gender = digits[9] % 2 === 0 ? 'F' : 'M';

    return { valid: true, birthDate, gender };
}

// ─── Styles ──────────────────────────────────────────────
const S = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #1a2840 50%, #0a1628 100%)", fontFamily: "'Inter', -apple-system, sans-serif", padding: "1rem", color: "#e2e8f0" } as React.CSSProperties,
    card: { maxWidth: 640, margin: "0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" } as React.CSSProperties,
    body: { padding: "1.5rem" } as React.CSSProperties,
    label: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
    input: { width: "100%", padding: "0.7rem 0.9rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: "1rem", outline: "none", boxSizing: "border-box" as const, WebkitAppearance: "none" as any },
    checkRow: { display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", marginBottom: "0.5rem", cursor: "pointer" } as React.CSSProperties,
    primaryBtn: { width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)", border: "none", borderRadius: "0.6rem", color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", marginTop: "1.5rem" } as React.CSSProperties,
    secondaryBtn: { padding: "0.7rem 1.25rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: "0.9rem", cursor: "pointer" } as React.CSSProperties,
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" } as React.CSSProperties,
    sectionTitle: { fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "1.5rem 0 0.75rem" } as React.CSSProperties,
    yesNoRow: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.9rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", marginBottom: "0.4rem", fontSize: "0.9rem" } as React.CSSProperties,
    condInput: { width: "100%", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "0.4rem", color: "#e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const, marginTop: "0.35rem" } as React.CSSProperties,
};

// ─── YesNo Question ─────────────────────────────────────
function YesNo({ label, value, onChange, children }: {
    label: string; value: boolean; onChange: (v: boolean) => void; children?: React.ReactNode;
}) {
    return (
        <div>
            <div style={S.yesNoRow}>
                <span style={{ flex: 1, lineHeight: 1.4 }}>{label}</span>
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    {[true, false].map(v => (
                        <button key={String(v)} onClick={() => onChange(v)}
                            style={{
                                padding: '0.3rem 0.65rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                border: value === v ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                background: value === v ? (v ? '#ef4444' : '#22c55e') : 'rgba(255,255,255,0.05)',
                                color: value === v ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}>
                            {v ? 'TAK' : 'NIE'}
                        </button>
                    ))}
                </div>
            </div>
            {value && children && <div style={{ padding: '0 0.9rem 0.5rem' }}>{children}</div>}
        </div>
    );
}

// ─── Checkbox ────────────────────────────────────────────
function Check({ label, checked, onChange, sub }: { label: string; checked: boolean; onChange: () => void; sub?: string }) {
    return (
        <div style={S.checkRow} onClick={onChange}>
            <div style={{ width: 22, height: 22, borderRadius: 5, border: checked ? "none" : "2px solid rgba(56,189,248,0.4)", background: checked ? "#38bdf8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", marginTop: 1 }}>
                {checked && <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: "bold" }}>✓</span>}
            </div>
            <div>
                <span style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>{label}</span>
                {sub && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>{sub}</div>}
            </div>
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────
export default function EKartaPage() {
    const params = useParams();
    const token = params?.token as string;
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [peselError, setPeselError] = useState<string | null>(null);
    const [peselAutoFilled, setPeselAutoFilled] = useState(false);
    const sigCanvas = useRef<HTMLCanvasElement>(null);
    const sigContainer = useRef<HTMLDivElement>(null);
    const [drawing, setDrawing] = useState(false);

    // PESEL handler — validates and auto-fills birthDate + gender
    const handlePeselChange = (raw: string) => {
        const pesel = raw.replace(/\D/g, '').slice(0, 11);
        setForm(f => ({ ...f, pesel }));
        if (pesel.length === 0) { setPeselError(null); setPeselAutoFilled(false); return; }
        if (pesel.length < 11) { setPeselError(null); setPeselAutoFilled(false); return; }
        const result = validatePesel(pesel);
        if (!result.valid) { setPeselError(result.error || 'Nieprawidłowy PESEL'); setPeselAutoFilled(false); return; }
        setPeselError(null);
        if (result.birthDate || result.gender) {
            setPeselAutoFilled(true);
            setForm(f => ({
                ...f,
                pesel,
                birthDate: result.birthDate || f.birthDate,
                gender: result.gender || f.gender,
            }));
        }
    };

    // Verify token
    useEffect(() => {
        if (!token) return;
        fetch(`/api/intake/verify/${token}`)
            .then(r => r.json())
            .then(data => {
                setTokenData(data);
                if (data.valid && data.prefill) {
                    setForm(f => ({ ...f, firstName: data.prefill.firstName, lastName: data.prefill.lastName }));
                }
            })
            .catch(() => setTokenData({ valid: false, reason: 'error' }))
            .finally(() => setLoading(false));
    }, [token]);

    // ─── Signature canvas — resize to container width ───
    const initCanvas = useCallback(() => {
        const canvas = sigCanvas.current;
        const container = sigContainer.current;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = 160 * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = '160px';
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
    }, []);

    useEffect(() => {
        if (step === 3) {
            setTimeout(initCanvas, 50);
            window.addEventListener('resize', initCanvas);
            return () => window.removeEventListener('resize', initCanvas);
        }
    }, [step, initCanvas]);

    const getPos = (e: React.TouchEvent | React.MouseEvent) => {
        const c = sigCanvas.current!;
        const rect = c.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };
    const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        setDrawing(true);
        const ctx = sigCanvas.current!.getContext('2d')!;
        const pos = getPos(e);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    };
    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!drawing) return;
        e.preventDefault();
        const ctx = sigCanvas.current!.getContext('2d')!;
        const pos = getPos(e);
        ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#38bdf8';
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
    };
    const endDraw = () => {
        setDrawing(false);
        const c = sigCanvas.current;
        if (c) setForm(f => ({ ...f, signatureData: c.toDataURL() }));
    };
    const clearSig = () => {
        const c = sigCanvas.current;
        if (c) { const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, c.width, c.height); }
        setForm(f => ({ ...f, signatureData: '' }));
    };

    const sv = form.medicalSurvey;
    const setSv = (key: keyof MedicalSurvey, value: any) =>
        setForm(f => ({ ...f, medicalSurvey: { ...f.medicalSurvey, [key]: value } }));

    const handleSubmit = async () => {
        if (!form.rodoConsent) { setError('Zgoda na przetwarzanie danych jest wymagana.'); return; }
        setSubmitting(true); setError(null);
        try {
            const res = await fetch('/api/intake/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, formData: form }),
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Błąd wysyłki.'); }
            else { setSubmitted(true); }
        } catch { setError('Błąd połączenia.'); }
        finally { setSubmitting(false); }
    };

    // ── Loading
    if (loading) return (
        <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(56,189,248,0.3)', borderTop: '3px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>Weryfikacja...</p>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    );

    // ── Invalid token
    if (!tokenData?.valid) {
        const msgs: Record<string, string> = { already_used: 'Ten link został już wykorzystany. Poproś recepcję o nowy.', expired: 'Ten link wygasł. Poproś recepcję o nowy.', not_found: 'Nieprawidłowy link.' };
        return (
            <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ ...S.card, maxWidth: 400, padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Link nieważny</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{msgs[tokenData?.reason || ''] || 'Wystąpił błąd.'}</p>
                </div>
            </div>
        );
    }

    // ── Submitted
    if (submitted) return (
        <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ ...S.card, maxWidth: 400, padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ color: '#4ade80', marginBottom: '0.75rem', fontSize: '1.5rem' }}>Dziękujemy!</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>Twoje dane zostały zapisane.<br />Możesz oddać tablet recepcji.</p>
            </div>
        </div>
    );

    // ─────────── FORM ──────────────
    return (
        <div style={S.page}>
            {/* Header */}
            <div style={{ maxWidth: 640, margin: '0 auto 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🦷</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Mikrostomart</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Informacja dotycząca stanu zdrowia pacjenta</div>
                    </div>
                </div>
                {/* Progress */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                    {['Dane osobowe', 'Stan zdrowia', 'Zgody i podpis'].map((label, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ height: 4, borderRadius: 2, background: step > i + 1 ? '#38bdf8' : step === i + 1 ? 'rgba(56,189,248,0.8)' : 'rgba(255,255,255,0.1)', marginBottom: '0.3rem' }} />
                            <div style={{ fontSize: '0.65rem', color: step === i + 1 ? '#38bdf8' : 'rgba(255,255,255,0.35)' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={S.card}>
                <div style={S.body}>

                    {/* ═══ STEP 1 — DANE OSOBOWE ═══ */}
                    {step === 1 && (
                        <>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: 600 }}>Dane osobowe</h2>
                            <div style={S.grid2}>
                                <div><label style={S.label}>Imię *</label><input style={S.input} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jan" /></div>
                                <div><label style={S.label}>Nazwisko *</label><input style={S.input} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Kowalski" /></div>
                            </div>
                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div><label style={S.label}>Drugie imię</label><input style={S.input} value={form.middleName} onChange={e => setForm(f => ({ ...f, middleName: e.target.value }))} /></div>
                                <div><label style={S.label}>Nazwisko rodowe</label><input style={S.input} value={form.maidenName} onChange={e => setForm(f => ({ ...f, maidenName: e.target.value }))} /></div>
                            </div>
                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div>
                                    <label style={S.label}>PESEL</label>
                                    <input
                                        style={{ ...S.input, borderColor: peselError ? '#ef4444' : form.pesel.length === 11 && !peselError ? '#22c55e' : undefined }}
                                        value={form.pesel}
                                        onChange={e => handlePeselChange(e.target.value)}
                                        placeholder="12345678901"
                                        inputMode="numeric"
                                    />
                                    {peselError && <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.25rem' }}>⚠ {peselError}</div>}
                                    {peselAutoFilled && !peselError && <div style={{ color: '#22c55e', fontSize: '0.72rem', marginTop: '0.25rem' }}>✓ Data urodzenia i płeć uzupełnione z PESEL</div>}
                                </div>
                                <div>
                                    <label style={S.label}>Data urodzenia</label>
                                    <input
                                        style={{ ...S.input, borderColor: peselAutoFilled ? '#22c55e' : undefined }}
                                        type="date"
                                        value={form.birthDate}
                                        onChange={e => {
                                            const newDate = e.target.value;
                                            setForm(f => ({ ...f, birthDate: newDate }));
                                            // Cross-validate with PESEL
                                            if (form.pesel.length === 11) {
                                                const result = validatePesel(form.pesel);
                                                if (result.valid && result.birthDate && result.birthDate !== newDate) {
                                                    setPeselError('Data urodzenia nie zgadza się z PESEL');
                                                } else {
                                                    setPeselError(null);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label style={S.label}>Płeć</label>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {[['M', '👨 Mężczyzna'], ['F', '👩 Kobieta']].map(([val, label]) => (
                                        <button key={val} onClick={() => setForm(f => ({ ...f, gender: val }))}
                                            style={{ flex: 1, padding: '0.65rem', background: form.gender === val ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)', border: form.gender === val ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: form.gender === val ? '#38bdf8' : '#e2e8f0', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p style={S.sectionTitle}>Dane kontaktowe</p>
                            <div><label style={S.label}>Ulica i numer</label><input style={S.input} value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="ul. Przykładowa 1/2" /></div>
                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div><label style={S.label}>Kod pocztowy</label><input style={S.input} value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} placeholder="44-100" /></div>
                                <div><label style={S.label}>Miasto</label><input style={S.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Gliwice" /></div>
                            </div>
                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div><label style={S.label}>Telefon komórkowy</label><input style={S.input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="570270470" inputMode="tel" /></div>
                                <div><label style={S.label}>E-mail</label><input style={S.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jan@gmail.com" inputMode="email" /></div>
                            </div>
                            <button style={S.primaryBtn} onClick={() => {
                                if (!form.firstName || !form.lastName) { setError('Imię i nazwisko są wymagane.'); return; }
                                if (peselError) { setError('Popraw numer PESEL przed kontynuacją.'); return; }
                                if (form.pesel.length > 0 && form.pesel.length < 11) { setError('PESEL musi mieć 11 cyfr.'); return; }
                                setError(null); setStep(2); window.scrollTo(0, 0);
                            }}>Dalej →</button>
                            {error && <p style={{ color: '#f87171', marginTop: '0.75rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                        </>
                    )}

                    {/* ═══ STEP 2 — STAN ZDROWIA (pełna karta) ═══ */}
                    {step === 2 && (
                        <>
                            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem', fontWeight: 600 }}>Informacja dotycząca stanu zdrowia</h2>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                                Wszystkie podane informacje są objęte tajemnicą lekarską i służą trosce o Państwa bezpieczeństwo. Proszę dokładnie odpowiedzieć na poniższe pytania.
                            </p>

                            {/* ── Ogólne ── */}
                            <p style={S.sectionTitle}>Stan ogólny</p>
                            <YesNo label="Czy czuje się Pan(i) ogólnie zdrowy(a)?" value={sv.feelsHealthy} onChange={v => setSv('feelsHealthy', v)} />
                            <YesNo label="Czy w ciągu ostatnich 2 lat leczył(a) się Pan(i) w szpitalu?" value={sv.hospitalLast2Years} onChange={v => setSv('hospitalLast2Years', v)}>
                                <input style={S.condInput} value={sv.hospitalReason} onChange={e => setSv('hospitalReason', e.target.value)} placeholder="Z jakiego powodu?" />
                            </YesNo>
                            <YesNo label="Czy aktualnie się Pan(i) na coś leczy?" value={sv.currentlyTreated} onChange={v => setSv('currentlyTreated', v)}>
                                <input style={S.condInput} value={sv.currentTreatment} onChange={e => setSv('currentTreatment', e.target.value)} placeholder="Na co?" />
                            </YesNo>
                            <YesNo label="Czy przyjmuje Pan(i) jakieś leki? (zwłaszcza aspirynę, leki przeciwkrzepliwe)" value={sv.takesMedication} onChange={v => setSv('takesMedication', v)}>
                                <input style={S.condInput} value={sv.medications} onChange={e => setSv('medications', e.target.value)} placeholder="Jakie leki?" />
                            </YesNo>
                            <YesNo label="Czy jest Pan(i) na coś uczulony(a)?" value={sv.hasAllergies} onChange={v => setSv('hasAllergies', v)}>
                                <input style={S.condInput} value={sv.allergies} onChange={e => setSv('allergies', e.target.value)} placeholder="Na co? (leki, znieczulenie, antybiotyki, lateks)" />
                            </YesNo>

                            {/* ── Skłonności ── */}
                            <p style={S.sectionTitle}>Skłonności i urządzenia</p>
                            <YesNo label="Czy ma Pan(i) skłonność do krwawień?" value={sv.bleedingTendency} onChange={v => setSv('bleedingTendency', v)} />
                            <YesNo label="Czy miał(a) Pan(i) epizody zasłabnięcia lub utraty przytomności?" value={sv.faintingEpisodes} onChange={v => setSv('faintingEpisodes', v)} />
                            <YesNo label="Czy posiada Pan(i) rozrusznik serca?" value={sv.hasPacemaker} onChange={v => setSv('hasPacemaker', v)} />

                            {/* ── Choroby ── */}
                            <p style={S.sectionTitle}>Czy choruje lub chorował(a) Pan(i) na:</p>
                            <Check label="Choroby serca" sub="zawał, choroba wieńcowa, wada serca, zaburzenia rytmu, zapalenie mięśnia sercowego" checked={sv.heartDiseases} onChange={() => setSv('heartDiseases', !sv.heartDiseases)} />
                            <Check label="Inne choroby układu krążenia" sub="nadciśnienie, niskie ciśnienie, omdlenia, duszności" checked={sv.circulatoryDiseases} onChange={() => setSv('circulatoryDiseases', !sv.circulatoryDiseases)} />
                            <Check label="Choroby naczyń krwionośnych" sub="żylaki, zapalenie żył, złe ukrwienie kończyn" checked={sv.vascularDiseases} onChange={() => setSv('vascularDiseases', !sv.vascularDiseases)} />
                            <Check label="Choroby płuc" sub="rozedma, zapalenie płuc, gruźlica, astma, przewlekłe zapalenie oskrzeli" checked={sv.lungDiseases} onChange={() => setSv('lungDiseases', !sv.lungDiseases)} />
                            <Check label="Choroby układu pokarmowego" sub="choroba wrzodowa żołądka, dwunastnicy, choroby jelit" checked={sv.digestiveDiseases} onChange={() => setSv('digestiveDiseases', !sv.digestiveDiseases)} />
                            <Check label="Choroby wątroby" sub="kamica, żółtaczka, marskość wątroby" checked={sv.liverDiseases} onChange={() => setSv('liverDiseases', !sv.liverDiseases)} />
                            <Check label="Choroby układu moczowego" sub="zapalenie nerek, kamica nerkowa, trudności w oddawaniu moczu" checked={sv.urinaryDiseases} onChange={() => setSv('urinaryDiseases', !sv.urinaryDiseases)} />
                            <Check label="Zaburzenia przemiany materii" sub="cukrzyca, dna moczanowa" checked={sv.metabolicDiseases} onChange={() => setSv('metabolicDiseases', !sv.metabolicDiseases)} />
                            <Check label="Choroby tarczycy" sub="nadczynność, niedoczynność, wole obojętne" checked={sv.thyroidDiseases} onChange={() => setSv('thyroidDiseases', !sv.thyroidDiseases)} />
                            <Check label="Choroby układu nerwowego" sub="padaczka, niedowłady, utrata przytomności, porażenia, miastenia" checked={sv.neurologicalDiseases} onChange={() => setSv('neurologicalDiseases', !sv.neurologicalDiseases)} />
                            <Check label="Choroby układu kostno-stawowego" sub="bóle korzonkowe, zwyrodnienia kręgosłupa/stawów, stany po złamaniach" checked={sv.musculoskeletalDiseases} onChange={() => setSv('musculoskeletalDiseases', !sv.musculoskeletalDiseases)} />
                            <Check label="Choroby krwi i układu krzepnięcia" sub="hemofilia, anemia, skłonność do wylewów, przedłużone krwawienie po usunięciu zęba" checked={sv.bloodDiseases} onChange={() => setSv('bloodDiseases', !sv.bloodDiseases)} />
                            <Check label="Choroby oczu (jaskra)" checked={sv.eyeDiseases} onChange={() => setSv('eyeDiseases', !sv.eyeDiseases)} />
                            <Check label="Zmiany nastroju (depresja, nerwica)" checked={sv.moodDisorders} onChange={() => setSv('moodDisorders', !sv.moodDisorders)} />

                            {/* ── Choroby zakaźne ── */}
                            <p style={S.sectionTitle}>Choroby zakaźne</p>
                            <Check label="Choroby zakaźne — ogólnie" checked={sv.infectiousDisease} onChange={() => setSv('infectiousDisease', !sv.infectiousDisease)} />
                            {sv.infectiousDisease && (
                                <div style={{ paddingLeft: '1rem', marginBottom: '0.5rem' }}>
                                    <Check label="Żółtaczka zakaźna A" checked={sv.hepatitisA} onChange={() => setSv('hepatitisA', !sv.hepatitisA)} />
                                    <Check label="Żółtaczka zakaźna B" checked={sv.hepatitisB} onChange={() => setSv('hepatitisB', !sv.hepatitisB)} />
                                    <Check label="Żółtaczka zakaźna C" checked={sv.hepatitisC} onChange={() => setSv('hepatitisC', !sv.hepatitisC)} />
                                    <Check label="AIDS / HIV" checked={sv.aids} onChange={() => setSv('aids', !sv.aids)} />
                                    <Check label="Gruźlica" checked={sv.tuberculosis} onChange={() => setSv('tuberculosis', !sv.tuberculosis)} />
                                    <Check label="Choroby weneryczne" checked={sv.std} onChange={() => setSv('std', !sv.std)} />
                                </div>
                            )}

                            {/* ── Reumatyczna / Osteoporoza ── */}
                            <Check label="Choroba reumatyczna" checked={sv.rheumaticDisease} onChange={() => setSv('rheumaticDisease', !sv.rheumaticDisease)} />
                            <Check label="Osteoporoza" checked={sv.osteoporosis} onChange={() => setSv('osteoporosis', !sv.osteoporosis)} />

                            <div style={{ marginTop: '0.75rem' }}>
                                <label style={S.label}>Inne dolegliwości</label>
                                <input style={S.input} value={sv.otherDiseases} onChange={e => setSv('otherDiseases', e.target.value)} placeholder="Jakie?" />
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                                <label style={S.label}>Ostatni pomiar ciśnienia krwi</label>
                                <input style={S.input} value={sv.lastBloodPressure} onChange={e => setSv('lastBloodPressure', e.target.value)} placeholder="np. 120/80" />
                            </div>

                            {/* ── Historia medyczna ── */}
                            <p style={S.sectionTitle}>Historia medyczna</p>
                            <YesNo label="Czy był(a) Pan(i) operowany(a)?" value={sv.hadSurgery} onChange={v => setSv('hadSurgery', v)}>
                                <input style={S.condInput} value={sv.surgeryDetails} onChange={e => setSv('surgeryDetails', e.target.value)} placeholder="Kiedy i z jakiego powodu?" />
                            </YesNo>
                            <YesNo label="Czy dobrze zniósł(a) Pan(i) znieczulenie?" value={sv.toleratedAnesthesia} onChange={v => setSv('toleratedAnesthesia', v)} />
                            <YesNo label="Czy miał(a) Pan(i) przetaczaną krew?" value={sv.hadBloodTransfusion} onChange={v => setSv('hadBloodTransfusion', v)}>
                                <input style={S.condInput} value={sv.transfusionDetails} onChange={e => setSv('transfusionDetails', e.target.value)} placeholder="Kiedy i z jakiej przyczyny?" />
                            </YesNo>

                            {/* ── Używki ── */}
                            <p style={S.sectionTitle}>Używki</p>
                            <YesNo label="Czy pali Pan(i) tytoń?" value={sv.smoker} onChange={v => setSv('smoker', v)}>
                                <input style={S.condInput} value={sv.smokingDetails} onChange={e => setSv('smokingDetails', e.target.value)} placeholder="Ile i od kiedy?" />
                            </YesNo>
                            <div style={S.yesNoRow}>
                                <span style={{ flex: 1 }}>Czy pije Pan(i) alkohol?</span>
                                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                    {['TAK', 'NIE', 'OKAZJON.'].map(v => (
                                        <button key={v} onClick={() => setSv('drinksAlcohol', v)}
                                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: sv.drinksAlcohol === v ? 'none' : '1px solid rgba(255,255,255,0.15)', background: sv.drinksAlcohol === v ? (v === 'TAK' ? '#ef4444' : v === 'OKAZJON.' ? '#f59e0b' : '#22c55e') : 'rgba(255,255,255,0.05)', color: sv.drinksAlcohol === v ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <YesNo label="Czy zażywa Pan(i) środki uspokajające, nasenne lub narkotyki?" value={sv.takesSedatives} onChange={v => setSv('takesSedatives', v)}>
                                <input style={S.condInput} value={sv.sedativesDetails} onChange={e => setSv('sedativesDetails', e.target.value)} placeholder="Jakie?" />
                            </YesNo>

                            {/* ── Kobiety ── */}
                            {form.gender === 'F' && (
                                <>
                                    <p style={S.sectionTitle}>Pytania dotyczące kobiet</p>
                                    <YesNo label="Czy jest Pani w ciąży?" value={sv.isPregnant} onChange={v => setSv('isPregnant', v)}>
                                        <input style={S.condInput} value={sv.pregnancyMonth} onChange={e => setSv('pregnancyMonth', e.target.value)} placeholder="W którym miesiącu?" />
                                    </YesNo>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <label style={S.label}>Kiedy miała Pani ostatnią miesiączkę?</label>
                                        <input style={S.input} value={sv.lastPeriod} onChange={e => setSv('lastPeriod', e.target.value)} placeholder="Data lub okres" />
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <YesNo label="Czy stosuje Pani doustne środki antykoncepcyjne?" value={sv.usesContraceptives} onChange={v => setSv('usesContraceptives', v)} />
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button style={S.secondaryBtn} onClick={() => { setStep(1); window.scrollTo(0, 0); }}>← Wstecz</button>
                                <button style={{ ...S.primaryBtn, marginTop: 0, flex: 1 }} onClick={() => { setStep(3); window.scrollTo(0, 0); }}>Dalej →</button>
                            </div>
                        </>
                    )}

                    {/* ═══ STEP 3 — ZGODY I PODPIS ═══ */}
                    {step === 3 && (
                        <>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: 600 }}>Zgody i podpis</h2>

                            <Check label="Oświadczam, że podane powyżej dane są zgodne z prawdą. Wszystkie zmiany w sytuacji zdrowotnej zobowiązuję się zgłosić w czasie najbliższej wizyty. *" checked={form.rodoConsent} onChange={() => setForm(f => ({ ...f, rodoConsent: !f.rodoConsent }))} />
                            <Check label="Wyrażam zgodę na leczenie w poradni Mikrostomart. Zgoda obejmuje wykonanie wszystkich zabiegów zaleconych i uzgodnionych z lekarzem prowadzącym." checked={form.contactConsent} onChange={() => setForm(f => ({ ...f, contactConsent: !f.contactConsent }))} />
                            <Check label="Zapoznałem/am się i akceptuję oraz zobowiązuję się do przestrzegania Regulaminu Mikrostomart." checked={true} onChange={() => { }} />
                            <Check label="Wyrażam zgodę na przetwarzanie moich danych osobowych i medycznych (RODO)." checked={form.rodoConsent} onChange={() => setForm(f => ({ ...f, rodoConsent: !f.rodoConsent }))} />
                            <Check label="Wyrażam zgodę na przesyłanie informacji marketingowych SMS/email (opcjonalne)" checked={form.marketingConsent} onChange={() => setForm(f => ({ ...f, marketingConsent: !f.marketingConsent }))} />

                            <p style={S.sectionTitle}>Podpis elektroniczny</p>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>Podpisz poniżej palcem lub ryskiem</p>
                            <div ref={sigContainer} style={{ border: '1px solid rgba(56,189,248,0.25)', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', touchAction: 'none', width: '100%' }}>
                                <canvas
                                    ref={sigCanvas}
                                    style={{ display: 'block', width: '100%', height: 160, borderRadius: '0.5rem', cursor: 'crosshair' }}
                                    onMouseDown={startDraw}
                                    onMouseMove={draw}
                                    onMouseUp={endDraw}
                                    onMouseLeave={endDraw}
                                    onTouchStart={startDraw}
                                    onTouchMove={draw}
                                    onTouchEnd={endDraw}
                                />
                            </div>
                            <button onClick={clearSig} style={{ ...S.secondaryBtn, marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>✕ Wyczyść podpis</button>

                            {error && <p style={{ color: '#f87171', marginTop: '1rem', fontSize: '0.9rem', padding: '0.75rem', background: 'rgba(248,113,113,0.1)', borderRadius: '0.5rem', border: '1px solid rgba(248,113,113,0.3)' }}>{error}</p>}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button style={S.secondaryBtn} onClick={() => { setStep(2); window.scrollTo(0, 0); }}>← Wstecz</button>
                                <button style={{ ...S.primaryBtn, marginTop: 0, flex: 1, opacity: submitting ? 0.7 : 1 }} onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? 'Wysyłanie...' : '✅ Wyślij dane'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '1.5rem' }}>Dane chronione zgodnie z RODO • Mikrostomart</p>
        </div>
    );
}
