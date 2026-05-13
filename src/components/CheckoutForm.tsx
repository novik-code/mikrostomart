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
    const [autofillSource, setAutofillSource] = useState<'patient' | null>(null);

    // Autofill from logged-in patient (strefa pacjenta) — runs once on mount.
    // GET /api/patients/me returns 401 for guests (we no-op) or merged Prodentis
    // + Supabase patient details for logged-in patients (firstName, lastName,
    // email, phone, address.{street,houseNumber,apartmentNumber,postalCode,city}).
    // We only fill fields the user hasn't typed yet — `initialValues` from
    // props still wins, and any keypress after autofill is preserved.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/patients/me', { credentials: 'include' });
                if (!res.ok) return; // 401 (guest) or 500 — silently fall back to empty form
                const me = await res.json();
                if (cancelled) return;

                const addr = (me.address || {}) as Record<string, string>;
                const fullName = [me.firstName, me.lastName].filter(Boolean).join(' ').trim();

                setFormData(prev => ({
                    name: prev.name || initialValues?.name || fullName || '',
                    email: prev.email || initialValues?.email || me.email || '',
                    phone: prev.phone || initialValues?.phone || me.phone || '',
                    city: prev.city || initialValues?.city || addr.city || '',
                    zipCode: prev.zipCode || initialValues?.zipCode || addr.postalCode || '',
                    street: prev.street || initialValues?.street || addr.street || '',
                    houseNumber: prev.houseNumber || initialValues?.houseNumber || addr.houseNumber || '',
                    apartmentNumber: prev.apartmentNumber || initialValues?.apartmentNumber || addr.apartmentNumber || '',
                }));

                if (fullName || me.email) setAutofillSource('patient');
            } catch {
                // Network error — silent, user can fill manually
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('METHOD');
    };

    const [orderId, setOrderId] = useState<string | null>(null);

    /**
     * Step 1 of S2-2 checkout: ask the server to compute the cart total
     * from the products table and create a `status='pending'` order row.
     * Returns the orderId we hand to Stripe/PayU/P24 below — the server
     * uses `amount_total` from that row, NOT the value we send.
     */
    const createPendingOrder = async (): Promise<string | null> => {
        const payload = {
            items: items.map(i => ({
                productId: i.originalId || i.id,
                quantity: i.quantity,
                // Variable-price products (vouchers): send chosen price; server validates >= min_price
                ...(i.isVariablePrice ? { chosenPrice: i.price } : {}),
            })),
            customerDetails: formData,
        };

        try {
            const res = await fetch('/api/cart/calculate-total', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.orderId) {
                console.error('[Checkout] calculate-total failed:', data);
                alert(`Błąd przy obliczaniu sumy: ${data.error || 'unknown'}`);
                return null;
            }
            // Server-computed total may differ from the cart's local total if a
            // product price changed mid-session. Warn the user before redirect.
            if (typeof data.total === 'number' && Math.abs(data.total - total) > 0.01) {
                const ok = confirm(
                    `Suma została zaktualizowana z ${total} PLN do ${data.total} PLN ` +
                    `(ceny mogły się zmienić). Kontynuować płatność?`
                );
                if (!ok) return null;
            }
            setOrderId(data.orderId);
            return data.orderId as string;
        } catch (err) {
            console.error('[Checkout] calculate-total exception:', err);
            return null;
        }
    };

    const handleMethodSelect = async (method: PaymentMethod) => {
        setSelectedMethod(method);
        setRedirectLoading(true);

        try {
            const ord = orderId || (await createPendingOrder());
            if (!ord) {
                setRedirectLoading(false);
                return;
            }

            if (method === 'stripe') {
                // Stripe: create PaymentIntent (server pulls amount from orders.amount_total)
                const res = await fetch("/api/create-payment-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: ord, email: formData.email }),
                });
                const data = await res.json();
                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                    setStep('PAYMENT');
                } else {
                    console.error('[Stripe] No clientSecret', data);
                }
                setRedirectLoading(false);

            } else if (method === 'payu') {
                // PayU: create order → redirect (server pulls amount from orders.amount_total)
                const res = await fetch('/api/payu/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: ord,
                        email: formData.email,
                        firstName: formData.name.split(' ')[0],
                        lastName: formData.name.split(' ').slice(1).join(' ') || formData.name,
                        description: `Zadatek — ${items.map(i => i.name).join(', ')}`,
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
                // P24: register transaction → redirect (server pulls amount from orders.amount_total)
                const appUrl = window.location.origin;
                const res = await fetch('/api/p24/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: ord,
                        email: formData.email,
                        description: `Zadatek — ${items.map(i => i.name).join(', ')}`,
                        returnUrl: `${appUrl}/platnosc?status=return&provider=p24&orderId=${ord}`,
                        notifyUrl: `${appUrl}/api/p24/webhook`,
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

    // Callback when Stripe payment succeeds — confirm via orderId.
    // Server reads status from orders table (S2-3 webhook sets 'paid');
    // the Stripe webhook usually fires within 1–3s of the PaymentIntent
    // succeeding, but can lag. Fire-and-poll: don't block the success UI,
    // retry the confirmation up to ~20s on 202 (pending).
    const handlePaymentSuccess = async (_paymentIntentId: string) => {
        if (!orderId) {
            console.error('[Checkout] handlePaymentSuccess called without orderId');
            clearCart();
            onSuccess();
            return;
        }

        (async () => {
            const POLL_INTERVAL_MS = 2000;
            const MAX_ATTEMPTS = 10;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    const res = await fetch('/api/order-confirmation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        // S2-4: orderId only — customer details are already on
                        // the orders row (populated during calculate-total).
                        body: JSON.stringify({ orderId }),
                    });
                    if (res.status !== 202) return; // 200 (paid) or 4xx terminal — stop
                } catch (e) {
                    console.error('[Checkout] order-confirmation retry error:', e);
                }
                if (attempt < MAX_ATTEMPTS) {
                    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
                }
            }
        })();

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

            {autofillSource === 'patient' && (
                <div style={{
                    padding: '0.7rem 1rem',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <span>✓</span>
                    <span>Dane uzupełnione z Twojego konta — sprawdź i edytuj w razie potrzeby.</span>
                </div>
            )}

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
