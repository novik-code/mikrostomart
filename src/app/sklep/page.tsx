"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";
import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";

// Mock Data
const PRODUCTS = [
    { id: "1", name: "Szczoteczka Curaprox 5460", price: 25, image: "PROD-1" },
    { id: "2", name: "Pasta wybielająca Opalescence", price: 45, image: "PROD-2" },
    { id: "3", name: "Voucher na Higienizację", price: 250, image: "VOUCHER" },
    { id: "4", name: "Szczoteczka Soniczna Philips", price: 600, image: "PROD-4" },
];

export default function ShopPage() {
    const { addItem } = useCart();
    const [addedId, setAddedId] = useState<string | null>(null);

    const handleAdd = (product: any) => {
        addItem(product);
        setAddedId(product.id);
        setTimeout(() => setAddedId(null), 1000);
    };

    return (
        <main>
            <section className="section">
                <div className="container">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xl)" }}>
                        <RevealOnScroll>
                            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "var(--color-primary)" }}>
                                Sklep
                            </h1>
                        </RevealOnScroll>
                        <RevealOnScroll animation="blur-in">
                            <Link href="/koszyk" className="btn-primary" style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary)", color: "var(--color-text-main)" }}>
                                Twój Koszyk
                            </Link>
                        </RevealOnScroll>
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                        gap: "var(--spacing-lg)"
                    }}>
                        {PRODUCTS.map((product, index) => (
                            <RevealOnScroll key={product.id} delay={index % 4 * 100 as 0 | 100 | 200 | 300}>
                                <div style={{
                                    background: "var(--color-surface)",
                                    borderRadius: "var(--radius-md)",
                                    overflow: "hidden",
                                    border: "1px solid var(--color-surface-hover)",
                                    display: "flex",
                                    flexDirection: "column"
                                }}>
                                    <div style={{
                                        height: "200px",
                                        background: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#000",
                                        fontWeight: "bold"
                                    }}>
                                        {/* Real Image Placeholder */}
                                        {product.image}
                                    </div>

                                    <div style={{ padding: "var(--spacing-md)", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                                        <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--spacing-xs)" }}>{product.name}</h3>
                                        <p style={{ color: "var(--color-primary)", fontWeight: "bold", fontSize: "1.2rem", marginBottom: "var(--spacing-md)" }}>
                                            {product.price} PLN
                                        </p>

                                        <button
                                            onClick={() => handleAdd(product)}
                                            className="btn-primary"
                                            style={{
                                                marginTop: "auto",
                                                width: "100%",
                                                background: addedId === product.id ? "var(--color-success)" : "var(--color-primary)"
                                            }}
                                        >
                                            {addedId === product.id ? "Dodano!" : "Do koszyka"}
                                        </button>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
