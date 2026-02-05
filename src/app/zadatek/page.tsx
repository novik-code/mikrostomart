"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductModal, { Product } from "@/components/ProductModal";

function DepositPageContent() {
    const [product, setProduct] = useState<Product | null>(null);
    const [error, setError] = useState(false);
    const [patientData, setPatientData] = useState<{
        name?: string;
        email?: string;
        phone?: string;
        city?: string;
        zipCode?: string;
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
    }>({});
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Read URL params
        const name = searchParams.get('name') || '';
        const email = searchParams.get('email') || '';
        const phone = searchParams.get('phone') || '';
        const city = searchParams.get('city') || '';
        const zipCode = searchParams.get('zipCode') || '';
        const street = searchParams.get('street') || '';
        const houseNumber = searchParams.get('houseNumber') || '';
        const apartmentNumber = searchParams.get('apartmentNumber') || '';
        setPatientData({ name, email, phone, city, zipCode, street, houseNumber, apartmentNumber });

        // Fetch the deposit product
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
    }, [searchParams]);

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
                initialValues={patientData}
                onClose={handleClose}
            />
        </div>
    );
}

export default function DepositPage() {
    return (
        <Suspense fallback={
            <div style={{ height: "100vh", background: "var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "var(--color-primary)" }}>Ładowanie formularza płatności...</div>
            </div>
        }>
            <DepositPageContent />
        </Suspense>
    );
}
