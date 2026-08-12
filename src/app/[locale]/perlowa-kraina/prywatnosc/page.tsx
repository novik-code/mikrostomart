"use client";

import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";

/**
 * Polityka prywatności aplikacji „Perłowa Kraina" — publiczny odpowiednik
 * ekranu `/kids/prywatnosc` w samej aplikacji.
 *
 * 🔴 TEKST JEST PORTOWANY 1:1 z apki (gałąź `kids.privacy` w jej plikach locale
 * → `perlowaKrainaPriv` tutaj). Nie edytować go w jednym miejscu: dwie wersje
 * tego samego dokumentu rozjadą się przy pierwszej poprawce, a w programie dla
 * dzieci rozjazd deklaracji z zawartością to podstawa do zdjęcia aplikacji.
 * Zmiana zaczyna się w repo `~/mikrostomart-kids`, a tutaj się ją przenosi.
 *
 * 🔑 Sekcja COPPA jest PO ANGIELSKU we wszystkich czterech wersjach językowych,
 * dokładnie jak w aplikacji — apka wychodzi globalnie (decyzja D9), więc musi
 * mieć czytelne dla amerykańskiego rodzica oświadczenie niezależnie od tego,
 * w jakim języku ktoś otworzył stronę.
 */
export default function PerlowaKrainaPrivacyPage() {
    const t = useTranslations('perlowaKrainaPriv');

    // s8 (kamera — czujnik obecności) doszła przy odmrożeniu D2. Stoi na końcu,
    // bo wstawienie jej w środek wymagałoby przenumerowania kluczy w czterech
    // locale po obu stronach — to zamiana realnego ryzyka na kosmetykę kolejności.
    const sekcje = ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => ({
        title: t(`s${n}Title`),
        body: t(`s${n}Body`),
    }));

    return (
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero */}
            <section style={{
                padding: "calc(var(--spacing-xl) + 2rem) 0 var(--spacing-lg)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center top, rgba(var(--color-primary-rgb),0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <RevealOnScroll>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "50%",
                                background: "rgba(var(--color-primary-rgb),0.1)", border: "1px solid rgba(var(--color-primary-rgb),0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <ShieldCheck size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(1.9rem, 4.5vw, 3rem)", color: "var(--color-text-main)",
                            marginBottom: "0.75rem", lineHeight: 1.2
                        }}>
                            {t('pageTitle')}
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "620px", margin: "0 auto 0.75rem" }}>
                            {t('pageIntro')}
                        </p>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", opacity: 0.8 }}>
                            {t('updated')}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            <section className="container" style={{ maxWidth: "760px", paddingBottom: "var(--spacing-xl)" }}>

                {/* Operator + rozgraniczenie od polityki gabinetu. Ten blok stoi
                    NAD treścią, bo to pierwsza rzecz, której szuka recenzent:
                    czy wydawca w sklepie i operator w polityce to ten sam podmiot. */}
                <RevealOnScroll animation="fade-up">
                    <div style={{
                        background: "var(--color-surface)",
                        border: "1px solid rgba(var(--color-primary-rgb),0.18)",
                        borderRadius: "var(--radius-lg)",
                        padding: "clamp(1.25rem, 3vw, 1.75rem)",
                        marginBottom: "2rem"
                    }}>
                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.92rem", margin: "0 0 0.75rem" }}>
                            {t('operator')}
                        </p>
                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.85rem", margin: 0, opacity: 0.8 }}>
                            {t('separateNote')}
                        </p>
                    </div>
                </RevealOnScroll>

                {sekcje.map((s, i) => (
                    <RevealOnScroll key={s.title} animation="fade-up" delay={i < 3 ? i * 50 : 0}>
                        <Sekcja title={s.title} body={s.body} />
                    </RevealOnScroll>
                ))}

                {/* COPPA — po angielsku w każdej wersji językowej, oprawione
                    ramką, żeby amerykański rodzic (i recenzent) znalazł je bez
                    czytania całości w obcym języku. */}
                <RevealOnScroll animation="fade-up">
                    <div
                        lang="en"
                        style={{
                            background: "var(--color-surface)",
                            border: "1px solid rgba(var(--color-primary-rgb),0.18)",
                            borderRadius: "var(--radius-lg)",
                            padding: "clamp(1.25rem, 3vw, 1.75rem)",
                            marginTop: "2.5rem"
                        }}
                    >
                        <h2 style={{
                            fontFamily: "var(--font-heading)", fontSize: "1.15rem",
                            color: "var(--color-text-main)", margin: "0 0 1rem 0"
                        }}>
                            {t('coppaTitle')}
                        </h2>
                        <Akapity text={t('coppaBody')} />
                    </div>
                </RevealOnScroll>

                <div style={{ marginTop: "2.5rem" }}>
                    <Link
                        href="/perlowa-kraina"
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "0.5rem",
                            border: "1px solid rgba(var(--color-primary-rgb),0.35)",
                            color: "var(--color-primary)",
                            padding: "0.7rem 1.4rem", borderRadius: "var(--radius-md)",
                            fontWeight: 600, textDecoration: "none", fontSize: "0.95rem"
                        }}
                    >
                        <ArrowLeft size={18} />
                        {t('supportCta')}
                    </Link>
                </div>

            </section>
        </main>
    );
}

function Sekcja({ title, body }: { title: string; body: string }) {
    return (
        <div style={{ marginBottom: "2rem" }}>
            <h2 style={{
                fontFamily: "var(--font-heading)", fontSize: "1.2rem",
                color: "var(--color-text-main)", margin: "0 0 0.75rem 0"
            }}>
                {title}
            </h2>
            <Akapity text={body} />
        </div>
    );
}

/**
 * Tekst przyjeżdża z aplikacji, gdzie akapity rozdziela pusta linia (`\n\n`) —
 * w React `white-space` by je pokazał, ale jako jeden blok bez odstępów, więc
 * dzielimy je na realne `<p>`. Pojedyncze `\n` w środku akapitu (jest takie
 * w wyliczeniu trzech dróg wyjścia danych) też robi nowy akapit — w tym
 * dokumencie każda taka linia jest osobnym punktem.
 */
function Akapity({ text }: { text: string }) {
    const czesci = text.split('\n').map((s) => s.trim()).filter(Boolean);
    return (
        <>
            {czesci.map((p) => (
                <p key={p} style={{ color: "var(--color-text-muted)", lineHeight: 1.85, fontSize: "0.94rem", margin: "0 0 0.9rem" }}>
                    {p}
                </p>
            ))}
        </>
    );
}
