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

    const [activeTab, setActiveTab] = useState<'products' | 'questions' | 'articles'>('products');
    const [questions, setQuestions] = useState<any[]>([]);
    const [articles, setArticles] = useState<any[]>([]);
    const [generationStatus, setGenerationStatus] = useState<Record<string, string>>({});

    useEffect(() => {
        const storedAuth = sessionStorage.getItem("admin_auth");
        if (storedAuth) {
            setPassword(storedAuth);
            setIsAuthenticated(true);
            fetchProducts(storedAuth);
            fetchQuestions(storedAuth);
            fetchArticles(storedAuth);
        }
    }, [activeTab]); // Fetch when tab changes too

    const login = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", password);
        fetchProducts(password);
        fetchQuestions(password);
        fetchArticles(password);
    };

    const fetchProducts = async (pwd: string = password) => {
        setLoading(true);
        try {
            const res = await fetch("/api/products");
            if (res.ok) setProducts(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchQuestions = async (pwd: string = password) => {
        try {
            const res = await fetch("/api/admin/questions", {
                headers: { "x-admin-password": pwd }
            });
            if (res.ok) setQuestions(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchArticles = async (pwd: string = password) => {
        try {
            const res = await fetch("/api/admin/articles", {
                headers: { "x-admin-password": pwd }
            });
            if (res.ok) setArticles(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Usunąć pytanie?")) return;
        try {
            await fetch(`/api/admin/questions?id=${id}`, {
                method: "DELETE",
                headers: { "x-admin-password": password }
            });
            fetchQuestions();
        } catch (e) { alert("Błąd"); }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm("Usunąć artykuł trwale?")) return;
        try {
            const res = await fetch(`/api/admin/articles?id=${id}`, {
                method: "DELETE",
                headers: { "x-admin-password": password }
            });
            if (res.ok) fetchArticles();
            else alert("Błąd usuwania");
        } catch (e) { alert("Błąd"); }
    };

    // ... products handlers ...

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

    const inputStyle = {
        padding: "0.8rem",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-surface-hover)",
        background: "var(--color-background)",
        color: "var(--color-text-main)",
        fontSize: "1rem",
        outline: "none"
    };

    if (!isAuthenticated) return (/* Login form remains same */
        <main className="section container" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
                <h1 style={{ marginBottom: "1rem" }}>Panel Admina</h1>
                <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "1rem", marginBottom: "1rem", background: "var(--color-background)", border: "1px solid var(--color-surface-hover)", borderRadius: "var(--radius-md)", color: "#fff" }} />
                <button onClick={login} className="btn-primary" style={{ width: "100%" }}>Zaloguj</button>
            </div>
        </main>
    );

    return (
        <main className="section container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1>Panel Administratora</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setActiveTab('products')} style={{ opacity: activeTab === 'products' ? 1 : 0.5, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Produkty</button>
                    <button onClick={() => setActiveTab('questions')} style={{ opacity: activeTab === 'questions' ? 1 : 0.5, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Pytania (Expert)</button>
                    <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem("admin_auth"); }} style={{ color: "var(--color-error)", background: 'none', border: 'none', cursor: 'pointer', marginLeft: '1rem' }}>Wyloguj</button>
                </div>
            </div>

            {activeTab === 'products' ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                    {/* PRODUCT FORM & LIST (Exact same as before) */}
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>
                        <h2 style={{ marginBottom: "1rem" }}>{editingId ? "Edytuj Produkt" : "Dodaj Produkt"}</h2>
                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {/* ... inputs ... use existing logic */}
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
                                <input type="checkbox" checked={formData.isVisible} onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })} />
                                <span>Widoczny w sklepie</span>
                            </label>
                            {error && <p style={{ color: "var(--color-error)" }}>{error}</p>}
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingId ? "Zapisz Zmiany" : "Dodaj"}</button>
                                {editingId && <button type="button" onClick={resetForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                            </div>
                        </form>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {loading ? <p>Ładowanie...</p> : products.map(product => (
                            <div key={product.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem" }}>{product.name} {product.isVisible === false && <span style={{ color: "var(--color-error)", fontSize: "0.8rem" }}>(Ukryty)</span>}</h3>
                                    <p style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{product.price} PLN</p>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button onClick={() => handleEdit(product)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                    <button onClick={() => handleDelete(product.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h2>Nadesłane Pytania (Zapytaj Eksperta)</h2>
                    {questions.length === 0 ? <p>Brak pytań.</p> : questions.map(q => (
                        <div key={q.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(q.created_at).toLocaleDateString()}</span>
                                <span style={{ background: q.status === 'pending' ? '#dcb14a' : 'green', color: 'black', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{q.status}</span>
                            </div>
                            <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{q.question}</p>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                {generationStatus[q.id] ? (
                                    <span style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: "bold" }}>
                                        {generationStatus[q.id]}
                                    </span>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Wygenerować artykuł?")) return;
                                            setGenerationStatus(prev => ({ ...prev, [q.id]: "Start..." }));

                                            try {
                                                const res = await fetch("/api/cron/daily-article", {
                                                    headers: { "x-admin-password": password }
                                                });

                                                if (!res.body) throw new Error("Brak strumienia");
                                                const reader = res.body.getReader();
                                                const decoder = new TextDecoder();

                                                while (true) {
                                                    const { done, value } = await reader.read();
                                                    if (done) break;

                                                    const text = decoder.decode(value);
                                                    const lines = text.split("\n");

                                                    for (const line of lines) {
                                                        if (line.startsWith("STEP:")) {
                                                            setGenerationStatus(prev => ({ ...prev, [q.id]: line.replace("STEP:", "").trim() }));
                                                        } else if (line.startsWith("SUCCESS:")) {
                                                            const data = JSON.parse(line.replace("SUCCESS:", ""));
                                                            alert(`Sukces! Utworzono: ${data.title}`);
                                                            setGenerationStatus(prev => ({ ...prev, [q.id]: undefined }));
                                                            fetchQuestions();
                                                        } else if (line.startsWith("ERROR:")) {
                                                            alert(`Błąd: ${line.replace("ERROR:", "")}`);
                                                            setGenerationStatus(prev => ({ ...prev, [q.id]: undefined }));
                                                        }
                                                    }
                                                }
                                            } catch (e: any) {
                                                alert("Błąd połączenia: " + e.message);
                                                setGenerationStatus(prev => ({ ...prev, [q.id]: undefined }));
                                            }
                                        }}
                                        style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold" }}
                                    >
                                        Generuj Artykuł ✍️
                                    </button>
                                )}
                                <button onClick={() => handleDeleteQuestion(q.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń (Spam)</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h2>Baza Wiedzy (Blog)</h2>
                {articles.length === 0 ? <p>Brak artykułów.</p> : articles.map(a => (
                    <div key={a.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{a.title}</h3>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{a.published_date}</span>
                        </div>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>/{a.slug}</p>
                        <button onClick={() => handleDeleteArticle(a.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                    </div>
                ))}
            </div>
            )}
        </main>
    );
}
