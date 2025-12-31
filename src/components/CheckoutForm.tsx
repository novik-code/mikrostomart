"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CheckoutForm({ onClose }: { onClose: () => void }) {
    const { clearCart, total } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        clearCart();
        setIsProcessing(false);
        setIsSuccess(true);
    };

    if (isSuccess) {
        return (
            <div style={{ textAlign: "center", padding: "2rem" }}>
                <h2 style={{ color: "var(--color-success)", marginBottom: "1rem" }}>Zamówienie przyjęte!</h2>
                <p>Dziękujemy za zakupy w Mikrostomart.</p>
                <button
                    onClick={onClose}
                    className="btn-primary"
                    style={{ marginTop: "1.5rem" }}
                >
                    Wróć do sklepu
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>Dane dostawy</h2>

            <input
                required
                placeholder="Imię i Nazwisko"
                style={inputStyle}
            />
            <input
                required
                type="email"
                placeholder="Email"
                style={inputStyle}
            />
            <input
                required
                type="tel"
                placeholder="Telefon"
                style={inputStyle}
            />
            <textarea
                required
                placeholder="Adres dostawy"
                rows={3}
                style={inputStyle}
            />

            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold" }}>
                    <span>Do zapłaty:</span>
                    <span>{total} PLN</span>
                </div>

                <button
                    type="submit"
                    disabled={isProcessing}
                    className="btn-primary"
                    style={{ width: "100%", opacity: isProcessing ? 0.7 : 1 }}
                >
                    {isProcessing ? "Przetwarzanie..." : "Zamawiam i płacę"}
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
    fontSize: "1rem"
};
