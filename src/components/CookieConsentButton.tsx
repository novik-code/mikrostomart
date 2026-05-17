"use client";

import { useState } from "react";

/**
 * Client-side button for the (otherwise server-rendered) CookieConsent banner.
 *
 * S8-4 (D4=C+): Cookie consent v2 — granular opt-in.
 * Cookie value is now JSON: { accepted: bool, ai_memory: bool, analytics: bool, marketing: bool }
 * Backwards-compat: server-side accepts both 'true' (v1) and parsed JSON v2.
 */
type Props = {
    acceptText: string;
    settingsText: string;
    saveText: string;
    cancelText: string;
    aiMemoryLabel: string;
    aiMemoryDesc: string;
    analyticsLabel: string;
    analyticsDesc: string;
    necessaryLabel: string;
    necessaryDesc: string;
    modalTitle: string;
};

const ONE_YEAR = 365 * 24 * 60 * 60;

function saveConsent(prefs: { accepted: boolean; ai_memory: boolean; analytics: boolean; marketing: boolean }) {
    const value = encodeURIComponent(JSON.stringify(prefs));
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `cookie_consent=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax${secure}`;

    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Backwards compat
            localStorage.setItem("cookie_consent", "true");
            localStorage.setItem("cookie_consent_prefs", JSON.stringify(prefs));
        }
    } catch { /* ignored */ }

    // Hide banner immediately
    const banner = document.querySelector<HTMLElement>('[data-cookie-banner]');
    if (banner) banner.style.display = 'none';
}

export function CookieConsentButton(props: Props) {
    const [showModal, setShowModal] = useState(false);
    const [aiMemory, setAiMemory] = useState(false);
    const [analytics, setAnalytics] = useState(false);

    const acceptAll = () => {
        saveConsent({ accepted: true, ai_memory: true, analytics: true, marketing: false });
    };

    const savePreferences = () => {
        saveConsent({ accepted: true, ai_memory: aiMemory, analytics, marketing: false });
        setShowModal(false);
    };

    return (
        <>
            <button onClick={() => setShowModal(true)} style={btnSecondary}>
                {props.settingsText}
            </button>
            <button onClick={acceptAll} style={btnPrimary}>
                {props.acceptText}
            </button>

            {showModal && (
                <div style={modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={modalBox} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                            {props.modalTitle}
                        </h3>

                        <ConsentRow
                            label={props.necessaryLabel}
                            desc={props.necessaryDesc}
                            checked={true}
                            disabled={true}
                            onChange={() => { }}
                        />
                        <ConsentRow
                            label={props.aiMemoryLabel}
                            desc={props.aiMemoryDesc}
                            checked={aiMemory}
                            disabled={false}
                            onChange={setAiMemory}
                        />
                        <ConsentRow
                            label={props.analyticsLabel}
                            desc={props.analyticsDesc}
                            checked={analytics}
                            disabled={false}
                            onChange={setAnalytics}
                        />

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={btnSecondary}>
                                {props.cancelText}
                            </button>
                            <button onClick={savePreferences} style={btnPrimary}>
                                {props.saveText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function ConsentRow({ label, desc, checked, disabled, onChange }: {
    label: string; desc: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label style={{
            display: 'flex', gap: '0.75rem', padding: '0.75rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.7 : 1,
        }}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                style={{ marginTop: '0.25rem', accentColor: 'var(--color-primary)' }}
            />
            <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.4 }}>{desc}</div>
            </div>
        </label>
    );
}

const btnPrimary: React.CSSProperties = {
    padding: "0.6rem 1.5rem",
    background: "var(--color-primary)",
    color: "black",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
};

const btnSecondary: React.CSSProperties = {
    padding: "0.6rem 1.25rem",
    background: "transparent",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-text-muted)",
    borderRadius: "var(--radius-md)",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "0.85rem",
};

const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100000, padding: '1rem',
};

const modalBox: React.CSSProperties = {
    maxWidth: 520, width: '100%',
    background: '#0f172a',
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    maxHeight: '90vh', overflow: 'auto',
};
