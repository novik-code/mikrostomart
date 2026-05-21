"use client";

import { useTranslations } from "next-intl";
import { MARCIN_PUBLICATIONS, MARCIN_LECTURES } from "@/data/marcin-cv";
import RevealOnScroll from "@/components/RevealOnScroll";

// 2-col grid (desktop) / stack (mobile): publikacje LEWA + wystąpienia PRAWA.
// Każdy entry: type badge + year + title + venue (+ optional issue/location/url).

export default function PublicationsList() {
    const t = useTranslations("oNasBrand");

    const pubTypeLabel = (type: "book" | "magazine" | "conference") => {
        if (type === "book") return t("pubs.typeBook");
        if (type === "magazine") return t("pubs.typeMagazine");
        return t("pubs.typeConference");
    };

    const lectureTypeLabel = (type: "symposium" | "workshop" | "keynote" | "panel") => {
        if (type === "symposium") return t("lectures.typeSymposium");
        if (type === "workshop") return t("lectures.typeWorkshop");
        if (type === "keynote") return t("lectures.typeKeynote");
        return t("lectures.typePanel");
    };

    return (
        <section
            className="section"
            style={{
                padding: "var(--spacing-xl) 0",
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
                            {t("publicationsEyebrow")}
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
                            {t("publicationsHeading")}
                        </h2>
                        <p
                            style={{
                                fontSize: "1.05rem",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.6,
                            }}
                        >
                            {t("publicationsLead")}
                        </p>
                    </header>
                </RevealOnScroll>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "var(--spacing-xl)",
                        maxWidth: 1100,
                        margin: "0 auto",
                    }}
                >
                    {/* Publikacje */}
                    <RevealOnScroll delay={100}>
                        <div>
                            <h3
                                style={{
                                    fontSize: "1.25rem",
                                    fontWeight: 500,
                                    color: "var(--color-text-main)",
                                    marginBottom: "var(--spacing-md)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <span aria-hidden="true">📚</span>
                                {t("publicationsColPubs")}
                            </h3>
                            <ul
                                style={{
                                    listStyle: "none",
                                    padding: 0,
                                    margin: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "var(--spacing-sm)",
                                }}
                            >
                                {MARCIN_PUBLICATIONS.map((pub) => {
                                    const inner = (
                                        <article className="pub-card">
                                            <div className="pub-meta">
                                                <span className="pub-badge">{pubTypeLabel(pub.type)}</span>
                                                <span className="pub-year">{pub.year}</span>
                                            </div>
                                            <h4>{t(pub.titleKey)}</h4>
                                            <p className="pub-venue">{t(pub.venueKey)}</p>
                                            {pub.issueKey ? (
                                                <p className="pub-issue">{t(pub.issueKey)}</p>
                                            ) : null}
                                            {pub.url ? <span className="pub-link">→ {t("pubs.openLink")}</span> : null}
                                        </article>
                                    );
                                    return (
                                        <li key={`${pub.titleKey}-${pub.year}`}>
                                            {pub.url ? (
                                                <a
                                                    href={pub.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ textDecoration: "none" }}
                                                >
                                                    {inner}
                                                </a>
                                            ) : (
                                                inner
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </RevealOnScroll>

                    {/* Wystąpienia */}
                    <RevealOnScroll delay={150}>
                        <div>
                            <h3
                                style={{
                                    fontSize: "1.25rem",
                                    fontWeight: 500,
                                    color: "var(--color-text-main)",
                                    marginBottom: "var(--spacing-md)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <span aria-hidden="true">🎤</span>
                                {t("publicationsColLectures")}
                            </h3>
                            <ul
                                style={{
                                    listStyle: "none",
                                    padding: 0,
                                    margin: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "var(--spacing-sm)",
                                }}
                            >
                                {MARCIN_LECTURES.map((lec) => {
                                    const inner = (
                                        <article className="pub-card">
                                            <div className="pub-meta">
                                                <span className="pub-badge">{lectureTypeLabel(lec.type)}</span>
                                                <span className="pub-year">{lec.year}</span>
                                                {lec.location ? (
                                                    <span className="pub-location">· {lec.location}</span>
                                                ) : null}
                                            </div>
                                            <h4>{t(lec.titleKey)}</h4>
                                            <p className="pub-venue">{t(lec.venueKey)}</p>
                                            {lec.url ? <span className="pub-link">→ {t("pubs.openLink")}</span> : null}
                                        </article>
                                    );
                                    return (
                                        <li key={`${lec.titleKey}-${lec.year}`}>
                                            {lec.url ? (
                                                <a
                                                    href={lec.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ textDecoration: "none" }}
                                                >
                                                    {inner}
                                                </a>
                                            ) : (
                                                inner
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>

            <style jsx>{`
                .pub-card {
                    padding: var(--spacing-sm) var(--spacing-md);
                    border: 1px solid var(--color-surface-hover);
                    border-radius: var(--radius-md);
                    background: rgba(255, 255, 255, 0.02);
                    transition: border-color 0.3s ease, transform 0.3s ease;
                }
                a:hover .pub-card {
                    border-color: var(--color-primary);
                    transform: translateY(-2px);
                }
                .pub-meta {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                }
                .pub-badge {
                    display: inline-flex;
                    padding: 3px 10px;
                    border: 1px solid var(--color-primary);
                    color: var(--color-primary);
                    border-radius: 999px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }
                .pub-year {
                    color: var(--color-text-muted);
                    font-size: 0.85rem;
                    font-weight: 500;
                }
                .pub-location {
                    color: var(--color-text-muted);
                    font-size: 0.85rem;
                }
                .pub-card h4 {
                    margin: 0 0 4px 0;
                    font-size: 0.98rem;
                    font-weight: 500;
                    color: var(--color-text-main);
                    line-height: 1.4;
                }
                .pub-venue {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--color-text-muted);
                    line-height: 1.4;
                }
                .pub-issue {
                    margin: 4px 0 0 0;
                    font-size: 0.78rem;
                    color: var(--color-text-muted);
                    opacity: 0.75;
                }
                .pub-link {
                    display: inline-block;
                    margin-top: 6px;
                    font-size: 0.78rem;
                    color: var(--color-primary);
                    font-weight: 500;
                    letter-spacing: 0.04em;
                }
            `}</style>
        </section>
    );
}
