"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductModal, { Product } from "@/components/ProductModal";

export default function DepositPage() {
    const [product, setProduct] = useState<Product | null>(null);
    const [error, setError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Fetch the deposit product
        // We know the ID is 'deposit-payment' from our products.json check
        const fetchDepositProduct = async () => {
            try {
                const res = await fetch("/api/products");
                if (!res.ok) throw new Error("Failed to fetch products");
                const products = await res.json();
                const depositItem = products.find((p: Product) => p.id === "deposit-payment");

                if (depositItem) {
                    setProduct(depositItem);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error(err);
                setError(true);
            }
        };

        fetchDepositProduct();
    }, []);

    const handleClose = () => {
        // Redirect to home when closing the modal
        router.push("/");
    };

    if (error) {
        return (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                <h2>Nie znaleziono produktu wpłaty zadatku.</h2>
                <p>Skontaktuj się z recepcją.</p>
                <button onClick={() => router.push("/")} className="btn-primary" style={{ marginTop: "1rem" }}>
                    Powrót
                </button>
            </div>
        );
    }

    if (!product) {
        return (
            <div style={{ height: "100vh", background: "var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "var(--color-primary)" }}>Ładowanie formularza płatności...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "#000" }}>
            {/* We render the modal immediately. 
                Using isVisible={true} effectively since it conditional on 'product' being set. 
                The ProductModal layout handles the full screen overlay.
            */}
            <ProductModal
                product={product}
                initialStep="PRODUCT"
                onClose={handleClose}
            />
        </div>
    );
}
