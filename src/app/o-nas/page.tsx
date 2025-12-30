import Image from "next/image";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function AboutPage() {
    return (
        <main>
            {/* Intro Section - Editorial Style */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0" }}>
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
                            Dziedzictwo i Pasja
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400,
                            lineHeight: 1.1
                        }}>
                            Rodzinna Klinika <br />
                            <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>z tradycjami.</span>
                        </h1>
                    </RevealOnScroll>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "stretch"
                    }}>
                        <RevealOnScroll animation="blur-in" delay={100}>
                            <div style={{
                                minHeight: "500px",
                                background: "var(--color-surface)",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--color-surface-hover)"
                            }}>
                                <span style={{ color: "var(--color-text-muted)" }}>[FOTOGRAFIA KLINIKI - WNĘTRZE]</span>
                            </div>
                        </RevealOnScroll>

                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <RevealOnScroll delay={200}>
                                <h3 style={{ fontSize: "2rem", marginBottom: "var(--spacing-md)", color: "var(--color-primary)" }}>
                                    Misja
                                </h3>
                                <p style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                    Jesteśmy zespołem profesjonalistów, prowadzących rodzinną klinikę stomatologiczną w Opolu.
                                    Naszą misją jest dbanie o to, by Twój uśmiech był nie tylko piękny, ale przede wszystkim zdrowy.
                                </p>
                                <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                    W Mikrostomart łączymy wieloletnie doświadczenie z najnowszymi osiągnięciami technologii medycznej.
                                    Specjalizujemy się w stomatologii mikroskopowej, co pozwala nam na osiągnięcie niespotykanej precyzji leczenia.
                                </p>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>

            {/* Expert Section - Darker Background */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center"
                    }}>
                        <RevealOnScroll animation="blur-in" className="order-2-mobile" delay={100}>
                            <div style={{
                                height: "600px",
                                background: "#08090a",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                order: 1, /* Image on left */
                                border: "1px solid #2a2a2a" // Subtly highlighted border
                            }}>
                                <span style={{ color: "var(--color-text-muted)" }}>[PORTRET: lek. stom. Marcin Nowosielski]</span>
                            </div>
                        </RevealOnScroll>

                        <div style={{ paddingLeft: "var(--spacing-md)" }}>
                            <RevealOnScroll>
                                <p style={{
                                    color: "var(--color-primary)",
                                    marginBottom: "var(--spacing-sm)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em"
                                }}>
                                    Główny Lekarz
                                </p>
                                <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)", lineHeight: 1.1 }}>
                                    lek. stom. <br /> Marcin Nowosielski
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "var(--spacing-md)",
                                    color: "var(--color-text-main)",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid var(--color-primary)",
                                    paddingLeft: "var(--spacing-md)"
                                }}>
                                    "Wierzę, że precyzja to klucz do trwałości. Dlatego w mojej pracy mikroskop nie jest dodatkiem, a standardem."
                                </blockquote>
                                <p style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)" }}>
                                    Pasjonat stomatologii mikroskopowej. Swoją praktykę opiera na indywidualnym podejściu do pacjenta
                                    oraz ciągłym podnoszeniu kwalifikacji na kursach w kraju i za granicą.
                                </p>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
