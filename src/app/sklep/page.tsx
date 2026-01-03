"use client";

import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import ProductModal from "@/components/ProductModal";

// Type definition for Product
type Product = {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
    category: string;
    isVisible?: boolean;
    gallery?: string[];
};

export default function ShopPage() {
    const { addItem } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [addedId, setAddedId] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch("/api/products");
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                // Filter out hidden products
                const visibleProducts = data.filter((p: Product) => p.isVisible !== false);
                setProducts(visibleProducts);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const handleAdd = (product: Product) => {
        // Adapt to CartItem if needed (CartContext expects id, name, price, image)
        addItem(product);
        setSelectedProduct(product);
        setIsCartOpen(true);
    };

    const handleCardClick = (product: Product) => {
        setSelectedProduct(product);
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
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="btn-primary"
                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary)", color: "var(--color-text-main)", cursor: "pointer" }}
                            >
                                Twój Koszyk
                            </button>
                        </RevealOnScroll>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
                            Ładowanie produktów...
                        </div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                            gap: "var(--spacing-lg)"
                        }}>
                            {products.map((product, index) => (
                                <RevealOnScroll key={product.id} delay={index % 4 * 100 as 0 | 100 | 200 | 300}>
                                    <div style={{
                                        background: "var(--color-surface)",
                                        borderRadius: "var(--radius-md)",
                                        overflow: "hidden",
                                        border: "1px solid var(--color-surface-hover)",
                                        display: "flex",
                                        flexDirection: "column",
                                        cursor: "pointer",
                                        transition: "transform 0.2s"
                                    }}
                                        onClick={() => handleCardClick(product)}
                                    >
                                        <div style={{
                                            height: "200px",
                                            background: "#fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#000",
                                            fontWeight: "bold",
                                            overflow: "hidden",
                                            position: "relative"
                                        }}>
                                            {/* Logic for image: render <img> if URL/Base64/Local path, else placeholder */}
                                            {product.image && (product.image.startsWith("http") || product.image.startsWith("data:") || product.image.startsWith("/")) ? (
                                                <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span>{product.image || "Brak zdjęcia"}</span>
                                            )}
                                        </div>

                                        <div style={{ padding: "var(--spacing-md)", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                                            <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--spacing-xs)" }}>{product.name}</h3>
                                            {product.description && (
                                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem", lineHeight: "1.4" }}>
                                                    {product.description.length > 60 ? product.description.substring(0, 60) + "..." : product.description}
                                                </p>
                                            )}
                                            <p style={{ color: "var(--color-primary)", fontWeight: "bold", fontSize: "1.2rem", marginBottom: "var(--spacing-md)", marginTop: "auto" }}>
                                                {product.price} PLN
                                            </p>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAdd(product); }}
                                                className="btn-primary"
                                                style={{
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
                    )}
                </div>
            </section>

            {/* Render Modal if product selected OR cart is open */}
            {
                (selectedProduct || isCartOpen) && (
                    <ProductModal
                        product={selectedProduct}
                        initialStep={isCartOpen ? "CHECKOUT" : "PRODUCT"}
                        onClose={() => {
                            setSelectedProduct(null);
                            setIsCartOpen(false);
                        }}
                    />
                )
            }
        </main >
    );
}
