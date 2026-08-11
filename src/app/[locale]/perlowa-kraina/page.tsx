"use client";

import { Sparkles, HelpCircle, Mail, ShieldCheck, Building2, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import { brand } from "@/lib/brandConfig";

// Publiczny adres recepcji NA SZTYWNO — ten sam wzorzec co na /usun-konto:
// `brand.email` bywa po stronie klienta nadpisywany z DB (site_settings)
// wartością noreply@, a to jest adres, którym rodzic zgłasza żądanie usunięcia
// danych dziecka. Musi być pewny i musi się zgadzać z tym w polityce.
const CONTACT_EMAIL = 'gabinet@mikrostomart.pl';

/**
 * Strona wsparcia aplikacji „Perłowa Kraina" — adres podawany w App Store
 * Connect (Support URL) i w Play Console (Website).
 *
 * 🔑 Adresatem jest RODZIC, nie dziecko: apka dla dzieci nie ma prawa wysyłać
 * dziecka do przeglądarki bez bramki rodzicielskiej, więc ta strona nie jest
 * linkowana z aplikacji ani razu. Trafia się tu ze sklepu.
 *
 * ⚠️ Zero obietnic zdrowotnych. To aplikacja edukacyjno-motywacyjna i strona
 * mówi to wprost na dole — zdanie o „nie zastępuje wizyty" jest tu celowo,
 * a nie dla ozdoby.
 */
export default function PerlowaKrainaPage() {
    const t = useTranslations('perlowaKraina');
    const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('mailSubject'))}`;

    const facts = (['fact1', 'fact2', 'fact3', 'fact4', 'fact5', 'fact6'] as const).map((k) => t(k));
    const faq = ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => ({
        q: t(`faq${n}Q`),
        a: t(`faq${n}A`),
    }));

    return (
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero */}
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
                                <Sparkles size={28} color="var(--color-primary)" />
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
                        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "620px", margin: "0 auto" }}>
                            {t('subtitle')}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <RevealOnScroll animation="fade-up">
                        <Card icon={<Info size={22} color="var(--color-primary)" />} title={t('aboutTitle')}>
                            <p style={{ marginBottom: "1.25rem" }}>{t('aboutBody')}</p>
                            <h3 style={{
                                fontFamily: "var(--font-heading)", fontSize: "1rem",
                                color: "var(--color-text-main)", margin: "0 0 0.75rem 0"
                            }}>
                                {t('factsTitle')}
                            </h3>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {facts.map((f) => (
                                    <li key={f} style={{ padding: "0.35rem 0 0.35rem 1.25rem", position: "relative" }}>
                                        <span style={{
                                            position: "absolute", left: 0, top: "0.8rem", width: "4px", height: "4px",
                                            borderRadius: "50%", background: "var(--color-primary)", opacity: 0.5
                                        }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={100}>
                        <Card icon={<HelpCircle size={22} color="var(--color-primary)" />} title={t('faqTitle')}>
                            {/* <details> zamiast akordeonu na stanie: treść jest w DOM od
                                pierwszego renderu, więc czyta ją zarówno Googlebot, jak
                                i recenzent sklepu, który nie kliknie w nic. */}
                            {faq.map((item, i) => (
                                <details
                                    key={item.q}
                                    style={{
                                        borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                                        padding: "0.9rem 0"
                                    }}
                                >
                                    <summary style={{
                                        cursor: "pointer", color: "var(--color-text-main)",
                                        fontWeight: 600, fontSize: "0.95rem", listStyle: "revert"
                                    }}>
                                        {item.q}
                                    </summary>
                                    <p style={{ margin: "0.7rem 0 0 0" }}>{item.a}</p>
                                </details>
                            ))}
                        </Card>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={150}>
                        <Card icon={<ShieldCheck size={22} color="var(--color-primary)" />} title={t('privacyTitle')}>
                            <p style={{ marginBottom: "1rem" }}>{t('privacyBody')}</p>
                            {/* next-intl Link — bez niego odnośnik gubi prefiks locale
                                i rodzic z /de/... ląduje na polskiej wersji dokumentu */}
                            <Link
                                href="/perlowa-kraina/prywatnosc"
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                    border: "1px solid rgba(var(--color-primary-rgb),0.35)",
                                    color: "var(--color-primary)",
                                    padding: "0.7rem 1.4rem", borderRadius: "var(--radius-md)",
                                    fontWeight: 600, textDecoration: "none", fontSize: "0.95rem"
                                }}
                            >
                                <ShieldCheck size={18} />
                                {t('privacyCta')}
                            </Link>
                        </Card>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={200}>
                        <Card icon={<Mail size={22} color="var(--color-primary)" />} title={t('contactTitle')}>
                            <p style={{ marginBottom: "1rem" }}>{t('contactBody', { contactEmail: CONTACT_EMAIL })}</p>
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
                                {t('contactCta')}
                            </a>
                        </Card>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={250}>
                        <Card icon={<Building2 size={22} color="var(--color-primary)" />} title={t('operatorTitle')}>
                            <p style={{ marginBottom: "0.9rem" }}>
                                {t('operatorBody', {
                                    legalName: brand.legalEntity?.name ?? brand.name,
                                    street: brand.streetAddress,
                                    postal: brand.postalCode,
                                    city: brand.city,
                                    nip: brand.legalEntity?.nip ?? '',
                                    krs: brand.legalEntity?.krs ?? '',
                                })}
                            </p>
                            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.75 }}>{t('disclaimer')}</p>
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
            <div style={{ color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.92rem" }}>
                {children}
            </div>
        </div>
    );
}
