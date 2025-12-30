"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function CartPage() {
    const { items, removeItem, total, clearCart } = useCart();

    if (items.length === 0) {
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
                <h1 style={{ marginBottom: "var(--spacing-xl)", color: "var(--color-primary)" }}>Twój Koszyk</h1>

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
                                <p style={{ color: "var(--color-text-muted)" }}>{item.price} PLN x {item.quantity}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                                <span style={{ fontWeight: "bold" }}>{item.price * item.quantity} PLN</span>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    style={{ color: "var(--color-error)", background: "none", padding: "0.5rem" }}
                                >
                                    Usuń
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
                            style={{ padding: "0.75rem 1.5rem", background: "none", color: "var(--color-text-muted)", border: "1px solid var(--color-text-muted)", borderRadius: "var(--radius-md)" }}
                        >
                            Opróżnij koszyk
                        </button>
                        <button
                            onClick={() => alert("Przekierowanie do płatności (Demo)")}
                            className="btn-primary"
                        >
                            Przejdź do kasy
                        </button>
                    </div>
                </div>

            </div>
        </main>
    );
}
