"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';

// H8 (2026-05-10): WebP versions saved by scripts/resize-interior.js.
// Originals (~2.5-2.9 MB each, ~13 MB total) → WebP (128-204 KB, ~850 KB total).
const images = [
    '/interior/IMG_1400.webp',
    '/interior/IMG_1460.webp',
    '/interior/IMG_1579.webp',
    '/interior/IMG_2535.webp',
    '/interior/IMG_8999.webp',
];

export default function InteriorCollage() {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="interior-collage-container" style={{
            width: '100%',
            height: '100%',
            minHeight: '500px', // Ensure it has height
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '2px',
            border: '1px solid var(--color-surface-hover)'
        }}>
            <style jsx>{`
        .interior-collage-container {
           animation: colorLoop 20s infinite ease-in-out;
        }

        @keyframes colorLoop {
          0% { filter: grayscale(0%); }
          45% { filter: grayscale(100%); }
          55% { filter: grayscale(100%); }
          100% { filter: grayscale(0%); }
        }
        
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>

            {images.map((src, index) => (
                <div
                    key={src}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: index === current ? 1 : 0,
                        transition: 'opacity 1.5s ease-in-out',
                        zIndex: index === current ? 1 : 0,
                    }}
                >
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        animation: index === current ? 'kenBurns 6s ease-out forwards' : 'none'
                    }}>
                        <Image
                            src={src}
                            alt={`Wnętrze kliniki ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            style={{ objectFit: 'cover' }}
                            priority={index === 0}
                        />
                    </div>
                </div>
            ))}

            {/* Optional: Add a subtle overlay gradient for text readability if needed, but keeping it clean for now */}
        </div>
    );
}
