"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
    const { clearCart, total } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'ADDRESS' | 'PAYMENT'>('ADDRESS');
    const [paymentMethod, setPaymentMethod] = useState('blik'); // Default to BLIK

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        zipCode: '',
        street: '',
        houseNumber: '',
        apartmentNumber: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation is handled by 'required' attributes
        setStep('PAYMENT');
    };

    const handleFinalSubmit = async () => {
        setIsProcessing(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        clearCart();
        setIsProcessing(false);
        onSuccess();
    };

    if (step === 'PAYMENT') {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                    <h4 style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Adres dostawy</h4>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', color: 'white', lineHeight: '1.5' }}>
                        <strong>{formData.name}</strong><br />
                        {formData.street} {formData.houseNumber}{formData.apartmentNumber ? `/${formData.apartmentNumber}` : ''}<br />
                        {formData.zipCode} {formData.city}<br />
                        <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>{formData.email} • {formData.phone}</span>
                    </div>
                    <button onClick={() => setStep('ADDRESS')} style={{ background: 'none', border: 'none', color: '#dcb14a', marginTop: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>Edytuj dane</button>
                </div>

                <div>
                    <h4 style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Metoda płatności</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                            { id: 'blik', label: 'BLIK', icon: '📱' },
                            { id: 'card', label: 'Karta Płatnicza', icon: '💳' },
                            { id: 'transfer', label: 'Przelew Tradycyjny', icon: '🏦' }
                        ].map((method) => (
                            <label key={method.id} style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                borderRadius: '8px', border: paymentMethod === method.id ? '1px solid #dcb14a' : '1px solid rgba(255,255,255,0.1)',
                                background: paymentMethod === method.id ? 'rgba(220, 177, 74, 0.1)' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer', transition: 'all 0.2s', color: 'white'
                            }}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value={method.id}
                                    checked={paymentMethod === method.id}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{ accentColor: '#dcb14a', width: '20px', height: '20px' }}
                                />
                                <span style={{ fontSize: '1.5rem' }}>{method.icon}</span>
                                <span style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem' }}>{method.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold", fontSize: '1.2rem', color: 'white' }}>
                        <span>Do zapłaty:</span>
                        <span style={{ color: '#dcb14a' }}>{total} PLN</span>
                    </div>

                    <button
                        onClick={handleFinalSubmit}
                        disabled={isProcessing}
                        className="btn-primary"
                        style={{ width: "100%", opacity: isProcessing ? 0.7 : 1 }}
                    >
                        {isProcessing ? "Przetwarzanie..." : "Zamawiam i płacę"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleAddressSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>Dane dostawy</h2>

            <input
                required
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Imię i Nazwisko"
                style={inputStyle}
            />
            <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                style={inputStyle}
            />
            <input
                required
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Telefon"
                style={inputStyle}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Miejscowość"
                    style={inputStyle}
                />
                <input
                    required
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="Kod pocztowy"
                    style={inputStyle}
                />
            </div>
            <input
                required
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="Ulica"
                style={inputStyle}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                    required
                    name="houseNumber"
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    placeholder="Nr domu"
                    style={inputStyle}
                />
                <input
                    name="apartmentNumber"
                    value={formData.apartmentNumber}
                    onChange={handleInputChange}
                    placeholder="Nr lokalu (opcjonalnie)"
                    style={inputStyle}
                />
            </div>

            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold" }}>
                    <span>Suma:</span>
                    <span>{total} PLN</span>
                </div>

                <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: "100%" }}
                >
                    Dalej do płatności →
                </button>
            </div>
        </form>
    );
}

const inputStyle = {
    padding: "0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-surface-hover)",
    background: "var(--color-background)",
    color: "var(--color-text-main)",
    fontSize: "1rem",
    width: "100%",
    boxSizing: "border-box" as const
};
