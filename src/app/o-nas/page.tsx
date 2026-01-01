"use client";

import Image from "next/image";
import RevealOnScroll from "@/components/RevealOnScroll";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AboutPage() {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <main>
            {/* Intro Section - Editorial Style */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0" }}>
                <div className="container">
                    <RevealOnScroll>
                        <p style={{
                            textAlign: "center",
                            color: "var(--color-primary)",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-md)"
                        }}>
                            Dziedzictwo i Pasja
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400,
                            lineHeight: 1.1
                        }}>
                            Rodzinna Klinika <br />
                            <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>z tradycjami.</span>
                        </h1>
                    </RevealOnScroll>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "stretch"
                    }}>
                        <RevealOnScroll animation="blur-in" delay={100}>
                            <div style={{
                                minHeight: "500px",
                                background: "var(--color-surface)",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--color-surface-hover)"
                            }}>
                                <span style={{ color: "var(--color-text-muted)" }}>[FOTOGRAFIA KLINIKI - WNĘTRZE]</span>
                            </div>
                        </RevealOnScroll>

                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <RevealOnScroll delay={200}>
                                <h3 style={{ fontSize: "2rem", marginBottom: "var(--spacing-md)", color: "var(--color-primary)" }}>
                                    Misja
                                </h3>
                                <p style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                    Jesteśmy zespołem profesjonalistów, prowadzących rodzinną klinikę stomatologiczną w Opolu.
                                    Naszą misją jest dbanie o to, by Twój uśmiech był nie tylko piękny, ale przede wszystkim zdrowy.
                                </p>
                                <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                    W Mikrostomart łączymy wieloletnie doświadczenie z najnowszymi osiągnięciami technologii medycznej.
                                    Specjalizujemy się w stomatologii mikroskopowej, co pozwala nam na osiągnięcie niespotykanej precyzji leczenia.
                                </p>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ela Nowosielska Section (Mirror Layout) */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0", borderBottom: "1px solid var(--color-surface-hover)" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center"
                    }}>
                        {/* Text First for Ela (Mirror of Marcin) */}
                        <div style={{ paddingRight: "var(--spacing-md)", order: 2 }}>
                            <RevealOnScroll>
                                <p style={{
                                    color: "var(--color-primary)",
                                    marginBottom: "var(--spacing-sm)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em"
                                }}>
                                    Właścicielka & Opiekun Pacjenta
                                </p>
                                <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)", lineHeight: 1.1 }}>
                                    Elżbieta Nowosielska
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "var(--spacing-md)",
                                    color: "var(--color-text-main)",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid var(--color-primary)",
                                    paddingLeft: "var(--spacing-md)"
                                }}>
                                    "Zawsze uśmiechnięta i wesoła. Najweselsza i najbardziej pogodna osoba w naszym zespole."
                                </blockquote>
                                <div style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.6 }}>
                                    <p style={{ marginBottom: "1rem" }}>
                                        Higienistka stomatologiczna z pasją, a zarazem menadżer gabinetu. Dzięki jej zaangażowaniu organizacja pracy gabinetu nie ma sobie równych.
                                        Pacjenci, zarówno Ci najmłodsi, jak i mniej młodsi kochają jej pogodne podejście do życia i pracy.
                                    </p>

                                    {expanded['ela'] && (
                                        <div className="anim-fade-zoom">
                                            <p style={{ marginBottom: "1rem" }}>
                                                Swoją empatią potrafi uspokoić i przekonać do leczenia nawet najbardziej zestresowanych Pacjentów. Dba o dobre samopoczucie pacjenta stwarzając przyjazną atmosferę w gabinecie oraz poczucie bezpieczeństwa.
                                            </p>
                                            <p>
                                                Swoją wiedzę i umiejętności zdobyła na kierunku higienistka stomatologiczna w Szkole Policealnej TEB Edukacja, a stale poszerza na kierunkowych kursach i szkoleniach specjalizacyjnych.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => toggleExpand('ela')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            color: 'var(--color-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            marginTop: '1rem',
                                            fontSize: '0.9rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                        className="hover-underline"
                                    >
                                        {expanded['ela'] ? (
                                            <>Mniej <ChevronUp size={16} /></>
                                        ) : (
                                            <>Czytaj więcej <ChevronDown size={16} /></>
                                        )}
                                    </button>
                                </div>
                            </RevealOnScroll>
                        </div>

                        <RevealOnScroll animation="blur-in" delay={100} className="order-1-mobile">
                            <div style={{
                                height: "600px",
                                background: "#08090a",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #2a2a2a",
                                order: 1 // Image on right for desktop if we switch order, but grid flow puts second item right. Actually, simple grid order: Text (1), Image (2). 
                                // Wait, to mirror Marcin (Image Left, Text Right), Ela should be Text Left, Image Right.
                            }}>
                                {/* Placeholder for Ela's photo */}
                                <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                                    {/* Ideally we would use next/image here with the scraped URL if we had it downloaded or configured. For now, use placeholder text or external URL if safe? User said copy photos. 
                                       I'll use a placeholder for now and mention I need the photo file or external URL. 
                                       Actually, I can try to find the image URL from the scrape. I didn't get image URLs in the text chunk.
                                       I will use a placeholder and ask user to provide assets or I can use a generic placeholder.
                                    */}
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '2rem' }}>EN</span>
                                        </div>
                                        <span style={{ color: "var(--color-text-muted)" }}>[ZDJĘCIE ELI]</span>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Marcin Nowosielski Section */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center"
                    }}>
                        <RevealOnScroll animation="blur-in" className="order-2-mobile" delay={100}>
                            <div style={{
                                height: "600px",
                                background: "#08090a",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #2a2a2a",
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2rem' }}>MN</span>
                                    </div>
                                    <span style={{ color: "var(--color-text-muted)" }}>[ZDJĘCIE MARCINA]</span>
                                </div>
                            </div>
                        </RevealOnScroll>

                        <div style={{ paddingLeft: "var(--spacing-md)" }}>
                            <RevealOnScroll>
                                <p style={{
                                    color: "var(--color-primary)",
                                    marginBottom: "var(--spacing-sm)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em"
                                }}>
                                    Właściciel & Główny Lekarz
                                </p>
                                <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)", lineHeight: 1.1 }}>
                                    lek. dent. M. Sc.<br /> Marcin Nowosielski
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "var(--spacing-md)",
                                    color: "var(--color-text-main)",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid var(--color-primary)",
                                    paddingLeft: "var(--spacing-md)"
                                }}>
                                    "Wierzę, że precyzja to klucz do trwałości. Dlatego w mojej pracy mikroskop nie jest dodatkiem, a standardem."
                                </blockquote>
                                <div style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.6 }}>
                                    <p style={{ marginBottom: "1rem" }}>
                                        Absolwent Akademii Medycznej we Wrocławiu. Człowiek z pasją i powołaniem do stomatologii, dla którego każdy dzień jest nowym wyzwaniem.
                                        Master of Science in Lasers in Dentistry (RWTH Aachen University).
                                    </p>

                                    {expanded['marcin'] && (
                                        <div className="anim-fade-zoom">
                                            <p style={{ marginBottom: "1rem" }}>
                                                Lekarz stomatolog, entuzjasta endodoncji mikroskopowej, leczenia protetycznego prowadzonego w powiększeniu, implantologii stomatologicznej oraz stomatologii laserowej.
                                            </p>
                                            <p style={{ marginBottom: "1rem" }}>
                                                Praktykę zawodową zdobywał w najlepszych gabinetach regionu. W 2021 roku uzyskał z wyróżnieniem jako drugi w Polsce, a zarazem najmłodszy w kraju dentysta tytuł "Master of Science in Lasers in Dentistry".
                                            </p>
                                            <p>
                                                Prywatnie mąż Elżbiety oraz ojciec małego Michaela i Lily. Miłośnik off-road’owej jazdy na desce snowboard’owej oraz dobrego brzmienia gitary basowej.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => toggleExpand('marcin')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            color: 'var(--color-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            marginTop: '1rem',
                                            fontSize: '0.9rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                        className="hover-underline"
                                    >
                                        {expanded['marcin'] ? (
                                            <>Mniej <ChevronUp size={16} /></>
                                        ) : (
                                            <>Czytaj więcej <ChevronDown size={16} /></>
                                        )}
                                    </button>
                                </div>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
