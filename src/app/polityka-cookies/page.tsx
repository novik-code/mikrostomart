"use client";

import { Cookie, Settings, BarChart3, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import DemoPagePlaceholder from "@/components/DemoPagePlaceholder";

export default function CookiesPage() {
    const t = useTranslations('politykaCookies');

    return (
        <DemoPagePlaceholder pageTitle="Polityka Cookies" pageDescription="Polityka plików cookie — treść dostosowana indywidualnie do każdego klienta DensFlow.">
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
                                <Cookie size={28} color="var(--color-primary)" />
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
                            marginBottom: "0.75rem", lineHeight: 1.2
                        }}>
                            {t('title')}
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "500px", margin: "0 auto" }}>
                            {t('subtitle')}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content Cards */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <RevealOnScroll animation="fade-up">
                        <CookieCard icon={<Cookie size={22} color="var(--color-primary)" />} title={t('card1Title')}>
                            <p>{t('card1Text')}</p>
                        </CookieCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={100}>
                        <CookieCard icon={<BarChart3 size={22} color="var(--color-primary)" />} title={t('card2Title')}>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                <CookieLi>{t('card2Li1')}</CookieLi>
                                <CookieLi>{t('card2Li2')}</CookieLi>
                                <CookieLi>{t('card2Li3')}</CookieLi>
                            </ul>
                        </CookieCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={200}>
                        <CookieCard icon={<Settings size={22} color="var(--color-primary)" />} title={t('card3Title')}>
                            <p>{t('card3Text')}</p>
                        </CookieCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={300}>
                        <CookieCard icon={<ShieldCheck size={22} color="var(--color-primary)" />} title={t('card4Title')}>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                <CookieLi><strong style={{ color: "var(--color-text-main)" }}>{t('card4Essential')}</strong> — {t('card4EssentialDesc')}</CookieLi>
                                <CookieLi><strong style={{ color: "var(--color-text-main)" }}>{t('card4Analytics')}</strong> — {t('card4AnalyticsDesc')}</CookieLi>
                                <CookieLi><strong style={{ color: "var(--color-text-main)" }}>{t('card4Functional')}</strong> — {t('card4FunctionalDesc')}</CookieLi>
                            </ul>
                        </CookieCard>
                    </RevealOnScroll>

                </div>
            </section>
        </main>
        </DemoPagePlaceholder>
    );
}

function CookieCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: "var(--color-surface)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(1.5rem, 3vw, 2rem)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.3)"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: "rgba(var(--color-primary-rgb),0.08)", border: "1px solid rgba(var(--color-primary-rgb),0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                    {icon}
                </div>
                <h2 style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.15rem", color: "var(--color-text-main)", margin: 0
                }}>{title}</h2>
            </div>
            <div style={{ color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.92rem", paddingLeft: "calc(40px + 0.75rem)" }}>
                {children}
            </div>
        </div>
    );
}

function CookieLi({ children }: { children: React.ReactNode }) {
    return (
        <li style={{ padding: "0.4rem 0 0.4rem 1.25rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, top: "0.85rem", width: "4px", height: "4px", borderRadius: "50%", background: "var(--color-primary)", opacity: 0.5 }} />
            {children}
        </li>
    );
}
