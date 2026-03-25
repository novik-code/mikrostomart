"use client";

import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import DemoPagePlaceholder from "@/components/DemoPagePlaceholder";

export default function RegulaminPage() {
    const t = useTranslations('regulamin');

    return (
        <DemoPagePlaceholder pageTitle="Regulamin" pageDescription="Regulamin organizacyjny gabinetu stomatologicznego — treść dostosowana indywidualnie do każdego klienta DensFlow.">
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero Header */}
            <section style={{
                padding: "calc(var(--spacing-xl) + 2rem) 0 var(--spacing-lg)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center top, rgba(var(--color-primary-rgb),0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <RevealOnScroll>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "50%",
                                background: "rgba(var(--color-primary-rgb),0.1)", border: "1px solid rgba(var(--color-primary-rgb),0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <FileText size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                            marginBottom: "1.5rem", lineHeight: 1.2
                        }}>
                            {t('title')}
                        </h1>
                        <a
                            href="/regulamin.pdf" target="_blank" rel="noopener noreferrer"
                            className="btn-primary"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                background: "var(--color-primary)", color: "#000",
                                padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)",
                                fontWeight: 600, fontSize: "0.9rem", textDecoration: "none"
                            }}
                        >
                            <Download size={18} />
                            {t('downloadPdf')}
                        </a>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{
                    background: "var(--color-surface)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius-lg)",
                    padding: "clamp(2rem, 4vw, 3rem)",
                    boxShadow: "0 4px 30px rgba(0,0,0,0.3)"
                }}>
                    {/* Shared styles for legal content */}
                    <style>{`
                            .reg-section { margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
                            .reg-section:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
                            .reg-title {
                                font-family: var(--font-heading); font-size: 1.15rem; color: var(--color-primary);
                                margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem;
                            }
                            .reg-badge {
                                min-width: 32px; height: 28px; border-radius: 14px;
                                background: rgba(var(--color-primary-rgb),0.1); border: 1px solid rgba(var(--color-primary-rgb),0.15);
                                display: flex; align-items: center; justify-content: center;
                                font-size: 0.7rem; font-family: var(--font-sans); font-weight: 700;
                                color: var(--color-primary); padding: 0 8px; flex-shrink: 0;
                            }
                            .reg-body { color: var(--color-text-muted); line-height: 1.8; font-size: 0.92rem; }
                            .reg-body p { margin-bottom: 0.75rem; }
                            .reg-body p:last-child { margin-bottom: 0; }
                            .reg-body strong { color: var(--color-text-main); }
                            .reg-body ul { list-style: none; padding: 0; margin: 0.5rem 0; }
                            .reg-body li { padding: 0.3rem 0 0.3rem 1.25rem; position: relative; }
                            .reg-body li::before {
                                content: ''; position: absolute; left: 0; top: 0.85rem;
                                width: 4px; height: 4px; border-radius: 50%;
                                background: var(--color-primary); opacity: 0.5;
                            }
                        `}</style>

                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n, idx) => (
                        <div key={n} className="reg-section" style={n === 12 ? { marginBottom: 0, paddingBottom: 0, borderBottom: "none" } : undefined}>
                            <h3 className="reg-title"><span className="reg-badge">§ {n}</span> {t(`sec${n}Title`)}</h3>
                            <div className="reg-body" dangerouslySetInnerHTML={{ __html: t(`sec${n}Body`) }} />
                        </div>
                    ))}

                </div>
            </section>
        </main>
        </DemoPagePlaceholder>
    );
}
