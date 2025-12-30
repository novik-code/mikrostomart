import Image from "next/image";
import YouTubeFeed from "@/components/YouTubeFeed";
import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function Home() {
    return (
        <main>
            {/* Hero Section - Minimalist & Impactful */}
            <section className="section hero" style={{
                minHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
                overflow: "hidden", // Important for absolute video
                padding: "0 var(--spacing-sm)"
            }}>


                <div className="container" style={{ maxWidth: "1000px", zIndex: 1 }}>
                    <RevealOnScroll animation="blur-in">
                        <p style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: "var(--color-primary)",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-sm)"
                        }}>
                            Mikroskopowa Stomatologia Artystyczna
                        </p>
                    </RevealOnScroll>

                    <RevealOnScroll animation="blur-in" delay={100}>
                        <h1 style={{
                            fontSize: "clamp(3rem, 7vw, 6rem)",
                            marginBottom: "var(--spacing-md)",
                            lineHeight: 1.1,
                            fontWeight: 400
                        }}>
                            Tworzymy uśmiechy, <br />
                            <span style={{ fontStyle: "italic", color: "var(--color-primary-light)" }}>które zmieniają życie.</span>
                        </h1>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={200}>
                        <p style={{
                            fontSize: "1.1rem",
                            opacity: 0.8,
                            maxWidth: "600px",
                            margin: "0 auto var(--spacing-lg)",
                            lineHeight: 1.8
                        }}>
                            W Mikrostomart łączymy precyzję technologii z wrażliwością sztuki.
                            Odkryj stomatologię, która przywraca pewność siebie.
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-md)", justifyContent: "center" }}>
                            <Link href="/rezerwacja" className="btn-primary" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}>
                                Umów Konsultację
                            </Link>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Values Section - Clean Grid */}
            <section className="section container">
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "var(--spacing-lg)",
                    borderTop: "1px solid var(--color-surface-hover)",
                    paddingTop: "var(--spacing-lg)"
                }}>
                    <RevealOnScroll delay={0}>
                        <div>
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-sm)", color: "var(--color-primary)" }}>Precyzja</h3>
                            <p style={{ color: "var(--color-text-muted)" }}>
                                Leczenie pod mikroskopem to nasz standard. Widzimy więcej, by leczyć skuteczniej i oszczędzać Twoje zęby.
                            </p>
                        </div>
                    </RevealOnScroll>
                    <RevealOnScroll delay={100}>
                        <div>
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-sm)", color: "var(--color-primary)" }}>Estetyka</h3>
                            <p style={{ color: "var(--color-text-muted)" }}>
                                Projektujemy uśmiechy w harmonii z Twoją twarzą. Naturalność jest dla nas najwyższą formą piękna.
                            </p>
                        </div>
                    </RevealOnScroll>
                    <RevealOnScroll delay={200}>
                        <div>
                            <h3 style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-sm)", color: "var(--color-primary)" }}>Komfort</h3>
                            <p style={{ color: "var(--color-text-muted)" }}>
                                Bezbolesne znieczulenia komputerowe i atmosfera, która pozwala zapomnieć, że jesteś u dentysty.
                            </p>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Narrative Section - Side by Side */}
            <section className="section" style={{ background: "var(--color-surface)" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center"
                    }}>
                        <div style={{ order: 2 }}>
                            {/* Placeholder for Metamorphosis Image */}
                            <RevealOnScroll animation="blur-in">
                                <div style={{
                                    width: "100%",
                                    height: "500px",
                                    background: "#08090a",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--color-surface-hover)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--color-text-muted)"
                                }}>
                                    [METAMORFOZA - PRZED/PO]
                                </div>
                            </RevealOnScroll>
                        </div>
                        <div style={{ order: 1 }}>
                            <RevealOnScroll>
                                <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)" }}>
                                    Twoja droga do <br />
                                    <span style={{ color: "var(--color-primary)" }}>nowego uśmiechu</span>
                                </h2>
                                <p style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)" }}>
                                    Nie musisz wiedzieć, jakiego zabiegu potrzebujesz. To my jesteśmy od tego, by wskazać Ci najlepszą drogę.
                                </p>
                                <p style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-muted)" }}>
                                    Od drobnych korekt estetycznych po kompleksowe rekonstrukcje zgryzu. Zobacz, jak zmieniliśmy życie naszych pacjentów.
                                </p>
                                <Link href="/oferta" style={{
                                    textDecoration: "underline",
                                    textUnderlineOffset: "4px",
                                    color: "var(--color-text-main)"
                                }}>
                                    Zobacz nasze realizacje →
                                </Link>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>

            <YouTubeFeed />
        </main>
    );
}
