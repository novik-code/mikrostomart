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
    }
];

export default function MetamorphosisGallery() {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % METAMORPHOSES.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + METAMORPHOSES.length) % METAMORPHOSES.length);
    };

    const currentItem = METAMORPHOSES[currentIndex];

    return (
        <section className="gallery-container">
            {/* Gallery Header w/ Motto */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
                maxWidth: '600px', // Limit width to keep it reasonable on large screens
                aspectRatio: '1/1', // Enforce square
                width: '100%',
                margin: '0 auto',
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--color-surface-hover)'
            }}>
                <BeforeAfterSlider
                    key={currentItem.id} // Re-mount on change to reset position
                    beforeImage={currentItem.before}
                    afterImage={currentItem.after}
                />
            </div>

            {/* Navigation Controls */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '2rem',
                marginTop: '2rem',
                alignItems: 'center'
            }}>
                <button
                    onClick={prevSlide}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--color-primary)',
                        color: 'var(--color-primary)',
                        padding: '0.8rem 2rem',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(220, 177, 74, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    ← Poprzednia
                </button>

                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {currentIndex + 1} / {METAMORPHOSES.length}
                </span>

                <button
                    onClick={nextSlide}
                    style={{
                        background: 'var(--color-primary)',
                        border: '1px solid var(--color-primary)',
                        color: '#000',
                        padding: '0.8rem 2rem',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Następna →
                </button>
            </div>
        </section>
    );
}
