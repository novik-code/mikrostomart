"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "./StripePaymentForm";

// Replace with your Stripe Publishable Key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
    const { clearCart, total } = useCart();
    const [step, setStep] = useState<'ADDRESS' | 'PAYMENT'>('ADDRESS');
    const [clientSecret, setClientSecret] = useState<string>("");

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

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Fetch PaymentIntent when moving to Payment step
        try {
            const res = await fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: total }),
            });
            const data = await res.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
                setStep('PAYMENT');
            } else {
                console.error("Failed to get clientSecret");
            }
        } catch (error) {
            console.error("Error creating payment intent", error);
        }
    };

    // Callback when payment succeeds
    const handlePaymentSuccess = () => {
        clearCart();
        onSuccess();
    };

    if (step === 'PAYMENT' && clientSecret) {
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

                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                        <div style={{ padding: '1rem', color: '#ef4444', border: '1px dashed #ef4444', borderRadius: '8px' }}>
                            <strong>Brak konfiguracji płatności</strong>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
                                Aby włączyć płatności, dodaj klucz <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> w pliku <code>.env.local</code>.
                            </p>
                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.6 }}>
                                (Instrukcja w pliku: stripe_setup.md)
                            </p>
                        </div>
                    ) : (
                        <Elements stripe={stripePromise} options={{
                            clientSecret,
                            appearance: {
                                theme: 'night',
                                variables: {
                                    colorPrimary: '#dcb14a',
                                    colorBackground: '#1c1c1c',
                                    colorText: '#ffffff',
                                    colorDanger: '#ef4444',
                                    fontFamily: 'var(--font-geist-sans)',
                                    borderRadius: '8px',
                                }
                            }
                        }}>
                            <StripePaymentForm
                                amount={total}
                                onSuccess={handlePaymentSuccess}
                                onBack={() => setStep('ADDRESS')}
                            />
                        </Elements>
                    )}
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
