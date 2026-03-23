"use client";

import { isDemoMode } from "@/lib/demoMode";

export default function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(90deg, #ff9500, #ff6b00)",
        color: "#fff",
        textAlign: "center",
        padding: "0.45rem 1rem",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        boxShadow: "0 2px 12px rgba(255, 107, 0, 0.3)",
      }}
    >
      🧪 WERSJA DEMONSTRACYJNA — dane fikcyjne, integracje wyłączone&nbsp;&nbsp;|&nbsp;&nbsp;
      <a
        href="https://densflow.ai"
        style={{
          color: "#fff",
          textDecoration: "underline",
          fontWeight: 800,
        }}
      >
        Kup licencję →
      </a>
    </div>
  );
}
