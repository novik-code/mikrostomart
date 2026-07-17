"use client";

import { X } from "lucide-react";
import { useSimulator } from "@/context/SimulatorContext";
import { useTranslations } from "next-intl";
import SimulatorFlow from "@/components/simulator/SimulatorFlow";

/**
 * Global smile-simulator modal (opened from Navbar and MetamorphosisGallery).
 * Thin overlay wrapper — the actual flow lives in SimulatorFlow, shared with
 * the standalone /symulator page. Unmounting on close resets the flow state.
 */
export default function SimulatorModal() {
    const { isOpen, closeSimulator } = useSimulator();
    const t = useTranslations("simulatorModal");

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)",
            }}
        >
            <button
                onClick={closeSimulator}
                aria-label={t("close")}
                style={{
                    position: "absolute", top: "20px", right: "20px",
                    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                    color: "white", padding: "10px", cursor: "pointer", zIndex: 100,
                }}
            >
                <X size={24} />
            </button>

            <div style={{
                width: "100%", maxWidth: "500px", height: "100%", maxHeight: "800px",
                display: "flex", flexDirection: "column", position: "relative",
                overflow: "hidden", backgroundColor: "black",
            }}>
                <SimulatorFlow />
            </div>
        </div>
    );
}
