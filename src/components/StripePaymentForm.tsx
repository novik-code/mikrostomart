"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onBack: () => void;
}

export default function StripePaymentForm({ amount, onSuccess, onBack }: StripePaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + "/sklep?payment_status=success",
            },
            redirect: "if_required",
        });

        if (error) {
            setErrorMessage(error.message || "Wystąpił błąd płatności.");
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
            // Payment succeeded!
            onSuccess(paymentIntent.id);
        } else {
            // Unexpected state, maybe processing
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h4 style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Płatność
            </h4>

            {/* Stripe UI */}
            <PaymentElement options={{ layout: "tabs" }} />

            {errorMessage && (
                <div style={{ color: "#ef4444", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    {errorMessage}
                </div>
            )}

            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold", fontSize: '1.2rem', color: 'white' }}>
                    <span>Do zapłaty:</span>
                    <span style={{ color: '#dcb14a' }}>{amount} PLN</span>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                        type="button"
                        onClick={onBack}
                        className="btn-secondary"
                        style={{ flex: 1, background: "transparent", border: "1px solid var(--color-surface-hover)", color: "white" }}
                    >
                        Wróć
                    </button>
                    <button
                        type="submit"
                        disabled={!stripe || isProcessing}
                        className="btn-primary"
                        style={{ flex: 2, opacity: isProcessing ? 0.7 : 1 }}
                    >
                        {isProcessing ? "Przetwarzanie..." : "Zapłać teraz"}
                    </button>
                </div>
            </div>
        </form>
    );
}
