"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

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

interface FormData {
    // Step 1 — Dane osobowe
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
    // Step 2 — Wywiad medyczny
    medicalSurvey: {
        chronicDiseases: string;
        heartDisease: boolean;
        pacemaker: boolean;
        diabetes: boolean;
        thyroid: boolean;
        asthma: boolean;
        epilepsy: boolean;
        bloodDisorder: boolean;
        osteoporosis: boolean;
        infectiousDisease: boolean;
        pregnant: boolean;
        breastfeeding: boolean;
        medications: string;
        allergies: string;
        latexAllergy: boolean;
        lastXray: string;
        additionalNotes: string;
    };
    // Step 3 — Zgody
    rodoConsent: boolean;
    contactConsent: boolean;
    marketingConsent: boolean;
    signatureData: string;
}

const defaultForm: FormData = {
    firstName: "", lastName: "", middleName: "", maidenName: "",
    pesel: "", birthDate: "", gender: "", street: "", postalCode: "",
    city: "", phone: "", email: "",
    medicalSurvey: {
        chronicDiseases: "", heartDisease: false, pacemaker: false,
        diabetes: false, thyroid: false, asthma: false, epilepsy: false,
        bloodDisorder: false, osteoporosis: false, infectiousDisease: false,
        pregnant: false, breastfeeding: false,
        medications: "", allergies: "", latexAllergy: false,
        lastXray: "", additionalNotes: "",
    },
    rodoConsent: false, contactConsent: true, marketingConsent: false,
    signatureData: "",
};

// ─── Styles ──────────────────────────────────────────────
const S = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #1a2840 50%, #0a1628 100%)", fontFamily: "'Inter', -apple-system, sans-serif", padding: "1rem", color: "#e2e8f0" } as React.CSSProperties,
    card: { maxWidth: 640, margin: "0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" } as React.CSSProperties,
    header: { background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.05))", borderBottom: "1px solid rgba(56,189,248,0.2)", padding: "1.25rem 1.5rem" } as React.CSSProperties,
    body: { padding: "1.5rem" } as React.CSSProperties,
    label: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.35rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
    input: { width: "100%", padding: "0.7rem 0.9rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: "1rem", outline: "none", boxSizing: "border-box" as const, WebkitAppearance: "none" as any },
    checkRow: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", marginBottom: "0.5rem", cursor: "pointer" } as React.CSSProperties,
    primaryBtn: { width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)", border: "none", borderRadius: "0.6rem", color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", marginTop: "1.5rem" } as React.CSSProperties,
    secondaryBtn: { padding: "0.7rem 1.25rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: "0.9rem", cursor: "pointer" } as React.CSSProperties,
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" } as React.CSSProperties,
    sectionTitle: { fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "1.5rem 0 0.75rem" },
};

// ─── Checkbox component ──────────────────────────────────
function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <div style={S.checkRow} onClick={onChange}>
            <div style={{ width: 22, height: 22, borderRadius: 5, border: checked ? "none" : "2px solid rgba(56,189,248,0.4)", background: checked ? "#38bdf8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                {checked && <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: "bold" }}>✓</span>}
            </div>
            <span style={{ fontSize: "0.95rem" }}>{label}</span>
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
    const sigCanvas = useRef<HTMLCanvasElement>(null);
    const [drawing, setDrawing] = useState(false);

    // Verify token on load
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

    // Signature canvas
    const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };
    const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        setDrawing(true);
        const c = sigCanvas.current!;
        const ctx = c.getContext('2d')!;
        const pos = getPos(e, c);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    };
    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!drawing) return;
        e.preventDefault();
        const c = sigCanvas.current!;
        const ctx = c.getContext('2d')!;
        const pos = getPos(e, c);
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

    const setSurvey = (key: keyof FormData['medicalSurvey'], value: any) =>
        setForm(f => ({ ...f, medicalSurvey: { ...f.medicalSurvey, [key]: value } }));

    const handleSubmit = async () => {
        if (!form.rodoConsent) { setError('Zgoda na przetwarzanie danych jest wymagana.'); return; }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/intake/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, formData: form }),
            });
            if (!res.ok) {
                const d = await res.json();
                setError(d.error || 'Błąd wysyłki. Spróbuj ponownie.');
            } else {
                setSubmitted(true);
            }
        } catch {
            setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.');
        } finally {
            setSubmitting(false);
        }
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
        const msgs: Record<string, string> = {
            already_used: 'Ten link został już wykorzystany. Poproś recepcję o nowy.',
            expired: 'Ten link wygasł. Poproś recepcję o nowy.',
            not_found: 'Nieprawidłowy link.',
        };
        return (
            <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ ...S.card, maxWidth: 400, padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Link nieważny</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                        {msgs[tokenData?.reason || ''] || 'Wystąpił błąd. Poproś recepcję o pomoc.'}
                    </p>
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
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                    Twoje dane zostały zapisane. Możesz oddać tablet recepcji.
                </p>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────
    // FORM
    // ─────────────────────────────────────────────────────
    return (
        <div style={S.page}>
            {/* Header */}
            <div style={{ maxWidth: 640, margin: '0 auto 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🦷</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Mikrostomart</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>E-Karta Pacjenta</div>
                    </div>
                </div>
                {/* Progress */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                    {['Dane osobowe', 'Wywiad medyczny', 'Zgody'].map((label, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ height: 4, borderRadius: 2, background: step > i + 1 ? '#38bdf8' : step === i + 1 ? 'rgba(56,189,248,0.8)' : 'rgba(255,255,255,0.1)', marginBottom: '0.3rem' }} />
                            <div style={{ fontSize: '0.65rem', color: step === i + 1 ? '#38bdf8' : 'rgba(255,255,255,0.35)' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={S.card}>
                <div style={S.body}>

                    {/* ────── STEP 1 — Dane osobowe ────── */}
                    {step === 1 && (
                        <>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: 600 }}>Dane osobowe</h2>

                            <div style={S.grid2}>
                                <div>
                                    <label style={S.label}>Imię *</label>
                                    <input style={S.input} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jan" />
                                </div>
                                <div>
                                    <label style={S.label}>Nazwisko *</label>
                                    <input style={S.input} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Kowalski" />
                                </div>
                            </div>

                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div>
                                    <label style={S.label}>Drugie imię</label>
                                    <input style={S.input} value={form.middleName} onChange={e => setForm(f => ({ ...f, middleName: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={S.label}>Nazwisko rodowe</label>
                                    <input style={S.input} value={form.maidenName} onChange={e => setForm(f => ({ ...f, maidenName: e.target.value }))} />
                                </div>
                            </div>

                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div>
                                    <label style={S.label}>PESEL</label>
                                    <input style={S.input} value={form.pesel} onChange={e => setForm(f => ({ ...f, pesel: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="12345678901" inputMode="numeric" />
                                </div>
                                <div>
                                    <label style={S.label}>Data urodzenia</label>
                                    <input style={S.input} type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
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

                            <div style={{ marginTop: '1.5rem' }}>
                                <p style={S.sectionTitle}>Dane kontaktowe</p>
                            </div>

                            <div>
                                <label style={S.label}>Ulica i numer</label>
                                <input style={S.input} value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="ul. Przykładowa 1/2" />
                            </div>
                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div>
                                    <label style={S.label}>Kod pocztowy</label>
                                    <input style={S.input} value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} placeholder="44-100" />
                                </div>
                                <div>
                                    <label style={S.label}>Miasto</label>
                                    <input style={S.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Gliwice" />
                                </div>
                            </div>
                            <div style={{ ...S.grid2, marginTop: '1rem' }}>
                                <div>
                                    <label style={S.label}>Telefon komórkowy</label>
                                    <input style={S.input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="570270470" inputMode="tel" />
                                </div>
                                <div>
                                    <label style={S.label}>E-mail</label>
                                    <input style={S.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jan@gmail.com" inputMode="email" />
                                </div>
                            </div>

                            <button style={S.primaryBtn} onClick={() => {
                                if (!form.firstName || !form.lastName) { setError('Imię i nazwisko są wymagane.'); return; }
                                setError(null); setStep(2);
                            }}>
                                Dalej →
                            </button>
                            {error && <p style={{ color: '#f87171', marginTop: '0.75rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                        </>
                    )}

                    {/* ────── STEP 2 — Wywiad medyczny ────── */}
                    {step === 2 && (
                        <>
                            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem', fontWeight: 600 }}>Wywiad medyczny</h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Informacje poufne — tylko dla personelu medycznego</p>

                            <label style={S.label}>Czy choruje Pan/Pani przewlekle? (opisz)</label>
                            <textarea style={{ ...S.input, minHeight: 72, resize: 'vertical' as const }} value={form.medicalSurvey.chronicDiseases}
                                onChange={e => setSurvey('chronicDiseases', e.target.value)} placeholder="Np. nadciśnienie, cukrzyca typu 2..." />

                            <p style={S.sectionTitle}>Choroby i schorzenia</p>
                            <CheckItem label="Choroby serca / układu krążenia" checked={form.medicalSurvey.heartDisease} onChange={() => setSurvey('heartDisease', !form.medicalSurvey.heartDisease)} />
                            <CheckItem label="Rozrusznik serca" checked={form.medicalSurvey.pacemaker} onChange={() => setSurvey('pacemaker', !form.medicalSurvey.pacemaker)} />
                            <CheckItem label="Cukrzyca" checked={form.medicalSurvey.diabetes} onChange={() => setSurvey('diabetes', !form.medicalSurvey.diabetes)} />
                            <CheckItem label="Choroby tarczycy" checked={form.medicalSurvey.thyroid} onChange={() => setSurvey('thyroid', !form.medicalSurvey.thyroid)} />
                            <CheckItem label="Astma / choroby układu oddechowego" checked={form.medicalSurvey.asthma} onChange={() => setSurvey('asthma', !form.medicalSurvey.asthma)} />
                            <CheckItem label="Padaczka / choroby neurologiczne" checked={form.medicalSurvey.epilepsy} onChange={() => setSurvey('epilepsy', !form.medicalSurvey.epilepsy)} />
                            <CheckItem label="Zaburzenia krzepliwości krwi" checked={form.medicalSurvey.bloodDisorder} onChange={() => setSurvey('bloodDisorder', !form.medicalSurvey.bloodDisorder)} />
                            <CheckItem label="Osteoporoza / przyjmuję bisfosfoniany" checked={form.medicalSurvey.osteoporosis} onChange={() => setSurvey('osteoporosis', !form.medicalSurvey.osteoporosis)} />
                            <CheckItem label="Choroby zakaźne (WZW, HIV)" checked={form.medicalSurvey.infectiousDisease} onChange={() => setSurvey('infectiousDisease', !form.medicalSurvey.infectiousDisease)} />

                            {form.gender === 'F' && (
                                <>
                                    <CheckItem label="Ciąża" checked={form.medicalSurvey.pregnant} onChange={() => setSurvey('pregnant', !form.medicalSurvey.pregnant)} />
                                    <CheckItem label="Karmienie piersią" checked={form.medicalSurvey.breastfeeding} onChange={() => setSurvey('breastfeeding', !form.medicalSurvey.breastfeeding)} />
                                </>
                            )}

                            <p style={S.sectionTitle}>Leki i alergie</p>
                            <label style={S.label}>Leki przyjmowane na stałe</label>
                            <textarea style={{ ...S.input, minHeight: 72, resize: 'vertical' as const }} value={form.medicalSurvey.medications}
                                onChange={e => setSurvey('medications', e.target.value)} placeholder="Np. Ramipril 5mg, Metformina 500mg..." />

                            <div style={{ marginTop: '1rem' }}>
                                <label style={S.label}>Alergie na leki / środki znieczulające</label>
                                <textarea style={{ ...S.input, minHeight: 56, resize: 'vertical' as const }} value={form.medicalSurvey.allergies}
                                    onChange={e => setSurvey('allergies', e.target.value)} placeholder="Np. Amoksycylina — wysypka..." />
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                                <CheckItem label="Alergia na lateks lub metale" checked={form.medicalSurvey.latexAllergy} onChange={() => setSurvey('latexAllergy', !form.medicalSurvey.latexAllergy)} />
                            </div>

                            <p style={S.sectionTitle}>Inne informacje</p>
                            <label style={S.label}>Ostatnie RTG (data / gabinet)</label>
                            <input style={S.input} value={form.medicalSurvey.lastXray} onChange={e => setSurvey('lastXray', e.target.value)} placeholder="Np. 2025-11, Mikrostomart" />

                            <div style={{ marginTop: '1rem' }}>
                                <label style={S.label}>Dodatkowe uwagi dla lekarza</label>
                                <textarea style={{ ...S.input, minHeight: 72, resize: 'vertical' as const }} value={form.medicalSurvey.additionalNotes}
                                    onChange={e => setSurvey('additionalNotes', e.target.value)} placeholder="Np. lęk przed leczeniem, ważne informacje..." />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button style={S.secondaryBtn} onClick={() => setStep(1)}>← Wstecz</button>
                                <button style={{ ...S.primaryBtn, marginTop: 0, flex: 1 }} onClick={() => setStep(3)}>Dalej →</button>
                            </div>
                        </>
                    )}

                    {/* ────── STEP 3 — Zgody i podpis ────── */}
                    {step === 3 && (
                        <>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: 600 }}>Zgody i podpis</h2>

                            <CheckItem label="✅ Wyrażam zgodę na przetwarzanie moich danych osobowych i medycznych przez Mikrostomart w celu świadczenia usług medycznych (RODO) *"
                                checked={form.rodoConsent} onChange={() => setForm(f => ({ ...f, rodoConsent: !f.rodoConsent }))} />
                            <CheckItem label="Wyrażam zgodę na kontakt w sprawach dotyczących wizyt (SMS, e-mail)"
                                checked={form.contactConsent} onChange={() => setForm(f => ({ ...f, contactConsent: !f.contactConsent }))} />
                            <CheckItem label="Wyrażam zgodę na przesyłanie informacji marketingowych (SMS MED, E-MAIL MED) — opcjonalne"
                                checked={form.marketingConsent} onChange={() => setForm(f => ({ ...f, marketingConsent: !f.marketingConsent }))} />

                            <p style={S.sectionTitle}>Podpis elektroniczny</p>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>Podpisz poniżej palcem lub ryskiem</p>
                            <div style={{ border: '1px solid rgba(56,189,248,0.25)', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', touchAction: 'none' }}>
                                <canvas
                                    ref={sigCanvas}
                                    width={580}
                                    height={140}
                                    style={{ display: 'block', width: '100%', height: 140, borderRadius: '0.5rem', cursor: 'crosshair' }}
                                    onMouseDown={startDraw}
                                    onMouseMove={draw}
                                    onMouseUp={endDraw}
                                    onTouchStart={startDraw}
                                    onTouchMove={draw}
                                    onTouchEnd={endDraw}
                                />
                            </div>
                            <button onClick={clearSig} style={{ ...S.secondaryBtn, marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>✕ Wyczyść podpis</button>

                            {error && <p style={{ color: '#f87171', marginTop: '1rem', fontSize: '0.9rem', padding: '0.75rem', background: 'rgba(248,113,113,0.1)', borderRadius: '0.5rem', border: '1px solid rgba(248,113,113,0.3)' }}>{error}</p>}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button style={S.secondaryBtn} onClick={() => setStep(2)}>← Wstecz</button>
                                <button
                                    style={{ ...S.primaryBtn, marginTop: 0, flex: 1, opacity: submitting ? 0.7 : 1 }}
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Wysyłanie...' : '✅ Wyślij dane'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '1.5rem' }}>
                Dane chronione zgodnie z RODO • Mikrostomart
            </p>
        </div>
    );
}
