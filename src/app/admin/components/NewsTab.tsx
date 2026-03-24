"use client";
import { useState } from "react";
import { inputStyle } from "./adminStyles";

export default function NewsTab({ initialNews }: { initialNews: any[] }) {
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
                                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" // Gold gradient
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
    return renderNewsTab();
}
