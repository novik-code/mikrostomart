"use client";
import { useState } from "react";
import { inputStyle } from "./adminStyles";

export default function BlogTab({ initialBlogPosts }: { initialBlogPosts: any[] }) {
    const [blogPosts, setBlogPosts] = useState<any[]>(initialBlogPosts);
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
    // --- AI GENERATOR HANDLERS ---
    const [aiTopic, setAiTopic] = useState("");
    const [aiInstructions, setAiInstructions] = useState("");
    const [aiModel, setAiModel] = useState("flux-dev"); // Default to better model
    const [isGenerating, setIsGenerating] = useState(false);
    // --- BLOG AI GENERATOR (dedicated) ---
    const handleBlogAiGenerate = async () => {
        if (!aiTopic) {
            alert("Wpisz temat posta");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/blog/generate", {
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

            // Populate BLOG form (not news form!)
            setBlogFormData({
                title: data.title,
                slug: data.slug || "",
                date: new Date().toISOString().split('T')[0],
                excerpt: data.excerpt || "",
                content: data.content || "",
                image: data.image || "",
                tags: Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")
            });

            alert("Wygenerowano pomyślnie! Sprawdź formularz poniżej.");
        } catch (e: any) {
            alert("Błąd: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };
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
                                onClick={handleBlogAiGenerate}
                                disabled={isGenerating}
                                className="btn-primary"
                                style={{
                                    width: "100%",
                                    opacity: isGenerating ? 0.7 : 1,
                                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
                                }}
                            >
                                {isGenerating ? "Generowanie (ok. 30-60s)..." : "Generuj Post na Bloga ✍️"}
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
    return renderBlogTab();
}
