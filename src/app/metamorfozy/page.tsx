import MetamorphosisGallery from "@/components/MetamorphosisGallery";
import RevealOnScroll from "@/components/RevealOnScroll";

export const metadata = {
    title: 'Metamorfozy | Mikrostomart Opole',
    description: 'Zobacz niesamowite efekty leczenia w Mikrostomart. Galeria zdjęć przed i po zabiegach.',
};

export default function MetamorfozyPage() {
    return (
        <main style={{ padding: "var(--navbar-height) 0 4rem" }}>
            <div className="container">
                <RevealOnScroll animation="fade-up">
                    <header style={{ textAlign: "center", marginBottom: "4rem" }}>
                        <p style={{
                            color: "var(--color-primary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            marginBottom: "1rem"
                        }}>
                            Galeria Uśmiechów
                        </p>
                        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                            Metamorfozy Pacjentów
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
                            Zobacz, jak zmieniamy życie naszych pacjentów poprzez precyzyjną stomatologię i dbałość o estetykę. Każdy uśmiech to inna historia.
                        </p>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll animation="blur-in" delay={100}>
                    <MetamorphosisGallery />
                </RevealOnScroll>
            </div>
        </main>
    );
}
