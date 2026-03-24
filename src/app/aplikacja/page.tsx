'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';


const BRAND = 'var(--color-primary)';
const BRAND_LIGHT = 'var(--color-primary-light)';
const DARK = '#0a0a0f';
const SURFACE = '#12131a';
const SURFACE2 = '#1a1c27';

const benefits = [
    {
        icon: '📅',
        title: 'Terminy wizyt w jednym miejscu',
        desc: 'Zawsze wiesz, kiedy masz kolejną wizytę. Przypomnienia push wysyłamy automatycznie — nie zapomnisz.',
    },
    {
        icon: '💬',
        title: 'Czat z recepcją',
        desc: 'Masz pytanie? Napisz do nas bezpośrednio przez aplikację. Odpowiadamy szybko, bez czekania na linię.',
    },
    {
        icon: '📋',
        title: 'Twoja dokumentacja',
        desc: 'Zalecenia po wizycie, plan leczenia, historia — masz do tego dostęp w każdej chwili, z każdego miejsca.',
    },
    {
        icon: '🔔',
        title: 'Powiadomienia push',
        desc: 'Otrzymujesz powiadomienia o nadchodzących wizytach, zmianach i ważnych informacjach z gabinetu.',
    },
    {
        icon: '⭐',
        title: 'Podziel się opinią',
        desc: 'Oceń naszą pracę i pomóż innym znaleźć dobrego stomatologa. Twoja opinia wiele znaczy.',
    },
    {
        icon: '🚀',
        title: 'Szybki dostęp',
        desc: 'Aplikacja działa jak natywna — ładuje się błyskawicznie, nie wymaga instalacji ze sklepu.',
    },
];

const stepsIos = [
    { n: '1', title: 'Otwórz przeglądarkę Safari', desc: 'Na iPhonie/iPadzie wejdź na mikrostomart.pl w przeglądarce Safari (nie Chrome — Safari jest wymagane do PWA na iOS).' },
    { n: '2', title: 'Kliknij przycisk Udostępnij', desc: 'Na dole ekranu znajdź ikonę z kwadratem i strzałką w górę (Share) — naciśnij ją.' },
    { n: '3', title: 'Dodaj do ekranu głównego', desc: 'Przewiń listę opcji i wybierz „Dodaj do ekranu głównego" (Add to Home Screen), potwierdź przyciskiem „Dodaj".' },
    { n: '4', title: 'Gotowe! 🎉', desc: 'Na ekranie głównym pojawi się ikona Mikrostomart. Kliknij ją — aplikacja otworzy się w trybie pełnoekranowym.' },
];

const stepsAndroid = [
    { n: '1', title: 'Otwórz Chrome', desc: 'Wejdź na mikrostomart.pl w przeglądarce Google Chrome (Chrome najlepiej obsługuje instalację PWA na Androidzie).' },
    { n: '2', title: 'Kliknij menu (3 kropki)', desc: 'Naciśnij trzy pionowe kropki w prawym górnym rogu, żeby otworzyć menu przeglądarki.' },
    { n: '3', title: 'Zainstaluj aplikację', desc: 'Wybierz „Dodaj do ekranu głównego" lub „Zainstaluj aplikację" (zależy od wersji Chrome). Potwierdź „Dodaj" lub „Zainstaluj".' },
    { n: '4', title: 'Gotowe! 🎉', desc: 'Ikona Mikrostomart pojawi się na ekranie głównym lub w szufladzie aplikacji. Działa jak zwykła apka!' },
];

const accountSteps = [
    { n: '1', title: 'Otwórz aplikację', desc: 'Kliknij ikonę Mikrostomart na ekranie głównym.' },
    { n: '2', title: 'Przejdź do Strefy Pacjenta', desc: 'W menu głównym wybierz „Strefa Pacjenta" i kliknij „Zarejestruj się".' },
    { n: '3', title: 'Podaj swoje dane', desc: 'Wpisz imię, nazwisko, numer telefonu i hasło. Numer musi się zgadzać z tym w naszym systemie — tak łączymy Cię z Twoją historią.' },
    { n: '4', title: 'Potwierdź SMS-em', desc: 'Wyślemy Ci SMS z kodem weryfikacyjnym. Wpisz go w aplikacji i konto gotowe!' },
];

const pushSteps = [
    { n: '1', title: 'Wejdź do Strefy Pacjenta', desc: 'Zaloguj się na swoje konto w aplikacji Mikrostomart.' },
    { n: '2', title: 'Otwórz Profil', desc: 'Kliknij avatara lub „Mój profil" w górnym rogu.' },
    { n: '3', title: 'Włącz powiadomienia push', desc: 'Kliknij „Włącz powiadomienia". Przeglądarka zapyta o zgodę — kliknij „Zezwól".' },
    { n: '4', title: 'Już działają! 🔔', desc: 'Od teraz będziesz dostawać przypomnienia o wizytach i ważne informacje z gabinetu.' },
];

function StepCard({ n, title, desc, color }: { n: string; title: string; desc: string; color: string }) {
    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
            padding: '1.25rem',
            background: SURFACE2,
            borderRadius: '1rem',
            border: `1px solid rgba(var(--color-primary-rgb),0.1)`,
        }}>
            <div style={{
                flexShrink: 0,
                width: '2.2rem',
                height: '2.2rem',
                borderRadius: '50%',
                background: `${color}22`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.95rem',
                color,
            }}>{n}</div>
            <div>
                <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem', fontSize: '0.95rem' }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>{desc}</div>
            </div>
        </div>
    );
}

export default function AplikacjaPage() {
    const [activeOs, setActiveOs] = useState<'ios' | 'android'>('ios');
    const [activeSection, setActiveSection] = useState<'account' | 'push'>('account');
    const heroRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(0);

    // Hide global Navbar and Footer on this standalone landing page
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'hide-global-nav';
        style.textContent = 'nav[class*="Navbar"], footer[class*="Footer"] { display: none !important; }';
        document.head.appendChild(style);
        return () => document.getElementById('hide-global-nav')?.remove();
    }, []);

    useEffect(() => {
        const handler = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const navStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrollY > 60 ? 'rgba(10,10,15,0.95)' : 'transparent',
        backdropFilter: scrollY > 60 ? 'blur(12px)' : 'none',
        borderBottom: scrollY > 60 ? '1px solid rgba(var(--color-primary-rgb),0.12)' : 'none',
        transition: 'all 0.3s',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    return (
        <div style={{ background: DARK, minHeight: '100vh', color: 'white', fontFamily: "'Inter', 'Segoe UI', sans-serif", overflowX: 'hidden' }}>

            {/* ── NAV ─────────────────────────────────────────────────────── */}
            <nav style={navStyle}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <span style={{ color: BRAND, fontSize: '1.3rem', fontWeight: 900 }}>❖</span>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Mikrostomart</span>
                </Link>
                <a href="#pobierz" style={{
                    padding: '0.5rem 1.2rem',
                    background: BRAND,
                    color: 'black',
                    fontWeight: 700,
                    borderRadius: '2rem',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                }}>📱 Pobierz aplikację</a>
            </nav>

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section ref={heroRef} style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '5rem 1.5rem 3rem',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${BRAND}18 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1rem',
                    borderRadius: '2rem',
                    border: `1px solid ${BRAND}44`,
                    background: `${BRAND}10`,
                    color: BRAND_LIGHT,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                    letterSpacing: '0.05em',
                }}>
                    📱 DARMOWA APLIKACJA PWA
                </div>

                <h1 style={{
                    fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                    fontWeight: 900,
                    lineHeight: 1.1,
                    marginBottom: '1.5rem',
                    maxWidth: '800px',
                }}>
                    Miej Mikrostomart{' '}
                    <span style={{
                        background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>zawsze przy sobie</span>
                </h1>

                <p style={{
                    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                    color: 'rgba(255,255,255,0.6)',
                    maxWidth: '580px',
                    lineHeight: 1.7,
                    marginBottom: '2.5rem',
                }}>
                    Terminy wizyt, czat z recepcją, dokumentacja i powiadomienia push — wszystko w jednym miejscu. Instalacja w 30 sekund, bez App Store.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem' }}>
                    <a href="#pobierz" style={{
                        padding: '1rem 2.4rem',
                        background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`,
                        color: 'black',
                        fontWeight: 800,
                        borderRadius: '3rem',
                        textDecoration: 'none',
                        fontSize: '1.05rem',
                        boxShadow: `0 8px 32px ${BRAND}44`,
                        transition: 'all 0.2s',
                    }}>
                        📲 Jak zainstalować?
                    </a>
                    <a href="/strefa-pacjenta/register/verify" style={{
                        padding: '1rem 2rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 600,
                        borderRadius: '3rem',
                        textDecoration: 'none',
                        fontSize: '1.05rem',
                        backdropFilter: 'blur(8px)',
                    }}>
                        Załóż konto →
                    </a>
                </div>

                {/* Mock phone UI */}
                <div style={{
                    position: 'relative',
                    width: '240px',
                    height: '440px',
                    borderRadius: '2.5rem',
                    background: SURFACE,
                    border: '3px solid rgba(255,255,255,0.1)',
                    boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)`,
                    overflow: 'hidden',
                    margin: '0 auto',
                }}>
                    {/* Status bar */}
                    <div style={{ background: '#0a0a12', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>9:41</span>
                        <div style={{ width: '50px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }} />
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>●●●</span>
                    </div>
                    {/* Header */}
                    <div style={{ padding: '0.75rem 1rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: BRAND, fontSize: '1.1rem' }}>❖</span>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>Mikrostomart</span>
                        </div>
                    </div>
                    {/* Mock content */}
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ background: `${BRAND}18`, border: `1px solid ${BRAND}30`, borderRadius: '0.75rem', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.6rem', color: BRAND_LIGHT, fontWeight: 600, marginBottom: '0.2rem' }}>NASTĘPNA WIZYTA</div>
                            <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>Wt, 4 marca 2026</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>godz. 10:30 · Dr. Nowosielski</div>
                        </div>
                        {[
                            { icon: '💬', text: 'Nowa wiadomość od recepcji', time: '5 min temu' },
                            { icon: '📋', text: 'Twój plan leczenia', time: 'Zaktualizowany' },
                            { icon: '⭐', text: 'Oceń ostatnią wizytę', time: 'Dziękujemy!' },
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', background: SURFACE2, borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.63rem', color: 'white', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</div>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)' }}>{item.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Bottom nav */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0', display: 'flex', justifyContent: 'space-around' }}>
                        {['🏠', '📅', '💬', '👤'].map((icon, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                                <div style={{ width: i === 0 ? '18px' : '4px', height: '2px', background: i === 0 ? BRAND : 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── BENEFITS ────────────────────────────────────────────────── */}
            <section style={{ padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ color: BRAND, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>DLACZEGO WARTO</div>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, lineHeight: 1.2 }}>
                        Wszystko o Twoich zębach,<br />
                        <span style={{ color: BRAND }}>w Twojej kieszeni</span>
                    </h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {benefits.map((b, i) => (
                        <div key={i} style={{
                            padding: '1.75rem',
                            background: SURFACE,
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(255,255,255,0.07)',
                            transition: 'all 0.3s',
                        }}>
                            <div style={{
                                fontSize: '2.2rem',
                                marginBottom: '1rem',
                                width: '3.5rem',
                                height: '3.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `${BRAND}12`,
                                borderRadius: '1rem',
                            }}>{b.icon}</div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>{b.title}</h3>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── INSTALLATION ────────────────────────────────────────────── */}
            <section id="pobierz" style={{ padding: '5rem 1.5rem', background: SURFACE }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ color: BRAND, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>INSTALACJA — 30 SEKUND</div>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900 }}>Jak zainstalować aplikację?</h2>
                        <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: '0.75rem', fontSize: '0.95rem' }}>
                            Mikrostomart to aplikacja PWA — działa jak natywna apka, ale instalujesz ją bezpośrednio z przeglądarki. Zero App Store, zero pobierania.
                        </p>
                    </div>

                    {/* OS switch */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem', background: DARK, borderRadius: '1rem', padding: '0.35rem', width: 'fit-content', margin: '0 auto 2rem' }}>
                        {(['ios', 'android'] as const).map(os => (
                            <button key={os} onClick={() => setActiveOs(os)} style={{
                                padding: '0.6rem 1.6rem',
                                borderRadius: '0.75rem',
                                border: 'none',
                                background: activeOs === os ? BRAND : 'transparent',
                                color: activeOs === os ? 'black' : 'rgba(255,255,255,0.5)',
                                fontWeight: activeOs === os ? 700 : 400,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                            }}>
                                {os === 'ios' ? '🍎 iPhone / iPad' : '🤖 Android'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(activeOs === 'ios' ? stepsIos : stepsAndroid).map(s => (
                            <StepCard key={s.n} {...s} color={BRAND} />
                        ))}
                    </div>

                    {/* Quick tip */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        background: `${BRAND}12`,
                        border: `1px solid ${BRAND}30`,
                        fontSize: '0.82rem',
                        color: BRAND_LIGHT,
                        lineHeight: 1.5,
                    }}>
                        💡 <strong>Wskazówka:</strong> {activeOs === 'ios'
                            ? 'Na iPhonie Safari to jedyna przeglądarka która obsługuje dodawanie do ekranu głównego z pełną funkcjonalnością push.'
                            : 'Na niektórych telefonach pojawi się automatyczny baner „Zainstaluj aplikację" — kliknij go! To najszybsza metoda.'}
                    </div>
                </div>
            </section>

            {/* ── ACCOUNT + PUSH (tabbed) ─────────────────────────────────── */}
            <section style={{ padding: '5rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ color: BRAND, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>PIERWSZE KROKI</div>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900 }}>Konfiguracja konta</h2>
                </div>

                {/* Tab switch — Installation tab removed (it's already above), only Account + Push */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {([
                        { key: 'account', label: '👤 Konto' },
                        { key: 'push', label: '🔔 Powiadomienia' },
                    ] as const).map(tab => (
                        <button key={tab.key} onClick={() => setActiveSection(tab.key)} style={{
                            padding: '0.55rem 1.2rem',
                            borderRadius: '2rem',
                            border: `1px solid ${activeSection === tab.key ? BRAND : 'rgba(255,255,255,0.12)'}`,
                            background: activeSection === tab.key ? `${BRAND}18` : 'transparent',
                            color: activeSection === tab.key ? BRAND_LIGHT : 'rgba(255,255,255,0.5)',
                            fontWeight: activeSection === tab.key ? 700 : 400,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s',
                        }}>{tab.label}</button>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeSection === 'account' && accountSteps.map(s => <StepCard key={s.n} {...s} color='#38bdf8' />)}
                    {activeSection === 'push' && pushSteps.map(s => <StepCard key={s.n} {...s} color='#a78bfa' />)}
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            <section style={{
                padding: '5rem 1.5rem',
                background: `linear-gradient(135deg, ${BRAND}18 0%, transparent 60%)`,
                borderTop: `1px solid ${BRAND}18`,
            }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🦷</div>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: '1rem' }}>
                        Dołącz do naszej<br />
                        <span style={{ color: BRAND }}>cyfrowej przychodni</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.7 }}>
                        Twoje zdrowie i komfort są naszym priorytetem — zarówno w gabinecie, jak i poza nim. Zainstaluj aplikację i miej nas zawsze przy sobie.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="#pobierz" style={{
                            padding: '1rem 2.4rem',
                            background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`,
                            color: 'black',
                            fontWeight: 800,
                            borderRadius: '3rem',
                            textDecoration: 'none',
                            fontSize: '1rem',
                            boxShadow: `0 8px 32px ${BRAND}44`,
                        }}>
                            📲 Zainstaluj teraz — za darmo
                        </a>
                        <a href="/strefa-pacjenta/register/verify" style={{
                            padding: '1rem 2rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: '3rem',
                            textDecoration: 'none',
                            fontSize: '1rem',
                        }}>
                            Zarejestruj się →
                        </a>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
                        Bez App Store · Bez rejestracji kart · Całkowicie bezpłatna
                    </p>
                </div>
            </section>

            {/* ── FOOTER ──────────────────────────────────────────────────── */}
            <footer style={{
                padding: '2rem 1.5rem',
                background: SURFACE,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.78rem',
            }}>
                <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: BRAND, fontWeight: 700 }}>❖ Mikrostomart</span>
                    {' '} — Gabinet Stomatologiczny Opole
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Strona główna</Link>
                    <Link href="/strefa-pacjenta" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Strefa Pacjenta</Link>
                    <Link href="/strefa-pacjenta/ocen-nas" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Oceń nas</Link>
                    <Link href="/kontakt" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Kontakt</Link>
                </div>
            </footer>
        </div>
    );
}
