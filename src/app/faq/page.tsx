"use client";

import { useState } from 'react';
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import { ChevronDown } from "lucide-react";

export default function FAQPage() {
    const t = useTranslations('faq');
    const [openState, setOpenState] = useState<Record<string, boolean>>({});

    const toggle = (id: string) => {
        setOpenState(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Build FAQ data from translations
    const categoryCount = parseInt(t('categoryCount'));
    const FAQ_DATA = [];
    for (let c = 0; c < categoryCount; c++) {
        const itemCount = parseInt(t(`cat${c}count`));
        const items = [];
        for (let q = 0; q < itemCount; q++) {
            items.push({
                q: t(`cat${c}q${q}`),
                a: t(`cat${c}a${q}`)
            });
        }
        FAQ_DATA.push({
            category: t(`cat${c}`),
            items
        });
    }

    return (
        <main>
            {/* Header Section */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0 0 0" }}>
                <div className="container">
                    <RevealOnScroll>
                        <p style={{
                            textAlign: "center",
                            color: "var(--color-primary)",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-md)"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400,
                            lineHeight: 1.1
                        }}>
                            {t('titleLine1')} <br />
                            <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>{t('titleLine2')}</span>
                        </h1>
                    </RevealOnScroll>
                </div>
            </section>

            {/* FAQ Sections */}
            <div className="container" style={{ paddingBottom: "var(--spacing-xl)" }}>
                {FAQ_DATA.map((section, catIndex) => (
                    <section key={catIndex} style={{ marginBottom: "var(--spacing-lg)" }}>
                        <RevealOnScroll>
                            <h2 style={{
                                fontSize: "1.5rem",
                                color: "var(--color-primary)",
                                marginBottom: "var(--spacing-md)",
                                borderLeft: "2px solid var(--color-primary)",
                                paddingLeft: "1rem"
                            }}>
                                {section.category}
                            </h2>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {section.items.map((item, qIndex) => {
                                    const id = `${catIndex}-${qIndex}`;
                                    const isOpen = openState[id];

                                    return (
                                        <div
                                            key={qIndex}
                                            style={{
                                                background: "var(--color-surface)",
                                                border: "1px solid var(--color-surface-hover)",
                                                borderRadius: "var(--radius-sm)",
                                                overflow: 'hidden',
                                                transition: "border-color 0.3s ease"
                                            }}
                                            className={isOpen ? "border-primary" : ""}
                                        >
                                            <button
                                                onClick={() => toggle(id)}
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "1.5rem",
                                                    background: "transparent",
                                                    color: isOpen ? "var(--color-primary)" : "var(--color-text-main)",
                                                    fontSize: "1.2rem",
                                                    textAlign: "left",
                                                    fontFamily: "var(--font-heading)",
                                                    transition: "color 0.3s ease"
                                                }}
                                            >
                                                {item.q}
                                                <ChevronDown
                                                    style={{
                                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                        transition: "transform 0.3s ease",
                                                        color: "var(--color-primary)"
                                                    }}
                                                />
                                            </button>

                                            <div style={{
                                                maxHeight: isOpen ? "500px" : "0",
                                                overflow: "hidden",
                                                transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                                opacity: isOpen ? 1 : 0.5
                                            }}>
                                                <div style={{
                                                    padding: "0 1.5rem 1.5rem 1.5rem",
                                                    color: "var(--color-text-muted)",
                                                    lineHeight: 1.8,
                                                    fontSize: "1rem"
                                                }}>
                                                    {item.a}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </RevealOnScroll>
                    </section>
                ))}
            </div>

            <style jsx>{`
                .border-primary {
                    border-color: var(--color-primary) !important;
                }
            `}</style>
        </main>
    );
}
