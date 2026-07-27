'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';

/**
 * /aplikacja — landing pobierania NATYWNEJ aplikacji (App Store + Google Play).
 *
 * Zachowanie:
 *  - telefon iOS   → automatyczne przekierowanie do App Store,
 *  - telefon Android → automatyczne przekierowanie do Google Play,
 *  - desktop / inne → strona z obydwoma przyciskami + instrukcją zakładania konta.
 * Jeden link (mikrostomart.pl/aplikacja) = jeden kod QR na plakacie w recepcji.
 *
 * (Poprzednia wersja promowała instalację PWA „dodaj do ekranu głównego" + weryfikację
 *  SMS — nieaktualne. Realny flow konta: telefon + imię + PESEL → e-mail + hasło →
 *  potwierdzenie linkiem w e-mailu → logowanie.)
 */

const APPSTORE = 'https://apps.apple.com/pl/app/id6793021841';
const GOOGLEPLAY = 'https://play.google.com/store/apps/details?id=pl.mikrostomart.app';

const BRAND = 'var(--color-primary)';
const BRAND_LIGHT = 'var(--color-primary-light)';
const DARK = '#0a0a0f';
const SURFACE = '#12131a';
const SURFACE2 = '#1a1c27';

type Os = 'ios' | 'android' | 'other';

function detectOs(): Os {
    if (typeof navigator === 'undefined') return 'other';
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    // iPadOS 13+ podaje się jako "Macintosh" — rozpoznajemy po ekranie dotykowym.
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ios';
    return 'other';
}

const accountSteps = [
    { n: '1', title: 'Pobierz i otwórz aplikację', desc: 'Zeskanuj kod lub kliknij przycisk sklepu powyżej. Po instalacji otwórz aplikację i wybierz „Strefa pacjenta" → „Załóż konto".' },
    { n: '2', title: 'Potwierdź tożsamość', desc: 'Podaj numer telefonu, który zostawiłeś w klinice, swoje imię oraz PESEL. Tak bezpiecznie łączymy konto z Twoją kartoteką i historią leczenia.' },
    { n: '3', title: 'Ustaw e-mail i hasło', desc: 'Wpisz adres e-mail oraz hasło, którymi będziesz logować się do aplikacji.' },
    { n: '4', title: 'Potwierdź e-mail', desc: 'Wyślemy na podany adres link aktywacyjny — kliknij go, aby dokończyć zakładanie konta.' },
    { n: '5', title: 'Zaloguj się', desc: 'Gotowe! Po zalogowaniu masz dostęp do wizyt, historii leczenia, zaleceń, dokumentów i czatu z recepcją.' },
];

const benefits = [
    { icon: '📅', title: 'Wizyty i przypomnienia', desc: 'Nadchodzące i minione wizyty w jednym miejscu — z automatycznymi przypomnieniami.' },
    { icon: '📋', title: 'Historia i zalecenia', desc: 'Przebieg leczenia, zalecenia po wizycie i dokumenty — dostępne zawsze pod ręką.' },
    { icon: '💬', title: 'Czat z recepcją', desc: 'Masz pytanie? Napisz do nas bezpośrednio z aplikacji.' },
    { icon: '🔔', title: 'Powiadomienia', desc: 'Ważne informacje z gabinetu trafiają prosto na Twój telefon.' },
];

function StoreButtons() {
    return (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={APPSTORE} style={storeBtn}>
                <span style={{ textAlign: 'left', lineHeight: 1.15 }}>
                    <small style={{ display: 'block', fontSize: '0.68rem', opacity: 0.65 }}>Pobierz z</small>
                    App Store
                </span>
            </a>
            <a href={GOOGLEPLAY} style={storeBtn}>
                <span style={{ textAlign: 'left', lineHeight: 1.15 }}>
                    <small style={{ display: 'block', fontSize: '0.68rem', opacity: 0.65 }}>Pobierz z</small>
                    Google Play
                </span>
            </a>
        </div>
    );
}

const storeBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
    padding: '0.85rem 1.6rem', background: '#fff', color: '#111',
    fontWeight: 800, borderRadius: '0.9rem', textDecoration: 'none', fontSize: '1.05rem',
    boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
};

function StepCard({ n, title, desc, color }: { n: string; title: string; desc: string; color: string }) {
    return (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1.25rem', background: SURFACE2, borderRadius: '1rem', border: `1px solid rgba(var(--color-primary-rgb),0.1)` }}>
            <div style={{ flexShrink: 0, width: '2.2rem', height: '2.2rem', borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem', color }}>{n}</div>
            <div>
                <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem', fontSize: '0.95rem' }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>{desc}</div>
            </div>
        </div>
    );
}

export default function AplikacjaPage() {
    const [os, setOs] = useState<Os | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    // Ukryj globalny Navbar/Footer (standalone landing).
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'hide-global-nav';
        style.textContent = 'nav[class*="Navbar"], footer[class*="Footer"] { display: none !important; }';
        document.head.appendChild(style);
        return () => document.getElementById('hide-global-nav')?.remove();
    }, []);

    // Wykryj system i przekieruj telefon prosto do właściwego sklepu.
    useEffect(() => {
        const detected = detectOs();
        setOs(detected);
        if (detected === 'ios' || detected === 'android') {
            setRedirecting(true);
            const target = detected === 'ios' ? APPSTORE : GOOGLEPLAY;
            // krótka zwłoka — pozwala pokazać komunikat i zadziałać, gdy auto-redirect jest blokowany
            const t = setTimeout(() => { window.location.href = target; }, 800);
            return () => clearTimeout(t);
        }
    }, []);

    // Ekran przekierowania (telefon).
    if (redirecting && (os === 'ios' || os === 'android')) {
        const store = os === 'ios' ? 'App Store' : 'Google Play';
        const target = os === 'ios' ? APPSTORE : GOOGLEPLAY;
        return (
            <div style={{ background: DARK, minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📲</div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem' }}>Otwieramy {store}…</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.75rem', maxWidth: '360px', lineHeight: 1.6 }}>
                    Za chwilę przeniesiemy Cię do sklepu, aby pobrać aplikację Mikrostomart. Jeśli to nie nastąpi automatycznie, kliknij poniżej.
                </p>
                <a href={target} style={{ ...storeBtn, background: BRAND, color: '#111' }}>Otwórz {store}</a>
            </div>
        );
    }

    // Desktop / inne — pełny landing z obydwoma sklepami i instrukcją konta.
    return (
        <div style={{ background: DARK, minHeight: '100vh', color: 'white', fontFamily: "'Inter','Segoe UI',sans-serif", overflowX: 'hidden' }}>
            {/* HERO */}
            <section style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5rem 1.5rem 3rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '2rem' }}>
                    <span style={{ color: BRAND, fontSize: '1.3rem', fontWeight: 900 }}>❖</span>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Mikrostomart</span>
                </Link>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '2rem', border: `1px solid ${BRAND}44`, background: `${BRAND}10`, color: BRAND_LIGHT, fontSize: '0.78rem', fontWeight: 600, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
                    📱 BEZPŁATNA APLIKACJA · iOS I ANDROID
                </div>
                <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem', maxWidth: '800px' }}>
                    Miej Mikrostomart{' '}
                    <span style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>zawsze przy sobie</span>
                </h1>
                <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.6)', maxWidth: '560px', lineHeight: 1.7, marginBottom: '2.25rem' }}>
                    Wizyty, historia leczenia, zalecenia, dokumenty i czat z recepcją — wszystko w jednym miejscu. Pobierz bezpłatnie na telefon lub tablet.
                </p>
                <StoreButtons />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '1.25rem' }}>
                    Skanujesz kod z plakatu w recepcji? Otworzy się właściwy sklep dla Twojego telefonu.
                </p>
            </section>

            {/* JAK ZAŁOŻYĆ KONTO */}
            <section style={{ padding: '4rem 1.5rem', background: SURFACE }}>
                <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
                        <div style={{ color: BRAND, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.6rem' }}>PIERWSZE KROKI</div>
                        <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 900 }}>Jak założyć konto</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {accountSteps.map((s) => <StepCard key={s.n} {...s} color={BRAND} />)}
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '1.1rem 1.25rem', borderRadius: '0.9rem', background: `${BRAND}0e`, border: `1px solid ${BRAND}30` }}>
                            <div style={{ color: BRAND_LIGHT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>CO PRZYGOTOWAĆ</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.55 }}>Numer telefonu <strong style={{ color: 'white' }}>podany w klinice</strong> · <strong style={{ color: 'white' }}>PESEL</strong> · adres <strong style={{ color: 'white' }}>e-mail</strong></div>
                        </div>
                        <div style={{ padding: '1.1rem 1.25rem', borderRadius: '0.9rem', background: `${BRAND}0e`, border: `1px solid ${BRAND}30` }}>
                            <div style={{ color: BRAND_LIGHT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>MASZ PROBLEM?</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                                Jeśli danych nie ma w systemie lub logowanie nie działa — zadzwoń do recepcji:{' '}
                                <a href="tel:+48570270470" style={{ color: 'white', fontWeight: 800, textDecoration: 'none' }}>+48 570 270 470</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* KORZYŚCI */}
            <section style={{ padding: '4rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ color: BRAND, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.6rem' }}>DLACZEGO WARTO</div>
                    <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 900 }}>Twoja klinika w telefonie</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.1rem' }}>
                    {benefits.map((b, i) => (
                        <div key={i} style={{ padding: '1.6rem', background: SURFACE, borderRadius: '1.15rem', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ fontSize: '1.9rem', marginBottom: '0.9rem', width: '3.2rem', height: '3.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${BRAND}12`, borderRadius: '0.9rem' }}>{b.icon}</div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', color: 'white' }}>{b.title}</h3>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA + sklepy */}
            <section style={{ padding: '4rem 1.5rem', background: `linear-gradient(135deg, ${BRAND}18 0%, transparent 60%)`, borderTop: `1px solid ${BRAND}18`, textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦷</div>
                <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 900, marginBottom: '1.5rem' }}>Pobierz aplikację Mikrostomart</h2>
                <StoreButtons />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '1.5rem' }}>Całkowicie bezpłatna · iPhone, iPad i Android</p>
            </section>

            {/* FOOTER */}
            <footer style={{ padding: '2rem 1.5rem', background: SURFACE, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: BRAND, fontWeight: 700 }}>❖ Mikrostomart</span> — Gabinet Stomatologiczny Opole
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Strona główna</Link>
                    <Link href="/strefa-pacjenta" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Strefa Pacjenta</Link>
                    <Link href="/kontakt" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Kontakt</Link>
                </div>
            </footer>
        </div>
    );
}
