"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AKREDYTACJE } from "@/data/akredytacje";
import RevealOnScroll from "@/components/RevealOnScroll";

// Grid 5 kart akredytacji na /o-nas, linkujących do /akredytacje/[slug].
// Reuse danych z src/data/akredytacje.ts + i18n namespace `akredytacje` (już istnieje
// z K-2b — fullName, hero per slug). Nowe stringi z `oNasBrand` dla heading/lead/cta.

export default function AkredytacjeSection() {
    const tBrand = useTranslations("oNasBrand");
    const tAkr = useTranslations("akredytacje");

    return (
        <section
            className="section"
            style={{
                padding: "var(--spacing-xl) 0",
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
                            {tBrand("akredytacjeEyebrow")}
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
                            {tBrand("akredytacjeHeading")}
                        </h2>
                        <p
                            style={{
                                fontSize: "1.05rem",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.6,
                            }}
                        >
                            {tBrand("akredytacjeLead")}
                        </p>
                    </header>
                </RevealOnScroll>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "var(--spacing-md)",
                    }}
                >
                    {AKREDYTACJE.map((acc, idx) => {
                        const fullName = tAkr(`${acc.slug}.fullName`);
                        const hero = tAkr(`${acc.slug}.hero`);
                        return (
                            <RevealOnScroll key={acc.slug} delay={100 + idx * 60}>
                                <Link
                                    href={`/akredytacje/${acc.slug}` as never}
                                    style={{ textDecoration: "none" }}
                                >
                                    <article
                                        className="akredytacja-card-onas"
                                        style={{
                                            height: "100%",
                                            padding: "var(--spacing-md)",
                                            border: "1px solid var(--color-surface-hover)",
                                            borderRadius: "var(--radius-md)",
                                            background: "var(--color-surface, rgba(255,255,255,0.02))",
                                            display: "flex",
                                            flexDirection: "column",
                                            transition:
                                                "transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                padding: "6px 14px",
                                                border: "1px solid var(--color-primary)",
                                                borderRadius: 999,
                                                color: "var(--color-primary)",
                                                fontSize: "0.78rem",
                                                fontWeight: 600,
                                                letterSpacing: "0.08em",
                                                textTransform: "uppercase",
                                                alignSelf: "flex-start",
                                                marginBottom: "var(--spacing-sm)",
                                            }}
                                        >
                                            {acc.label}
                                        </div>
                                        <h3
                                            style={{
                                                fontSize: "1.05rem",
                                                fontWeight: 500,
                                                color: "var(--color-text-main)",
                                                margin: "0 0 var(--spacing-sm) 0",
                                                lineHeight: 1.35,
                                            }}
                                        >
                                            {fullName}
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: "0.92rem",
                                                color: "var(--color-text-muted)",
                                                lineHeight: 1.55,
                                                margin: "0 0 var(--spacing-md) 0",
                                                flex: 1,
                                            }}
                                        >
                                            {hero}
                                        </p>
                                        {acc.marcinSince ? (
                                            <p
                                                style={{
                                                    fontSize: "0.78rem",
                                                    color: "var(--color-text-muted)",
                                                    marginBottom: "var(--spacing-sm)",
                                                    opacity: 0.75,
                                                }}
                                            >
                                                {tAkr("marcinSinceLabel")}: <strong>{acc.marcinSince}</strong>
                                            </p>
                                        ) : null}
                                        <span
                                            style={{
                                                color: "var(--color-primary)",
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                                letterSpacing: "0.04em",
                                            }}
                                        >
                                            {tBrand("akredytacjeCardCta")} →
                                        </span>
                                    </article>
                                </Link>
                            </RevealOnScroll>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                .akredytacja-card-onas:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-primary) !important;
                    box-shadow: 0 12px 32px rgba(212, 175, 55, 0.15);
                }
            `}</style>
        </section>
    );
}
