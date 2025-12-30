"use client";

import { useState } from "react";

export default function ReservationPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        service: "",
        doctor: "",
        date: "",
        name: "",
        phone: "",
    });

    const services = ["Konsultacja", "Higienizacja", "Leczenie Bólu", "Przegląd"];
    const doctors = ["lek. dent. Marcin Nowosielski", "lek. dent. Anna Kowalska"];

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    return (
        <main>
            <section className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center" }}>
                <div className="container" style={{ maxWidth: "600px", width: "100%" }}>
                    <h1 style={{ textAlign: "center", marginBottom: "var(--spacing-lg)", color: "var(--color-primary)" }}>
                        Umów Wizytę
                    </h1>

                    <div style={{ background: "var(--color-surface)", padding: "var(--spacing-xl)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-surface-hover)" }}>

                        {/* Progress Indicator */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-xl)", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                            <span style={{ color: step >= 1 ? "var(--color-primary)" : "inherit" }}>1. Usługa</span>
                            <span style={{ color: step >= 2 ? "var(--color-primary)" : "inherit" }}>2. Lekarz</span>
                            <span style={{ color: step >= 3 ? "var(--color-primary)" : "inherit" }}>3. Termin</span>
                            <span style={{ color: step >= 4 ? "var(--color-primary)" : "inherit" }}>4. Dane</span>
                        </div>

                        {/* Step 1: Service Selection */}
                        {step === 1 && (
                            <div>
                                <h3 style={{ marginBottom: "var(--spacing-md)" }}>Wybierz rodzaj wizyty</h3>
                                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                                    {services.map((s) => (
                                        <button key={s}
                                            onClick={() => { setFormData({ ...formData, service: s }); handleNext(); }}
                                            style={{
                                                padding: "1rem",
                                                textAlign: "left",
                                                background: "var(--color-background)",
                                                color: "var(--color-text-main)",
                                                border: "1px solid var(--color-surface-hover)",
                                                borderRadius: "var(--radius-sm)",
                                                cursor: "pointer",
                                                transition: "border-color 0.2s"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                                            onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--color-surface-hover)"}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Doctor Selection */}
                        {step === 2 && (
                            <div>
                                <h3 style={{ marginBottom: "var(--spacing-md)" }}>Wybierz lekarza</h3>
                                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                                    {doctors.map((d) => (
                                        <button key={d}
                                            onClick={() => { setFormData({ ...formData, doctor: d }); handleNext(); }}
                                            style={{
                                                padding: "1rem",
                                                textAlign: "left",
                                                background: "var(--color-background)",
                                                color: "var(--color-text-main)",
                                                border: "1px solid var(--color-surface-hover)",
                                                borderRadius: "var(--radius-sm)",
                                                cursor: "pointer"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                                            onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--color-surface-hover)"}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleBack} style={{ marginTop: "var(--spacing-md)", color: "var(--color-text-muted)", background: "none", textDecoration: "underline" }}>Wróć</button>
                            </div>
                        )}

                        {/* Step 3: Date Placeholder */}
                        {step === 3 && (
                            <div>
                                <h3 style={{ marginBottom: "var(--spacing-md)" }}>Wybierz termin</h3>
                                <input type="date" style={{
                                    width: "100%",
                                    padding: "1rem",
                                    marginBottom: "var(--spacing-md)",
                                    background: "var(--color-background)",
                                    border: "1px solid var(--color-surface-hover)",
                                    color: "var(--color-text-main)"
                                }} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />

                                <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                                    <button onClick={handleBack} className="btn-primary" style={{ background: "transparent", border: "1px solid var(--color-primary)", color: "var(--color-primary)" }}>Wróć</button>
                                    <button onClick={handleNext} className="btn-primary" disabled={!formData.date}>Dalej</button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Contact & Summary */}
                        {step === 4 && (
                            <div>
                                <h3 style={{ marginBottom: "var(--spacing-md)" }}>Twoje dane</h3>
                                <div style={{ display: "grid", gap: "var(--spacing-md)", marginBottom: "var(--spacing-md)" }}>
                                    <input type="text" placeholder="Imię i Nazwisko"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        style={{ padding: "1rem", background: "var(--color-background)", border: "1px solid var(--color-surface-hover)", color: "var(--color-text-main)" }} />
                                    <input type="tel" placeholder="Numer telefonu"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        style={{ padding: "1rem", background: "var(--color-background)", border: "1px solid var(--color-surface-hover)", color: "var(--color-text-main)" }} />
                                </div>

                                <div style={{ background: "rgba(212, 175, 55, 0.1)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "var(--spacing-lg)" }}>
                                    <p><strong>Usługa:</strong> {formData.service}</p>
                                    <p><strong>Lekarz:</strong> {formData.doctor}</p>
                                    <p><strong>Data:</strong> {formData.date}</p>
                                </div>

                                <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                                    <button onClick={handleBack} className="btn-primary" style={{ background: "transparent", border: "1px solid var(--color-primary)", color: "var(--color-primary)" }}>Wróć</button>
                                    <button onClick={() => alert("Rezerwacja wstępnie przyjęta! (Demo)")} className="btn-primary">Potwierdź Rezerwację</button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </section>
        </main>
    );
}
