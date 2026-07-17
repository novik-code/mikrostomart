"use client";

import { useTranslations } from "next-intl";
import SimulatorFlow from "@/components/simulator/SimulatorFlow";

/**
 * Standalone smile-simulator page (SEO entry point, linked from theme pages).
 * Renders the exact same shared flow as the global SimulatorModal — the two
 * entry points intentionally share one implementation.
 */
export default function SimulatorPage() {
    const t = useTranslations("symulator");

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            minHeight: "100vh", width: "100%", backgroundColor: "#000", color: "#fff",
            padding: "40px 0 60px",
        }}>
            {/* BACKGROUND DECORATION */}
            <div style={{
                position: "fixed", inset: 0, zIndex: -1,
                background: "radial-gradient(circle at 50% 30%, #2a2a2a 0%, #000 100%)",
            }} />

            <main style={{ width: "100%", maxWidth: "520px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <h1 style={{ fontSize: "2rem", textAlign: "center", fontWeight: 300, margin: 0 }}>
                    {t("title")} <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t("titleAccent")}</span>
                </h1>
                <p style={{ color: "#aaa", textAlign: "center", margin: "0 0 10px" }}>
                    {t("subtitle")}
                </p>

                <SimulatorFlow showHeader={false} />
            </main>
        </div>
    );
}
