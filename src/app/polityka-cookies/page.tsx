import { Cookie, Settings, BarChart3, ShieldCheck } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export const metadata = {
    title: "Polityka Cookies | Mikrostomart Opole",
    description: "Informacje o plikach cookies używanych na stronie gabinetu stomatologicznego Mikrostomart w Opolu.",
};

export default function CookiesPage() {
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
                    background: "radial-gradient(ellipse at center top, rgba(220,177,74,0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <RevealOnScroll>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "50%",
                                background: "rgba(220,177,74,0.1)", border: "1px solid rgba(220,177,74,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <Cookie size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            Pliki Cookies
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                            marginBottom: "0.75rem", lineHeight: 1.2
                        }}>
                            Polityka Plików Cookies
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "500px", margin: "0 auto" }}>
                            Transparentność w wykorzystaniu technologii
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content Cards */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <RevealOnScroll animation="fade-up">
                        <CookieCard icon={<Cookie size={22} color="var(--color-primary)" />} title="Czym są pliki cookies?">
                            <p>Są to niewielkie pliki tekstowe wysyłane przez serwer www i przechowywane przez oprogramowanie komputera przeglądarki. Kiedy przeglądarka ponownie połączy się ze stroną, witryna rozpoznaje rodzaj urządzenia, z którego łączy się użytkownik.</p>
                        </CookieCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={100}>
                        <CookieCard icon={<BarChart3 size={22} color="var(--color-primary)" />} title="Do czego ich używamy?">
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                <CookieLi>Zapamiętywanie preferencji użytkownika (np. zgoda na cookies).</CookieLi>
                                <CookieLi>Tworzenie anonimowych statystyk, które pomagają zrozumieć, w jaki sposób użytkownicy korzystają ze strony.</CookieLi>
                                <CookieLi>Zapewnienie bezpieczeństwa i niezawodności serwisu.</CookieLi>
                            </ul>
                        </CookieCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={200}>
                        <CookieCard icon={<Settings size={22} color="var(--color-primary)" />} title="Zarządzanie plikami cookies">
                            <p>Użytkownik może w każdej chwili zmienić ustawienia dotyczące plików cookies. Ograniczenie stosowania plików cookies może wpłynąć na niektóre funkcjonalności dostępne na stronie internetowej.</p>
                        </CookieCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={300}>
                        <CookieCard icon={<ShieldCheck size={22} color="var(--color-primary)" />} title="Rodzaje cookies">
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                <CookieLi><strong style={{ color: "var(--color-text-main)" }}>Niezbędne</strong> — wymagane do prawidłowego działania strony (np. sesja, zgoda cookies).</CookieLi>
                                <CookieLi><strong style={{ color: "var(--color-text-main)" }}>Analityczne</strong> — anonimowe statystyki pomagające ulepszać stronę.</CookieLi>
                                <CookieLi><strong style={{ color: "var(--color-text-main)" }}>Funkcjonalne</strong> — zapamiętywanie Twoich preferencji i ustawień.</CookieLi>
                            </ul>
                        </CookieCard>
                    </RevealOnScroll>

                </div>
            </section>
        </main>
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
                    background: "rgba(220,177,74,0.08)", border: "1px solid rgba(220,177,74,0.15)",
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
