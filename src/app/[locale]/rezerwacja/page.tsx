"use client";

import { useTranslations } from "next-intl";
import { brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from "@/components/RevealOnScroll";
import ReservationForm from "@/components/ReservationForm";

export default function ReservationPage() {
    const t = useTranslations('rezerwacja');

    return (
        <main>
            <section className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="container" style={{ maxWidth: "600px", width: "100%" }}>
                    <RevealOnScroll>
                        <h1 style={{ textAlign: "center", marginBottom: "var(--spacing-lg)", color: "var(--color-primary)", fontSize: "clamp(2rem, 5vw, 3rem)" }}>
                            {t('title')}
                        </h1>
                        <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginBottom: "var(--spacing-xl)" }}>
                            {t('description', brandI18nParams())}
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
