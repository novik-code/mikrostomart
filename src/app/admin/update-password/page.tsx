"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Handle the recovery token from URL hash on page load
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                    setSessionReady(true);
                    setSessionError(false);
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    setSessionReady(true);
                }
            }
        );

        // Also check if session already exists (e.g. page reload)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            } else {
                // Wait a moment for the hash tokens to be processed
                setTimeout(() => {
                    supabase.auth.getSession().then(({ data: { session: s } }) => {
                        if (s) {
                            setSessionReady(true);
                        } else {
                            setSessionError(true);
                        }
                    });
                }, 2000);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (password.length < 8) {
            setMessage("Hasło musi mieć minimum 8 znaków.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Hasła nie są identyczne.");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMessage("✅ Hasło zostało zmienione pomyślnie!");
            setTimeout(() => router.push("/pracownik/login"), 2000);
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('session')) {
                setMessage("Link wygasł lub został już użyty. Poproś o nowy link na stronie logowania.");
            } else {
                setMessage("Błąd: " + msg);
            }
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
                        🔒
                    </div>
                    <h1 style={{
                        fontSize: "1.8rem",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                        background: "linear-gradient(135deg, #fff, #38bdf8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        Ustaw nowe hasło
                    </h1>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem" }}>
                        Panel pracownika / admin
                    </p>
                </div>

                {/* Session loading / error state */}
                {!sessionReady && !sessionError && (
                    <div style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "rgba(255, 255, 255, 0.6)",
                    }}>
                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
                        Weryfikacja linku...
                    </div>
                )}

                {sessionError && (
                    <div style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "0.75rem",
                        padding: "1.5rem",
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
                        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>
                            Link wygasł lub został już użyty.
                        </p>
                        <a
                            href="/pracownik/reset-haslo"
                            style={{
                                display: "inline-block",
                                padding: "0.75rem 1.5rem",
                                background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                                color: "#fff",
                                textDecoration: "none",
                                borderRadius: "0.5rem",
                                fontWeight: "bold",
                            }}
                        >
                            Poproś o nowy link
                        </a>
                    </div>
                )}

                {/* Password form */}
                {sessionReady && (
                    <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div>
                            <label style={{
                                display: "block",
                                marginBottom: "0.5rem",
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                            }}>
                                Nowe hasło
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="Minimum 8 znaków"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.875rem 1rem",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "0.75rem",
                                    color: "#fff",
                                    fontSize: "1rem",
                                    outline: "none",
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

                        <div>
                            <label style={{
                                display: "block",
                                marginBottom: "0.5rem",
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                            }}>
                                Potwierdź hasło
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="Powtórz hasło"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.875rem 1rem",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "0.75rem",
                                    color: "#fff",
                                    fontSize: "1rem",
                                    outline: "none",
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

                        {message && (
                            <div style={{
                                background: message.startsWith("✅") ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                border: `1px solid ${message.startsWith("✅") ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                borderRadius: "0.5rem",
                                padding: "0.875rem",
                                color: message.startsWith("✅") ? "#22c55e" : "#ef4444",
                                fontSize: "0.9rem",
                            }}>
                                {message}
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
                            {loading ? "Zapisywanie..." : "Ustaw hasło"}
                        </button>
                    </form>
                )}

                {/* Back to login */}
                <div style={{ textAlign: "center", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <a
                        href="/pracownik/login"
                        style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.9rem",
                            textDecoration: "none",
                        }}
                    >
                        ← Powrót do logowania
                    </a>
                </div>
            </div>
        </main>
    );
}
