"use client";

import { useTranslations } from "next-intl";
import AskExpertButton from "@/components/AskExpertButton";

export default function KnowledgeBaseHeader() {
    const t = useTranslations('bazaWiedzy');

    return (
        <>
            <h1 style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                marginBottom: "1rem",
                background: "linear-gradient(135deg, var(--color-text), var(--color-primary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textAlign: "center"
            }}>
                {t('title')}
            </h1>
            <p style={{
                textAlign: "center",
                color: "var(--color-text-muted)",
                maxWidth: "600px",
                margin: "0 auto 2rem",
                fontSize: "1.1rem"
            }}>
                {t('description')}
                <br />
                <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                    {t('noAnswer')}
                </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
                <AskExpertButton />
            </div>
        </>
    );
}
