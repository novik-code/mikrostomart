/**
 * HTML sanitization helpers (sanitize-html backed).
 *
 * Used as defense-in-depth around any user-generated HTML that ends up in
 * `dangerouslySetInnerHTML`. Sanitize ON SAVE (admin endpoints) and again
 * ON RENDER (server components rendering DB content). Two layers — if one
 * misses or is bypassed, the other catches it.
 *
 * Why sanitize-html (not isomorphic-dompurify):
 *   The S4-1 v1 attempt with isomorphic-dompurify pulled jsdom →
 *   html-encoding-sniffer → @exodus/bytes (ESM-only) into the Vercel
 *   serverless bundle, and cold-start required() it as CJS — yielding
 *   ERR_REQUIRE_ESM and a ~1h production outage on 2026-05-13. sanitize-html
 *   is pure CJS and uses htmlparser2 (no DOM), so it runs cleanly on Vercel
 *   Node.js runtime without surprises.
 *
 * Two profiles:
 *   - sanitizeRichHtml(): blog posts, appointment instructions, news, page
 *     sections. Allows formatting, lists, headings, links, blockquotes.
 *   - sanitizeStrictHtml(): AI email drafts, short snippets. Inline-only.
 *
 * For JSON shapes (sections, page-overrides), walk the tree and sanitize
 * only the known HTML field names — leaves URLs, titles, identifiers alone.
 */

import sanitizeHtml from 'sanitize-html';

// Transform <a> tags: when target="_blank", force rel="noopener noreferrer"
// to prevent reverse tab-nabbing. Callable from any profile that allows <a>.
const hardenAnchor: sanitizeHtml.Transformer = (tagName, attribs) => {
    if (attribs.target === '_blank') {
        attribs.rel = 'noopener noreferrer';
    }
    return { tagName, attribs };
};

const RICH_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
        'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'blockquote', 'code', 'pre',
        'span', 'div', 'hr', 'sub', 'sup',
    ],
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        '*': ['lang', 'dir'],
    },
    // Default schemes ban javascript:/data:/vbscript:. Re-declare for clarity.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    // No <a href="#anchor"> by default (allowedSchemes only matches with ':').
    // We want anchor/relative links to work, so:
    allowedSchemesByTag: {
        a: ['http', 'https', 'mailto', 'tel'],
    },
    // Hash links (#section) and relative paths (/o-nas) bypass scheme check —
    // they're considered "non-URI" by sanitize-html and pass through.
    transformTags: {
        a: hardenAnchor,
    },
    // Belt-and-suspenders: nothing matches '*' anyway after allowedTags filter,
    // but list the obviously-dangerous tags so it's visible at review time.
    disallowedTagsMode: 'discard',
};

const STRICT_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'br', 'a'],
    allowedAttributes: {
        a: ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
};

export function sanitizeRichHtml(input: unknown): string {
    if (typeof input !== 'string' || !input) return '';
    return sanitizeHtml(input, RICH_OPTIONS);
}

export function sanitizeStrictHtml(input: unknown): string {
    if (typeof input !== 'string' || !input) return '';
    return sanitizeHtml(input, STRICT_OPTIONS);
}

const HTML_FIELD_NAMES = new Set([
    'content', 'html', 'body', 'description', 'text',
    'content_en', 'content_de', 'content_ua',
    'description_en', 'description_de', 'description_ua',
]);

/**
 * Walk a JSON-like value and sanitize string values whose KEY indicates HTML
 * content (see HTML_FIELD_NAMES). Other strings (URLs, titles, plain text)
 * are returned untouched so we don't HTML-entity-encode legitimate data.
 */
export function sanitizeJsonHtmlFields(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(sanitizeJsonHtmlFields);
    if (typeof value !== 'object') return value;

    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'string' && HTML_FIELD_NAMES.has(key.toLowerCase())) {
            result[key] = sanitizeRichHtml(v);
        } else if (v !== null && typeof v === 'object') {
            result[key] = sanitizeJsonHtmlFields(v);
        } else {
            result[key] = v;
        }
    }
    return result;
}
