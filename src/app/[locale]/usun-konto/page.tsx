"use client";

import { Trash2, Mail, Smartphone, Archive, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import { brand } from "@/lib/brandConfig";

// Publiczny adres recepcji NA SZTYWNO: `brand.email` bywa po stronie klienta nadpisywany
// z DB (site_settings) wartością noreply@ — na stronie żądań RODO adres musi być pewny.
const CONTACT_EMAIL = 'gabinet@mikrostomart.pl';

/**
 * Publiczna strona usunięcia konta (wymóg Google Play Data safety → account deletion URL):
 * musi oferować ścieżkę żądania usunięcia BEZ zawracania użytkownika do aplikacji
 * (tu: żądanie e-mail) + jasno opisywać ustawową retencję dokumentacji medycznej.
 * Ten sam URL podajemy w formularzu Data safety w Play Console.
 */
export default function DeleteAccountPage() {
    const t = useTranslations('usunKonto');
    const mailSubject = encodeURIComponent(t('mailSubject'));
    const mailHref = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}`;

    return (
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
                                <Trash2 size={28} color="var(--color-primary)" />
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
                        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "560px", margin: "0 auto" }}>
                            {t('subtitle')}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content Cards */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <RevealOnScroll animation="fade-up">
                        <Card icon={<Smartphone size={22} color="var(--color-primary)" />} title={t('inAppTitle')}>
                            <p>{t('inAppText')}</p>
                        </Card>
                    </RevealOnScroll>

                    {/* Ścieżka BEZ aplikacji — kluczowa dla wymogu Google */}
                    <RevealOnScroll animation="fade-up" delay={100}>
                        <Card icon={<Mail size={22} color="var(--color-primary)" />} title={t('emailTitle')}>
                            <p style={{ marginBottom: "0.75rem" }}>{t('emailIntro')}</p>
                            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem 0" }}>
                                {(['emailLi1', 'emailLi2', 'emailLi3'] as const).map((k) => (
                                    <li key={k} style={{ padding: "0.4rem 0 0.4rem 1.25rem", position: "relative" }}>
                                        <span style={{ position: "absolute", left: 0, top: "0.85rem", width: "4px", height: "4px", borderRadius: "50%", background: "var(--color-primary)", opacity: 0.5 }} />
                                        {t(k)}
                                    </li>
                                ))}
                            </ul>
                            <p style={{ marginBottom: "1rem" }}>{t('emailSla')}</p>
                            <a
                                href={mailHref}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                    background: "var(--color-primary)", color: "var(--color-background)",
                                    padding: "0.7rem 1.4rem", borderRadius: "var(--radius-md)",
                                    fontWeight: 600, textDecoration: "none", fontSize: "0.95rem"
                                }}
                            >
                                <Mail size={18} />
                                {t('emailCta', { contactEmail: CONTACT_EMAIL })}
                            </a>
                        </Card>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={150}>
                        <Card icon={<Archive size={22} color="var(--color-primary)" />} title={t('scopeTitle')}>
                            <p style={{ marginBottom: "0.75rem" }}>{t('scopeDeleted')}</p>
                            <p style={{ marginBottom: 0 }}>{t('scopeRetained')}</p>
                        </Card>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={200}>
                        <Card icon={<HelpCircle size={22} color="var(--color-primary)" />} title={t('contactTitle')}>
                            <p style={{ margin: 0 }}>{t('contactText', { contactEmail: CONTACT_EMAIL, contactPhone: brand.phone1 })}</p>
                        </Card>
                    </RevealOnScroll>

                </div>
            </section>
        </main>
    );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: "var(--color-surface)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(1.5rem, 3vw, 2rem)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
            transition: "border-color 0.3s ease"
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
