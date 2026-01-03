"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { useState } from "react";
import CheckoutForm from "@/components/CheckoutForm";

export default function CartPage() {
    const { items, removeItem, updateQuantity, total, clearCart } = useCart();
    const [showCheckout, setShowCheckout] = useState(false);

    if (items.length === 0 && !showCheckout) {
        return (
            <main className="section container" style={{ textAlign: "center", minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h1 style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-muted)" }}>Twój koszyk jest pusty</h1>
                <Link href="/sklep" className="btn-primary" style={{ display: "inline-block", maxWidth: "200px", margin: "0 auto" }}>
                    Wróć do sklepu
                </Link>
            </main>
        );
    }

    return (
        <main className="section">
            <div className="container" style={{ maxWidth: "800px" }}>
                <h1 style={{ marginBottom: "var(--spacing-xl)", color: "var(--color-primary)" }}>
                    {showCheckout ? "Finalizacja Zamówienia" : "Twój Koszyk"}
                </h1>

                {!showCheckout ? (
                    <>
                        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
                            {items.map((item) => (
                                <div key={item.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "var(--spacing-md)",
                                    background: "var(--color-surface)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-surface-hover)"
                                }}>
                                    <div>
                                        <h3 style={{ fontSize: "1.1rem" }}>{item.name}</h3>
                                        <p style={{ color: "var(--color-text-muted)" }}>{item.price} PLN / szt.</p>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>

                                        {/* Quantity Controls */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--color-background)", padding: "0.25rem", borderRadius: "var(--radius-sm)" }}>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                style={{ width: "24px", height: "24px", cursor: "pointer", border: "none", background: "transparent", color: "var(--color-text-main)" }}
                                            >
                                                -
                                            </button>
                                            <span style={{ fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                style={{ width: "24px", height: "24px", cursor: "pointer", border: "none", background: "transparent", color: "var(--color-text-main)" }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <span style={{ fontWeight: "bold", minWidth: "80px", textAlign: "right" }}>
                                            {item.price * item.quantity} PLN
                                        </span>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            style={{ color: "var(--color-error)", background: "none", padding: "0.5rem", cursor: "pointer" }}
                                            title="Usuń z koszyka"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: "var(--spacing-xl)", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <div style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-md)" }}>
                                Suma: <span style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{total} PLN</span>
                            </div>

                            <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
                                <button
                                    onClick={clearCart}
                                    style={{ padding: "0.75rem 1.5rem", background: "none", color: "var(--color-text-muted)", border: "1px solid var(--color-text-muted)", borderRadius: "var(--radius-md)", cursor: "pointer" }}
                                >
                                    Opróżnij koszyk
                                </button>
                                <button
                                    onClick={() => setShowCheckout(true)}
                                    className="btn-primary"
                                >
                                    Przejdź do kasy
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ background: "var(--color-surface)", padding: "var(--spacing-lg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                        <button
                            onClick={() => setShowCheckout(false)}
                            style={{ marginBottom: "1rem", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
                        >
                            ← Wróć do koszyka
                        </button>
                        <CheckoutForm onSuccess={() => {
                            // Simple alert for now as page rebuild would be better, OR set a success state here.
                            // But since the form doesn't handle UI anymore, we need to show something.
                            // Let's reuse the logic from CheckoutForm previously by creating a simple wrapper or just setting state locally.
                            alert("Zamówienie przyjęte! Dziękujemy.");
                            setShowCheckout(false);
                        }} />
                    </div>
                )}

            </div>
        </main>
    );
}
