"use client";

import { useState, useEffect } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingBag,
    Calendar,
    Package,
    FileText,
    HelpCircle,
    BookOpen,
    Newspaper,
    LogOut,
    Settings,
    Menu,
    X,
    Users
} from "lucide-react";

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
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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

    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'questions' | 'articles' | 'news' | 'orders' | 'reservations' | 'blog' | 'patients'>('dashboard');
    const [questions, setQuestions] = useState<any[]>([]);
    const [articles, setArticles] = useState<any[]>([]);
    const [blogPosts, setBlogPosts] = useState<any[]>([]); // New Blog Posts state
    const [generationStatus, setGenerationStatus] = useState<Record<string, string>>({});
    const [orders, setOrders] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);

    const [manualGenerationStatus, setManualGenerationStatus] = useState<string | null>(null);

    // Responsive State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false); // Reset on desktop
            }
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/admin/login");
            } else {
                fetchProducts();
                fetchQuestions();
                fetchArticles();
                fetchNews();
                fetchBlogPosts(); // Fetch blog posts
                fetchOrders();
                fetchReservations();
                fetchPatients(); // Fetch patients
            }
        };
        checkUser();
    }, [activeTab]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/products");
            if (res.ok) setProducts(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };


    const fetchQuestions = async () => {
        try {
            const res = await fetch("/api/admin/questions");
            if (res.ok) setQuestions(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchArticles = async () => {
        try {
            const res = await fetch("/api/admin/articles");
            if (res.ok) setArticles(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Usunąć pytanie?")) return;
        try {
            await fetch(`/api/admin/questions?id=${id}`, {
                method: "DELETE"
            });
            fetchQuestions();
        } catch (e) { alert("Błąd"); }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm("Usunąć artykuł trwale?")) return;
        try {
            const res = await fetch(`/api/admin/articles?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) fetchArticles();
            else alert("Błąd usuwania");
        } catch (e) { alert("Błąd"); }
    };

    // --- NEWS HANDLERS ---
    const [news, setNews] = useState<any[]>([]);
    const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
    const [newsFormData, setNewsFormData] = useState({
        title: "",
        date: new Date().toISOString().split('T')[0],
        excerpt: "",
        content: "",
        image: ""
    });

    const fetchNews = async () => {
        try {
            const res = await fetch("/api/admin/news");
            if (res.ok) setNews(await res.json());
        } catch (err) { console.error(err); }
    };

    // --- BLOG HANDLERS ---
    const [editingBlogPostId, setEditingBlogPostId] = useState<string | null>(null);
    const [blogFormData, setBlogFormData] = useState({
        title: "",
        slug: "",
        date: new Date().toISOString().split('T')[0],
        excerpt: "",
        content: "",
        image: "",
        tags: ""
    });

    const fetchBlogPosts = async () => {
        try {
            const res = await fetch("/api/admin/blog");
            if (res.ok) setBlogPosts(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSaveBlogPost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...blogFormData };
            if (editingBlogPostId) payload.id = editingBlogPostId;
            // Handle tags split
            if (typeof payload.tags === 'string') {
                payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            }

            const method = editingBlogPostId ? "PUT" : "POST";
            const res = await fetch("/api/admin/blog", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed");
            await fetchBlogPosts();
            resetBlogForm();
        } catch (err) { alert("Błąd zapisu posta"); }
    };

    const handleDeleteBlogPost = async (id: string) => {
        if (!confirm("Usunąć post z bloga?")) return;
        try {
            await fetch(`/api/admin/blog?id=${id}`, {
                method: "DELETE"
            });
            fetchBlogPosts();
        } catch (e) { alert("Błąd"); }
    };

    const handleEditBlogPost = (p: any) => {
        setEditingBlogPostId(p.id);
        setBlogFormData({
            title: p.title,
            slug: p.slug,
            date: p.date ? new Date(p.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            excerpt: p.excerpt || "",
            content: p.content || "",
            image: p.image || "",
            tags: p.tags ? p.tags.join(", ") : ""
        });
    };

    const resetBlogForm = () => {
        setEditingBlogPostId(null);
        setBlogFormData({ title: "", slug: "", date: new Date().toISOString().split('T')[0], excerpt: "", content: "", image: "", tags: "" });
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/admin/orders");
            if (res.ok) setOrders(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSaveNews = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...newsFormData };
            if (editingNewsId) payload.id = editingNewsId;

            const method = editingNewsId ? "PUT" : "POST";
            const res = await fetch("/api/admin/news", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed");
            await fetchNews();
            resetNewsForm();
        } catch (err) { alert("Błąd zapisu newsa"); }
    };

    const handleDeleteNews = async (id: string) => {
        if (!confirm("Usunąć news?")) return;
        try {
            await fetch(`/api/admin/news?id=${id}`, {
                method: "DELETE"
            });
            fetchNews();
        } catch (e) { alert("Błąd"); }
    };

    const handleEditNews = (n: any) => {
        setEditingNewsId(n.id);
        setNewsFormData({
            title: n.title,
            date: n.date,
            excerpt: n.excerpt,
            content: n.content,
            image: n.image
        });
    };


    // --- AI GENERATOR HANDLERS ---
    const [aiTopic, setAiTopic] = useState("");
    const [aiInstructions, setAiInstructions] = useState("");
    const [aiModel, setAiModel] = useState("flux-dev"); // Default to better model
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAiGenerate = async () => {
        if (!aiTopic) {
            alert("Wpisz temat artykułu");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/news/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: aiTopic,
                    instructions: aiInstructions,
                    model: aiModel
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Błąd generowania");
            }

            const data = await res.json();

            // Populate form
            setNewsFormData({
                title: data.title,
                date: new Date().toISOString().split('T')[0],
                excerpt: data.excerpt,
                content: data.content,
                image: data.image
            });

            alert("Wygenerowano pomyślnie! Sprawdź formularz poniżej.");
        } catch (e: any) {
            alert("Błąd: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };


    const resetNewsForm = () => {
        setEditingNewsId(null);
        setNewsFormData({ title: "", date: new Date().toISOString().split('T')[0], excerpt: "", content: "", image: "" });
    };

    const handleGenerateDailyArticle = async () => {
        if (!confirm("Wygenerować dzienny artykuł (Flux Pro / DALL-E)?\nJeśli nie ma pytań oczekujących, temat zostanie wymyślony przez AI.")) return;
        setManualGenerationStatus("Start...");

        try {
            const res = await fetch("/api/cron/daily-article"); // No custom headers, session cookie used

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
                        setManualGenerationStatus(line.replace("STEP:", "").trim());
                    } else if (line.startsWith("SUCCESS:")) {
                        const data = JSON.parse(line.replace("SUCCESS:", ""));
                        alert(`Sukces! Utworzono: ${data.title}`);
                        setManualGenerationStatus(null);
                        fetchArticles();
                    } else if (line.startsWith("ERROR:")) {
                        // Don't alert immediately for Flux error if fallback happens,
                        // but the stream sends ERROR line for fallback too.
                        // The server code sends `ERROR: Flux failed... Fallback...`
                        // We can show this in status.
                        if (line.includes("Flux failed")) {
                            setManualGenerationStatus("Flux failed. Fallback to DALL-E...");
                        } else {
                            alert(`Błąd: ${line.replace("ERROR:", "")}`);
                            setManualGenerationStatus(null);
                        }
                    } else if (line.startsWith("TOPIC:")) {
                        setManualGenerationStatus(`Temat: ${line.replace("TOPIC:", "")}`);
                    }
                }
            }
        } catch (e: any) {
            alert("Błąd połączenia: " + e.message);
            setManualGenerationStatus(null);
        }
    };

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/reservations");
            if (res.ok) setReservations(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDeleteReservation = async (id: string) => {
        if (!confirm("Czy na pewno usunąć rezerwację?")) return;
        await fetch(`/api/admin/reservations?id=${id}`, { method: "DELETE" });
        fetchReservations();
    };

    // Patient Functions
    const fetchPatients = async () => {
        // Mock patients data (in production, fetch from Supabase)
        const mockPatients = [
            {
                id: '1',
                firstName: 'Anna',
                lastName: 'Kowalska',
                phone: '570270470',
                email: 'anna.kowalska@example.com',
                lastLogin: '2026-02-03T14:20:00Z',
                lastSync: '2026-02-03T14:25:00Z',
                createdAt: '2025-12-15T10:30:00Z',
                visitsCount: 5
            },
            {
                id: '2',
                firstName: 'Jan',
                lastName: 'Nowak',
                phone: '570810800',
                email: 'jan.nowak@example.com',
                lastLogin: '2026-02-01T11:45:00Z',
                lastSync: '2026-02-01T11:50:00Z',
                createdAt: '2026-01-05T09:15:00Z',
                visitsCount: 3
            },
            {
                id: '3',
                firstName: 'Maria',
                lastName: 'Wiśniewska',
                phone: '600123456',
                email: 'maria.wisniewska@example.com',
                lastLogin: '2026-01-28T09:30:00Z',
                lastSync: '2026-01-28T09:35:00Z',
                createdAt: '2025-11-20T16:00:00Z',
                visitsCount: 8
            }
        ];
        setPatients(mockPatients);
    };

    const handleDeletePatient = (id: string) => {
        if (confirm('Czy na pewno chcesz usunąć konto tego pacjenta?')) {
            setPatients(patients.filter((p) => p.id !== id));
            alert('Konto pacjenta zostało usunięte');
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
                    "Content-Type": "application/json"
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
                method: "DELETE"
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



    const renderNewsTab = () => (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                {/* NEWS FORM */}
                <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>

                    {/* AI GENERATOR SECTION */}
                    <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--color-border)" }}>
                        <h3 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>✨ Generator AI</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                placeholder="Temat artykułu (np. Wybielanie zębów)"
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                style={inputStyle}
                            />
                            <textarea
                                placeholder="Dodatkowe wskazówki (np. wspomnij o metodzie Beyond)"
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                style={inputStyle}
                                rows={2}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <span style={{ fontWeight: "bold" }}>Silnik:</span>
                                <select
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="flux-dev">Flux Pro (Realistyczny - Zalecany)</option>
                                    <option value="dall-e-3">DALL-E 3 (Standard)</option>
                                </select>
                            </div>
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="btn-primary"
                                style={{
                                    width: "100%",
                                    opacity: isGenerating ? 0.7 : 1,
                                    position: "relative",
                                    background: "linear-gradient(135deg, #dcb14a, #f0c96c)" // Gold gradient
                                }}
                            >
                                {isGenerating ? "Generowanie (ok. 30s)..." : "Generuj Treść i Zdjęcie 🪄"}
                            </button>
                        </div>
                    </div>

                    {/* AI BILLING INFO */}
                    <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--color-surface-hover)", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
                        <h4 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            💳 Zarządzanie Środkami (Płatności)
                        </h4>
                        <p style={{ marginBottom: "1rem" }}>
                            Płatności za AI są realizowane bezpośrednio u dostawców. Jeśli generowanie przestanie działać, sprawdź stan konta:
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", padding: "0.8rem", background: "rgba(16, 163, 127, 0.2)", color: "#10a37f", textDecoration: "none", borderRadius: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid rgba(16, 163, 127, 0.4)" }}>
                                Obecny stan konta OpenAI ↗<br /><span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>(GPT-4o, DALL-E 3)</span>
                            </a>
                            <a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", padding: "0.8rem", background: "rgba(255, 255, 255, 0.1)", color: "white", textDecoration: "none", borderRadius: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.2)" }}>
                                Doładuj konto Replicate ↗<br /><span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>(Flux Pro)</span>
                            </a>
                        </div>
                    </div>

                    <h2 style={{ marginBottom: "1rem" }}>{editingNewsId ? "Edytuj News" : "Dodaj News"}</h2>
                    <form onSubmit={handleSaveNews} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <input required placeholder="Tytuł" value={newsFormData.title} onChange={(e) => setNewsFormData({ ...newsFormData, title: e.target.value })} style={inputStyle} />
                        <input required type="date" value={newsFormData.date} onChange={(e) => setNewsFormData({ ...newsFormData, date: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Krótki opis (Excerpt)" rows={3} value={newsFormData.excerpt} onChange={(e) => setNewsFormData({ ...newsFormData, excerpt: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Treść (Markdown/HTML)" rows={6} value={newsFormData.content} onChange={(e) => setNewsFormData({ ...newsFormData, content: e.target.value })} style={inputStyle} />
                        <input placeholder="Link do zdjęcia" value={newsFormData.image} onChange={(e) => setNewsFormData({ ...newsFormData, image: e.target.value })} style={inputStyle} />
                        {newsFormData.image && (
                            <div style={{ marginTop: "0.5rem", border: "1px solid var(--color-border)", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Podgląd:</p>
                                <img src={newsFormData.image} alt="Podgląd" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px", objectFit: "cover" }} />
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingNewsId ? "Zapisz Zmiany" : "Dodaj"}</button>
                            {editingNewsId && <button type="button" onClick={resetNewsForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                        </div>
                    </form>
                </div>
            </div>

            <div style={{ marginTop: "3rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Lista Aktualności</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {news.length === 0 ? <p>Brak aktualności.</p> : news.map(n => (
                        <div key={n.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{n.title}</h3>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{n.date}</span>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <img src={n.image} alt={n.title} style={{ maxWidth: "100%", height: "auto", borderRadius: "4px", maxHeight: "150px", objectFit: "cover" }} />
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button onClick={() => handleEditNews(n)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                <button onClick={() => handleDeleteNews(n.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    const renderArticlesTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Baza Wiedzy (Blog)</h2>
                {manualGenerationStatus ? (
                    <span style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                        Generator Cron: {manualGenerationStatus}
                    </span>
                ) : (
                    <button
                        onClick={handleGenerateDailyArticle}
                        className="btn-primary"
                        style={{ background: "linear-gradient(135deg, #dcb14a, #f0c96c)", color: "black", fontSize: "0.9rem" }}
                    >
                        Generuj Losowy Artykuł (Flux) 🎲
                    </button>
                )}
            </div>
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
    );

    const renderOrdersTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Historia Zamówień</h2>
            {orders.length === 0 ? <p>Brak zamówień.</p> : orders.map(o => (
                <div key={o.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                        <div>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginRight: '1rem' }}>
                                {new Date(o.created_at).toLocaleString('pl-PL')}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{o.customer_details.name}</span>
                            <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>|</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>{o.customer_details.email}</span>
                        </div>
                        <div>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '1.2rem' }}>{o.total_amount} PLN</span>
                            <span style={{ marginLeft: '1rem', background: 'green', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{o.status}</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Produkty:</h4>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                {o.items.map((item: any, idx: number) => (
                                    <li key={idx} style={{ marginBottom: '0.3rem' }}>
                                        {item.name} (x{item.quantity || 1}) - {item.price} PLN
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Adres:</h4>
                            <p style={{ lineHeight: '1.5', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {o.customer_details.street} {o.customer_details.houseNumber}{o.customer_details.apartmentNumber ? '/' + o.customer_details.apartmentNumber : ''}<br />
                                {o.customer_details.zipCode} {o.customer_details.city}<br />
                                Tel: {o.customer_details.phone}
                            </p>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ID: {o.payment_id}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderBlogTab = () => (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                {/* BLOG FORM */}
                <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>

                    {/* AI GENERATOR SECTION (Reused logic) */}
                    <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--color-border)" }}>
                        <h3 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>✨ Generator AI (Styl Dr. Marcina)</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                placeholder="Temat posta (np. Dlaczego warto leczyć kanałowo?)"
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                style={inputStyle}
                            />
                            <textarea
                                placeholder="Wskazówki (np. bądź zabawny, użyj porównania do motoryzacji)"
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                style={inputStyle}
                                rows={2}
                            />
                            <button
                                onClick={() => {
                                    // Hack: We reuse the news generator but we could make a specific one later
                                    // Ideally we should pass a 'type' to the generator API
                                    setAiInstructions(prev => prev + " [Styl: Dr Marcin Nowosielski, Dental MacGyver, luźny język, pierwsza osoba liczby pojedynczej]");
                                    handleAiGenerate();
                                }}
                                disabled={isGenerating}
                                className="btn-primary"
                                style={{
                                    width: "100%",
                                    opacity: isGenerating ? 0.7 : 1,
                                    background: "linear-gradient(135deg, #dcb14a, #f0c96c)"
                                }}
                            >
                                {isGenerating ? "Generowanie..." : "Generuj Post na Bloga ✍️"}
                            </button>
                        </div>
                    </div>

                    <h2 style={{ marginBottom: "1rem" }}>{editingBlogPostId ? "Edytuj Post" : "Dodaj Post"}</h2>
                    <form onSubmit={handleSaveBlogPost} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <input required placeholder="Tytuł" value={blogFormData.title} onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })} style={inputStyle} />
                        <input placeholder="Slug (opcjonalny - wygeneruje się sam)" value={blogFormData.slug} onChange={(e) => setBlogFormData({ ...blogFormData, slug: e.target.value })} style={inputStyle} />
                        <input required type="date" value={blogFormData.date} onChange={(e) => setBlogFormData({ ...blogFormData, date: e.target.value })} style={inputStyle} />
                        <input placeholder="Tagi (oddzielone przecinkiem)" value={blogFormData.tags} onChange={(e) => setBlogFormData({ ...blogFormData, tags: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Krótki wstęp (Excerpt)" rows={3} value={blogFormData.excerpt} onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Treść (HTML/Markdown)" rows={10} value={blogFormData.content} onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })} style={inputStyle} />
                        <input placeholder="Link do zdjęcia" value={blogFormData.image} onChange={(e) => setBlogFormData({ ...blogFormData, image: e.target.value })} style={inputStyle} />

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingBlogPostId ? "Zapisz Zmiany" : "Dodaj Post"}</button>
                            {editingBlogPostId && <button type="button" onClick={resetBlogForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                        </div>
                    </form>
                </div>

                {/* BLOG LIST */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Lista Postów</h3>
                    {blogPosts.length === 0 ? <p>Brak postów.</p> : blogPosts.map(p => (
                        <div key={p.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{p.title}</h3>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(p.date).toLocaleDateString()}</span>
                            </div>
                            <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>/{p.slug}</p>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button onClick={() => handleEditBlogPost(p)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                <button onClick={() => handleDeleteBlogPost(p.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                                <a href={`/nowosielski/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "0.5rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "white", textDecoration: "none", fontSize: "0.9rem" }}>Podgląd ↗</a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    const renderPatientsTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Pacjenci Strefy Pacjenta</h2>
            {patients.length === 0 ? <p>Brak zarejestrowanych pacjentów.</p> : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Imię i Nazwisko</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Telefon</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Email</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Ostatnie logowanie</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Liczba wizyt</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Data rejestracji</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((patient) => (
                                <tr key={patient.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                    <td style={{ padding: "1rem" }}>
                                        <strong>{patient.firstName} {patient.lastName}</strong>
                                    </td>
                                    <td style={{ padding: "1rem" }}>{patient.phone}</td>
                                    <td style={{ padding: "1rem" }}>{patient.email}</td>
                                    <td style={{ padding: "1rem" }}>
                                        {new Date(patient.lastLogin).toLocaleString('pl-PL')}
                                    </td>
                                    <td style={{ padding: "1rem", textAlign: "center" }}>
                                        <span style={{
                                            background: "var(--color-primary)",
                                            color: "#000",
                                            padding: "0.25rem 0.75rem",
                                            borderRadius: "99px",
                                            fontWeight: "bold"
                                        }}>
                                            {patient.visitsCount}
                                        </span>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        {new Date(patient.createdAt).toLocaleDateString('pl-PL')}
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <button
                                            onClick={() => handleDeletePatient(patient.id)}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "var(--color-danger)",
                                                border: "none",
                                                borderRadius: "4px",
                                                color: "white",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Usuń
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const NavItem = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                width: "100%",
                padding: "0.8rem 1rem",
                background: activeTab === id ? "var(--color-primary)" : "transparent",
                color: activeTab === id ? "black" : "var(--color-text-muted)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: activeTab === id ? "bold" : "normal",
                textAlign: "left"
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", flexDirection: "column" }}>

            {/* MOBILE HEADER */}
            <div style={{
                display: isMobile ? "flex" : "none",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem",
                background: "#111",
                borderBottom: "1px solid var(--color-surface-hover)",
                position: "sticky",
                top: 0,
                zIndex: 50
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white" }}>
                    <span style={{ color: "var(--color-primary)" }}>❖</span>
                    <span style={{ fontWeight: "bold" }}>Mikrostomart Admin</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* SIDEBAR OVERLAY (Mobile only) */}
            {isMobile && isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 40
                    }}
                />
            )}

            {/* SIDEBAR */}
            <aside style={{
                width: "260px",
                background: "#111",
                borderRight: "1px solid var(--color-surface-hover)",
                padding: "2rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                position: "fixed",
                top: 0,
                bottom: 0,
                left: 0,
                height: "100vh",
                overflowY: "auto",
                zIndex: 50,
                transform: isMobile ? (isMobileMenuOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
                transition: "transform 0.3s ease-in-out"
            }}>
                <div style={{ marginBottom: "3rem", paddingLeft: "0.5rem" }}>
                    <h2 style={{ fontSize: "1.2rem", color: "white", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "var(--color-primary)" }}>❖</span> Mikrostomart
                    </h2>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>Panel Administratora v2.0</p>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                    <NavItem id="dashboard" label="Pulpit" icon={LayoutDashboard} />
                    <NavItem id="reservations" label="Rezerwacje" icon={Calendar} />
                    <NavItem id="patients" label="Pacjenci" icon={Users} />
                    <NavItem id="orders" label="Zamówienia" icon={ShoppingBag} />
                    <NavItem id="products" label="Produkty (Sklep)" icon={Package} />

                    <div style={{ height: "1px", background: "var(--color-surface-hover)", margin: "1rem 0" }} />

                    <NavItem id="news" label="Aktualności" icon={Newspaper} />
                    <NavItem id="articles" label="Baza Wiedzy" icon={BookOpen} />
                    <NavItem id="blog" label="Blog" icon={FileText} />
                    <NavItem id="questions" label="Pytania Eksperta" icon={HelpCircle} />
                </nav>

                <div style={{ marginTop: "auto", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.8rem",
                            width: "100%",
                            padding: "0.8rem 1rem",
                            background: "rgba(220, 38, 38, 0.1)",
                            color: "#ef4444",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        <LogOut size={18} />
                        Wyloguj
                    </button>
                    <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "1rem" }}>
                        Zalogowany jako Admin
                    </p>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main style={{
                flex: 1,
                marginLeft: isMobile ? 0 : "260px",
                padding: isMobile ? "1.5rem" : "3rem",
                background: "#0a0a0a",
                minHeight: "100vh"
            }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h1 style={{ fontSize: "1.8rem" }}>
                            {activeTab === 'dashboard' && 'Pulpit'}
                            {activeTab === 'reservations' && 'Rezerwacje Wizyt'}
                            {activeTab === 'patients' && 'Pacjenci Strefy Pacjenta'}
                            {activeTab === 'orders' && 'Zamówienia Sklepu'}
                            {activeTab === 'products' && 'Zarządzanie Produktami'}
                            {activeTab === 'news' && 'Aktualności'}
                            {activeTab === 'articles' && 'Baza Wiedzy'}
                            {activeTab === 'blog' && 'Blog (Dr. Marcin Nowosielski)'}
                            {activeTab === 'questions' && 'Pytania do Eksperta'}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            {/* Header Actions if needed */}
                        </div>
                    </header>


                    {activeTab === 'dashboard' && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
                            <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                                <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Dzisiejsze Wizyty</h3>
                                <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--color-primary)" }}>
                                    {reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                                </p>
                            </div>
                            <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                                <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Nowe Zamówienia</h3>
                                <p style={{ fontSize: "2rem", fontWeight: "bold", color: "white" }}>
                                    {orders.length}
                                </p>
                            </div>
                            <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                                <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Pytania do Eksperta</h3>
                                <p style={{ fontSize: "2rem", fontWeight: "bold", color: questions.some(q => q.status === 'pending') ? "var(--color-error)" : "white" }}>
                                    {questions.filter(q => q.status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reservations' && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <h2>Umówione Wizyty</h2>
                            {reservations.length === 0 ? <p>Brak rezerwacji.</p> : (
                                <div style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid var(--color-surface-hover)", textAlign: "left" }}>
                                                <th style={{ padding: "1rem" }}>Data/Godzina</th>
                                                <th style={{ padding: "1rem" }}>Pacjent</th>
                                                <th style={{ padding: "1rem" }}>Zgłoszenie</th>
                                                <th style={{ padding: "1rem" }}>Kontakt</th>
                                                <th style={{ padding: "1rem" }}>Akcje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reservations.map((res: any) => (
                                                <tr key={res.id} style={{ borderBottom: "1px solid var(--color-surface-hover)" }}>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <div>{res.date}</div>
                                                        <div style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{res.time}</div>
                                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{new Date(res.created_at).toLocaleDateString()}</div>
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <b>{res.name}</b>
                                                        <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                            {res.service}<br />
                                                            ({res.specialist})
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top', maxWidth: '300px' }}>
                                                        {res.description && (
                                                            <div style={{ fontStyle: "italic", marginBottom: "0.5rem" }}>
                                                                "{res.description}"
                                                            </div>
                                                        )}
                                                        {res.has_attachment && (
                                                            <span style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "0.3rem",
                                                                background: "rgba(59, 130, 246, 0.2)",
                                                                color: "#60a5fa",
                                                                padding: "0.2rem 0.6rem",
                                                                borderRadius: "99px",
                                                                fontSize: "0.8rem",
                                                                border: "1px solid rgba(59, 130, 246, 0.3)"
                                                            }}>
                                                                📎 Zdjęcie (w emailu)
                                                            </span>
                                                        )}
                                                        {!res.description && !res.has_attachment && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>- brak opisu -</span>}
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <div>{res.phone}</div>
                                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{res.email}</div>
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <button
                                                            onClick={() => handleDeleteReservation(res.id)}
                                                            style={{ background: "var(--color-error)", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
                                                        >
                                                            Usuń
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'products' && (
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
                    )}

                    {activeTab === 'questions' && (
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
                                                        const res = await fetch("/api/cron/daily-article"); // No custom headers

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
                    )}

                    {activeTab === 'news' && renderNewsTab()}
                    {activeTab === 'articles' && renderArticlesTab()}
                    {activeTab === 'blog' && renderBlogTab()}
                    {activeTab === 'orders' && renderOrdersTab()}
                    {activeTab === 'patients' && renderPatientsTab()}
                </div>
            </main>
        </div>
    );
}
