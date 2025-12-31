"use client";

import { useState } from 'react';
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

    const handleSlideChange = (newIndex: number) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(newIndex);
            setIsTransitioning(false);
        }, 400); // Matches CSS animation duration
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
                {/* Gallery Header w/ Motto - Fixed Height Wrapper */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '2rem',
                    minHeight: '220px', // Reserve space to prevent layout shifts
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                        {currentItem.title}
                    </h2>
                    {currentItem.motto && (
                        <p style={{
                            fontStyle: 'italic',
                            fontSize: '1.2rem',
                            marginBottom: '1rem',
                            color: 'var(--color-text-main)',
                            fontWeight: 300
                        }}>
                            {currentItem.motto}
                        </p>
                    )}
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                        {currentItem.description}
                    </p>
                </div>

                {/* Slider Component - Square Aspect Ratio */}
                <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    margin: '0 auto',
                    position: 'relative', // Context for absolute buttons
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {/* PREV BUTTON (Arrow) */}
                    <button
                        onClick={prevSlide}
                        style={{
                            position: 'absolute',
                            left: '-60px', // Outside the image
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
                        />
                    </div>

                    {/* NEXT BUTTON (Arrow) */}
                    <button
                        onClick={nextSlide}
                        style={{
                            position: 'absolute',
                            right: '-60px', // Outside the image
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
