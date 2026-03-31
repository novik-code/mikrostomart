"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "./StripePaymentForm";
import PaymentMethodPicker, { PaymentMethod } from "./PaymentMethodPicker";

interface CheckoutFormProps {
    onSuccess: () => void;
    initialValues?: {
        name?: string;
        email?: string;
        phone?: string;
        city?: string;
        zipCode?: string;
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
    };
}

type Step = 'ADDRESS' | 'METHOD' | 'PAYMENT';

export default function CheckoutForm({ onSuccess, initialValues }: CheckoutFormProps) {
    const { clearCart, total, items } = useCart();
    const [step, setStep] = useState<Step>('ADDRESS');
    const [clientSecret, setClientSecret] = useState<string>("");
    const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [redirectLoading, setRedirectLoading] = useState(false);
    const t = useTranslations('checkoutForm');

    // Load Stripe publishable key dynamically (DB-first, env fallback)
    useEffect(() => {
        fetch('/api/stripe-config')
            .then(r => r.json())
            .then(d => setStripePublishableKey(d.publishableKey || null))
            .catch(() => {
                setStripePublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null);
            });
    }, []);

    const stripePromise = useMemo(
        () => stripePublishableKey ? loadStripe(stripePublishableKey) : null,
        [stripePublishableKey]
    );

    const [formData, setFormData] = useState({
        name: initialValues?.name || '',
        email: initialValues?.email || '',
        phone: initialValues?.phone || '',
        city: initialValues?.city || '',
        zipCode: initialValues?.zipCode || '',
        street: initialValues?.street || '',
        houseNumber: initialValues?.houseNumber || '',
        apartmentNumber: initialValues?.apartmentNumber || ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('METHOD');
    };

    const handleMethodSelect = async (method: PaymentMethod) => {
        setSelectedMethod(method);
        setRedirectLoading(true);

        try {
            if (method === 'stripe') {
                // Stripe: create PaymentIntent and show embedded form
                const res = await fetch("/api/create-payment-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: total, email: formData.email }),
                });
                const data = await res.json();
                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                    setStep('PAYMENT');
                }
                setRedirectLoading(false);

            } else if (method === 'payu') {
                // PayU: create order → redirect
                const appUrl = window.location.origin;
                const res = await fetch('/api/payu/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: total,
                        email: formData.email,
                        firstName: formData.name.split(' ')[0],
                        lastName: formData.name.split(' ').slice(1).join(' ') || formData.name,
                        description: `Zadatek — ${items.map(i => i.name).join(', ')}`,
                        orderId: `order_${Date.now()}`,
                    }),
                });
                const data = await res.json();
                if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                } else {
                    console.error('[PayU] No redirectUrl', data);
                    setRedirectLoading(false);
                }

            } else if (method === 'p24') {
                // P24: register transaction → redirect
                const appUrl = window.location.origin;
                const res = await fetch('/api/p24/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: total,
                        email: formData.email,
                        name: formData.name,
                        description: `Zadatek — ${items.map(i => i.name).join(', ')}`,
                        sessionId: `p24_${Date.now()}`,
                        urlReturn: `${appUrl}/platnosc?status=return&provider=p24`,
                        urlStatus: `${appUrl}/api/p24/webhook`,
                    }),
                });
                const data = await res.json();
                if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                } else {
                    console.error('[P24] No redirectUrl', data);
                    setRedirectLoading(false);
                }
            }
        } catch (err) {
            console.error('[handleMethodSelect] Error:', err);
            setRedirectLoading(false);
        }
    };

    // Callback when Stripe payment succeeds
    const handlePaymentSuccess = async (paymentIntentId: string) => {
        const orderData = {
            cart: items,
            total,
            customerDetails: formData,
            paymentId: paymentIntentId
        };

        try {
            await fetch('/api/order-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        } catch (e) {
            console.error("Failed to trigger order confirmation:", e);
        }

        clearCart();
        onSuccess();
    };

    // ─── ADDRESS SUMMARY (shown on METHOD and PAYMENT steps) ─────────────────────
    const AddressSummary = () => (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                    {t('shippingAddress')}
                </h4>
                <button
                    onClick={() => { setStep('ADDRESS'); setSelectedMethod(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                    {t('editDetails')}
                </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '8px', color: 'white', lineHeight: '1.5', fontSize: '0.9rem' }}>
                <strong>{formData.name}</strong><br />
                {formData.street} {formData.houseNumber}{formData.apartmentNumber ? `/${formData.apartmentNumber}` : ''}<br />
                {formData.zipCode} {formData.city}<br />
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{formData.email} • {formData.phone}</span>
            </div>
        </div>
    );

    // ─── STEP: PAYMENT (Stripe embedded) ─────────────────────────────────────────
    if (step === 'PAYMENT' && clientSecret) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <AddressSummary />
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <Elements stripe={stripePromise} options={{
                        clientSecret,
                        appearance: {
                            theme: 'night',
                            variables: {
                                colorPrimary: 'var(--color-primary)',
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
                            onBack={() => setStep('METHOD')}
                        />
                    </Elements>
                </div>
            </div>
        );
    }

    // ─── STEP: METHOD (payment method picker) ────────────────────────────────────
    if (step === 'METHOD') {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <AddressSummary />

                {/* Total summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontWeight: '700' }}>
                    <span>{t('total')}</span>
                    <span style={{ color: 'var(--color-primary)' }}>{total} PLN</span>
                </div>

                <PaymentMethodPicker
                    onSelect={handleMethodSelect}
                    loading={redirectLoading}
                />
            </div>
        );
    }

    // ─── STEP: ADDRESS ────────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleAddressSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>{t('deliveryData')}</h2>

            <input required name="name" value={formData.name} onChange={handleInputChange} placeholder={t('fullName')} style={inputStyle} />
            <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder={t('email')} style={inputStyle} />
            <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder={t('phone')} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input required name="city" value={formData.city} onChange={handleInputChange} placeholder={t('city')} style={inputStyle} />
                <input required name="zipCode" value={formData.zipCode} onChange={handleInputChange} placeholder={t('zipCode')} style={inputStyle} />
            </div>
            <input required name="street" value={formData.street} onChange={handleInputChange} placeholder={t('street')} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input required name="houseNumber" value={formData.houseNumber} onChange={handleInputChange} placeholder={t('houseNumber')} style={inputStyle} />
                <input name="apartmentNumber" value={formData.apartmentNumber} onChange={handleInputChange} placeholder={t('apartment')} style={inputStyle} />
            </div>

            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold" }}>
                    <span>{t('total')}</span>
                    <span>{total} PLN</span>
                </div>
                <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                    {t('proceedToPayment')}
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
