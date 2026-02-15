"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function EmployeeLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Check if user has employee role
            const rolesResponse = await fetch('/api/auth/roles');
            if (rolesResponse.ok) {
                const rolesData = await rolesResponse.json();
                if (!rolesData.roles.includes('employee')) {
                    await supabase.auth.signOut();
                    setError('Brak uprawnień pracownika. Skontaktuj się z administratorem.');
                    return;
                }
            }

            // Full page navigation to ensure cookies are sent fresh (PWA-safe)
            window.location.href = "/pracownik";
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Invalid login credentials')) {
                setError('Nieprawidłowy email lub hasło.');
            } else if (msg.includes('Email not confirmed')) {
                setError('Email nie został potwierdzony. Sprawdź skrzynkę.');
            } else if (msg.includes('rate limit') || msg.includes('too many')) {
                setError('Zbyt wiele prób logowania. Spróbuj za chwilę.');
            } else {
                setError(msg || 'Wystąpił błąd logowania.');
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
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.05)",
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
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
                        👷
                    </div>
                    <h1 style={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                        background: "linear-gradient(135deg, #fff, #38bdf8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        Strefa Pracownika
                    </h1>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
                        Zaloguj się do panelu pracownika
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                        <label style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            color: "rgba(255, 255, 255, 0.9)",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="twoj@email.pl"
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

                    <div>
                        <label style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            color: "rgba(255, 255, 255, 0.9)",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                        }}>
                            Hasło
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
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
                            marginTop: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(56, 189, 248, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {loading ? "Logowanie..." : "Zaloguj się"}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                    <a
                        href="/pracownik/reset-haslo"
                        style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.85rem",
                            textDecoration: "underline",
                        }}
                    >
                        Zapomniałeś hasła?
                    </a>
                </div>

                {/* Back to home */}
                <div style={{ textAlign: "center", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <a
                        href="/"
                        style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.9rem",
                            textDecoration: "none",
                            transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                    >
                        ← Powrót do strony głównej
                    </a>
                </div>
            </div>
        </main>
    );
}
