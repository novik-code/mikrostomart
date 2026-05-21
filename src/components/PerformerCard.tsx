"use client";

/**
 * PerformerCard — wizualna karta "Lekarz wykonujący ten zabieg" na service pages.
 *
 * Batch SEO-2 (2026-05-21, audyt Issue 4 P2):
 * Każda strona /oferta/* musi mieć VISIBLE link do bio wykonawcy zabiegu
 * (zarówno wizualnie dla user UX trust signal, jak i internal linking dla SEO).
 * Towarzyszy temu `MedicalProcedure.performer` w JSON-LD schema (rozszerzony w
 * serviceSchemas.ts).
 *
 * Dla 6 obecnych service pages (implantologia, leczenie-kanalowe,
 * stomatologia-estetyczna, ortodoncja, chirurgia, protetyka) performer = Marcin.
 * Komponent ma też wsparcie dla `ela` na wypadek przyszłej dedykowanej strony
 * higienizacji/profilaktyki.
 */

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Doctor = "marcin" | "ela";

interface PerformerCardProps {
    doctor: Doctor;
}

const DOCTOR_DATA: Record<Doctor, { image: string; href: string; nameKey: string; summaryKey: string }> = {
    marcin: {
        image: "/marcin-final.webp",
        href: "/zespol/marcin-nowosielski",
        nameKey: "marcinName",
        summaryKey: "marcinSummary",
    },
    ela: {
        image: "/ela-final.webp",
        href: "/zespol/elzbieta-nowosielska",
        nameKey: "elaName",
        summaryKey: "elaSummary",
    },
};

export default function PerformerCard({ doctor }: PerformerCardProps) {
    const t = useTranslations("performerCard");
    const data = DOCTOR_DATA[doctor];

    return (
        <aside
            aria-labelledby="performer-card-heading"
            style={{
                marginTop: "var(--spacing-xl)",
                marginBottom: "var(--spacing-xl)",
                padding: "var(--spacing-md)",
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-surface-hover)",
                borderBottom: "1px solid var(--color-surface-hover)",
                maxWidth: "900px",
                marginInline: "auto",
            }}
        >
            <div>
                <h2
                    id="performer-card-heading"
                    style={{
                        fontSize: "clamp(1.4rem, 3vw, 1.8rem)",
                        color: "var(--color-primary)",
                        marginBottom: "var(--spacing-md)",
                        marginTop: 0,
                        textAlign: "center",
                        fontWeight: 500,
                    }}
                >
                    {t("heading")}
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: "var(--spacing-md)",
                        alignItems: "center",
                        background: "var(--color-background)",
                        border: "1px solid var(--color-surface-hover)",
                        borderRadius: "2px",
                        padding: "var(--spacing-md)",
                    }}
                >
                    {/* Foto 120×120 — desktop. Na mobile auto-adjusts via container */}
                    <div
                        style={{
                            width: "120px",
                            height: "120px",
                            position: "relative",
                            flexShrink: 0,
                            overflow: "hidden",
                            borderRadius: "2px",
                            border: "1px solid var(--color-surface-hover)",
                        }}
                    >
                        <Image
                            src={data.image}
                            alt={t(data.nameKey)}
                            fill
                            sizes="120px"
                            style={{
                                objectFit: "cover",
                                objectPosition: doctor === "marcin" ? "top" : "center",
                            }}
                        />
                    </div>

                    <div>
                        <h3
                            style={{
                                fontSize: "1.15rem",
                                color: "var(--color-text-main)",
                                marginBottom: "0.4rem",
                                fontWeight: 600,
                            }}
                        >
                            {t(data.nameKey)}
                        </h3>
                        <p
                            style={{
                                fontSize: "0.95rem",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.5,
                                margin: 0,
                                marginBottom: "0.75rem",
                            }}
                        >
                            {t(data.summaryKey)}
                        </p>
                        <Link
                            href={data.href}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                color: "var(--color-primary)",
                                textDecoration: "none",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                letterSpacing: "0.03em",
                            }}
                        >
                            {t("viewBio")} →
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}
