"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            alert("Hasło zostało zmienione pomyślnie!");
            router.push("/admin");
        } catch (err: any) {
            setMessage("Błąd: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background)" }}>
            <div style={{ background: "var(--color-surface)", padding: "2.5rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
                <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Ustaw nowe hasło</h1>
                <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <input
                        type="password"
                        required
                        placeholder="Nowe hasło"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: "0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-surface-hover)", background: "var(--color-background)", color: "white" }}
                    />
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? "Zapisywanie..." : "Zmień hasło"}
                    </button>
                    {message && <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>{message}</p>}
                </form>
            </div>
        </main>
    );
}
