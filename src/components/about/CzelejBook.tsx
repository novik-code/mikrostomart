"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";

// Full-width card promująca książkę "Własny gabinet" w Wydawnictwie Czelej.
// 2-col layout (desktop): okładka LEWA + content PRAWA. Mobile: stack.

export default function CzelejBook() {
    const t = useTranslations("oNasBrand");

    return (
        <section
            className="section"
            style={{
                padding: "var(--spacing-xl) 0",
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-surface-hover)",
            }}
        >
            <div className="container">
                <RevealOnScroll>
                    <header
                        style={{
                            textAlign: "center",
                            maxWidth: 820,
                            margin: "0 auto var(--spacing-xl)",
                        }}
                    >
                        <p
                            style={{
                                color: "var(--color-primary)",
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                fontSize: "0.85rem",
                                marginBottom: "var(--spacing-sm)",
                            }}
                        >
                            {t("czelejEyebrow")}
                        </p>
                        <h2
                            style={{
                                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                                fontWeight: 400,
                                fontFamily: "var(--font-heading)",
                                marginBottom: "var(--spacing-md)",
                                lineHeight: 1.1,
                            }}
                        >
                            {t("czelejHeading")}
                        </h2>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll delay={100}>
                    <article
                        style={{
                            maxWidth: 1000,
                            margin: "0 auto",
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: "var(--spacing-xl)",
                            alignItems: "center",
                            padding: "var(--spacing-xl)",
                            border: "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            background: "rgba(255, 255, 255, 0.02)",
                        }}
                    >
                        <div
                            style={{
                                position: "relative",
                                width: "100%",
                                maxWidth: 280,
                                aspectRatio: "491 / 700",
                                margin: "0 auto",
                                borderRadius: 4,
                                overflow: "hidden",
                                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
                                border: "1px solid var(--color-surface-hover)",
                            }}
                        >
                            <Image
                                src="/czelej-wlasny-gabinet.webp"
                                alt={t("czelejBookTitle")}
                                fill
                                sizes="(max-width: 768px) 70vw, 280px"
                                style={{ objectFit: "cover" }}
                            />
                        </div>

                        <div>
                            <div
                                style={{
                                    display: "inline-flex",
                                    padding: "6px 14px",
                                    border: "1px solid var(--color-primary)",
                                    color: "var(--color-primary)",
                                    borderRadius: 999,
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    marginBottom: "var(--spacing-sm)",
                                }}
                            >
                                {t("czelejBadge")}
                            </div>
                            <h3
                                style={{
                                    fontSize: "1.5rem",
                                    fontWeight: 500,
                                    color: "var(--color-text-main)",
                                    lineHeight: 1.25,
                                    marginBottom: "var(--spacing-sm)",
                                }}
                            >
                                {t("czelejBookTitle")}
                            </h3>
                            <p
                                style={{
                                    fontSize: "0.95rem",
                                    color: "var(--color-text-muted)",
                                    margin: "0 0 var(--spacing-sm) 0",
                                }}
                            >
                                {t("czelejAuthor")}
                            </p>
                            <p
                                style={{
                                    fontSize: "0.82rem",
                                    color: "var(--color-text-muted)",
                                    opacity: 0.75,
                                    margin: "0 0 var(--spacing-md) 0",
                                }}
                            >
                                {t("czelejMeta")}
                            </p>
                            <p
                                style={{
                                    fontSize: "0.95rem",
                                    color: "var(--color-text-muted)",
                                    lineHeight: 1.6,
                                    marginBottom: "var(--spacing-md)",
                                }}
                            >
                                {t("czelejDescription")}
                            </p>
                            <a
                                href="https://czelej.com.pl/sklep/wlasny-gabinet-poradnik/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "12px 24px",
                                    background: "var(--color-primary)",
                                    color: "var(--color-bg, #000)",
                                    border: "1px solid var(--color-primary)",
                                    borderRadius: 4,
                                    fontWeight: 600,
                                    fontSize: "0.92rem",
                                    letterSpacing: "0.04em",
                                    textTransform: "uppercase",
                                    textDecoration: "none",
                                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                }}
                            >
                                {t("czelejCta")} →
                            </a>
                        </div>
                    </article>
                </RevealOnScroll>
            </div>
        </section>
    );
}
