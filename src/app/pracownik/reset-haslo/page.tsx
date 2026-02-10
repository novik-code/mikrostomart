"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetHasloPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Wystąpił błąd. Spróbuj ponownie.');
            } else {
                setSent(true);
            }
        } catch {
            setError('Nie udało się połączyć z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0a0a0a 0%, #0d1b2a 50%, #1b2838 100%)",
            padding: "2rem",
        }}>
            <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                borderRadius: "1.5rem",
                padding: "3rem 2.5rem",
                width: "100%",
                maxWidth: "440px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: "80px",
                        height: "80px",
                        background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.5rem",
                        fontSize: "2.5rem",
                        boxShadow: "0 8px 32px rgba(56, 189, 248, 0.3)",
                    }}>
                        ✉️
                    </div>
                    <h1 style={{
                        fontSize: "1.8rem",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                        background: "linear-gradient(135deg, #fff, #38bdf8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        Resetowanie hasła
                    </h1>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem" }}>
                        Podaj swój adres email — wyślemy link do ustawienia nowego hasła
                    </p>
                </div>

                {/* Success state */}
                {sent ? (
                    <div>
                        <div style={{
                            background: "rgba(34, 197, 94, 0.1)",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            borderRadius: "0.75rem",
                            padding: "1.5rem",
                            textAlign: "center",
                            marginBottom: "1.5rem",
                        }}>
                            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📨</div>
                            <p style={{ color: "#22c55e", fontWeight: "bold", marginBottom: "0.5rem" }}>
                                Email wysłany!
                            </p>
                            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>
                                Sprawdź swoją skrzynkę <strong>{email}</strong> i kliknij link w wiadomości. Sprawdź też folder spam.
                            </p>
                        </div>
                        <button
                            onClick={() => { setSent(false); setEmail(""); }}
                            style={{
                                width: "100%",
                                padding: "0.875rem",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "0.75rem",
                                color: "rgba(255, 255, 255, 0.7)",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                            }}
                        >
                            Wyślij ponownie
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div>
                            <label style={{
                                display: "block",
                                marginBottom: "0.5rem",
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                            }}>
                                Adres email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="twoj@email.pl"
                                autoFocus
                                style={{
                                    width: "100%",
                                    padding: "0.875rem 1rem",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "0.75rem",
                                    color: "#fff",
                                    fontSize: "1rem",
                                    outline: "none",
                                    transition: "all 0.2s",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#38bdf8';
                                    e.target.style.background = 'rgba(56, 189, 248, 0.08)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "0.5rem",
                                padding: "0.875rem",
                                color: "#ef4444",
                                fontSize: "0.9rem",
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "1rem",
                                background: loading ? "rgba(56, 189, 248, 0.3)" : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                                border: "none",
                                borderRadius: "0.75rem",
                                color: "#fff",
                                fontSize: "1rem",
                                fontWeight: "bold",
                                cursor: loading ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? "Wysyłanie..." : "Wyślij link resetujący"}
                        </button>
                    </form>
                )}

                {/* Back to login */}
                <div style={{ textAlign: "center", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Link
                        href="/pracownik/login"
                        style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.9rem",
                            textDecoration: "none",
                        }}
                    >
                        ← Powrót do logowania
                    </Link>
                </div>
            </div>
        </main>
    );
}
