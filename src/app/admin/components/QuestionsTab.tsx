"use client";
import { useState } from "react";

export default function QuestionsTab({ initialQuestions }: { initialQuestions: any[] }) {
    const [questions, setQuestions] = useState<any[]>(initialQuestions);
    const [generationStatus, setGenerationStatus] = useState<Record<string, string>>({});

    const fetchQuestions = async () => {
        try { const res = await fetch("/api/admin/questions"); if (res.ok) setQuestions(await res.json()); } catch (err) { console.error(err); }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Usunąć pytanie?")) return;
        try { await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" }); fetchQuestions(); } catch (e) { alert("Błąd"); }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Nadesłane Pytania (Zapytaj Eksperta)</h2>
            {questions.length === 0 ? <p>Brak pytań.</p> : questions.map(q => (
                <div key={q.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(q.created_at).toLocaleDateString()}</span>
                        <span style={{ background: q.status === 'pending' ? 'var(--color-primary)' : 'green', color: 'black', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{q.status}</span>
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
                                        const res = await fetch("/api/cron/daily-article");
                                        if (!res.body) throw new Error("Brak strumienia");
                                        const reader = res.body.getReader();
                                        const decoder = new TextDecoder();
                                        while (true) {
                                            const { done, value } = await reader.read();
                                            if (done) break;
                                            const text = decoder.decode(value);
                                            const textLines = text.split("\n");
                                            for (const line of textLines) {
                                                if (line.startsWith("STEP:")) {
                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: line.replace("STEP:", "").trim() }));
                                                } else if (line.startsWith("SUCCESS:")) {
                                                    const data = JSON.parse(line.replace("SUCCESS:", ""));
                                                    alert(`Sukces! Utworzono: ${data.title}`);
                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: undefined as any }));
                                                    fetchQuestions();
                                                } else if (line.startsWith("ERROR:")) {
                                                    alert(`Błąd: ${line.replace("ERROR:", "")}`);
                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: undefined as any }));
                                                }
                                            }
                                        }
                                    } catch (e: any) {
                                        alert("Błąd połączenia: " + e.message);
                                        setGenerationStatus(prev => ({ ...prev, [q.id]: undefined as any }));
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
    );
}
