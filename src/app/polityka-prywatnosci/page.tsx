import { Lock, Mail, Shield, Database, UserCheck } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export const metadata = {
    title: "Polityka Prywatności | Mikrostomart Opole",
    description: "Polityka prywatności gabinetu stomatologicznego Mikrostomart w Opolu — jak przetwarzamy Twoje dane osobowe.",
};

export default function PrivacyPolicyPage() {
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
                                <Lock size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            Twoje Dane Pod Ochroną
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                            marginBottom: "0.75rem", lineHeight: 1.2
                        }}>
                            Polityka Prywatności
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "500px", margin: "0 auto" }}>
                            Dbamy o bezpieczeństwo Twoich danych osobowych
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content Cards */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <RevealOnScroll animation="fade-up">
                        <PolicyCard icon={<Database size={22} color="var(--color-primary)" />} title="I. Administrator Danych Osobowych">
                            <p>Administratorem Twoich danych osobowych jest Gabinet Stomatologiczny Mikrostomart z siedzibą w Opolu przy ul. Centralnej 33a.</p>
                        </PolicyCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={100}>
                        <PolicyCard icon={<Shield size={22} color="var(--color-primary)" />} title="II. Cele i Podstawy Przetwarzania">
                            <p style={{ marginBottom: "0.75rem" }}>Przetwarzamy Twoje dane w celu:</p>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                <li style={{ padding: "0.4rem 0 0.4rem 1.25rem", position: "relative" }}>
                                    <span style={{ position: "absolute", left: 0, top: "0.85rem", width: "4px", height: "4px", borderRadius: "50%", background: "var(--color-primary)", opacity: 0.5 }} />
                                    Rezerwacji wizyt i prowadzenia dokumentacji medycznej (zgodnie z ustawą o prawach pacjenta).
                                </li>
                                <li style={{ padding: "0.4rem 0 0.4rem 1.25rem", position: "relative" }}>
                                    <span style={{ position: "absolute", left: 0, top: "0.85rem", width: "4px", height: "4px", borderRadius: "50%", background: "var(--color-primary)", opacity: 0.5 }} />
                                    Kontaktu w sprawach organizacyjnych (potwierdzenie wizyty).
                                </li>
                                <li style={{ padding: "0.4rem 0 0.4rem 1.25rem", position: "relative" }}>
                                    <span style={{ position: "absolute", left: 0, top: "0.85rem", width: "4px", height: "4px", borderRadius: "50%", background: "var(--color-primary)", opacity: 0.5 }} />
                                    Odpowiedzi na zapytania przesłane przez formularz kontaktowy.
                                </li>
                            </ul>
                        </PolicyCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={200}>
                        <PolicyCard icon={<UserCheck size={22} color="var(--color-primary)" />} title="III. Twoje Prawa">
                            <p>Masz prawo do dostępu do swoich danych, ich sprostowania, usunięcia (w zakresie nie sprzecznym z obowiązkiem prowadzenia dokumentacji medycznej) oraz wniesienia skargi do organu nadzorczego.</p>
                        </PolicyCard>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={300}>
                        <PolicyCard icon={<Mail size={22} color="var(--color-primary)" />} title="IV. Kontakt">
                            <p>W sprawach ochrony danych osobowych prosimy o kontakt pod adresem email:{" "}
                                <a href="mailto:gabinet@mikrostomart.pl" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                                    gabinet@mikrostomart.pl
                                </a>.
                            </p>
                        </PolicyCard>
                    </RevealOnScroll>

                </div>
            </section>
        </main>
    );
}

function PolicyCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
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
