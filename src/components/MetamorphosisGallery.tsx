"use client";

import { useState, useEffect } from 'react';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import RevealOnScroll from '@/components/RevealOnScroll';

interface MetamorphosisItem {
    id: number;
    before: string;
    after: string;
    title: string;
    description: string;
    motto?: string;
}

const METAMORPHOSES: MetamorphosisItem[] = [
    {
        id: 1,
        before: "/metamorphosis_before.jpg",
        after: "/metamorphosis_after.jpg",
        title: "Metamorfoza Pana Michała",
        description: "Pełna rekonstrukcja zgryzu przywracająca funkcjonalność i estetykę.",
        motto: '"Teraz uśmiecham się do każdego zdjęcia!"'
    },
    {
        id: 2,
        before: "/metamorphosis_2_before.jpg",
        after: "/metamorphosis_2_after.jpg",
        title: "Nowy uśmiech Pana Piotra",
        description: "Subtelna zmiana kształtu i koloru zębów, która diametralnie odmieniła odbiór twarzy.",
        motto: '"Odzyskałem pewność siebie w kontaktach biznesowych."'
    },
    {
        id: 3,
        before: "/metamorphosis_3_before.jpg",
        after: "/metamorphosis_3_after.jpg",
        title: "Metamorfoza Pani Klaudii",
        description: "Kompleksowa poprawa estetyki uśmiechu.",
        motto: '"Nareszcie czuję się sobą."'
    },
    {
        id: 4,
        before: "/images/metamorphoses/meta_4_before.jpg",
        after: "/images/metamorphoses/meta_4_after.jpg",
        title: "Metamorfoza Pani Anny",
        description: "Zastosowanie licówek porcelanowych w odcinku przednim dla idealnej harmonii uśmiechu.",
        motto: '"Zawsze marzyłam o takim uśmiechu na ślubie córki."'
    },
    {
        id: 5,
        before: "/images/metamorphoses/meta_5_before.jpg",
        after: "/images/metamorphoses/meta_5_after.jpg",
        title: "Uśmiech Pana Tomasza",
        description: "Odbudowa startych zębów metodą bondingu (flow injection).",
        motto: '"Młodszy wygląd o 10 lat bez inwazyjnych zabiegów."'
    },
    {
        id: 6,
        before: "/images/metamorphoses/meta_6_before.jpg",
        after: "/images/metamorphoses/meta_6_after.jpg",
        title: "Metamorfoza Pana Łukasza",
        description: "Korekta dziąsłowa (gingiwoplastyka) połączona z wybielaniem gabinetowym.",
        motto: '"Mój uśmiech w końcu wygląda tak, jak się czuję."'
    },
    {
        id: 7,
        before: "/images/metamorphoses/meta_7_before.jpg",
        after: "/images/metamorphoses/meta_7_after.jpg",
        title: "Nowy uśmiech Pani Agaty",
        description: "Implantacja w miejsce brakujących zębów bocznych przywracająca pełną funkcję żucia.",
        motto: '"Mogę znów jeść to, na co mam ochotę!"'
    },
    {
        id: 8,
        before: "/images/metamorphoses/meta_8_before.jpg",
        after: "/images/metamorphoses/meta_8_after.jpg",
        title: "Metamorfoza Pana Damiana",
        description: "Zamknięcie diastemy i korekta kształtu zębów materiałem kompozytowym.",
        motto: '"Drobna zmiana, a wielki efekt."'
    },
    {
        id: 9,
        before: "/images/metamorphoses/meta_9_before.jpg",
        after: "/images/metamorphoses/meta_9_after.jpg",
        title: "Uśmiech Pani Natalii",
        description: "Kompleksowa rehabilitacja protetyczna z podniesieniem zwarcia.",
        motto: '"Koniec z bólem stawów i ukrywaniem uśmiechu."'
    },
    {
        id: 10,
        before: "/images/metamorphoses/meta_10_before.jpg",
        after: "/images/metamorphoses/meta_10_after.jpg",
        title: "Metamorfoza Pani Moniki",
        description: "Wymiana starych wypełnień na estetyczne odbudowy onlay/overlay.",
        motto: '"Moje zęby wyglądają teraz tak naturalnie!"'
    },
    {
        id: 11,
        before: "/images/metamorphoses/meta_11_before.jpg",
        after: "/images/metamorphoses/meta_11_after.jpg",
        title: "Przemiana Pani Zofii",
        description: "Cyfrowe projektowanie uśmiechu (DSD) i realizacja ceramiczna.",
        motto: '"Profesjonalizm na każdym etapie. Warto było zaufać."'
    },
    {
        id: 12,
        before: "/images/metamorphoses/meta_12_before.jpg",
        after: "/images/metamorphoses/meta_12_after.jpg",
        title: "Metamorfoza Pana Rafała",
        description: "Leczenie ortodontyczne nakładkowe zakończone wybielaniem.",
        motto: '"Proste zęby to moja nowa wizytówka."'
    },
    {
        id: 13,
        before: "/images/metamorphoses/meta_13_before.jpg",
        after: "/images/metamorphoses/meta_13_after.jpg",
        title: "Styl Pana Roberta",
        description: "Estetyczna odbudowa kłów i siekaczy po urazie mechanicznym.",
        motto: '"Szybki powrót do pełnej sprawności i wyglądu."'
    },
    {
        id: 14,
        before: "/images/metamorphoses/meta_14_before.jpg",
        after: "/images/metamorphoses/meta_14_after.jpg",
        title: "Metamorfoza Pani Izabeli",
        description: "Licówki kompozytowe bez szlifowania zębów (technika direct).",
        motto: '"Bałam się dentysty, a teraz nie mogę przestać się uśmiechać."'
    },
    {
        id: 15,
        before: "/images/metamorphoses/meta_15_before.jpg",
        after: "/images/metamorphoses/meta_15_after.jpg",
        title: "Uśmiech Marzeń Pani Elżbiety",
        description: "Pełna rekonstrukcja łuku górnego na implantach (All-on-4).",
        motto: '"To inwestycja w jakość życia. Dziękuję zespołowi Mikrostomart."'
    }
];

export default function MetamorphosisGallery() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Tooltip State
    const [activeTooltip, setActiveTooltip] = useState<'left' | 'right' | null>(null);

    // Auto-hide tooltip after 4 seconds
    useEffect(() => {
        if (activeTooltip) {
            const timer = setTimeout(() => {
                setActiveTooltip(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [activeTooltip]);

    const handleSlideChange = (newIndex: number) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(newIndex);
            setIsTransitioning(false);
        }, 400);
    };

    const nextSlide = () => {
        if (isTransitioning) return;
        handleSlideChange((currentIndex + 1) % METAMORPHOSES.length);
    };

    const prevSlide = () => {
        if (isTransitioning) return;
        handleSlideChange((currentIndex - 1 + METAMORPHOSES.length) % METAMORPHOSES.length);
    };

    const currentItem = METAMORPHOSES[currentIndex];

    return (
        <section className="gallery-container">
            {/* Animating Wrapper */}
            <div
                className={isTransitioning ? 'anim-blur-out' : 'anim-blur-in'}
                style={{ width: '100%' }}
            >
                {/* Slider Component - Square Aspect Ratio */}
                <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    margin: '0 auto',
                    position: 'relative', // Context for absolute buttons and tooltip
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>

                    {/* TOOLTIP OVERLAY */}
                    {activeTooltip && (
                        <div style={{
                            position: 'absolute',
                            top: '1rem',
                            [activeTooltip === 'left' ? 'left' : 'right']: '1rem',
                            maxWidth: '280px',
                            background: 'rgba(18, 20, 24, 0.95)',
                            backdropFilter: 'blur(8px)',
                            padding: '1.5rem',
                            borderRadius: '20px',
                            border: '1px solid var(--color-primary)',
                            borderBottomRightRadius: activeTooltip === 'left' ? '4px' : '20px',
                            borderBottomLeftRadius: activeTooltip === 'right' ? '4px' : '20px',
                            zIndex: 30,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            animation: 'fadeInZoom 0.3s ease forwards',
                            pointerEvents: 'none'
                        }}>
                            {/* SVG Tail for better border match */}
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                style={{
                                    position: 'absolute',
                                    bottom: '-14px',
                                    [activeTooltip === 'left' ? 'right' : 'left']: '-1px', // Align perfectly with border
                                    transform: activeTooltip === 'left' ? 'scaleX(1)' : 'scaleX(-1)',
                                }}
                            >
                                <path
                                    d="M0 0 L20 0 L0 20 Z"
                                    fill="rgba(18, 20, 24, 0.95)"
                                    stroke="var(--color-primary)"
                                    strokeWidth="1"
                                />
                                <path d="M0 0 L20 0" stroke="rgba(18, 20, 24, 0.95)" strokeWidth="2" />
                            </svg>

                            <h3 style={{
                                color: 'var(--color-primary)',
                                fontSize: '1.1rem',
                                marginBottom: '0.5rem'
                            }}>
                                {currentItem.title}
                            </h3>
                            {currentItem.motto && (
                                <p style={{
                                    fontStyle: 'italic',
                                    fontSize: '0.9rem',
                                    marginBottom: '0.8rem',
                                    color: '#fff'
                                }}>
                                    {currentItem.motto}
                                </p>
                            )}
                            <p style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-text-muted)',
                                lineHeight: '1.4'
                            }}>
                                {currentItem.description}
                            </p>
                        </div>
                    )}

                    {/* PREV BUTTON (Arrow) */}
                    <button
                        onClick={prevSlide}
                        style={{
                            position: 'absolute',
                            left: '-60px',
                            zIndex: 10,
                            background: 'transparent',
                            border: '1px solid var(--color-surface-hover)',
                            color: 'var(--color-primary)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            fontSize: '1.5rem'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--color-primary)';
                            e.currentTarget.style.color = '#000';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                        title="Poprzednia"
                    >
                        ❮
                    </button>

                    <div style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--color-surface-hover)',
                        position: 'relative'
                    }}>
                        <BeforeAfterSlider
                            key={currentItem.id}
                            beforeImage={currentItem.before}
                            afterImage={currentItem.after}
                            onHoverStart={() => setActiveTooltip(currentIndex % 2 === 0 ? 'right' : 'left')}
                        />
                    </div>

                    {/* NEXT BUTTON (Arrow) */}
                    <button
                        onClick={nextSlide}
                        style={{
                            position: 'absolute',
                            right: '-60px',
                            zIndex: 10,
                            background: 'transparent',
                            border: '1px solid var(--color-surface-hover)',
                            color: 'var(--color-primary)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            fontSize: '1.5rem'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--color-primary)';
                            e.currentTarget.style.color = '#000';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                        title="Następna"
                    >
                        ❯
                    </button>
                </div>

                {/* Counter */}
                <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {currentIndex + 1} / {METAMORPHOSES.length}
                </div>
            </div>
        </section>
    );
}
