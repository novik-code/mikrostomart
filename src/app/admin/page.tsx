"use client";

import { useState, useEffect } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string;
    gallery?: string[];
    isVisible?: boolean;
};

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        price: 0,
        description: "",
        category: "Inne",
        image: "",
        gallery: "", // temporary string for input
        isVisible: true
    });

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedAuth = sessionStorage.getItem("admin_auth");
        if (storedAuth) {
            setPassword(storedAuth);
            setIsAuthenticated(true);
            fetchProducts(storedAuth);
        }
    }, []);

    const login = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", password);
        fetchProducts(password);
    };

    const fetchProducts = async (pwd: string = password) => {
        setLoading(true);
        try {
            const res = await fetch("/api/products");
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const payload: any = { ...formData };
            // Convert gallery string back to array
            if (payload.gallery) {
                payload.gallery = payload.gallery.split(",").map((s: string) => s.trim()).filter(Boolean);
            } else {
                payload.gallery = [];
            }

            if (editingId) payload.id = editingId;
            else payload.id = Date.now().toString(); // Simple ID generation

            const res = await fetch("/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-password": password
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Błąd zapisu (Unauthorized or Invalid Data)");
            }

            await fetchProducts();
            resetForm();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Wystąpił nieoczekiwany błąd.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć ten produkt?")) return;

        try {
            const res = await fetch(`/api/products?id=${id}`, {
                method: "DELETE",
                headers: { "x-admin-password": password }
            });
            if (!res.ok) throw new Error("Failed");
            await fetchProducts();
        } catch (err) {
            alert("Błąd usuwania");
        }
    };

    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            image: product.image,
            gallery: product.gallery ? product.gallery.join(", ") : "",
            isVisible: product.isVisible ?? true
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: "", price: 0, description: "", category: "Inne", image: "", gallery: "", isVisible: true });
    };

    // --- RENDER ---

    if (!isAuthenticated) {
        return (
            <main className="section container" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
                    <h1 style={{ marginBottom: "1rem" }}>Panel Admina</h1>
                    <input
                        type="password"
                        placeholder="Hasło"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: "100%", padding: "1rem", marginBottom: "1rem", background: "var(--color-background)", border: "1px solid var(--color-surface-hover)", borderRadius: "var(--radius-md)", color: "#fff" }}
                    />
                    <button onClick={login} className="btn-primary" style={{ width: "100%" }}>Zaloguj</button>
                </div>
            </main>
        );
    }

    return (
        <main className="section container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1>Zarządzanie Produktami</h1>
                <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem("admin_auth"); }} style={{ background: "none", color: "var(--color-error)", border: "none", cursor: "pointer" }}>Wyloguj</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                {/* FORM */}
                <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>
                    <h2 style={{ marginBottom: "1rem" }}>{editingId ? "Edytuj Produkt" : "Dodaj Produkt"}</h2>
                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <input required placeholder="Nazwa" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
                        <input required type="number" placeholder="Cena (PLN)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} style={inputStyle} />
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                            <option value="Higiena">Higiena</option>
                            <option value="Wybielanie">Wybielanie</option>
                            <option value="Usługi">Usługi</option>
                            <option value="Elektronika">Elektronika</option>
                            <option value="Inne">Inne</option>
                        </select>
                        <textarea required placeholder="Opis" rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={inputStyle} />
                        <input placeholder="Link do zdjęcia / Base64" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Galeria (linki oddzielone przecinkiem)" rows={2} value={formData.gallery} onChange={(e) => setFormData({ ...formData, gallery: e.target.value })} style={inputStyle} />

                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={formData.isVisible}
                                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                            />
                            <span>Widoczny w sklepie</span>
                        </label>

                        {error && <p style={{ color: "var(--color-error)" }}>{error}</p>}

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingId ? "Zapisz Zmiany" : "Dodaj"}</button>
                            {editingId && <button type="button" onClick={resetForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                        </div>
                    </form>
                </div>

                {/* LIST */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {loading ? <p>Ładowanie...</p> : products.map(product => (
                        <div key={product.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h3 style={{ fontSize: "1.1rem" }}>
                                    {product.name}
                                    {product.isVisible === false && <span style={{ color: "var(--color-error)", fontSize: "0.8rem", marginLeft: "0.5rem" }}>(Ukryty)</span>}
                                </h3>
                                <p style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{product.price} PLN</p>
                                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{product.category}</p>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button onClick={() => handleEdit(product)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                <button onClick={() => handleDelete(product.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}

const inputStyle = {
    padding: "0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-surface-hover)",
    background: "var(--color-background)",
    color: "var(--color-text-main)",
    fontSize: "1rem",
    outline: "none"
};
