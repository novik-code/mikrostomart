"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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
            window.location.href = "/admin";
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError("Podaj email, aby zresetować hasło.");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/admin/update-password`,
            });
            if (error) throw error;
            alert("Sprawdź email. Wysłano link do resetowania hasła.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background)" }}>
            <div style={{ background: "var(--color-surface)", padding: "2.5rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                <h1 style={{ marginBottom: "1.5rem", textAlign: "center", color: "var(--color-primary)" }}>Admin Login</h1>

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: "100%", padding: "0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-surface-hover)", background: "var(--color-background)", color: "white" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Hasło</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: "100%", padding: "0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-surface-hover)", background: "var(--color-background)", color: "white" }}
                        />
                    </div>

                    {error && <p style={{ color: "var(--color-error)", fontSize: "0.9rem", textAlign: "center" }}>{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: "100%", marginTop: "0.5rem" }}
                    >
                        {loading ? "Logowanie..." : "Zaloguj się"}
                    </button>
                </form>

                <button
                    onClick={handleResetPassword}
                    style={{ marginTop: "1rem", width: "100%", background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
                >
                    Zapomniałeś hasła?
                </button>
            </div>
        </main>
    );
}
