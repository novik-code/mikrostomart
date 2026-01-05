"use client";

import RevealOnScroll from "@/components/RevealOnScroll";
import ReservationForm from "@/components/ReservationForm";

export default function ReservationPage() {
    return (
        <main>
            <section className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="container" style={{ maxWidth: "600px", width: "100%" }}>
                    <RevealOnScroll>
                        <h1 style={{ textAlign: "center", marginBottom: "var(--spacing-lg)", color: "var(--color-primary)", fontSize: "clamp(2rem, 5vw, 3rem)" }}>
                            Umów Wizytę
                        </h1>
                        <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "var(--spacing-xl)" }}>
                            Wypełnij formularz wprowadzając preferowaną datę i godzinę wizyty, a my oddzwonimy celem potwierdzenia terminu lub propozycją alternatywną
                        </p>
                    </RevealOnScroll>

                    <RevealOnScroll delay={100}>
                        <ReservationForm />
                    </RevealOnScroll>
                </div>
            </section>
        </main>
    );
}
