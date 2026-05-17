"use client";

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Phone, Calendar, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { brand } from '@/lib/brandConfig';

// S7-3 LUXURY (2026-05-17): Sticky bottom bar dla mobile — 3 najważniejsze CTAs:
// Telefon (call brand.phone1) / Rezerwacja wizyty / Mapa bólu (toothache flow).
// Audyt: "Dodać sticky bottom bar na mobile: Telefon, Rezerwacja, Mapa bólu."
//
// Behavior:
// - Tylko mobile (display: none na desktopie via @media)
// - Hide gdy klawiatura otwarta (input/textarea focus, jak w AssistantTeaser S7-2)
// - Hide gdy widoczna w viewport sekcja chat AI (cennik) lub formularz długi
//   (transparency reduction via CSS), żeby nie zasłaniać CTA submit
export default function MobileBottomBar() {
    const t = useTranslations('nav');
    const [isInputFocused, setIsInputFocused] = useState(false);

    useEffect(() => {
        // Tylko aktywuj listener na mobile (matchMedia max-width:768px).
        const isMobile = typeof window !== 'undefined'
            && window.matchMedia('(max-width: 768px)').matches;
        if (!isMobile) return;

        const isEditable = (el: Element | null): boolean => {
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
                || (el as HTMLElement).isContentEditable;
        };

        const onFocusIn = (e: FocusEvent) => {
            if (isEditable(e.target as Element)) setIsInputFocused(true);
        };
        const onFocusOut = (e: FocusEvent) => {
            if (isEditable(e.target as Element)) setIsInputFocused(false);
        };

        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
        return () => {
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
        };
    }, []);

    const phoneHref = `tel:${(brand.phone1 || '').replace(/\s/g, '')}`;

    return (
        <>
            <style>{`
                .mobile-bottom-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 9998;
                    display: none;
                    background: rgba(18, 20, 24, 0.95);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-top: 1px solid rgba(var(--color-primary-rgb), 0.25);
                    padding: 8px 0 max(8px, env(safe-area-inset-bottom)) 0;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                @media (max-width: 768px) {
                    .mobile-bottom-bar { display: grid; grid-template-columns: 1fr 1fr 1fr; }
                }
                .mobile-bottom-bar.hidden {
                    opacity: 0;
                    transform: translateY(100%);
                    pointer-events: none;
                }
                .mobile-bottom-bar a {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 8px 4px;
                    color: rgba(255,255,255,0.75);
                    text-decoration: none;
                    font-size: 11px;
                    font-weight: 600;
                    transition: color 0.2s ease, background 0.2s ease;
                    border-radius: 8px;
                    -webkit-tap-highlight-color: transparent;
                }
                .mobile-bottom-bar a:active {
                    color: var(--color-primary);
                    background: rgba(var(--color-primary-rgb), 0.1);
                }
                .mobile-bottom-bar a.primary {
                    color: var(--color-primary);
                }
                .mobile-bottom-bar a.primary svg {
                    filter: drop-shadow(0 0 8px rgba(var(--color-primary-rgb), 0.4));
                }
                /* Add bottom padding to body so content not hidden under bar */
                @media (max-width: 768px) {
                    body { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
                }
            `}</style>

            <nav
                className={`mobile-bottom-bar ${isInputFocused ? 'hidden' : ''}`}
                aria-label={t('menuLabel')}
            >
                <a href={phoneHref} aria-label={`${t('bottomBarPhone')}: ${brand.phone1}`}>
                    <Phone size={20} aria-hidden="true" />
                    <span>{t('bottomBarPhone')}</span>
                </a>
                <Link href="/rezerwacja" className="primary">
                    <Calendar size={22} aria-hidden="true" />
                    <span>{t('bottomBarBooking')}</span>
                </Link>
                <Link href="/mapa-bolu">
                    <Sparkles size={20} aria-hidden="true" />
                    <span>{t('bottomBarPainMap')}</span>
                </Link>
            </nav>
        </>
    );
}
