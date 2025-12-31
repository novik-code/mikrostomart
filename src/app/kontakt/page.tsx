import RevealOnScroll from "@/components/RevealOnScroll";
import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
    return (
        <main>
            <section className="section" style={{ paddingBottom: 0 }}>
                <div className="container">
                    <RevealOnScroll>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 6rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400
                        }}>
                            Kontakt
                        </h1>
                    </RevealOnScroll>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "var(--spacing-xl)" }}>

                        {/* Contact Info */}
                        <RevealOnScroll delay={100} className="h-full">
                            <div style={{ padding: "var(--spacing-lg)", background: "var(--color-surface)", borderRadius: "2px", height: "100%" }}>
                                <h2 style={{ marginBottom: "var(--spacing-lg)", color: "var(--color-primary)" }}>Odwiedź Nas</h2>

                                <div style={{ marginBottom: "var(--spacing-lg)" }}>
                                    <p style={{ color: "var(--color-text-main)", fontSize: "1.2rem", lineHeight: 1.6 }}>
                                        ul. Centralna 33a<br />
                                        45-940 Opole / Chmielowice
                                    </p>
                                </div>

                                <div style={{ marginBottom: "var(--spacing-lg)" }}>
                                    <a href="tel:570270470" style={{
                                        display: "block",
                                        color: "var(--color-primary)",
                                        fontSize: "2rem",
                                        fontWeight: "bold",
                                        marginBottom: "var(--spacing-xs)"
                                    }}>
                                        570 270 470
                                    </a>
                                    <a href="mailto:gabinet@mikrostomart.pl" style={{ color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                                        gabinet@mikrostomart.pl
                                    </a>
                                </div>

                                <div style={{ borderTop: "1px solid var(--color-surface-hover)", paddingTop: "var(--spacing-lg)" }}>
                                    <p style={{ marginBottom: "var(--spacing-xs)", color: "var(--color-text-muted)" }}>GODZINY OTWARCIA</p>
                                    <ul style={{ listStyle: "none", color: "var(--color-text-main)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                        <li><strong>Pon - Czw:</strong> 9.00 - 20.00</li>
                                        <li><strong>Piątek:</strong> 9.00 - 16.00</li>
                                        <li><strong>Sobota:</strong> Wybrane terminy</li>
                                    </ul>
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Map Placeholder */}
                        <RevealOnScroll delay={200} className="h-full">
                            <div style={{
                                borderRadius: "2px",
                                overflow: "hidden",
                                minHeight: "500px",
                                height: "100%",
                                width: "100%",
                                position: "relative"
                            }}>
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2528.274384666504!2d17.86616297693526!3d50.677682371636184!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471053a479cde783%3A0xe544973347f32770!2sCentralna%2033a%2C%2045-940%20Opole!5e0!3m2!1spl!2spl!4v1714488800000!5m2!1spl!2spl"
                                    style={{ border: 0, width: "100%", height: "100%", filter: "grayscale(100%) invert(10%) contrast(80%)" }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </RevealOnScroll>

                    </div>
                </div>
            </section>

            {/* Simple Contact Form */}
            <section className="section">
                <div className="container" style={{ maxWidth: "700px" }}>
                    <RevealOnScroll animation="fade-up">
                        <h2 style={{ textAlign: "center", marginBottom: "var(--spacing-lg)", fontSize: "2rem", fontWeight: 400 }}>
                            Masz pytania? <span style={{ color: "var(--color-primary)" }}>Napisz.</span>
                        </h2>
                        <ContactForm />
                    </RevealOnScroll>
                </div>
            </section>
        </main>
    );
}
