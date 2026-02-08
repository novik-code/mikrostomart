import MetamorphosisGallery from "@/components/MetamorphosisGallery";
import RevealOnScroll from "@/components/RevealOnScroll";
import { Suspense } from "react";
import MetamorphosisContent from "./MetamorphosisContent";

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
                    <Suspense fallback={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1.5rem' }}>
                            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(212,175,55,0.15)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Ładowanie galerii...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    }>
                        <MetamorphosisContent />
                    </Suspense>
                </RevealOnScroll>
            </div>
        </main>
    );
}
