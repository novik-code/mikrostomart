import RevealOnScroll from "@/components/RevealOnScroll";

export default function OfferPage() {
    const services = [
        {
            title: "Leczenie pod Mikroskopem",
            description: "Najwyższa precyzja w leczeniu kanałowym (endodoncja). Uratujemy zęby, które inni spisali na straty.",
            priceStart: "od 800 PLN"
        },
        {
            title: "Stomatologia Zachowawcza",
            description: "Estetyczne wypełnienia, odbudowy kompozytowe i leczenie próchnicy z dbałością o naturalny wygląd.",
            priceStart: "od 300 PLN"
        },
        {
            title: "Chirurgia i Implanty",
            description: "Bezbolesne usuwanie ósemek, implantacja i odbudowa braków zębowych.",
            priceStart: "od 500 PLN"
        },
        {
            title: "Protetyka",
            description: "Licówki, korony pełnoceramiczne i mosty. Projektujemy nowy uśmiech cyfrowo.",
            priceStart: "od 2000 PLN"
        },
        {
            title: "Profilaktyka",
            description: "Profesjonalne czyszczenie (skaling, piaskowanie) i instruktaż higieny.",
            priceStart: "od 250 PLN"
        },
        {
            title: "RTG Diagnostyka",
            description: "Na miejscu wykonujemy zdjęcia punktowe i pantomograficzne. Pełna diagnostyka w jednym gabinecie.",
            priceStart: "od 50 PLN"
        }
    ];

    return (
        <main>
            <section className="section" style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="container" style={{ textAlign: "center" }}>
                    <RevealOnScroll>
                        <p style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: "var(--color-primary)",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-md)"
                        }}>
                            Zakres Usług
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-md)",
                            fontWeight: 400
                        }}>
                            Nasza Oferta
                        </h1>
                        <p style={{ maxWidth: "600px", margin: "0 auto", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                            Kompleksowa opieka stomatologiczna na najwyższym poziomie.
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            <section className="section" style={{ background: "var(--color-surface)" }}>
                <div className="container" style={{ maxWidth: "900px" }}>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        {services.map((service, index) => (
                            <RevealOnScroll key={index} delay={index % 3 * 100 as 0 | 100 | 200}>
                                <div style={{
                                    padding: "var(--spacing-lg) 0",
                                    borderBottom: "1px solid var(--color-surface-hover)",
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: "var(--spacing-md)",
                                    alignItems: "baseline"
                                }}>
                                    <div>
                                        <h3 style={{
                                            fontSize: "2rem",
                                            marginBottom: "var(--spacing-sm)",
                                            color: "var(--color-text-main)",
                                            fontWeight: 400
                                        }}>
                                            {service.title}
                                        </h3>
                                        <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--spacing-md)", maxWidth: "80%" }}>
                                            {service.description}
                                        </p>
                                        <a href="/rezerwacja" style={{
                                            color: "var(--color-primary)",
                                            fontSize: "0.9rem",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            textDecoration: "underline",
                                            textUnderlineOffset: "4px"
                                        }}>
                                            Umów wizytę →
                                        </a>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>

                    <div style={{ marginTop: "var(--spacing-xl)", textAlign: "center" }}>
                        <RevealOnScroll animation="fade-up">
                            <a href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem" }}>
                                Skontaktuj się z nami
                            </a>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>
        </main>
    );
}
