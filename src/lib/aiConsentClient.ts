/**
 * Client-side helper for AI conversation consent (S8-4 D4=C+).
 *
 * Reads cookie-stored anonymous ID + consent preference, used by chat endpoints
 * to decide whether to persist anonymous conversations.
 *
 * Logged-in patients are persisted regardless of consent (disclosed in privacy policy §11).
 */

const ANON_ID_COOKIE = 'ai_anon_id';
const CONSENT_COOKIE = 'cookie_consent';

/**
 * Get or create a stable anonymous ID stored in cookie.
 * Used to thread anonymous conversations across requests/sessions.
 *
 * Cookie attributes: 365-day TTL, SameSite=Lax (works on cross-origin payment redirects),
 * NOT httpOnly (client needs to read), NOT Secure on localhost.
 */
export function getOrCreateAnonId(): string {
    if (typeof document === 'undefined') return '';

    const match = document.cookie.match(new RegExp(`(?:^|; )${ANON_ID_COOKIE}=([^;]*)`));
    if (match && match[1]) return decodeURIComponent(match[1]);

    // Generate UUID v4
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    const maxAge = 365 * 24 * 60 * 60;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ANON_ID_COOKIE}=${encodeURIComponent(uuid)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    return uuid;
}

/**
 * Check whether the user has consented to AI memory persistence.
 *
 * Cookie format: cookie_consent={ accepted: bool, ai_memory: bool, analytics: bool, marketing: bool }
 * For backwards-compat with v1 (string 'true'), treat plain 'true' as { accepted: true }
 * with ai_memory defaulting to false.
 */
export function getAIMemoryConsent(): boolean {
    if (typeof document === 'undefined') return false;

    const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
    if (!match || !match[1]) return false;

    const raw = decodeURIComponent(match[1]);

    // v1 backwards-compat: plain 'true' string = legacy basic consent, no AI memory
    if (raw === 'true') return false;
    if (raw === 'false') return false;

    try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.ai_memory);
    } catch {
        return false;
    }
}

/**
 * Bundle anon ID + consent state for API request body.
 */
export function getAIChatExtras(): { anonId: string; consent: boolean } {
    return {
        anonId: getOrCreateAnonId(),
        consent: getAIMemoryConsent(),
    };
}
