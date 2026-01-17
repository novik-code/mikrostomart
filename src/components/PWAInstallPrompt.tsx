"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode (installed)
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            return;
        }

        // 1. Android / Desktop Chrome: Listen for 'beforeinstallprompt'
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // 2. iOS Detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

        if (isIosDevice) {
            setIsIOS(true);
            // Show prompt after a delay for iOS users, or maybe check a cookie to not annoy them
            setIsIOS(true);
            // Show prompt after a delay for iOS users, or maybe check a cookie to not annoy them
            // const hasSeenPrompt = localStorage.getItem("pwa_prompt_seen");
            // if (!hasSeenPrompt) {
            setTimeout(() => setShowPrompt(true), 3000);
            // }
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const closePrompt = () => {
        setShowPrompt(false);
        // localStorage.setItem("pwa_prompt_seen", "true");
    };

    if (!showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--color-surface-hover)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxWidth: '500px',
            margin: '0 auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>Zainstaluj Aplikację</h3>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Uzyskaj szybszy dostęp do rezerwacji i powiadomień.
                    </p>
                </div>
                <button onClick={closePrompt} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            {isIOS ? (
                <div style={{ fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Share size={18} style={{ color: '#007AFF' }} />
                        <span>Kliknij przycisk <b>Udostępnij</b> w Safari</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ border: '1px solid white', borderRadius: '4px', padding: '0 4px', fontSize: '0.8rem', fontWeight: 'bold' }}>+</span>
                        <span>Wybierz <b>"Do ekranu początkowego"</b></span>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleInstallClick}
                    className="btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        background: 'var(--color-primary)',
                        color: 'black'
                    }}
                >
                    <Download size={18} />
                    Zainstaluj Teraz
                </button>
            )}
        </div>
    );
}
