"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";

// K-3+ follow-up (2026-05-21): galeria zdjęć ze szkoleń prowadzonych przez Marcina.
// Strategia social proof — pokazać Marcina jako trenera + autorytet branżowy.
// Subtelne wzmianki dr Michał Nawrocki (mentor — pierwsza osoba w PL z M.Sc. RWTH)
// + prof. Kinga Grzech-Leśniak (Prezes PTSL, ekspert laseroterapii) jako kursanci.
//
// Captions czerpane z i18n namespace `oNasBrand.training.photoN.{title,caption}`.
// 6 zdjęć w grid auto-fit, każde z hover lift + caption visible always (subtle).

interface TrainingPhoto {
    file: string;
    titleKey: string;
    captionKey: string;
    aspectRatio: "portrait" | "landscape";
    /** Jeśli true, wymienia konkretną osobę — caption renderuje też nazwisko. */
    feature?: boolean;
}

const PHOTOS: TrainingPhoto[] = [
    {
        file: "01-nawrocki.webp",
        titleKey: "training.photo1.title",
        captionKey: "training.photo1.caption",
        aspectRatio: "portrait",
        feature: true,
    },
    {
        file: "02-grzech-lesniak.webp",
        titleKey: "training.photo2.title",
        captionKey: "training.photo2.caption",
        aspectRatio: "portrait",
        feature: true,
    },
    {
        file: "03-keynote-fotona.webp",
        titleKey: "training.photo3.title",
        captionKey: "training.photo3.caption",
        aspectRatio: "portrait",
    },
    {
        file: "04-warsztat-mikroskop.webp",
        titleKey: "training.photo4.title",
        captionKey: "training.photo4.caption",
        aspectRatio: "landscape",
    },
    {
        file: "05-grupa-warsztat.webp",
        titleKey: "training.photo5.title",
        captionKey: "training.photo5.caption",
        aspectRatio: "landscape",
    },
    {
        file: "06-grupa-certyfikaty.webp",
        titleKey: "training.photo6.title",
        captionKey: "training.photo6.caption",
        aspectRatio: "landscape",
    },
];

export default function TrainingGallery() {
    const t = useTranslations("oNasBrand");

    return (
        <section
            className="section"
            style={{
                padding: "var(--spacing-xl) 0",
                borderTop: "1px solid var(--color-surface-hover)",
            }}
        >
            <div className="container">
                <RevealOnScroll>
                    <header
                        style={{
                            textAlign: "center",
                            maxWidth: 820,
                            margin: "0 auto var(--spacing-xl)",
                        }}
                    >
                        <p
                            style={{
                                color: "var(--color-primary)",
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                fontSize: "0.85rem",
                                marginBottom: "var(--spacing-sm)",
                            }}
                        >
                            {t("training.eyebrow")}
                        </p>
                        <h2
                            style={{
                                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                                fontWeight: 400,
                                fontFamily: "var(--font-heading)",
                                marginBottom: "var(--spacing-md)",
                                lineHeight: 1.1,
                            }}
                        >
                            {t("training.heading")}
                        </h2>
                        <p
                            style={{
                                fontSize: "1.05rem",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.7,
                            }}
                        >
                            {t("training.lead")}
                        </p>
                    </header>
                </RevealOnScroll>

                <div className="training-grid">
                    {PHOTOS.map((p, idx) => (
                        <RevealOnScroll key={p.file} delay={80 + idx * 50}>
                            <figure className={`training-card ${p.feature ? "training-card-feature" : ""}`}>
                                <div className={`training-img-wrap training-img-${p.aspectRatio}`}>
                                    <Image
                                        src={`/training/${p.file}`}
                                        alt={t(p.titleKey)}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
                                        style={{ objectFit: "cover" }}
                                    />
                                </div>
                                <figcaption>
                                    <h3>{t(p.titleKey)}</h3>
                                    <p>{t(p.captionKey)}</p>
                                </figcaption>
                            </figure>
                        </RevealOnScroll>
                    ))}
                </div>

                <RevealOnScroll delay={400}>
                    <p
                        style={{
                            textAlign: "center",
                            color: "var(--color-text-muted)",
                            fontStyle: "italic",
                            marginTop: "var(--spacing-xl)",
                            maxWidth: 700,
                            margin: "var(--spacing-xl) auto 0",
                            fontSize: "0.95rem",
                            lineHeight: 1.65,
                        }}
                    >
                        {t("training.footnote")}
                    </p>
                </RevealOnScroll>
            </div>

            <style jsx>{`
                .training-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: var(--spacing-md);
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .training-card {
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--color-surface-hover);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
                }
                .training-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-primary);
                    box-shadow: 0 14px 36px rgba(212, 175, 55, 0.18);
                }
                .training-card-feature {
                    border-color: rgba(212, 175, 55, 0.4);
                }
                .training-img-wrap {
                    position: relative;
                    width: 100%;
                    background: #000;
                }
                .training-img-portrait {
                    aspect-ratio: 4 / 5;
                }
                .training-img-landscape {
                    aspect-ratio: 11 / 8;
                }
                figcaption {
                    padding: var(--spacing-sm) var(--spacing-md);
                }
                figcaption h3 {
                    font-size: 0.98rem;
                    font-weight: 500;
                    color: var(--color-text-main);
                    margin: 0 0 6px 0;
                    line-height: 1.35;
                }
                figcaption p {
                    font-size: 0.85rem;
                    color: var(--color-text-muted);
                    margin: 0;
                    line-height: 1.55;
                }
            `}</style>
        </section>
    );
}
