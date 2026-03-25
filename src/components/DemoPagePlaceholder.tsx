"use client";

import { isDemoMode } from "@/lib/demoMode";
import { brand } from "@/lib/brandConfig";

/**
 * DemoPagePlaceholder — wraps a page and shows a generic demo notice
 * instead of production-specific content when in demo mode.
 */
export default function DemoPagePlaceholder({
    children,
    pageTitle,
    pageDescription,
}: {
    children: React.ReactNode;
    pageTitle: string;
    pageDescription?: string;
}) {
    if (!isDemoMode) return <>{children}</>;

    return (
        <main style={{ background: "var(--color-background)", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="container" style={{ maxWidth: "650px", textAlign: "center", padding: "4rem 2rem" }}>
                <div style={{
                    background: "var(--color-surface)",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.15)",
                    borderRadius: "var(--radius-lg)",
                    padding: "3rem 2rem",
                    boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
                }}>
                    <div style={{
                        width: "64px", height: "64px", borderRadius: "50%",
                        background: "rgba(var(--color-primary-rgb), 0.1)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 1.5rem",
                        fontSize: "1.8rem"
                    }}>
                        📄
                    </div>
                    <h1 style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                        color: "var(--color-text-main)",
                        marginBottom: "1rem"
                    }}>
                        {pageTitle}
                    </h1>
                    <p style={{
                        color: "var(--color-text-muted)",
                        fontSize: "1rem",
                        lineHeight: 1.7,
                        marginBottom: "1.5rem"
                    }}>
                        {pageDescription || "Ta strona jest konfigurowalna indywidualnie dla każdego gabinetu korzystającego z systemu DensFlow."}
                    </p>
                    <div style={{
                        background: "rgba(var(--color-primary-rgb), 0.06)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.12)",
                        borderRadius: "var(--radius-md)",
                        padding: "1rem 1.5rem",
                        display: "inline-block"
                    }}>
                        <p style={{ color: "var(--color-primary)", fontSize: "0.85rem", fontWeight: 500, margin: 0 }}>
                            🧪 Wersja demonstracyjna — {brand.name}
                        </p>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginTop: "0.5rem", margin: "0.5rem 0 0" }}>
                            W pełnej wersji ta sekcja zawiera treść dostosowaną do Twojego gabinetu.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
