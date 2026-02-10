"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UpdatePasswordForm() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const verifyToken = async () => {
            // Get token_hash and type from URL params (sent by our reset-password API)
            const tokenHash = searchParams.get("token_hash");
            const type = searchParams.get("type");

            if (tokenHash && type === "recovery") {
                console.log("[UpdatePassword] Verifying token_hash from URL...");
                try {
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: "recovery",
                    });

                    if (error) {
                        console.error("[UpdatePassword] verifyOtp failed:", error.message);
                        setSessionError(true);
                    } else {
                        console.log("[UpdatePassword] Token verified, session created!");
                        setSessionReady(true);
                    }
                } catch (err) {
                    console.error("[UpdatePassword] verifyOtp exception:", err);
                    setSessionError(true);
                }
            } else {
                // No token in URL — check if user already has an active session
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setSessionReady(true);
                } else {
                    setSessionError(true);
                }
            }
            setVerifying(false);
        };

        verifyToken();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            setMessage("Hasło musi mieć co najmniej 8 znaków.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Hasła nie są identyczne.");
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage("✅ Hasło zostało zmienione pomyślnie! Przekierowywanie...");
            setTimeout(() => router.push("/admin"), 2000);
        } catch (err: any) {
            const msg = err.message?.toLowerCase();
            if (msg?.includes("same password")) {
                setMessage("Nowe hasło musi się różnić od obecnego.");
            } else if (msg?.includes("weak")) {
                setMessage("Hasło jest za słabe. Użyj silniejszego hasła.");
            } else {
                setMessage("Błąd: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Loading / verifying state
    if (verifying) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
                <div style={{ textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔐</div>
                    <p style={{ fontSize: "1.1rem" }}>Weryfikacja linku...</p>
                </div>
            </main>
        );
    }

    // Token expired or invalid
    if (sessionError) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
                <div style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "16px",
                    padding: "2.5rem",
                    maxWidth: "420px",
                    width: "100%",
                    textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
                    <h2 style={{ color: "#fbbf24", marginBottom: "0.75rem", fontSize: "1.3rem" }}>Link wygasł lub został już użyty</h2>
                    <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                        Poproś o nowy link do resetowania hasła. Link jest jednorazowy i wygasa po 1 godzinie.
                    </p>
                    <a
                        href="/pracownik/reset-haslo"
                        style={{
                            display: "inline-block",
                            padding: "12px 24px",
                            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                            color: "white",
                            borderRadius: "8px",
                            textDecoration: "none",
                            fontWeight: "bold",
                        }}
                    >
                        Poproś o nowy link
                    </a>
                </div>
            </main>
        );
    }

    // Password form (session active)
    return (
        <main style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}>
            <div style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                padding: "2.5rem",
                maxWidth: "420px",
                width: "100%",
                border: "1px solid rgba(255,255,255,0.1)",
            }}>
                <h2 style={{
                    color: "white",
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    fontSize: "1.3rem",
                }}>
                    🔐 Ustaw nowe hasło
                </h2>

                <form onSubmit={handleUpdate}>
                    <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>
                        Nowe hasło (min. 8 znaków)
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="Wpisz nowe hasło"
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            fontSize: "1rem",
                            marginBottom: "1rem",
                            boxSizing: "border-box",
                        }}
                    />

                    <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>
                        Potwierdź hasło
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="Wpisz ponownie hasło"
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            fontSize: "1rem",
                            marginBottom: "1.5rem",
                            boxSizing: "border-box",
                        }}
                    />

                    {message && (
                        <p style={{
                            color: message.includes("✅") ? "#4ade80" : "#f87171",
                            textAlign: "center",
                            marginBottom: "1rem",
                            fontSize: "0.9rem",
                        }}>
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            borderRadius: "8px",
                            background: loading
                                ? "rgba(255,255,255,0.1)"
                                : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "1rem",
                            border: "none",
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Zapisywanie..." : "Zapisz nowe hasło"}
                    </button>
                </form>
            </div>
        </main>
    );
}

export default function UpdatePasswordPage() {
    return (
        <Suspense fallback={
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
                <div style={{ textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔐</div>
                    <p style={{ fontSize: "1.1rem" }}>Ładowanie...</p>
                </div>
            </main>
        }>
            <UpdatePasswordForm />
        </Suspense>
    );
}
