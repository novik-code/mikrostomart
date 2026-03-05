"use client";
import { useState } from "react";

export default function ArticlesTab({ initialArticles }: { initialArticles: any[] }) {
    const [articles, setArticles] = useState<any[]>(initialArticles);
    const [manualGenerationStatus, setManualGenerationStatus] = useState<string | null>(null);
const fetchArticles = async () => {
    try {
        const res = await fetch("/api/admin/articles");
        if (res.ok) setArticles(await res.json());
    } catch (err) { console.error(err); }
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
    return renderArticlesTab();
}
