"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import { Suspense } from "react";
import MetamorphosisContent from "./MetamorphosisContent";

export default function MetamorfozyPage() {
    const t = useTranslations('metamorfozy');

    return (
        <main style={{ padding: "var(--navbar-height) 0 4rem" }}>
            <div className="container">
                <RevealOnScroll animation="fade-up">
                    <header style={{ textAlign: "center", marginBottom: "4rem" }}>
                        <p style={{
                            color: "var(--color-primary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            marginBottom: "1rem"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                            {t('title')}
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
                            {t('description')}
                        </p>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll animation="blur-in" delay={100}>
                    <Suspense fallback={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1.5rem' }}>
                            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(var(--color-primary-dark-rgb),0.15)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t('loading')}</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    }>
                        <MetamorphosisContent />
                    </Suspense>
                </RevealOnScroll>
            </div>
        </main>
    );
}
