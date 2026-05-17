import { cookies } from 'next/headers';
import { getTranslations, getLocale } from 'next-intl/server';
import { CookieConsentButton } from './CookieConsentButton';

// H3 BUG FIX (2026-05-10): NIE używaj Link z @/i18n/navigation w server components —
// ten wrapper wewnętrznie wywołuje useLocale() (client hook) co rzuca "No intl
// context found" w SSR i 500 dla każdej strony (CookieConsent jest w root layout).
// Server components muszą albo:
//   1. Używać <a href> z manualnym locale prefix (jak tutaj — proste, server-side)
//   2. Wykorzystywać client island (osobny component "use client" z Link import)
// Patrz feedback memory: feedback_h3_server_link_bug.md.

/**
 * CookieConsent — server component (Faza G4 2026-05-10).
 *
 * Reads HTTP cookie `cookie_consent` via next/headers. If present (set after user
 * clicks Accept), returns null — banner not rendered at all. If absent, renders
 * banner in SSR HTML so it's part of initial paint, NOT a delayed hydration insert.
 *
 * WHY: previously banner was a "use client" component with `useState(false)` initial
 * + `useEffect` localStorage check + setIsVisible(true). Lighthouse measured this
 * post-hydration banner as the LCP element, contributing to mobile LCP 6.0s.
 *
 * NOW: returning users (HTTP cookie present) → banner skipped entirely → some other
 * element (hero text/image) becomes LCP, much faster. New users → banner rendered
 * server-side at FCP (~1-1.5s) — also fast.
 *
 * Backwards compat: returning users with only `localStorage.cookie_consent=true`
 * (set by old client component) will see the banner once more, click Accept,
 * which sets HTTP cookie. From then on banner stays hidden.
 */
export default async function CookieConsent() {
    const cookieStore = await cookies();
    const consent = cookieStore.get('cookie_consent')?.value;

    // v1 backwards-compat: plain 'true' string from old single-button banner
    // v2: JSON-encoded { accepted, ai_memory, analytics, marketing }
    if (consent === 'true') return null;
    if (consent) {
        try {
            const parsed = JSON.parse(decodeURIComponent(consent));
            if (parsed?.accepted) return null;
        } catch { /* invalid value — show banner again */ }
    }

    const t = await getTranslations('cookies');
    const locale = await getLocale();
    const policyHref = locale === 'pl' ? '/polityka-cookies' : `/${locale}/polityka-cookies`;

    return (
        <div
            data-cookie-banner
            style={{
                position: "fixed",
                bottom: "2rem",
                left: "50%",
                transform: "translateX(-50%)",
                width: "90%",
                maxWidth: "600px",
                background: "rgba(18, 20, 24, 0.95)",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--color-surface-hover)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                    <h4 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1rem" }}>
                        {t('title')}
                    </h4>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                        {t('message')}{' '}
                        <a href={policyHref} style={{ color: "var(--color-primary)", marginLeft: "4px", textDecoration: "underline" }}>{t('policyLink')}</a>.{' '}
                        {t('details')}
                    </p>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
                <CookieConsentButton
                    acceptText={t('accept')}
                    settingsText={t('settings')}
                    saveText={t('savePreferences')}
                    cancelText={t('cancel')}
                    aiMemoryLabel={t('aiMemoryLabel')}
                    aiMemoryDesc={t('aiMemoryDesc')}
                    analyticsLabel={t('analyticsLabel')}
                    analyticsDesc={t('analyticsDesc')}
                    necessaryLabel={t('necessaryLabel')}
                    necessaryDesc={t('necessaryDesc')}
                    modalTitle={t('modalTitle')}
                />
            </div>
        </div>
    );
}
